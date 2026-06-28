from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.models import (
    InventoryItem,
    InventoryTransaction,
    Product,
    ProductSource,
    TransactionType,
    User,
)
from app.schemas import InventoryTransactionRead, ReorderSuggestion


def get_or_create_inventory_item(db: Session, user: User, product: Product) -> InventoryItem:
    item = db.scalar(
        select(InventoryItem).where(
            InventoryItem.user_id == user.id,
            InventoryItem.product_id == product.id,
        )
    )
    if item:
        return item

    item = InventoryItem(user_id=user.id, product_id=product.id, quantity_on_hand=Decimal("0"), unit=product.unit)
    db.add(item)
    db.flush()
    return item


def check_in(db: Session, user: User, product_id, quantity: Decimal, note: str | None) -> InventoryItem:
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    item = get_or_create_inventory_item(db, user, product)
    item.quantity_on_hand += quantity
    item.unit = product.unit

    transaction = InventoryTransaction(
        inventory_item_id=item.id,
        type=TransactionType.CHECK_IN,
        quantity_delta=quantity,
        note=note,
    )
    db.add(transaction)
    db.commit()
    db.refresh(item)
    return item


def check_out(db: Session, user: User, product_id, quantity: Decimal, note: str | None) -> InventoryItem:
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    item = get_or_create_inventory_item(db, user, product)
    if item.quantity_on_hand < quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock. On hand: {item.quantity_on_hand}",
        )

    item.quantity_on_hand -= quantity
    transaction = InventoryTransaction(
        inventory_item_id=item.id,
        type=TransactionType.CHECK_OUT,
        quantity_delta=-quantity,
        note=note,
    )
    db.add(transaction)
    db.commit()
    db.refresh(item)
    return item


def get_inventory_item(db: Session, user: User, product_id) -> InventoryItem | None:
    stmt = (
        select(InventoryItem)
        .options(
            joinedload(InventoryItem.product).joinedload(Product.source),
            joinedload(InventoryItem.product).joinedload(Product.attributes),
        )
        .where(InventoryItem.user_id == user.id, InventoryItem.product_id == product_id)
    )
    return db.scalars(stmt).unique().first()


def list_inventory(db: Session, user: User, country_code: str | None = None) -> list[InventoryItem]:
    stmt = (
        select(InventoryItem)
        .join(InventoryItem.product)
        .join(Product.source)
        .options(
            joinedload(InventoryItem.product).joinedload(Product.source),
            joinedload(InventoryItem.product).joinedload(Product.attributes),
        )
        .where(InventoryItem.user_id == user.id)
        .order_by(InventoryItem.updated_at.desc())
    )
    if country_code:
        stmt = stmt.where(ProductSource.country_code == country_code)
    return list(db.scalars(stmt).unique().all())


def reorder_suggestions(db: Session, user: User, country_code: str | None = None) -> list[ReorderSuggestion]:
    lookback_start = datetime.now(timezone.utc) - timedelta(days=settings.reorder_lookback_days)
    items = list_inventory(db, user, country_code=country_code)
    suggestions: list[ReorderSuggestion] = []

    for item in items:
        consumed = db.scalar(
            select(func.coalesce(func.sum(InventoryTransaction.quantity_delta * -1), 0)).where(
                InventoryTransaction.inventory_item_id == item.id,
                InventoryTransaction.type == TransactionType.CHECK_OUT,
                InventoryTransaction.occurred_at >= lookback_start,
            )
        ) or Decimal("0")

        days = Decimal(str(settings.reorder_lookback_days))
        avg_daily = (consumed / days) if days > 0 else Decimal("0")

        estimated_days: Decimal | None = None
        suggested_date: datetime | None = None
        urgency = "unknown"

        if avg_daily > 0 and item.quantity_on_hand > 0:
            estimated_days = item.quantity_on_hand / avg_daily
            suggested_date = datetime.now(timezone.utc) + timedelta(days=float(estimated_days))
            if estimated_days <= 7:
                urgency = "high"
            elif estimated_days <= 14:
                urgency = "medium"
            else:
                urgency = "low"
        elif item.quantity_on_hand <= 0:
            urgency = "out_of_stock"
        elif consumed > 0:
            urgency = "low"

        source: ProductSource = item.product.source
        suggestions.append(
            ReorderSuggestion(
                product_id=item.product_id,
                product_name=item.product.name,
                source_name=source.name,
                country_code=source.country_code,
                quantity_on_hand=item.quantity_on_hand,
                unit=item.unit,
                average_daily_consumption=avg_daily.quantize(Decimal("0.001")),
                estimated_days_remaining=estimated_days.quantize(Decimal("0.1")) if estimated_days else None,
                suggested_reorder_date=suggested_date,
                urgency=urgency,
            )
        )

    suggestions.sort(
        key=lambda s: (
            {"out_of_stock": 0, "high": 1, "medium": 2, "low": 3, "unknown": 4}[s.urgency],
            float(s.estimated_days_remaining or 9999),
        )
    )
    return suggestions


def serialize_transaction(transaction: InventoryTransaction) -> InventoryTransactionRead:
    product = transaction.inventory_item.product
    source = product.source
    quantity = abs(transaction.quantity_delta)
    txn_type = transaction.type.value if hasattr(transaction.type, "value") else str(transaction.type)
    return InventoryTransactionRead(
        id=transaction.id,
        inventory_item_id=transaction.inventory_item_id,
        product_id=product.id,
        product_name=product.name,
        unit=transaction.inventory_item.unit,
        country_code=source.country_code if source else None,
        type=txn_type,
        quantity_delta=transaction.quantity_delta,
        quantity=quantity.quantize(Decimal("1")),
        note=transaction.note,
        occurred_at=transaction.occurred_at,
    )


def list_transactions(
    db: Session,
    user: User,
    *,
    transaction_type: str | None = None,
    country_code: str | None = None,
    limit: int = 50,
) -> list[InventoryTransactionRead]:
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
        .where(InventoryItem.user_id == user.id)
        .order_by(InventoryTransaction.occurred_at.desc())
        .limit(max(1, min(limit, 200)))
    )
    if transaction_type:
        stmt = stmt.where(InventoryTransaction.type == TransactionType(transaction_type))
    else:
        stmt = stmt.where(
            InventoryTransaction.type.in_([TransactionType.CHECK_IN, TransactionType.CHECK_OUT])
        )
    if country_code:
        stmt = stmt.where(ProductSource.country_code == country_code)
    transactions = list(db.scalars(stmt).unique().all())
    return [serialize_transaction(txn) for txn in transactions]