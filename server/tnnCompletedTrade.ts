import { sql } from "drizzle-orm";
import { getSocialPromotionFacts, getSocialPromotionGradingStatus } from "../shared/socialPromotionFacts";
import { formatPublicFieldValue } from "../shared/publicFieldValues";
import { requireDb } from "./db";
import type { TnnScriptItem } from "./tnnVideoScript";

export const TNN_MIN_COMPLETED_TRADE_VALUE = 1_000;
const CANONICAL_LISTING_IMAGE_HOSTS = new Set([
  "tradebilia.manus.space",
  "media.tradebilia.com",
  "assets.tradebilia.com",
  "d36hbw14aib5lz.cloudfront.net",
]);
const TRADEBILIA_PUBLIC_ORIGIN = "https://tradebilia.manus.space";

export type TnnRequestedSelection = { listingId: number; title: string };
export type TnnCanonicalItem = TnnScriptItem & { listingId: number; imageUrl: string | null };
export type TnnCanonicalCompletedTrade = {
  tradeId: number;
  sellerName: string;
  buyerName: string;
  cashOnly: boolean;
  additionalItemsCount: number;
  itemValue: number;
  selectedItems: TnnCanonicalItem[];
};

type TradeRow = {
  tradeId?: number | string;
  sellerName?: string | null;
  buyerName?: string | null;
  cashIncluded?: number | string | boolean | null;
};
type ItemRow = {
  listingId?: number | string;
  title?: string | null;
  category?: string | null;
  itemType?: string | null;
  condition?: string | null;
  grade?: string | number | null;
  certificationCompany?: string | null;
  itemDetails?: unknown;
  estimatedValue?: number | string | null;
  imageUrl?: string | null;
  direction?: "requested" | "offered" | string | null;
};

function cleanText(value: unknown, maximum = 180) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maximum);
}

function parseItemDetails(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function customGradingCompany(details: Record<string, unknown>) {
  for (const key of ["customGradingCompany", "customCertificationCompany"]) {
    const value = cleanText(details[key], 80);
    if (value) return value;
  }
  return null;
}

/**
 * Resolves only images already stored against the exact canonical listing.
 * Callers never get to choose a remote image URL for a TNN video task.
 */
export function normalizeCanonicalListingImageUrl(value: unknown): string | null {
  const raw = cleanText(value, 2_000);
  if (!raw) return null;
  if (raw.startsWith("/manus-storage/")) return new URL(raw, TRADEBILIA_PUBLIC_ORIGIN).toString();
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || !CANONICAL_LISTING_IMAGE_HOSTS.has(parsed.hostname.toLowerCase())) return null;
  return parsed.toString();
}

function canonicalItem(row: ItemRow): TnnCanonicalItem | null {
  const listingId = Number(row.listingId);
  const title = typeof row.title === "string" ? row.title : "";
  if (!Number.isInteger(listingId) || listingId <= 0 || !title) return null;
  const details = parseItemDetails(row.itemDetails);
  const customCompany = customGradingCompany(details);
  const gradingStatus = getSocialPromotionGradingStatus({ itemDetails: details, grade: row.grade });
  const condition = cleanText(row.condition, 80);
  return {
    listingId,
    title,
    category: cleanText(row.category, 80) || null,
    itemType: cleanText(row.itemType, 80) || null,
    gradingStatus,
    // A stored "0" is the raw-listing placeholder, never a spoken grade.
    condition: gradingStatus === "raw" && condition ? formatPublicFieldValue(condition) : null,
    grade: gradingStatus === "graded" && row.grade !== null && row.grade !== undefined ? cleanText(row.grade, 32) : null,
    certificationCompany: gradingStatus === "graded" ? cleanText(row.certificationCompany, 80) || null : null,
    customGradingCompany: gradingStatus === "graded" ? customCompany : null,
    facts: getSocialPromotionFacts({
      category: cleanText(row.category, 80) || null,
      itemType: cleanText(row.itemType, 80) || null,
      itemDetails: details,
      condition: condition || null,
      grade: row.grade ?? null,
      certificationCompany: cleanText(row.certificationCompany, 80) || null,
      customGradingCompany: customCompany,
    }).slice(0, 4),
    imageUrl: normalizeCanonicalListingImageUrl(row.imageUrl),
  };
}

