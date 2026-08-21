import { z } from "zod";
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, like, lte, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import type { InsertUser, User } from "../drizzle/schema";
import {
  users,
  ebayFeedbackHistory,
  emailVerificationOtps,
  listingPhotos,
  listings,
  draftListings,
  lowFeedbackFlags,
  passwordResetTokens,
  phoneVerificationOtps,
  tradeMessages,
  tradeProposalItems,
  tradeProposals,
  tradeReviews,
  userProfiles,
  userReports,
  watchlistEntries,
  itemInquiries,
  inquiryReplies,
  referralRequests,
  favorites,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import { uploadNewPublicMedia } from "./r2PublicMedia";
import { resolveTradebiliaContactEmail } from "./tradebiliaContactEmail";
import { resolveDirectMessageDisplayName } from "./directMessageDisplayName";
import { resolveMemberStanding } from "./memberDirectoryStanding";
import { hasEbayPlatformVerification } from "../shared/ebayVerification";
import { makeRequest, type GeocodingResult } from "./_core/map";
import { filterListingsByOwnerDistance, getApproximateDistanceBand, orderListingsByOwnerDistance, type LocationDistanceStatus, type NearestLocationSortStatus } from "../shared/nearestLocationSort";
import bcrypt from 'bcryptjs';
import { encrypt } from "./_core/crypto";

export const collectibleCategories = ['comics', 'sports_cards', 'vintage_toys', 'video_games', 'stamps', 'coins', 'pokemon', 'movies', 'autographs', 'disney_pins'] as const;
export const itemConditions = ['mint', 'near_mint', 'excellent', 'very_good', 'good', 'fair', 'poor'] as const;

let _db: ReturnType<typeof drizzle> | null = null;
let _dbLastError: Error | null = null;
let _dbErrorCount = 0;
const MAX_ERROR_COUNT = 3;

const categoryLabels: Record<(typeof collectibleCategories)[number], string> = {
  comics: "Comics",
  sports_cards: "Sports Cards",
  vintage_toys: "Vintage Toys",
  video_games: "Video Games",
  stamps: "Stamps",
  coins: "Coins",
  pokemon: "Pokemon",
  movies: "Movies",
  autographs: "Autographs",
  disney_pins: "Disney Pins",
};

type PrivateLocation = {
  contactAddress: string | null;
  contactTown: string | null;
  contactState: string | null;
  contactZipCode: string | null;
  contactCountry: string | null;
};

type Coordinates = { lat: number; lng: number };

const privateGeocodeCache = new Map<string, Coordinates | null>();

function locationQuery(location: PrivateLocation) {
  return [location.contactAddress, location.contactTown, location.contactState, location.contactZipCode, location.contactCountry]
    .map(part => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");
}

async function geocodePrivateLocation(location: PrivateLocation): Promise<Coordinates | null> {
  const query = locationQuery(location);
  if (!query) return null;
  if (privateGeocodeCache.has(query)) return privateGeocodeCache.get(query) ?? null;

  try {
    const result = await makeRequest<GeocodingResult>("/maps/api/geocode/json", { address: query });
    const coordinates = result.status === "OK" ? result.results[0]?.geometry.location ?? null : null;
    privateGeocodeCache.set(query, coordinates);
    return coordinates;
  } catch (error) {
    console.warn("[MemberDirectory] Private location lookup failed:", error instanceof Error ? error.message : error);
    privateGeocodeCache.set(query, null);
    return null;
  }
}

function milesBetween(a: Coordinates, b: Coordinates) {
  const earthRadiusMiles = 3958.7613;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(b.lat - a.lat);
  const longitudeDelta = toRadians(b.lng - a.lng);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

const conditionLabels: Record<(typeof itemConditions)[number], string> = {
  mint: "Mint",
  near_mint: "Near Mint",
  excellent: "Excellent",
  very_good: "Very Good",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

type PhotoUploadInput = {
  name: string;
  type: string;
  contentBase64?: string;
  imageUrl?: string;
};

type AvatarUploadInput = {
  name: string;
  type: string;
  contentBase64: string;
};

/**
 * Convert a JS Date to the MySQL DATETIME string format the schema expects.
 * All timestamp columns use drizzle's { mode: 'string' }, so writes must be
 * strings — passing Date objects only "worked" via implicit driver coercion
 * and was flagged by the compiler at every call site.
 */
export function toMysqlDateTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

/** Current timestamp in MySQL DATETIME string format. */
export function mysqlNow(): string {
  return toMysqlDateTime(new Date());
}

/**
 * A reply is unread only for the original inquiry sender, who receives the
 * reply. The original recipient sent the reply and must remain marked read.
 */
export function getInquiryReplyReadState() {
  return {
    senderIsRead: 0,
    recipientIsRead: 1,
  } as const;
}

type InquiryParticipantReadState = {
  senderId: number;
  recipientId: number;
  senderIsRead: number;
  recipientIsRead: number;
};

export function isInquiryUnreadForUser(inquiry: InquiryParticipantReadState, userId: number) {
  if (inquiry.senderId === userId) return inquiry.senderIsRead === 0;
  if (inquiry.recipientId === userId) return inquiry.recipientIsRead === 0;
  return false;
}

export function isInquiryReadForUser(inquiry: InquiryParticipantReadState, userId: number) {
  if (inquiry.senderId === userId) return inquiry.senderIsRead === 1;
  if (inquiry.recipientId === userId) return inquiry.recipientIsRead === 1;
  return false;
}

/**
 * Resolve the human-facing sender label for communication payloads. Profile
 * display names are authoritative; account identity is a fallback.
 */
export async function getCommunicationDisplayName(userId: number) {
  const db = await requireDb();
  const identity = await db
    .select({
      profileDisplayName: userProfiles.displayName,
      username: users.username,
      displayName: users.displayName,
      accountName: users.name,
    })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  const sender = identity[0];
  return resolveDirectMessageDisplayName(
    sender?.profileDisplayName,
    sender?.username || sender?.displayName || sender?.accountName,
    userId,
  );
}

function getInquiryUnreadCondition(userId: number) {
  return or(
    and(eq(itemInquiries.senderId, userId), eq(itemInquiries.senderIsRead, 0)),
    and(eq(itemInquiries.recipientId, userId), eq(itemInquiries.recipientIsRead, 0)),
  );
}

/**
 * Parse a JSON string stored in a TEXT column without crashing the caller.
 * A single malformed row previously threw and turned entire pages into 500s.
 */
function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.error("[safeJsonParse] Malformed JSON in database column; using fallback.");
    return fallback;
  }
}

/**
 * Track database errors and trigger reconnection if needed.
 * Call this when a database operation fails.
 */
export function trackDbError(error: Error): void {
  _dbLastError = error;
  _dbErrorCount++;
  console.error(`[trackDbError] Database error #${_dbErrorCount}: ${error.message}`);
  
  if (_dbErrorCount >= MAX_ERROR_COUNT) {
    console.warn(`[trackDbError] Max errors reached (${MAX_ERROR_COUNT}), connection will be reset on next requireDb() call`);
  }
}

/**
 * Gracefully close the underlying mysql2 connection pool. Called on
 * SIGTERM/SIGINT so restarts never leave half-open database connections.
 */
export async function closeDb(): Promise<void> {
  if (_db) {
    try {
      const client: any = (_db as any).$client;
      if (client?.end) await client.end();
    } finally {
      _db = null;
    }
  }
}

export async function requireDb(): Promise<ReturnType<typeof drizzle>> {
  if (!_db) {
    // Prefer CUSTOM_DATABASE_URL for the existing Tradebilia data; fall back to
    // the platform-managed DATABASE_URL only when the custom connection is absent.
    // Never log a connection-string fragment: it can disclose sensitive metadata.
    const customDatabaseUrl = process.env.CUSTOM_DATABASE_URL;
    const dbUrl = customDatabaseUrl || process.env.DATABASE_URL || ENV.databaseUrl;
    console.log(`[requireDb] Using database source: ${customDatabaseUrl ? 'CUSTOM' : 'MANUS-MANAGED'}`);
    const url = new URL(dbUrl);
    const sslParam = url.searchParams.get("ssl");
    
    if (sslParam) {
      try {
        // mysql2 expects an object for SSL, not a string
        const sslConfig = JSON.parse(sslParam);
        url.searchParams.delete("ssl");
        _db = drizzle({
          connection: {
            uri: url.toString(),
            ssl: sslConfig
          }
        });
      } catch (e) {
        console.error("[requireDb] Failed to parse SSL config, falling back to default:", e);
        _db = drizzle(dbUrl);
      }
    } else {
      _db = drizzle(dbUrl);
    }
    _dbErrorCount = 0;
    _dbLastError = null;
  } else if (_dbErrorCount >= MAX_ERROR_COUNT) {
    // If we've had too many errors, reset the connection
    console.warn(`[requireDb] Too many database errors (${_dbErrorCount}), resetting connection`);
    await closeDb();
    _dbErrorCount = 0;
    _dbLastError = null;
    // Recursively call to reinitialize
    return requireDb();
  }
  return _db;
}

function getInsertId(result: any) {
  // Drizzle ORM with MySQL returns an array with ResultSetHeader
  // Extract insertId from the first element if it's an array
  let id = 0;
  if (Array.isArray(result) && result[0]?.insertId) {
    id = result[0].insertId;
  } else if (result?.insertId) {
    id = result.insertId;
  } else if (result?.lastInsertRowid) {
    id = result.lastInsertRowid;
  }
  return Number(id);
}

async function ensureUserProfileRecord(user: Pick<User, "id" | "name">) {
  const db = await requireDb();
  const existing = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
  if (!existing[0]) {
    await db.insert(userProfiles).values({
      userId: user.id,
      displayName: user.name ?? `Collector ${user.id}`,
    });
  }
}

async function uploadImage(folder: string, userId: number, input: PhotoUploadInput | AvatarUploadInput) {
  try {
    const buffer = Buffer.from(input.contentBase64!, "base64");
    console.log(`[uploadImage] Starting upload: name=${input.name}, size=${buffer.length} bytes, type=${input.type}`);
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    // Remove spaces from filename to avoid URL encoding issues with storage proxy
    const sanitizedName = input.name.replace(/\s+/g, '-');
    const fileKey = `${folder}/${userId}/${timestamp}-${randomId}-${sanitizedName}`;
    console.log(`[uploadImage] File key: ${fileKey}`);
    console.log(`[uploadImage] Original name: ${input.name}, Sanitized name: ${sanitizedName}`);
    
    const kind = folder === "avatars" ? "avatar" : "listing";
    const result = await uploadNewPublicMedia({
      kind,
      ownerId: userId,
      filename: sanitizedName,
      data: buffer,
      contentType: input.type,
    });
    console.log(`[uploadImage] Upload successful, URL: ${result.url}`);
    return result;
  } catch (error) {
    console.error(`[uploadImage] Upload failed:`, error);
    throw error;
  }
}

async function getProfileMap(userIds: number[]) {
  if (userIds.length === 0) return new Map();
  const db = await requireDb();
  const profiles = await db
    .select({
      userId: userProfiles.userId,
      displayName: userProfiles.displayName,
      avatarUrl: userProfiles.avatarUrl,
      firstName: userProfiles.firstName,
      lastName: userProfiles.lastName,
    })
    .from(userProfiles)
    .where(inArray(userProfiles.userId, userIds));
  
  return new Map(profiles.map(p => [p.userId, p]));
}

async function getRatingStatsMap(userIds: number[]) {
  if (userIds.length === 0) return new Map();
  const db = await requireDb();
  const stats = await db
    .select({
      revieweeId: tradeReviews.revieweeId,
      averageRating: sql<number>`avg(${tradeReviews.rating})`,
      reviewCount: sql<number>`count(*)`,
    })
    .from(tradeReviews)
    .where(inArray(tradeReviews.revieweeId, userIds))
    .groupBy(tradeReviews.revieweeId);

  return new Map(
    stats.map(s => [
      s.revieweeId,
      {
        averageRating: Number(s.averageRating ?? 0),
        reviewCount: Number(s.reviewCount ?? 0),
      },
    ]),
  );
}

async function formatListings(listingRows: any[], viewerId: number | null) {
  if (listingRows.length === 0) return [];

  const ownerIds = Array.from(new Set(listingRows.map(r => r.ownerId)));
  const profileMap = await getProfileMap(ownerIds);
  const ratingMap = await getRatingStatsMap(ownerIds);
  const watchlistRows = viewerId
    ? await (
        await requireDb()
      )
        .select({ listingId: watchlistEntries.listingId })
        .from(watchlistEntries)
        .where(and(eq(watchlistEntries.userId, viewerId), inArray(watchlistEntries.listingId, listingRows.map(r => r.id))))
    : [];
  const savedListingIds = new Set(watchlistRows.map(r => r.listingId));

  return listingRows.map(row => ({
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    category: row.category,
    condition: row.condition,
    grade: row.grade ?? null,
    certificationCompany: row.certificationCompany ?? null,
    estimatedValue: row.estimatedValue ? Number(row.estimatedValue) : null,
    description: row.description,
    status: row.status,
    featured: row.featured,
    isActive: row.isActive,
    createdAt: new Date(row.createdAt).getTime(),
    updatedAt: new Date(row.updatedAt).getTime(),
    owner: {
      id: row.ownerId,
      displayName: profileMap.get(row.ownerId)?.displayName ?? `Collector ${row.ownerId}`,
      firstName: profileMap.get(row.ownerId)?.firstName ?? null,
      lastName: profileMap.get(row.ownerId)?.lastName ?? null,
      avatarUrl: profileMap.get(row.ownerId)?.avatarUrl ?? null,
    },
    ownerRating: ratingMap.get(row.ownerId) ?? { averageRating: 0, reviewCount: 0 },
    primaryPhotoUrl: row.primaryPhotoUrl ?? null,
    photos: row.primaryPhotoUrl ? [{ imageUrl: row.primaryPhotoUrl, altText: null }] : [],
    categoryLabel: categoryLabels[row.category as keyof typeof categoryLabels] ?? row.category,
    conditionLabel: conditionLabels[row.condition as keyof typeof conditionLabels] ?? row.condition,
    savedToWatchlist: savedListingIds.has(row.id),
    viewCount: row.viewCount ?? 0,
    favoriteCount: row.favoriteCount ?? 0,
  }));
}

export async function getMarketplaceFeed(
  filters: {
    category?: (typeof collectibleCategories)[number];
    condition?: (typeof itemConditions)[number];
    keyword?: string;
    issueNumber?: string;
    manufacturer?: string;
    year?: string;
    team?: string;
    series?: string;
    sport?: string;
    gradingService?: string;
    grade?: string;
    valueMin?: number;
    valueMax?: number;
    rookie?: string;
    autographed?: string;
    signed?: string;
    facsimile?: string;
    title?: string;
    system?: string;
    region?: string;
    country?: string;
    format?: string;
    medium?: string;
    denomination?: string;
    mintMark?: string;
    issuer?: string;
    edition?: string;
    parkOrEvent?: string;
    franchise?: string;
    rarity?: string;
    publisher?: string;
    brand?: string;
    scottNumber?: string;
    mintOrUsed?: string;
    stampGrade?: string;
    editionEra?: string;
    finishVariant?: string;
    signer?: string;
    verifiedMerchantsOnly?: boolean;
    locationSort?: boolean;
    distanceMiles?: number;
    limit?: number;
    offset?: number;
    sort?: "newest" | "title" | "value_low_high" | "value_high_low";
  },
  viewerId: number | null,
) {
  const db = await requireDb();

  // Build where clauses for filtering
  const whereClauses = [eq(listings.status, "active"), eq(listings.isActive, 1)];
  if (filters.category) {
    whereClauses.push(eq(listings.category, filters.category));
  }
  if (filters.condition) {
    // Condition only meaningfully applies to ungraded (raw) items.
    // Graded items store a placeholder condition the seller never chose
    // (the form hides Condition when Is Graded = yes), so they pass through
    // this filter — their quality is expressed by the Grade filter instead.
    whereClauses.push(
      sql`(${eq(listings.condition, filters.condition)} OR ${listings.grade} > 0)`,
    );
  }
  const keyword = filters.keyword?.trim();
  if (keyword) {
    // Search all listing data captured during item creation. itemDetails holds
    // category-specific form values; the remaining explicit columns hold the
    // core fields that the form persists outside that JSON payload.
    const searchCondition = or(
      like(listings.title, `%${keyword}%`),
      like(listings.description, `%${keyword}%`),
      like(listings.category, `%${keyword}%`),
      like(listings.condition, `%${keyword}%`),
      like(listings.itemType, `%${keyword}%`),
      like(listings.certificationCompany, `%${keyword}%`),
      like(listings.signatures, `%${keyword}%`),
      sql`${listings.itemDetails} LIKE ${`%${keyword}%`}`,
      sql`CAST(${listings.grade} AS CHAR) LIKE ${`%${keyword}%`}`,
      like(listings.certificationNumber, `%${keyword}%`),
      sql`CAST(${listings.estimatedValue} AS CHAR) LIKE ${`%${keyword}%`}`
    );
    // Only add the condition if it's not undefined
    if (searchCondition !== undefined) {
      whereClauses.push(searchCondition as any);
    }
  }
  // Add filter conditions for category-specific fields stored in itemDetails JSON.
  // Key names MUST match how the inventory form stores data (camelCase keys).
  // Uses JSON_UNQUOTE(JSON_EXTRACT(...)) + LIKE for case-tolerant partial matching.
  const jsonLike = (key: string, value: string) =>
    sql`JSON_UNQUOTE(JSON_EXTRACT(${listings.itemDetails}, ${`$.${key}`})) LIKE ${`%${value.trim()}%`}`;
  const jsonLikeAny = (keys: string[], value: string) => {
    const conditions = keys.map(key => jsonLike(key, value));
    return sql.join(conditions, sql` OR `);
  };

  if (filters.issueNumber?.trim()) {
    whereClauses.push(sql`(${jsonLike("issueNumber", filters.issueNumber)})`);
  }
  if (filters.manufacturer?.trim()) {
    // Sports cards Manufacturer filter
    whereClauses.push(sql`(${jsonLikeAny(["manufacturer", "customManufacturer"], filters.manufacturer)})`);
  }
  if (filters.year?.trim()) {
    // Year is stored under different keys depending on category/item type:
    // year (sports_cards, stamps, vintage_toys), releaseYear (video_games, movies),
    // publicationYear (comics), yearsIncluded (coins collection lots)
    whereClauses.push(sql`(${jsonLikeAny(["year", "releaseYear", "publicationYear", "yearsIncluded"], filters.year)})`);
  }
  if (filters.team?.trim()) {
    // Sports cards Team filter: no dedicated team field in the form;
    // match against player, title and description
    whereClauses.push(sql`(${jsonLike("player", filters.team)} OR ${like(listings.title, `%${filters.team.trim()}%`)} OR ${like(listings.description, `%${filters.team.trim()}%`)})`);
  }
  if (filters.series?.trim()) {
    // Set / series filter (sports cards, pokemon)
    whereClauses.push(sql`(${jsonLikeAny(["setName", "set", "series"], filters.series)})`);
  }
  // ---- Dedicated per-filter parameters (each filter owns its own channel) ----
  if (filters.title?.trim()) {
    // Title filter (comics comicTitle, video games gameTitle, movies title) + listing title
    whereClauses.push(sql`(${jsonLikeAny(["comicTitle", "gameTitle", "title"], filters.title)} OR ${like(listings.title, `%${filters.title.trim()}%`)})`);
  }
  if (filters.system?.trim()) {
    whereClauses.push(sql`(${jsonLike("platform", filters.system)})`);
  }
  if (filters.region?.trim()) {
    whereClauses.push(sql`(${jsonLike("region", filters.region)})`);
  }
  if (filters.country?.trim()) {
    whereClauses.push(sql`(${jsonLikeAny(["country", "countriesIncluded"], filters.country)})`);
  }
  if (filters.format?.trim()) {
    whereClauses.push(sql`(${jsonLike("format", filters.format)})`);
  }
  if (filters.medium?.trim()) {
    whereClauses.push(sql`(${jsonLikeAny(["signedItemType", "autographCategory"], filters.medium)})`);
  }
  if (filters.denomination?.trim()) {
    whereClauses.push(sql`(${jsonLike("denomination", filters.denomination)})`);
  }
  if (filters.mintMark?.trim()) {
    whereClauses.push(sql`(${jsonLike("mintMark", filters.mintMark)})`);
  }
  if (filters.issuer?.trim()) {
    // Stamps Issuer: no dedicated field; match country plus title/description
    whereClauses.push(sql`(${jsonLike("country", filters.issuer)} OR ${like(listings.title, `%${filters.issuer.trim()}%`)} OR ${like(listings.description, `%${filters.issuer.trim()}%`)})`);
  }
  if (filters.edition?.trim()) {
    whereClauses.push(sql`(${jsonLikeAny(["limitedEdition", "openEdition", "backstampInformation"], filters.edition)} OR ${like(listings.title, `%${filters.edition.trim()}%`)} OR ${like(listings.description, `%${filters.edition.trim()}%`)})`);
  }
  if (filters.parkOrEvent?.trim()) {
    whereClauses.push(sql`(${jsonLike("pinTradingEvent", filters.parkOrEvent)})`);
  }
  if (filters.franchise?.trim()) {
    whereClauses.push(sql`(${jsonLikeAny(["franchise", "series"], filters.franchise)} OR ${like(listings.title, `%${filters.franchise.trim()}%`)} OR ${like(listings.description, `%${filters.franchise.trim()}%`)})`);
  }
  if (filters.rarity?.trim()) {
    whereClauses.push(sql`(${jsonLikeAny(["rarity", "customRarity"], filters.rarity)})`);
  }
  if (filters.publisher?.trim()) {
    whereClauses.push(sql`(${jsonLike("publisher", filters.publisher)})`);
  }
  if (filters.brand?.trim()) {
    whereClauses.push(sql`(${jsonLike("brand", filters.brand)})`);
  }
  if (filters.scottNumber?.trim()) {
    whereClauses.push(sql`(${jsonLike("scottNumber", filters.scottNumber)})`);
  }
  if (filters.mintOrUsed?.trim()) {
    whereClauses.push(sql`(${jsonLike("mintOrUsed", filters.mintOrUsed)})`);
  }
  if (filters.stampGrade?.trim()) {
    whereClauses.push(sql`(${jsonLike("stampGrade", filters.stampGrade)})`);
  }
  if (filters.editionEra?.trim()) {
    whereClauses.push(sql`(${jsonLikeAny(["editionEra", "customEditionEra"], filters.editionEra)})`);
  }
  if (filters.finishVariant?.trim()) {
    whereClauses.push(sql`(${jsonLikeAny(["finishVariant", "customFinishVariant"], filters.finishVariant)})`);
  }
  if (filters.signer?.trim()) {
    whereClauses.push(sql`(${jsonLikeAny(["signer", "signersIncluded"], filters.signer)})`);
  }
  if (filters.sport?.trim()) {
    whereClauses.push(sql`(${jsonLike("sport", filters.sport)})`);
  }
  // Boolean-like filters: the form stores "yes"/"no" (sometimes "true"/"false" in older data).
  // Match either representation with an exact (case-insensitive) comparison.
  const jsonBoolMatch = (keys: string[], value: string) => {
    const lowered = value.trim().toLowerCase();
    const synonyms = lowered === "yes" || lowered === "true" ? ["yes", "true"] : lowered === "no" || lowered === "false" ? ["no", "false"] : [lowered];
    const conditions = keys.flatMap(key =>
      synonyms.map(v => sql`LOWER(JSON_UNQUOTE(JSON_EXTRACT(${listings.itemDetails}, ${`$.${key}`}))) = ${v}`)
    );
    return sql.join(conditions, sql` OR `);
  };

  if (filters.rookie?.trim() && filters.rookie !== "All") {
    // Form stores this as rookieCard ("yes"/"no")
    whereClauses.push(sql`(${jsonBoolMatch(["rookieCard", "rookie"], filters.rookie)})`);
  }
  if (filters.autographed?.trim() && filters.autographed !== "All") {
    // Form stores this as autograph ("yes"/"no")
    whereClauses.push(sql`(${jsonBoolMatch(["autograph", "autographed"], filters.autographed)})`);
  }
  if (filters.signed?.trim() && filters.signed !== "All") {
    whereClauses.push(sql`(${jsonBoolMatch(["signed"], filters.signed)})`);
  }
  if (filters.facsimile?.trim() && filters.facsimile !== "All") {
    // Facsimile info may live under signatures details or a facsimile key depending on form version
    whereClauses.push(sql`(${jsonBoolMatch(["facsimile"], filters.facsimile)} OR ${sql`${listings.signatures} LIKE ${`%facsimile%`}`})`);
  }
  if (filters.gradingService) {
    whereClauses.push(like(listings.certificationCompany, `%${filters.gradingService}%`));
  }
  if (filters.grade && filters.grade !== "All") {
    whereClauses.push(eq(listings.grade, filters.grade as any));
  }
  if (filters.valueMin !== undefined) {
    whereClauses.push(sql`CAST(${listings.estimatedValue} AS DECIMAL(12,2)) >= ${filters.valueMin}`);
  }
  if (filters.valueMax !== undefined) {
    whereClauses.push(sql`CAST(${listings.estimatedValue} AS DECIMAL(12,2)) <= ${filters.valueMax}`);
  }
  if (filters.verifiedMerchantsOnly) {
    whereClauses.push(sql`${listings.ownerId} IN (SELECT id FROM users WHERE merchantVerified = 1)`);
  }

  const listingOrder = filters.sort === "title"
    ? asc(listings.title)
    : filters.sort === "value_low_high"
      ? asc(sql`CAST(${listings.estimatedValue} AS DECIMAL(12,2))`)
      : filters.sort === "value_high_low"
        ? desc(sql`CAST(${listings.estimatedValue} AS DECIMAL(12,2))`)
        : desc(listings.createdAt);
  const resultLimit = Math.min(Math.max(filters.limit ?? 100, 1), 100);
  const resultOffset = Math.max(filters.offset ?? 0, 0);

  let listingRows = await db
    .select({
      id: listings.id,
      ownerId: listings.ownerId,
      title: listings.title,
      category: listings.category,
      condition: listings.condition,
      grade: listings.grade,
      certificationCompany: listings.certificationCompany,
      estimatedValue: listings.estimatedValue,
      description: listings.description,
      status: listings.status,
      featured: listings.featured,
      isActive: listings.isActive,
      createdAt: listings.createdAt,
      updatedAt: listings.updatedAt,
      primaryPhotoUrl: sql<string | null>`(
        select imageUrl from listingPhotos where listingId = listings.id order by sortOrder asc limit 1
      )`,
    })
    .from(listings)
    .where(and(...whereClauses))
    .orderBy(listingOrder)
    .limit(resultLimit)
    .offset(resultOffset);

  const locationSort: NearestLocationSortStatus = {
    requested: filters.locationSort === true,
    applied: false,
    reason: null,
  };
  const distanceFilter: LocationDistanceStatus = {
    requested: filters.distanceMiles !== undefined,
    applied: false,
    reason: null,
  };
  const distanceBandByListingId = new Map<number, string>();
  const shouldCalculateDistanceBands = viewerId !== null && listingRows.length > 0;

  if (locationSort.requested || distanceFilter.requested || shouldCalculateDistanceBands) {
    if (!viewerId) {
      if (locationSort.requested) locationSort.reason = "sign_in_required";
      if (distanceFilter.requested) distanceFilter.reason = "sign_in_required";
    } else {
      const viewerLocationRows = await db
        .select({
          contactTown: userProfiles.contactTown,
          contactState: userProfiles.contactState,
          contactCountry: userProfiles.contactCountry,
        })
        .from(userProfiles)
        .where(eq(userProfiles.userId, viewerId))
        .limit(1);
      const viewerLocation = viewerLocationRows[0];

      if (!viewerLocation?.contactTown?.trim()) {
        if (locationSort.requested) locationSort.reason = "saved_town_required";
        if (distanceFilter.requested) distanceFilter.reason = "saved_town_required";
      } else {
        const viewerCoordinates = await geocodePrivateLocation({
          contactAddress: null,
          contactTown: viewerLocation.contactTown,
          contactState: viewerLocation.contactState,
          contactZipCode: null,
          contactCountry: viewerLocation.contactCountry,
        });

        if (!viewerCoordinates) {
          if (locationSort.requested) locationSort.reason = "location_unavailable";
          if (distanceFilter.requested) distanceFilter.reason = "location_unavailable";
        } else if (listingRows.length > 0) {
          const ownerIds = Array.from(new Set(listingRows.map(listing => listing.ownerId)));
          const ownerLocations = await db
            .select({
              userId: userProfiles.userId,
              contactTown: userProfiles.contactTown,
              contactState: userProfiles.contactState,
              contactCountry: userProfiles.contactCountry,
            })
            .from(userProfiles)
            .where(inArray(userProfiles.userId, ownerIds));
          const ownerDistances = await Promise.all(ownerLocations.map(async owner => {
            const coordinates = owner.contactTown?.trim()
              ? await geocodePrivateLocation({
                  contactAddress: null,
                  contactTown: owner.contactTown,
                  contactState: owner.contactState,
                  contactZipCode: null,
                  contactCountry: owner.contactCountry,
                })
              : null;
            return {
              ownerId: owner.userId,
              miles: coordinates ? Math.round(milesBetween(viewerCoordinates, coordinates) * 10) / 10 : null,
            };
          }));
          const milesByOwnerId = new Map(ownerDistances.map(result => [result.ownerId, result.miles]));

          if ([...milesByOwnerId.values()].some(miles => miles !== null)) {
            for (const listing of listingRows) {
              const distanceBand = getApproximateDistanceBand(
                milesByOwnerId.get(listing.ownerId),
                listing.ownerId === viewerId,
              );
              if (distanceBand) distanceBandByListingId.set(listing.id, distanceBand);
            }
            if (distanceFilter.requested) {
              listingRows = filterListingsByOwnerDistance(listingRows, milesByOwnerId, filters.distanceMiles!);
              distanceFilter.applied = true;
            }
            if (locationSort.requested) {
              listingRows = orderListingsByOwnerDistance(listingRows, milesByOwnerId);
              locationSort.applied = true;
            }
          } else {
            if (locationSort.requested) locationSort.reason = "location_unavailable";
            if (distanceFilter.requested) distanceFilter.reason = "location_unavailable";
          }
        }
      }
    }
  }

  if (!listingRows.length) {
    return {
      filters: {
        categories: collectibleCategories.map(value => ({ value, label: categoryLabels[value] })),
        conditions: itemConditions.map(value => ({ value, label: conditionLabels[value] })),
      },
      highlights: {
        totalListings: 0,
        activeCollectors: 0,
        completedTrades: 0,
      },
      locationSort,
      distanceFilter,
      listings: [],
    };
  }

  const statsRows = await Promise.all([
    db.select({ value: sql<number>`count(*)` }).from(listings).where(and(...whereClauses)),
    db
      .select({ value: sql<number>`count(distinct ${listings.ownerId})` })
      .from(listings)
      .where(and(...whereClauses)),
    // Count completed trades where ANY item on either side belongs to the filtered category.
    // TiDB does not support subqueries inside JOIN ON clauses, so we LEFT JOIN
    // tradeProposalItems first, then join listings on either the requested or offered listing id.
    filters.category
      ? db.select({ value: sql<number>`count(distinct ${tradeProposals.id})` })
          .from(tradeProposals)
          .leftJoin(tradeProposalItems, eq(tradeProposalItems.proposalId, tradeProposals.id))
          .innerJoin(listings, sql`(
            ${listings.id} = ${tradeProposals.requestedListingId}
            OR ${listings.id} = ${tradeProposalItems.offeredListingId}
          )`)
          .where(and(
            eq(tradeProposals.status, "completed"),
            eq(listings.category, filters.category as any)
          ))
      : db.select({ value: sql<number>`count(*)` }).from(tradeProposals).where(eq(tradeProposals.status, "completed")),
  ]);

  return {
    filters: {
      categories: collectibleCategories.map(value => ({ value, label: categoryLabels[value] })),
      conditions: itemConditions.map(value => ({ value, label: conditionLabels[value] })),
    },
    highlights: {
      totalListings: Number(statsRows[0][0]?.value ?? 0),
      activeCollectors: Number(statsRows[1][0]?.value ?? 0),
      completedTrades: Number(statsRows[2][0]?.value ?? 0),
    },
    locationSort,
    distanceFilter,
    listings: (await formatListings(listingRows, viewerId)).map(listing => ({
      ...listing,
      distanceBand: distanceBandByListingId.get(listing.id) ?? null,
    })),
  };
}

export async function getSiteStatistics() {
  const db = await requireDb();

  // Get total active listings
  const totalListingsResult = await db
    .select({ value: sql<number>`count(*)` })
    .from(listings)
    .where(eq(listings.status, "active"));

  // Get total registered members (all users with accounts)
  const totalCollectorsResult = await db
    .select({ value: sql<number>`count(*)` })
    .from(users);

  // Get total value of all active listings (sum of estimatedValue)
  const totalValueResult = await db
    .select({ value: sql<number>`coalesce(sum(cast(estimatedValue as decimal(12,2))), 0)` })
    .from(listings)
    .where(eq(listings.status, "active"));

  // Get total completed trades
  const totalTradesResult = await db
    .select({ value: sql<number>`count(*)` })
    .from(tradeProposals)
    .where(eq(tradeProposals.status, "completed"));

  return {
    totalMembers: Number(totalCollectorsResult[0]?.value ?? 0),
    totalItems: Number(totalListingsResult[0]?.value ?? 0),
    totalValue: Number(totalValueResult[0]?.value ?? 0),
    totalTrades: Number(totalTradesResult[0]?.value ?? 0),
  };
}

async function getProposalCards(userId: number) {
  const db = await requireDb();
  const proposalRows = await db
    .select({
      id: tradeProposals.id,
      requesterId: tradeProposals.requesterId,
      recipientId: tradeProposals.recipientId,
      requestedListingId: tradeProposals.requestedListingId,
      note: tradeProposals.note,
      status: tradeProposals.status,
      respondedAt: tradeProposals.respondedAt,
      completedAt: tradeProposals.completedAt,
      createdAt: tradeProposals.createdAt,
    })
    .from(tradeProposals)
    .where(or(eq(tradeProposals.requesterId, userId), eq(tradeProposals.recipientId, userId)))
    .orderBy(desc(tradeProposals.createdAt));

  const listingIds = Array.from(new Set(
    proposalRows.map(p => p.requestedListingId).filter(Boolean),
  )) as number[];

  const listingRows = listingIds.length
    ? await db
        .select({
          id: listings.id,
          ownerId: listings.ownerId,
          title: listings.title,
          category: listings.category,
          condition: listings.condition,
          grade: listings.grade,
          certificationCompany: listings.certificationCompany,
          estimatedValue: listings.estimatedValue,
          description: listings.description,
          status: listings.status,
          featured: listings.featured,
          isActive: listings.isActive,
          createdAt: listings.createdAt,
          updatedAt: listings.updatedAt,
        })
        .from(listings)
        .where(inArray(listings.id, listingIds))
    : [];

  const listingMap = new Map(listingRows.map(l => [l.id, l]));

  // Fetch all messages for all proposals
  const proposalIds = proposalRows.map(p => p.id);
  const messageRows = proposalIds.length
    ? await db
        .select({
          id: tradeMessages.id,
          proposalId: tradeMessages.proposalId,
          senderId: tradeMessages.senderId,
          message: tradeMessages.message,
          createdAt: tradeMessages.createdAt,
        })
        .from(tradeMessages)
        .where(inArray(tradeMessages.proposalId, proposalIds))
        .orderBy(asc(tradeMessages.createdAt))
    : [];

  // Group messages by proposalId
  const messagesMap = new Map<number, typeof messageRows>();
  messageRows.forEach(msg => {
    if (!messagesMap.has(msg.proposalId)) {
      messagesMap.set(msg.proposalId, []);
    }
    messagesMap.get(msg.proposalId)!.push(msg);
  });

  return proposalRows.map(p => ({
    id: p.id,
    requesterId: p.requesterId,
    recipientId: p.recipientId,
    requestedListing: listingMap.get(p.requestedListingId) ?? null,
    note: p.note,
    status: p.status,
    respondedAt: p.respondedAt ? new Date(p.respondedAt).getTime() : null,
    completedAt: p.completedAt ? new Date(p.completedAt).getTime() : null,
    createdAt: new Date(p.createdAt).getTime(),
    updatedAt: p.respondedAt ? new Date(p.respondedAt).getTime() : new Date(p.createdAt).getTime(),
    direction: p.requesterId === userId ? 'outgoing' : 'incoming',
    canReview: p.status === 'completed',
    canRespond: p.status === 'pending' && p.recipientId === userId,
    offeredListings: [],
    counterpart: null,
    requesterInventory: [],
    canAcceptSelection: p.status === 'pending' && p.recipientId === userId,
    contactDetails: null,
    messages: (messagesMap.get(p.id) ?? []).map(msg => ({
      id: msg.id,
      proposalId: msg.proposalId,
      senderId: msg.senderId,
      message: msg.message,
      createdAt: new Date(msg.createdAt).getTime(),
    })),
    canCancel: p.status === 'pending',
    canComplete: p.status === 'accepted',
  }));
}

export async function getListingDetail(listingId: number, viewerId: number | null) {
  const db = await requireDb();

  const detailCard = await db
    .select({
      id: listings.id,
      ownerId: listings.ownerId,
      title: listings.title,
      category: listings.category,
      itemType: listings.itemType,
      condition: listings.condition,
      grade: listings.grade,
      certificationCompany: listings.certificationCompany,
      certificationNumber: listings.certificationNumber,
      estimatedValue: listings.estimatedValue,
      description: listings.description,
      itemDetails: listings.itemDetails,
      signatures: listings.signatures,
      status: listings.status,
      featured: listings.featured,
      isActive: listings.isActive,
      createdAt: listings.createdAt,
      updatedAt: listings.updatedAt,
    })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);

  if (!detailCard[0]) {
    throw new Error("Listing not found.");
  }

  const ownerProfileRows = await db
    .select({
      bio: userProfiles.bio,
      displayName: userProfiles.displayName,
      avatarUrl: userProfiles.avatarUrl,
    })
    .from(userProfiles)
    .where(eq(userProfiles.userId, detailCard[0].ownerId))
    .limit(1);

  // Fetch owner verification status from users table
  const ownerUserRows = await db
    .select({
      ebayUsername: users.ebayUsername,
      ebayIdVerified: users.ebayIdVerified,
      facebookId: users.facebookId,
      facebookVerified: users.facebookVerified,
      linkedinId: users.linkedinId,
      merchantVerified: users.merchantVerified,
    })
    .from(users)
    .where(eq(users.id, detailCard[0].ownerId))
    .limit(1);

  const similarRows = await db
    .select({
      id: listings.id,
      ownerId: listings.ownerId,
      title: listings.title,
      category: listings.category,
      condition: listings.condition,
      grade: listings.grade,
      certificationCompany: listings.certificationCompany,
      certificationNumber: listings.certificationNumber,
      estimatedValue: listings.estimatedValue,
      description: listings.description,
      signatures: listings.signatures,
      status: listings.status,
      featured: listings.featured,
      isActive: listings.isActive,
      createdAt: listings.createdAt,
      updatedAt: listings.updatedAt,
    })
    .from(listings)
    .where(and(eq(listings.category, detailCard[0].category), ne(listings.id, listingId), eq(listings.status, "active")))
    .orderBy(desc(listings.createdAt))
    .limit(6);

  // Fetch primary photos for similar listings in a single query
  const similarListingIds = similarRows.map(r => r.id);
  const similarPhotosRows = similarListingIds.length > 0
    ? await db
        .select({
          listingId: listingPhotos.listingId,
          imageUrl: listingPhotos.imageUrl,
        })
        .from(listingPhotos)
        .where(and(inArray(listingPhotos.listingId, similarListingIds), eq(listingPhotos.sortOrder, 0)))
    : [];
  const similarPhotosMap = new Map(similarPhotosRows.map(p => [p.listingId, p.imageUrl]));
  
  // Add primaryPhotoUrl to similarRows
  const similarRowsWithPhotos = similarRows.map(row => ({
    ...row,
    primaryPhotoUrl: similarPhotosMap.get(row.id) ?? null,
  }));

  const photoRows = await db
    .select({
      imageUrl: listingPhotos.imageUrl,
      altText: listingPhotos.altText,
      sortOrder: listingPhotos.sortOrder,
    })
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, listingId))
    .orderBy(asc(listingPhotos.sortOrder));

  const isSaved = viewerId
    ? (
        await db
          .select()
          .from(watchlistEntries)
          .where(and(eq(watchlistEntries.userId, viewerId), eq(watchlistEntries.listingId, listingId)))
          .limit(1)
      ).length > 0
    : false;

  const ratingMap = await getRatingStatsMap([detailCard[0].ownerId]);
  const ownerRating = ratingMap.get(detailCard[0].ownerId) ?? { averageRating: 0, reviewCount: 0 };

  return {
    id: detailCard[0].id,
    ownerId: detailCard[0].ownerId,
    title: detailCard[0].title,
    category: detailCard[0].category,
    itemType: detailCard[0].itemType,
    condition: detailCard[0].condition,
    grade: detailCard[0].grade,
    certificationCompany: detailCard[0].certificationCompany,
    certificationNumber: detailCard[0].certificationNumber,
    estimatedValue: detailCard[0].estimatedValue ? Number(detailCard[0].estimatedValue) : null,
    description: detailCard[0].description,
    itemDetails: safeJsonParse<Record<string, string> | null>(detailCard[0].itemDetails, null),
    signatures: safeJsonParse<string[] | null>(detailCard[0].signatures, null),
    status: detailCard[0].status,
    featured: detailCard[0].featured,
    isActive: detailCard[0].isActive,
    createdAt: new Date(detailCard[0].createdAt).getTime(),
    updatedAt: new Date(detailCard[0].updatedAt).getTime(),
    ownerProfile: {
      displayName: ownerProfileRows[0]?.displayName ?? `Collector ${detailCard[0].ownerId}`,
      bio: ownerProfileRows[0]?.bio ?? "Open to thoughtful, collector-to-collector trades.",
      avatarUrl: ownerProfileRows[0]?.avatarUrl ?? null,
      ebayVerified: hasEbayPlatformVerification(ownerUserRows[0]?.ebayUsername, ownerUserRows[0]?.ebayIdVerified),
      facebookVerified: !!(ownerUserRows[0]?.facebookId) || ownerUserRows[0]?.facebookVerified === 1,
      linkedinVerified: !!(ownerUserRows[0]?.linkedinId),
      merchantVerified: ownerUserRows[0]?.merchantVerified === 1,
    },
    ownerRating,
    photos: photoRows.map(p => ({
      imageUrl: p.imageUrl,
      altText: p.altText,
    })),
    primaryPhotoUrl: photoRows.length > 0 ? photoRows[0].imageUrl : null,
    similarListings: await formatListings(similarRowsWithPhotos, viewerId),
    savedToWatchlist: isSaved,
  };
}

