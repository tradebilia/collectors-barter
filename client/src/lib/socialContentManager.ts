import {
  TNN_DEFAULT_DUO_OPENING_STYLE,
  TNN_VIDEO_DURATION_SECONDS,
  TNN_VIDEO_DURATIONS as APPROVED_TNN_VIDEO_DURATIONS,
  TNN_WEBSITE_TICKER,
  chooseTnnClosingTaglineId,
  formatTnnGrade,
  getTnnHomepageTagline,
  isTnnHomepageTaglineId,
  isTnnDuoOpeningStyle,
  type TnnHomepageTaglineId,
  type TnnDuoOpeningStyle,
  type TnnDuoOpeningStyleSelection,
  type TnnTranscriptTurn,
} from "@shared/tnnVideoPolicy";

export { TNN_VIDEO_DURATION_SECONDS, TNN_WEBSITE_TICKER, formatTnnGrade } from "@shared/tnnVideoPolicy";

export type SocialPlatform = "Facebook" | "Instagram" | "X" | "Pinterest" | "LinkedIn" | "YouTube";
export type DraftStatus = "Draft" | "Needs Review" | "Approved" | "Scheduled" | "Published";
export type SocialDraftSource = "Original" | "High-Value Listing" | "Completed Trade" | "Verified Merchant";

export const TRADEBILIA_PUBLIC_ORIGIN = "https://tradebilia.manus.space";
export const TNN_MIN_COMPLETED_TRADE_VALUE = 1_000;
export const TNN_VIDEO_DURATIONS = APPROVED_TNN_VIDEO_DURATIONS;
export type TnnVideoDuration = typeof TNN_VIDEO_DURATIONS[number];
export type TnnAnchorMode = "max" | "sidney" | "duo";
export type { TnnHomepageTaglineId, TnnDuoOpeningStyle, TnnDuoOpeningStyleSelection, TnnTranscriptTurn } from "@shared/tnnVideoPolicy";
export type TnnScriptStatus = "not-drafted" | "drafting" | "draft-ready" | "draft-failed";
export type TnnGenerationStatus = "not-started" | "starting" | "generating" | "generation-failed" | "final-video-attached";
export type TnnVideoReviewStatus = "not-ready" | "needs-review" | "approved";

export const TNN_ANCHORS = {
  max: {
    id: "max" as const,
    name: "Max Tradebloski",
    description: "middle-aged American male TNN news anchor; calm, authoritative, professional",
  },
  sidney: {
    id: "sidney" as const,
    name: "Sidney Tradewell",
    description: "middle-aged American female TNN news anchor; poised, credible, professional",
  },
} as const;

export const TNN_SCRIPT_WORD_BUDGET: Record<TnnVideoDuration, { minimum: number; maximum: number }> = {
  45: { minimum: 80, maximum: 100 },
};

/** The narrated item-detail limit preserves clear pacing; remaining selected items are acknowledged generically. */
export const TNN_NARRATED_ITEM_LIMIT: Record<TnnVideoDuration, number> = {
  45: 4,
};

export type SocialPromotionFact = {
  label: string;
  value: string;
};

export type TnnTradeItem = {
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
};

export type SocialPromotionDetails = {
  itemTitle: string;
  sellerName?: string | null;
  buyerName?: string | null;
  /** Admin-only opaque reference used by the server to re-check TNN eligibility. Never sent to the video model. */
  tradeId?: number | null;
  listingId?: number | null;
  itemPath?: string | null;
  /** Public-safe metadata used only for choosing an abstract visual environment. */
  visualHints?: string[] | null;
  /** Browser-local managed storage URL for the generated per-listing scene. */
  generatedBackgroundUrl?: string | null;
  /** Scene-generation prompt version; v12 supplies item-associated context only while the exact listing image is rendered once by the canvas. */
  generatedBackgroundVersion?: number | null;
  tradeItems?: TnnTradeItem[];
  cashIncluded?: boolean;
  category: string | null;
  itemType: string | null;
  facts: SocialPromotionFact[];
  /** For a completed trade, this is the aggregate estimated item value and remains admin-only. */
  estimatedValue: number | null;
  createdAt: string | null;
  isNew: boolean;
};