/** Pure validation and derivation boundary, exported for deterministic security regressions. */
export function resolveTnnCompletedTradeRows(
  tradeRows: readonly TradeRow[],
  itemRows: readonly ItemRow[],
  requestedSelections: readonly TnnRequestedSelection[],
): TnnCanonicalCompletedTrade {
  const trade = tradeRows[0];
  const tradeId = Number(trade?.tradeId);
  if (!trade || !Number.isInteger(tradeId) || tradeId <= 0) {
    throw new Error("The completed trade could not be verified.");
  }
  if (!requestedSelections.length || requestedSelections.length > 6) {
    throw new Error("Select between one and six completed-trade items for the TNN report.");
  }
  const selectedIds = requestedSelections.map((selection) => Number(selection.listingId));
  if (selectedIds.some((id) => !Number.isInteger(id) || id <= 0) || new Set(selectedIds).size !== selectedIds.length) {
    throw new Error("The TNN item selection contains duplicate or invalid listing IDs.");
  }
  const canonicalItems = itemRows.map(canonicalItem).filter((item): item is TnnCanonicalItem => Boolean(item));
  if (!canonicalItems.length || new Set(canonicalItems.map((item) => item.listingId)).size !== canonicalItems.length) {
    throw new Error("The completed trade has an inconsistent canonical item set.");
  }
  const byId = new Map(canonicalItems.map((item) => [item.listingId, item]));
  const selectedItems = requestedSelections.map((selection) => {
    const item = byId.get(Number(selection.listingId));
    // Exact title equality is deliberate: clients may select a record, never rename it.
    if (!item || selection.title !== item.title) {
      throw new Error("Each TNN selected item must exactly match an item in the completed trade.");
    }
    return item;
  });
  const itemValue = itemRows.reduce((total, row) => total + Math.max(0, Number(row.estimatedValue ?? 0) || 0), 0);
  if (!Number.isFinite(itemValue) || itemValue < TNN_MIN_COMPLETED_TRADE_VALUE) {
    throw new Error("TNN videos are available only for completed trades with at least $1,000 in estimated item value.");
  }
  const directions = new Set(itemRows.map((row) => row.direction === "offered" ? "offered" : "requested"));
  const cashIncluded = Boolean(Number(trade.cashIncluded ?? 0));
  return {
    tradeId,
    sellerName: cleanText(trade.sellerName, 120) || "Seller",
    buyerName: cleanText(trade.buyerName, 120) || "Buyer",
    cashOnly: cashIncluded && directions.size === 1,
    additionalItemsCount: canonicalItems.length - selectedItems.length,
    itemValue,
    selectedItems,
  };
}

/**
 * Authoritative completed-trade selection. It requires both completed state and
 * completedAt in SQL, then locks names, counts, item facts, values, and images
 * to database rows rather than the browser payload.
 */
export async function resolveTnnCompletedTradeSelection(tradeId: number, selectedItems: readonly TnnRequestedSelection[]) {
  const db = await requireDb();
  const [tradeRowsResult, itemRowsResult] = await Promise.all([
    db.execute(sql`SELECT
        tp.id AS tradeId,
        COALESCE(NULLIF(recipientProfile.displayName, ''), NULLIF(recipient.name, ''), recipient.username, CONCAT('Collector ', tp.recipientId)) AS sellerName,
        COALESCE(NULLIF(requesterProfile.displayName, ''), NULLIF(requester.name, ''), requester.username, CONCAT('Collector ', tp.requesterId)) AS buyerName,
        EXISTS (SELECT 1 FROM tradePayments cashPayment WHERE cashPayment.proposalId = tp.id AND cashPayment.amount > 0) AS cashIncluded
      FROM tradeProposals tp
      LEFT JOIN users requester ON requester.id = tp.requesterId
      LEFT JOIN userProfiles requesterProfile ON requesterProfile.userId = requester.id
      LEFT JOIN users recipient ON recipient.id = tp.recipientId
      LEFT JOIN userProfiles recipientProfile ON recipientProfile.userId = recipient.id
      WHERE tp.id = ${tradeId}
        AND tp.status = 'completed'
        AND tp.completedAt IS NOT NULL
      LIMIT 1`),
    db.execute(sql`SELECT
        requested.id AS listingId, requested.title, requested.category, requested.itemType,
        requested.condition, requested.grade, requested.certificationCompany, requested.itemDetails,
        requested.estimatedValue, 'requested' AS direction,
        (SELECT imageUrl FROM listingPhotos WHERE listingId = requested.id ORDER BY sortOrder ASC LIMIT 1) AS imageUrl
      FROM tradeProposals tp
      JOIN listings requested ON requested.id = tp.requestedListingId
      WHERE tp.id = ${tradeId}
      UNION ALL
      SELECT
        offered.id AS listingId, offered.title, offered.category, offered.itemType,
        offered.condition, offered.grade, offered.certificationCompany, offered.itemDetails,
        offered.estimatedValue, 'offered' AS direction,
        (SELECT imageUrl FROM listingPhotos WHERE listingId = offered.id ORDER BY sortOrder ASC LIMIT 1) AS imageUrl
      FROM tradeProposalItems tradeItem
      JOIN listings offered ON offered.id = tradeItem.offeredListingId
      WHERE tradeItem.proposalId = ${tradeId}`),
  ]);
  return resolveTnnCompletedTradeRows(
    (tradeRowsResult[0] as unknown as TradeRow[]) ?? [],
    (itemRowsResult[0] as unknown as ItemRow[]) ?? [],
    selectedItems,
  );
}
