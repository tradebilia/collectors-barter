const TITLE_STOP_WORDS = new Set([
  "a", "an", "and", "the", "for", "with", "w", "of", "new", "used", "rare", "very", "good",
  "excellent", "great", "mint", "condition", "authentic", "original", "vintage", "official",
]);

export type TitlePackagingState = "yes" | "no" | "unknown";

export function normalizeMarketplaceTitle(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\bw\s*\/\s*/g, "with ")
    .replace(/\borig\b/g, "original")
    .replace(/\bctrlr?\b/g, "controller")
    .replace(/nintendo entertainment system/g, "nes")
    .replace(/playstation\s+([1-5])/g, "ps$1")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titleContainsValue(title: unknown, targetValue: unknown): boolean {
  const titleText = normalizeMarketplaceTitle(title);
  const targetText = normalizeMarketplaceTitle(targetValue);
  if (!titleText || !targetText) return false;
  if (titleText === targetText || titleText.includes(` ${targetText} `)) return true;
  const targetTokens = targetText.split(" ").filter((token) => token.length > 1 && !TITLE_STOP_WORDS.has(token));
  if (!targetTokens.length) return false;
  const titleTokens = new Set(titleText.split(" "));
  return targetTokens.every((token) => titleTokens.has(token));
}

export function titlePackagingState(title: unknown): TitlePackagingState {
  const normalized = normalizeMarketplaceTitle(title);
  if (!normalized) return "unknown";
  if (/\b(?:no|without|missing)\s+(?:original\s+)?(?:box|packaging|package)\b|\bboxless\b|\bno\s+box\b/.test(normalized)) return "no";
  if (/\b(?:original\s+box|with\s+box|boxed|open\s+box|complete\s+with\s+(?:box|manuals?|instructions?)|with\s+(?:manuals?|instructions?))\b/.test(normalized)) return "yes";
  return "unknown";
}
