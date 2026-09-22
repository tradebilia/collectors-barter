export type SocialPlatform = "Facebook" | "Instagram" | "X" | "Pinterest" | "LinkedIn" | "YouTube";
export type DraftStatus = "Draft" | "Needs Review" | "Approved" | "Scheduled" | "Published";
export type SocialDraftSource = "Original" | "High-Value Listing" | "Completed Trade" | "Verified Merchant";

export const TRADEBILIA_PUBLIC_ORIGIN = "https://tradebilia.manus.space";

export type SocialPromotionFact = {
  label: string;
  value: string;
};

export type SocialPromotionDetails = {
  itemTitle: string;
  listingId?: number | null;
  itemPath?: string | null;
  /** Public-safe metadata used only for choosing an abstract visual environment. */
  visualHints?: string[] | null;
  /** Browser-local managed storage URL for the generated per-listing scene. */
  generatedBackgroundUrl?: string | null;
  /** Scene-generation prompt version; v11 requires a complete faithful hero below the banner plus item-specific supporting elements. */
  generatedBackgroundVersion?: number | null;
  tradeItems?: Array<{
    listingId?: number | null;
    title: string;
    imageUrl?: string | null;
    estimatedValue?: number | null;
    direction?: "offered" | "requested";
    category?: string | null;
    itemType?: string | null;
    visualHints?: string[] | null;
    facts?: SocialPromotionFact[] | null;
    grade?: string | number | null;
    certificationCompany?: string | null;
    customGradingCompany?: string | null;
  }>;
  cashIncluded?: boolean;
  category: string | null;
  itemType: string | null;
  facts: SocialPromotionFact[];
  estimatedValue: number | null;
  createdAt: string | null;
  isNew: boolean;
};

export type SocialDraft = {
  id: string;
  source: SocialDraftSource;
  sourceSummary: string;
  title: string;
  copy: string;
  platforms: SocialPlatform[];
  mediaUrl: string;
  destinationUrl: string;
  promotion: SocialPromotionDetails | null;
  plannedDate: string;
  status: DraftStatus;
  updatedAt: string;
};

/** Public opportunity metadata used to refresh only visual environment hints in saved drafts. */
export type SocialPromotionVisualOpportunity = {
  listingId?: number | null;
  itemPath?: string | null;
  title?: string | null;
  category?: string | null;
  itemType?: string | null;
  visualHints?: unknown;
};

function normalizeVisualHintValues(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value
    .filter((hint): hint is string => typeof hint === "string")
    .map((hint) => hint.trim())
    .filter(Boolean)));
}

