export function formatQuantity(value: string | number): string {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return String(value);
  }
  return String(Math.trunc(number));
}

export function sanitizeQuantityInput(value: string): string {
  return value.replace(/\D/g, "");
}

export function parseWholeQuantity(value: string): string {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return "1";
  }
  return String(parsed);
}