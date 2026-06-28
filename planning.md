# FitLineVentory — Planning

> Personal inventory for PM International FitLine products. Check in on delivery, check out on use, get reorder hints from consumption. Deployed on Unraid via Docker Compose with a REST API for future mobile apps.

**Repository:** [github.com/PsyCrow1976/FitLineVentory](https://github.com/PsyCrow1976/FitLineVentory)

---

## System overview

| Area | Description |
|------|-------------|
| Purpose | User-specific inventory of products you order and consume |
| Primary brand | PM International FitLine ([country sites](https://www.fitline.com/)) |
| Extensibility | Schema supports other retailers/sources and flexible product attributes |
| Deployment | Docker Compose on Unraid (database + API + web) |
| Clients | Responsive web (laptop/tablet/phone) + REST API for future Android/iOS |
| Smart feature | Reorder suggestions based on consumption velocity |

---

## Recommended technology stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Database | PostgreSQL 16 | Transactions for inventory ledger; JSONB for flexible metadata; solid Docker image |
| API | FastAPI (Python 3.12) | API-first; auto OpenAPI/Swagger for mobile; Pydantic validation |
| Web UI | React + Vite + TypeScript + Tailwind CSS | Responsive SPA; PWA-ready later |
| Reverse proxy / static | nginx | Serve frontend; proxy `/api` to backend |
| Migrations | Alembic | Versioned schema with SQLAlchemy |
| Auth (v1) | JWT | Works for web and future mobile apps |

### Docker Compose services

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Browser   │────▶│    nginx    │────▶│   FastAPI    │
│  / Mobile   │     │  (web+proxy)│     │    (api)     │
└─────────────┘     └─────────────┘     └──────┬───────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │  PostgreSQL  │
                                        │     (db)     │
                                        └──────────────┘
```

---

## Extensible data model (FitLine-first, not FitLine-only)

- **`product_sources`** — e.g. `fitline-de`, `fitline-no`, other shops; `country_code`, `base_url`
- **`products`** — per source; `external_id` (SKU), `name`, `metadata` (JSONB)
- **`product_attributes`** — key/value attributes (price, promo, pack size, flavor, etc.)
- **`inventory_items`** — user stock per product; `quantity_on_hand`, `unit`
- **`inventory_transactions`** — immutable ledger: `check_in`, `check_out`, `adjustment`
- **`users`** — v1 can be single-user; schema ready for more

Reorder logic: derive average daily consumption from `check_out` transactions over a configurable window; estimate days until stockout.

---

## API outline (v1)

Base path: `/api/v1`

- `GET /health` — healthcheck
- `GET/POST /sources` — product sources
- `GET/POST /products` — catalog
- `GET /inventory` — current stock
- `POST /inventory/check-in` — add stock
- `POST /inventory/check-out` — consume stock
- `GET /inventory/reorder-suggestions` — depletion estimates
- `GET /docs` — Swagger UI

---

## FitLine country sites

Each country has its own FitLine site (products, prices, promos). Model as separate `product_sources` with `country_code`. Same product line may appear as multiple product rows per country. v1: manual catalog entry; automated import/scraping deferred.

---

## Implementation checklist

Use `- [x]` when implemented **and** verified working (especially on Unraid).

### Phase 0 — Planning & decisions

- [x] Connect repo to GitHub
- [x] Initial README
- [x] Create planning document
- [x] Confirm technology stack sign-off — **PostgreSQL 16, FastAPI, React+Vite+Tailwind, nginx**
- [x] v1 user model — **single-user with JWT**
- [x] Unraid access — **direct port** (e.g. `http://unraid-ip:8080`)
- [x] Define FitLine country source(s) for seed data — **Denmark (DK)**
- [x] Define v1 feature scope (in vs out)

### Phase 1 — Infrastructure & database

- [x] Create `docker-compose.yml` (postgres, api, web)
- [ ] Configure Unraid-friendly volumes (`appdata` paths) — optional bind mount documented in README
- [x] Add `.env.example` (secrets, ports, DB URL)
- [x] PostgreSQL service healthy with persistent data — verified locally
- [x] FastAPI service starts and connects to DB — verified locally
- [x] nginx serves web UI and proxies API — verified locally
- [x] Implement SQLAlchemy models (extensible schema)
- [x] Alembic setup + initial migration
- [x] Verify schema in DB after `docker compose up` — verified locally

### Phase 2 — REST API

- [x] Health endpoint (`GET /health`)
- [x] JWT authentication (login/token)
- [x] Product sources CRUD
- [x] Products CRUD (with attributes)
- [x] Inventory: current stock query
- [x] Inventory: check-in endpoint
- [x] Inventory: check-out endpoint
- [x] Transaction ledger (audit trail)
- [x] Reorder suggestions endpoint
- [x] OpenAPI docs at `/docs` accurate and complete
- [x] API integration tests pass — 3/3 locally

### Phase 3 — Web UI (responsive)

- [x] React + Vite + Tailwind project scaffold
- [x] Mobile-first responsive layout (phone, tablet, laptop)
- [x] Login / auth flow
- [x] Product catalog view (by source/country)
- [x] Add / edit products
- [x] Inventory dashboard (on-hand quantities)
- [x] Check-in flow
- [x] Check-out flow
- [x] Reorder suggestions view
- [ ] UI works on smartphone browser (verified on Unraid)
- [ ] UI works on tablet browser (verified on Unraid)
- [ ] UI works on laptop browser (verified on Unraid)

### Phase 4 — FitLine & data

- [x] Document FitLine country URL patterns — Denmark in README
- [x] Seed initial `product_sources` for countries you use — `fitline-dk`
- [x] Manual entry workflow for FitLine products
- [x] Product attributes for price, promo, pack size (manual v1)

### Phase 5 — Unraid deployment & verification

- [ ] Deploy stack on Unraid (`192.168.1.130`)
- [x] Document port mapping and access URL
- [x] Document backup/restore for Postgres volume
- [ ] End-to-end smoke test on Unraid:
  - [ ] Create product source
  - [ ] Add product with attributes
  - [ ] Check in stock
  - [ ] Check out stock
  - [ ] Reorder suggestion appears correctly
- [x] Update README with setup and usage instructions

### Phase 6 — Future (out of v1 scope)

- [ ] FitLine product import / sync per country
- [ ] Price and promo tracking over time
- [ ] PWA (installable web app)
- [ ] Android app (API client)
- [ ] iOS app (API client)
- [ ] Push notifications for low stock
- [ ] Multi-user / household support

---

## Decisions (confirmed)

| Decision | Choice |
|----------|--------|
| Stack | PostgreSQL 16, FastAPI, React+Vite+Tailwind, nginx, Docker Compose |
| Users (v1) | Single-user, JWT auth |
| Unraid access | Direct port mapping (e.g. `:8080`) |
| FitLine countries | **Denmark (DK)** — `https://www.fitline.com/dk` |
| Unraid server | `192.168.1.130:8080` |

---

## Notes

- Checkbox items move to `[x]` only after implementation **and** verification (local or Unraid as indicated).
- Keep product model source-agnostic so adding non-FitLine shops does not require schema changes.