export type SocialPlatform = "Facebook" | "Instagram" | "X" | "Pinterest" | "LinkedIn" | "YouTube";
export type DraftStatus = "Draft" | "Needs Review" | "Approved" | "Scheduled" | "Published";
export type SocialDraftSource = "Original" | "High-Value Listing" | "Completed Trade";

export const TRADEBILIA_PUBLIC_ORIGIN = "https://tradebilia.manus.space";

export type SocialPromotionFact = {
  label: string;
  value: string;
};

export type SocialPromotionDetails = {
  itemTitle: string;
  listingId?: number | null;
  itemPath?: string | null;
  tradeItems?: Array<{ title: string; imageUrl?: string | null; estimatedValue?: number | null; direction?: "offered" | "requested" }>;
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

export const SOCIAL_PLATFORMS: SocialPlatform[] = ["Facebook", "Instagram", "X", "Pinterest", "LinkedIn", "YouTube"];
export const SOCIAL_DRAFT_STATUSES: DraftStatus[] = ["Draft", "Needs Review", "Approved", "Scheduled", "Published"];

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
