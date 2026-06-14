import { z } from "zod";
import { and, asc, desc, eq, gte, inArray, isNotNull, like, lte, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import type { InsertUser, User } from "../drizzle/schema";
import {
  collectibleCategories,
  itemConditions,
  gradeValues,
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

let _db: ReturnType<typeof drizzle> | null = null;

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

const conditionLabels: Record<(typeof itemConditions)[number], string> = {
  mint: "Mint",
  near_mint: "Near Mint",
  very_good: "Very Good",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

type PhotoUploadInput = {
  name: string;
  type: string;
  contentBase64: string;
};

type AvatarUploadInput = {
  name: string;
  type: string;
  contentBase64: string;
};

export async function requireDb(): Promise<ReturnType<typeof drizzle>> {
  if (!_db) {
    const url = new URL(ENV.databaseUrl);
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
        _db = drizzle(ENV.databaseUrl);
      }
    } else {
      _db = drizzle(ENV.databaseUrl);
    }
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
    const buffer = Buffer.from(input.contentBase64, "base64");
    console.log(`[uploadImage] Starting upload: name=${input.name}, size=${buffer.length} bytes, type=${input.type}`);
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileKey = `${folder}-${userId}-${timestamp}-${randomId}-${input.name}`;
    console.log(`[uploadImage] File key: ${fileKey}`);
    
    // Save to local filesystem instead of S3 to work around CloudFront issues
    const fs = await import("fs/promises");
    const path = await import("path");
    const publicDir = path.resolve(process.cwd(), "client/public/images");
    
    // Ensure directory exists
    await fs.mkdir(publicDir, { recursive: true });
    
    // Save file locally
    const filePath = path.join(publicDir, fileKey);
    await fs.writeFile(filePath, buffer);
    console.log(`[uploadImage] File saved locally to: ${filePath}`);
    
    // Return URL pointing to local file
    const url = `/images/${fileKey}`;
    console.log(`[uploadImage] Upload successful, URL: ${url}`);
    return { key: fileKey, url };
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
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    owner: {
      displayName: profileMap.get(row.ownerId)?.displayName ?? `Collector ${row.ownerId}`,
      firstName: profileMap.get(row.ownerId)?.firstName ?? null,
      lastName: profileMap.get(row.ownerId)?.lastName ?? null,
      avatarUrl: profileMap.get(row.ownerId)?.avatarUrl ?? null,
    },
    ownerRating: ratingMap.get(row.ownerId) ?? { averageRating: 0, reviewCount: 0 },
    primaryPhotoUrl: row.primaryPhotoUrl ?? null,
    photos: row.primaryPhotoUrl ? [row.primaryPhotoUrl] : [],
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
  },
  viewerId: number | null,
) {
  const db = await requireDb();

  // Build where clauses for filtering
  const whereClauses = [eq(listings.status, "active"), eq(listings.isActive, true)];
  if (filters.category) {
    whereClauses.push(eq(listings.category, filters.category));
  }
  if (filters.condition) {
    whereClauses.push(eq(listings.condition, filters.condition));
  }
  const keyword = filters.keyword?.trim();
  if (keyword) {
    // Search across multiple fields including itemDetails JSON
    const searchCondition = or(
      like(listings.title, `%${keyword}%`),
      like(listings.description, `%${keyword}%`),
      like(listings.certificationCompany, `%${keyword}%`),
      sql`${listings.itemDetails} LIKE ${`%${keyword}%`}`
    );
    // Only add the condition if it's not undefined
    if (searchCondition !== undefined) {
      whereClauses.push(searchCondition as any);
    }
  }
  // Add filter conditions for category-specific fields stored in itemDetails JSON
  if (filters.issueNumber?.trim()) {
    whereClauses.push(sql`JSON_CONTAINS(${listings.itemDetails}, JSON_OBJECT('issueNumber', ${filters.issueNumber}))`);
  }
  if (filters.manufacturer?.trim()) {
    whereClauses.push(sql`JSON_CONTAINS(${listings.itemDetails}, JSON_OBJECT('manufacturer', ${filters.manufacturer}))`);
  }
  if (filters.year?.trim()) {
    whereClauses.push(sql`JSON_CONTAINS(${listings.itemDetails}, JSON_OBJECT('year', ${filters.year}))`);
  }
  if (filters.team?.trim()) {
    whereClauses.push(sql`JSON_CONTAINS(${listings.itemDetails}, JSON_OBJECT('team', ${filters.team}))`);
  }
  if (filters.series?.trim()) {
    whereClauses.push(sql`JSON_CONTAINS(${listings.itemDetails}, JSON_OBJECT('set', ${filters.series}))`);
  }
  if (filters.sport?.trim()) {
    whereClauses.push(sql`JSON_CONTAINS(${listings.itemDetails}, JSON_OBJECT('sport', ${filters.sport}))`);
  }
  if (filters.rookie?.trim() && filters.rookie !== "All") {
    whereClauses.push(sql`JSON_CONTAINS(${listings.itemDetails}, JSON_OBJECT('rookie', ${filters.rookie}))`);
  }
  if (filters.autographed?.trim() && filters.autographed !== "All") {
    whereClauses.push(sql`JSON_CONTAINS(${listings.itemDetails}, JSON_OBJECT('autographed', ${filters.autographed}))`);
  }
  if (filters.signed?.trim() && filters.signed !== "All") {
    whereClauses.push(sql`JSON_CONTAINS(${listings.itemDetails}, JSON_OBJECT('signed', ${filters.signed}))`);
  }
  if (filters.facsimile?.trim() && filters.facsimile !== "All") {
    whereClauses.push(sql`JSON_CONTAINS(${listings.itemDetails}, JSON_OBJECT('facsimile', ${filters.facsimile}))`);
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
      primaryPhotoUrl: sql<string | null>`(
        select imageUrl from listingPhotos where listingId = listings.id order by sortOrder asc limit 1
      )`,
    })
    .from(listings)
    .where(and(...whereClauses))
    .orderBy(desc(listings.createdAt))
    .limit(100);

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
      listings: [],
    };
  }

  const statsRows = await Promise.all([
    db.select({ value: sql<number>`count(*)` }).from(listings).where(and(...whereClauses)),
    db
      .select({ value: sql<number>`count(distinct ${listings.ownerId})` })
      .from(listings)
      .where(and(...whereClauses)),
    db.select({ value: sql<number>`count(*)` }).from(tradeProposals).where(eq(tradeProposals.status, "completed")),
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
    listings: await formatListings(listingRows, viewerId),
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
    respondedAt: p.respondedAt?.getTime() ?? null,
    completedAt: p.completedAt?.getTime() ?? null,
    createdAt: p.createdAt.getTime(),
    updatedAt: p.respondedAt?.getTime() ?? p.createdAt.getTime(),
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
      createdAt: msg.createdAt.getTime(),
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
      condition: listings.condition,
      grade: listings.grade,
      certificationCompany: listings.certificationCompany,
      estimatedValue: listings.estimatedValue,
      description: listings.description,
      itemDetails: listings.itemDetails,
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

  const similarRows = await db
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
    .where(and(eq(listings.category, detailCard[0].category), ne(listings.id, listingId), eq(listings.status, "active")))
    .orderBy(desc(listings.createdAt))
    .limit(6);

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
    condition: detailCard[0].condition,
    grade: detailCard[0].grade,
    certificationCompany: detailCard[0].certificationCompany,
    estimatedValue: detailCard[0].estimatedValue ? Number(detailCard[0].estimatedValue) : null,
    description: detailCard[0].description,
    itemDetails: detailCard[0].itemDetails ? JSON.parse(detailCard[0].itemDetails) : null,
    status: detailCard[0].status,
    featured: detailCard[0].featured,
    isActive: detailCard[0].isActive,
    createdAt: detailCard[0].createdAt.getTime(),
    updatedAt: detailCard[0].updatedAt.getTime(),
    ownerProfile: {
      displayName: ownerProfileRows[0]?.displayName ?? `Collector ${detailCard[0].ownerId}`,
      bio: ownerProfileRows[0]?.bio ?? "Open to thoughtful, collector-to-collector trades.",
      avatarUrl: ownerProfileRows[0]?.avatarUrl ?? null,
    },
    ownerRating,
    photos: photoRows.map(p => ({
      imageUrl: p.imageUrl,
      altText: p.altText,
    })),
    primaryPhotoUrl: photoRows.length > 0 ? photoRows[0].imageUrl : null,
    similarListings: await formatListings(similarRows, viewerId),
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

  // Delete existing items
  await db.delete(tradeProposalItems).where(eq(tradeProposalItems.proposalId, input.proposalId));

  // Insert new items
  for (const listingId of input.selectedListingIds) {
    const listing = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing[0]) {
      throw new Error(`Listing ${listingId} not found.`);
    }

    if (listing[0].ownerId !== user.id) {
      throw new Error(`You don't own listing ${listingId}.`);
    }

    await db.insert(tradeProposalItems).values({
      proposalId: input.proposalId,
      offeredListingId: listingId,
    });
  }

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

  await db
    .update(tradeProposals)
    .set({
      status: newStatus,
      respondedAt: new Date(),
    })
    .where(eq(tradeProposals.id, input.proposalId));

  if (input.response === "accepted") {
    // Mark both listings as traded
    const proposalItems = await db
      .select()
      .from(tradeProposalItems)
      .where(eq(tradeProposalItems.proposalId, input.proposalId));

    const listingIds = proposalItems.map(item => item.offeredListingId);
    listingIds.push(proposal[0].requestedListingId);

    await db
      .update(listings)
      .set({ status: "traded" })
      .where(inArray(listings.id, listingIds));
  }

  return { success: true };
}

