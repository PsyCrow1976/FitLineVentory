# Updating FitLineVentory on Unraid

After new code is pushed to GitHub, use one of these methods to update your running instance.

Your data (`.env` and PostgreSQL) is **not** removed by an update.

---

## Option A — Terminal (recommended)

```bash
cd /mnt/user/appdata/fitlineventory
git pull
docker compose up -d --build
```

If your system uses the older hyphenated command:

```bash
docker-compose up -d --build
```

### Verify

```bash
docker compose ps
curl http://localhost:8080/health
```

Open `http://192.168.1.130:8080` and hard-refresh the browser (or clear cache on your phone).

| Change type | Rebuild needed? |
|-------------|-----------------|
| Code or UI | Yes — use `--build` |
| `.env` only | No — `docker compose up -d` |
| Database schema | Migrations run automatically when API starts |

### View logs if something fails

```bash
docker compose logs api --tail 50
docker compose logs web --tail 30
```

---

## Option B — Compose Manager Plus (web UI)

1. **Pull latest code** (terminal):
   ```bash
   cd /mnt/user/appdata/fitlineventory
   git pull
   ```

2. Unraid → **Plugins** → **Compose.Manager** (or **Compose** in the header)

3. Find the **FitLineVentory** stack

4. Click **Update Stack** or **Build & Up**

5. Wait for **Connection Closed** → **Done**

6. Verify: open `http://192.168.1.130:8080/health` — expect `{"status":"ok"}`

---

## Rollback

To return to a previous Git version:

```bash
cd /mnt/user/appdata/fitlineventory
git log --oneline -5          # find the commit to restore
git checkout <commit-hash>
docker compose up -d --build
```

To go back to latest:

```bash
git checkout main
git pull
docker compose up -d --build
```