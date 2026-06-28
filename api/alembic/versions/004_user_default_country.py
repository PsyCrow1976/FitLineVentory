"""user default country

Revision ID: 004
Revises: 003
Create Date: 2026-06-28

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("default_country_code", sa.String(length=2), nullable=False, server_default="DK"),
    )


def downgrade() -> None:
    op.drop_column("users", "default_country_code")