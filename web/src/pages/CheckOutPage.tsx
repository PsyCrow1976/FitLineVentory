import { FormEvent, useEffect, useState } from "react";
import { api, Product } from "../api";
import { useAuth } from "../auth";

export default function CheckOutPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api.products(token).then((list) => {
      setProducts(list);
      if (list.length > 0) setProductId(list[0].id);
    });
  }, [token]);

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

  return (
    <section className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold">Check out / consume</h2>
      <p className="mt-1 text-sm text-slate-500">Record product usage to track consumption</p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label className="block text-sm font-medium">
          Product
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>

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