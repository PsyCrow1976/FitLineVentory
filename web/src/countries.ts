export const COUNTRY_NAMES: Record<string, string> = {
  DK: "Denmark",
  DE: "Germany",
  NO: "Norway",
  SE: "Sweden",
  FI: "Finland",
};

export function countryLabel(code: string | null | undefined, sourceName?: string | null): string {
  if (code && COUNTRY_NAMES[code]) {
    return `${COUNTRY_NAMES[code]} (${code})`;
  }
  if (code) {
    return code;
  }
  return sourceName ?? "Unknown";
}