export async function toggleWatchlist(userId: number, listingId: number) {
  const db = await requireDb();

  const existing = await db
    .select()
    .from(watchlistEntries)
    .where(and(eq(watchlistEntries.userId, userId), eq(watchlistEntries.listingId, listingId)))
    .limit(1);

  const isSaved = !existing[0];
  
  if (existing[0]) {
    await db
      .delete(watchlistEntries)
      .where(and(eq(watchlistEntries.userId, userId), eq(watchlistEntries.listingId, listingId)));
  } else {
    await db.insert(watchlistEntries).values({
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
  verification?: "all" | "verified" | "established" | "rising";
}) {
  const db = await requireDb();

  const whereClauses: any[] = [];

  if (input.query?.trim()) {
    whereClauses.push(like(userProfiles.displayName, `%${input.query.trim()}%`));
  }

  if (input.region?.trim()) {
    whereClauses.push(like(userProfiles.contactAddress, `%${input.region.trim()}%`));
  }

  const members = await db
    .select({
      userId: userProfiles.userId,
      displayName: userProfiles.displayName,
      avatarUrl: userProfiles.avatarUrl,
      bio: userProfiles.bio,
      contactAddress: userProfiles.contactAddress,
    })
    .from(userProfiles)
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
    return {
      userId: m.userId,
      displayName: m.displayName,
      avatarUrl: m.avatarUrl,
      bio: m.bio,
      region: m.contactAddress,
      regionLabel: m.contactAddress ?? "Unknown",
      rating,
      averageRating: rating.averageRating,
      reviewCount: rating.reviewCount,
      listingCount: listingCountMap.get(m.userId) ?? 0,
      completedTradeCount: completedTradesMap.get(m.userId) ?? 0,
      topCategories: topCategoriesMap.get(m.userId) ?? [],
      verificationLevel: "Verified",
      online: false,
    };
  });

  // Return object with members and rankings
  const topRated = formattedMembers.sort((a, b) => (b.rating?.averageRating ?? 0) - (a.rating?.averageRating ?? 0)).slice(0, 10);
  const mostActive = formattedMembers.sort((a, b) => (b.listingCount + b.completedTradeCount) - (a.listingCount + a.completedTradeCount)).slice(0, 10);
  const uniqueRegions = Array.from(new Set(formattedMembers.map(m => m.region).filter(Boolean)));
  
  return {
    members: formattedMembers,
    rankings: { topRated, mostActive },
    topRated: topRated,
    mostActive: mostActive,
    regions: uniqueRegions,
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
    .set({ isActive: input.isActive })
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
    .set({ isActive: input.isActive })
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

  // Delete associated photos first (foreign key constraint)
  await db.delete(listingPhotos).where(inArray(listingPhotos.listingId, input.listingIds));

  // Then delete the listings
  await db.delete(listings).where(inArray(listings.id, input.listingIds));

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
    .set({ isActive: true })
    .where(inArray(listings.id, input.listingIds));

  return getDashboardData(user);
}

export async function getUnreadNotificationCount(userId: number) {
  // Placeholder for notification system
  return { count: 0 };
}

export async function getUnreadMessageCount(userId: number) {
  const db = await requireDb();
  
  // Count unread inquiries (received by this user)
  const inquiryResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(itemInquiries)
    .where(
      and(
        eq(itemInquiries.recipientId, userId),
        eq(itemInquiries.isRead, false),
      ),
    );

  const inquiryCount = Number(inquiryResult[0]?.count ?? 0);
  
  return { count: inquiryCount };
}

export async function saveDraft(
  user: Pick<User, "id" | "name">,
  input: {
    title: string;
    category: (typeof collectibleCategories)[number];
    condition: (typeof itemConditions)[number];
    description: string;
    grade?: (typeof gradeValues)[number];
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
    grade: (input.grade as (typeof gradeValues)[number]) || "ungraded",
    graderCompany: input.graderCompany || null,
    certificationNumber: input.certificationNumber || null,
    estimatedValue: input.estimatedValue ? String(input.estimatedValue) : null,
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
    photos: photoMap.get(d.id) ?? [],
    createdAt: d.createdAt.getTime(),
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

  await db.delete(draftListings).where(eq(draftListings.id, input.draftId));
  await db.delete(listingPhotos).where(eq(listingPhotos.listingId, input.draftId));

  return { success: true };
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
        createdAt: review.createdAt.getTime(),
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
    contactFullName: input.contactFullName?.trim() ? input.contactFullName.trim().slice(0, 160) : null,
    contactEmail: input.contactEmail?.trim() ? input.contactEmail.trim().slice(0, 320) : null,
    contactPhone: input.contactPhone?.trim() ? input.contactPhone.trim().slice(0, 40) : null,
    contactAddress: input.contactAddress?.trim() ? input.contactAddress.trim().slice(0, 320) : null,
    contactTown: input.contactTown?.trim() ? input.contactTown.trim().slice(0, 100) : null,
    contactState: input.contactState?.trim() ? input.contactState.trim().slice(0, 100) : null,
    contactZipCode: input.contactZipCode?.trim() ? input.contactZipCode.trim().slice(0, 20) : null,
    contactCountry: input.contactCountry?.trim() ? input.contactCountry.trim().slice(0, 100) : null,
  };

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
  if (input.securityQuestion !== undefined) {
    updateSet.securityQuestion = input.securityQuestion?.trim() ? input.securityQuestion.trim().slice(0, 255) : null;
  }
  if (input.securityAnswer !== undefined) {
    updateSet.securityAnswer = input.securityAnswer?.trim() ? input.securityAnswer.trim().slice(0, 255) : null;
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
    condition: (typeof itemConditions)[number];
    description: string;
    estimatedValue?: number;
    photos: PhotoUploadInput[];
    itemDetails?: Record<string, string>;
    certificationCompany?: string;
    grade?: string;
  },
) {
  const db = await requireDb();
  await ensureUserProfileRecord(user);

  const insertResult = await db.insert(listings).values({
    ownerId: user.id,
    title: input.title.trim(),
    category: input.category,
    condition: input.condition,
    description: input.description.trim(),
    estimatedValue: input.estimatedValue ? String(input.estimatedValue) : null,
    itemDetails: input.itemDetails ? JSON.stringify(input.itemDetails) : null,
    certificationCompany: input.certificationCompany || undefined,
    grade: (input.grade || undefined) as any,
    featured: false,
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

  // Update listing
  await db
    .update(listings)
    .set({
      title: input.title.trim(),
      category: input.category,
      condition: input.condition,
      description: input.description.trim(),
      estimatedValue: input.estimatedValue ? String(input.estimatedValue) : null,
      itemDetails: input.itemDetails ? JSON.stringify(input.itemDetails) : null,
    })
    .where(eq(listings.id, input.listingId));

  // Only update photos if new ones are provided
  if (input.photos.length > 0) {
    // Get existing photos to preserve them
    const existingPhotos = await db
      .select()
      .from(listingPhotos)
      .where(eq(listingPhotos.listingId, input.listingId))
      .orderBy(asc(listingPhotos.sortOrder));

    // Upload new photos and add them after existing ones
    for (let index = 0; index < input.photos.length; index += 1) {
      const photo = input.photos[index]!;
      const uploaded = await uploadImage("listings", user.id, photo);
      const newSortOrder = existingPhotos.length + index;
      await db.insert(listingPhotos).values({
        listingId: input.listingId,
        fileKey: uploaded.key,
        imageUrl: uploaded.url,
        altText: `${input.title.trim()} photo ${newSortOrder + 1}`,
        sortOrder: newSortOrder,
      });
    }
  }
  // If no new photos provided, keep existing photos

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
        lastSignedIn: input.lastSignedIn,
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
      lastSignedIn: input.lastSignedIn,
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
  const result = await db.insert(users).values({
    username: input.username,
    passwordHash: input.passwordHash,
    displayName: input.displayName,
    email: input.email || null,
    loginMethod: "custom",
  });
  return getInsertId(result);
}


// Password Recovery Functions
export async function createPasswordResetToken(userId: number, token: string, expiresAt: Date) {
  const db = await requireDb();
  return db.insert(passwordResetTokens).values({
    userId,
    token,
    expiresAt,
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
    expiresAt,
  });
}

export async function createPhoneOtp(phone: string, otp: string, expiresAt: Date) {
  const db = await requireDb();
  // Delete existing OTPs for this phone
  await db.delete(phoneVerificationOtps).where(eq(phoneVerificationOtps.phone, phone));
  return db.insert(phoneVerificationOtps).values({
    phone,
    otp,
    expiresAt,
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
    createdAt: report[0].createdAt,
    updatedAt: report[0].updatedAt,
    reviewedAt: report[0].reviewedAt ?? undefined,
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
      reviewedAt: new Date(),
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
      ebayMemberSince: input.ebayMemberSince,
      ebayConnectedAt: new Date(),
      ebayAccessToken: input.ebayAccessToken,
      ebayRefreshToken: input.ebayRefreshToken,
      ebayTokenExpiresAt: input.ebayTokenExpiresAt,
    })
    .where(eq(users.id, input.userId));
}

export async function getUserEbayInfo(userId: number): Promise<{
  ebayUsername?: string | null;
  ebayUserId?: string | null;
  ebayFeedbackScore?: number | null;
  ebayFeedbackPercentage?: number | null;
  ebayMemberSince?: Date | null;
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
      ebayConnectedAt: users.ebayConnectedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  if (!user[0]) return null;
  
  return {
    ...user[0],
    ebayFeedbackPercentage: user[0].ebayFeedbackPercentage ? parseFloat(user[0].ebayFeedbackPercentage) : null,
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
  await db.insert(ebayFeedbackHistory).values(input);
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
  
  // Verify listing exists
  const listing = await db
    .select({ id: listings.id })
    .from(listings)
    .where(eq(listings.id, input.listingId))
    .limit(1);
  
  if (!listing[0]) {
    throw new Error("Listing not found");
  }
  
  // Verify recipient exists
  const recipient = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, input.recipientId))
    .limit(1);
  
  if (!recipient[0]) {
    throw new Error("Recipient not found");
  }
  
  // Insert inquiry
  const result = await db.insert(itemInquiries).values({
    listingId: input.listingId,
    senderId: user.id,
    recipientId: input.recipientId,
    subject: input.subject.trim(),
    message: input.message.trim(),
    isRead: false,
    createdAt: new Date(),
  });
  
  return { id: getInsertId(result), success: true };
}

export async function getUnreadInquiries(userId: number) {
  const db = await requireDb();
  
  const inquiries = await db
    .select()
    .from(itemInquiries)
    .where(
      and(
        eq(itemInquiries.recipientId, userId),
        eq(itemInquiries.isRead, false)
      )
    )
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
      senderAvatarUrl: users.avatarUrl,
      recipientId: itemInquiries.recipientId,
      listingId: itemInquiries.listingId,
      subject: itemInquiries.subject,
      message: itemInquiries.message,
      isRead: itemInquiries.isRead,
      createdAt: itemInquiries.createdAt,
      updatedAt: itemInquiries.updatedAt,
      deletedAt: itemInquiries.deletedAt,
    })
    .from(itemInquiries)
    .innerJoin(users, eq(itemInquiries.senderId, users.id))
    .where(
      or(
        eq(itemInquiries.recipientId, userId),
        eq(itemInquiries.senderId, userId)
      )
    )
    .orderBy(desc(itemInquiries.createdAt))
    .limit(limit)
    .offset(offset);
  
  return inquiries;
}

