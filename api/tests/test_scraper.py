from urllib.request import Request, urlopen

from app.services.scraper import _parse_products_from_html


def test_parse_fitline_denmark_live_html() -> None:
    url = "https://www.fitline.com/dk/da-dk/products"
    req = Request(url, headers={"User-Agent": "FitLineVentory-test/0.2"})
    html = urlopen(req, timeout=60).read().decode("utf-8", errors="replace")
    products = _parse_products_from_html(html, "https://www.fitline.com", "/dk/da-dk/products")
    assert len(products) >= 15
    assert any(p.name and "PowerCocktail" in p.name for p in products)
    assert any(p.price for p in products)
    assert all(p.image_url is None or p.image_url.startswith("https://") for p in products)