export function getGlobalSearchQuery(search: string) {
  return new URLSearchParams(search).get("q")?.trim() ?? "";
}

export function parseGlobalSearchValue(value: string) {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}
