export const DEFAULT_USAGE_DAYS = 30;

export function usageLabel(days: number, isCustom: boolean): string {
  if (!isCustom && days === DEFAULT_USAGE_DAYS) {
    return "1 month (30 days) per unit";
  }
  return `${days} day${days === 1 ? "" : "s"} per unit (custom)`;
}

export function formatSupplyDuration(totalDays: number): string {
  if (totalDays <= 0) {
    return "Out of stock";
  }
  if (totalDays === 1) {
    return "~1 day";
  }
  if (totalDays < 14) {
    return `~${totalDays} days`;
  }
  if (totalDays < 60) {
    const weeks = Math.round(totalDays / 7);
    return `~${weeks} week${weeks === 1 ? "" : "s"}`;
  }
  const months = Math.round((totalDays / 30) * 10) / 10;
  if (months < 24) {
    return `~${months} month${months === 1 ? "" : "s"}`;
  }
  const years = Math.round((totalDays / 365) * 10) / 10;
  return `~${years} year${years === 1 ? "" : "s"}`;
}

export function estimatedSupplyDays(quantity: string | number, usageDaysPerUnit: number): number {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    return 0;
  }
  return Math.floor(qty * usageDaysPerUnit);
}