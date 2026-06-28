from decimal import Decimal

DEFAULT_USAGE_DAYS_PER_UNIT = 30


def effective_usage_days(product) -> int:
    if getattr(product, "usage_is_custom", False):
        days = getattr(product, "usage_days_per_unit", DEFAULT_USAGE_DAYS_PER_UNIT)
        return max(1, int(days))
    return DEFAULT_USAGE_DAYS_PER_UNIT


def estimated_supply_days(quantity_on_hand: Decimal, usage_days_per_unit: int) -> int:
    if quantity_on_hand <= 0:
        return 0
    return int(quantity_on_hand * usage_days_per_unit)