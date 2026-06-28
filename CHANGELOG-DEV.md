# Changelog (development)

Internal log of bugs fixed and technical issues resolved during development.

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