function normalizeVisualMatchValue(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

function findVisualOpportunity(promotion: SocialPromotionDetails, opportunities: readonly SocialPromotionVisualOpportunity[]) {
  const listingId = Number(promotion.listingId);
  if (Number.isFinite(listingId) && listingId > 0) {
    const byListingId = opportunities.find((opportunity) => Number(opportunity.listingId) === listingId);
    if (byListingId) return byListingId;
  }
  if (promotion.itemPath) {
    const byItemPath = opportunities.find((opportunity) => opportunity.itemPath === promotion.itemPath);
    if (byItemPath) return byItemPath;
  }
  const title = normalizeVisualMatchValue(promotion.itemTitle);
  const category = normalizeVisualMatchValue(promotion.category);
  const itemType = normalizeVisualMatchValue(promotion.itemType);
  return opportunities.find((opportunity) => (
    title === normalizeVisualMatchValue(opportunity.title)
    && category === normalizeVisualMatchValue(opportunity.category)
    && itemType === normalizeVisualMatchValue(opportunity.itemType)
  ));
}

/**
 * Refresh only public-safe environment hints on existing high-value drafts.
 * Copy, media, value, workflow status, and every user edit remain unchanged.
 */
export function reconcileSocialDraftVisualHints(
  drafts: readonly SocialDraft[],
  opportunities: readonly SocialPromotionVisualOpportunity[],
): SocialDraft[] {
  if (opportunities.length === 0) return drafts as SocialDraft[];
  let hasChanges = false;
  const reconciled = drafts.map((draft) => {
    if (draft.source !== "High-Value Listing" || !draft.promotion) return draft;
    const opportunity = findVisualOpportunity(draft.promotion, opportunities);
    const visualHints = normalizeVisualHintValues(opportunity?.visualHints);
    if (visualHints.length === 0) return draft;
    const currentHints = normalizeVisualHintValues(draft.promotion.visualHints);
    if (currentHints.join("\u001f") === visualHints.join("\u001f")) return draft;
    hasChanges = true;
    return { ...draft, promotion: { ...draft.promotion, visualHints } };
  });
  return hasChanges ? reconciled : drafts as SocialDraft[];
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = ["Facebook", "Instagram", "X", "Pinterest", "LinkedIn", "YouTube"];
export const SOCIAL_DRAFT_STATUSES: DraftStatus[] = ["Draft", "Needs Review", "Approved", "Scheduled", "Published"];

export const TRADEBILIA_FOOTER_PHRASES = [
  "Trade what you love.",
  "Build your collection.",
  "Find your next collectible.",
  "Where collectors connect.",
  "Swap. Discover. Collect.",
  "Your collection, your story.",
  "Collect with confidence.",
  "Make your next great trade.",
  "From one collector to another.",
  "Discover something remarkable.",
  "Keep collecting. Keep trading.",
  "The collector-to-collector exchange.",
] as const;

export function formatSocialCategory(category: string | null | undefined) {
  if (!category) return null;
  return category.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatSocialItemType(itemType: string | null | undefined) {
  if (!itemType) return null;
  return itemType.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatSocialValue(value: number | null | undefined) {
  if (!Number.isFinite(value) || !value || value < 0) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function getSocialPromotionItemTitle(title: string | null | undefined) {
  return (title || "Tradebilia collectible")
    .replace(/^(new\s+high[-\s]value\s+listing|recent\s+completed\s+trade)\s*:\s*/i, "")
    .trim() || "Tradebilia collectible";
}

export function getSocialFooterPhrase(seed: string, platform: SocialPlatform = "Facebook") {
  let hash = 0;
  for (const character of `${seed}:${platform}`) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return TRADEBILIA_FOOTER_PHRASES[hash % TRADEBILIA_FOOTER_PHRASES.length];
}

function buildCategoryAwareSocialCta(category: string | null | undefined, itemType: string | null | undefined) {
  const subject = formatSocialItemType(itemType)?.toLowerCase() || formatSocialCategory(category)?.toLowerCase();
  return subject ? `Discover this ${subject} on Tradebilia.` : "Discover, trade, and collect on Tradebilia.";
}

export function buildListingSocialCopy({
  itemTitle,
  category,
  itemType,
  facts,
  estimatedValue,
  isNew,
  destinationUrl,
}: Pick<SocialPromotionDetails, "itemTitle" | "category" | "itemType" | "facts" | "estimatedValue" | "isNew"> & { destinationUrl: string }) {
  const itemInformation = [
    formatSocialCategory(category),
    formatSocialItemType(itemType),
    ...facts.slice(0, 3).map((fact) => fact.value),
  ].filter((value): value is string => Boolean(value));
  const tradeValue = formatSocialValue(estimatedValue);

  return [
    isNew ? "NEW TO TRADEBILIA" : "NOW ON TRADEBILIA",
    "",
    itemTitle,
    itemInformation.length ? itemInformation.join(" · ") : "",
    tradeValue ? `Trade value: ${tradeValue}` : "",
    "",
    buildCategoryAwareSocialCta(category, itemType),
    "",
    "View this item:",
    destinationUrl,
  ].filter((line, index, lines) => line || (index > 0 && lines[index - 1] !== "")).join("\n").trim();
}

export function createSocialDraft(id: string, now = new Date().toISOString()): SocialDraft {
  return {
    id,
    source: "Original",
    sourceSummary: "Original Tradebilia-created content",
    title: "Untitled social post",
    copy: "",
    platforms: ["Facebook"],
    mediaUrl: "",
    destinationUrl: TRADEBILIA_PUBLIC_ORIGIN,
    promotion: null,
    plannedDate: "",
    status: "Draft",
    updatedAt: now,
  };
}

export type PromotionDraftInput = {
  source: Exclude<SocialDraftSource, "Original">;
  sourceSummary: string;
  title: string;
  copy: string;
  mediaUrl?: string | null;
  destinationUrl?: string | null;
  promotion?: SocialPromotionDetails | null;
};

export function createPromotionSocialDraft(
  id: string,
  input: PromotionDraftInput,
  now = new Date().toISOString(),
): SocialDraft {
  return {
    ...createSocialDraft(id, now),
    source: input.source,
    sourceSummary: input.sourceSummary,
    title: input.title,
    copy: input.copy,
    mediaUrl: input.mediaUrl ?? "",
    destinationUrl: input.destinationUrl || TRADEBILIA_PUBLIC_ORIGIN,
    promotion: input.promotion ?? null,
    platforms: ["Facebook", "Instagram", "X", "Pinterest"],
  };
}

export function filterSocialDrafts(drafts: readonly SocialDraft[], status: "All" | DraftStatus) {
  return status === "All" ? [...drafts] : drafts.filter((draft) => draft.status === status);
}

export function toggleSocialPlatform(draft: SocialDraft, platform: SocialPlatform, now = new Date().toISOString()): SocialDraft {
  const platforms = draft.platforms.includes(platform)
    ? draft.platforms.filter((item) => item !== platform)
    : [...draft.platforms, platform];
  return { ...draft, platforms, updatedAt: now };
}

export function requestSocialReview(draft: SocialDraft, now = new Date().toISOString()): SocialDraft | null {
  return draft.copy.trim() ? { ...draft, status: "Needs Review", updatedAt: now } : null;
}

export function approveSocialDraft(draft: SocialDraft, now = new Date().toISOString()): SocialDraft {
  return { ...draft, status: "Approved", updatedAt: now };
}
