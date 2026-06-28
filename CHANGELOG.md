# Changelog

User-facing changes for FitLineVentory releases.

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

## [0.1.0] — 2026-06-28

### Added

- Initial release: inventory check-in/out, reorder suggestions, responsive web UI
- Docker Compose stack (PostgreSQL, FastAPI, nginx)
- REST API with JWT auth and OpenAPI docs
- FitLine Denmark (`fitline-dk`) seed source
- Unraid install guide — [docs/UNRAID-INSTALL.md](docs/UNRAID-INSTALL.md)