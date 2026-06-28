from sqlalchemy import select

from app.auth import hash_password
from app.config import settings
from app.database import SessionLocal
from app.models import ProductSource, User
from app.services.country import FITLINE_SOURCES


def seed() -> None:
    with SessionLocal() as db:
        admin = db.scalar(select(User).where(User.username == settings.admin_username))
        if not admin:
            db.add(
                User(
                    username=settings.admin_username,
                    password_hash=hash_password(settings.admin_password),
                    default_country_code="DK",
                )
            )
        elif not admin.default_country_code:
            admin.default_country_code = "DK"

        for source_data in FITLINE_SOURCES:
            source = db.scalar(select(ProductSource).where(ProductSource.slug == source_data["slug"]))
            if not source:
                db.add(
                    ProductSource(
                        slug=source_data["slug"],
                        name=source_data["name"],
                        base_url="https://www.fitline.com",
                        country_code=source_data["country_code"],
                        scrape_products_path=source_data["scrape_products_path"],
                    )
                )
            else:
                source.name = source_data["name"]
                source.base_url = "https://www.fitline.com"
                source.country_code = source_data["country_code"]
                source.scrape_products_path = source_data["scrape_products_path"]

        db.commit()


if __name__ == "__main__":
    seed()
    print("Seed complete.")