export async function createTradeProposal(
  user: Pick<User, "id" | "name">,
  input: {
    requestedListingId: number;
    note?: string;
  },
) {
  const db = await requireDb();
  await ensureUserProfileRecord(user);

  const requestedListing = await db
    .select()
    .from(listings)
    .where(eq(listings.id, input.requestedListingId))
    .limit(1);

  if (!requestedListing[0]) {
    throw new Error("The requested listing could not be found.");
  }
  if (requestedListing[0].ownerId === user.id) {
    throw new Error("You cannot create a Trade Proposal for your own listing.");
  }
  if (requestedListing[0].status !== "active") {
    throw new Error("The requested listing is no longer available for trade.");
  }

  const proposalInsert = await db.insert(tradeProposals).values({
    requesterId: user.id,
    recipientId: requestedListing[0].ownerId,
    requestedListingId: input.requestedListingId,
    note: input.note?.trim() ? input.note.trim().slice(0, 1000) : null,
  });
  const proposalId = getInsertId(proposalInsert);

  return {
    proposalId,
    requestedListing: await getListingDetail(input.requestedListingId, user.id),
  };
}

export async function selectTradeProposalItems(
  user: Pick<User, "id" | "name">,
  input: {
    proposalId: number;
    selectedListingIds: number[];
  },
) {
  const db = await requireDb();

  const proposal = await db
    .select()
    .from(tradeProposals)
    .where(eq(tradeProposals.id, input.proposalId))
    .limit(1);

  if (!proposal[0]) {
    throw new Error("Trade Proposal not found.");
  }

  if (proposal[0].requesterId !== user.id) {
    throw new Error("You can only select items for your own proposals.");
  }

  if (proposal[0].status !== "pending") {
    throw new Error("You can only select items for pending proposals.");
  }

  // Validate ownership of all offered listings in ONE query (was an N+1 loop).
  if (input.selectedListingIds.length > 0) {
    const ownedRows = await db
      .select({ id: listings.id, ownerId: listings.ownerId })
      .from(listings)
      .where(inArray(listings.id, input.selectedListingIds));
    const ownedMap = new Map(ownedRows.map(r => [r.id, r.ownerId]));
    for (const listingId of input.selectedListingIds) {
      const ownerId = ownedMap.get(listingId);
      if (ownerId === undefined) throw new Error(`Listing ${listingId} not found.`);
      if (ownerId !== user.id) throw new Error(`You don't own listing ${listingId}.`);
    }
  }

  // Delete-then-insert atomically: without a transaction, a failure between
  // the two steps left the proposal with NO items at all.
  await db.transaction(async tx => {
    await tx.delete(tradeProposalItems).where(eq(tradeProposalItems.proposalId, input.proposalId));
    if (input.selectedListingIds.length > 0) {
      await tx.insert(tradeProposalItems).values(
        input.selectedListingIds.map(listingId => ({
          proposalId: input.proposalId,
          offeredListingId: listingId,
        })),
      );
    }
  });

  return { success: true };
}

