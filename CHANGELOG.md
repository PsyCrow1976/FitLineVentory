# Changelog

User-facing changes for FitLineVentory releases.

## [0.3.0] — 2026-06-28

### Added

- **Multi-country FitLine scraping** — Admin scrape buttons for Denmark, Germany, Norway, Sweden, and Finland
- **Last scraped date** — each country in Admin shows when its catalog was last scraped
- **Profile** — set default country; product lists, inventory, and reorder hints filter to that shop (optional “all countries”)
- **Product catalog** — country and currency on each row; tap a product to edit **tags** and **usage** inline
- **Usage per unit** — default 1 month (30 days) per unit, or custom days; dashboard shows estimated supply when you tap an item
- **Activity history** — check-in history on Check in, check-out history on Check out, combined recent activity on Dashboard

### Changed

- Check-in and check-out quantities are **whole numbers only** (no decimals)
- Product tag editor opens directly under the selected catalog row (not at the bottom of the list)

## [0.2.0] — 2026-06-28

### Added

- **FitLine product scraper** (admin) — import catalog from country FitLine shop sites (Denmark first)
- **Product images** — scraped products include images from FitLine CDN (cached locally when possible)
- **Favorites** — mark products as favorites; check-in shows favorites first with option to view all
- **Admin catalog page** — scrape sources, browse imported products, toggle favorites
- **Update guide** — [docs/UPDATING.md](docs/UPDATING.md) with terminal and Compose Manager instructions

### Changed

- Products list supports filters: `favorites_only`, `scraped_only`, `for_checkin`
- Check-in and check-out product pickers prioritize favorites

### Verified

- **Unraid update (v0.1.0 → v0.2.0)** — confirmed working on `192.168.1.130:8080` via `git pull` + rebuild
- **Admin scraper** — FitLine Denmark catalog imports successfully after update
- **Favorites** — marking favorites and favorites-first check-in/check-out confirmed on smartphone browser

## [0.1.0] — 2026-06-28

### Added

- Initial release: inventory check-in/out, reorder suggestions, responsive web UI
- Docker Compose stack (PostgreSQL, FastAPI, nginx)
- REST API with JWT auth and OpenAPI docs
- FitLine Denmark (`fitline-dk`) seed source
- Unraid install guide — [docs/UNRAID-INSTALL.md](docs/UNRAID-INSTALL.md)