export async function markInquiryAsRead(inquiryId: number, userId: number) {
  const db = await requireDb();
  
  // Verify the user is the recipient
  const inquiry = await db
    .select({ recipientId: itemInquiries.recipientId })
    .from(itemInquiries)
    .where(eq(itemInquiries.id, inquiryId))
    .limit(1);
  
  if (!inquiry[0] || inquiry[0].recipientId !== userId) {
    throw new Error("Unauthorized: You can only mark your own inquiries as read");
  }
  
  await db
    .update(itemInquiries)
    .set({ isRead: true })
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
  
  // Mark the original inquiry as unread so it shows up in the recipient's inbox
  await db
    .update(itemInquiries)
    .set({ isRead: false })
    .where(eq(itemInquiries.id, inquiryId));
  
  // Fetch the newly created reply to get the ID
  const newReply = await db
    .select()
    .from(inquiryReplies)
    .where(and(eq(inquiryReplies.inquiryId, inquiryId), eq(inquiryReplies.senderId, senderId)))
    .orderBy(desc(inquiryReplies.createdAt))
    .limit(1);
  
  return newReply[0] || { id: 0, inquiryId, senderId, message, createdAt: new Date(), updatedAt: new Date() };
}

export async function getRepliesByInquiry(inquiryId: number) {
  const db = await requireDb();
  
  const replies = await db
    .select({
      id: inquiryReplies.id,
      inquiryId: inquiryReplies.inquiryId,
      senderId: inquiryReplies.senderId,
      senderName: users.displayName,
      senderAvatarUrl: users.avatarUrl,
      message: inquiryReplies.message,
      createdAt: inquiryReplies.createdAt,
    })
    .from(inquiryReplies)
    .innerJoin(users, eq(inquiryReplies.senderId, users.id))
    .where(eq(inquiryReplies.inquiryId, inquiryId))
    .orderBy(asc(inquiryReplies.createdAt));
  
  return replies;
}