export type SocialVideoPlan = {
  format: "16:9";
  durationSeconds: TnnVideoDuration;
  hostStyle: "tnn-breaking-news-anchor";
  voiceProfile: "tnn-professional-american-news-anchor";
  anchorMode: TnnAnchorMode;
  /** Resolved and draft-stable style; used only for duo reports. */
  duoOpeningStyle: TnnDuoOpeningStyle;
  /** Browser-local selector state; the server receives only the resolved approved style. */
  duoOpeningStyleSelection: TnnDuoOpeningStyleSelection;
  /** Resolved once per TNN draft from the approved homepage phrase loop. */
  closingTaglineId: TnnHomepageTaglineId;
  /** Canonical text snapshot for clear review of this browser-local plan. */
  closingTagline: string;
  anchorNames: string[];
  sellerName: string;
  buyerName: string;
  cashOnly: boolean;
  headline: "Breaking News from Tradebilia";
  tickerText: string;
  selectedItemIndexes: number[];
  selectedItems: TnnTradeItem[];
  additionalItemsCount: number;
  /** Review-only turn assignments. Speaker labels are not spoken or captioned in video. */
  scriptTurns: TnnTranscriptTurn[];
  script: string;
  scriptWordCount: number;
  estimatedSpeechSeconds: number;
  /** Server-issued short-lived binding for an approved fact-locked transcript. */
  factLock?: string;
  scriptDraftAttempts: number;
  scriptStatus: TnnScriptStatus;
  generationAttempt: number;
  generationStatus: TnnGenerationStatus;
  videoReviewStatus: TnnVideoReviewStatus;
  taskId?: string;
  taskUrl?: string;
  videoUrl?: string;
  errorMessage?: string;
  statusMessage?: string;
  createdAt: string;
};

/** A completed exchange is a sale only when one side has collectibles and the other has none. */
type CashTradePromotion = Pick<SocialPromotionDetails, "cashIncluded" | "tradeItems">;

export function isCashOnlyCompletedTrade(promotion: CashTradePromotion | null | undefined) {
  if (!promotion?.cashIncluded) return false;
  const items = promotion.tradeItems ?? [];
  const hasOfferedItems = items.some((item) => item.direction === "offered");
  const hasRequestedItems = items.some((item) => item.direction !== "offered");
  return hasOfferedItems !== hasRequestedItems;
}

export function getCompletedTradePostLabel(promotion: CashTradePromotion | null | undefined) {
  return isCashOnlyCompletedTrade(promotion) ? "SOLD" : "TRADE ALERT";
}

export function isTnnEligibleCompletedTrade(promotion: SocialPromotionDetails | null | undefined) {
  return Number(promotion?.estimatedValue ?? 0) >= TNN_MIN_COMPLETED_TRADE_VALUE
    && Number(promotion?.tradeId ?? 0) > 0;
}

export function countTnnScriptWords(script: string | null | undefined) {
  return String(script ?? "").trim().match(/\S+/g)?.length ?? 0;
}

export function estimateTnnSpeechSeconds(script: string | null | undefined) {
  return Math.ceil(countTnnScriptWords(script) / 2);
}

export function getTnnAnchorNames(mode: TnnAnchorMode) {
  if (mode === "duo") return [TNN_ANCHORS.max.name, TNN_ANCHORS.sidney.name];
  return [TNN_ANCHORS[mode].name];
}

/**
 * Selects a roughly one-in-four duo report; solo reports alternate so the same
 * solo anchor is never selected twice in succession. The caller persists the
 * returned solo anchor in its browser-local admin preferences.
 */
