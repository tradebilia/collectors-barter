import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  getSocialGraphicExportFileName,
  getTradeGradeBadgeStyle,
  getTradeItemFactLine,
  getTradeItemGradeLine,
  SOCIAL_GRAPHIC_CANVAS_SIZES,
  TRADE_ALERT_THEME_IMAGE_URLS,
} from "@/lib/socialGraphicExport";
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

  it("creates a stable descriptive filename without relying on preview DOM", () => {
    expect(getSocialGraphicExportFileName(promotionDraft, "Facebook")).toBe("tradebilia-1986-fleer-michael-jordan-rookie-psa-10-facebook.png");
  });

  it("preserves the high-value graphic hierarchy and contained original image behavior", () => {
    expect(exporterSource).toContain("NEW HIGH-VALUE LISTING");
    expect(exporterSource).toContain("drawCompleteFittedTitle");
    expect(exporterSource).toContain("drawCenteredBrand");
    expect(exporterSource).toContain("SOCIAL_GRAPHIC_HERO_BACKGROUND_URL");
    expect(exporterSource).toContain("drawBackground(context, width, height, heroBackground)");
    expect(exporterSource).toContain("getSocialPromotionItemTitle");
    expect(exporterSource).not.toContain("ORIGINAL IMAGE · FULLY SHOWN");
    expect(exporterSource).not.toContain("VIEW ITEM PROFILE");
  });

  it("keeps logos above their divider and gives completed trades a clear CTA footer", () => {
    expect(exporterSource).toContain("function drawBrandFooter");
    expect(exporterSource).toContain("function drawTradeBrandFooter");
    expect(exporterSource).toContain("const brandY = dividerY - brandHeight - 16 * scale");
    expect(exporterSource).toContain("drawCrispText(context, getSocialFooterPhrase(draft.id, platform).toUpperCase()");
    expect(exporterSource).toContain('const label = "VIEW THIS TRADE ON TRADEBILIA"');
    expect(exporterSource).toContain("drawTradeBrandFooter(context, brandLogo");
  });

  it("uses crisp Anton display typography, a centered Trade Alert hierarchy, and readable exchange arrows", () => {
    expect(exporterSource).toContain('Anton, "Arial Narrow", Arial, sans-serif');
    expect(exporterSource).toContain('document.fonts.load(\'400 44px "Anton"\')');
    expect(exporterSource).toContain("function drawTradeAlertHeader");
    expect(exporterSource).toContain("REAL COLLECTIBLES • REAL TRADES • REAL PEOPLE");
    expect(exporterSource).toContain("const textBaseline = bannerY + height / 2 + (ascent - descent) / 2");
    expect(exporterSource).toContain('drawTrackedText(context, "TRADED"');
    expect(exporterSource).toContain('gradient.addColorStop(0, "rgba(255, 185, 46, 0)")');
    expect(exporterSource).toContain('gradient.addColorStop(1, "rgba(255, 185, 46, 0)")');
  });

  it("adds public detail and grade information only when present", () => {
    expect(getTradeItemGradeLine({ title: "Graded card", certificationCompany: "PSA", grade: "9.80" })).toBe("PSA 9.8");
    expect(getTradeItemGradeLine({ title: "Custom graded card", certificationCompany: "other", customGradingCompany: "CGA", grade: 8.95 })).toBe("CGA 9");
    expect(getTradeItemGradeLine({ title: "Ungraded item", certificationCompany: "PSA", grade: null })).toBeNull();
    expect(getTradeItemFactLine({ title: "Public item", facts: [{ label: "Year", value: "1982" }, { label: "Grading Company", value: "PSA" }, { label: "Grade", value: "10" }] })).toBe("1982");
    expect(getTradeGradeBadgeStyle("sports_cards")).toEqual({ fill: "#fee2e2", stroke: "#fecaca", text: "#991b1b" });
    expect(getTradeGradeBadgeStyle("comics")).toEqual({ fill: "#ede9fe", stroke: "#ddd6fe", text: "#5b21b6" });
  });

  it("uses reusable category environments while keeping actual item photos contained", () => {
    expect(Object.keys(TRADE_ALERT_THEME_IMAGE_URLS)).toEqual(expect.arrayContaining([
      "sports_cards", "comics", "pokemon", "vintage_toys", "video_games", "coins", "stamps", "movies", "music", "autographs", "disney_pins",
    ]));
    expect(exporterSource).toContain("function drawTradeStage");
    expect(exporterSource).toContain("function drawTradeItemEnvironment");
    expect(exporterSource).toContain("resolveTradeAlertTheme");
    expect(exporterSource).toContain("drawContainedImage(context, image, x + 8 * scale");
    expect(exporterSource).toContain("tradeThemeImageUrls");
    expect(exporterSource).toContain("drawTradeStage(context, width, height, completedTradeThemes)");
  });

  it("retains adaptive mixed-item layouts across Facebook, Instagram, and Pinterest", () => {
    expect(exporterSource).toContain("drawCompletedTradeLandscape");
    expect(exporterSource).toContain("drawCompletedTradeInstagram");
    expect(exporterSource).toContain("drawCompletedTradeTall");
    expect(exporterSource).toContain("const frameHeight = height - frameY - 246 * scale");
    expect(exporterSource).toContain("if (itemEntries.length === 3)");
    expect(exporterSource).toContain("const captionTopGap = 22 * scale");
    expect(exporterSource).toContain("const factReserve = getTradeItemFactLine(entry.item)");
    expect(exporterSource).toContain('const frameHeight = platform === "Pinterest" ? height * 0.58 : height * 0.32');
    expect(exporterSource).toContain("const rowCount = Math.ceil(itemCount / 2)");
    expect(exporterSource).toContain("const tileHeight = (frameHeight - tileGap * (rowCount - 1)) / rowCount");
  });

  it("uses fading blue rules only around the completed-trade brand lockup", () => {
    expect(exporterSource).toContain("function drawTradeBrandAccentLines");
    expect(exporterSource).toContain('rgba(70, 197, 255, 0.72)');
    expect(exporterSource).toContain("drawTradeBrandAccentLines(context, width, brandY, scale)");
  });
});
