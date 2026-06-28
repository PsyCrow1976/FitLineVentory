import { useEffect, useState } from "react";
import { api, InventoryTransaction } from "../api";
import { useAuth } from "../auth";
import { countryLabel } from "../countries";

type TransactionHistoryProps = {
  title: string;
  transactionType?: "check_in" | "check_out";
  allCountries?: boolean;
  limit?: number;
  refreshKey?: number;
  emptyMessage: string;
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function typeLabel(type: string): string {
  if (type === "check_in") return "Check in";
  if (type === "check_out") return "Check out";
  return type.replace(/_/g, " ");
}

function typeStyles(type: string): string {
  if (type === "check_in") return "bg-green-100 text-green-800";
  if (type === "check_out") return "bg-orange-100 text-orange-800";
  return "bg-slate-100 text-slate-700";
}

export default function TransactionHistory({
  title,
  transactionType,
  allCountries = false,
  limit = 30,
  refreshKey = 0,
  emptyMessage,
}: TransactionHistoryProps) {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api
      .transactions(token, { transactionType, allCountries, limit })
      .then(setTransactions)
      .catch((err: Error) => setError(err.message));
  }, [token, transactionType, allCountries, limit, refreshKey]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold">{title}</h3>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {!error && transactions.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {transactions.map((txn) => (
            <li key={txn.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeStyles(txn.type)}`}>
                    {typeLabel(txn.type)}
                  </span>
                  <p className="font-medium text-slate-900">{txn.product_name}</p>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {countryLabel(txn.country_code)}
                  {txn.note ? ` · ${txn.note}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <p className="font-semibold text-slate-900">
                  {txn.type === "check_out" ? "−" : "+"}
                  {txn.quantity} {txn.unit}
                </p>
                <p className="text-xs text-slate-500">{formatWhen(txn.occurred_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}