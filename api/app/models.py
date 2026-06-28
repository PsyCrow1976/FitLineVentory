import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TransactionType(str, enum.Enum):
    CHECK_IN = "check_in"
    CHECK_OUT = "check_out"
    ADJUSTMENT = "adjustment"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    inventory_items: Mapped[list["InventoryItem"]] = relationship(back_populates="user")


class ProductSource(Base):
    __tablename__ = "product_sources"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    base_url: Mapped[str | None] = mapped_column(String(500))
    country_code: Mapped[str | None] = mapped_column(String(2))
    scrape_products_path: Mapped[str | None] = mapped_column(String(300))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    products: Mapped[list["Product"]] = relationship(back_populates="source")


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (UniqueConstraint("source_id", "external_id", name="uq_product_source_external_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product_sources.id"), nullable=False)
    external_id: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    unit: Mapped[str] = mapped_column(String(50), default="unit", nullable=False)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(1000))
    image_path: Mapped[str | None] = mapped_column(String(500))
    source_url: Mapped[str | None] = mapped_column(String(1000))
    is_favorite: Mapped[bool] = mapped_column(default=False, nullable=False)
    scraped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    source: Mapped["ProductSource"] = relationship(back_populates="products")
    attributes: Mapped[list["ProductAttribute"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    inventory_items: Mapped[list["InventoryItem"]] = relationship(back_populates="product")


class ProductAttribute(Base):
    __tablename__ = "product_attributes"
    __table_args__ = (UniqueConstraint("product_id", "key", name="uq_product_attribute_key"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    key: Mapped[str] = mapped_column(String(100), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    value_type: Mapped[str] = mapped_column(String(50), default="string", nullable=False)

    product: Mapped["Product"] = relationship(back_populates="attributes")


class InventoryItem(Base):
    __tablename__ = "inventory_items"
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_inventory_user_product"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity_on_hand: Mapped[Decimal] = mapped_column(Numeric(12, 3), default=Decimal("0"), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), default="unit", nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="inventory_items")
    product: Mapped["Product"] = relationship(back_populates="inventory_items")
    transactions: Mapped[list["InventoryTransaction"]] = relationship(back_populates="inventory_item")


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inventory_item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("inventory_items.id"), nullable=False)
    type: Mapped[TransactionType] = mapped_column(
        Enum(
            TransactionType,
            name="transaction_type",
            create_type=False,
            values_callable=lambda enum: [member.value for member in enum],
        ),
        nullable=False,
    )
    quantity_delta: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    inventory_item: Mapped["InventoryItem"] = relationship(back_populates="transactions")