export async function respondToTradeProposal(
  user: Pick<User, "id" | "name">,
  input: {
    proposalId: number;
    response: "accepted" | "declined";
  },
) {
  const db = await requireDb();

  const proposal = await db
    .select()
    .from(tradeProposals)
    .where(eq(tradeProposals.id, input.proposalId))
    .limit(1);

  if (!proposal[0]) {
    throw new Error("Trade Proposal not found.");
  }

  if (proposal[0].recipientId !== user.id) {
    throw new Error("You can only respond to proposals sent to you.");
  }

  if (proposal[0].status !== "pending") {
    throw new Error("This proposal has already been responded to.");
  }

  const newStatus = input.response === "accepted" ? "accepted" : "declined";

  // Atomic: accepting a trade updates the proposal AND marks all involved
  // listings as traded. Without a transaction, a failure in between left an
  // "accepted" proposal whose items were still listed as available.
  await db.transaction(async tx => {
    await tx
      .update(tradeProposals)
      .set({
        status: newStatus,
        respondedAt: mysqlNow(),
      })
      .where(eq(tradeProposals.id, input.proposalId));

    if (input.response === "accepted") {
      const proposalItems = await tx
        .select()
        .from(tradeProposalItems)
        .where(eq(tradeProposalItems.proposalId, input.proposalId));

      const listingIds = proposalItems.map(item => item.offeredListingId);
      listingIds.push(proposal[0].requestedListingId);

      await tx
        .update(listings)
        .set({ status: "traded" })
        .where(inArray(listings.id, listingIds));
    }
  });

  return { success: true };
}

export async function toggleWatchlist(userId: number, listingId: number) {
  const db = await requireDb();

  // Check if the listing belongs to the current user
  const listing = await db
    .select({ ownerId: listings.ownerId })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);

  if (listing[0] && listing[0].ownerId === userId) {
    throw new Error("You cannot favorite your own items");
  }

  const existing = await db
    .select()
    .from(watchlistEntries)
    .where(and(eq(watchlistEntries.userId, userId), eq(watchlistEntries.listingId, listingId)))
    .limit(1);

  const isSaved = !existing[0];
  
  if (existing[0]) {
    // Remove from both watchlist and favorites
    await db
      .delete(watchlistEntries)
      .where(and(eq(watchlistEntries.userId, userId), eq(watchlistEntries.listingId, listingId)));
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.listingId, listingId)));
  } else {
    // Add to both watchlist and favorites
    await db.insert(watchlistEntries).values({
      userId,
      listingId,
    });
    await db.insert(favorites).values({
      userId,
      listingId,
    });
  }

  return { saved: isSaved };
}

export async function leaveTradeReview(
  user: Pick<User, "id" | "name">,
  input: {
    proposalId: number;
    rating: number;
    review?: string;
  },
) {
  const db = await requireDb();

  const proposal = await db
    .select()
    .from(tradeProposals)
    .where(eq(tradeProposals.id, input.proposalId))
    .limit(1);

  if (!proposal[0]) {
    throw new Error("Trade Proposal not found.");
  }

  if (proposal[0].status !== "completed") {
    throw new Error("You can only review completed trades.");
  }

  const revieweeId = proposal[0].requesterId === user.id ? proposal[0].recipientId : proposal[0].requesterId;

  await db.insert(tradeReviews).values({
    proposalId: input.proposalId,
    reviewerId: user.id,
    revieweeId,
    rating: Math.max(1, Math.min(5, input.rating)),
    review: input.review?.trim() ? input.review.trim().slice(0, 1000) : null,
  });

  return { success: true };
}

export async function sendTradeMessage(
  user: Pick<User, "id" | "name">,
  input: {
    proposalId: number;
    message: string;
  },
) {
  const db = await requireDb();

  const proposal = await db
    .select()
    .from(tradeProposals)
    .where(eq(tradeProposals.id, input.proposalId))
    .limit(1);

  if (!proposal[0]) {
    throw new Error("Trade Proposal not found.");
  }

  const isParticipant = proposal[0].requesterId === user.id || proposal[0].recipientId === user.id;
  if (!isParticipant) {
    throw new Error("You are not part of this trade proposal.");
  }

  await db.insert(tradeMessages).values({
    proposalId: input.proposalId,
    senderId: user.id,
    message: input.message.trim().slice(0, 2000),
  });

  return { success: true };
}

export async function searchMembers(input: {
  query?: string;
  region?: string;
  categories?: (typeof collectibleCategories)[number][];
  verifiedMerchantsOnly?: boolean;
  minRating?: number;
  minReviewCount?: number;
  minCompletedTrades?: number;
  activeListingsOnly?: boolean;
  listingValueMin?: number;
  listingValueMax?: number;
  memberSince?: "past_year" | "past_three_years" | "longstanding";
  distanceMiles?: number;
  sort?: "best_match" | "best_rated" | "most_trades" | "most_listings" | "newest" | "nearest";
}, originUserId?: number) {
  const db = await requireDb();

  const whereClauses: any[] = [];

  const trimmedQuery = input.query?.trim() ?? "";
  if (trimmedQuery) {
    const memberId = Number(trimmedQuery);
    whereClauses.push(
      Number.isInteger(memberId) && memberId > 0
        ? or(eq(userProfiles.userId, memberId), like(userProfiles.displayName, `%${trimmedQuery}%`), like(users.username, `%${trimmedQuery}%`))
        : or(like(userProfiles.displayName, `%${trimmedQuery}%`), like(users.username, `%${trimmedQuery}%`)),
    );
  }

  if (input.region?.trim() && input.region !== "all") {
    whereClauses.push(eq(userProfiles.contactState, input.region.trim()));
  }

  const members = await db
    .select({
      userId: userProfiles.userId,
      displayName: userProfiles.displayName,
      avatarUrl: userProfiles.avatarUrl,
      bio: userProfiles.bio,
      contactTown: userProfiles.contactTown,
      contactState: userProfiles.contactState,
      contactAddress: userProfiles.contactAddress,
      contactZipCode: userProfiles.contactZipCode,
      contactCountry: userProfiles.contactCountry,
      profileCreatedAt: userProfiles.createdAt,
      merchantVerified: users.merchantVerified,
      username: users.username,
    })
    .from(userProfiles)
    .innerJoin(users, eq(users.id, userProfiles.userId))
    .where(whereClauses.length > 0 ? and(...whereClauses) : undefined)
    .limit(50);

  const ratingMap = await getRatingStatsMap(members.map(m => m.userId));

  // Get listing counts for each member
  const listingCountsResult = await db
    .select({
      ownerId: listings.ownerId,
      count: sql<number>`count(*)`,
    })
    .from(listings)
    .where(eq(listings.status, "active"))
    .groupBy(listings.ownerId);
  const listingCountMap = new Map(listingCountsResult.map(r => [r.ownerId, Number(r.count)]));
  const listingValueResult = await db
    .select({
      ownerId: listings.ownerId,
      value: sql<number>`coalesce(sum(cast(${listings.estimatedValue} as decimal(12,2))), 0)`,
    })
    .from(listings)
    .where(eq(listings.status, "active"))
    .groupBy(listings.ownerId);
  const listingValueMap = new Map(listingValueResult.map(r => [r.ownerId, Number(r.value ?? 0)]));
  const firstListingMap = new Map<number, number>();
  for (const listing of await db
    .select({ ownerId: listings.ownerId, id: listings.id })
    .from(listings)
    .where(eq(listings.status, "active"))
    .orderBy(asc(listings.id))) {
    if (!firstListingMap.has(listing.ownerId)) firstListingMap.set(listing.ownerId, listing.id);
  }

  // Get completed trade counts
  const completedTradesResult = await db
    .select({
      revieweeId: tradeReviews.revieweeId,
      count: sql<number>`count(*)`,
    })
    .from(tradeReviews)
    .groupBy(tradeReviews.revieweeId);
  const completedTradesMap = new Map(completedTradesResult.map(r => [r.revieweeId, Number(r.count)]));

  // Get top categories
  const topCategoriesResult = await db
    .select({
      ownerId: listings.ownerId,
      category: listings.category,
      count: sql<number>`count(*)`,
    })
    .from(listings)
    .where(eq(listings.status, "active"))
    .groupBy(listings.ownerId, listings.category)
    .orderBy(desc(sql<number>`count(*)`));
  
  const topCategoriesMap = new Map<number, string[]>();
  for (const result of topCategoriesResult) {
    if (!topCategoriesMap.has(result.ownerId)) {
      topCategoriesMap.set(result.ownerId, []);
    }
    topCategoriesMap.get(result.ownerId)!.push(result.category);
  }

  const formattedMembers = members.map(m => {
    const rating = ratingMap.get(m.userId) ?? { averageRating: 0, reviewCount: 0 };
    const completedTradeCount = completedTradesMap.get(m.userId) ?? 0;
    const standing = resolveMemberStanding({
      merchantVerified: m.merchantVerified,
      completedTradeCount,
      reviewCount: rating.reviewCount,
    });
    return {
      userId: m.userId,
      displayName: m.displayName,
      username: m.username ?? null,
      avatarUrl: m.avatarUrl,
      bio: m.bio,
      region: m.contactState,
      regionLabel: [m.contactTown, m.contactState].filter(Boolean).join(", ") || "Location not shared",
      rating,
      averageRating: rating.averageRating,
      reviewCount: rating.reviewCount,
      listingCount: listingCountMap.get(m.userId) ?? 0,
      activeListingValue: listingValueMap.get(m.userId) ?? 0,
      completedTradeCount,
      topCategories: topCategoriesMap.get(m.userId) ?? [],
      firstListingId: firstListingMap.get(m.userId) ?? null,
      joinedAt: new Date(m.profileCreatedAt).getTime(),
      isVerifiedMerchant: m.merchantVerified === 1,
      standingKey: standing.key,
      verificationLevel: standing.label,
      privateLocation: {
        contactAddress: m.contactAddress,
        contactTown: m.contactTown,
        contactState: m.contactState,
        contactZipCode: m.contactZipCode,
        contactCountry: m.contactCountry,
      },
    };
  });

  const now = Date.now();
  const pastYear = now - 365 * 24 * 60 * 60 * 1000;
  const pastThreeYears = now - 3 * 365 * 24 * 60 * 60 * 1000;
  const filteredMembers = formattedMembers.filter(member => {
    if (input.verifiedMerchantsOnly && !member.isVerifiedMerchant) return false;
    if (input.categories?.length && !input.categories.some(category => member.topCategories.includes(category))) return false;
    if (input.minRating && member.averageRating < input.minRating) return false;
    if (input.minReviewCount && member.reviewCount < input.minReviewCount) return false;
    if (input.minCompletedTrades && member.completedTradeCount < input.minCompletedTrades) return false;
    if (input.activeListingsOnly && member.listingCount === 0) return false;
    if (input.listingValueMin !== undefined && member.activeListingValue < input.listingValueMin) return false;
    if (input.listingValueMax !== undefined && member.activeListingValue > input.listingValueMax) return false;
    if (input.memberSince === "past_year" && member.joinedAt < pastYear) return false;
    if (input.memberSince === "past_three_years" && member.joinedAt < pastThreeYears) return false;
    if (input.memberSince === "longstanding" && member.joinedAt > pastThreeYears) return false;
    return true;
  });

  let distanceFilteredMembers = filteredMembers.map(member => ({ ...member, distanceMiles: null as number | null }));
  if (input.distanceMiles !== undefined) {
    if (!originUserId) throw new Error("Sign in to filter members by distance.");
    const originProfile = await db
      .select({
        contactAddress: userProfiles.contactAddress,
        contactTown: userProfiles.contactTown,
        contactState: userProfiles.contactState,
        contactZipCode: userProfiles.contactZipCode,
        contactCountry: userProfiles.contactCountry,
      })
      .from(userProfiles)
      .where(eq(userProfiles.userId, originUserId))
      .limit(1);
    const originCoordinates = originProfile[0] ? await geocodePrivateLocation(originProfile[0]) : null;
    if (!originCoordinates) throw new Error("Add a saved city, state, or ZIP code to use the distance filter.");

    const memberCoordinates = await Promise.all(distanceFilteredMembers.map(async member => ({
      userId: member.userId,
      coordinates: await geocodePrivateLocation(member.privateLocation),
    })));
    const coordinatesByUserId = new Map(memberCoordinates.map(result => [result.userId, result.coordinates]));
    distanceFilteredMembers = distanceFilteredMembers
      .map(member => {
        const coordinates = coordinatesByUserId.get(member.userId);
        const distanceMiles = coordinates ? Math.round(milesBetween(originCoordinates, coordinates) * 10) / 10 : null;
        return { ...member, distanceMiles };
      })
      .filter(member => member.distanceMiles !== null && member.distanceMiles <= input.distanceMiles!);
  }

  const normalizedQuery = trimmedQuery.toLocaleLowerCase();
  const numericMemberId = Number(trimmedQuery);
  const isExactMatch = (member: (typeof distanceFilteredMembers)[number]) =>
    (Number.isInteger(numericMemberId) && numericMemberId > 0 && member.userId === numericMemberId)
    || member.displayName.trim().toLocaleLowerCase() === normalizedQuery
    || member.username?.trim().toLocaleLowerCase() === normalizedQuery;
  const orderedMembers = [...distanceFilteredMembers].sort((a, b) => {
    switch (input.sort ?? "best_match") {
      case "best_rated":
        return b.averageRating - a.averageRating || b.reviewCount - a.reviewCount || a.displayName.localeCompare(b.displayName);
      case "most_trades":
        return b.completedTradeCount - a.completedTradeCount || b.averageRating - a.averageRating || a.displayName.localeCompare(b.displayName);
      case "most_listings":
        return b.listingCount - a.listingCount || b.activeListingValue - a.activeListingValue || a.displayName.localeCompare(b.displayName);
      case "newest":
        return b.joinedAt - a.joinedAt || a.displayName.localeCompare(b.displayName);
      case "nearest":
        return (a.distanceMiles ?? Number.POSITIVE_INFINITY) - (b.distanceMiles ?? Number.POSITIVE_INFINITY) || a.displayName.localeCompare(b.displayName);
      default:
        return Number(isExactMatch(b)) - Number(isExactMatch(a)) || a.displayName.localeCompare(b.displayName);
    }
  });

  // Return object with members and rankings
  const topRated = [...distanceFilteredMembers].sort((a, b) => (b.rating?.averageRating ?? 0) - (a.rating?.averageRating ?? 0)).slice(0, 10);
  const mostActive = [...distanceFilteredMembers].sort((a, b) => (b.listingCount + b.completedTradeCount) - (a.listingCount + a.completedTradeCount)).slice(0, 10);
  const uniqueRegions = Array.from(new Set(members.map(m => m.contactState).filter((region): region is string => Boolean(region)))).sort();
  const exactMatchMemberId = trimmedQuery ? orderedMembers.find(isExactMatch)?.userId ?? null : null;
  
  return {
    members: orderedMembers.map(({ privateLocation, ...member }) => member),
    rankings: {
      topRated: topRated.map(({ privateLocation, ...member }) => member),
      mostActive: mostActive.map(({ privateLocation, ...member }) => member),
    },
    topRated: topRated.map(({ privateLocation, ...member }) => member),
    mostActive: mostActive.map(({ privateLocation, ...member }) => member),
    regions: uniqueRegions,
    searchedQuery: trimmedQuery,
    exactMatchMemberId,
  };
}

