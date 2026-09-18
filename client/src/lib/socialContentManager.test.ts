import { describe, expect, it } from "vitest";
import {
  TRADEBILIA_PUBLIC_ORIGIN,
  approveSocialDraft,
  buildListingSocialCopy,
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
    expect(draft).toMatchObject({ id: "draft-1", status: "Draft", platforms: ["Facebook"], copy: "", destinationUrl: TRADEBILIA_PUBLIC_ORIGIN, promotion: null });
    expect(draft).not.toHaveProperty("accessToken");
  });

  it("creates an editable item-specific promotion draft without any publishing credentials", () => {
    const draft = createPromotionSocialDraft("promotion-1", {
      source: "High-Value Listing",
      sourceSummary: "New public listing · Sep 4, 2026",
      title: "New high-value listing: Example Item",
      copy: "NEW TO TRADEBILIA\n\nExample Item",
      mediaUrl: "https://images.example/item.jpg",
      destinationUrl: "https://tradebilia.manus.space/listings/42",
      promotion: {
        itemTitle: "Example Item",
        category: "sports_cards",
        itemType: "single_card",
        facts: [{ label: "Year", value: "1986" }, { label: "Grade", value: "PSA 10" }],
        estimatedValue: 1000,
        createdAt: "2026-09-04T12:00:00.000Z",
        isNew: true,
      },
    }, "2026-09-04T12:00:00.000Z");

    expect(draft).toMatchObject({
      source: "High-Value Listing",
      status: "Draft",
      platforms: ["Facebook", "Instagram", "X", "Pinterest"],
      mediaUrl: "https://images.example/item.jpg",
      destinationUrl: "https://tradebilia.manus.space/listings/42",
      promotion: { isNew: true },
    });
    expect(draft.promotion?.facts).toEqual(expect.arrayContaining([{ label: "Year", value: "1986" }]));
    expect(draft).not.toHaveProperty("accessToken");
    expect(draft).not.toHaveProperty("publishAt");
  });

  it("builds accurate item copy from supplied facts and a dynamic item URL", () => {
    const copy = buildListingSocialCopy({
      itemTitle: "1986 Fleer Michael Jordan Rookie",
      category: "sports_cards",
      itemType: "single_card",
      facts: [{ label: "Year", value: "1986" }, { label: "Grade", value: "PSA 10" }],
      estimatedValue: 125000,
      isNew: true,
      destinationUrl: "https://tradebilia.manus.space/listings/42",
    });
    expect(copy).toContain("NEW TO TRADEBILIA");
    expect(copy).toContain("1986 Fleer Michael Jordan Rookie");
    expect(copy).toContain("Sports Cards · Single Card · 1986 · PSA 10");
    expect(copy).toContain("Trade value: $125,000");
    expect(copy).toContain("Discover this single card on Tradebilia.");
    expect(copy).toContain("https://tradebilia.manus.space/listings/42");
    expect(copy).not.toContain("rare");
    expect(copy).not.toContain("guaranteed");
  });

  it("includes Pinterest as a selectable platform", () => {
    expect(SOCIAL_PLATFORMS).toContain("Pinterest");
  });

  it("toggles additional platforms without mutating the original draft", () => {
    const draft = createSocialDraft("draft-2", "2026-09-04T12:00:00.000Z");
    const updated = toggleSocialPlatform(draft, "Pinterest", "2026-09-04T12:01:00.000Z");
    expect(draft.platforms).toEqual(["Facebook"]);
    expect(updated.platforms).toEqual(["Facebook", "Pinterest"]);
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
