const TITLE_STOP_WORDS = new Set([
  "a", "an", "and", "the", "for", "with", "w", "of", "new", "used", "rare", "very", "good",
  "excellent", "great", "mint", "condition", "authentic", "original", "vintage", "official",
]);

export type TitlePackagingState = "yes" | "no" | "unknown";

export type MarketplaceProductRole =
  | "whole_item"
  | "replacement_part"
  | "packaging_only"
  | "manual_only"
  | "compatibility_only"
  | "bundle_or_lot"
  | "reproduction"
  | "unknown";

export type MarketplaceProductRoleEvidence = {
  role: MarketplaceProductRole;
  confidence: "high" | "medium" | "unknown";
  matchedTerms: string[];
  rationale: string;
};

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

function titleHasAny(title: string, patterns: RegExp[]): string[] {
  return patterns.flatMap((pattern) => {
    const match = title.match(pattern);
    return match?.[0] ? [match[0]] : [];
  });
}

/**
 * Classifies only explicit product-role wording. Generic marketplace labels
 * such as "controller" or "accessory" intentionally remain unknown; they do
 * not prove that a listing is a different product from the target.
 */
export function classifyMarketplaceProductRole(title: unknown): MarketplaceProductRoleEvidence {
  const normalized = normalizeMarketplaceTitle(title);
  if (!normalized) return { role: "unknown", confidence: "unknown", matchedTerms: [], rationale: "No listing title was available." };

  const reproductionTerms = titleHasAny(normalized, [
    /\b(?:replica|reproduction|facsimile|counterfeit|unofficial)\b/i,
  ]);
  if (reproductionTerms.length > 0) {
    return { role: "reproduction", confidence: "high", matchedTerms: reproductionTerms, rationale: "The title explicitly identifies a replica, reproduction, facsimile, counterfeit, or unofficial item." };
  }

  const lotTerms = titleHasAny(normalized, [
    /\b(?:mixed\s+)?(?:lot|bundle|group|collection|assortment|multipack|multi\s+pack)\b/i,
    /\b(?:pair|duo|trio)\b/i,
  ]);
  if (lotTerms.length > 0) {
    return { role: "bundle_or_lot", confidence: "high", matchedTerms: lotTerms, rationale: "The title explicitly identifies multiple items, a bundle, or a collection/lot." };
  }

  const packagingTerms = titleHasAny(normalized, [
    /\b(?:empty|only|replacement)\s+(?:box|case|packaging|package|wrapper|cover)\b/i,
    /\b(?:box|case|packaging|package|wrapper)\s+only\b/i,
  ]);
  if (packagingTerms.length > 0) {
    return { role: "packaging_only", confidence: "high", matchedTerms: packagingTerms, rationale: "The title explicitly says the listing is packaging-only." };
  }

  const manualTerms = titleHasAny(normalized, [
    /\b(?:manual|instruction(?:s)?|booklet|guide)\s+only\b/i,
    /^\s*(?:manual|instruction(?:s)?|booklet|guide)\b/i,
  ]);
  if (manualTerms.length > 0) {
    return { role: "manual_only", confidence: "high", matchedTerms: manualTerms, rationale: "The title explicitly says the listing is a manual or instruction material only." };
  }

  const compatibilityTerms = titleHasAny(normalized, [
    /\b(?:compatible\s+with|fits|for\s+use\s+with)\b/i,
  ]);
  const replacementTerms = titleHasAny(normalized, [
    /\b(?:replacement|spare|repair|parts?\s+only)\b/i,
  ]);
  const componentTerms = titleHasAny(normalized, [
    /\b(?:cable|cord|adapter|ac\s+adapter|charger|battery\s+cover|button|shell|case|stand|strap|parts?)\b/i,
  ]);
  const includedComponent = /\b(?:with|includes?|including)\b[^\n]{0,42}\b(?:replacement|spare)\b/i.test(normalized)
    || /\b(?:replacement|spare)\b[^\n]{0,42}\b(?:included|includes?|with)\b/i.test(normalized);
  if (compatibilityTerms.length > 0 && !replacementTerms.length && !includedComponent) {
    return { role: "compatibility_only", confidence: "medium", matchedTerms: compatibilityTerms, rationale: "The title describes compatibility with a product rather than clearly identifying the product itself." };
  }
  if (replacementTerms.length > 0 && componentTerms.length > 0 && !includedComponent) {
    return { role: "replacement_part", confidence: "high", matchedTerms: [...replacementTerms, ...componentTerms], rationale: "The title identifies a replacement or spare component rather than the complete item." };
  }

  return { role: "unknown", confidence: "unknown", matchedTerms: [], rationale: "The title does not provide reliable product-role evidence." };
}

export function buildMarketplaceTitleEvidence(title: unknown): Record<string, unknown> {
  const normalized = normalizeMarketplaceTitle(title);
  const role = classifyMarketplaceProductRole(title);
  return {
    normalizedTitle: normalized,
    productRole: role,
    packagingState: titlePackagingState(title),
  };
}

export function titlePackagingState(title: unknown): TitlePackagingState {
  const normalized = normalizeMarketplaceTitle(title);
  if (!normalized) return "unknown";
  if (/\b(?:no|without|missing)\s+(?:original\s+)?(?:box|packaging|package)\b|\bboxless\b|\bno\s+box\b/.test(normalized)) return "no";
  if (/\b(?:original\s+box|with\s+box|boxed|open\s+box|complete\s+with\s+(?:box|manuals?|instructions?)|with\s+(?:manuals?|instructions?))\b/.test(normalized)) return "yes";
  return "unknown";
}