export async function toggleListingStatus(
  user: Pick<User, "id" | "name">,
  input: {
    listingId: number;
    isActive: boolean;
  },
) {
  const db = await requireDb();

  const listing = await db
    .select()
    .from(listings)
    .where(eq(listings.id, input.listingId))
    .limit(1);

  if (!listing[0]) {
    throw new Error("Listing not found.");
  }

  if (listing[0].ownerId !== user.id) {
    throw new Error("You can only toggle your own listings.");
  }

  await db
    .update(listings)
    .set({ isActive: input.isActive ? 1 : 0 })
    .where(eq(listings.id, input.listingId));

  return getDashboardData(user);
}

export async function bulkUpdateListingStatus(
  user: Pick<User, "id" | "name">,
  input: {
    listingIds: number[];
    isActive: boolean;
  },
) {
  const db = await requireDb();
  console.log('[bulkUpdateListingStatus] user.id:', user.id, 'listingIds:', input.listingIds, 'isActive:', input.isActive);

  const listings_to_update = await db
    .select({ id: listings.id, ownerId: listings.ownerId })
    .from(listings)
    .where(inArray(listings.id, input.listingIds));

  console.log('[bulkUpdateListingStatus] listings_to_update:', listings_to_update);

  for (const listing of listings_to_update) {
    if (listing.ownerId !== user.id) {
      console.error('[bulkUpdateListingStatus] Authorization failed: listing.ownerId:', listing.ownerId, 'user.id:', user.id);
      throw new Error("You can only update your own listings.");
    }
  }

  await db
    .update(listings)
    .set({ isActive: input.isActive ? 1 : 0 })
    .where(inArray(listings.id, input.listingIds));

  return getDashboardData(user);
}

export async function bulkDeleteListings(
  user: Pick<User, "id" | "name">,
  input: {
    listingIds: number[];
  },
) {
  const db = await requireDb();

  const listings_to_delete = await db
    .select({ id: listings.id, ownerId: listings.ownerId })
    .from(listings)
    .where(inArray(listings.id, input.listingIds));

  for (const listing of listings_to_delete) {
    if (listing.ownerId !== user.id) {
      throw new Error("You can only delete your own listings.");
    }
  }

  // Q33: Check if any listing is in an accepted trade (block deletion)
  for (const listing of listings_to_delete) {
    const [acceptedTrades] = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM tradeProposals WHERE requestedListingId = ${listing.id} AND status IN ('accepted', 'shipped')`
    );
    const [acceptedOffered] = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM tradeProposalItems tpi JOIN tradeProposals tp ON tp.id = tpi.proposalId WHERE tpi.offeredListingId = ${listing.id} AND tp.status IN ('accepted', 'shipped')`
    );
    if ((acceptedTrades as any)?.[0]?.cnt > 0 || (acceptedOffered as any)?.[0]?.cnt > 0) {
      throw new Error(`Cannot delete item "${listing.id}": it is part of an accepted trade. Cancel the trade first.`);
    }
  }

  // Q33: Auto-cancel any negotiating trades involving these items
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  for (const listing of listings_to_delete) {
    await db.execute(
      sql`UPDATE tradeProposals SET status = 'cancelled', declineReason = 'Trade cancelled: Item is no longer available.', updatedAt = ${now} WHERE requestedListingId = ${listing.id} AND status IN ('pending', 'negotiating')`
    );
    await db.execute(
      sql`UPDATE tradeProposals SET status = 'cancelled', declineReason = 'Trade cancelled: An offered item is no longer available.', updatedAt = ${now} WHERE status IN ('pending', 'negotiating') AND id IN (SELECT proposalId FROM tradeProposalItems WHERE offeredListingId = ${listing.id})`
    );
  }

  // Keep bulk-deleted listings recoverable for the Inventory Undo action.
  // Photos stay attached to the inactive listing and are restored with it.
  await db
    .update(listings)
    .set({ isActive: 0 })
    .where(inArray(listings.id, input.listingIds));

  return getDashboardData(user);
}

export async function restoreDeletedListings(
  user: Pick<User, "id" | "name">,
  input: {
    listingIds: number[];
  },
) {
  const db = await requireDb();

  const listings_to_restore = await db
    .select({ id: listings.id, ownerId: listings.ownerId })
    .from(listings)
    .where(inArray(listings.id, input.listingIds));

  for (const listing of listings_to_restore) {
    if (listing.ownerId !== user.id) {
      throw new Error("You can only restore your own listings.");
    }
  }

  await db
    .update(listings)
    .set({ isActive: 1 })
    .where(inArray(listings.id, input.listingIds));

  return getDashboardData(user);
}



export async function getUnreadMessageCount(userId: number) {
  const db = await requireDb();
  
  // Count unread inquiries for either participant without alerting the author
  // of the most recent inquiry reply.
  const inquiryResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(itemInquiries)
    .where(getInquiryUnreadCondition(userId));

  const inquiryCount = Number(inquiryResult[0]?.count ?? 0);

  // Count unread direct messages (sent to this user)
  const [dmRows] = await db.execute(
    sql`SELECT COUNT(*) as count FROM directMessages dm
    JOIN directMessageThreads t ON t.id = dm.threadId
    WHERE (t.participantAId = ${userId} OR t.participantBId = ${userId})
    AND dm.senderId != ${userId}
    AND dm.isReadByRecipient = 0`
  );
  const dmCount = Number(((dmRows as unknown) as any[])[0]?.count ?? 0);

  return { count: inquiryCount + dmCount };
}

export async function saveDraft(
  user: Pick<User, "id" | "name">,
  input: {
    title: string;
    category: (typeof collectibleCategories)[number];
    condition: (typeof itemConditions)[number];
    description: string;
    grade?: number;
    graderCompany?: string;
    certificationNumber?: string;
    estimatedValue?: number;
    photos: PhotoUploadInput[];
  },
) {
  const db = await requireDb();
  await ensureUserProfileRecord(user);

  const insertResult = await db.insert(draftListings).values({
    userId: user.id,
    title: input.title.trim(),
    category: input.category,
    grade: String(input.grade || 'ungraded'),
    graderCompany: input.graderCompany || null,
    certificationNumber: input.certificationNumber || null,
    estimatedValue: input.estimatedValue ? String(parseFloat(String(input.estimatedValue))) : null,
  });
  const draftId = getInsertId(insertResult);

  for (let index = 0; index < input.photos.length; index += 1) {
    const photo = input.photos[index]!;
    const uploaded = await uploadImage("drafts", user.id, photo);
    await db.insert(listingPhotos).values({
      listingId: draftId,
      fileKey: uploaded.key,
      imageUrl: uploaded.url,
      altText: `${input.title.trim()} draft photo ${index + 1}`,
      sortOrder: index,
    });
  }

  return { draftId };
}

export async function getDrafts(user: Pick<User, "id" | "name">) {
  const db = await requireDb();

    const draftRows = await db
      .select({
        id: draftListings.id,
        title: draftListings.title,
        category: draftListings.category,
        grade: draftListings.grade,
        graderCompany: draftListings.graderCompany,
        certificationNumber: draftListings.certificationNumber,
        estimatedValue: draftListings.estimatedValue,
        categoryFields: draftListings.categoryFields,
        additionalNotes: draftListings.additionalNotes,
        createdAt: draftListings.createdAt,
      })
    .from(draftListings)
    .where(eq(draftListings.userId, user.id))
    .orderBy(desc(draftListings.createdAt));

  const photoRows = await db
    .select({
      draftId: sql<number>`listingId`,
      imageUrl: listingPhotos.imageUrl,
      altText: listingPhotos.altText,
      sortOrder: listingPhotos.sortOrder,
    })
    .from(listingPhotos)
    .where(inArray(listingPhotos.listingId, draftRows.map(d => d.id)));

  const photoMap = new Map<number, any[]>();
  for (const photo of photoRows) {
    if (!photoMap.has(photo.draftId)) {
      photoMap.set(photo.draftId, []);
    }
    photoMap.get(photo.draftId)!.push({
      imageUrl: photo.imageUrl,
      altText: photo.altText,
    });
  }

  return draftRows.map(d => ({
    id: d.id,
    title: d.title,
    category: d.category,
    grade: d.grade,
    graderCompany: d.graderCompany,
    certificationNumber: d.certificationNumber,
    estimatedValue: d.estimatedValue ? Number(d.estimatedValue) : null,
    categoryFields: safeJsonParse(d.categoryFields, {}),
    additionalNotes: d.additionalNotes,
    photos: photoMap.get(d.id) ?? [],
    createdAt: new Date(d.createdAt).getTime(),
  }));
}

export async function deleteDraft(
  user: Pick<User, "id" | "name">,
  input: {
    draftId: number;
  },
) {
  const db = await requireDb();

  const draft = await db
    .select()
    .from(draftListings)
    .where(eq(draftListings.id, input.draftId))
    .limit(1);

  if (!draft[0]) {
    throw new Error("Draft not found.");
  }

  if (draft[0].userId !== user.id) {
    throw new Error("You can only delete your own drafts.");
  }

  await db.transaction(async (tx) => {
    await tx.delete(listingPhotos).where(eq(listingPhotos.listingId, input.draftId));
    await tx.delete(draftListings).where(eq(draftListings.id, input.draftId));
  });

  return { success: true };
}

export async function getDraftById(
  user: Pick<User, "id" | "name">,
  draftId: number,
) {
  const db = await requireDb();

  const draftRow = await db
    .select()
    .from(draftListings)
    .where(eq(draftListings.id, draftId))
    .limit(1);

  if (!draftRow[0]) {
    throw new Error("Draft not found.");
  }

  if (draftRow[0].userId !== user.id) {
    throw new Error("You can only access your own drafts.");
  }

  const photoRows = await db
    .select({
      imageUrl: listingPhotos.imageUrl,
      altText: listingPhotos.altText,
      sortOrder: listingPhotos.sortOrder,
    })
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, draftId))
    .orderBy(asc(listingPhotos.sortOrder));

  const draft = draftRow[0];
  return {
    id: draft.id,
    title: draft.title,
    category: draft.category,
    grade: draft.grade,
    graderCompany: draft.graderCompany,
    certificationNumber: draft.certificationNumber,
    estimatedValue: draft.estimatedValue ? Number(draft.estimatedValue) : null,
    categoryFields: safeJsonParse(draft.categoryFields, {}),
    additionalNotes: draft.additionalNotes,
    photos: photoRows.map(p => ({
      imageUrl: p.imageUrl,
      altText: p.altText,
    })),
    createdAt: new Date(draft.createdAt).getTime(),
  };
}

export async function updateDraft(
  user: Pick<User, "id" | "name">,
  input: {
    draftId: number;
    title: string;
    category: (typeof collectibleCategories)[number];
    grade?: number;
    graderCompany?: string;
    certificationNumber?: string;
    estimatedValue?: number;
    categoryFields?: Record<string, any>;
    additionalNotes?: string;
    photos: PhotoUploadInput[];
  },
) {
  const db = await requireDb();

  const draft = await db
    .select()
    .from(draftListings)
    .where(eq(draftListings.id, input.draftId))
    .limit(1);

  if (!draft[0]) {
    throw new Error("Draft not found.");
  }

  if (draft[0].userId !== user.id) {
    throw new Error("You can only update your own drafts.");
  }

  await db
    .update(draftListings)
    .set({
      title: input.title.trim(),
      category: input.category,
      grade: String(input.grade || 'ungraded'),
      graderCompany: input.graderCompany || null,
      certificationNumber: input.certificationNumber || null,
      estimatedValue: input.estimatedValue ? String(parseFloat(String(input.estimatedValue))) : null,
      categoryFields: input.categoryFields ? JSON.stringify(input.categoryFields) : null,
      additionalNotes: input.additionalNotes || null,
      updatedAt: mysqlNow(),
    })
    .where(eq(draftListings.id, input.draftId));

  await db.transaction(async tx => {
    const storedPhotos = await tx
      .select({ imageUrl: listingPhotos.imageUrl })
      .from(listingPhotos)
      .where(eq(listingPhotos.listingId, input.draftId));
    const retainedUrls = new Set(
      input.photos.filter(photo => !photo.contentBase64 && photo.imageUrl).map(photo => photo.imageUrl!),
    );

    for (const storedPhoto of storedPhotos) {
      if (!retainedUrls.has(storedPhoto.imageUrl)) {
        await tx.delete(listingPhotos).where(
          and(eq(listingPhotos.listingId, input.draftId), eq(listingPhotos.imageUrl, storedPhoto.imageUrl)),
        );
      }
    }

    for (let index = 0; index < input.photos.length; index += 1) {
      const photo = input.photos[index]!;
      if (photo.contentBase64) {
        const uploaded = await uploadImage("drafts", user.id, photo);
        await tx.insert(listingPhotos).values({
          listingId: input.draftId,
          fileKey: uploaded.key,
          imageUrl: uploaded.url,
          altText: `${input.title.trim()} draft photo ${index + 1}`,
          sortOrder: index,
        });
      } else if (photo.imageUrl) {
        await tx.update(listingPhotos)
          .set({ sortOrder: index })
          .where(and(eq(listingPhotos.listingId, input.draftId), eq(listingPhotos.imageUrl, photo.imageUrl)));
      }
    }
  });

  return { draftId: input.draftId };
}

export async function getTradebiliaContactIdentity(user: Pick<User, "id" | "name">) {
  const db = await requireDb();
  await ensureUserProfileRecord(user);
  const [profile] = await db
    .select({
      displayName: userProfiles.displayName,
      firstName: userProfiles.firstName,
      lastName: userProfiles.lastName,
      contactFullName: userProfiles.contactFullName,
      contactEmail: userProfiles.contactEmail,
    })
    .from(userProfiles)
    .where(eq(userProfiles.userId, user.id))
    .limit(1);

  return {
    userId: user.id,
    displayName: profile?.displayName?.trim() || user.name?.trim() || `Collector ${user.id}`,
    firstName: profile?.firstName?.trim() || "",
    lastName: profile?.lastName?.trim() || "",
    contactFullName: profile?.contactFullName?.trim() || "",
    // This is the email a member saved in their Tradebilia profile. Never fall
    // back to the Manus authentication email for member-facing contact flows.
    contactEmail: resolveTradebiliaContactEmail(profile?.contactEmail),
  };
}

