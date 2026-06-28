# FitLineVentory

Personal inventory for PM International FitLine products. Check in stock when orders arrive, check out as you consume, and get reorder hints based on your usage.

## Stack

- **PostgreSQL 16** — database
- **FastAPI** — REST API with OpenAPI docs
- **React + Vite + Tailwind** — responsive web UI
- **nginx** — serves the web app and proxies API requests
- **Docker Compose** — deployment on Unraid or any Docker host

## Quick start (Unraid / local)

1. Clone the repository on your server:
   ```bash
   git clone https://github.com/PsyCrow1976/FitLineVentory.git
   cd FitLineVentory
   ```

2. Create environment file:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set strong values for `POSTGRES_PASSWORD`, `JWT_SECRET`, and `ADMIN_PASSWORD`.

3. Start the stack:
   ```bash
   docker compose up -d --build
   ```

4. Open the app:
   - **Unraid:** [http://192.168.1.130:8080](http://192.168.1.130:8080)
   - **Local:** [http://localhost:8080](http://localhost:8080)

5. Sign in with the credentials from `.env` (`ADMIN_USERNAME` / `ADMIN_PASSWORD`).

## Unraid notes

| Item | Value |
|------|-------|
| Default URL | `http://192.168.1.130:8080` |
| Port | `8080` (change via `HTTP_PORT` in `.env`) |
| Postgres data | Docker volume `fitlineventory_postgres_data` |

To persist data on an Unraid appdata path, add a bind mount in `docker-compose.yml`:

```yaml
db:
  volumes:
    - /mnt/user/appdata/fitlineventory/postgres:/var/lib/postgresql/data
```

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

See [planning.md](planning.md) for the full implementation checklist.