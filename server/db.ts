import { Buffer } from "node:buffer";
import { and, asc, desc, eq, inArray, like, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import type { InsertUser, User } from "../drizzle/schema";
import {
  collectibleCategories,
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

type AvatarUploadInput = PhotoUploadInput;

export type ListingFilters = {
  category?: (typeof collectibleCategories)[number] | "all";
  condition?: (typeof itemConditions)[number] | "all";
  keyword?: string;
};

function getInsertId(result: unknown): number {
  if (Array.isArray(result) && result[0] && typeof result[0] === "object" && "insertId" in result[0]) {
    return Number((result[0] as { insertId: number }).insertId);
  }
  if (result && typeof result === "object" && "insertId" in result) {
    return Number((result as { insertId: number }).insertId);
  }
  throw new Error("Unable to determine inserted row id.");
}

async function requireDb() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available.");
  }
  return db;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

async function ensureUserProfileRecord(user: Pick<User, "id" | "name">) {
  const db = await requireDb();
  const displayName = (user.name ?? `Collector ${user.id}`).slice(0, 120);

  await db
    .insert(userProfiles)
    .values({
      userId: user.id,
      displayName,
      bio: "Open to thoughtful, collector-to-collector trades.",
    })
    .onDuplicateKeyUpdate({
      set: {
        displayName: sql`coalesce(${userProfiles.displayName}, ${displayName})`,
      },
    });
}

async function uploadImage(prefix: string, userId: number, file: PhotoUploadInput | AvatarUploadInput) {
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const cleanExtension = extension?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
  const { key, url } = await storagePut(
    `${prefix}/user-${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${cleanExtension}`,
    Buffer.from(file.contentBase64, "base64"),
    file.type || "image/jpeg",
  );
  return { key, url };
}

async function getProfileMap(userIds: number[]) {
  if (userIds.length === 0) return new Map<number, { userId: number; displayName: string; avatarUrl: string | null }>();
  const db = await requireDb();

  const rows = await db
    .select({
      userId: users.id,
      fallbackName: users.name,
      displayName: userProfiles.displayName,
      avatarUrl: userProfiles.avatarUrl,
    })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(inArray(users.id, Array.from(new Set(userIds))));

  return new Map(
    rows.map(row => [
      row.userId,
      {
        userId: row.userId,
        displayName: row.displayName ?? row.fallbackName ?? `Collector ${row.userId}`,
        avatarUrl: row.avatarUrl ?? null,
      },
    ]),
  );
}

async function getRatingStatsMap(userIds: number[]) {
  if (userIds.length === 0) return new Map<number, { averageRating: number; reviewCount: number }>();
  const db = await requireDb();

  const rows = await db
    .select({
      revieweeId: tradeReviews.revieweeId,
      averageRating: sql<number>`round(avg(${tradeReviews.rating}), 1)`,
      reviewCount: sql<number>`count(*)`,
    })
    .from(tradeReviews)
    .where(inArray(tradeReviews.revieweeId, Array.from(new Set(userIds))))
    .groupBy(tradeReviews.revieweeId);

  return new Map(
    rows.map(row => [
      row.revieweeId,
      {
        averageRating: Number(row.averageRating ?? 0),
        reviewCount: Number(row.reviewCount ?? 0),
      },
    ]),
  );
}

async function getContactMap(userIds: number[]) {
  if (userIds.length === 0) {
    return new Map<number, { fullName: string | null; email: string | null; phone: string | null; address: string | null }>();
  }
  const db = await requireDb();
  const rows = await db
    .select({
      userId: users.id,
      fallbackName: users.name,
      fallbackEmail: users.email,
      contactFullName: userProfiles.contactFullName,
      contactEmail: userProfiles.contactEmail,
      contactPhone: userProfiles.contactPhone,
      contactAddress: userProfiles.contactAddress,
    })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(inArray(users.id, Array.from(new Set(userIds))));

  return new Map(
    rows.map(row => [
      row.userId,
      {
        fullName: row.contactFullName ?? row.fallbackName ?? null,
        email: row.contactEmail ?? row.fallbackEmail ?? null,
        phone: row.contactPhone ?? null,
        address: row.contactAddress ?? null,
      },
    ]),
  );
}

async function getListingPhotosMap(listingIds: number[]) {
  if (listingIds.length === 0) return new Map<number, { imageUrl: string; altText: string | null }[]>();
  const db = await requireDb();

  const rows = await db
    .select({
      listingId: listingPhotos.listingId,
      imageUrl: listingPhotos.imageUrl,
      altText: listingPhotos.altText,
      sortOrder: listingPhotos.sortOrder,
    })
    .from(listingPhotos)
    .where(inArray(listingPhotos.listingId, Array.from(new Set(listingIds))))
    .orderBy(asc(listingPhotos.sortOrder), asc(listingPhotos.id));

  const map = new Map<number, { imageUrl: string; altText: string | null }[]>();
  for (const row of rows) {
    const group = map.get(row.listingId) ?? [];
    group.push({ imageUrl: row.imageUrl, altText: row.altText ?? null });
    map.set(row.listingId, group);
  }
  return map;
}

async function getSavedListingIdSet(userId?: number | null, listingIds?: number[]) {
  if (!userId || !listingIds?.length) return new Set<number>();
  const db = await requireDb();
  const rows = await db
    .select({ listingId: watchlistEntries.listingId })
    .from(watchlistEntries)
    .where(and(eq(watchlistEntries.userId, userId), inArray(watchlistEntries.listingId, Array.from(new Set(listingIds)))));

  return new Set(rows.map(row => row.listingId));
}

async function formatListings(
  listingRows: Array<{
    id: number;
    ownerId: number;
    title: string;
    category: (typeof collectibleCategories)[number];
    condition: (typeof itemConditions)[number];
    grade: string;
    certificationCompany: string | null;
    estimatedValue: any | null;
    description: string;
    status: "active" | "traded" | "archived";
    featured: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>,
  viewerId?: number | null,
) {
  const listingIds = listingRows.map(row => row.id);
  const ownerIds = listingRows.map(row => row.ownerId);
  const [photosMap, profileMap, ratingMap, savedIdSet] = await Promise.all([
    getListingPhotosMap(listingIds),
    getProfileMap(ownerIds),
    getRatingStatsMap(ownerIds),
    getSavedListingIdSet(viewerId, listingIds),
  ]);

  return listingRows.map(listing => {
    const photos = photosMap.get(listing.id) ?? [];
    const owner = profileMap.get(listing.ownerId) ?? {
      userId: listing.ownerId,
      displayName: `Collector ${listing.ownerId}`,
      avatarUrl: null,
    };
    const rating = ratingMap.get(listing.ownerId) ?? { averageRating: 0, reviewCount: 0 };

    return {
      id: listing.id,
      ownerId: listing.ownerId,
      title: listing.title,
      category: listing.category,
      categoryLabel: categoryLabels[listing.category],
      condition: listing.condition,
      conditionLabel: conditionLabels[listing.condition],
      grade: listing.grade,
      certificationCompany: listing.certificationCompany,
      estimatedValue: listing.estimatedValue,
      description: listing.description,
      status: listing.status,
      featured: listing.featured,
      isActive: listing.isActive,
      createdAt: listing.createdAt.getTime(),
      updatedAt: listing.updatedAt.getTime(),
      owner,
      ownerRating: rating,
      photos,
      primaryPhotoUrl: photos[0]?.imageUrl ?? null,
      savedToWatchlist: savedIdSet.has(listing.id),
    };
  });
}

export async function getListingDetail(listingId: number, viewerId?: number | null) {
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
    })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);

  if (!listingRows[0]) {
    throw new Error("Listing not found.");
  }

  const detailCard = (await formatListings(listingRows, viewerId))[0];
  if (!detailCard) {
    throw new Error("Listing not found.");
  }

  const ownerProfileRows = await db
    .select({
      bio: userProfiles.bio,
      displayName: userProfiles.displayName,
      avatarUrl: userProfiles.avatarUrl,
    })
    .from(userProfiles)
    .where(eq(userProfiles.userId, detailCard.ownerId))
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
    })
    .from(listings)
    .where(and(eq(listings.category, detailCard.category), eq(listings.status, "active"), ne(listings.id, listingId)))
    .orderBy(desc(listings.featured), desc(listings.createdAt))
    .limit(4);

  return {
    listing: {
      ...detailCard,
      ownerNotes: ownerProfileRows[0]?.bio ?? "This collector welcomes thoughtful offers and careful trading conversations.",
    },
    similarListings: await formatListings(similarRows, viewerId),
  };
}

