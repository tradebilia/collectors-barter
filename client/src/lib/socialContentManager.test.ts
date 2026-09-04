import { describe, expect, it } from "vitest";
import {
  approveSocialDraft,
  createPromotionSocialDraft,
  createSocialDraft,
  filterSocialDrafts,
  requestSocialReview,
  toggleSocialPlatform,
  SOCIAL_PLATFORMS,
} from "@/lib/socialContentManager";

describe("social content manager draft workflow", () => {
  it("creates a safe Facebook-first draft without publishing", () => {
    const draft = createSocialDraft("draft-1", "2026-09-04T12:00:00.000Z");
    expect(draft).toMatchObject({ id: "draft-1", status: "Draft", platforms: ["Facebook"], copy: "" });
    expect(draft).not.toHaveProperty("accessToken");
    expect(draft).toMatchObject({ source: "Original", sourceSummary: "Original Tradebilia-created content" });
  });

  it("creates an editable high-value listing promotion draft without any publishing credentials", () => {
    const draft = createPromotionSocialDraft("promotion-1", {
      source: "High-Value Listing",
      sourceSummary: "New public listing · Sep 4, 2026",
      title: "New high-value listing: Example Item",
      copy: "New to Tradebilia: Example Item. Now listed at $1,000.",
      mediaUrl: "https://images.example/item.jpg",
    }, "2026-09-04T12:00:00.000Z");

    expect(draft).toMatchObject({
      source: "High-Value Listing",
      status: "Draft",
      platforms: ["Facebook", "Instagram", "X"],
      mediaUrl: "https://images.example/item.jpg",
    });
    expect(draft).not.toHaveProperty("accessToken");
    expect(draft).not.toHaveProperty("publishAt");
  });

  it("includes YouTube as a selectable platform", () => {
    expect(SOCIAL_PLATFORMS).toContain("YouTube");
  });

  it("toggles additional platforms without mutating the original draft", () => {
    const draft = createSocialDraft("draft-2", "2026-09-04T12:00:00.000Z");
    const updated = toggleSocialPlatform(draft, "YouTube", "2026-09-04T12:01:00.000Z");
    expect(draft.platforms).toEqual(["Facebook"]);
    expect(updated.platforms).toEqual(["Facebook", "YouTube"]);
    expect(updated.updatedAt).toBe("2026-09-04T12:01:00.000Z");
  });

  it("requires copy before moving a draft to review, then allows approval", () => {
    const empty = createSocialDraft("draft-3", "2026-09-04T12:00:00.000Z");
    expect(requestSocialReview(empty)).toBeNull();
    const ready = { ...empty, copy: "A new collector update" };
    const review = requestSocialReview(ready, "2026-09-04T12:02:00.000Z");
    expect(review).toMatchObject({ status: "Needs Review", updatedAt: "2026-09-04T12:02:00.000Z" });
    expect(approveSocialDraft(review!, "2026-09-04T12:03:00.000Z").status).toBe("Approved");
  });

  it("filters drafts by workflow status", () => {
    const drafts = [
      { ...createSocialDraft("draft-a"), status: "Draft" as const },
      { ...createSocialDraft("draft-b"), status: "Approved" as const },
    ];
    expect(filterSocialDrafts(drafts, "All")).toHaveLength(2);
    expect(filterSocialDrafts(drafts, "Approved").map((draft) => draft.id)).toEqual(["draft-b"]);
  });
});
