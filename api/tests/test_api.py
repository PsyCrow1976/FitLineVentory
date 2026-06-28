import os

import uuid
from decimal import Decimal

from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

client = TestClient(app)


def auth_headers() -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"username": settings.admin_username, "password": settings.admin_password},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_login_and_sources() -> None:
    headers = auth_headers()
    response = client.get("/api/v1/sources", headers=headers)
    assert response.status_code == 200
    sources = response.json()
    assert any(s["slug"] == "fitline-dk" for s in sources)


def test_product_inventory_flow() -> None:
    headers = auth_headers()
    sources = client.get("/api/v1/sources", headers=headers).json()
    source_id = next(s["id"] for s in sources if s["slug"] == "fitline-dk")

    product_payload = {
        "source_id": source_id,
        "external_id": f"TEST-{uuid.uuid4().hex[:8]}",
        "name": "PowerCocktail Test",
        "unit": "can",
        "attributes": [{"key": "price_dkk", "value": "299", "value_type": "decimal"}],
    }
    product = client.post("/api/v1/products", json=product_payload, headers=headers)
    assert product.status_code == 201
    product_id = product.json()["id"]

    check_in = client.post(
        "/api/v1/inventory/check-in",
        json={"product_id": product_id, "quantity": "6", "note": "Order arrived"},
        headers=headers,
    )
    assert check_in.status_code == 200
    assert Decimal(check_in.json()["quantity_on_hand"]) == Decimal("6")

    check_out = client.post(
        "/api/v1/inventory/check-out",
        json={"product_id": product_id, "quantity": "2"},
        headers=headers,
    )
    assert check_out.status_code == 200
    assert Decimal(check_out.json()["quantity_on_hand"]) == Decimal("4")

    suggestions = client.get("/api/v1/inventory/reorder-suggestions", headers=headers)
    assert suggestions.status_code == 200
    assert len(suggestions.json()) >= 1

    favorite = client.patch(
        f"/api/v1/products/{product_id}/favorite",
        json={"is_favorite": True},
        headers=headers,
    )
    assert favorite.status_code == 200
    assert favorite.json()["is_favorite"] is True

    favorites = client.get("/api/v1/products?favorites_only=true", headers=headers)
    assert favorites.status_code == 200
    assert len(favorites.json()) >= 1

    me = client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["is_admin"] is True

    tags_update = client.patch(
        f"/api/v1/products/{product_id}",
        json={"tags": ["daily", "morning", "daily"]},
        headers=headers,
    )
    assert tags_update.status_code == 200
    body = tags_update.json()
    assert body["tags"] == ["daily", "morning"]
    assert body["country_code"] == "DK"
    assert body["source_name"] == "FitLine Denmark"

    profile = client.patch(
        "/api/v1/auth/profile",
        json={"default_country_code": "DE"},
        headers=headers,
    )
    assert profile.status_code == 200
    assert profile.json()["default_country_code"] == "DE"

    me = client.get("/api/v1/auth/me", headers=headers)
    assert me.json()["default_country_code"] == "DE"

    dk_only = client.get("/api/v1/products", headers=headers)
    assert all(p["country_code"] == "DE" for p in dk_only.json())

    all_products = client.get("/api/v1/products?all_countries=true", headers=headers)
    assert any(p["country_code"] == "DK" for p in all_products.json())

    client.patch("/api/v1/auth/profile", json={"default_country_code": "DK"}, headers=headers)

    usage_update = client.patch(
        f"/api/v1/products/{product_id}",
        json={"usage_is_custom": True, "usage_days_per_unit": 14},
        headers=headers,
    )
    assert usage_update.status_code == 200
    assert usage_update.json()["usage_is_custom"] is True
    assert usage_update.json()["usage_days_per_unit"] == 14

    inventory = client.get("/api/v1/inventory", headers=headers)
    assert inventory.status_code == 200
    stocked = next(i for i in inventory.json() if i["product_id"] == product_id)
    assert stocked["usage_days_per_unit"] == 14
    assert stocked["estimated_supply_days"] == 56

    transactions = client.get("/api/v1/inventory/transactions", headers=headers)
    assert transactions.status_code == 200
    txns = transactions.json()
    assert len(txns) >= 2
    assert any(t["type"] == "check_in" for t in txns)
    assert any(t["type"] == "check_out" for t in txns)
    assert all(t["product_name"] for t in txns)

    check_ins = client.get("/api/v1/inventory/transactions?transaction_type=check_in", headers=headers)
    assert all(t["type"] == "check_in" for t in check_ins.json())

    decimal_check_in = client.post(
        "/api/v1/inventory/check-in",
        json={"product_id": product_id, "quantity": 1.5},
        headers=headers,
    )
    assert decimal_check_in.status_code == 422