export async function getMarketplaceFeed(filters: ListingFilters, viewerId?: number | null) {
  const db = await getDb();
  if (!db) {
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
    whereClauses.push(
      or(like(listings.title, `%${keyword}%`), like(listings.description, `%${keyword}%`))!,
    );
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
    })
    .from(listings)
    .where(and(...whereClauses))
    .orderBy(desc(listings.featured), desc(listings.createdAt));

  const statsRows = await Promise.all([
    db.select({ value: sql<number>`count(*)` }).from(listings).where(eq(listings.status, "active")),
    db.select({ value: sql<number>`count(*)` }).from(userProfiles),
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
      updatedAt: tradeProposals.updatedAt,
    })
    .from(tradeProposals)
    .where(or(eq(tradeProposals.requesterId, userId), eq(tradeProposals.recipientId, userId))!)
    .orderBy(desc(tradeProposals.updatedAt));

  if (proposalRows.length === 0) return [];

  const proposalIds = proposalRows.map(row => row.id);
  const requestedListingIds = proposalRows.map(row => row.requestedListingId);
  const participantIds = proposalRows.flatMap(row => [row.requesterId, row.recipientId]);

  const [requestedRows, offeredRows, requesterInventoryRows, messageRows, reviewRows, profileMap, ratingMap, contactMap] = await Promise.all([
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
      .where(inArray(listings.id, Array.from(new Set(requestedListingIds)))),
    db
      .select({
        proposalId: tradeProposalItems.proposalId,
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
      .from(tradeProposalItems)
      .innerJoin(listings, eq(listings.id, tradeProposalItems.offeredListingId))
      .where(inArray(tradeProposalItems.proposalId, proposalIds)),
    db
      .select({
        proposalId: tradeProposals.id,
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
      .from(tradeProposals)
      .innerJoin(listings, eq(listings.ownerId, tradeProposals.requesterId))
      .where(and(inArray(tradeProposals.id, proposalIds), eq(listings.status, "active"))),
    db
      .select({
        id: tradeMessages.id,
        proposalId: tradeMessages.proposalId,
        senderId: tradeMessages.senderId,
        message: tradeMessages.message,
        createdAt: tradeMessages.createdAt,
      })
      .from(tradeMessages)
      .where(inArray(tradeMessages.proposalId, proposalIds))
      .orderBy(asc(tradeMessages.createdAt)),
    db
      .select({
        id: tradeReviews.id,
        proposalId: tradeReviews.proposalId,
        reviewerId: tradeReviews.reviewerId,
        revieweeId: tradeReviews.revieweeId,
        rating: tradeReviews.rating,
        review: tradeReviews.review,
        createdAt: tradeReviews.createdAt,
      })
      .from(tradeReviews)
      .where(inArray(tradeReviews.proposalId, proposalIds))
      .orderBy(desc(tradeReviews.createdAt)),
    getProfileMap(participantIds),
    getRatingStatsMap(participantIds),
    getContactMap(participantIds),
  ]);

  const requestedListingMap = new Map(requestedRows.map(row => [row.id, row]));
  const offeredRowsByProposal = new Map<number, typeof offeredRows>();
  for (const row of offeredRows) {
    const group = offeredRowsByProposal.get(row.proposalId) ?? [];
    group.push(row);
    offeredRowsByProposal.set(row.proposalId, group);
  }

  const messageSenderProfiles = await getProfileMap(messageRows.map(row => row.senderId));
  const requestedCards = await formatListings(requestedRows, userId);
  const requestedCardMap = new Map(requestedCards.map(row => [row.id, row]));
  const allOfferedListings = await formatListings(
    offeredRows.map(({ proposalId: _proposalId, ...listing }) => listing),
    userId,
  );
  const offeredCardMap = new Map(allOfferedListings.map(row => [row.id, row]));
  const requesterInventoryCards = await formatListings(
    requesterInventoryRows.map(({ proposalId: _proposalId, ...listing }) => listing),
    userId,
  );
  const requesterInventoryByProposal = new Map<number, typeof requesterInventoryCards>();
  for (const row of requesterInventoryRows) {
    const listing = requesterInventoryCards.find(card => card.id === row.id);
    const group = requesterInventoryByProposal.get(row.proposalId) ?? [];
    if (listing && !group.some(existing => existing.id === listing.id)) {
      group.push(listing);
    }
    requesterInventoryByProposal.set(row.proposalId, group);
  }

  const messagesByProposal = new Map<number, Array<{
    id: number;
    proposalId: number;
    senderId: number;
    senderDisplayName: string;
    senderAvatarUrl: string | null;
    message: string;
    createdAt: number;
  }>>();
  for (const row of messageRows) {
    const sender = messageSenderProfiles.get(row.senderId) ?? {
      userId: row.senderId,
      displayName: `Collector ${row.senderId}`,
      avatarUrl: null,
    };
    const group = messagesByProposal.get(row.proposalId) ?? [];
    group.push({
      id: row.id,
      proposalId: row.proposalId,
      senderId: row.senderId,
      senderDisplayName: sender.displayName,
      senderAvatarUrl: sender.avatarUrl,
      message: row.message,
      createdAt: row.createdAt.getTime(),
    });
    messagesByProposal.set(row.proposalId, group);
  }

  const reviewsByProposal = new Map<number, Array<{
    id: number;
    reviewerId: number;
    revieweeId: number;
    rating: number;
    review: string | null;
    createdAt: number;
  }>>();
  for (const row of reviewRows) {
    const group = reviewsByProposal.get(row.proposalId) ?? [];
    group.push({
      id: row.id,
      reviewerId: row.reviewerId,
      revieweeId: row.revieweeId,
      rating: row.rating,
      review: row.review ?? null,
      createdAt: row.createdAt.getTime(),
    });
    reviewsByProposal.set(row.proposalId, group);
  }

  return proposalRows.map(proposal => {
    const counterpartId = proposal.requesterId === userId ? proposal.recipientId : proposal.requesterId;
    const counterpart = profileMap.get(counterpartId) ?? {
      userId: counterpartId,
      displayName: `Collector ${counterpartId}`,
      avatarUrl: null,
    };
    const counterpartRating = ratingMap.get(counterpartId) ?? { averageRating: 0, reviewCount: 0 };

    return {
      id: proposal.id,
      direction: proposal.recipientId === userId ? "incoming" : "outgoing",
      requesterId: proposal.requesterId,
      recipientId: proposal.recipientId,
      requestedListing: requestedCardMap.get(proposal.requestedListingId) ?? null,
      offeredListings: (offeredRowsByProposal.get(proposal.id) ?? []).reduce<typeof allOfferedListings>((acc, row) => {
        const listing = offeredCardMap.get(row.id);
        if (listing) acc.push(listing);
        return acc;
      }, []),
      note: proposal.note ?? "",
      status: proposal.status,
      createdAt: proposal.createdAt.getTime(),
      updatedAt: proposal.updatedAt.getTime(),
      respondedAt: proposal.respondedAt ? proposal.respondedAt.getTime() : null,
      completedAt: proposal.completedAt ? proposal.completedAt.getTime() : null,
      counterpart,
      counterpartRating,
      requesterInventory: requesterInventoryByProposal.get(proposal.id) ?? [],
      contactDetails:
        proposal.status === "accepted" || proposal.status === "completed"
          ? contactMap.get(counterpartId) ?? { fullName: null, email: null, phone: null, address: null }
          : null,
      messages: messagesByProposal.get(proposal.id) ?? [],
      reviews: reviewsByProposal.get(proposal.id) ?? [],
      canRespond: proposal.recipientId === userId && proposal.status === "pending" && (offeredRowsByProposal.get(proposal.id) ?? []).length === 0,
      canAcceptSelection: proposal.requesterId === userId && proposal.status === "pending" && (offeredRowsByProposal.get(proposal.id) ?? []).length > 0,
      canCounter: proposal.requesterId === userId && proposal.status === "pending" && (offeredRowsByProposal.get(proposal.id) ?? []).length > 0,
      canComplete: (proposal.requesterId === userId || proposal.recipientId === userId) && proposal.status === "accepted",
      canCancel: proposal.requesterId === userId && proposal.status === "pending",
      canReview:
        proposal.status === "completed" &&
        (proposal.requesterId === userId || proposal.recipientId === userId) &&
        !(reviewsByProposal.get(proposal.id) ?? []).some(review => review.reviewerId === userId),
    };
  });
}

export async function getDashboardData(user: Pick<User, "id" | "name">) {
  await ensureUserProfileRecord(user);
  const db = await requireDb();

  const [profileRows, ownListingRows, watchlistRows, proposalCards, ratingMap, receivedReviews] = await Promise.all([
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
    getRatingStatsMap([user.id]),
    db
      .select({
        id: tradeReviews.id,
        reviewerId: tradeReviews.reviewerId,
        revieweeId: tradeReviews.revieweeId,
        proposalId: tradeReviews.proposalId,
        rating: tradeReviews.rating,
        review: tradeReviews.review,
        createdAt: tradeReviews.createdAt,
      })
      .from(tradeReviews)
      .where(eq(tradeReviews.revieweeId, user.id))
      .orderBy(desc(tradeReviews.createdAt)),
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
  const rating = ratingMap.get(user.id) ?? { averageRating: 0, reviewCount: 0 };

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
    note: input.note?.trim() ? input.note.trim() : null,
  });
  const proposalId = getInsertId(proposalInsert);

  if (input.note?.trim()) {
    await db.insert(tradeMessages).values({
      proposalId,
      senderId: user.id,
      message: input.note.trim(),
    });
  }

  return getDashboardData(user);
}

export async function selectTradeProposalItems(
  userId: number,
  proposalId: number,
  offeredListingIds: number[],
  note?: string,
) {
  const db = await requireDb();
  const proposal = await db.select().from(tradeProposals).where(eq(tradeProposals.id, proposalId)).limit(1);
  if (!proposal[0]) {
    throw new Error("Trade Proposal not found.");
  }

  const current = proposal[0];
  if (current.recipientId !== userId || current.status !== "pending") {
    throw new Error("Only the item owner can select items for a pending Trade Proposal.");
  }

  const uniqueIds = Array.from(new Set(offeredListingIds));
  const offeredListings = await db
    .select()
    .from(listings)
    .where(and(eq(listings.ownerId, current.requesterId), inArray(listings.id, uniqueIds)));

  if (offeredListings.length !== uniqueIds.length) {
    throw new Error("The selected items must belong to the interested collector.");
  }
  if (offeredListings.some(item => item.status !== "active")) {
    throw new Error("All selected items must still be active listings.");
  }

  await db.delete(tradeProposalItems).where(eq(tradeProposalItems.proposalId, proposalId));
  for (const offeredListingId of uniqueIds) {
    await db.insert(tradeProposalItems).values({ proposalId, offeredListingId });
  }

  if (note?.trim()) {
    await db.insert(tradeMessages).values({
      proposalId,
      senderId: userId,
      message: note.trim(),
    });
  }

  return true;
}

export async function respondToTradeProposal(
  userId: number,
  action: "accept" | "refuse" | "counter" | "complete" | "cancel",
  proposalId: number,
  note?: string,
) {
  const db = await requireDb();
  const proposal = await db.select().from(tradeProposals).where(eq(tradeProposals.id, proposalId)).limit(1);
  if (!proposal[0]) {
    throw new Error("Trade Proposal not found.");
  }

  const current = proposal[0];
  const now = new Date();

  if (action === "accept") {
    const offeredItems = await db
      .select({ offeredListingId: tradeProposalItems.offeredListingId })
      .from(tradeProposalItems)
      .where(eq(tradeProposalItems.proposalId, proposalId));
    if (current.requesterId !== userId || current.status !== "pending" || offeredItems.length === 0) {
      throw new Error("Only the interested collector can accept after the owner selects items.");
    }
    await db
      .update(tradeProposals)
      .set({ status: "accepted", respondedAt: now })
      .where(eq(tradeProposals.id, proposalId));
    if (note?.trim()) {
      await db.insert(tradeMessages).values({ proposalId, senderId: userId, message: note.trim() });
    }
  }

  if (action === "refuse") {
    if (![current.requesterId, current.recipientId].includes(userId) || current.status !== "pending") {
      throw new Error("Only Trade Proposal participants can refuse a pending Trade Proposal.");
    }
    await db
      .update(tradeProposals)
      .set({ status: "declined", respondedAt: now })
      .where(eq(tradeProposals.id, proposalId));
    if (note?.trim()) {
      await db.insert(tradeMessages).values({ proposalId, senderId: userId, message: note.trim() });
    }
  }

  if (action === "counter") {
    if (current.requesterId !== userId || current.status !== "pending") {
      throw new Error("Only the interested collector can counter a pending Trade Proposal.");
    }
    await db.delete(tradeProposalItems).where(eq(tradeProposalItems.proposalId, proposalId));
    await db.insert(tradeMessages).values({
      proposalId,
      senderId: userId,
      message: note?.trim() || "Counter sent. Please review my trade preferences again.",
    });
  }

  if (action === "cancel") {
    if (current.requesterId !== userId || current.status !== "pending") {
      throw new Error("Only the requester can cancel a pending Trade Proposal.");
    }
    await db
      .update(tradeProposals)
      .set({ status: "cancelled", respondedAt: now })
      .where(eq(tradeProposals.id, proposalId));
  }

  if (action === "complete") {
    if (![current.requesterId, current.recipientId].includes(userId) || current.status !== "accepted") {
      throw new Error("Only participants can complete an accepted Trade Proposal.");
    }

    const offeredItems = await db
      .select({ offeredListingId: tradeProposalItems.offeredListingId })
      .from(tradeProposalItems)
      .where(eq(tradeProposalItems.proposalId, proposalId));

    await db
      .update(listings)
      .set({ status: "traded" })
      .where(inArray(listings.id, [current.requestedListingId, ...offeredItems.map(item => item.offeredListingId)]));

    await db
      .update(tradeProposals)
      .set({ status: "completed", completedAt: now, respondedAt: current.respondedAt ?? now })
      .where(eq(tradeProposals.id, proposalId));
  }

  return true;
}

export async function sendTradeMessage(userId: number, proposalId: number, message: string) {
  const db = await requireDb();
  const proposal = await db.select().from(tradeProposals).where(eq(tradeProposals.id, proposalId)).limit(1);
  if (!proposal[0]) {
    throw new Error("Trade Proposal not found.");
  }
  if (![proposal[0].requesterId, proposal[0].recipientId].includes(userId)) {
    throw new Error("Only Trade Proposal participants can send messages.");
  }

  await db.insert(tradeMessages).values({
    proposalId,
    senderId: userId,
    message: message.trim(),
  });

  return true;
}

export async function toggleWatchlist(userId: number, listingId: number) {
  const db = await requireDb();
  const existing = await db
    .select({ id: watchlistEntries.id })
    .from(watchlistEntries)
    .where(and(eq(watchlistEntries.userId, userId), eq(watchlistEntries.listingId, listingId)))
    .limit(1);

  if (existing[0]) {
    await db.delete(watchlistEntries).where(eq(watchlistEntries.id, existing[0].id));
    return { saved: false };
  }

  await db.insert(watchlistEntries).values({ userId, listingId });
  return { saved: true };
}

export async function toggleListingStatus(userId: number, listingId: number) {
  const db = await requireDb();
  const listing = await db
    .select({ id: listings.id, ownerId: listings.ownerId, isActive: listings.isActive })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);

  if (!listing[0]) {
    throw new Error("Listing not found.");
  }

  if (listing[0].ownerId !== userId) {
    throw new Error("You can only toggle your own listings.");
  }

  const newStatus = !listing[0].isActive;
  await db.update(listings).set({ isActive: newStatus }).where(eq(listings.id, listingId));
  return { isActive: newStatus };
}

export async function bulkUpdateListingStatus(userId: number, listingIds: number[], newStatus: boolean) {
  const db = await requireDb();
  
  // Verify all listings belong to the user
  const userListings = await db
    .select({ id: listings.id, ownerId: listings.ownerId })
    .from(listings)
    .where(and(eq(listings.ownerId, userId), inArray(listings.id, listingIds)));

  if (userListings.length !== listingIds.length) {
    throw new Error("You can only update your own listings.");
  }

  // Update all listings to the new status
  await db
    .update(listings)
    .set({ isActive: newStatus })
    .where(and(eq(listings.ownerId, userId), inArray(listings.id, listingIds)));

  return { updated: userListings.length, newStatus };
}

export async function bulkDeleteListings(userId: number, listingIds: number[]) {
  const db = await requireDb();
  
  // Fetch all listings and their photos before deletion (for undo)
  const listingsToDelete = await db
    .select()
    .from(listings)
    .where(and(eq(listings.ownerId, userId), inArray(listings.id, listingIds)));

  if (listingsToDelete.length !== listingIds.length) {
    throw new Error("You can only delete your own listings.");
  }

  const photosToDelete = await db
    .select()
    .from(listingPhotos)
    .where(inArray(listingPhotos.listingId, listingIds));

  // Delete all listing photos first (foreign key constraint)
  await db
    .delete(listingPhotos)
    .where(inArray(listingPhotos.listingId, listingIds));

  // Delete all listings
  await db
    .delete(listings)
    .where(and(eq(listings.ownerId, userId), inArray(listings.id, listingIds)));

  // Return deleted data for undo functionality
  return { 
    deleted: listingsToDelete.length,
    deletedListings: listingsToDelete,
    deletedPhotos: photosToDelete,
  };
}

export async function restoreDeletedListings(userId: number, listingsData: any[], photosData: any[]) {
  const db = await requireDb();
  
  // Verify all listings belong to the user
  const allBelongToUser = listingsData.every(l => l.ownerId === userId);
  if (!allBelongToUser) {
    throw new Error("You can only restore your own listings.");
  }

  // Re-insert listings
  if (listingsData.length > 0) {
    await db.insert(listings).values(listingsData);
  }

  // Re-insert photos
  if (photosData.length > 0) {
    await db.insert(listingPhotos).values(photosData);
  }

  return { restored: listingsData.length };
}

export async function leaveTradeReview(
  userId: number,
  input: { proposalId: number; rating: number; review?: string },
) {
  const db = await requireDb();
  const proposal = await db.select().from(tradeProposals).where(eq(tradeProposals.id, input.proposalId)).limit(1);
  if (!proposal[0]) {
    throw new Error("Trade Proposal not found.");
  }
  if (proposal[0].status !== "completed") {
    throw new Error("Ratings and Reviews are available only after a trade is completed.");
  }
  if (![proposal[0].requesterId, proposal[0].recipientId].includes(userId)) {
    throw new Error("Only trade participants can leave Ratings and Reviews.");
  }

  const existing = await db
    .select({ id: tradeReviews.id })
    .from(tradeReviews)
    .where(and(eq(tradeReviews.proposalId, input.proposalId), eq(tradeReviews.reviewerId, userId)))
    .limit(1);

  if (existing[0]) {
    throw new Error("You have already submitted Ratings and Reviews for this trade.");
  }

  const revieweeId = proposal[0].requesterId === userId ? proposal[0].recipientId : proposal[0].requesterId;
  await db.insert(tradeReviews).values({
    proposalId: input.proposalId,
    reviewerId: userId,
    revieweeId,
    rating: Math.max(1, Math.min(5, Math.round(input.rating))),
    review: input.review?.trim() ? input.review.trim() : null,
  });

  return true;
}

function inferPublicRegion(contactAddress: string | null | undefined) {
  if (!contactAddress) return "Undisclosed";
  const segments = contactAddress
    .split(",")
    .map(segment => segment.trim())
    .filter(Boolean);
  return segments.at(-1) ?? segments[0] ?? "Undisclosed";
}

function getVerificationLevel(input: { listingCount: number; reviewCount: number; hasAvatar: boolean; hasBio: boolean; hasContactAddress: boolean }) {
  if (input.hasContactAddress && input.reviewCount >= 3 && input.listingCount >= 3) return "verified" as const;
  if ((input.hasAvatar || input.hasBio) && input.reviewCount >= 1) return "established" as const;
  return "rising" as const;
}

export async function searchMembers(filters?: { query?: string; region?: string; verification?: "all" | "verified" | "established" | "rising" }) {
  const db = await getDb();
  if (!db) {
    return {
      regions: [] as string[],
      rankings: {
        topRated: [] as Array<{ userId: number; displayName: string; averageRating: number; reviewCount: number }>,
        mostActive: [] as Array<{ userId: number; displayName: string; listingCount: number; completedTradeCount: number }>,
      },
      members: [] as Array<{
        userId: number;
        displayName: string;
        avatarUrl: string | null;
        bio: string;
        regionLabel: string;
        verificationLevel: "verified" | "established" | "rising";
        online: boolean;
        listingCount: number;
        completedTradeCount: number;
        averageRating: number;
        reviewCount: number;
        topCategories: string[];
        featuredListingId: number | null;
      }>,
    };
  }

  const memberRows = await db
    .select({
      userId: users.id,
      fallbackName: users.name,
      avatarUrl: userProfiles.avatarUrl,
      displayName: userProfiles.displayName,
      bio: userProfiles.bio,
      contactAddress: userProfiles.contactAddress,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .orderBy(desc(users.lastSignedIn), desc(users.createdAt));

  const memberIds = memberRows.map(row => row.userId);
  if (memberIds.length === 0) {
    return {
      regions: [] as string[],
      rankings: {
        topRated: [] as Array<{ userId: number; displayName: string; averageRating: number; reviewCount: number }>,
        mostActive: [] as Array<{ userId: number; displayName: string; listingCount: number; completedTradeCount: number }>,
      },
      members: [] as Array<{
        userId: number;
        displayName: string;
        avatarUrl: string | null;
        bio: string;
        regionLabel: string;
        verificationLevel: "verified" | "established" | "rising";
        online: boolean;
        listingCount: number;
        completedTradeCount: number;
        averageRating: number;
        reviewCount: number;
        topCategories: string[];
        featuredListingId: number | null;
      }>,
    };
  }

  const [listingRows, tradeCountRows, ratingRows] = await Promise.all([
    db
      .select({
        id: listings.id,
        ownerId: listings.ownerId,
        category: listings.category,
        status: listings.status,
      })
      .from(listings)
      .where(inArray(listings.ownerId, memberIds)),
    db
      .select({
        userId: tradeProposals.requesterId,
        value: sql<number>`count(*)`,
      })
      .from(tradeProposals)
      .where(and(inArray(tradeProposals.requesterId, memberIds), eq(tradeProposals.status, "completed")))
      .groupBy(tradeProposals.requesterId),
    db
      .select({
        userId: tradeReviews.revieweeId,
        averageRating: sql<number>`round(avg(${tradeReviews.rating}), 1)`,
        reviewCount: sql<number>`count(*)`,
      })
      .from(tradeReviews)
      .where(inArray(tradeReviews.revieweeId, memberIds))
      .groupBy(tradeReviews.revieweeId),
  ]);

  const listingMap = new Map<number, { listingCount: number; categories: Record<string, number>; featuredListingId: number | null }>();
  for (const row of listingRows) {
    const entry = listingMap.get(row.ownerId) ?? { listingCount: 0, categories: {}, featuredListingId: null };
    if (row.status === "active") {
      entry.listingCount += 1;
      entry.featuredListingId ??= row.id;
    }
    entry.categories[row.category] = (entry.categories[row.category] ?? 0) + 1;
    listingMap.set(row.ownerId, entry);
  }

  const tradeCountMap = new Map(tradeCountRows.map(row => [row.userId, Number(row.value ?? 0)]));
  const ratingMap = new Map(ratingRows.map(row => [row.userId, { averageRating: Number(row.averageRating ?? 0), reviewCount: Number(row.reviewCount ?? 0) }]));
  const now = Date.now();

  const members = memberRows
    .map(row => {
      const listingStats = listingMap.get(row.userId) ?? { listingCount: 0, categories: {}, featuredListingId: null };
      const ratingStats = ratingMap.get(row.userId) ?? { averageRating: 0, reviewCount: 0 };
      const topCategories = Object.entries(listingStats.categories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category]) => categoryLabels[category as keyof typeof categoryLabels]);
      const verificationLevel = getVerificationLevel({
        listingCount: listingStats.listingCount,
        reviewCount: ratingStats.reviewCount,
        hasAvatar: Boolean(row.avatarUrl),
        hasBio: Boolean(row.bio?.trim()),
        hasContactAddress: Boolean(row.contactAddress?.trim()),
      });

      return {
        userId: row.userId,
        displayName: row.displayName ?? row.fallbackName ?? `Collector ${row.userId}`,
        avatarUrl: row.avatarUrl ?? null,
        bio: row.bio?.trim() || "Tradebilia subscriber with an active collecting profile.",
        regionLabel: inferPublicRegion(row.contactAddress),
        verificationLevel,
        online: row.lastSignedIn ? now - row.lastSignedIn.getTime() < 1000 * 60 * 15 : false,
        listingCount: listingStats.listingCount,
        completedTradeCount: tradeCountMap.get(row.userId) ?? 0,
        averageRating: ratingStats.averageRating,
        reviewCount: ratingStats.reviewCount,
        topCategories,
        featuredListingId: listingStats.featuredListingId,
        memberSince: row.createdAt.getTime(),
      };
    })
    .filter(member => {
      const query = filters?.query?.trim().toLowerCase();
      const region = filters?.region?.trim();
      const verification = filters?.verification ?? "all";
      const matchesQuery = !query || `${member.displayName} ${member.bio} ${member.userId}`.toLowerCase().includes(query);
      const matchesRegion = !region || region === "all" || member.regionLabel === region;
      const matchesVerification = verification === "all" || member.verificationLevel === verification;
      return matchesQuery && matchesRegion && matchesVerification;
    })
    .sort((a, b) => {
      const scoreA = a.averageRating * 10 + a.reviewCount * 2 + a.listingCount + a.completedTradeCount * 1.5;
      const scoreB = b.averageRating * 10 + b.reviewCount * 2 + b.listingCount + b.completedTradeCount * 1.5;
      return scoreB - scoreA;
    });

  return {
    regions: Array.from(new Set(memberRows.map(row => inferPublicRegion(row.contactAddress)).filter(region => region !== "Undisclosed"))).sort(),
    rankings: {
      topRated: [...members]
        .filter(member => member.reviewCount > 0)
        .sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount)
        .slice(0, 5)
        .map(member => ({
          userId: member.userId,
          displayName: member.displayName,
          averageRating: member.averageRating,
          reviewCount: member.reviewCount,
        })),
      mostActive: [...members]
        .sort((a, b) => b.listingCount + b.completedTradeCount - (a.listingCount + a.completedTradeCount))
        .slice(0, 5)
        .map(member => ({
          userId: member.userId,
          displayName: member.displayName,
          listingCount: member.listingCount,
          completedTradeCount: member.completedTradeCount,
        })),
    },
    members,
  };
}


export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await requireDb();
  // Count unread trade proposals (incoming proposals)
  const incomingProposals = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(tradeProposals)
    .where(and(eq(tradeProposals.recipientId, userId), ne(tradeProposals.status, "declined")))
    .then((rows: any[]) => rows[0]?.count ?? 0);
  
  return incomingProposals;
}

export async function getUnreadMessageCount(userId: number): Promise<number> {
  const db = await requireDb();
  // Count unread trade messages (messages from other users in active proposals)
  const unreadMessages = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(tradeMessages)
    .innerJoin(tradeProposals, eq(tradeMessages.proposalId, tradeProposals.id))
    .where(
      and(
        or(
          eq(tradeProposals.recipientId, userId),
          eq(tradeProposals.requesterId, userId)
        ),
        ne(tradeMessages.senderId, userId)
      )
    )
    .then((rows: any[]) => rows[0]?.count ?? 0);
  
  return unreadMessages;
}
