import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { saveDraft, getDrafts, deleteDraft } from "./db";

describe("Draft Storage", () => {
  const testUserId = 1; // Use the first user from the database
  let draftId: number;

  beforeAll(async () => {
    // Clean up any existing test drafts
    const existingDrafts = await getDrafts(testUserId);
    for (const draft of existingDrafts) {
      await deleteDraft(draft.id, testUserId);
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (draftId) {
      await deleteDraft(draftId, testUserId);
    }
  });

  it("should save a draft and return an ID", async () => {
    const draftData = {
      title: "Test Comic Book",
      category: "comics" as const,
      grade: "9.5" as any, // Cast to any since it's a valid enum value
      graderCompany: "CGC Comics",
      certificationNumber: "12345678",
      estimatedValue: 150.5,
      categoryFields: {
        issueNumber: "#1",
        signed: "No",
        facsimile: "No",
      },
      additionalNotes: "Test draft for vitest",
      photos: [
        {
          name: "test.jpg",
          type: "image/jpeg",
          contentBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        },
      ],
    };

    draftId = await saveDraft(testUserId, draftData);
    expect(draftId).toBeGreaterThan(0);
  });

  it("should retrieve saved draft with correct data", async () => {
    const drafts = await getDrafts(testUserId);
    expect(drafts.length).toBeGreaterThan(0);

    const savedDraft = drafts.find(d => d.id === draftId);
    expect(savedDraft).toBeDefined();
    expect(savedDraft?.title).toBe("Test Comic Book");
    expect(savedDraft?.category).toBe("comics");
    expect(savedDraft?.grade).toBe("9.5");
    expect(savedDraft?.graderCompany).toBe("CGC Comics");
    expect(savedDraft?.certificationNumber).toBe("12345678");
    expect(savedDraft?.estimatedValue).toBe(150.5);
    expect(savedDraft?.additionalNotes).toBe("Test draft for vitest");
  });

  it("should parse category fields correctly", async () => {
    const drafts = await getDrafts(testUserId);
    const savedDraft = drafts.find(d => d.id === draftId);

    expect(savedDraft?.categoryFields).toEqual({
      issueNumber: "#1",
      signed: "No",
      facsimile: "No",
    });
  });

  it("should parse photos correctly", async () => {
    const drafts = await getDrafts(testUserId);
    const savedDraft = drafts.find(d => d.id === draftId);

    expect(Array.isArray(savedDraft?.photos)).toBe(true);
    expect(savedDraft?.photos?.length).toBe(1);
    expect(savedDraft?.photos?.[0]?.name).toBe("test.jpg");
    expect(savedDraft?.photos?.[0]?.type).toBe("image/jpeg");
  });

  it("should delete draft successfully", async () => {
    await deleteDraft(draftId, testUserId);

    const drafts = await getDrafts(testUserId);
    const deletedDraft = drafts.find(d => d.id === draftId);
    expect(deletedDraft).toBeUndefined();
  });

  it("should handle multiple drafts for same user", async () => {
    // Save first draft
    const draft1Id = await saveDraft(testUserId, {
      title: "Draft 1",
      category: "comics" as const,
      grade: "8" as any,
      graderCompany: "CGC Comics",
      certificationNumber: "111",
      estimatedValue: 100,
      categoryFields: {},
      additionalNotes: "",
      photos: [],
    });

    // Save second draft
    const draft2Id = await saveDraft(testUserId, {
      title: "Draft 2",
      category: "sports_cards" as const,
      grade: "9" as any,
      graderCompany: "PSA",
      certificationNumber: "222",
      estimatedValue: 200,
      categoryFields: {},
      additionalNotes: "",
      photos: [],
    });

    const drafts = await getDrafts(testUserId);
    expect(drafts.length).toBeGreaterThanOrEqual(2);

    const draft1 = drafts.find(d => d.id === draft1Id);
    const draft2 = drafts.find(d => d.id === draft2Id);

    expect(draft1?.title).toBe("Draft 1");
    expect(draft2?.title).toBe("Draft 2");
    expect(draft1?.category).toBe("comics");
    expect(draft2?.category).toBe("sports_cards");

    // Clean up
    await deleteDraft(draft1Id, testUserId);
    await deleteDraft(draft2Id, testUserId);
  });

  it("should return empty array for user with no drafts", async () => {
    const nonExistentUserId = 99999;
    const drafts = await getDrafts(nonExistentUserId);
    expect(drafts).toEqual([]);
  });

  it("should handle null/optional fields correctly", async () => {
    const draftWithNullFields = await saveDraft(testUserId, {
      title: "Minimal Draft",
      category: "pokemon" as const,
      grade: "ungraded",
      graderCompany: "",
      certificationNumber: "",
      estimatedValue: 0,
      categoryFields: {},
      additionalNotes: "",
      photos: [],
    });

    const drafts = await getDrafts(testUserId);
    const savedDraft = drafts.find(d => d.id === draftWithNullFields);

    expect(savedDraft?.title).toBe("Minimal Draft");
    expect(savedDraft?.graderCompany).toBe("");
    expect(savedDraft?.certificationNumber).toBe("");
    // estimatedValue is stored as decimal, which can be null or a string representation
    expect(savedDraft?.estimatedValue === null || savedDraft?.estimatedValue === "0.00" || savedDraft?.estimatedValue === 0).toBe(true);
    expect(savedDraft?.categoryFields).toEqual({});
    expect(savedDraft?.photos).toEqual([]);

    // Clean up
    await deleteDraft(draftWithNullFields, testUserId);
  });
});
