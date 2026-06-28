from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import Product, ProductAttribute, ProductSource, User
from app.schemas import ProductCreate, ProductRead

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductRead])
def list_products(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
    source_id: UUID | None = None,
) -> list[Product]:
    stmt = select(Product).options(joinedload(Product.attributes)).order_by(Product.name)
    if source_id:
        stmt = stmt.where(Product.source_id == source_id)
    return list(db.scalars(stmt).unique().all())


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> Product:
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
    return product


@router.get("/{product_id}", response_model=ProductRead)
def get_product(
    product_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> Product:
    product = db.scalar(
        select(Product).options(joinedload(Product.attributes)).where(Product.id == product_id)
    )
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product