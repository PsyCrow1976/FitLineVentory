FITLINE_SOURCES = [
    {
        "slug": "fitline-dk",
        "name": "FitLine Denmark",
        "country_code": "DK",
        "scrape_products_path": "/dk/da-dk/products",
    },
    {
        "slug": "fitline-de",
        "name": "FitLine Germany",
        "country_code": "DE",
        "scrape_products_path": "/de/de-de/products",
    },
    {
        "slug": "fitline-no",
        "name": "FitLine Norway",
        "country_code": "NO",
        "scrape_products_path": "/no/nb-no/products",
    },
    {
        "slug": "fitline-se",
        "name": "FitLine Sweden",
        "country_code": "SE",
        "scrape_products_path": "/se/sv-se/products",
    },
    {
        "slug": "fitline-fi",
        "name": "FitLine Finland",
        "country_code": "FI",
        "scrape_products_path": "/fi/fi-fi/products",
    },
]

SUPPORTED_COUNTRY_CODES = {source["country_code"] for source in FITLINE_SOURCES}


def effective_country_code(
    user_country: str | None,
    *,
    country_code: str | None = None,
    all_countries: bool = False,
) -> str | None:
    if all_countries:
        return None
    if country_code:
        return country_code.upper()
    return user_country.upper() if user_country else None