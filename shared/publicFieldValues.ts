import { formatPublicBooleanValue } from "./publicBooleanValues";

/**
 * Normalizes known categorical values for public presentation only. It never
 * changes stored listing data, item titles, names, brands, or free-form notes.
 */
const PUBLIC_CATEGORICAL_LABELS: Readonly<Record<string, string>> = {
  mint: "Mint",
  near_mint: "Near Mint",
  excellent: "Excellent",
  very_good: "Very Good",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  sealed: "Sealed",
  unsealed: "Unsealed",
  raw: "Raw",
  ungraded: "Ungraded",
  working: "Working",
  not_working: "Not Working",
  untested: "Untested",
  complete: "Complete",
  incomplete: "Incomplete",
  retired: "Retired",
  active: "Active",
  built: "Built",
  unbuilt: "Unbuilt",
  loose: "Loose",
  boxed: "Boxed",
};

export function formatPublicFieldValue(value: string | boolean | number): string {
  const booleanFormatted = formatPublicBooleanValue(value === true || value === false ? value : String(value));
  const normalized = booleanFormatted.trim();
  const key = normalized.toLowerCase().replace(/[\s-]+/g, "_");
  return PUBLIC_CATEGORICAL_LABELS[key] ?? normalized;
}