export function chooseNextTnnAnchor(lastSoloAnchor: Exclude<TnnAnchorMode, "duo"> | null | undefined, randomValue = Math.random()): TnnAnchorMode {
  const normalizedRandom = Number.isFinite(randomValue) ? Math.min(Math.max(randomValue, 0), 0.999999) : 0.5;
  if (normalizedRandom < 0.25) return "duo";
  if (lastSoloAnchor === "max") return "sidney";
  if (lastSoloAnchor === "sidney") return "max";
  return normalizedRandom < 0.625 ? "max" : "sidney";
}

function normalizedTnnItem(item: TnnTradeItem): TnnTradeItem | null {
  const title = String(item.title ?? "").trim();
  if (!title) return null;
  return {
    ...item,
    title: title.slice(0, 180),
    facts: (item.facts ?? [])
      .filter((fact): fact is SocialPromotionFact => Boolean(fact?.label?.trim() && fact?.value?.trim()))
      .slice(0, 4)
      .map((fact) => ({ label: fact.label.trim().slice(0, 48), value: fact.value.trim().slice(0, 120) })),
  };
}

function normalizedItemIndexes(items: readonly TnnTradeItem[], requestedIndexes: readonly number[] | undefined) {
  const valid = Array.from(new Set((requestedIndexes ?? [])
    .filter((index) => Number.isInteger(index) && index >= 0 && index < items.length)))
    .slice(0, 6);
  return valid.length ? valid : items.slice(0, 6).map((_, index) => index);
}

export function buildTnnCompletedTradeVideoPlan({
  sellerName,
  buyerName,
  tradeItems = [],
  selectedItemIndexes,
  additionalItemsCount,
  cashOnly,
  durationSeconds = TNN_VIDEO_DURATION_SECONDS,
  anchorMode,
  duoOpeningStyle,
  duoOpeningStyleSelection,
  closingTaglineId,
  tickerText,
  now = new Date().toISOString(),
}: {
  sellerName: string;
  buyerName: string;
  tradeItems?: TnnTradeItem[];
  selectedItemIndexes?: number[];
  /** Explicit count only; unselected UI entries are not assumed to be exchanged items. */
  additionalItemsCount?: number;
  cashOnly: boolean;
  durationSeconds?: TnnVideoDuration;
  anchorMode: TnnAnchorMode;
  duoOpeningStyle?: TnnDuoOpeningStyle | null;
  duoOpeningStyleSelection?: TnnDuoOpeningStyleSelection | null;
  closingTaglineId?: TnnHomepageTaglineId | null;
  tickerText: string;
  now?: string;
}): SocialVideoPlan {
  const cleanItems = tradeItems.map(normalizedTnnItem).filter((item): item is TnnTradeItem => Boolean(item));
  const indexes = normalizedItemIndexes(cleanItems, selectedItemIndexes);
  const selectedItems = indexes.map((index) => cleanItems[index]).filter((item): item is TnnTradeItem => Boolean(item));
  const cleanSeller = sellerName.trim() || "Seller";
  const cleanBuyer = buyerName.trim() || "Buyer";
  const resolvedClosingTaglineId = isTnnHomepageTaglineId(closingTaglineId)
    ? closingTaglineId
    : chooseTnnClosingTaglineId();
  return {
    format: "16:9",
    durationSeconds,
    hostStyle: "tnn-breaking-news-anchor",
    voiceProfile: "tnn-professional-american-news-anchor",
    anchorMode,
    duoOpeningStyle: isTnnDuoOpeningStyle(duoOpeningStyle) ? duoOpeningStyle : TNN_DEFAULT_DUO_OPENING_STYLE,
    duoOpeningStyleSelection: duoOpeningStyleSelection === "random" || isTnnDuoOpeningStyle(duoOpeningStyleSelection)
      ? duoOpeningStyleSelection
      : TNN_DEFAULT_DUO_OPENING_STYLE,
    closingTaglineId: resolvedClosingTaglineId,
    closingTagline: getTnnHomepageTagline(resolvedClosingTaglineId),
    anchorNames: getTnnAnchorNames(anchorMode),
    sellerName: cleanSeller,
    buyerName: cleanBuyer,
    cashOnly,
    headline: "Breaking News from Tradebilia",
    tickerText: TNN_WEBSITE_TICKER,
    selectedItemIndexes: indexes,
    selectedItems,
    additionalItemsCount: Math.max(0, Math.min(99, Math.trunc(Number(additionalItemsCount) || 0))),
    scriptTurns: [],
    script: "",
    scriptWordCount: 0,
    estimatedSpeechSeconds: 0,
    scriptDraftAttempts: 0,
    scriptStatus: "not-drafted",
    generationAttempt: 0,
    generationStatus: "not-started",
    videoReviewStatus: "not-ready",
    createdAt: now,
  };
}

