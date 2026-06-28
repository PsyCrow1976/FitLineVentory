import { useEffect, useState } from "react";
import { api, ReorderSuggestion } from "../api";
import { useAuth } from "../auth";

const urgencyStyles: Record<string, string> = {
  out_of_stock: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-green-100 text-green-800",
  unknown: "bg-slate-100 text-slate-700",
};

export default function ReorderPage() {
  const { token } = useAuth();
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api
      .reorderSuggestions(token)
      .then(setSuggestions)
      .catch((err: Error) => setError(err.message));
  }, [token]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Reorder suggestions</h2>
        <p className="text-slate-500">Based on your consumption over the last 30 days</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {suggestions.map((item) => (
          <article key={item.product_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {item.source_name} {item.country_code ? `(${item.country_code})` : ""}
                </p>
                <h3 className="font-semibold">{item.product_name}</h3>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${urgencyStyles[item.urgency]}`}>
                {item.urgency.replace(/_/g, " ")}
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500">On hand</dt>
                <dd className="font-medium">
                  {item.quantity_on_hand} {item.unit}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Avg / day</dt>
                <dd className="font-medium">{item.average_daily_consumption}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Days left</dt>
                <dd className="font-medium">{item.estimated_days_remaining ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Reorder by</dt>
                <dd className="font-medium">
                  {item.suggested_reorder_date
                    ? new Date(item.suggested_reorder_date).toLocaleDateString()
                    : "—"}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}