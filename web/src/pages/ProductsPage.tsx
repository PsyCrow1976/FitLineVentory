import { FormEvent, KeyboardEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Product, ProductSource } from "../api";
import { useAuth } from "../auth";
import { countryLabel } from "../countries";
import { DEFAULT_USAGE_DAYS, usageLabel } from "../usage";

function productPrice(product: Product): string | null {
  const priceAttr = product.attributes.find(
    (attr) => attr.key.startsWith("price_") || attr.key === "price",
  );
  if (!priceAttr) {
    return null;
  }
  const currency = product.currency ?? "DKK";
  return `${priceAttr.value} ${currency}`;
}

function TagChip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-800">
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full px-1 text-brand-600 hover:bg-brand-100 hover:text-brand-900"
          aria-label={`Remove tag ${label}`}
        >
          ×
        </button>
      )}
    </span>
  );
}

export default function ProductsPage() {
  const { token } = useAuth();
  const [sources, setSources] = useState<ProductSource[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [savingChanges, setSavingChanges] = useState(false);
  const [editUsageCustom, setEditUsageCustom] = useState(false);
  const [editUsageDays, setEditUsageDays] = useState(DEFAULT_USAGE_DAYS);
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [defaultCountry, setDefaultCountry] = useState("DK");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [sourceId, setSourceId] = useState("");
  const [externalId, setExternalId] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("unit");
  const [price, setPrice] = useState("");

  const selectedProduct = products.find((product) => product.id === selectedId) ?? null;
  const selectedSource = sources.find((source) => source.id === sourceId);

  function loadProducts(allCountries: boolean) {
    if (!token) return;
    api
      .products(token, { allCountries })
      .then(setProducts)
      .catch((err: Error) => setError(err.message));
  }

  useEffect(() => {
    if (!token) return;
    Promise.all([api.me(token), api.sources(token)])
      .then(([user, sourceList]) => {
        setSources(sourceList);
        setDefaultCountry(user.default_country_code);
        const preferred = sourceList.find((s) => s.country_code === user.default_country_code);
        if (preferred) {
          setSourceId(preferred.id);
        } else if (sourceList.length > 0) {
          setSourceId(sourceList[0].id);
        }
      })
      .catch((err: Error) => setError(err.message));
  }, [token]);

  useEffect(() => {
    loadProducts(showAllCountries);
  }, [token, showAllCountries]);

  useEffect(() => {
    if (selectedProduct) {
      setEditTags(selectedProduct.tags ?? []);
      setNewTag("");
      setEditUsageCustom(selectedProduct.usage_is_custom);
      setEditUsageDays(selectedProduct.usage_days_per_unit);
    }
  }, [selectedProduct?.id, selectedProduct?.tags, selectedProduct?.usage_is_custom, selectedProduct?.usage_days_per_unit]);

  function selectProduct(product: Product) {
    setSelectedId((current) => (current === product.id ? null : product.id));
    setError("");
    setSuccess("");
  }

  function addTag() {
    const cleaned = newTag.trim();
    if (!cleaned) return;
    if (editTags.some((tag) => tag.toLowerCase() === cleaned.toLowerCase())) {
      setNewTag("");
      return;
    }
    setEditTags((prev) => [...prev, cleaned]);
    setNewTag("");
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    }
  }

  function removeTag(tag: string) {
    setEditTags((prev) => prev.filter((item) => item !== tag));
  }

  async function saveChanges() {
    if (!token || !selectedProduct) return;
    setSavingChanges(true);
    setError("");
    setSuccess("");
    try {
      const usageDays = editUsageCustom ? Math.max(1, editUsageDays) : DEFAULT_USAGE_DAYS;
      const updated = await api.updateProduct(token, selectedProduct.id, {
        tags: editTags,
        usage_is_custom: editUsageCustom,
        usage_days_per_unit: usageDays,
      });
      setProducts((prev) => prev.map((product) => (product.id === updated.id ? updated : product)));
      setSuccess("Product updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSavingChanges(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setError("");
    setSuccess("");
    try {
      const currency = selectedSource?.country_code === "DK" ? "DKK" : "EUR";
      const attributes = [];
      if (price) {
        attributes.push({ key: `price_${currency.toLowerCase()}`, value: price, value_type: "decimal" });
        attributes.push({ key: "currency", value: currency, value_type: "string" });
      }
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
              Price ({selectedSource?.country_code === "DK" ? "DKK" : "currency"})
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

        {error && !selectedProduct && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {success && !selectedProduct && <p className="mt-3 text-sm text-green-700">{success}</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Catalog</h2>
            <p className="mt-1 text-sm text-slate-500">
              Showing {showAllCountries ? "all countries" : countryLabel(defaultCountry)} ·{" "}
              <Link to="/profile" className="text-brand-600 hover:underline">
                change in Profile
              </Link>
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showAllCountries}
              onChange={(e) => setShowAllCountries(e.target.checked)}
            />
            All countries
          </label>
        </div>
        <p className="mt-2 text-sm text-slate-500">Tap a product to edit tags and usage</p>

        {products.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No products yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {products.map((product) => {
              const isSelected = product.id === selectedId;
              const priceLabel = productPrice(product);
              return (
                <li key={product.id} className="py-1">
                  <button
                    type="button"
                    onClick={() => selectProduct(product)}
                    className={`w-full rounded-lg py-3 text-left transition ${
                      isSelected ? "bg-brand-50 px-3" : "hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-slate-500">
                      {countryLabel(product.country_code, product.source_name)} · {product.external_id} ·{" "}
                      {product.unit}
                      {priceLabel ? ` · ${priceLabel}` : ""}
                      {product.currency && !priceLabel ? ` · ${product.currency}` : ""}
                      {" · "}
                      {usageLabel(product.usage_days_per_unit, product.usage_is_custom)}
                    </p>
                    {product.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {product.tags.map((tag) => (
                          <TagChip key={tag} label={tag} />
                        ))}
                      </div>
                    )}
                  </button>

                  {isSelected && (
                    <div className="mb-3 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
                      <p className="text-sm font-medium text-slate-700">Usage per unit</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Default is 1 month (30 days). Inventory duration = quantity × days per unit.
                      </p>
                      <div className="mt-3 space-y-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name={`usage-${product.id}`}
                            checked={!editUsageCustom}
                            onChange={() => {
                              setEditUsageCustom(false);
                              setEditUsageDays(DEFAULT_USAGE_DAYS);
                            }}
                          />
                          Standard — 1 month (30 days) per unit
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name={`usage-${product.id}`}
                            checked={editUsageCustom}
                            onChange={() => setEditUsageCustom(true)}
                          />
                          Custom usage
                        </label>
                        {editUsageCustom && (
                          <label className="block text-sm">
                            Days per unit
                            <input
                              type="number"
                              min={1}
                              max={3650}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                              value={editUsageDays}
                              onChange={(e) => setEditUsageDays(Number(e.target.value) || 1)}
                            />
                          </label>
                        )}
                      </div>

                      <p className="mt-4 text-sm font-medium text-slate-700">Tags</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {editTags.length === 0 ? (
                          <p className="text-sm text-slate-500">No tags yet — add one below.</p>
                        ) : (
                          editTags.map((tag) => (
                            <TagChip key={tag} label={tag} onRemove={() => removeTag(tag)} />
                          ))
                        )}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <input
                          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={handleTagKeyDown}
                          placeholder="Add tag (e.g. daily, promo)"
                        />
                        <button
                          type="button"
                          onClick={addTag}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
                        >
                          Add
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={savingChanges}
                        onClick={saveChanges}
                        className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                      >
                        {savingChanges ? "Saving..." : "Save changes"}
                      </button>

                      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                      {success && <p className="mt-3 text-sm text-green-700">{success}</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}