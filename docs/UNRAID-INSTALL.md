# FitLineVentory — Unraid install guide

Step-by-step instructions to install and run FitLineVentory on Unraid using Docker Compose.

**Your server:** `192.168.1.130`  
**App URL after install:** `http://192.168.1.130:8080`

---

## What gets installed

Docker Compose starts three containers:

| Container | Role |
|-----------|------|
| `db` | PostgreSQL 16 — stores products and inventory |
| `api` | FastAPI — REST API and business logic |
| `web` | nginx — web UI + API proxy on port `8080` |

---

## Prerequisites

Before you start, confirm the following on your Unraid server:

1. **Docker is running** — Unraid → **Settings → Docker** → enabled.
2. **Docker Compose is available** — open a terminal and run:
   ```bash
   docker compose version
   ```
   Unraid 6.12+ includes the Compose plugin. If the command is missing, install the **Docker Compose Manager** plugin from Community Applications, or use the standalone Compose plugin for Unraid.
3. **Git is available** — run:
   ```bash
   git --version
   ```
   If missing, install Git from **Apps** (Nerd Tools / git package) or clone the repo on another machine and copy the folder to Unraid.
4. **Port 8080 is free** — or pick another port and set `HTTP_PORT` in `.env` later.
5. **SSH or terminal access** — Unraid web UI → **Terminal**, or SSH:
   ```bash
   ssh root@192.168.1.130
   ```

---

## Step 1 — Create the app folder

Use Unraid's `appdata` share so data is easy to find and back up:

```bash
mkdir -p /mnt/user/appdata/fitlineventory
cd /mnt/user/appdata/fitlineventory
```

---

## Step 2 — Download the project

Clone the repository:

```bash
git clone https://github.com/PsyCrow1976/FitLineVentory.git .
```

If the folder is not empty, clone into a subfolder instead:

```bash
git clone https://github.com/PsyCrow1976/FitLineVentory.git FitLineVentory
cd FitLineVentory
```

Verify these files exist:

```bash
ls docker-compose.yml .env.example README.md
```

---

## Step 3 — Create and edit `.env`

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with nano, vi, or the Unraid file editor:

```bash
nano .env
```

**Change at minimum these three values** (use long random strings):

| Variable | Example | Notes |
|----------|---------|-------|
| `POSTGRES_PASSWORD` | `your-strong-db-password` | Must match the password in `DATABASE_URL` |
| `JWT_SECRET` | `your-long-random-secret` | Used to sign login tokens |
| `ADMIN_PASSWORD` | `your-admin-password` | Web login password |

**Important:** the password in `DATABASE_URL` must be the same as `POSTGRES_PASSWORD`:

```env
POSTGRES_PASSWORD=your-strong-db-password
DATABASE_URL=postgresql+psycopg://fitlineventory:your-strong-db-password@db:5432/fitlineventory
```

Confirm Unraid URL is in CORS (already set for your server):

```env
HTTP_PORT=8080
CORS_ORIGINS=http://localhost:8080,http://192.168.1.130:8080
ADMIN_USERNAME=admin
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X` in nano).

---

## Step 4 — (Recommended) Store database on appdata

By default Postgres uses a Docker-managed volume. For easier backup on Unraid, bind the database to appdata.

Create the data directory:

```bash
mkdir -p /mnt/user/appdata/fitlineventory/postgres
```

Create a compose override file (this file is optional and safe to keep):

```bash
cat > docker-compose.override.yml <<'EOF'
services:
  db:
    volumes:
      - /mnt/user/appdata/fitlineventory/postgres:/var/lib/postgresql/data
EOF
```

Docker Compose automatically merges `docker-compose.override.yml` with `docker-compose.yml`.

---

## Step 5 — Build and start the stack

From the project directory:

```bash
cd /mnt/user/appdata/fitlineventory
docker compose up -d --build
```

The first run downloads images and builds the API and web containers. This can take several minutes.

Check container status:

```bash
docker compose ps
```

Expected output — all three services **Up**, and `db` should show **healthy**:

```
NAME                   STATUS
fitlineventory-db-1    Up (healthy)
fitlineventory-api-1   Up
fitlineventory-web-1   Up
```

---

## Step 6 — Verify the installation

**Health check:**

```bash
curl http://localhost:8080/health
```

