import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { getSocialGraphicExportFileName, SOCIAL_GRAPHIC_CANVAS_SIZES } from "@/lib/socialGraphicExport";
import { createPromotionSocialDraft } from "@/lib/socialContentManager";

const promotionDraft = createPromotionSocialDraft("graphic-export-1", {
  source: "High-Value Listing",
  sourceSummary: "New public listing",
  title: "1986 Fleer Michael Jordan Rookie PSA 10",
  copy: "New to Tradebilia.",
  mediaUrl: "data:image/png;base64,aGVsbG8=",
  destinationUrl: "https://tradebilia.manus.space/listings/42",
  promotion: {
    itemTitle: "1986 Fleer Michael Jordan Rookie PSA 10",
    category: "sports_cards",
    itemType: "single_card",
    facts: [{ label: "Year", value: "1986" }],
    estimatedValue: 125000,
    createdAt: "2026-09-18T00:00:00.000Z",
    isNew: true,
  },
});

describe("native Social graphic exporter", () => {
  const exporterSource = readFileSync(new URL("./socialGraphicExport.ts", import.meta.url), "utf8");

  it("uses the exact output dimensions required by every supported social platform", () => {
    expect(SOCIAL_GRAPHIC_CANVAS_SIZES.Facebook).toEqual({ width: 1200, height: 630 });
    expect(SOCIAL_GRAPHIC_CANVAS_SIZES.Instagram).toEqual({ width: 1080, height: 1080 });
    expect(SOCIAL_GRAPHIC_CANVAS_SIZES.X).toEqual({ width: 1600, height: 900 });
    expect(SOCIAL_GRAPHIC_CANVAS_SIZES.Pinterest).toEqual({ width: 1000, height: 1500 });
    expect(SOCIAL_GRAPHIC_CANVAS_SIZES.LinkedIn).toEqual({ width: 1200, height: 627 });
    expect(SOCIAL_GRAPHIC_CANVAS_SIZES.YouTube).toEqual({ width: 1280, height: 720 });
  });

  it("creates a stable, descriptive PNG filename without relying on preview DOM", () => {
    expect(getSocialGraphicExportFileName(promotionDraft, "Facebook")).toBe("tradebilia-1986-fleer-michael-jordan-rookie-psa-10-facebook.png");
  });

  it("uses an explicit new-listing header, enlarged official brand space, and a complete fitted title without image labels", () => {
    expect(exporterSource).toContain("NEW HIGH-VALUE LISTING");
    expect(exporterSource).toContain("drawCompleteFittedTitle");
    expect(exporterSource).toContain("drawCenteredBrand");
    expect(exporterSource).toContain('context.textAlign = "center"');
    expect(exporterSource).toContain('context.textBaseline = "middle"');
    expect(exporterSource).toContain("SOCIAL_GRAPHIC_HERO_BACKGROUND_URL");
    expect(exporterSource).toContain("drawBackground(context, width, height, heroBackground)");
    expect(exporterSource).toContain('context.textAlign = "center"');
    expect(exporterSource).not.toContain('context.fillText("TRADEBILIA", width - padding');
    expect(exporterSource).toContain("getSocialPromotionItemTitle");
    expect(exporterSource).not.toContain("ORIGINAL IMAGE · FULLY SHOWN");
    expect(exporterSource).not.toContain("VIEW ITEM PROFILE");
    expect(exporterSource).not.toContain("const url = splitLine");
    expect(exporterSource).toContain("height - 42 * scale");
  });
});
