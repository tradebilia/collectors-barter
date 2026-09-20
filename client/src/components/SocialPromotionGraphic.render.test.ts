import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SOCIAL_GRAPHIC_SPECS, SocialPromotionGraphic } from "@/components/SocialPromotionGraphic";
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
  it("reserves the correct landscape canvas while the native renderer prepares the graphic", () => {
    const markup = renderToStaticMarkup(createElement(SocialPromotionGraphic, { draft: promotionDraft, platform: "Facebook" }));
    expect(SOCIAL_GRAPHIC_SPECS.Facebook).toMatchObject({ size: "1200 × 630", aspect: "aspect-[1.91/1]" });
    expect(markup).toContain("aspect-[1.91/1]");
    expect(markup).toContain('data-platform="Facebook"');
    expect(markup).toContain("Rendering promotional graphic");
    expect(markup).not.toContain("html2canvas");
  });

  it("reserves the correct tall canvas while the native renderer prepares the graphic", () => {
    const markup = renderToStaticMarkup(createElement(SocialPromotionGraphic, { draft: promotionDraft, platform: "Pinterest" }));
    expect(SOCIAL_GRAPHIC_SPECS.Pinterest).toMatchObject({ size: "1000 × 1500", aspect: "aspect-[2/3]" });
    expect(markup).toContain("aspect-[2/3]");
    expect(markup).toContain('data-platform="Pinterest"');
    expect(markup).toContain("Rendering promotional graphic");
  });
});
