import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { requireDb } from "./db";
import { users, listings, favorites } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  trackListingView,
  addToFavorites,
  removeFromFavorites,
  isFavorited,
  getTopMostFavoritedItems,
  getTopMostViewedItems,
} from "./db";

describe("Favorites and View Tracking", () => {
  let testUserId: number;
  let testListingId: number;
  let db: Awaited<ReturnType<typeof requireDb>>;

  beforeAll(async () => {
    db = await requireDb();

    // Create a test user
    const userResult = await db.insert(users).values({
      username: `test_user_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      passwordHash: "test_hash",
      name: "Test User",
    });
    testUserId = Array.isArray(userResult) ? userResult[0]?.insertId : (userResult as any).insertId;

    // Create a test listing
    const listingResult = await db.insert(listings).values({
      ownerId: testUserId,
      title: "Test Listing",
      category: "comics",
      condition: "mint",
      description: "Test description",
      status: "active",
      isActive: true,
      featured: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    testListingId = Array.isArray(listingResult) ? listingResult[0]?.insertId : (listingResult as any).insertId;
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(favorites).where(eq(favorites.listingId, testListingId));
    await db.delete(listings).where(eq(listings.id, testListingId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should track listing views", async () => {
    // Get initial view count
    const initialListing = await db
      .select()
      .from(listings)
      .where(eq(listings.id, testListingId))
      .limit(1);
    const initialViewCount = initialListing[0]?.viewCount ?? 0;

    // Track a view
    await trackListingView(testListingId);

    // Get updated view count
    const updatedListing = await db
      .select()
      .from(listings)
      .where(eq(listings.id, testListingId))
      .limit(1);
    const updatedViewCount = updatedListing[0]?.viewCount ?? 0;

    expect(updatedViewCount).toBe(initialViewCount + 1);
  });

  it("should add item to favorites", async () => {
    const success = await addToFavorites(testUserId, testListingId);
    expect(success).toBe(true);

    // Verify the favorite was added
    const favoriteRecord = await db
      .select()
      .from(favorites)
      .where(eq(favorites.listingId, testListingId))
      .limit(1);
    expect(favoriteRecord.length).toBeGreaterThan(0);
  });

  it("should check if item is favorited", async () => {
    // Add to favorites first
    await addToFavorites(testUserId, testListingId);

    // Check if favorited
    const favorited = await isFavorited(testUserId, testListingId);
    expect(favorited).toBe(true);
  });

  it("should remove item from favorites", async () => {
    // Add to favorites first
    await addToFavorites(testUserId, testListingId);

    // Remove from favorites
    const success = await removeFromFavorites(testUserId, testListingId);
    expect(success).toBe(true);

    // Verify the favorite was removed
    const favorited = await isFavorited(testUserId, testListingId);
    expect(favorited).toBe(false);
  });

  it("should get top most favorited items", async () => {
    const items = await getTopMostFavoritedItems();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeLessThanOrEqual(10);
  });

  it("should get top most viewed items", async () => {
    const items = await getTopMostViewedItems();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeLessThanOrEqual(10);
  });

  it("should not duplicate favorites", async () => {
    // Add to favorites twice
    const firstAdd = await addToFavorites(testUserId, testListingId);
    const secondAdd = await addToFavorites(testUserId, testListingId);

    // The second add should fail due to unique constraint
    expect(firstAdd).toBe(true);
    expect(secondAdd).toBe(false);

    // Verify only one favorite record exists
    const favoriteRecords = await db
      .select()
      .from(favorites)
      .where(eq(favorites.listingId, testListingId));
    expect(favoriteRecords.length).toBe(1);
  });
});