export async function deleteInquiry(inquiryId: number, userId: number) {
  const db = await requireDb();
  
  // Verify the user is the recipient of the inquiry
  const inquiry = await db
    .select({ recipientId: itemInquiries.recipientId })
    .from(itemInquiries)
    .where(eq(itemInquiries.id, inquiryId))
    .limit(1);
  
  if (!inquiry[0] || inquiry[0].recipientId !== userId) {
    throw new Error("Unauthorized: You can only delete your own inquiries");
  }
  
  await db
    .update(itemInquiries)
    .set({ deletedAt: new Date() })
    .where(eq(itemInquiries.id, inquiryId));
}

export async function getDeletedInquiries(userId: number) {
  const db = await requireDb();
  
  const inquiries = await db
    .select({
      id: itemInquiries.id,
      senderId: itemInquiries.senderId,
      senderName: users.displayName,
      senderAvatarUrl: users.avatarUrl,
      subject: itemInquiries.subject,
      message: itemInquiries.message,
      isRead: itemInquiries.isRead,
      createdAt: itemInquiries.createdAt,
      deletedAt: itemInquiries.deletedAt,
    })
    .from(itemInquiries)
    .innerJoin(users, eq(itemInquiries.senderId, users.id))
    .where(and(eq(itemInquiries.recipientId, userId), isNotNull(itemInquiries.deletedAt)))
    .orderBy(desc(itemInquiries.deletedAt));
  
  return inquiries;
}

export async function emptyDeletedInquiries(userId: number) {
  const db = await requireDb();
  
  // Delete all deleted inquiries for this user
  await db
    .delete(itemInquiries)
    .where(and(eq(itemInquiries.recipientId, userId), isNotNull(itemInquiries.deletedAt)));
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
  const result = await db.insert(referralRequests).values(data);
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
      reviewedAt: new Date(),
    })
    .where(eq(referralRequests.id, id));
}


export async function getUnsentReferrals() {
  const db = await requireDb();
  const requests = await db
    .select()
    .from(referralRequests)
    .where(and(eq(referralRequests.emailSent, false), eq(referralRequests.hasJoined, false)))
    .orderBy(asc(referralRequests.createdAt));
  return requests;
}

export async function markReferralsAsEmailed(ids: number[]) {
  const db = await requireDb();
  if (ids.length === 0) return;
  await db
    .update(referralRequests)
    .set({
      emailSent: true,
      emailSentAt: new Date(),
    })
    .where(inArray(referralRequests.id, ids));
}

export async function markReferralAsJoined(id: number, userId: number) {
  const db = await requireDb();
  await db
    .update(referralRequests)
    .set({
      hasJoined: true,
      joinedAt: new Date(),
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
