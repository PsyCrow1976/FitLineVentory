"""scraper and favorites

Revision ID: 002
Revises: 001
Create Date: 2026-06-28

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("product_sources", sa.Column("scrape_products_path", sa.String(length=300), nullable=True))
    op.add_column("products", sa.Column("image_url", sa.String(length=1000), nullable=True))
    op.add_column("products", sa.Column("image_path", sa.String(length=500), nullable=True))
    op.add_column("products", sa.Column("source_url", sa.String(length=1000), nullable=True))
    op.add_column("products", sa.Column("is_favorite", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("products", sa.Column("scraped_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("products", sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False))

    op.execute(
        "UPDATE product_sources SET scrape_products_path = '/dk/da-dk/products' WHERE slug = 'fitline-dk'"
    )


def downgrade() -> None:
    op.drop_column("products", "updated_at")
    op.drop_column("products", "scraped_at")
    op.drop_column("products", "is_favorite")
    op.drop_column("products", "source_url")
    op.drop_column("products", "image_path")
    op.drop_column("products", "image_url")
    op.drop_column("product_sources", "scrape_products_path")