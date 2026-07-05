import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { requireDb } from "./db";
import { users, draftListings, listingPhotos, userProfiles } from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { saveDraft, getDrafts, deleteDraft } from "./db";

// Integration tests for draft storage. These run against the configured
// DATABASE_URL (loaded via vitest.setup.ts) and clean up after themselves.
//
// NOTE: This file previously called saveDraft/getDrafts/deleteDraft with an
// outdated signature (plain userId + categoryFields payload) from before a
// refactor changed them to take a `user` object. It was rewritten to match
// the current API, mirroring how server/routers.ts invokes these functions.

describe("Draft Storage", () => {
  let testUserId: number;
  let testUser: { id: number; name: string };
  const createdDraftIds: number[] = [];
  let db: Awaited<ReturnType<typeof requireDb>>;

  beforeAll(async () => {
    db = await requireDb();
    const result = await db.insert(users).values({
      name: "Test User",
      openId: `test-user-${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      loginMethod: "test",
      displayName: "Test User",
      passwordHash: "test_hash",
      username: `testuser${Date.now()}`,
    });
    // Drizzle's mysql2 driver returns [ResultSetHeader, ...]; unwrap defensively.
    const header: any = Array.isArray(result) ? result[0] : result;
    testUserId = Number(header?.insertId ?? 0);
    if (!testUserId) throw new Error("Failed to create test user (no insertId returned)");
    testUser = { id: testUserId, name: "Test User" };
  });

  afterAll(async () => {
    if (createdDraftIds.length > 0) {
      await db.delete(listingPhotos).where(inArray(listingPhotos.listingId, createdDraftIds));
      await db.delete(draftListings).where(inArray(draftListings.id, createdDraftIds));
    }
    if (testUserId) {
      await db.delete(draftListings).where(eq(draftListings.userId, testUserId));
      // saveDraft -> ensureUserProfileRecord creates a userProfiles row; it must
      // be removed first to satisfy the foreign key constraint on users.
      await db.delete(userProfiles).where(eq(userProfiles.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it("should save a draft and return an ID", async () => {
    const { draftId } = await saveDraft(testUser, {
      title: "Test Comic Book",
      category: "comics",
      condition: "mint",
      description: "Test draft for vitest",
      grade: 9.5 as any,
      graderCompany: "CGC Comics",
      certificationNumber: "12345678",
      estimatedValue: 150.5,
      photos: [],
    });
    createdDraftIds.push(draftId);
    expect(draftId).toBeGreaterThan(0);
  });

  it("should retrieve saved draft with correct data", async () => {
    const drafts = await getDrafts(testUser);
    expect(drafts.length).toBeGreaterThan(0);

    const savedDraft = drafts.find(d => d.id === createdDraftIds[0]);
    expect(savedDraft).toBeDefined();
    expect(savedDraft?.title).toBe("Test Comic Book");
    expect(savedDraft?.category).toBe("comics");
    expect(savedDraft?.graderCompany).toBe("CGC Comics");
    expect(savedDraft?.certificationNumber).toBe("12345678");
  });

  it("should delete a draft successfully", async () => {
    const { draftId } = await saveDraft(testUser, {
      title: "Draft To Delete",
      category: "comics",
      condition: "mint",
      description: "",
      graderCompany: "",
      certificationNumber: "",
      photos: [],
    });
    expect(draftId).toBeGreaterThan(0);

    await deleteDraft(testUser, { draftId });

    const drafts = await getDrafts(testUser);
    expect(drafts.find(d => d.id === draftId)).toBeUndefined();
  });

  it("should handle multiple drafts for the same user", async () => {
    const first = await saveDraft(testUser, {
      title: "Draft 1",
      category: "comics",
      condition: "mint",
      description: "",
      graderCompany: "CGC Comics",
      certificationNumber: "111",
      estimatedValue: 100,
      photos: [],
    });
    const second = await saveDraft(testUser, {
      title: "Draft 2",
      category: "sports_cards",
      condition: "mint",
      description: "",
      graderCompany: "PSA",
      certificationNumber: "222",
      estimatedValue: 200,
      photos: [],
    });
    createdDraftIds.push(first.draftId, second.draftId);

    const drafts = await getDrafts(testUser);
    expect(drafts.length).toBeGreaterThanOrEqual(2);
    expect(drafts.find(d => d.id === first.draftId)?.title).toBe("Draft 1");
    expect(drafts.find(d => d.id === second.draftId)?.title).toBe("Draft 2");
  });

  it("should return an empty array for a user with no drafts", async () => {
    const drafts = await getDrafts({ id: 99999999, name: "Nobody" });
    expect(drafts).toEqual([]);
  });
});