export async function getDashboardData(user: Pick<User, "id" | "name">): Promise<{
  profile: {
    displayName: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    bio: string;
    contactFullName: string;
    contactEmail: string;
    contactPhone: string;
    contactAddress: string;
    contactTown: string;
    contactState: string;
    contactZipCode: string;
    contactCountry: string;
    securityQuestion: string;
    preferredCategories: string | null;
    showProfile: boolean;
    hideInventoryValue: boolean;
    receiveContactRequests: boolean;
    notificationPreferences: string | null;
    isMerchant: boolean;
    storeName: string | null;
    businessLicense: string | null;
    taxId: string | null;
    storeDescription: string | null;
    businessAddress: string | null;
    businessPhone: string | null;
    businessEmail: string | null;
    businessWebsite: string | null;
    acceptedTerms: boolean;
    rating: { averageRating: number; reviewCount: number };
    tradeHistoryCount: number;
  };
  ownListings: any[];
  watchlist: any[];
  tradeProposals: any[];
  tradeHistory: any[];
  ratingsAndReviews: any[];
}> {
  const db = await requireDb();
  await ensureUserProfileRecord(user);

  const profileQuery = db
    .select({
      displayName: userProfiles.displayName,
      firstName: userProfiles.firstName,
      lastName: userProfiles.lastName,
      avatarUrl: userProfiles.avatarUrl,
      bio: userProfiles.bio,
      contactFullName: userProfiles.contactFullName,
      contactEmail: userProfiles.contactEmail,
      contactPhone: userProfiles.contactPhone,
      contactAddress: userProfiles.contactAddress,
      contactTown: userProfiles.contactTown,
      contactState: userProfiles.contactState,
      contactZipCode: userProfiles.contactZipCode,
      contactCountry: userProfiles.contactCountry,
      securityQuestion: userProfiles.securityQuestion,
      preferredCategories: userProfiles.preferredCategories,
      showProfile: userProfiles.showProfile,
      hideInventoryValue: userProfiles.hideInventoryValue,
      receiveContactRequests: userProfiles.receiveContactRequests,
      notificationPreferences: userProfiles.notificationPreferences,
      isMerchant: userProfiles.isMerchant,
      storeName: userProfiles.storeName,
      businessLicense: userProfiles.businessLicense,
      taxId: userProfiles.taxId,
      storeDescription: userProfiles.storeDescription,
      businessAddress: userProfiles.businessAddress,
      businessPhone: userProfiles.businessPhone,
      businessEmail: userProfiles.businessEmail,
      businessWebsite: userProfiles.businessWebsite,
      acceptedTerms: userProfiles.acceptedTerms,
    })
    .from(userProfiles)
    .where(eq(userProfiles.userId, user.id))
    .limit(1);

  const [profileRows, ownListingRows, watchlistRows, receivedReviews, proposalCards, ratingMapData] = await Promise.all([
    profileQuery,
    db
      .select({
        id: listings.id,
        ownerId: listings.ownerId,
        title: listings.title,
        category: listings.category,
        condition: listings.condition,
        grade: listings.grade,
        certificationCompany: listings.certificationCompany,
        estimatedValue: listings.estimatedValue,
        description: listings.description,
        status: listings.status,
        featured: listings.featured,
        isActive: listings.isActive,
        createdAt: listings.createdAt,
        updatedAt: listings.updatedAt,
      })
      .from(listings)
      .where(eq(listings.ownerId, user.id))
      .orderBy(desc(listings.createdAt)),
    db
      .select({ listingId: watchlistEntries.listingId })
      .from(watchlistEntries)
      .where(eq(watchlistEntries.userId, user.id)),
    db
      .select({
        id: tradeReviews.id,
        proposalId: tradeReviews.proposalId,
        reviewerId: tradeReviews.reviewerId,
        rating: tradeReviews.rating,
        review: tradeReviews.review,
        createdAt: tradeReviews.createdAt,
      })
      .from(tradeReviews)
      .where(eq(tradeReviews.revieweeId, user.id))
      .orderBy(desc(tradeReviews.createdAt)),
    getProposalCards(user.id),
    getRatingStatsMap([user.id]),
  ]);

  // Fetch photos for own listings
  const ownListingIds = ownListingRows.map(r => r.id);
  const ownPhotos = ownListingIds.length ? await db
    .select({
      listingId: listingPhotos.listingId,
      imageUrl: listingPhotos.imageUrl,
      sortOrder: listingPhotos.sortOrder,
    })
    .from(listingPhotos)
    .where(inArray(listingPhotos.listingId, ownListingIds))
    .orderBy(asc(listingPhotos.sortOrder))
    : [];
  
  const ownPhotosMap = new Map<number, string>();
  ownPhotos.forEach(photo => {
    if (!ownPhotosMap.has(photo.listingId)) {
      ownPhotosMap.set(photo.listingId, photo.imageUrl);
    }
  });
  
  const enrichedOwnListings = ownListingRows.map(row => ({
    ...row,
    primaryPhotoUrl: ownPhotosMap.get(row.id) || null,
  }));
  
  const ownListings = await formatListings(enrichedOwnListings, user.id);
  const savedListingIds = watchlistRows.map(row => row.listingId);
  const savedListingRows = savedListingIds.length
    ? await     db
      .select({
        id: listings.id,
        ownerId: listings.ownerId,
        title: listings.title,
        category: listings.category,
        condition: listings.condition,
        grade: listings.grade,
        certificationCompany: listings.certificationCompany,
        estimatedValue: listings.estimatedValue,
        description: listings.description,
        status: listings.status,
        featured: listings.featured,
        isActive: listings.isActive,
        createdAt: listings.createdAt,
        updatedAt: listings.updatedAt,
      })
      .from(listings)
      .where(inArray(listings.id, savedListingIds))
      .orderBy(desc(listings.createdAt))
    : [];

  // Fetch photos for watchlist listings
  const watchlistPhotos = savedListingIds.length ? await db
    .select({
      listingId: listingPhotos.listingId,
      imageUrl: listingPhotos.imageUrl,
      sortOrder: listingPhotos.sortOrder,
    })
    .from(listingPhotos)
    .where(inArray(listingPhotos.listingId, savedListingIds))
    .orderBy(asc(listingPhotos.sortOrder))
    : [];
  
  const watchlistPhotosMap = new Map<number, string>();
  watchlistPhotos.forEach(photo => {
    if (!watchlistPhotosMap.has(photo.listingId)) {
      watchlistPhotosMap.set(photo.listingId, photo.imageUrl);
    }
  });
  
  const enrichedWatchlistRows = savedListingRows.map(row => ({
    ...row,
    primaryPhotoUrl: watchlistPhotosMap.get(row.id) || null,
  }));
  
  const reviewProfileMap = await getProfileMap(receivedReviews.map(row => row.reviewerId));
  const watchlist = await formatListings(enrichedWatchlistRows, user.id);
  const rating = ratingMapData.get(user.id) ?? { averageRating: 0, reviewCount: 0 };

  const profileData = profileRows[0] as any;

  return {
    profile: {
      displayName: profileData?.displayName ?? user.name ?? `Collector ${user.id}`,
      firstName: profileData?.firstName ?? "",
      lastName: profileData?.lastName ?? "",
      avatarUrl: profileData?.avatarUrl ?? null,
      bio: profileData?.bio ?? "Open to thoughtful, collector-to-collector trades.",
      contactFullName: profileData?.contactFullName ?? user.name ?? "",
      contactEmail: profileData?.contactEmail ?? "",
      contactPhone: profileData?.contactPhone ?? "",
      contactAddress: profileData?.contactAddress ?? "",
      // @ts-ignore - Drizzle type inference issue
      contactTown: profileData?.contactTown ?? "",
      // @ts-ignore - Drizzle type inference issue
      contactState: profileData?.contactState ?? "",
      // @ts-ignore - Drizzle type inference issue
      contactZipCode: profileData?.contactZipCode ?? "",
      // @ts-ignore - Drizzle type inference issue
      contactCountry: profileData?.contactCountry ?? "",
      securityQuestion: profileData?.securityQuestion ?? "",
      preferredCategories: profileData?.preferredCategories ?? null,
      showProfile: profileData?.showProfile ?? true,
      hideInventoryValue: profileData?.hideInventoryValue ?? false,
      receiveContactRequests: profileData?.receiveContactRequests ?? true,
      notificationPreferences: profileData?.notificationPreferences ?? null,
      isMerchant: Boolean(profileData?.isMerchant ?? false),
      storeName: profileData?.storeName ?? null,
      businessLicense: profileData?.businessLicense ?? null,
      taxId: profileData?.taxId ?? null,
      storeDescription: profileData?.storeDescription ?? null,
      businessAddress: profileData?.businessAddress ?? null,
      businessPhone: profileData?.businessPhone ?? null,
      businessEmail: profileData?.businessEmail ?? null,
      businessWebsite: profileData?.businessWebsite ?? null,
      acceptedTerms: Boolean(profileData?.acceptedTerms ?? false),
      rating,
      tradeHistoryCount: proposalCards.length,
    },
    ownListings,
    watchlist,
    tradeProposals: proposalCards,
    tradeHistory: proposalCards,
    ratingsAndReviews: receivedReviews.map(review => {
      const reviewer = reviewProfileMap.get(review.reviewerId) ?? {
        userId: review.reviewerId,
        displayName: `Collector ${review.reviewerId}`,
        avatarUrl: null,
      };
      return {
        id: review.id,
        proposalId: review.proposalId,
        rating: review.rating,
        review: review.review ?? "",
        createdAt: new Date(review.createdAt).getTime(),
        reviewer,
      };
    }),
  };
}

export async function updateProfile(
  user: Pick<User, "id" | "name">,
  input: {
    displayName: string;
    bio?: string;
    contactFullName?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactAddress?: string;
    contactTown?: string;
    contactState?: string;
    contactZipCode?: string;
    contactCountry?: string;
    firstName?: string;
    lastName?: string;
    avatar?: AvatarUploadInput | null;
    acceptedTerms?: boolean;
    isMerchant?: boolean;
    storeName?: string;
    businessLicense?: string;
    taxId?: string;
    storeDescription?: string;
    businessAddress?: string;
    businessPhone?: string;
    businessEmail?: string;
    businessWebsite?: string;
    securityQuestion?: string;
    securityAnswer?: string;
    preferredCategories?: (typeof collectibleCategories)[number][];
    notificationPreferences?: {
      tradeRequests?: boolean;
      messages?: boolean;
      feedback?: boolean;
      systemUpdates?: boolean;
    };
    emailVerified?: boolean;
    phoneVerified?: boolean;
  },
) {
  const db = await requireDb();
  await ensureUserProfileRecord(user);

  const updateSet: Record<string, unknown> = {
    displayName: input.displayName.trim().slice(0, 120),
    bio: input.bio?.trim() ? input.bio.trim() : null,
  };
  // Only update contact fields when explicitly provided (undefined = not sent = keep existing value)
  if (input.contactFullName !== undefined) {
    updateSet.contactFullName = input.contactFullName?.trim() ? input.contactFullName.trim().slice(0, 160) : null;
  }
  if (input.contactEmail !== undefined) {
    updateSet.contactEmail = input.contactEmail?.trim() ? input.contactEmail.trim().slice(0, 320) : null;
  }
  if (input.contactPhone !== undefined) {
    updateSet.contactPhone = input.contactPhone?.trim() ? input.contactPhone.trim().slice(0, 40) : null;
  }
  if (input.contactAddress !== undefined) {
    updateSet.contactAddress = input.contactAddress?.trim() ? input.contactAddress.trim().slice(0, 320) : null;
  }
  if (input.contactTown !== undefined) {
    updateSet.contactTown = input.contactTown?.trim() ? input.contactTown.trim().slice(0, 100) : null;
  }
  if (input.contactState !== undefined) {
    updateSet.contactState = input.contactState?.trim() ? input.contactState.trim().slice(0, 100) : null;
  }
  if (input.contactZipCode !== undefined) {
    updateSet.contactZipCode = input.contactZipCode?.trim() ? input.contactZipCode.trim().slice(0, 20) : null;
  }
  if (input.contactCountry !== undefined) {
    updateSet.contactCountry = input.contactCountry?.trim() ? input.contactCountry.trim().slice(0, 100) : null;
  }

  if (input.firstName !== undefined) {
    updateSet.firstName = input.firstName?.trim() ? input.firstName.trim().slice(0, 100) : null;
  }
  if (input.lastName !== undefined) {
    updateSet.lastName = input.lastName?.trim() ? input.lastName.trim().slice(0, 100) : null;
  }

  if (input.avatar) {
    try {
      const uploaded = await uploadImage("avatars", user.id, input.avatar);
      updateSet.avatarKey = uploaded.key;
      updateSet.avatarUrl = uploaded.url;
    } catch (error) {
      console.error("[updateProfile] Upload failed, skipping avatar update:", error);
    }
  }

  if (input.acceptedTerms !== undefined) {
    updateSet.acceptedTerms = input.acceptedTerms;
  }
  if (input.isMerchant !== undefined) {
    updateSet.isMerchant = input.isMerchant;
  }
  if (input.storeName !== undefined) {
    updateSet.storeName = input.storeName?.trim() ? input.storeName.trim().slice(0, 255) : null;
  }
  if (input.businessLicense !== undefined) {
    updateSet.businessLicense = input.businessLicense?.trim() ? input.businessLicense.trim().slice(0, 255) : null;
  }
  if (input.taxId !== undefined) {
    updateSet.taxId = input.taxId?.trim() ? input.taxId.trim().slice(0, 100) : null;
  }
  if (input.storeDescription !== undefined) {
    updateSet.storeDescription = input.storeDescription?.trim() ? input.storeDescription.trim() : null;
  }
  if (input.businessAddress !== undefined) {
    updateSet.businessAddress = input.businessAddress?.trim() ? input.businessAddress.trim() : null;
  }
  if (input.businessPhone !== undefined) {
    updateSet.businessPhone = input.businessPhone?.trim() ? input.businessPhone.trim().slice(0, 40) : null;
  }
  if (input.businessEmail !== undefined) {
    updateSet.businessEmail = input.businessEmail?.trim() ? input.businessEmail.trim().slice(0, 320) : null;
  }
  if (input.businessWebsite !== undefined) {
    updateSet.businessWebsite = input.businessWebsite?.trim() ? input.businessWebsite.trim().slice(0, 512) : null;
  }
  if (input.securityQuestion !== undefined) {
    updateSet.securityQuestion = input.securityQuestion?.trim() ? input.securityQuestion.trim().slice(0, 255) : null;
  }
  if (input.securityAnswer !== undefined) {
    // Hash the answer before storing — never save security answers as plain text
    if (input.securityAnswer?.trim()) {
      updateSet.securityAnswer = await bcrypt.hash(input.securityAnswer.trim().toLowerCase(), 10);
    } else {
      updateSet.securityAnswer = null;
    }
  }
  if (input.preferredCategories !== undefined) {
    updateSet.preferredCategories = input.preferredCategories ? JSON.stringify(input.preferredCategories) : null;
  }
  if (input.notificationPreferences !== undefined) {
    updateSet.notificationPreferences = input.notificationPreferences ? JSON.stringify(input.notificationPreferences) : null;
  }
  if (input.emailVerified !== undefined) {
    updateSet.emailVerified = input.emailVerified;
  }
  if (input.phoneVerified !== undefined) {
    updateSet.phoneVerified = input.phoneVerified;
  }

  console.log("[updateProfile] Updating database...");
  await db.update(userProfiles).set(updateSet).where(eq(userProfiles.userId, user.id));
  console.log("[updateProfile] Database updated, calling getDashboardData...");
  const result = await getDashboardData(user);
  console.log("[updateProfile] getDashboardData completed, returning result");
  return result;
}

export async function createListing(
  user: Pick<User, "id" | "name">,
  input: {
    title: string;
    category: (typeof collectibleCategories)[number];
    itemType: string;
    condition: (typeof itemConditions)[number];
    description: string;
    estimatedValue?: number;
    photos: PhotoUploadInput[];
    itemDetails?: Record<string, string>;
    certificationCompany?: string;
    certificationNumber?: string;
    grade?: string;
  },
) {
  const db = await requireDb();
  await ensureUserProfileRecord(user);

  const insertResult = await db.insert(listings).values({
    ownerId: user.id,
    title: input.title.trim(),
    category: input.category,
    itemType: input.itemType,
    condition: input.condition,
    description: input.description.trim(),
    estimatedValue: input.estimatedValue ? String(parseFloat(String(input.estimatedValue))) : null,
    itemDetails: input.itemDetails ? JSON.stringify(input.itemDetails) : null,
    certificationCompany: input.certificationCompany || undefined,
    certificationNumber: input.certificationNumber || undefined,
    grade: input.grade && input.grade !== 'ungraded' && input.grade.trim() ? String(input.grade) : '0',
    featured: 0,
  });
  const listingId = getInsertId(insertResult);

  for (let index = 0; index < input.photos.length; index += 1) {
    const photo = input.photos[index]!;
    const uploaded = await uploadImage("listings", user.id, photo);
    await db.insert(listingPhotos).values({
      listingId,
      fileKey: uploaded.key,
      imageUrl: uploaded.url,
      altText: `${input.title.trim()} photo ${index + 1}`,
      sortOrder: index,
    });
  }

  return getDashboardData(user);
}

export async function updateListing(
  user: Pick<User, "id" | "name">,
  input: {
    listingId: number;
    title: string;
    category: (typeof collectibleCategories)[number];
    condition: (typeof itemConditions)[number];
    description: string;
    estimatedValue?: number;
    photos: PhotoUploadInput[];
    itemDetails?: Record<string, string>;
    certificationCompany?: string;
    certificationNumber?: string;
    grade?: string;
  },
) {
  const db = await requireDb();
  await ensureUserProfileRecord(user);

  // Verify ownership
  const listing = await db
    .select({ ownerId: listings.ownerId })
    .from(listings)
    .where(eq(listings.id, input.listingId))
    .limit(1);

  if (!listing[0] || listing[0].ownerId !== user.id) {
    throw new Error("Unauthorized: You can only edit your own listings");
  }

  // Get user role
  const userRecord = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  const isAdmin = userRecord[0]?.role === 'admin';

  // Update listing
  await db
    .update(listings)
    .set({
      title: input.title.trim(),
      category: input.category,
      condition: input.condition,
      description: input.description.trim(),
      estimatedValue: input.estimatedValue ? String(parseFloat(String(input.estimatedValue))) : null,
      itemDetails: input.itemDetails ? JSON.stringify(input.itemDetails) : null,
      certificationCompany: input.certificationCompany || null,
      certificationNumber: input.certificationNumber || null,
      grade: input.grade && input.grade !== 'ungraded' && input.grade.trim() ? String(input.grade) : '0',
    })
    .where(eq(listings.id, input.listingId));

  // Handle photos
  await db.transaction(async tx => {
    if (isAdmin) {
      // Admins can delete and replace all photos
      await tx.delete(listingPhotos).where(eq(listingPhotos.listingId, input.listingId));

      for (let index = 0; index < input.photos.length; index += 1) {
        const photo = input.photos[index]!;
        let imageUrl = photo.imageUrl;
        let fileKey = "existing";

        if (photo.contentBase64) {
          const uploaded = await uploadImage("listings", user.id, {
            name: photo.name,
            type: photo.type,
            contentBase64: photo.contentBase64
          });
          imageUrl = uploaded.url;
          fileKey = uploaded.key;
        }

        if (imageUrl) {
          await tx.insert(listingPhotos).values({
            listingId: input.listingId,
            fileKey: fileKey,
            imageUrl: imageUrl,
            altText: `${input.title.trim()} photo ${index + 1}`,
            sortOrder: index,
          });
        }
      }
    } else {
      // Members can remove their own photos, reorder retained photos, and add new ones.
      const newPhotos = input.photos.filter(p => p.contentBase64);
      const existingPhotos = input.photos.filter(p => !p.contentBase64 && p.imageUrl);

      const storedPhotos = await tx
        .select({ imageUrl: listingPhotos.imageUrl })
        .from(listingPhotos)
        .where(eq(listingPhotos.listingId, input.listingId));
      const retainedUrls = new Set(existingPhotos.map(photo => photo.imageUrl!));
      for (const storedPhoto of storedPhotos) {
        if (!retainedUrls.has(storedPhoto.imageUrl)) {
          await tx.delete(listingPhotos).where(
            and(eq(listingPhotos.listingId, input.listingId), eq(listingPhotos.imageUrl, storedPhoto.imageUrl)),
          );
        }
      }

      // Update sortOrder for existing photos to save cover photo selection
      for (let i = 0; i < existingPhotos.length; i++) {
        const photo = existingPhotos[i]!;
        if (photo.imageUrl) {
          await tx
            .update(listingPhotos)
            .set({ sortOrder: i })
            .where(
              and(
                eq(listingPhotos.listingId, input.listingId),
                eq(listingPhotos.imageUrl, photo.imageUrl)
              )
            );
        }
      }

      if (newPhotos.length > 0) {
        // Get current max sort order
        const maxSortResult = await tx
          .select({ maxOrder: sql<number>`COALESCE(MAX(sortOrder), -1)` })
          .from(listingPhotos)
          .where(eq(listingPhotos.listingId, input.listingId));

        let nextSortOrder = (maxSortResult[0]?.maxOrder ?? -1) + 1;

        // Only insert new photos
        for (const photo of newPhotos) {
          const uploaded = await uploadImage("listings", user.id, {
            name: photo.name,
            type: photo.type,
            contentBase64: photo.contentBase64
          });

          await tx.insert(listingPhotos).values({
            listingId: input.listingId,
            fileKey: uploaded.key,
            imageUrl: uploaded.url,
            altText: `${input.title.trim()} photo ${nextSortOrder + 1}`,
            sortOrder: nextSortOrder,
          });
          nextSortOrder++;
        }
      }
    }
  });

  return getDashboardData(user);
}

export async function upsertUser(input: {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date;
}) {
  const db = await requireDb();

  // Check if user already exists
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.openId, input.openId))
    .limit(1);

  if (existing[0]) {
    // Update existing user
    await db
      .update(users)
      .set({
        name: input.name,
        email: input.email,
        loginMethod: input.loginMethod,
        lastSignedIn: toMysqlDateTime(
          typeof input.lastSignedIn === 'string' ? new Date(input.lastSignedIn) : input.lastSignedIn || new Date(),
        ),
      })
      .where(eq(users.openId, input.openId));

    return existing[0].id;
  } else {
    // Create new user
        const result = await db.insert(users).values({
      openId: input.openId,
      name: input.name,
      email: input.email,
      loginMethod: input.loginMethod,
      lastSignedIn: input.lastSignedIn
        ? toMysqlDateTime(
            typeof input.lastSignedIn === "string" ? new Date(input.lastSignedIn) : input.lastSignedIn,
          )
        : undefined,
    });
    return getInsertId(result);
  }
}


export async function getUserById(id: number) {
  const db = await requireDb();
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return result[0] || null;
}

export async function getUserByOpenId(openId: string) {
  const db = await requireDb();
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result[0] || null;
}


export async function getUserByUsername(username: string) {
  const db = await requireDb();
  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return result[0] || null;
}

export async function createUser(input: {
  username: string;
  passwordHash: string;
  displayName: string;
  email?: string;
}) {
  const db = await requireDb();
  const now = new Date();
  const result = await db.insert(users).values({
    username: input.username,
    passwordHash: input.passwordHash,
    displayName: input.displayName,
    email: input.email || null,
    loginMethod: "custom",
    role: "user",
    createdAt: toMysqlDateTime(now),
    updatedAt: toMysqlDateTime(now),
    lastSignedIn: toMysqlDateTime(now),
    lastActivityAt: toMysqlDateTime(now),
    isSuspended: 0,
    isBanned: 0,
    warnCount: 0,
    // Set all optional fields to null
    openId: null,
    name: null,
    avatarUrl: null,
    securityQuestion: null,
    securityAnswerHash: null,
    ebayUsername: null,
    ebayUserId: null,
    ebayFeedbackScore: null,
    ebayFeedbackPercentage: null,
    ebayMemberSince: null,
    ebaySellerLevel: null,
    ebayIdVerified: 0,
    ebayStar: null,
    ebayPositive12mo: null,
    ebayNeutral12mo: null,
    ebayNegative12mo: null,
    ebayIsStoreOwner: 0,
    ebayConnectedAt: null,
    ebayAccessToken: null,
    ebayRefreshToken: null,
    ebayTokenExpiresAt: null,
    facebookId: null,
    facebookName: null,
    facebookVerified: 0,
    facebookConnectedAt: null,
    facebookAccessToken: null,
    facebookEmail: null,
    facebookPicture: null,
    facebookLocation: null,
    facebookLink: null,
    facebookLikes: null,
    linkedinId: null,
    linkedinName: null,
    linkedinEmail: null,
    linkedinPicture: null,
    linkedinHeadline: null,
    linkedinProfileUrl: null,
    linkedinAccessToken: null,
    linkedinConnectedAt: null,
    suspendedAt: null,
    suspensionReason: null,
    suspendedBy: null,
    bannedAt: null,
    banReason: null,
    bannedBy: null,
    lastWarnedAt: null,
  });
  return getInsertId(result);
}


