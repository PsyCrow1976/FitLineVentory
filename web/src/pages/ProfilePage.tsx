import { FormEvent, useEffect, useState } from "react";
import { api, ProductSource } from "../api";
import { useAuth } from "../auth";
import { COUNTRY_NAMES } from "../countries";

export default function ProfilePage() {
  const { token } = useAuth();
  const [username, setUsername] = useState("");
  const [defaultCountry, setDefaultCountry] = useState("DK");
  const [sources, setSources] = useState<ProductSource[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([api.me(token), api.sources(token)])
      .then(([user, sourceList]) => {
        setUsername(user.username);
        setDefaultCountry(user.default_country_code);
        setSources(sourceList);
      })
      .catch((err: Error) => setError(err.message));
  }, [token]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await api.updateProfile(token, { default_country_code: defaultCountry });
      setDefaultCountry(updated.default_country_code);
      setSuccess("Profile saved. Product lists now use your default country.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  const countryOptions = sources
    .filter((source) => source.country_code)
    .sort((a, b) => (a.country_code ?? "").localeCompare(b.country_code ?? ""));

  return (
    <section className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold">Profile</h2>
      <p className="mt-1 text-sm text-slate-500">
        Choose which FitLine country shop your products, check-in, and inventory should default to.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Username
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600"
            value={username}
            readOnly
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Default country
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={defaultCountry}
            onChange={(e) => setDefaultCountry(e.target.value)}
          >
            {countryOptions.map((source) => (
              <option key={source.id} value={source.country_code ?? ""}>
                {source.country_code && COUNTRY_NAMES[source.country_code]
                  ? `${COUNTRY_NAMES[source.country_code]} (${source.country_code})`
                  : source.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-4 text-sm text-green-700">{success}</p>}
    </section>
  );
}