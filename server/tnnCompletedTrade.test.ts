import { describe, expect, it } from "vitest";
import { normalizeCanonicalListingImageUrl, resolveTnnCompletedTradeRows } from "./tnnCompletedTrade";

const completedTrade = [{ tradeId: 71, sellerName: "Canonical Seller", buyerName: "Canonical Buyer", cashIncluded: 1 }];
const rows = [
  { listingId: 11, title: "Requested Item", category: "vintage_toys", itemType: "Action Figure", grade: "80.00", certificationCompany: "AFA", itemDetails: { year: "1984" }, estimatedValue: "800", imageUrl: "/manus-storage/requested.png", direction: "requested" as const },
  { listingId: 12, title: "Offered Item", category: "comics", itemType: "Comic", grade: null, certificationCompany: null, itemDetails: { publisher: "Marvel" }, estimatedValue: "500", imageUrl: "https://tradebilia.manus.space/manus-storage/offered.jpg", direction: "offered" as const },
];

describe("canonical completed-trade TNN resolver", () => {
  it("derives party names, count, cash-only state, facts, and exact listing images from canonical rows", () => {
    const resolved = resolveTnnCompletedTradeRows(completedTrade, rows, [{ listingId: 11, title: "Requested Item" }]);
    expect(resolved).toMatchObject({
      tradeId: 71,
      sellerName: "Canonical Seller",
      buyerName: "Canonical Buyer",
      cashOnly: false,
      additionalItemsCount: 1,
      itemValue: 1300,
    });
    expect(resolved.selectedItems).toEqual([expect.objectContaining({
      listingId: 11,
      title: "Requested Item",
      imageUrl: "https://tradebilia.manus.space/manus-storage/requested.png",
      grade: "80.00",
      certificationCompany: "AFA",
    })]);
  });

  it("rejects forged titles, duplicate IDs, an item from another trade, and a below-threshold completed trade", () => {
    expect(() => resolveTnnCompletedTradeRows(completedTrade, rows, [{ listingId: 11, title: "Renamed by browser" }])).toThrow(/exactly match/i);
    expect(() => resolveTnnCompletedTradeRows(completedTrade, rows, [{ listingId: 11, title: "Requested Item" }, { listingId: 11, title: "Requested Item" }])).toThrow(/duplicate/i);
    expect(() => resolveTnnCompletedTradeRows(completedTrade, rows, [{ listingId: 999, title: "Other trade item" }])).toThrow(/exactly match/i);
    expect(() => resolveTnnCompletedTradeRows(completedTrade, [{ ...rows[0]!, estimatedValue: 999 }], [{ listingId: 11, title: "Requested Item" }])).toThrow(/at least \$1,000/i);
  });

  it("derives cash-only only from payment and canonical item direction, never a browser flag", () => {
    const oneSidedRows = [{ ...rows[0]!, estimatedValue: 1200, direction: "requested" as const }];
    expect(resolveTnnCompletedTradeRows(completedTrade, oneSidedRows, [{ listingId: 11, title: "Requested Item" }]).cashOnly).toBe(true);
    expect(resolveTnnCompletedTradeRows([{ ...completedTrade[0]!, cashIncluded: 0 }], oneSidedRows, [{ listingId: 11, title: "Requested Item" }]).cashOnly).toBe(false);
  });

  it("classifies a raw listing from canonical metadata, narrating condition instead of its stored grade-zero placeholder", () => {
    const rawRows = [{
      listingId: 13,
      title: "Raw Nintendo Game",
      category: "video_games",
      itemType: "game",
      condition: "near_mint",
      grade: "0.00",
      certificationCompany: "WATA",
      itemDetails: { isGraded: "no", platform: "NES", releaseYear: "1989" },
      estimatedValue: 1200,
      imageUrl: "/manus-storage/raw-game.png",
      direction: "requested" as const,
    }];
    const [item] = resolveTnnCompletedTradeRows(completedTrade, rawRows, [{ listingId: 13, title: "Raw Nintendo Game" }]).selectedItems;

    expect(item).toMatchObject({
      gradingStatus: "raw",
      condition: "Near Mint",
      grade: null,
      certificationCompany: null,
      customGradingCompany: null,
    });
    expect(item?.facts).toContainEqual({ label: "Condition", value: "Near Mint" });
    expect(JSON.stringify(item)).not.toContain("0.00");
    expect(JSON.stringify(item)).not.toContain("WATA");
  });

  it("allows only canonical HTTPS Tradebilia asset locations or controlled storage-relative images", () => {
    expect(normalizeCanonicalListingImageUrl("/manus-storage/item.png")).toBe("https://tradebilia.manus.space/manus-storage/item.png");
    expect(normalizeCanonicalListingImageUrl("https://media.tradebilia.com/items/1.jpg")).toBe("https://media.tradebilia.com/items/1.jpg");
    expect(normalizeCanonicalListingImageUrl("http://tradebilia.manus.space/item.jpg")).toBeNull();
    expect(normalizeCanonicalListingImageUrl("https://attacker.example/item.jpg")).toBeNull();
    expect(normalizeCanonicalListingImageUrl("javascript:alert(1)")).toBeNull();
  });
});
