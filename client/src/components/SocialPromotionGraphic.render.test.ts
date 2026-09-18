import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/TradebiliaWheel", () => ({
  TradebiliaWheel: () => "Tradebilia wheel",
}));

import { SocialPromotionGraphic } from "@/components/SocialPromotionGraphic";
import { createPromotionSocialDraft } from "@/lib/socialContentManager";

const promotionDraft = createPromotionSocialDraft("social-graphic-1", {
  source: "High-Value Listing",
  sourceSummary: "New public listing · Sep 17, 2026",
  title: "New high-value listing: 1986 Fleer Michael Jordan Rookie PSA 10",
  copy: "NEW TO TRADEBILIA",
  mediaUrl: "https://images.example/jordan.jpg",
  destinationUrl: "https://tradebilia.manus.space/listings/42",
  promotion: {
    itemTitle: "1986 Fleer Michael Jordan Rookie PSA 10",
    category: "sports_cards",
    itemType: "single_card",
    facts: [{ label: "Year", value: "1986" }, { label: "Manufacturer", value: "Fleer" }, { label: "Grade", value: "PSA 10" }],
    estimatedValue: 125000,
    createdAt: "2026-09-17T00:00:00.000Z",
    isNew: true,
  },
});

describe("rendered Social promotion graphic", () => {
  it("renders the complete source image inside a landscape social canvas", () => {
    const markup = renderToStaticMarkup(createElement(SocialPromotionGraphic, { draft: promotionDraft, platform: "Facebook" }));
    expect(markup).toContain("aspect-[1.91/1]");
    expect(markup).toContain("object-contain");
    expect(markup).toContain("1986 Fleer Michael Jordan Rookie PSA 10");
    expect(markup).toContain("New to Tradebilia");
    expect(markup).toContain("Trade value");
    expect(markup).toContain("$125,000");
    expect(markup).toContain("https://tradebilia.manus.space/listings/42");
  });

  it("renders a full-image tall canvas for a Pinterest promotion", () => {
    const markup = renderToStaticMarkup(createElement(SocialPromotionGraphic, { draft: promotionDraft, platform: "Pinterest" }));
    expect(markup).toContain("aspect-[2/3]");
    expect(markup).toContain("Original image · fully shown");
    expect(markup).toContain("Grade");
  });
});
