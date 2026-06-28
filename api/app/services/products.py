from app.models import Product
from app.schemas import ProductRead
from app.services.usage import effective_usage_days


def product_currency(product: Product) -> str | None:
    for attr in product.attributes:
        if attr.key == "currency":
            return attr.value
    currency = product.metadata_.get("currency")
    return currency if isinstance(currency, str) else None


def product_price(product: Product) -> str | None:
    for attr in product.attributes:
        if attr.key.startswith("price_") or attr.key == "price":
            return attr.value
    return None


def to_product_read(product: Product) -> ProductRead:
    source = product.source
    return ProductRead(
        id=product.id,
        source_id=product.source_id,
        external_id=product.external_id,
        name=product.name,
        description=product.description,
        unit=product.unit,
        metadata=product.metadata_ or {},
        tags=list(product.tags or []),
        image_url=product.image_url,
        image_path=product.image_path,
        source_url=product.source_url,
        is_favorite=product.is_favorite,
        scraped_at=product.scraped_at,
        created_at=product.created_at,
        updated_at=product.updated_at,
        attributes=product.attributes,
        source_name=source.name if source else None,
        country_code=source.country_code if source else None,
        currency=product_currency(product),
        usage_days_per_unit=effective_usage_days(product),
        usage_is_custom=bool(product.usage_is_custom),
    )