# Changelog (development)

Internal log of bugs fixed and technical issues resolved during development.

## [0.3.0] — 2026-06-28

### Schema & API

- **Migration `003`** — `products.tags` (JSONB array)
- **Migration `004`** — `users.default_country_code` (default `DK`)
- **Migration `005`** — `products.usage_days_per_unit`, `products.usage_is_custom`
- **`PATCH /auth/profile`** — update default country; validated against seeded sources
- **`PATCH /products/{id}`** — tags and usage fields; `ProductRead` includes `source_name`, `country_code`, `currency`
- **`GET /inventory/transactions`** — enriched with product name, unit, country; filters `transaction_type`, country, `limit`
- **Check-in/out quantity** — Pydantic `int` only; API returns 422 for decimals (e.g. `1.5`)
- **Scraper price attribute** — `price_{currency}` instead of hardcoded `price_dkk`
- **Admin sources** — `last_scraped_at` from `MAX(products.scraped_at)` per source

### UI / UX fixes

- **Tag editor placement** — moved from bottom of catalog list to inline under clicked product
- **Quantity display** — `formatQuantity()` strips fractional zeros (`6.000` → `6`) across dashboard, history, reorder
- **Per-country scrape loading** — Admin uses `scrapingId` per source instead of disabling all buttons

### FitLine country paths (seeded)

| Code | Path |
|------|------|
| DK | `/dk/da-dk/products` |
| DE | `/de/de-de/products` |
| NO | `/no/nb-no/products` |
| SE | `/se/sv-se/products` |
| FI | `/fi/fi-fi/products` |

### Tests

- Profile country filter, usage PATCH, supply days on inventory, transaction list, decimal quantity rejection — 4/4 pytest pass in Docker

## [0.2.0] — 2026-06-28

### Fixed / resolved while building scraper + favorites

- **Scraper regex missed products** — Switched from `split()` to `finditer()` on FitLine RSC payload; now captures 18 DK products consistently
- **API test duplicate SKU** — `TEST-001` collided across runs; tests now use random `external_id`
- **FitLine `base_url` for scrape** — Changed seed from `fitline.com/dk` to `fitline.com` + path `/dk/da-dk/products` for correct list URL
- **Duplicate `settings` import** — Removed in `auth.py` after adding `require_admin`

### Verified on Unraid (post-release)

- **v0.2.0 in-place update** — `git pull` + `docker compose up -d --build` (or Compose Manager **Update Stack**) applied migration `002_scraper_favorites` without data loss
- **API tests** — 4/4 pass in Docker after v0.2.0 (`test_api`, `test_scraper`)
- **Web image rebuild** — `docker compose build --no-cache web` succeeds; Admin page and favorites UI deploy cleanly
- **False-positive pytest alert** — background run reported 2 failures from pre-v0.2.0 state (duplicate SKU, scraper regex); resolved before release commit `762eba7`

## [0.1.0] — 2026-06-28

### Build & deploy

- **TypeScript `replaceAll`** — Web build failed on ES2020 target; replaced with `.replace(/_/g, " ")` in `ReorderPage.tsx`
- **Alembic enum duplicate** — `transaction_type` enum created twice on migration retry; made creation idempotent with `DO $$ BEGIN ... EXCEPTION` block
- **SQLAlchemy enum values** — Check-in/out stored `CHECK_IN` instead of `check_in`; added `values_callable` on `TransactionType` enum column
- **502 on first start** — API still running migrations when nginx proxied requests; resolved after migration fix and longer startup window
- **pytest import path** — `ModuleNotFoundError: app` in container tests; added `tests/conftest.py` with path setup
- **pytest admin password** — Tests used hardcoded `admin` password while `.env` used `change-me-admin-password`; tests now read from `settings`

### Unraid / Docker

- **Docker Compose not on Unraid** — Documented Compose Manager Plus install (Step 0) and GUI-only deploy path (Step 5B) in install guide
- **GitHub remote casing** — Remote URL corrected to `FitLineVentory` after GitHub redirect notice

### Planning / docs

- Initial planning checklist and stack decisions recorded in `planning.md`