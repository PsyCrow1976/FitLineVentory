import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, InventoryItem } from "../api";
import { useAuth } from "../auth";

export default function DashboardPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api
      .inventory(token)
      .then(setItems)
      .catch((err: Error) => setError(err.message));
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inventory dashboard</h2>
          <p className="text-slate-500">Current stock across your products</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/check-in"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Check in
          </Link>
          <Link
            to="/reorder"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Reorder hints
          </Link>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600">No inventory yet.</p>
          <Link to="/products" className="mt-2 inline-block text-brand-600 hover:underline">
            Add a product first
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">{item.source.name}</p>
              <h3 className="mt-1 font-semibold">{item.product.name}</h3>
              <p className="mt-3 text-3xl font-bold text-brand-700">
                {item.quantity_on_hand} <span className="text-base font-medium text-slate-500">{item.unit}</span>
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}