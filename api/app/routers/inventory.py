from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import InventoryItem, InventoryTransaction, Product, TransactionType, User
from app.schemas import (
    CheckInRequest,
    CheckOutRequest,
    InventoryItemRead,
    InventoryTransactionRead,
    ProductRead,
    ProductSourceRead,
    ReorderSuggestion,
)
from app.services import inventory as inventory_service
from app.services.country import effective_country_code
from app.services.products import to_product_read
from app.services.usage import effective_usage_days, estimated_supply_days

router = APIRouter(prefix="/inventory", tags=["inventory"])


def serialize_inventory_item(item: InventoryItem) -> InventoryItemRead:
    usage_days = effective_usage_days(item.product)
    return InventoryItemRead(
        id=item.id,
        product_id=item.product_id,
        quantity_on_hand=item.quantity_on_hand,
        unit=item.unit,
        updated_at=item.updated_at,
        product=to_product_read(item.product),
        source=ProductSourceRead.model_validate(item.product.source),
        usage_days_per_unit=usage_days,
        estimated_supply_days=estimated_supply_days(item.quantity_on_hand, usage_days),
    )


@router.get("", response_model=list[InventoryItemRead])
def list_inventory(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    country_code: str | None = None,
    all_countries: bool = False,
) -> list[InventoryItemRead]:
    filter_country = effective_country_code(
        user.default_country_code,
        country_code=country_code,
        all_countries=all_countries,
    )
    items = inventory_service.list_inventory(db, user, country_code=filter_country)
    return [serialize_inventory_item(item) for item in items]


@router.post("/check-in", response_model=InventoryItemRead)
def check_in(
    payload: CheckInRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> InventoryItemRead:
    inventory_service.check_in(db, user, payload.product_id, Decimal(payload.quantity), payload.note)
    item = inventory_service.get_inventory_item(db, user, payload.product_id)
    if not item:
        raise ValueError("Inventory item not found after check-in")
    return serialize_inventory_item(item)


@router.post("/check-out", response_model=InventoryItemRead)
def check_out(
    payload: CheckOutRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> InventoryItemRead:
    inventory_service.check_out(db, user, payload.product_id, Decimal(payload.quantity), payload.note)
    item = inventory_service.get_inventory_item(db, user, payload.product_id)
    if not item:
        raise ValueError("Inventory item not found after check-out")
    return serialize_inventory_item(item)


@router.get("/transactions", response_model=list[InventoryTransactionRead])
def list_transactions(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    product_id: UUID | None = None,
    transaction_type: str | None = None,
    country_code: str | None = None,
    all_countries: bool = False,
    limit: int = 50,
) -> list[InventoryTransactionRead]:
    filter_country = effective_country_code(
        user.default_country_code,
        country_code=country_code,
        all_countries=all_countries,
    )
    if product_id:
        stmt = (
            select(InventoryTransaction)
            .join(InventoryTransaction.inventory_item)
            .join(InventoryItem.product)
            .join(Product.source)
            .options(
                joinedload(InventoryTransaction.inventory_item)
                .joinedload(InventoryItem.product)
                .joinedload(Product.source)
            )
            .where(InventoryItem.user_id == user.id, InventoryItem.product_id == product_id)
            .order_by(InventoryTransaction.occurred_at.desc())
            .limit(max(1, min(limit, 200)))
        )
        if transaction_type:
            stmt = stmt.where(InventoryTransaction.type == TransactionType(transaction_type))
        else:
            stmt = stmt.where(
                InventoryTransaction.type.in_([TransactionType.CHECK_IN, TransactionType.CHECK_OUT])
            )
        transactions = list(db.scalars(stmt).unique().all())
        return [inventory_service.serialize_transaction(txn) for txn in transactions]

    return inventory_service.list_transactions(
        db,
        user,
        transaction_type=transaction_type,
        country_code=filter_country,
        limit=limit,
    )


@router.get("/reorder-suggestions", response_model=list[ReorderSuggestion])
def reorder_suggestions(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    country_code: str | None = None,
    all_countries: bool = False,
) -> list[ReorderSuggestion]:
    filter_country = effective_country_code(
        user.default_country_code,
        country_code=country_code,
        all_countries=all_countries,
    )
    return inventory_service.reorder_suggestions(db, user, country_code=filter_country)