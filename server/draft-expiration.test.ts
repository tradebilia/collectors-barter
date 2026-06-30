import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { requireDb, deleteDraftsOlderThan, saveDraft } from "./db";
import { draftListings } from "./drizzle/schema";
import { eq } from "drizzle-orm";

describe("Draft Expiration", () => {
  let db: any;
  let testDraftId: number;

  beforeAll(async () => {
    db = await requireDb();
  });

  afterAll(async () => {
    // Clean up test data
    if (testDraftId) {
      await db.delete(draftListings).where(eq(draftListings.id, testDraftId));
    }
  });

  it("should create a draft with createdAt timestamp", async () => {
    const result = await saveDraft(
      { id: 1, name: "Test User" },
      {
        title: "Test Draft for Expiration",
        category: "comics",
        grade: "raw",
        graderCompany: "Raw",
        certificationNumber: "",
        estimatedValue: 100,
        photos: [],
      }
    );

    // Verify the draft was created
    const drafts = await db.select().from(draftListings).where(eq(draftListings.id, result.draftId));
    expect(drafts.length).toBe(1);
    expect(drafts[0].createdAt).toBeDefined();
    testDraftId = result.draftId;
  });

  it("should delete drafts older than 30 days", async () => {
    // Create a draft with an old createdAt date
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    
    const insertResult = await db.insert(draftListings).values({
      userId: 1,
      title: "Old Draft",
      category: "comics",
      grade: "raw",
      graderCompany: "Raw",
      certificationNumber: "",
      estimatedValue: 50,
      createdAt: thirtyOneDaysAgo,
    });

    const oldDraftId = insertResult[0].insertId || insertResult.lastInsertRowid;

    // Delete drafts older than 30 days
    const deletedCount = await deleteDraftsOlderThan(db, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

    // Verify the old draft was deleted
    expect(deletedCount).toBeGreaterThan(0);
    
    const remainingDrafts = await db.select().from(draftListings).where(eq(draftListings.id, oldDraftId));
    expect(remainingDrafts.length).toBe(0);
  });

  it("should not delete drafts younger than 30 days", async () => {
    // Create a draft from 15 days ago
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    
    const insertResult = await db.insert(draftListings).values({
      userId: 1,
      title: "Recent Draft",
      category: "comics",
      grade: "raw",
      graderCompany: "Raw",
      certificationNumber: "",
      estimatedValue: 75,
      createdAt: fifteenDaysAgo,
    });

    const recentDraftId = insertResult[0].insertId || insertResult.lastInsertRowid;

    // Try to delete drafts older than 30 days
    const deletedCount = await deleteDraftsOlderThan(db, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

    // Verify the recent draft was NOT deleted
    const remainingDrafts = await db.select().from(draftListings).where(eq(draftListings.id, recentDraftId));
    expect(remainingDrafts.length).toBe(1);

    // Clean up
    await db.delete(draftListings).where(eq(draftListings.id, recentDraftId));
  });
});
