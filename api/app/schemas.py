from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    username: str
    password: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str
    is_admin: bool = False


class ProductSourceCreate(BaseModel):
    slug: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=200)
    base_url: str | None = None
    country_code: str | None = Field(default=None, max_length=2)


class ProductSourceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    name: str
    base_url: str | None
    country_code: str | None
    scrape_products_path: str | None = None
    created_at: datetime


class ProductAttributeCreate(BaseModel):
    key: str = Field(min_length=1, max_length=100)
    value: str
    value_type: str = "string"


class ProductAttributeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    key: str
    value: str
    value_type: str


class ProductCreate(BaseModel):
    source_id: UUID
    external_id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=300)
    description: str | None = None
    unit: str = "unit"
    metadata: dict = Field(default_factory=dict)
    attributes: list[ProductAttributeCreate] = Field(default_factory=list)


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    source_id: UUID
    external_id: str
    name: str
    description: str | None
    unit: str
    metadata: dict = Field(default_factory=dict, validation_alias="metadata_")
    image_url: str | None = None
    image_path: str | None = None
    source_url: str | None = None
    is_favorite: bool = False
    scraped_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None
    attributes: list[ProductAttributeRead] = Field(default_factory=list)


class FavoriteUpdate(BaseModel):
    is_favorite: bool


class ScrapeResult(BaseModel):
    created: int
    updated: int
    total_scraped: int


class InventoryItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID
    quantity_on_hand: Decimal
    unit: str
    updated_at: datetime
    product: ProductRead
    source: ProductSourceRead


class CheckInRequest(BaseModel):
    product_id: UUID
    quantity: Decimal = Field(gt=0)
    note: str | None = None


class CheckOutRequest(BaseModel):
    product_id: UUID
    quantity: Decimal = Field(gt=0)
    note: str | None = None


class InventoryTransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    inventory_item_id: UUID
    type: str
    quantity_delta: Decimal
    note: str | None
    occurred_at: datetime


class ReorderSuggestion(BaseModel):
    product_id: UUID
    product_name: str
    source_name: str
    country_code: str | None
    quantity_on_hand: Decimal
    unit: str
    average_daily_consumption: Decimal
    estimated_days_remaining: Decimal | None
    suggested_reorder_date: datetime | None
    urgency: str