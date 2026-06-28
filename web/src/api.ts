const API_BASE = "/api/v1";

export type UserInfo = {
  id: string;
  username: string;
  is_admin: boolean;
  default_country_code: string;
};

export type ProductSource = {
  id: string;
  slug: string;
  name: string;
  base_url: string | null;
  country_code: string | null;
  scrape_products_path?: string | null;
};

export type ScrapeSource = ProductSource & {
  can_scrape: boolean;
};

export type ProductAttribute = {
  id: string;
  key: string;
  value: string;
  value_type: string;
};

export type Product = {
  id: string;
  source_id: string;
  external_id: string;
  name: string;
  description: string | null;
  unit: string;
  metadata: Record<string, unknown>;
  tags: string[];
  image_url: string | null;
  image_path: string | null;
  source_url: string | null;
  is_favorite: boolean;
  scraped_at: string | null;
  attributes: ProductAttribute[];
  source_name: string | null;
  country_code: string | null;
  currency: string | null;
  usage_days_per_unit: number;
  usage_is_custom: boolean;
};

export type InventoryItem = {
  id: string;
  product_id: string;
  quantity_on_hand: string;
  unit: string;
  product: Product;
  source: ProductSource;
  usage_days_per_unit: number;
  estimated_supply_days: number;
};

export type ReorderSuggestion = {
  product_id: string;
  product_name: string;
  source_name: string;
  country_code: string | null;
  quantity_on_hand: string;
  unit: string;
  average_daily_consumption: string;
  estimated_days_remaining: string | null;
  suggested_reorder_date: string | null;
  urgency: string;
};

export type ScrapeResult = {
  created: number;
  updated: number;
  total_scraped: number;
};

async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(typeof detail.detail === "string" ? detail.detail : "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function login(username: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error("Invalid username or password");
  }
  const data = await response.json();
  return data.access_token as string;
}

export function productImageUrl(product: Product): string | null {
  if (product.image_path) {
    return `${API_BASE}/media/products/${product.external_id}.png`;
  }
  return product.image_url;
}

export const api = {
  me: (token: string) => request<UserInfo>("/auth/me", token),
  updateProfile: (token: string, payload: { default_country_code: string }) =>
    request<UserInfo>("/auth/profile", token, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  sources: (token: string) => request<ProductSource[]>("/sources", token),
  adminSources: (token: string) => request<ScrapeSource[]>("/admin/sources", token),
  scrapeSource: (token: string, sourceId: string) =>
    request<ScrapeResult>(`/admin/scrape/${sourceId}?download_images=true`, token, { method: "POST" }),
  products: (
    token: string,
    options?: {
      sourceId?: string;
      countryCode?: string;
      allCountries?: boolean;
      favoritesOnly?: boolean;
      forCheckin?: boolean;
      scrapedOnly?: boolean;
    },
  ) => {
    const params = new URLSearchParams();
    if (options?.sourceId) params.set("source_id", options.sourceId);
    if (options?.countryCode) params.set("country_code", options.countryCode);
    if (options?.allCountries) params.set("all_countries", "true");
    if (options?.favoritesOnly) params.set("favorites_only", "true");
    if (options?.forCheckin) params.set("for_checkin", "true");
    if (options?.scrapedOnly) params.set("scraped_only", "true");
    const query = params.toString();
    return request<Product[]>(`/products${query ? `?${query}` : ""}`, token);
  },
  createProduct: (token: string, payload: unknown) =>
    request<Product>("/products", token, { method: "POST", body: JSON.stringify(payload) }),
  setFavorite: (token: string, productId: string, isFavorite: boolean) =>
    request<Product>(`/products/${productId}/favorite`, token, {
      method: "PATCH",
      body: JSON.stringify({ is_favorite: isFavorite }),
    }),
  updateProduct: (
    token: string,
    productId: string,
    payload: {
      tags?: string[];
      usage_days_per_unit?: number;
      usage_is_custom?: boolean;
    },
  ) =>
    request<Product>(`/products/${productId}`, token, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  inventory: (
    token: string,
    options?: { countryCode?: string; allCountries?: boolean },
  ) => {
    const params = new URLSearchParams();
    if (options?.countryCode) params.set("country_code", options.countryCode);
    if (options?.allCountries) params.set("all_countries", "true");
    const query = params.toString();
    return request<InventoryItem[]>(`/inventory${query ? `?${query}` : ""}`, token);
  },
  checkIn: (token: string, payload: { product_id: string; quantity: string; note?: string }) =>
    request<InventoryItem>("/inventory/check-in", token, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  checkOut: (token: string, payload: { product_id: string; quantity: string; note?: string }) =>
    request<InventoryItem>("/inventory/check-out", token, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  reorderSuggestions: (
    token: string,
    options?: { countryCode?: string; allCountries?: boolean },
  ) => {
    const params = new URLSearchParams();
    if (options?.countryCode) params.set("country_code", options.countryCode);
    if (options?.allCountries) params.set("all_countries", "true");
    const query = params.toString();
    return request<ReorderSuggestion[]>(`/inventory/reorder-suggestions${query ? `?${query}` : ""}`, token);
  },
};