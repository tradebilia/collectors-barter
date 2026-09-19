/**
 * Formats public-facing boolean values consistently without changing ordinary
 * titles, names, brand labels, or numeric values.
 */
export function formatPublicBooleanValue(value: string | boolean): string {
  if (value === true) return "Yes";
  if (value === false) return "No";

  const normalized = value.trim();
  const lowerCaseValue = normalized.toLowerCase();
  if (lowerCaseValue === "yes" || lowerCaseValue === "true") return "Yes";
  if (lowerCaseValue === "no" || lowerCaseValue === "false") return "No";
  return normalized;
}