export function withTnnVideoScript(plan: SocialVideoPlan, scriptTurns: readonly TnnTranscriptTurn[], scriptDraftAttempts = plan.scriptDraftAttempts, factLock?: string) {
  const cleanTurns = scriptTurns
    .filter((turn) => turn?.speaker === "max" || turn?.speaker === "sidney")
    .map((turn) => ({ speaker: turn.speaker, text: String(turn.text ?? "").trim() }))
    .filter((turn) => turn.text);
  const cleanScript = cleanTurns.map((turn) => turn.text).join(" ");
  return {
    ...plan,
    scriptTurns: cleanTurns,
    script: cleanScript,
    scriptWordCount: countTnnScriptWords(cleanScript),
    estimatedSpeechSeconds: estimateTnnSpeechSeconds(cleanScript),
    scriptDraftAttempts,
    scriptStatus: cleanScript ? "draft-ready" as const : "not-drafted" as const,
    factLock: cleanScript && factLock ? factLock : undefined,
    errorMessage: undefined,
  };
}

/** Backward-compatible plan factory retained for browser-local drafts created before the TNN studio. */
export function buildCompletedTradeVideoPlan({
  requesterName,
  recipientName,
  sellerName,
  buyerName,
  itemTitle,
  tradeItemTitles = [],
  cashOnly,
  commentary,
  officialLogoUrl: _officialLogoUrl,
  now = new Date().toISOString(),
}: {
  requesterName: string;
  recipientName: string;
  sellerName?: string;
  buyerName?: string;
  itemTitle: string;
  tradeItemTitles?: string[];
  cashOnly: boolean;
  commentary: string;
  officialLogoUrl: string;
  now?: string;
}): SocialVideoPlan {
  const plan = buildTnnCompletedTradeVideoPlan({
    sellerName: sellerName?.trim() || recipientName,
    buyerName: buyerName?.trim() || requesterName,
    tradeItems: [itemTitle, ...tradeItemTitles].map((title) => ({ title })),
    cashOnly,
    durationSeconds: TNN_VIDEO_DURATION_SECONDS,
    anchorMode: "sidney",
    tickerText: TNN_WEBSITE_TICKER,
    now,
  });
  return withTnnVideoScript(plan, [{ speaker: "sidney", text: commentary }], 1);
}

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
  videoPlan?: SocialVideoPlan | null;
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

/** Platforms currently available for new Social Content Manager posts. */
export const SOCIAL_PLATFORMS: SocialPlatform[] = ["Facebook", "Instagram", "X", "YouTube"];
export const SOCIAL_DRAFT_STATUSES: DraftStatus[] = ["Draft", "Needs Review", "Approved", "Scheduled", "Published"];

export function normalizeSocialDraftPlatforms(platforms: readonly SocialPlatform[] | null | undefined) {
  return (platforms ?? ["Facebook"]).filter((platform) => SOCIAL_PLATFORMS.includes(platform));
}

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
    videoPlan: null,
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
    platforms: ["Facebook", "Instagram", "X", "YouTube"],
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