Expected: `{"status":"ok"}`

**Login test** (replace password with your `ADMIN_PASSWORD`):

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_ADMIN_PASSWORD"}'
```

Expected: JSON with `access_token`.

**From another device on your network**, open in a browser:

```
http://192.168.1.130:8080
```

Sign in with `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env`.

---

## Step 7 — First use of the app

After logging in:

1. **Products** — FitLine Denmark (`fitline-dk`) is pre-seeded. Add your first product (article number, name, unit, optional DKK price).
2. **Check in** — record stock when an order arrives.
3. **Check out** — record consumption as you use products.
4. **Dashboard** — view current on-hand quantities.
5. **Reorder** — see suggestions based on your usage over the last 30 days.

API documentation (for future mobile apps): `http://192.168.1.130:8080/docs`

---

## Step 8 — Start on boot

Containers use `restart: unless-stopped` in `docker-compose.yml`, so they start automatically when Docker starts on Unraid (after a reboot), as long as Docker is enabled in Unraid settings.

To confirm after a reboot:

```bash
docker compose ps
curl http://localhost:8080/health
```

---

## Updating to a new version

```bash
cd /mnt/user/appdata/fitlineventory
git pull
docker compose up -d --build
```

Database migrations run automatically when the API container starts.

---

## Backup and restore

### Backup

```bash
cd /mnt/user/appdata/fitlineventory
docker compose exec db pg_dump -U fitlineventory fitlineventory > backup-$(date +%F).sql
```

If you use the appdata bind mount (Step 4), you can also back up:

```
/mnt/user/appdata/fitlineventory/postgres
```

### Restore

```bash
cat backup-2026-06-28.sql | docker compose exec -T db psql -U fitlineventory fitlineventory
```

---

## Useful commands

| Task | Command |
|------|---------|
| View logs (all) | `docker compose logs -f` |
| View API logs | `docker compose logs -f api` |
| Stop stack | `docker compose down` |
| Stop and remove DB volume | `docker compose down -v` ⚠️ deletes data |
| Restart stack | `docker compose restart` |
| Rebuild after code change | `docker compose up -d --build` |

---

## Troubleshooting

### Browser shows "502 Bad Gateway"

The API may still be starting or failed migration. Wait 30 seconds, then check:

```bash
docker compose logs api --tail 50
```

Restart the API:

```bash
docker compose restart api
```

### Cannot open `http://192.168.1.130:8080` from another PC

- Confirm the web container is running: `docker compose ps`
- Check Unraid firewall / VLAN rules
- Try from the Unraid terminal: `curl http://localhost:8080/health`
- If port 8080 is taken, set `HTTP_PORT=8081` in `.env` and run `docker compose up -d`

### Login fails with correct password

- Ensure `ADMIN_PASSWORD` in `.env` matches what you type
- After changing `.env`, recreate the API container:
  ```bash
  docker compose up -d --force-recreate api
  ```
- The admin user is created on **first startup only**. If you changed the password in `.env` after the first run, either update the password in the database or reset:
  ```bash
  docker compose down -v   # ⚠️ wipes all data
  docker compose up -d --build
  ```

### `docker compose` command not found

Install the Docker Compose plugin via Community Applications, or run compose from a machine that has it and manage the stack over SSH.

### Build fails on low disk space

Check array space: Unraid → **Main** tab. Docker images and volumes need free space on the cache/array.

---

## Changing the port

Edit `.env`:

```env
HTTP_PORT=8081
```

Add the new URL to CORS:

```env
CORS_ORIGINS=http://localhost:8080,http://192.168.1.130:8081
```

Apply:

```bash
docker compose up -d
```

Open: `http://192.168.1.130:8081`

---

## Uninstall

```bash
cd /mnt/user/appdata/fitlineventory
docker compose down -v
```

Remove the project folder if desired:

```bash
rm -rf /mnt/user/appdata/fitlineventory
```

---

## Quick reference

| Item | Value |
|------|-------|
| Project path | `/mnt/user/appdata/fitlineventory` |
| Web UI | `http://192.168.1.130:8080` |
| API base | `http://192.168.1.130:8080/api/v1` |
| API docs | `http://192.168.1.130:8080/docs` |
| Default username | `admin` (from `.env`) |
| FitLine source | Denmark — `https://www.fitline.com/dk` |