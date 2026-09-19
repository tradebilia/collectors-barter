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
    expect(exporterSource).toContain("/ 2 - 6 * scale");
    expect(exporterSource).toContain('context.fillStyle = "#ffd45a"');
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
    expect(exporterSource).toContain("drawBrandFooter(context, draft, platform, brandLogo, width, height, padding, scale, 42, 18)");
    expect(exporterSource).toContain("const height = rows * 54 * scale + 1 * scale");
    expect(exporterSource).toContain("const valueY = Math.max(detailY + 28 * scale, height - 144 * scale)");
  });

  it("always places the complete brand lockup above a divider-separated footer phrase", () => {
    expect(exporterSource).toContain("function drawBrandFooter");
    expect(exporterSource).toContain("const brandY = dividerY - brandHeight - 16 * scale");
    expect(exporterSource).toContain("context.fillText(getSocialFooterPhrase(draft.id, platform).toUpperCase()");
    expect(exporterSource.match(/drawBrandFooter\(context, draft,/g)).toHaveLength(4);
    expect(exporterSource).not.toContain("drawCenteredBrand(context, brandLogo");
  });

  it("uses the stronger Facebook-style trade-alert composition for Instagram completed trades", () => {
    expect(exporterSource).toContain("drawCompletedTradeInstagram");
    expect(exporterSource).toContain("const frameHeight = height - frameY - 224 * scale");
    expect(exporterSource).toContain("drawCompletedTradeSideBySide");
    expect(exporterSource).toContain("function drawTradeDirection");
    expect(exporterSource).toContain("function drawTradeAlertHeader");
    expect(exporterSource).toContain('Impact, "Arial Narrow", Arial, sans-serif');
    expect(exporterSource).toContain("function drawTrackedText");
    expect(exporterSource).toContain("drawTradeAlertHeader(context, width, 104 * scale, scale)");
    expect(exporterSource).toContain('drawTrackedText(context, "TRADED"');
    expect(exporterSource).toContain('gradient.addColorStop(0, "rgba(255, 185, 46, 0)")');
    expect(exporterSource).toContain('gradient.addColorStop(1, "rgba(255, 185, 46, 0)")');
    expect(exporterSource).toContain("drawArrow(centerY + 5 * scale, true)");
    expect(exporterSource).toContain('drawCompletedTradeSideBySide(context, draft, "Instagram"');
    expect(exporterSource).toContain('platform === "Instagram"');
  });

  it("frames only completed-trade brand marks with fading blue side rules", () => {
    expect(exporterSource).toContain("function drawTradeBrandAccentLines");
    expect(exporterSource).toContain('if (draft.source === "Completed Trade")');
    expect(exporterSource).toContain('rgba(70, 197, 255, 0.72)');
    expect(exporterSource).toContain("drawTradeBrandAccentLines(context, width, brandY, scale)");
  });

  it("supports fuller item captions while retaining adaptive multi-item trade grids", () => {
    expect(exporterSource).toContain("function drawTradeItemCaption");
    expect(exporterSource).toContain("context.fillStyle = \"#ffffff\"");
    expect(exporterSource).toContain("drawWrappedText(context, title");
    expect(exporterSource).toContain("drawTradeMediaCell");
    expect(exporterSource).toContain("if (itemEntries.length === 3)");
    expect(exporterSource).toContain("const itemEntries = entries.slice(0, 4)");
    expect(exporterSource).toContain("const tileHeight = (frameHeight - tileGap) / 2");
    expect(exporterSource).toContain('const frameHeight = platform === "Pinterest" ? height * 0.56 : height * 0.32');
    expect(exporterSource).toContain('platform === "Pinterest" ? 14 : 12');
  });

  it("gives Instagram high-value posts a larger image, clear title gap, and a visible footer phrase", () => {
    expect(exporterSource).toContain("getCompleteFittedTitleLayout");
    expect(exporterSource).toContain('const titleGap = platform === "Instagram" ? 58 * scale : 38 * scale');
    expect(exporterSource).toContain('const imageHeight = platform === "Instagram"');
    expect(exporterSource).toContain("height - imageY - titleGap - titleLayout.height");
    expect(exporterSource).toContain("let y = imageY + imageHeight + titleGap");
    expect(exporterSource).toContain('platform === "Instagram" ? 58 : 42, 18');
    expect(exporterSource).toContain('drawBrandFooter(context, draft, platform, brandLogo, width, height, padding, scale');
  });
});
