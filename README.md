# FitLineVentory

Personal inventory for PM International FitLine products. Check in stock when orders arrive, check out as you consume, and see how long your supply should last.

## Features

- **Inventory** — check in / check out with whole-number quantities and activity history
- **Dashboard** — on-hand stock, supply estimates (quantity × usage days), recent check-ins and check-outs
- **Products** — catalog by country with currency, tags, and per-product usage (30 days/unit default or custom)
- **Profile** — default FitLine country shop (DK, DE, NO, SE, FI); optional “all countries” on lists
- **Admin** — scrape FitLine catalog per country, last scraped date, mark favorites for quick check-in
- **Reorder hints** — suggestions from consumption over the last 30 days

## Stack

- **PostgreSQL 16** — database
- **FastAPI** — REST API with OpenAPI docs
- **React + Vite + Tailwind** — responsive web UI
- **nginx** — serves the web app and proxies API requests
- **Docker Compose** — deployment on Unraid or any Docker host

## Unraid install (step-by-step)

See **[docs/UNRAID-INSTALL.md](docs/UNRAID-INSTALL.md)** for the full guide.

> **No `docker compose` on Unraid?** Install **Compose Manager Plus** from Community Applications first (Step 0 in the guide), or use the web UI method (Step 5B).

Short version:

```bash
mkdir -p /mnt/user/appdata/fitlineventory && cd /mnt/user/appdata/fitlineventory
git clone https://github.com/PsyCrow1976/FitLineVentory.git .
cp .env.example .env && nano .env   # set passwords
cp docker-compose.override.example.yml docker-compose.override.yml   # optional: appdata DB path
docker compose up -d --build
```

Open [http://192.168.1.130:8080](http://192.168.1.130:8080) and sign in with `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env`.

## Quick start (local)

```bash
git clone https://github.com/PsyCrow1976/FitLineVentory.git
cd FitLineVentory
cp .env.example .env
docker compose up -d --build
```

Open [http://localhost:8080](http://localhost:8080).

## Typical workflow

1. **Profile** — choose your default country (e.g. Denmark)
2. **Admin** — scrape that country’s FitLine shop; mark products as favorites
3. **Check in** — record deliveries when orders arrive
4. **Check out** — record daily consumption
5. **Dashboard** — tap an item to see estimated supply duration

## FitLine countries (seeded)

On first startup the API seeds five FitLine shops:

| Country | Code | Products URL |
|---------|------|----------------|
| Denmark | DK | [fitline.com/dk](https://www.fitline.com/dk/da-dk/products) |
| Germany | DE | [fitline.com/de](https://www.fitline.com/de/de-de/products) |
| Norway | NO | [fitline.com/no](https://www.fitline.com/no/nb-no/products) |
| Sweden | SE | [fitline.com/se](https://www.fitline.com/se/sv-se/products) |
| Finland | FI | [fitline.com/fi](https://www.fitline.com/fi/fi-fi/products) |

Scrape catalogs in **Admin** or add products manually under **Products**.

### Backup

```bash
docker compose exec db pg_dump -U fitlineventory fitlineventory > backup.sql
```

### Restore

```bash
cat backup.sql | docker compose exec -T db psql -U fitlineventory fitlineventory
```

## API

- Base URL: `/api/v1`
- Swagger UI: `/docs`
- Health: `/health`

Authenticated endpoints require `Authorization: Bearer <token>` from `POST /api/v1/auth/login`.

## Development

```bash
docker compose up -d --build
docker compose logs -f api
docker compose exec api pytest tests/ -q
```

## Updating on Unraid

See **[docs/UPDATING.md](docs/UPDATING.md)** — terminal (`git pull` + `docker compose up -d --build`) or Compose Manager UI.

## Changelog

- User-facing: [CHANGELOG.md](CHANGELOG.md) (current: **v0.3.0**)
- Development fixes: [CHANGELOG-DEV.md](CHANGELOG-DEV.md)

See [planning.md](planning.md) for the full implementation checklist.