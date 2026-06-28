from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import Product, ProductAttribute, ProductSource, User
from app.schemas import FavoriteUpdate, ProductCreate, ProductRead, ProductUpdate
from app.services.country import effective_country_code
from app.services.products import to_product_read

router = APIRouter(prefix="/products", tags=["products"])


def _product_query():
    return select(Product).options(joinedload(Product.attributes), joinedload(Product.source))


def _normalize_tags(tags: list[str]) -> list[str]:
    seen: set[str] = set()
    normalized: list[str] = []
    for tag in tags:
        cleaned = tag.strip()
        if not cleaned:
            continue
        key = cleaned.casefold()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(cleaned)
    return normalized


@router.get("", response_model=list[ProductRead])
def list_products(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    source_id: UUID | None = None,
    country_code: str | None = None,
    all_countries: bool = False,
    favorites_only: bool = False,
    scraped_only: bool = False,
    for_checkin: bool = False,
) -> list[ProductRead]:
    stmt = _product_query().join(Product.source)
    if source_id:
        stmt = stmt.where(Product.source_id == source_id)
    else:
        filter_country = effective_country_code(
            user.default_country_code,
            country_code=country_code,
            all_countries=all_countries,
        )
        if filter_country:
            stmt = stmt.where(ProductSource.country_code == filter_country)
    if favorites_only:
        stmt = stmt.where(Product.is_favorite.is_(True))
    if scraped_only:
        stmt = stmt.where(Product.scraped_at.is_not(None))

    products = list(db.scalars(stmt).unique().all())

    if for_checkin:
        favorites = [p for p in products if p.is_favorite]
        others = [p for p in products if not p.is_favorite]
        favorites.sort(key=lambda p: p.name.lower())
        others.sort(key=lambda p: p.name.lower())
        return [to_product_read(p) for p in favorites + others]

    products.sort(key=lambda p: (not p.is_favorite, p.name.lower()))
    return [to_product_read(p) for p in products]


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> ProductRead:
    source = db.get(ProductSource, payload.source_id)
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")

    product = Product(
        source_id=payload.source_id,
        external_id=payload.external_id,
        name=payload.name,
        description=payload.description,
        unit=payload.unit,
        metadata_=payload.metadata,
    )
    for attr in payload.attributes:
        product.attributes.append(ProductAttribute(**attr.model_dump()))

    db.add(product)
    db.commit()
    db.refresh(product)
    product = db.scalar(_product_query().where(Product.id == product.id))
    assert product is not None
    return to_product_read(product)


@router.patch("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: UUID,
    payload: ProductUpdate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> ProductRead:
    product = db.scalar(_product_query().where(Product.id == product_id))
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    if payload.tags is not None:
        product.tags = _normalize_tags(payload.tags)

    db.commit()
    db.refresh(product)
    product = db.scalar(_product_query().where(Product.id == product_id))
    assert product is not None
    return to_product_read(product)


@router.patch("/{product_id}/favorite", response_model=ProductRead)
def set_favorite(
    product_id: UUID,
    payload: FavoriteUpdate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> ProductRead:
    product = db.scalar(_product_query().where(Product.id == product_id))
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    product.is_favorite = payload.is_favorite
    db.commit()
    db.refresh(product)
    product = db.scalar(_product_query().where(Product.id == product_id))
    assert product is not None
    return to_product_read(product)


@router.get("/{product_id}", response_model=ProductRead)
def get_product(
    product_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> ProductRead:
    product = db.scalar(_product_query().where(Product.id == product_id))
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return to_product_read(product)