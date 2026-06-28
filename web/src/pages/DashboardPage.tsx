import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, InventoryItem } from "../api";
import { useAuth } from "../auth";
import TransactionHistory from "../components/TransactionHistory";
import { countryLabel } from "../countries";
import { formatQuantity } from "../quantities";
import { formatSupplyDuration, usageLabel } from "../usage";

export default function DashboardPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [defaultCountry, setDefaultCountry] = useState("DK");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api.me(token).then((user) => setDefaultCountry(user.default_country_code));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    api
      .inventory(token, { allCountries: showAllCountries })
      .then(setItems)
      .catch((err: Error) => setError(err.message));
  }, [token, showAllCountries]);

  function toggleItem(item: InventoryItem) {
    setSelectedId((current) => (current === item.id ? null : item.id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inventory dashboard</h2>
          <p className="text-slate-500">
            {showAllCountries ? "All countries" : countryLabel(defaultCountry)} ·{" "}
            <Link to="/profile" className="text-brand-600 hover:underline">
              Profile
            </Link>
          </p>
          <p className="mt-1 text-sm text-slate-500">Tap an item to see how long your stock should last</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showAllCountries}
              onChange={(e) => setShowAllCountries(e.target.checked)}
            />
            All countries
          </label>
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

      <TransactionHistory
        title="Recent activity"
        allCountries={showAllCountries}
        limit={20}
        emptyMessage="No check-ins or check-outs yet."
      />

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600">No inventory yet.</p>
          <Link to="/products" className="mt-2 inline-block text-brand-600 hover:underline">
            Add a product first
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const isSelected = item.id === selectedId;
            return (
              <article
                key={item.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
                  isSelected ? "border-brand-300 ring-2 ring-brand-100" : "border-slate-200"
                }`}
              >
                <button type="button" onClick={() => toggleItem(item)} className="w-full text-left">
                  <p className="text-xs uppercase tracking-wide text-slate-400">{item.source.name}</p>
                  <h3 className="mt-1 font-semibold">{item.product.name}</h3>
                  <p className="mt-3 text-3xl font-bold text-brand-700">
                    {formatQuantity(item.quantity_on_hand)}{" "}
                    <span className="text-base font-medium text-slate-500">{item.unit}</span>
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {formatSupplyDuration(item.estimated_supply_days)} supply
                  </p>
                </button>

                {isSelected && (
                  <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600">
                    <p>
                      <span className="font-medium text-slate-800">Usage:</span>{" "}
                      {usageLabel(item.usage_days_per_unit, item.product.usage_is_custom)}
                    </p>
                    <p className="mt-2">
                      <span className="font-medium text-slate-800">Calculation:</span>{" "}
                      {formatQuantity(item.quantity_on_hand)} {item.unit} × {item.usage_days_per_unit} days
                    </p>
                    <p className="mt-2 text-lg font-semibold text-brand-700">
                      ≈ {formatSupplyDuration(item.estimated_supply_days)} ({item.estimated_supply_days} days)
                    </p>
                    <Link
                      to="/products"
                      className="mt-3 inline-block text-sm text-brand-600 hover:underline"
                    >
                      Change usage in Products
                    </Link>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}