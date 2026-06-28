"""product usage days per unit

Revision ID: 005
Revises: 004
Create Date: 2026-06-28

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_USAGE_DAYS = 30


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column("usage_days_per_unit", sa.Integer(), nullable=False, server_default=str(DEFAULT_USAGE_DAYS)),
    )
    op.add_column(
        "products",
        sa.Column("usage_is_custom", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("products", "usage_is_custom")
    op.drop_column("products", "usage_days_per_unit")