// Password Recovery Functions
export async function createPasswordResetToken(userId: number, token: string, expiresAt: Date) {
  const db = await requireDb();
  return db.insert(passwordResetTokens).values({
    userId,
    token,
    expiresAt: toMysqlDateTime(expiresAt),
  });
}

export async function getPasswordResetToken(token: string) {
  const db = await requireDb();
  const result = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token)).limit(1);
  return result[0] || null;
}

export async function deletePasswordResetToken(token: string) {
  const db = await requireDb();
  return db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
}

export async function deletePasswordResetTokensForUser(userId: number) {
  const db = await requireDb();
  return db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await requireDb();
  return db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}


// OTP Verification Functions
export async function createEmailOtp(email: string, otp: string, expiresAt: Date) {
  const db = await requireDb();
  // Delete existing OTPs for this email
  await db.delete(emailVerificationOtps).where(eq(emailVerificationOtps.email, email));
  return db.insert(emailVerificationOtps).values({
    email,
    otp,
    expiresAt: toMysqlDateTime(expiresAt),
  });
}

export async function createPhoneOtp(phone: string, otp: string, expiresAt: Date) {
  const db = await requireDb();
  // Delete existing OTPs for this phone
  await db.delete(phoneVerificationOtps).where(eq(phoneVerificationOtps.phone, phone));
  return db.insert(phoneVerificationOtps).values({
    phone,
    otp,
    expiresAt: toMysqlDateTime(expiresAt),
  });
}

export async function getEmailOtp(email: string) {
  const db = await requireDb();
  const result = await db.select().from(emailVerificationOtps).where(eq(emailVerificationOtps.email, email)).limit(1);
  return result[0] || null;
}

export async function getPhoneOtp(phone: string) {
  const db = await requireDb();
  const result = await db.select().from(phoneVerificationOtps).where(eq(phoneVerificationOtps.phone, phone)).limit(1);
  return result[0] || null;
}

export async function deleteEmailOtp(email: string) {
  const db = await requireDb();
  return db.delete(emailVerificationOtps).where(eq(emailVerificationOtps.email, email));
}

export async function deletePhoneOtp(phone: string) {
  const db = await requireDb();
  return db.delete(phoneVerificationOtps).where(eq(phoneVerificationOtps.phone, phone));
}

export async function incrementEmailOtpAttempts(email: string) {
  const db = await requireDb();
  return db.update(emailVerificationOtps).set({ attempts: sql`attempts + 1` }).where(eq(emailVerificationOtps.email, email));
}

export async function incrementPhoneOtpAttempts(phone: string) {
  const db = await requireDb();
  return db.update(phoneVerificationOtps).set({ attempts: sql`attempts + 1` }).where(eq(phoneVerificationOtps.phone, phone));
}


export async function checkDuplicateAccountInfo(
  userId: number,
  email?: string,
  phone?: string,
  fullName?: string,
  address?: string
) {
  const db = await requireDb();
  
  // Check for duplicate email
  if (email && email.trim()) {
    const existingEmail = await db
      .select({ userId: userProfiles.userId })
      .from(userProfiles)
      .where(and(
        eq(userProfiles.contactEmail, email),
        ne(userProfiles.userId, userId)
      ))
      .limit(1);
    
    if (existingEmail.length > 0) {
      return {
        isDuplicate: true,
        field: 'email',
        message: 'An account with this email address already exists. Users are not allowed to have multiple accounts.',
      };
    }
  }
  
  // Check for duplicate phone number
  if (phone && phone.trim()) {
    const existingPhone = await db
      .select({ userId: userProfiles.userId })
      .from(userProfiles)
      .where(and(
        eq(userProfiles.contactPhone, phone),
        ne(userProfiles.userId, userId)
      ))
      .limit(1);
    
    if (existingPhone.length > 0) {
      return {
        isDuplicate: true,
        field: 'phone',
        message: 'An account with this phone number already exists. Users are not allowed to have multiple accounts.',
      };
    }
  }
  
  // Check for duplicate full name + address combination
  if (fullName && address && fullName.trim() && address.trim()) {
    const existingNameAddress = await db
      .select({ userId: userProfiles.userId, contactAddress: userProfiles.contactAddress })
      .from(userProfiles)
      .where(and(
        eq(userProfiles.contactFullName, fullName),
        eq(userProfiles.contactAddress, address),
        ne(userProfiles.userId, userId)
      ))
      .limit(1);
    
    if (existingNameAddress.length > 0) {
      return {
        isDuplicate: true,
        field: 'nameAddress',
        message: 'An account with this name and address already exists. Users are not allowed to have multiple accounts.',
      };
    }
  }
  
  return { isDuplicate: false };
}


// Generate a unique Report ID
export async function generateReportId(): Promise<string> {
  const db = await requireDb();
  const lastReport = await db
    .select()
    .from(userReports)
    .orderBy(desc(userReports.id))
    .limit(1);
  
  const nextNumber = (lastReport[0]?.id ?? 0) + 1;
  return `RPT-${String(nextNumber).padStart(6, '0')}`;
}

// Submit a user report
export async function submitUserReport(input: {
  reportedUserId: number;
  reporterUserId: number;
  reason: string;
  description: string;
  evidence?: string;
}): Promise<{ reportId: string }> {
  const db = await requireDb();
  
  const reportId = await generateReportId();
  
  await db.insert(userReports).values({
    reportId,
    reportedUserId: input.reportedUserId,
    reporterUserId: input.reporterUserId,
    reason: input.reason,
    description: input.description,
    evidence: input.evidence,
    status: 'pending',
  });
  
  return { reportId };
}

const REPORT_EVIDENCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"]);
const REPORT_EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;

export async function uploadReportEvidence(userId: number, input: { name: string; type: string; contentBase64: string }) {
  if (!REPORT_EVIDENCE_TYPES.has(input.type)) throw new Error("Evidence must be a PNG, JPG, WEBP, PDF, or TXT file.");
  const buffer = Buffer.from(input.contentBase64, "base64");
  if (!buffer.length || buffer.length > REPORT_EVIDENCE_MAX_BYTES) throw new Error("Evidence files must be between 1 byte and 10MB.");
  const safeName = input.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 140) || "evidence";
  const uploaded = await storagePut(`reports/${userId}/${Date.now()}-${safeName}`, buffer, input.type);
  return { ...uploaded, name: safeName, type: input.type, size: buffer.length };
}

export async function getReportsByReporter(reporterUserId: number) {
  const db = await requireDb();
  return db
    .select({
      reportId: userReports.reportId,
      reason: userReports.reason,
      status: userReports.status,
      createdAt: userReports.createdAt,
      reportedMember: sql<string>`COALESCE(NULLIF(${userProfiles.displayName}, ''), ${users.username})`,
    })
    .from(userReports)
    .innerJoin(users, eq(userReports.reportedUserId, users.id))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(userReports.reporterUserId, reporterUserId))
    .orderBy(desc(userReports.createdAt));
}

// Get all user reports for admin (with pagination)
export async function getUserReports(options: {
  status?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<Array<{
  id: number;
  reportId: string;
  reportedUserId: number;
  reportedUserName: string;
  reportedUserDisplayName: string;
  reporterUserId: number;
  reporterUserName: string;
  reason: string;
  status: string;
  createdAt: Date;
}>> {
  const db = await requireDb();
  
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  
  const whereClauses = [];
  if (options.status) {
    whereClauses.push(eq(userReports.status, options.status as any));
  }
  
  const results = await db
    .select({
      id: userReports.id,
      reportId: userReports.reportId,
      reportedUserId: userReports.reportedUserId,
      reportedUserName: users.username,
      reportedUserDisplayName: users.displayName,
      reporterUserId: userReports.reporterUserId,
      reporterUserName: sql<string>`(SELECT username FROM users WHERE id = ${userReports.reporterUserId})`,
      reason: userReports.reason,
      status: userReports.status,
      createdAt: userReports.createdAt,
    })
    .from(userReports)
    .innerJoin(users, eq(userReports.reportedUserId, users.id))
    .where(whereClauses.length > 0 ? and(...whereClauses) : undefined)
    .orderBy(desc(userReports.createdAt))
    .limit(limit)
    .offset(offset)
  
  return results as any;
}

// Get a specific user report with full details
export async function getUserReportDetails(reportId: string): Promise<{
  id: number;
  reportId: string;
  reportedUserId: number;
  reportedUserName: string;
  reportedUserDisplayName: string;
  reportedUserEmail: string;
  reporterUserId: number;
  reporterUserName: string;
  reporterUserDisplayName: string;
  reason: string;
  description: string;
  evidence?: string;
  status: string;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: number;
  reviewedByName?: string;
} | null> {
  const db = await requireDb();
  
  const report = await db
    .select()
    .from(userReports)
    .where(eq(userReports.reportId, reportId))
    .limit(1);
  
  if (!report[0]) return null;
  
  const reportedUser = await db
    .select()
    .from(users)
    .where(eq(users.id, report[0].reportedUserId))
    .limit(1);
  
  const reporterUser = await db
    .select()
    .from(users)
    .where(eq(users.id, report[0].reporterUserId))
    .limit(1);
  
  let reviewedByUser = null;
  if (report[0].reviewedBy) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, report[0].reviewedBy))
      .limit(1);
    reviewedByUser = result[0];
  }
  
  return {
    id: report[0].id,
    reportId: report[0].reportId,
    reportedUserId: report[0].reportedUserId,
    reportedUserName: reportedUser[0]?.username ?? '',
    reportedUserDisplayName: reportedUser[0]?.displayName ?? '',
    reportedUserEmail: reportedUser[0]?.email ?? '',
    reporterUserId: report[0].reporterUserId,
    reporterUserName: reporterUser[0]?.username ?? '',
    reporterUserDisplayName: reporterUser[0]?.displayName ?? '',
    reason: report[0].reason,
    description: report[0].description,
    evidence: report[0].evidence ?? undefined,
    status: report[0].status,
    adminNotes: report[0].adminNotes ?? undefined,
    createdAt: new Date(report[0].createdAt),
    updatedAt: new Date(report[0].updatedAt),
    reviewedAt: report[0].reviewedAt ? new Date(report[0].reviewedAt) : undefined,
    reviewedBy: report[0].reviewedBy ?? undefined,
    reviewedByName: reviewedByUser?.username ?? undefined,
  };
}

// Update report status (admin only)
export async function updateReportStatus(input: {
  reportId: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
  adminNotes?: string;
  reviewedBy: number;
}): Promise<void> {
  const db = await requireDb();
  
  await db
    .update(userReports)
    .set({
      status: input.status,
      adminNotes: input.adminNotes,
      reviewedAt: mysqlNow(),
      reviewedBy: input.reviewedBy,
    })
    .where(eq(userReports.reportId, input.reportId));
}


// eBay Feedback Functions
export async function updateUserEbayInfo(input: {
  userId: number;
  ebayUsername: string;
  ebayUserId: string;
  ebayFeedbackScore: number;
  ebayFeedbackPercentage: number;
  ebayMemberSince: Date;
  ebaySellerLevel?: string;
  ebayIdVerified: boolean;
  ebayStar?: string;
  ebayPositive12mo?: number;
  ebayNeutral12mo?: number;
  ebayNegative12mo?: number;
  ebayIsStoreOwner?: boolean;
  ebayAccessToken: string;
  ebayRefreshToken: string;
  ebayTokenExpiresAt: Date;
}): Promise<void> {
  const db = await requireDb();
  await db
    .update(users)
    .set({
      ebayUsername: input.ebayUsername,
      ebayUserId: input.ebayUserId,
      ebayFeedbackScore: input.ebayFeedbackScore,
      ebayFeedbackPercentage: input.ebayFeedbackPercentage.toString(),
      ebayMemberSince: input.ebayMemberSince ? toMysqlDateTime(input.ebayMemberSince) : undefined,
      ebaySellerLevel: input.ebaySellerLevel,
      ebayIdVerified: input.ebayIdVerified ? 1 : 0,
      ebayStar: input.ebayStar,
      ebayPositive12mo: input.ebayPositive12mo,
      ebayNeutral12mo: input.ebayNeutral12mo,
      ebayNegative12mo: input.ebayNegative12mo,
      ebayIsStoreOwner: input.ebayIsStoreOwner ? 1 : 0,
      ebayConnectedAt: mysqlNow(),
      ebayAccessToken: encrypt(input.ebayAccessToken),
      ebayRefreshToken: encrypt(input.ebayRefreshToken),
      ebayTokenExpiresAt: input.ebayTokenExpiresAt ? toMysqlDateTime(input.ebayTokenExpiresAt) : undefined,
    })
    .where(eq(users.id, input.userId));
}

