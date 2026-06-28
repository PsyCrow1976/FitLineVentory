import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Product, ProductAttribute, ProductSource


@dataclass
class ScrapedProduct:
    external_id: str
    name: str
    price: int | None
    currency: str | None
    image_url: str | None
    source_url: str


def _parse_products_from_html(html: str, base_url: str, products_path: str) -> list[ScrapedProduct]:
    products: list[ScrapedProduct] = []
    seen: set[str] = set()

    for match in re.finditer(r'\\"li\\",\\"(\d+)\\"', html):
        article = match.group(1)
        if article in seen:
            continue

        chunk = html[match.end() : match.end() + 6000]
        name_match = re.search(
            r'\\"name\\":\{\\"label\\":\\"[^\\"]*\\",\\"value\\":\\"((?:\\\\.|[^\\"])*)\\"',
            chunk,
        )
        if not name_match:
            continue

        seen.add(article)
        price_match = re.search(r'\\"displayPrice\\":(\d+)', chunk)
        currency_match = re.search(r'\\"currencyCode\\":\\"([A-Z]{3})\\"', chunk)
        name = json.loads(f'"{name_match.group(1)}"')
        source_url = f"{base_url.rstrip('/')}{products_path.rstrip('/')}/{article}"

        image_url = None
        article_idx = html.find(f"{products_path.rstrip('/')}/{article}")
        if article_idx != -1:
            image_match = re.search(
                r"cdnip/products/([a-f0-9-]+)\.png",
                html[article_idx : article_idx + 5000],
            )
            if image_match:
                image_url = (
                    f"https://www.fitline.com/cdnip/products/{image_match.group(1)}.png"
                    "?width=512&quality=85"
                )

        products.append(
            ScrapedProduct(
                external_id=article,
                name=name,
                price=int(price_match.group(1)) if price_match else None,
                currency=currency_match.group(1) if currency_match else None,
                image_url=image_url,
                source_url=source_url,
            )
        )

    return products


def _cache_image(client: httpx.Client, product: Product, image_url: str) -> str | None:
    storage = Path(settings.image_storage_path)
    storage.mkdir(parents=True, exist_ok=True)
    filename = f"{product.external_id}.png"
    target = storage / filename
    try:
        response = client.get(image_url, timeout=30)
        response.raise_for_status()
        target.write_bytes(response.content)
        return str(target)
    except httpx.HTTPError:
        return None


def scrape_source(db: Session, source: ProductSource, download_images: bool = True) -> dict[str, int]:
    if not source.base_url or not source.scrape_products_path:
        raise ValueError(f"Source {source.slug} is missing base_url or scrape_products_path")

    if not source.scrape_products_path.startswith("/"):
        raise ValueError("scrape_products_path must start with /")
    list_url = f"{source.base_url.rstrip('/')}{source.scrape_products_path}"
    headers = {"User-Agent": settings.scrape_user_agent}

    with httpx.Client(headers=headers, follow_redirects=True, timeout=60) as client:
        response = client.get(list_url)
        response.raise_for_status()
        scraped_items = _parse_products_from_html(response.text, source.base_url, source.scrape_products_path)

        created = 0
        updated = 0
        now = datetime.now(timezone.utc)

        for item in scraped_items:
            product = db.scalar(
                select(Product).where(
                    Product.source_id == source.id,
                    Product.external_id == item.external_id,
                )
            )
            is_new = product is None
            if is_new:
                product = Product(
                    source_id=source.id,
                    external_id=item.external_id,
                    name=item.name,
                    unit="unit",
                    metadata_={"scraped": True},
                )
                db.add(product)
                db.flush()
                created += 1
            else:
                product.name = item.name
                updated += 1

            product.image_url = item.image_url
            product.source_url = item.source_url
            product.scraped_at = now
            product.metadata_ = {**product.metadata_, "scraped": True, "currency": item.currency}

            if item.price is not None:
                _upsert_attribute(product, "price_dkk", str(item.price), "decimal")
            if item.currency:
                _upsert_attribute(product, "currency", item.currency, "string")

            if download_images and item.image_url:
                local_path = _cache_image(client, product, item.image_url)
                if local_path:
                    product.image_path = local_path

        db.commit()

    return {"created": created, "updated": updated, "total_scraped": len(scraped_items)}


def _upsert_attribute(product: Product, key: str, value: str, value_type: str) -> None:
    existing = next((attr for attr in product.attributes if attr.key == key), None)
    if existing:
        existing.value = value
        existing.value_type = value_type
    else:
        product.attributes.append(ProductAttribute(key=key, value=value, value_type=value_type))