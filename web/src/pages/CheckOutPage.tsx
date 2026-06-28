import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, Product, productImageUrl } from "../api";
import { useAuth } from "../auth";
import { countryLabel } from "../countries";

export default function CheckOutPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [defaultCountry, setDefaultCountry] = useState("DK");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api.me(token).then((user) => setDefaultCountry(user.default_country_code));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    api.products(token, { forCheckin: true, allCountries: showAllCountries }).then((list) => {
      setProducts(list);
      if (list.length > 0) setProductId(list[0].id);
    });
  }, [token, showAllCountries]);

  const visibleProducts = useMemo(() => {
    if (showAll) return products;
    const favorites = products.filter((p) => p.is_favorite);
    return favorites.length > 0 ? favorites : products;
  }, [products, showAll]);

  const favoritesCount = products.filter((p) => p.is_favorite).length;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setError("");
    setMessage("");
    try {
      const result = await api.checkOut(token, { product_id: productId, quantity, note: note || undefined });
      setMessage(`Checked out. Remaining: ${result.quantity_on_hand} ${result.unit}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-out failed");
    }
  }

  const selected = visibleProducts.find((p) => p.id === productId);

  return (
    <section className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold">Check out / consume</h2>
      <p className="mt-1 text-sm text-slate-500">
        {showAllCountries ? "All countries" : countryLabel(defaultCountry)} ·{" "}
        <Link to="/profile" className="text-brand-600 hover:underline">
          Profile
        </Link>
      </p>

      <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={showAllCountries}
          onChange={(e) => setShowAllCountries(e.target.checked)}
        />
        Show all countries
      </label>

      {favoritesCount > 0 && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              !showAll ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            Favorites ({favoritesCount})
          </button>
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              showAll ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            All products
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label className="block text-sm font-medium">
          Product
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            {visibleProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.is_favorite ? "★ " : ""}
                {product.name}
              </option>
            ))}
          </select>
        </label>

        {selected && productImageUrl(selected) && (
          <img
            src={productImageUrl(selected)!}
            alt={selected.name}
            className="mx-auto h-24 object-contain"
          />
        )}

        <label className="block text-sm font-medium">
          Quantity
          <input
            type="number"
            min="0.001"
            step="0.001"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm font-medium">
          Note
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Daily use, travel pack..."
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
        >
          Check out
        </button>
      </form>

      {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}