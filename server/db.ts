import { z } from "zod";
import { and, asc, desc, eq, inArray, like, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import type { InsertUser, User } from "../drizzle/schema";
import {
  collectibleCategories,
  draftListings,
  itemConditions,
  listingPhotos,
  listings,
  tradeMessages,
  tradeProposalItems,
  tradeProposals,
  tradeReviews,
  userProfiles,
  users,
  watchlistEntries,
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

async function requireDb() {
  if (!_db) {
    _db = drizzle(ENV.databaseUrl);
  }
  return _db;
}

function getInsertId(result: any) {
  return Number(result.insertId ?? 0);
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
  const buffer = Buffer.from(input.contentBase64, "base64");
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const fileKey = `${folder}/${userId}/${timestamp}-${randomId}-${input.name}`;
  const { url } = await storagePut(fileKey, buffer, input.type);
  return { key: fileKey, url };
}

async function getProfileMap(userIds: number[]) {
  if (userIds.length === 0) return new Map();
  const db = await requireDb();
  const profiles = await db
    .select({
      userId: userProfiles.userId,
      displayName: userProfiles.displayName,
      avatarUrl: userProfiles.avatarUrl,
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

  const ownerIds = [...new Set(listingRows.map(r => r.ownerId))];
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
      avatarUrl: profileMap.get(row.ownerId)?.avatarUrl ?? null,
    },
    ownerRating: ratingMap.get(row.ownerId) ?? { averageRating: 0, reviewCount: 0 },
    primaryPhotoUrl: row.primaryPhotoUrl ?? null,
    savedToWatchlist: savedListingIds.has(row.id),
  }));
}

