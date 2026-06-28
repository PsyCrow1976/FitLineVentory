import { useEffect, useMemo, useState } from "react";
import { api, Product, productImageUrl, ScrapeSource } from "../api";
import { useAuth } from "../auth";
import { COUNTRY_NAMES, countryLabel } from "../countries";

function formatLastScraped(iso: string | null): string {
  if (!iso) return "Never scraped";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminPage() {
  const { token } = useAuth();
  const [sources, setSources] = useState<ScrapeSource[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [scrapingId, setScrapingId] = useState<string | null>(null);

  async function refresh() {
    if (!token) return;
    const [sourceList, productList] = await Promise.all([
      api.adminSources(token),
      api.products(token, { allCountries: true }),
    ]);
    setSources(sourceList);
    setProducts(productList.filter((p) => p.scraped_at));
  }

  useEffect(() => {
    if (!token) return;
    refresh().catch((err: Error) => setError(err.message));
  }, [token]);

  const filteredProducts = useMemo(() => {
    if (countryFilter === "all") return products;
    return products.filter((p) => p.country_code === countryFilter);
  }, [products, countryFilter]);

  const scrapedCountries = useMemo(() => {
    const codes = new Set(products.map((p) => p.country_code).filter(Boolean) as string[]);
    return Array.from(codes).sort();
  }, [products]);

  async function handleScrape(sourceId: string) {
    if (!token) return;
    setScrapingId(sourceId);
    setError("");
    setMessage("");
    try {
      const result = await api.scrapeSource(token, sourceId);
      const source = sources.find((s) => s.id === sourceId);
      const label = source?.country_code ? countryLabel(source.country_code, source.name) : "source";
      setMessage(
        `${label}: ${result.total_scraped} products (${result.created} new, ${result.updated} updated).`,
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scrape failed");
    } finally {
      setScrapingId(null);
    }
  }

  async function toggleFavorite(product: Product) {
    if (!token) return;
    try {
      const updated = await api.setFavorite(token, product.id, !product.is_favorite);
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update favorite");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Admin — FitLine catalog</h2>
        <p className="text-slate-500">
          Scrape each country shop separately, then mark favorites for quick check-in.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Scrape by country</h3>
        <p className="mt-1 text-sm text-slate-500">One scrape button per FitLine country shop.</p>
        <ul className="mt-4 space-y-3">
          {sources.map((source) => {
            const isScraping = scrapingId === source.id;
            const countryName =
              source.country_code && COUNTRY_NAMES[source.country_code]
                ? COUNTRY_NAMES[source.country_code]
                : source.name;
            return (
              <li
                key={source.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {countryName}
                    {source.country_code ? ` (${source.country_code})` : ""}
                  </p>
                  <p className="text-sm text-slate-500">
                    {source.base_url}
                    {source.scrape_products_path}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Last scraped:{" "}
                    <span className={source.last_scraped_at ? "font-medium text-slate-800" : "text-slate-500"}>
                      {formatLastScraped(source.last_scraped_at)}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!source.can_scrape || scrapingId !== null}
                  onClick={() => handleScrape(source.id)}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {isScraping ? "Scraping..." : `Scrape ${source.country_code ?? "now"}`}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {message && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Scraped products — toggle favorites</h3>
            <p className="mt-1 text-sm text-slate-500">Favorites appear first in check-in and check-out.</p>
          </div>
          {scrapedCountries.length > 1 && (
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
            >
              <option value="all">All countries</option>
              {scrapedCountries.map((code) => (
                <option key={code} value={code}>
                  {countryLabel(code)}
                </option>
              ))}
            </select>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <p className="mt-4 text-slate-500">No scraped products yet. Run a country scrape above.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => {
              const image = productImageUrl(product);
              return (
                <article
                  key={product.id}
                  className="flex gap-3 rounded-xl border border-slate-100 p-3"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {image ? (
                      <img src={image} alt={product.name} className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-400">
                        No img
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{product.name}</p>
                    <p className="text-xs text-slate-500">
                      {countryLabel(product.country_code, product.source_name)} · {product.external_id}
                    </p>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(product)}
                      className={`mt-2 text-sm font-medium ${
                        product.is_favorite ? "text-amber-600" : "text-slate-500 hover:text-amber-600"
                      }`}
                    >
                      {product.is_favorite ? "★ Favorite" : "☆ Add to favorites"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}