from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import ProductSource, User
from app.schemas import ProductSourceCreate, ProductSourceRead

router = APIRouter(prefix="/sources", tags=["sources"])


@router.get("", response_model=list[ProductSourceRead])
def list_sources(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> list[ProductSource]:
    return list(db.scalars(select(ProductSource).order_by(ProductSource.name)).all())


@router.post("", response_model=ProductSourceRead, status_code=status.HTTP_201_CREATED)
def create_source(
    payload: ProductSourceCreate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> ProductSource:
    existing = db.scalar(select(ProductSource).where(ProductSource.slug == payload.slug))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Source slug already exists")

    source = ProductSource(**payload.model_dump())
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


@router.get("/{source_id}", response_model=ProductSourceRead)
def get_source(
    source_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> ProductSource:
    source = db.get(ProductSource, source_id)
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
    return source