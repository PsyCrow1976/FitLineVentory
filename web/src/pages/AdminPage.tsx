import { useEffect, useState } from "react";
import { api, Product, productImageUrl, ScrapeSource } from "../api";
import { useAuth } from "../auth";

export default function AdminPage() {
  const { token } = useAuth();
  const [sources, setSources] = useState<ScrapeSource[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh() {
    if (!token) return;
    const [sourceList, productList] = await Promise.all([
      api.adminSources(token),
      api.products(token, { scrapedOnly: false }),
    ]);
    setSources(sourceList);
    setProducts(productList.filter((p) => p.scraped_at));
  }

  useEffect(() => {
    if (!token) return;
    refresh().catch((err: Error) => setError(err.message));
  }, [token]);

  async function handleScrape(sourceId: string) {
    if (!token) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await api.scrapeSource(token, sourceId);
      setMessage(
        `Scrape complete: ${result.total_scraped} products (${result.created} new, ${result.updated} updated).`,
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scrape failed");
    } finally {
      setLoading(false);
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
          Scrape products from country FitLine shops, then mark favorites for quick check-in.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Scrape product sources</h3>
        <ul className="mt-4 space-y-3">
          {sources.map((source) => (
            <li
              key={source.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{source.name}</p>
                <p className="text-sm text-slate-500">
                  {source.base_url}
                  {source.scrape_products_path}
                  {source.country_code ? ` · ${source.country_code}` : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={!source.can_scrape || loading}
                onClick={() => handleScrape(source.id)}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {loading ? "Scraping..." : "Scrape now"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {message && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Scraped products — toggle favorites</h3>
        <p className="mt-1 text-sm text-slate-500">Favorites appear first in check-in and check-out.</p>

        {products.length === 0 ? (
          <p className="mt-4 text-slate-500">No scraped products yet. Run a scrape above.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
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
                    <p className="text-xs text-slate-500">{product.external_id}</p>
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