export async function getMarketplaceFeed(
  filters: {
    category?: (typeof collectibleCategories)[number];
    condition?: (typeof itemConditions)[number];
    keyword?: string;
  },
  viewerId: number | null,
) {
  const db = await requireDb();

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

  const whereClauses = [eq(listings.status, "active")];
  if (filters.category && filters.category !== "all") {
    whereClauses.push(eq(listings.category, filters.category));
  }
  if (filters.condition && filters.condition !== "all") {
    whereClauses.push(eq(listings.condition, filters.condition));
  }
  const keyword = filters.keyword?.trim();
  if (keyword) {
    whereClauses.push(like(listings.title, `%${keyword}%`));
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

  // Get total unique collectors (users with at least one active listing)
  const totalCollectorsResult = await db
    .select({ value: sql<number>`count(distinct ownerId)` })
    .from(listings)
    .where(eq(listings.status, "active"));

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

  const listingIds = [
    ...new Set([
      ...proposalRows.map(p => p.requestedListingId).filter(Boolean),
    ]),
  ] as number[];

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
      listingId,
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

    const listingIds = proposalItems.map(item => item.listingId);
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

  return { success: true };
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

  return members.map(m => ({
    userId: m.userId,
    displayName: m.displayName,
    avatarUrl: m.avatarUrl,
    bio: m.bio,
    region: m.contactAddress,
    rating: ratingMap.get(m.userId) ?? { averageRating: 0, reviewCount: 0 },
  }));
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

  const listings_to_update = await db
    .select({ id: listings.id, ownerId: listings.ownerId })
    .from(listings)
    .where(inArray(listings.id, input.listingIds));

  for (const listing of listings_to_update) {
    if (listing.ownerId !== user.id) {
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
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(tradeMessages)
    .where(
      and(
        eq(tradeMessages.senderId, userId),
        sql`1=0`, // Placeholder: would need a read status column
      ),
    );

  return { count: Number(result[0]?.count ?? 0) };
}

export async function saveDraft(
  user: Pick<User, "id" | "name">,
  input: {
    title: string;
    category: (typeof collectibleCategories)[number];
    condition: (typeof itemConditions)[number];
    description: string;
    photos: PhotoUploadInput[];
  },
) {
  const db = await requireDb();
  await ensureUserProfileRecord(user);

  const insertResult = await db.insert(draftListings).values({
    userId: user.id,
    title: input.title.trim(),
    category: input.category,
    condition: input.condition,
    description: input.description.trim(),
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
      condition: draftListings.condition,
      description: draftListings.description,
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
    condition: d.condition,
    description: d.description,
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

export async function getDashboardData(user: Pick<User, "id" | "name">) {
  const db = await requireDb();
  await ensureUserProfileRecord(user);

  const [profileRows, ownListingRows, watchlistRows, receivedReviews, proposalCards, ratingMapData] = await Promise.all([
    db
      .select({
        displayName: userProfiles.displayName,
        avatarUrl: userProfiles.avatarUrl,
        bio: userProfiles.bio,
        contactFullName: userProfiles.contactFullName,
        contactEmail: userProfiles.contactEmail,
        contactPhone: userProfiles.contactPhone,
        contactAddress: userProfiles.contactAddress,
      })
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.id))
      .limit(1),
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
    getProposalCards(user.id),
    getProposalCards(user.id),
    getRatingStatsMap([user.id]),
  ]);

  const ownListings = await formatListings(ownListingRows, user.id);
  const savedListingIds = watchlistRows.map(row => row.listingId);
  const savedListingRows = savedListingIds.length
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
        .where(inArray(listings.id, savedListingIds))
        .orderBy(desc(listings.createdAt))
    : [];

  const reviewProfileMap = await getProfileMap(receivedReviews.map(row => row.reviewerId));
  const watchlist = await formatListings(savedListingRows, user.id);
  const rating = ratingMapData.get(user.id) ?? { averageRating: 0, reviewCount: 0 };

  return {
    profile: {
      displayName: profileRows[0]?.displayName ?? user.name ?? `Collector ${user.id}`,
      avatarUrl: profileRows[0]?.avatarUrl ?? null,
      bio: profileRows[0]?.bio ?? "Open to thoughtful, collector-to-collector trades.",
      contactFullName: profileRows[0]?.contactFullName ?? user.name ?? "",
      contactEmail: profileRows[0]?.contactEmail ?? "",
      contactPhone: profileRows[0]?.contactPhone ?? "",
      contactAddress: profileRows[0]?.contactAddress ?? "",
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
  };

  if (input.avatar) {
    const uploaded = await uploadImage("avatars", user.id, input.avatar);
    updateSet.avatarKey = uploaded.key;
    updateSet.avatarUrl = uploaded.url;
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

  await db.update(userProfiles).set(updateSet).where(eq(userProfiles.userId, user.id));
  return getDashboardData(user);
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


export async function upsertUser(input: {
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: Date;
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
export async function createPasswordResetToken(userId: string, token: string, expiresAt: Date) {
  const db = requireDb();
  return db.insert(passwordResetTokens).values({
    userId,
    token,
    expiresAt,
  });
}

export async function getPasswordResetToken(token: string) {
  const db = requireDb();
  const result = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token)).limit(1);
  return result[0] || null;
}

export async function deletePasswordResetToken(token: string) {
  const db = requireDb();
  return db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  const db = requireDb();
  return db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}


// OTP Verification Functions
export async function createEmailOtp(email: string, otp: string, expiresAt: Date) {
  const db = requireDb();
  // Delete existing OTPs for this email
  await db.delete(emailVerificationOtps).where(eq(emailVerificationOtps.email, email));
  return db.insert(emailVerificationOtps).values({
    email,
    otp,
    expiresAt,
  });
}

export async function createPhoneOtp(phone: string, otp: string, expiresAt: Date) {
  const db = requireDb();
  // Delete existing OTPs for this phone
  await db.delete(phoneVerificationOtps).where(eq(phoneVerificationOtps.phone, phone));
  return db.insert(phoneVerificationOtps).values({
    phone,
    otp,
    expiresAt,
  });
}

export async function getEmailOtp(email: string) {
  const db = requireDb();
  const result = await db.select().from(emailVerificationOtps).where(eq(emailVerificationOtps.email, email)).limit(1);
  return result[0] || null;
}

export async function getPhoneOtp(phone: string) {
  const db = requireDb();
  const result = await db.select().from(phoneVerificationOtps).where(eq(phoneVerificationOtps.phone, phone)).limit(1);
  return result[0] || null;
}

export async function deleteEmailOtp(email: string) {
  const db = requireDb();
  return db.delete(emailVerificationOtps).where(eq(emailVerificationOtps.email, email));
}

export async function deletePhoneOtp(phone: string) {
  const db = requireDb();
  return db.delete(phoneVerificationOtps).where(eq(phoneVerificationOtps.phone, phone));
}

export async function incrementEmailOtpAttempts(email: string) {
  const db = requireDb();
  return db.update(emailVerificationOtps).set({ attempts: sql`attempts + 1` }).where(eq(emailVerificationOtps.email, email));
}

export async function incrementPhoneOtpAttempts(phone: string) {
  const db = requireDb();
  return db.update(phoneVerificationOtps).set({ attempts: sql`attempts + 1` }).where(eq(phoneVerificationOtps.phone, phone));
}
