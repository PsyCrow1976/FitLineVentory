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