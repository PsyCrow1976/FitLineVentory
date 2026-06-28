from sqlalchemy import select

from app.auth import hash_password
from app.config import settings
from app.database import SessionLocal
from app.models import ProductSource, User


def seed() -> None:
    with SessionLocal() as db:
        admin = db.scalar(select(User).where(User.username == settings.admin_username))
        if not admin:
            db.add(
                User(
                    username=settings.admin_username,
                    password_hash=hash_password(settings.admin_password),
                )
            )

        fitline_dk = db.scalar(select(ProductSource).where(ProductSource.slug == "fitline-dk"))
        if not fitline_dk:
            db.add(
                ProductSource(
                    slug="fitline-dk",
                    name="FitLine Denmark",
                    base_url="https://www.fitline.com",
                    country_code="DK",
                    scrape_products_path="/dk/da-dk/products",
                )
            )
        else:
            fitline_dk.base_url = "https://www.fitline.com"
            fitline_dk.scrape_products_path = "/dk/da-dk/products"

        db.commit()


if __name__ == "__main__":
    seed()
    print("Seed complete.")