export async function getUserEbayInfo(userId: number): Promise<{
  ebayUsername?: string | null;
  ebayUserId?: string | null;
  ebayFeedbackScore?: number | null;
  ebayFeedbackPercentage?: number | null;
  ebayMemberSince?: Date | null;
  ebaySellerLevel?: string | null;
  ebayIdVerified?: boolean | null;
  ebayStar?: string | null;
  ebayPositive12mo?: number | null;
  ebayNeutral12mo?: number | null;
  ebayNegative12mo?: number | null;
  ebayIsStoreOwner?: boolean | null;
  ebayConnectedAt?: Date | null;
} | null> {
  const db = await requireDb();
  const user = await db
    .select({
      ebayUsername: users.ebayUsername,
      ebayUserId: users.ebayUserId,
      ebayFeedbackScore: users.ebayFeedbackScore,
      ebayFeedbackPercentage: users.ebayFeedbackPercentage,
      ebayMemberSince: users.ebayMemberSince,
      ebaySellerLevel: users.ebaySellerLevel,
      ebayIdVerified: users.ebayIdVerified,
      ebayStar: users.ebayStar,
      ebayPositive12mo: users.ebayPositive12mo,
      ebayNeutral12mo: users.ebayNeutral12mo,
      ebayNegative12mo: users.ebayNegative12mo,
      ebayIsStoreOwner: users.ebayIsStoreOwner,
      ebayConnectedAt: users.ebayConnectedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
    if (!user[0]) return null;
  return {
    ...user[0],
    ebayFeedbackPercentage: user[0].ebayFeedbackPercentage ? parseFloat(user[0].ebayFeedbackPercentage) : null,
    ebayIdVerified: user[0].ebayIdVerified === 1,
    ebayIsStoreOwner: user[0].ebayIsStoreOwner === 1,
    // Timestamp columns are string-mode; convert at the boundary to keep the
    // declared Date-based API contract.
    ebayMemberSince: user[0].ebayMemberSince ? new Date(user[0].ebayMemberSince) : null,
    ebayConnectedAt: user[0].ebayConnectedAt ? new Date(user[0].ebayConnectedAt) : null,
  };
}

export async function storeEbayFeedback(input: {
  userId: number;
  feedbackId: string;
  rating: 'positive' | 'neutral' | 'negative';
  comment?: string;
  from: string;
  itemId?: string;
  itemTitle?: string;
  feedbackDate: Date;
}): Promise<void> {
  const db = await requireDb();
  // Prevent duplicates on reconnect — skip if this feedbackId already stored for this user
  const [existing] = await db
    .select({ id: ebayFeedbackHistory.id })
    .from(ebayFeedbackHistory)
    .where(and(
      eq(ebayFeedbackHistory.userId, input.userId),
      eq(ebayFeedbackHistory.feedbackId, input.feedbackId)
    ))
    .limit(1);
  if (existing) return;
  await db.insert(ebayFeedbackHistory).values({
    ...input,
    feedbackDate: toMysqlDateTime(input.feedbackDate),
  });
}

export async function getUserEbayFeedback(userId: number): Promise<Array<{
  id: number;
  feedbackId: string;
  rating: string;
  comment?: string;
  from: string;
  itemTitle?: string;
  feedbackDate: Date;
}>> {
  const db = await requireDb();
  const feedback = await db
    .select()
    .from(ebayFeedbackHistory)
    .where(eq(ebayFeedbackHistory.userId, userId))
    .orderBy(desc(ebayFeedbackHistory.feedbackDate));
  return feedback as any;
}

export async function flagLowFeedback(input: {
  userId: number;
  feedbackScore: number;
  feedbackPercentage: number;
  flaggedReason?: string;
}): Promise<void> {
  const db = await requireDb();
  // Check if already flagged
  const existing = await db
    .select()
    .from(lowFeedbackFlags)
    .where(and(
      eq(lowFeedbackFlags.userId, input.userId),
      eq(lowFeedbackFlags.status, 'pending')
    ))
    .limit(1);
  
  if (!existing[0]) {
    await db.insert(lowFeedbackFlags).values({
      userId: input.userId,
      feedbackScore: input.feedbackScore,
      feedbackPercentage: input.feedbackPercentage.toString(),
      flaggedReason: input.flaggedReason,
    });
  }
}

export async function getLowFeedbackFlags(): Promise<Array<{
  id: number;
  userId: number;
  feedbackScore: number;
  feedbackPercentage: string;
  status: string;
  flaggedAt: Date;
}>> {
  const db = await requireDb();
  const flags = await db
    .select()
    .from(lowFeedbackFlags)
    .where(eq(lowFeedbackFlags.status, 'pending'))
    .orderBy(desc(lowFeedbackFlags.flaggedAt));
  return flags as any;
}


// ─── Facebook OAuth Functions ────────────────────────────────────────────────
export async function updateUserFacebookInfo(input: {
  userId: number;
  facebookId: string;
  facebookName: string;
  facebookVerified: boolean;
  facebookAccessToken: string;
}): Promise<void> {
  const db = await requireDb();
  await db
    .update(users)
    .set({
      facebookId: input.facebookId,
      facebookName: input.facebookName,
      facebookVerified: input.facebookVerified ? 1 : 0,
      facebookConnectedAt: mysqlNow(),
      facebookAccessToken: input.facebookAccessToken,
    })
    .where(eq(users.id, input.userId));
}

export async function getUserFacebookInfo(userId: number): Promise<{
  facebookId: string | null;
  facebookName: string | null;
  facebookVerified: boolean;
  facebookConnectedAt: Date | null;
  facebookEmail: string | null;
  facebookPicture: string | null;
  facebookLocation: string | null;
  facebookLink: string | null;
  facebookLikes: Array<{ id: string; name: string }> | null;
} | null> {
  const db = await requireDb();
  const result = await db
    .select({
      facebookId: users.facebookId,
      facebookName: users.facebookName,
      facebookVerified: users.facebookVerified,
      facebookConnectedAt: users.facebookConnectedAt,
      facebookEmail: users.facebookEmail,
      facebookPicture: users.facebookPicture,
      facebookLocation: users.facebookLocation,
      facebookLink: users.facebookLink,
      facebookLikes: users.facebookLikes,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!result[0]) return null;
  let parsedLikes: Array<{ id: string; name: string }> | null = null;
  if (result[0].facebookLikes) {
    try {
      parsedLikes = typeof result[0].facebookLikes === 'string'
        ? JSON.parse(result[0].facebookLikes)
        : result[0].facebookLikes as Array<{ id: string; name: string }>;
    } catch { parsedLikes = null; }
  }
  return {
    facebookId: result[0].facebookId ?? null,
    facebookName: result[0].facebookName ?? null,
    facebookVerified: result[0].facebookVerified === 1,
    facebookConnectedAt: result[0].facebookConnectedAt ? new Date(result[0].facebookConnectedAt) : null,
    facebookEmail: result[0].facebookEmail ?? null,
    facebookPicture: result[0].facebookPicture ?? null,
    facebookLocation: result[0].facebookLocation ?? null,
    facebookLink: result[0].facebookLink ?? null,
    facebookLikes: parsedLikes,
  };
}

export async function getUserLinkedInInfo(userId: number): Promise<{
  linkedinId: string | null;
  linkedinName: string | null;
  linkedinEmail: string | null;
  linkedinPicture: string | null;
  linkedinHeadline: string | null;
  linkedinProfileUrl: string | null;
  linkedinConnectedAt: Date | null;
} | null> {
  const db = await requireDb();
  const result = await db
    .select({
      linkedinId: users.linkedinId,
      linkedinName: users.linkedinName,
      linkedinEmail: users.linkedinEmail,
      linkedinPicture: users.linkedinPicture,
      linkedinHeadline: users.linkedinHeadline,
      linkedinProfileUrl: users.linkedinProfileUrl,
      linkedinConnectedAt: users.linkedinConnectedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!result[0]) return null;
  return {
    linkedinId: result[0].linkedinId ?? null,
    linkedinName: result[0].linkedinName ?? null,
    linkedinEmail: result[0].linkedinEmail ?? null,
    linkedinPicture: result[0].linkedinPicture ?? null,
    linkedinHeadline: result[0].linkedinHeadline ?? null,
    linkedinProfileUrl: result[0].linkedinProfileUrl ?? null,
    linkedinConnectedAt: result[0].linkedinConnectedAt ? new Date(result[0].linkedinConnectedAt) : null,
  };
}

// Item Inquiry Functions
export async function sendItemInquiry(
  user: Pick<User, "id" | "name">,
  input: {
    listingId: number;
    recipientId: number;
    subject: string;
    message: string;
  }
) {
  const db = await requireDb();
  
  // Validate inputs
  if (!input.subject.trim() || input.subject.length > 255) {
    throw new Error("Subject must be between 1 and 255 characters");
  }
  if (!input.message.trim() || input.message.length > 5000) {
    throw new Error("Message must be between 1 and 5000 characters");
  }
  
  // Bind inquiries to the actual listing owner instead of trusting a caller-supplied recipient.
  const listing = await db
    .select({ id: listings.id, ownerId: listings.ownerId })
    .from(listings)
    .where(eq(listings.id, input.listingId))
    .limit(1);
  
  if (!listing[0]) {
    throw new Error("Listing not found");
  }
  if (listing[0].ownerId !== input.recipientId) {
    throw new Error("Item inquiries must be sent to the listing owner");
  }
  
  // Insert inquiry
  const result = await db.insert(itemInquiries).values({
    listingId: input.listingId,
    senderId: user.id,
    recipientId: input.recipientId,
    subject: input.subject.trim(),
    message: input.message.trim(),
    isRead: 0,
    senderIsRead: 1,
    recipientIsRead: 0,
    createdAt: mysqlNow(),
  });
  
  return { id: getInsertId(result), success: true };
}

export async function getUnreadInquiries(userId: number) {
  const db = await requireDb();
  
  const inquiries = await db
    .select()
    .from(itemInquiries)
    .where(getInquiryUnreadCondition(userId))
    .orderBy(desc(itemInquiries.createdAt));
  
  return inquiries;
}

export async function getInquiriesByUser(userId: number, limit: number = 50, offset: number = 0) {
  const db = await requireDb();
  
  const inquiries = await db
    .select({
      id: itemInquiries.id,
      senderId: itemInquiries.senderId,
      senderName: users.displayName,
      senderProfileDisplayName: userProfiles.displayName,
      senderAccountName: users.name,
      senderUsername: users.username,
      senderAvatarUrl: users.avatarUrl,
      recipientId: itemInquiries.recipientId,
          listingId: itemInquiries.listingId,
          subject: itemInquiries.subject,
          message: itemInquiries.message,
          isRead: itemInquiries.isRead,
          senderIsRead: itemInquiries.senderIsRead,
          recipientIsRead: itemInquiries.recipientIsRead,
          createdAt: itemInquiries.createdAt,
      updatedAt: itemInquiries.updatedAt,
      deletedAt: itemInquiries.deletedAt,
    })
    .from(itemInquiries)
    .innerJoin(users, eq(itemInquiries.senderId, users.id))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(
      and(
        or(
          eq(itemInquiries.recipientId, userId),
          eq(itemInquiries.senderId, userId)
        ),
        isNull(itemInquiries.deletedAt)
      )
    )
    .orderBy(desc(itemInquiries.createdAt))
    .limit(limit)
    .offset(offset);
  
  // Fetch recipient info for each inquiry
  const inquiriesWithRecipients = await Promise.all(
    inquiries.map(async (inquiry) => {
      const recipient = await db
        .select({ avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, inquiry.recipientId))
        .limit(1);
      return {
        ...inquiry,
        senderName: resolveDirectMessageDisplayName(
          inquiry.senderProfileDisplayName,
          inquiry.senderUsername || inquiry.senderName || inquiry.senderAccountName,
          inquiry.senderId,
        ),
        isRead: isInquiryReadForUser(inquiry, userId) ? 1 : 0,
        recipientName: await getCommunicationDisplayName(inquiry.recipientId),
        recipientAvatarUrl: recipient[0]?.avatarUrl ?? null,
      };
    })
  );
  
  return inquiriesWithRecipients;
}

export async function markInquiryAsRead(inquiryId: number, userId: number) {
  const db = await requireDb();
  
  // Verify the user is either the sender or recipient
  const inquiry = await db
    .select({ senderId: itemInquiries.senderId, recipientId: itemInquiries.recipientId })
    .from(itemInquiries)
    .where(eq(itemInquiries.id, inquiryId))
    .limit(1);
  
  if (!inquiry[0] || (inquiry[0].senderId !== userId && inquiry[0].recipientId !== userId)) {
    throw new Error("Unauthorized: You can only mark inquiries you're involved in as read");
  }
  
  const participantReadState = inquiry[0].senderId === userId
    ? { senderIsRead: 1 }
    : { recipientIsRead: 1, isRead: 1 };

  await db
    .update(itemInquiries)
    .set(participantReadState)
    .where(eq(itemInquiries.id, inquiryId));
  
  return { success: true };
}

export async function sendInquiryReply(inquiryId: number, senderId: number, message: string) {
  const db = await requireDb();
  
  // Verify the inquiry exists and the sender is the recipient
  const inquiry = await db
    .select({ recipientId: itemInquiries.recipientId, senderId: itemInquiries.senderId })
    .from(itemInquiries)
    .where(eq(itemInquiries.id, inquiryId))
    .limit(1);
  
  if (!inquiry[0] || inquiry[0].recipientId !== senderId) {
    throw new Error("Unauthorized: You can only reply to inquiries sent to you");
  }
  
  // The recipient of the reply is the original sender of the inquiry
  const replyRecipient = inquiry[0].senderId;
  
  await db
    .insert(inquiryReplies)
    .values({
      inquiryId,
      senderId,
      recipientId: replyRecipient,
      message,
    });
  
  // Mark the reply recipient (the original inquiry sender) unread without
  // creating an unread alert for the person who sent this reply.
  await db
    .update(itemInquiries)
    .set(getInquiryReplyReadState())
    .where(eq(itemInquiries.id, inquiryId));
  
  // Fetch the newly created reply to get the ID
  const newReply = await db
    .select()
    .from(inquiryReplies)
    .where(and(eq(inquiryReplies.inquiryId, inquiryId), eq(inquiryReplies.senderId, senderId)))
    .orderBy(desc(inquiryReplies.createdAt))
    .limit(1);
  
  // Fetch the sender's display name and avatar
  const sender = await db
    .select({ avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, senderId))
    .limit(1);
  const senderName = await getCommunicationDisplayName(senderId);
  
  if (!newReply[0]) {
    return {
      id: 0,
      inquiryId,
      senderId,
      senderName,
      senderAvatarUrl: sender[0]?.avatarUrl || null,
      message,
      createdAt: new Date(),
    };
  }
  
  return {
    ...newReply[0],
    senderName,
    senderAvatarUrl: sender[0]?.avatarUrl || null,
  };
}

export async function getRepliesByInquiry(inquiryId: number, userId: number) {
  const db = await requireDb();

  const inquiry = await db
    .select({ senderId: itemInquiries.senderId, recipientId: itemInquiries.recipientId })
    .from(itemInquiries)
    .where(eq(itemInquiries.id, inquiryId))
    .limit(1);

  if (!inquiry[0] || (inquiry[0].senderId !== userId && inquiry[0].recipientId !== userId)) {
    throw new Error("Unauthorized: You can only view replies to inquiries you're involved in");
  }
  
  const replies = await db
    .select({
      id: inquiryReplies.id,
      inquiryId: inquiryReplies.inquiryId,
      senderId: inquiryReplies.senderId,
      senderName: users.displayName,
      senderProfileDisplayName: userProfiles.displayName,
      senderUsername: users.username,
      senderAccountName: users.name,
      senderAvatarUrl: users.avatarUrl,
      message: inquiryReplies.message,
      createdAt: inquiryReplies.createdAt,
    })
    .from(inquiryReplies)
    .innerJoin(users, eq(inquiryReplies.senderId, users.id))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(inquiryReplies.inquiryId, inquiryId))
    .orderBy(asc(inquiryReplies.createdAt));

  return replies.map(reply => ({
    ...reply,
    senderName: resolveDirectMessageDisplayName(
      reply.senderProfileDisplayName,
      reply.senderUsername || reply.senderName || reply.senderAccountName,
      reply.senderId,
    ),
  }));
}

export async function deleteInquiry(inquiryId: number, userId: number) {
  const db = await requireDb();
  
  // Verify the user is either the sender or recipient of the inquiry
  const inquiry = await db
    .select({ senderId: itemInquiries.senderId, recipientId: itemInquiries.recipientId })
    .from(itemInquiries)
    .where(eq(itemInquiries.id, inquiryId))
    .limit(1);
  
  if (!inquiry[0] || (inquiry[0].senderId !== userId && inquiry[0].recipientId !== userId)) {
    throw new Error("Unauthorized: You can only delete inquiries you're involved in");
  }
  
  await db
    .update(itemInquiries)
    .set({ deletedAt: mysqlNow() })
    .where(eq(itemInquiries.id, inquiryId));
}

export async function getDeletedInquiries(userId: number) {
  const db = await requireDb();
  
  const inquiries = await db
    .select({
      id: itemInquiries.id,
      senderId: itemInquiries.senderId,
      recipientId: itemInquiries.recipientId,
      senderName: users.displayName,
      senderProfileDisplayName: userProfiles.displayName,
      senderUsername: users.username,
      senderAvatarUrl: users.avatarUrl,
      listingId: itemInquiries.listingId,
      subject: itemInquiries.subject,
      message: itemInquiries.message,
      isRead: itemInquiries.isRead,
      createdAt: itemInquiries.createdAt,
      deletedAt: itemInquiries.deletedAt,
    })
    .from(itemInquiries)
    .innerJoin(users, eq(itemInquiries.senderId, users.id))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(and(
      or(
        eq(itemInquiries.recipientId, userId),
        eq(itemInquiries.senderId, userId)
      ),
      isNotNull(itemInquiries.deletedAt)
    ))
    .orderBy(desc(itemInquiries.deletedAt));
  
  return Promise.all(inquiries.map(async inquiry => ({
    ...inquiry,
    senderName: resolveDirectMessageDisplayName(
      inquiry.senderProfileDisplayName,
      inquiry.senderUsername || inquiry.senderName,
      inquiry.senderId,
    ),
    recipientName: await getCommunicationDisplayName(inquiry.recipientId),
  })));
}

export async function emptyDeletedInquiries(userId: number) {
  const db = await requireDb();
  
  // Delete all deleted inquiries for this user
  await db
    .delete(itemInquiries)
    .where(and(
      or(
        eq(itemInquiries.recipientId, userId),
        eq(itemInquiries.senderId, userId)
      ),
      isNotNull(itemInquiries.deletedAt)
    ));
}


// Referral Requests
export async function createReferralRequest(data: {
  referrerId: number;
  referrerEmail: string;
  referrerFirstName: string;
  referrerLastName: string;
  collectorName: string;
  collectorEmail: string;
  collectorFocus: string;
  isMerchant: boolean;
  message: string;
}) {
  const db = await requireDb();
  
  // Check if a pending referral already exists for this email
  const existingRequest = await db
    .select()
    .from(referralRequests)
    .where(
      and(
        eq(referralRequests.collectorEmail, data.collectorEmail),
        eq(referralRequests.status, "pending")
      )
    )
    .limit(1);
  
  if (existingRequest.length > 0) {
    // Return existing request instead of creating a duplicate
    return existingRequest[0];
  }
  
  const result = await db.insert(referralRequests).values({
    ...data,
    isMerchant: data.isMerchant ? 1 : 0,
  });
  return result;
}

export async function getAllReferralRequests() {
  const db = await requireDb();
  const requests = await db
    .select({
      id: referralRequests.id,
      referrerId: referralRequests.referrerId,
      referrerName: sql<string>`CONCAT(${referralRequests.referrerFirstName}, ' ', ${referralRequests.referrerLastName})`,
      referrerEmail: referralRequests.referrerEmail,
      referrerFirstName: referralRequests.referrerFirstName,
      referrerLastName: referralRequests.referrerLastName,
      collectorName: referralRequests.collectorName,
      collectorEmail: referralRequests.collectorEmail,
      collectorFocus: referralRequests.collectorFocus,
      isMerchant: referralRequests.isMerchant,
      message: referralRequests.message,
      status: referralRequests.status,
      adminNotes: referralRequests.adminNotes,
      createdAt: referralRequests.createdAt,
      reviewedAt: referralRequests.reviewedAt,
      reviewedBy: referralRequests.reviewedBy,
      emailSent: referralRequests.emailSent,
      emailSentAt: referralRequests.emailSentAt,
      hasJoined: referralRequests.hasJoined,
      joinedAt: referralRequests.joinedAt,
    })
    .from(referralRequests)
    .orderBy(desc(referralRequests.createdAt));
  return requests;
}

export async function updateReferralRequestStatus(id: number, status: string, adminNotes?: string, reviewedBy?: number) {
  const db = await requireDb();
  await db
    .update(referralRequests)
    .set({
      status: status as any,
      adminNotes,
      reviewedBy,
      reviewedAt: mysqlNow(),
    })
    .where(eq(referralRequests.id, id));
}


export async function getUnsentReferrals() {
  const db = await requireDb();
  const requests = await db
    .select()
    .from(referralRequests)
    .where(and(eq(referralRequests.emailSent, 0), eq(referralRequests.hasJoined, 0)))
    .orderBy(asc(referralRequests.createdAt));
  return requests;
}

export async function markReferralsAsEmailed(ids: number[]) {
  const db = await requireDb();
  if (ids.length === 0) return;
  await db
    .update(referralRequests)
    .set({
      emailSent: 1,
      emailSentAt: mysqlNow(),
    })
    .where(inArray(referralRequests.id, ids));
}

export async function markReferralAsJoined(id: number, userId: number) {
  const db = await requireDb();
  await db
    .update(referralRequests)
    .set({
      hasJoined: 1,
      joinedAt: mysqlNow(),
      joinedUserId: userId,
    })
    .where(eq(referralRequests.id, id));
}

export async function removeReferral(id: number) {
  const db = await requireDb();
  await db.delete(referralRequests).where(eq(referralRequests.id, id));
}

export async function getReferralsByIds(ids: number[]) {
  const db = await requireDb();
  if (ids.length === 0) return [];
  const requests = await db
    .select({
      id: referralRequests.id,
      collectorName: referralRequests.collectorName,
      collectorEmail: referralRequests.collectorEmail,
      collectorFocus: referralRequests.collectorFocus,
      message: referralRequests.message,
      emailSent: referralRequests.emailSent,
      hasJoined: referralRequests.hasJoined,
    })
    .from(referralRequests)
    .where(inArray(referralRequests.id, ids));
  return requests;
}


export async function getTopHighestValueItems(viewerId: number | null = null) {
  const db = await requireDb();

  // Fetch top 10 items sorted by estimated value (highest first)
  const listingRows = await db
    .select({
      id: listings.id,
      ownerId: listings.ownerId,
      title: listings.title,
      category: listings.category,
      condition: listings.condition,
      grade: listings.grade,
      certificationCompany: listings.certificationCompany,
      estimatedValue: listings.estimatedValue,
      description: listings.description,
      status: listings.status,
      featured: listings.featured,
      isActive: listings.isActive,
      createdAt: listings.createdAt,
      updatedAt: listings.updatedAt,
      primaryPhotoUrl: listingPhotos.imageUrl,
    })
    .from(listings)
    .leftJoin(listingPhotos, and(
      eq(listings.id, listingPhotos.listingId),
      eq(listingPhotos.sortOrder, 0)
    ))
    .where(eq(listings.status, "active"))
    .orderBy(desc(listings.estimatedValue))
    .limit(10);

  return formatListings(listingRows, viewerId);
}


// Track item view
export async function trackListingView(listingId: number) {
  const db = await requireDb();
  await db.update(listings).set({
    viewCount: sql`${listings.viewCount} + 1`,
  }).where(eq(listings.id, listingId));
}

// Add item to favorites
export async function addToFavorites(userId: number, listingId: number) {
  const db = await requireDb();
  try {
    await db.insert(favorites).values({
      userId,
      listingId,
    });
    return true;
  } catch (error) {
    return false;
  }
}

// Remove item from favorites
export async function removeFromFavorites(userId: number, listingId: number) {
  const db = await requireDb();
  const result = await db.delete(favorites).where(
    and(eq(favorites.userId, userId), eq(favorites.listingId, listingId))
  );
  // Drizzle returns an array with result info
  return Array.isArray(result) && result.length > 0;
}

// Check if item is favorited by user
export async function isFavorited(userId: number, listingId: number) {
  const db = await requireDb();
  const result = await db.select().from(favorites).where(
    and(eq(favorites.userId, userId), eq(favorites.listingId, listingId))
  ).limit(1);
  return result.length > 0;
}

// Get top 10 most favorited items
export async function getTopMostFavoritedItems(viewerId?: number | null) {
  const db = await requireDb();
  
  const listingRows = await db.select({
    id: listings.id,
    ownerId: listings.ownerId,
    title: listings.title,
    category: listings.category,
    condition: listings.condition,
    grade: listings.grade,
    certificationCompany: listings.certificationCompany,
    estimatedValue: listings.estimatedValue,
    description: listings.description,
    itemDetails: listings.itemDetails,
    status: listings.status,
    isActive: listings.isActive,
    featured: listings.featured,
    viewCount: listings.viewCount,
    createdAt: listings.createdAt,
    updatedAt: listings.updatedAt,
    primaryPhotoUrl: listingPhotos.imageUrl,
    favoriteCount: sql<number>`COUNT(${favorites.id})`.as('favoriteCount'),
  })
  .from(listings)
  .leftJoin(listingPhotos, and(
    eq(listings.id, listingPhotos.listingId),
    eq(listingPhotos.sortOrder, 0)
  ))
  .leftJoin(favorites, eq(listings.id, favorites.listingId))
  .where(eq(listings.status, "active"))
  .groupBy(
    listings.id,
    listings.ownerId,
    listings.title,
    listings.category,
    listings.condition,
    listings.grade,
    listings.certificationCompany,
    listings.estimatedValue,
    listings.description,
    listings.itemDetails,
    listings.status,
    listings.isActive,
    listings.featured,
    listings.viewCount,
    listings.createdAt,
    listings.updatedAt,
    listingPhotos.imageUrl
  )
  .having(sql`COUNT(${favorites.id}) > 0`)
  .orderBy(desc(sql`COUNT(${favorites.id})`))
  .limit(10);

  return formatListings(listingRows, viewerId ?? null);
}

// Get top 10 most viewed items
export async function getTopMostViewedItems(viewerId?: number | null) {
  const db = await requireDb();
  
  const listingRows = await db.select({
    id: listings.id,
    ownerId: listings.ownerId,
    title: listings.title,
    category: listings.category,
    condition: listings.condition,
    grade: listings.grade,
    certificationCompany: listings.certificationCompany,
    estimatedValue: listings.estimatedValue,
    description: listings.description,
    itemDetails: listings.itemDetails,
    status: listings.status,
    isActive: listings.isActive,
    featured: listings.featured,
    viewCount: listings.viewCount,
    createdAt: listings.createdAt,
    updatedAt: listings.updatedAt,
    primaryPhotoUrl: listingPhotos.imageUrl,
    favoriteCount: sql<number>`COUNT(${favorites.id})`.as('favoriteCount'),
  })
  .from(listings)
  .leftJoin(listingPhotos, and(
    eq(listings.id, listingPhotos.listingId),
    eq(listingPhotos.sortOrder, 0)
  ))
  .leftJoin(favorites, eq(listings.id, favorites.listingId))
  .where(eq(listings.status, "active"))
  .groupBy(
    listings.id,
    listings.ownerId,
    listings.title,
    listings.category,
    listings.condition,
    listings.grade,
    listings.certificationCompany,
    listings.estimatedValue,
    listings.description,
    listings.itemDetails,
    listings.status,
    listings.isActive,
    listings.featured,
    listings.viewCount,
    listings.createdAt,
    listings.updatedAt,
    listingPhotos.imageUrl
  )
  .orderBy(desc(listings.viewCount))
  .limit(10);

  return formatListings(listingRows, viewerId ?? null);
}


// Admin delete functions
export async function adminDeleteListing(
  admin: Pick<User, "id" | "name">,
  input: {
    listingId: number;
    deletionReason?: string;
  },
) {
  const db = await requireDb();

  // Verify admin role
  const adminUser = await db.select().from(users).where(eq(users.id, admin.id)).limit(1);
  if (!adminUser[0] || adminUser[0].role !== 'admin') {
    throw new Error("Only admins can delete listings.");
  }

  // Get listing details
  const listing = await db
    .select({ id: listings.id, ownerId: listings.ownerId, title: listings.title })
    .from(listings)
    .where(eq(listings.id, input.listingId))
    .limit(1);

  if (!listing[0]) {
    throw new Error("Listing not found.");
  }

    // Delete all related records atomically. This 7-step cascade previously ran
  // as separate statements; any mid-sequence failure orphaned rows (e.g. a
  // deleted listing whose proposals/watchlist entries survived).
  await db.transaction(async tx => {
    // 1. Trade proposal items that reference this listing
    await tx.delete(tradeProposalItems).where(eq(tradeProposalItems.offeredListingId, input.listingId));
    // 2. Trade proposals that reference this listing
    await tx.delete(tradeProposals).where(eq(tradeProposals.requestedListingId, input.listingId));
    // 3. Watchlist entries
    await tx.delete(watchlistEntries).where(eq(watchlistEntries.listingId, input.listingId));
    // 4. Item inquiries and their replies
    const inquiryIds = await tx.select({ id: itemInquiries.id }).from(itemInquiries).where(eq(itemInquiries.listingId, input.listingId));
    if (inquiryIds.length > 0) {
      const ids = inquiryIds.map(i => i.id);
      await tx.delete(inquiryReplies).where(inArray(inquiryReplies.inquiryId, ids));
    }
    await tx.delete(itemInquiries).where(eq(itemInquiries.listingId, input.listingId));
    // 5. Favorites
    await tx.delete(favorites).where(eq(favorites.listingId, input.listingId));
    // 6. Photos
    await tx.delete(listingPhotos).where(eq(listingPhotos.listingId, input.listingId));
    // 7. The listing itself
    await tx.delete(listings).where(eq(listings.id, input.listingId));
  });

  return {
    success: true,
    deletedListingId: input.listingId,
    listingTitle: listing[0].title,
    ownerId: listing[0].ownerId,
  };
}

export async function adminBulkDeleteListings(
  admin: Pick<User, "id" | "name">,
  input: {
    listingIds: number[];
    deletionReason?: string;
  },
) {
  const db = await requireDb();

  // Verify admin role
  const adminUser = await db.select().from(users).where(eq(users.id, admin.id)).limit(1);
  if (!adminUser[0] || adminUser[0].role !== 'admin') {
    throw new Error("Only admins can delete listings.");
  }

  if (input.listingIds.length === 0) {
    throw new Error("No listings selected for deletion.");
  }

  // Get listing details
  const listings_to_delete = await db
    .select({ id: listings.id, title: listings.title, ownerId: listings.ownerId })
    .from(listings)
    .where(inArray(listings.id, input.listingIds));

  if (listings_to_delete.length === 0) {
    throw new Error("No listings found.");
  }

    // Delete all related records atomically (see adminDeleteListing for why).
  await db.transaction(async tx => {
    // 1. Trade proposal items that reference these listings
    await tx.delete(tradeProposalItems).where(inArray(tradeProposalItems.offeredListingId, input.listingIds));
    // 2. Trade proposals that reference these listings
    await tx.delete(tradeProposals).where(inArray(tradeProposals.requestedListingId, input.listingIds));
    // 3. Watchlist entries
    await tx.delete(watchlistEntries).where(inArray(watchlistEntries.listingId, input.listingIds));
    // 4. Item inquiries and their replies
    const inquiryIds = await tx.select({ id: itemInquiries.id }).from(itemInquiries).where(inArray(itemInquiries.listingId, input.listingIds));
    if (inquiryIds.length > 0) {
      const ids = inquiryIds.map(i => i.id);
      await tx.delete(inquiryReplies).where(inArray(inquiryReplies.inquiryId, ids));
    }
    await tx.delete(itemInquiries).where(inArray(itemInquiries.listingId, input.listingIds));
    // 5. Favorites
    await tx.delete(favorites).where(inArray(favorites.listingId, input.listingIds));
    // 6. Photos
    await tx.delete(listingPhotos).where(inArray(listingPhotos.listingId, input.listingIds));
    // 7. The listings themselves
    await tx.delete(listings).where(inArray(listings.id, input.listingIds));
  });

  return {
    success: true,
    deletedCount: listings_to_delete.length,
    deletedListings: listings_to_delete,
  };
}


export async function deleteDraftsOlderThan(db: any, cutoffDate: Date): Promise<number> {
  // Get all drafts older than cutoff date
  const { draftListings, listingPhotos } = await import("../drizzle/schema");
  const { lt } = await import("drizzle-orm");
  
  const oldDrafts = await db.select({ id: draftListings.id })
    .from(draftListings)
    .where(lt(draftListings.createdAt, toMysqlDateTime(cutoffDate)));

  if (oldDrafts.length === 0) {
    return 0;
  }

  const draftIds = oldDrafts.map((d: any) => d.id);

  // Delete photos associated with these drafts
  await db.delete(listingPhotos)
    .where(inArray(listingPhotos.listingId, draftIds));

  // Delete the drafts
  await db.delete(draftListings)
    .where(inArray(draftListings.id, draftIds));

  return draftIds.length;
}


// Forum functions
export async function createForumPost(
  user: Pick<User, "id" | "name">,
  input: {
    category: string;
    title: string;
    content: string;
  }
) {
  const db = await requireDb();
  const { forumPosts } = await import("../drizzle/schema");

  const result = await db.insert(forumPosts).values({
    userId: user.id,
    category: input.category,
    title: input.title.trim().slice(0, 255),
    content: input.content.trim(),
  });

  return { postId: getInsertId(result) };
}

export async function getForumPosts(category?: string, sortBy: "newest" | "popular" | "replies" = "newest") {
  const db = await requireDb();
  const { forumPosts, users } = await import("../drizzle/schema");
  const { eq, desc } = await import("drizzle-orm");

  const baseQuery = db
    .select({
      id: forumPosts.id,
      userId: forumPosts.userId,
      category: forumPosts.category,
      title: forumPosts.title,
      content: forumPosts.content,
      isPinned: forumPosts.isPinned,
      isLocked: forumPosts.isLocked,
      isSolved: forumPosts.isSolved,
      viewCount: forumPosts.viewCount,
      replyCount: forumPosts.replyCount,
      createdAt: forumPosts.createdAt,
      updatedAt: forumPosts.updatedAt,
      author: {
        id: users.id,
        name: users.displayName,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(forumPosts)
    .leftJoin(users, eq(forumPosts.userId, users.id));

  if (category) {
    if (sortBy === "newest") {
      return baseQuery.where(eq(forumPosts.category, category)).orderBy(desc(forumPosts.isPinned), desc(forumPosts.createdAt));
    } else if (sortBy === "popular") {
      return baseQuery.where(eq(forumPosts.category, category)).orderBy(desc(forumPosts.isPinned), desc(forumPosts.viewCount));
    } else {
      return baseQuery.where(eq(forumPosts.category, category)).orderBy(desc(forumPosts.isPinned), desc(forumPosts.replyCount));
    }
  } else {
    if (sortBy === "newest") {
      return baseQuery.orderBy(desc(forumPosts.isPinned), desc(forumPosts.createdAt));
    } else if (sortBy === "popular") {
      return baseQuery.orderBy(desc(forumPosts.isPinned), desc(forumPosts.viewCount));
    } else {
      return baseQuery.orderBy(desc(forumPosts.isPinned), desc(forumPosts.replyCount));
    }
  }
}

export async function getForumPostById(postId: number) {
  const db = await requireDb();
  const { forumPosts, users } = await import("../drizzle/schema");
  const { eq, sql } = await import("drizzle-orm");

  // Increment view count
  await db.update(forumPosts).set({ viewCount: sql`viewCount + 1` }).where(eq(forumPosts.id, postId));

  const result = await db
    .select({
      id: forumPosts.id,
      userId: forumPosts.userId,
      category: forumPosts.category,
      title: forumPosts.title,
      content: forumPosts.content,
      isPinned: forumPosts.isPinned,
      isLocked: forumPosts.isLocked,
      isSolved: forumPosts.isSolved,
      viewCount: forumPosts.viewCount,
      replyCount: forumPosts.replyCount,
      createdAt: forumPosts.createdAt,
      updatedAt: forumPosts.updatedAt,
      author: {
        id: users.id,
        name: users.displayName,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(forumPosts)
    .leftJoin(users, eq(forumPosts.userId, users.id))
    .where(eq(forumPosts.id, postId))
    .limit(1);

  return result[0] || null;
}

export async function addForumReply(
  user: Pick<User, "id" | "name">,
  input: {
    postId: number;
    content: string;
  }
) {
  const db = await requireDb();
  const { forumReplies, forumPosts } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  const post = await db
    .select({ isLocked: forumPosts.isLocked })
    .from(forumPosts)
    .where(eq(forumPosts.id, input.postId))
    .limit(1);
  if (!post[0]) throw new Error("Forum post not found.");
  if (post[0].isLocked) throw new Error("This discussion is locked.");

  const result = await db.insert(forumReplies).values({
    postId: input.postId,
    userId: user.id,
    content: input.content.trim(),
  });

  // Increment reply count
  const { sql } = await import("drizzle-orm");
  await db.update(forumPosts).set({ replyCount: sql`replyCount + 1` }).where(eq(forumPosts.id, input.postId));

  return { replyId: getInsertId(result) };
}

export async function getForumReplies(postId: number) {
  const db = await requireDb();
  const { forumReplies, users } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  return db
    .select({
      id: forumReplies.id,
      postId: forumReplies.postId,
      userId: forumReplies.userId,
      content: forumReplies.content,
      createdAt: forumReplies.createdAt,
      updatedAt: forumReplies.updatedAt,
      author: {
        id: users.id,
        name: users.displayName,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(forumReplies)
    .leftJoin(users, eq(forumReplies.userId, users.id))
    .where(eq(forumReplies.postId, postId))
    .orderBy(asc(forumReplies.createdAt));
}

// ============================================================================
// CONVENTIONS
// ============================================================================

export async function getConventions(filters: {
  category?: string;
  country?: string;
  state?: string;
}) {
  const db = await requireDb();
  const { conventions, conventionCategories } = await import("../drizzle/schema");
  const { eq, and, gte, asc, inArray, sql } = await import("drizzle-orm");

  const today = new Date().toISOString().split("T")[0];

  // Base filters on the conventions table
  const baseClauses: any[] = [
    eq(conventions.status, "approved"),
    gte(conventions.startDate, today),
  ];
  if (filters.country) baseClauses.push(eq(conventions.country, filters.country));
  if (filters.state) baseClauses.push(eq(conventions.state, filters.state));

  let conventionIds: number[] | null = null;

  // If a specific category is selected, find convention IDs that have that category
  if (filters.category && filters.category !== "all") {
    const catRows = await db
      .select({ conventionId: conventionCategories.conventionId })
      .from(conventionCategories)
      .where(eq(conventionCategories.category, filters.category as any));
    conventionIds = catRows.map(r => r.conventionId);
    if (conventionIds.length === 0) return []; // No matches
    baseClauses.push(inArray(conventions.id, conventionIds));
  }

  const rows = await db
    .select({
      id: conventions.id,
      name: conventions.name,
      category: conventions.category,
      startDate: conventions.startDate,
      endDate: conventions.endDate,
      city: conventions.city,
      state: conventions.state,
      country: conventions.country,
      venue: conventions.venue,
      website: conventions.website,
      admission: conventions.admission,
      description: conventions.description,
      source: conventions.source,
      createdAt: conventions.createdAt,
    })
    .from(conventions)
    .where(and(...baseClauses))
    .orderBy(asc(conventions.startDate))
    .limit(500);

  // Attach all categories for each convention from the junction table
  if (rows.length > 0) {
    const ids = rows.map(r => r.id);
    const catRows = await db
      .select({ conventionId: conventionCategories.conventionId, category: conventionCategories.category })
      .from(conventionCategories)
      .where(inArray(conventionCategories.conventionId, ids));
    const catMap = new Map<number, string[]>();
    for (const cr of catRows) {
      if (!catMap.has(cr.conventionId)) catMap.set(cr.conventionId, []);
      catMap.get(cr.conventionId)!.push(cr.category);
    }
    return rows.map(r => ({ ...r, categories: catMap.get(r.id) || [r.category] }));
  }

  return rows.map(r => ({ ...r, categories: [r.category] }));
}

export async function getUpcomingConventions(limit = 3, userLocation?: { state?: string | null; country?: string | null }) {
  const db = await requireDb();
  const { conventions } = await import("../drizzle/schema");
  const { eq, gte, asc, and } = await import("drizzle-orm");

  const today = new Date().toISOString().split("T")[0];

  const baseWhere = and(eq(conventions.status, "approved"), gte(conventions.startDate, today));

  // If user has a state, try to find conventions in their state first
  if (userLocation?.state) {
    const stateMatches = await db
      .select({
        id: conventions.id,
        name: conventions.name,
        category: conventions.category,
        startDate: conventions.startDate,
        endDate: conventions.endDate,
        city: conventions.city,
        state: conventions.state,
        country: conventions.country,
      })
      .from(conventions)
      .where(and(baseWhere, eq(conventions.state, userLocation.state)))
      .orderBy(asc(conventions.startDate))
      .limit(limit);

    if (stateMatches.length >= limit) return stateMatches;

    // Not enough in state — fill remainder with same country
    const stateIds = stateMatches.map(r => r.id);
    const { notInArray } = await import("drizzle-orm");
    const countryMatches = await db
      .select({
        id: conventions.id,
        name: conventions.name,
        category: conventions.category,
        startDate: conventions.startDate,
        endDate: conventions.endDate,
        city: conventions.city,
        state: conventions.state,
        country: conventions.country,
      })
      .from(conventions)
      .where(and(
        baseWhere,
        eq(conventions.country, userLocation.country || "United States"),
        stateIds.length > 0 ? notInArray(conventions.id, stateIds) : undefined as any,
      ))
      .orderBy(asc(conventions.startDate))
      .limit(limit - stateMatches.length);

    return [...stateMatches, ...countryMatches].slice(0, limit);
  }

  // If user has only a country (no state), filter by country
  if (userLocation?.country) {
    return db
      .select({
        id: conventions.id,
        name: conventions.name,
        category: conventions.category,
        startDate: conventions.startDate,
        endDate: conventions.endDate,
        city: conventions.city,
        state: conventions.state,
        country: conventions.country,
      })
      .from(conventions)
      .where(and(baseWhere, eq(conventions.country, userLocation.country)))
      .orderBy(asc(conventions.startDate))
      .limit(limit);
  }

  // No location — return empty (caller decides what to show)
  return [];
}

export async function submitConvention(data: {
  name: string;
  category: string;
  categories?: string[]; // multi-category support
  startDate: string;
  endDate?: string;
  city?: string;
  state?: string;
  country: string;
  venue?: string;
  website?: string;
  admission?: string;
  description?: string;
  submittedBy?: number;
}) {
  const db = await requireDb();
  const { conventions, conventionCategories } = await import("../drizzle/schema");

  const result = await db.insert(conventions).values({
    name: data.name,
    category: data.category as any,
    startDate: data.startDate,
    endDate: data.endDate ?? null,
    city: data.city ?? null,
    state: data.state ?? null,
    country: data.country,
    venue: data.venue ?? null,
    website: data.website ?? null,
    admission: data.admission ?? null,
    description: data.description ?? null,
    source: "user",
    status: "pending",
    submittedBy: data.submittedBy ?? null,
  });

  const newId = Number(result[0].insertId);

  // Write categories to junction table
  const categoriesToInsert = data.categories && data.categories.length > 0
    ? data.categories
    : [data.category];
  for (const cat of categoriesToInsert) {
    try {
      await db.insert(conventionCategories).values({ conventionId: newId, category: cat as any });
    } catch {}
  }

  return { id: newId };
}

export async function getPendingConventions() {
  const db = await requireDb();
  const { conventions, users } = await import("../drizzle/schema");
  const { eq, desc } = await import("drizzle-orm");

  return db
    .select({
      id: conventions.id,
      name: conventions.name,
      category: conventions.category,
      startDate: conventions.startDate,
      endDate: conventions.endDate,
      city: conventions.city,
      state: conventions.state,
      country: conventions.country,
      venue: conventions.venue,
      website: conventions.website,
      admission: conventions.admission,
      description: conventions.description,
      source: conventions.source,
      status: conventions.status,
      createdAt: conventions.createdAt,
      submittedByName: users.displayName,
    })
    .from(conventions)
    .leftJoin(users, eq(conventions.submittedBy, users.id))
    .where(eq(conventions.status, "pending"))
    .orderBy(desc(conventions.createdAt));
}

export async function approveConvention(id: number, adminId: number) {
  const db = await requireDb();
  const { conventions, conventionCategories } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  await db.update(conventions).set({ status: "approved", approvedBy: adminId }).where(eq(conventions.id, id));

  // Ensure junction table entry exists for this convention
  const [conv] = await db.select({ category: conventions.category }).from(conventions).where(eq(conventions.id, id));
  if (conv) {
    try {
      await db.insert(conventionCategories).values({ conventionId: id, category: conv.category as any });
    } catch {} // Ignore if already exists
  }

  return { success: true };
}

export async function rejectConvention(id: number, adminId: number) {
  const db = await requireDb();
  const { conventions } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  await db.update(conventions).set({ status: "rejected", approvedBy: adminId }).where(eq(conventions.id, id));
  return { success: true };
}

export async function deleteConvention(id: number) {
  const db = await requireDb();
  const { conventions } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  await db.delete(conventions).where(eq(conventions.id, id));
  return { success: true };
}

export async function suspendUser(userId: number) {
  const db = await requireDb();
  await db.update(users).set({ 
    isSuspended: 1, 
    suspendedAt: mysqlNow() 
  }).where(eq(users.id, userId));
  return { success: true };
}

export async function unsuspendUser(userId: number) {
  const db = await requireDb();
  await db.update(users).set({ 
    isSuspended: 0, 
    suspendedAt: null 
  }).where(eq(users.id, userId));
  return { success: true };
}

export async function getSuspendedUsers() {
  const db = await requireDb();
  const suspendedUsers = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      email: users.email,
      suspendedAt: users.suspendedAt,
      role: users.role,
    })
    .from(users)
    .where(eq(users.isSuspended, 1))
    .orderBy(desc(users.suspendedAt));
  
  return suspendedUsers;
}
