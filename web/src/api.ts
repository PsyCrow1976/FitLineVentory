const API_BASE = "/api/v1";

export type ProductSource = {
  id: string;
  slug: string;
  name: string;
  base_url: string | null;
  country_code: string | null;
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
  attributes: ProductAttribute[];
};

export type InventoryItem = {
  id: string;
  product_id: string;
  quantity_on_hand: string;
  unit: string;
  product: Product;
  source: ProductSource;
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

export const api = {
  sources: (token: string) => request<ProductSource[]>("/sources", token),
  products: (token: string, sourceId?: string) =>
    request<Product[]>(sourceId ? `/products?source_id=${sourceId}` : "/products", token),
  createProduct: (token: string, payload: unknown) =>
    request<Product>("/products", token, { method: "POST", body: JSON.stringify(payload) }),
  inventory: (token: string) => request<InventoryItem[]>("/inventory", token),
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
  reorderSuggestions: (token: string) =>
    request<ReorderSuggestion[]>("/inventory/reorder-suggestions", token),
};