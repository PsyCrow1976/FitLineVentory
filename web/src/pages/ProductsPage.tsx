import { FormEvent, useEffect, useState } from "react";
import { api, Product, ProductSource } from "../api";
import { useAuth } from "../auth";

export default function ProductsPage() {
  const { token } = useAuth();
  const [sources, setSources] = useState<ProductSource[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [sourceId, setSourceId] = useState("");
  const [externalId, setExternalId] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("unit");
  const [price, setPrice] = useState("");

  useEffect(() => {
    if (!token) return;
    Promise.all([api.sources(token), api.products(token)])
      .then(([sourceList, productList]) => {
        setSources(sourceList);
        setProducts(productList);
        if (sourceList.length > 0) {
          setSourceId(sourceList[0].id);
        }
      })
      .catch((err: Error) => setError(err.message));
  }, [token]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setError("");
    setSuccess("");
    try {
      const attributes = price
        ? [{ key: "price_dkk", value: price, value_type: "decimal" }]
        : [];
      const product = await api.createProduct(token, {
        source_id: sourceId,
        external_id: externalId,
        name,
        unit,
        attributes,
      });
      setProducts((prev) => [...prev, product]);
      setExternalId("");
      setName("");
      setPrice("");
      setSuccess("Product added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add product");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">Add product</h2>
        <p className="mt-1 text-sm text-slate-500">Manual catalog entry for FitLine Denmark or other sources</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block text-sm font-medium">
            Source
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
            >
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name} ({source.country_code})
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium">
            Article / SKU
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              required
            />
          </label>

          <label className="block text-sm font-medium">
            Product name
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Unit
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              Price (DKK)
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="optional"
              />
            </label>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
          >
            Save product
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-3 text-sm text-green-700">{success}</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">Catalog</h2>
        <ul className="mt-4 divide-y divide-slate-100">
          {products.map((product) => {
            const source = sources.find((s) => s.id === product.source_id);
            const priceAttr = product.attributes.find((a) => a.key === "price_dkk");
            return (
              <li key={product.id} className="py-3">
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-slate-500">
                  {source?.name} · {product.external_id} · {product.unit}
                  {priceAttr ? ` · ${priceAttr.value} DKK` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}