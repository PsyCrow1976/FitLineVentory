# FitLineVentory

Personal inventory for PM International FitLine products. Check in stock when orders arrive, check out as you consume, and get reorder hints based on your usage.

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

## FitLine Denmark (seeded)

The stack seeds **FitLine Denmark** (`fitline-dk`, country code `DK`, [fitline.com/dk](https://www.fitline.com/dk)) on first startup. Add products manually in the web UI under **Products**.

## Development

```bash
docker compose up -d --build
docker compose logs -f api
docker compose exec api pytest tests/test_api.py -q
```

## Updating on Unraid

See **[docs/UPDATING.md](docs/UPDATING.md)** — terminal (`git pull` + `docker compose up -d --build`) or Compose Manager UI.

## Changelog

- User-facing: [CHANGELOG.md](CHANGELOG.md)
- Development fixes: [CHANGELOG-DEV.md](CHANGELOG-DEV.md)

See [planning.md](planning.md) for the full implementation checklist.