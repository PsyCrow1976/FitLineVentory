from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models import ProductSource, User
from app.services import scraper as scraper_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/scrape/{source_id}")
def scrape_products(
    source_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    download_images: bool = True,
) -> dict:
    require_admin(user)
    source = db.get(ProductSource, source_id)
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
    try:
        return scraper_service.scrape_source(db, source, download_images=download_images)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Scrape failed: {exc}",
        ) from exc


@router.get("/sources")
def list_scrape_sources(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[dict]:
    require_admin(user)
    sources = db.scalars(
        select(ProductSource).order_by(ProductSource.country_code, ProductSource.name)
    ).all()
    return [
        {
            "id": str(source.id),
            "slug": source.slug,
            "name": source.name,
            "base_url": source.base_url,
            "scrape_products_path": source.scrape_products_path,
            "country_code": source.country_code,
            "can_scrape": bool(source.base_url and source.scrape_products_path),
        }
        for source in sources
    ]