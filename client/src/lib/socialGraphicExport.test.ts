import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  getSocialGraphicExportFileName,
  getTradeAlertStageKey,
  getTradeItemFactLine,
  getTradeItemGradeLine,
  SOCIAL_GRAPHIC_CANVAS_SIZES,
  TRADE_ALERT_BRUSH_IMAGE_URL,
  TRADED_EXCHANGE_LOGO_URL,
  TRADE_ALERT_STAGE_IMAGE_URLS,
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

  it("loads prepared storage assets safely for canvas preview and export", () => {
    expect(exporterSource).toContain('image.crossOrigin = "anonymous"');
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

  it("keeps the high-value brand footer intact and omits the completed-trade CTA button", () => {
    expect(exporterSource).toContain("function drawBrandFooter");
    expect(exporterSource).toContain("const brandY = dividerY - brandHeight - 16 * scale");
    expect(exporterSource).toContain("drawCrispText(context, getSocialFooterPhrase(draft.id, platform).toUpperCase()");
    expect(exporterSource).not.toContain("function drawCinematicTradeCta");
    expect(exporterSource).not.toContain('const label = "VIEW THIS TRADE ON TRADEBILIA  →"');
  });

  it("uses a textured brush-stroke Trade Alert and compact circular exchange mark", () => {
    expect(exporterSource).toContain('Anton, "Arial Narrow", Arial, sans-serif');
    expect(exporterSource).toContain('Knewave, "Permanent Marker", "Brush Script MT", cursive');
    expect(exporterSource).toContain('document.fonts.load(\'400 44px "Anton"\')');
    expect(exporterSource).toContain('document.fonts.load(\'400 48px "Knewave"\')');
    expect(TRADE_ALERT_BRUSH_IMAGE_URL).toContain("trade-alert-banner-paint-swipe");
    expect(TRADED_EXCHANGE_LOGO_URL).toContain("traded-mockup-1_4a1f25d2.png");
    expect(exporterSource).toContain("+ CASH INCLUDED");
    expect(exporterSource).toContain("drawCinematicFooterPhrase");
    expect(exporterSource).toContain("function drawCinematicTradeHeader");
    expect(exporterSource).toContain("if (!brushImage)");
    expect(exporterSource).toContain("function drawCinematicExchangeMark");
    expect(exporterSource).toContain("drawContainedImage(context, logoImage");
    expect(exporterSource).not.toContain("REAL COLLECTIBLES • REAL TRADES • REAL PEOPLE");
    expect(exporterSource).toContain('const label = "TRADED"');
    expect(exporterSource).toContain("context.arc(centerX, centerY - 3 * scale, radius");
  });

  it("adds public detail and grade information only when present", () => {
    expect(getTradeItemGradeLine({ title: "Graded card", certificationCompany: "PSA", grade: "9.80" })).toBe("PSA 9.8");
    expect(getTradeItemGradeLine({ title: "Custom graded card", certificationCompany: "other", customGradingCompany: "CGA", grade: 8.95 })).toBe("CGA 9");
    expect(getTradeItemGradeLine({ title: "Ungraded item", certificationCompany: "PSA", grade: null })).toBeNull();
    expect(getTradeItemFactLine({ title: "Public item", facts: [{ label: "Year", value: "1982" }, { label: "Grading Company", value: "PSA" }, { label: "Grade", value: "10" }] })).toBe("1982");
    expect(exporterSource).toContain("const badge = getTradeGradeBadgeStyle(item.category)");
    expect(exporterSource).toContain("drawRoundedRect(context, captionX - badgeWidth / 2");
  });

  it("uses real category environments on each trade side while keeping actual item photos contained", () => {
    expect(Object.keys(TRADE_ALERT_THEME_IMAGE_URLS)).toEqual(expect.arrayContaining([
      "sports-baseball", "sports-football", "sports-basketball", "sports-hockey", "sports-collectibles",
      "comics", "pokemon", "vintage_toys", "video_games", "coins", "stamps", "movies", "music", "autographs", "disney_pins", "collectibles",
    ]));
    expect(TRADE_ALERT_STAGE_IMAGE_URLS).toEqual(expect.objectContaining({
      "sports-baseball-football": expect.stringContaining("sports-baseball-football-stage"),
      "sports-baseball": expect.stringContaining("sports-baseball-stage"),
      "sports-football": expect.stringContaining("sports-football-stage"),
      comics: expect.stringContaining("comics-stage"),
      "mixed-collectibles": expect.stringContaining("mixed-collectibles-stage"),
    }));
    expect(exporterSource).toContain("function drawCinematicTradeScene");
    expect(exporterSource).toContain("function drawCinematicTradeItem");
    expect(exporterSource).toContain("function getTradeAlertStageKey");
    expect(exporterSource).toContain("function getTradeSceneSeed");
    expect(exporterSource).toContain("The curated stage is already a complete environment");
    expect(exporterSource).not.toContain("drawEnvironmentSide");
    expect(exporterSource).not.toContain("drawCoverImage(context, stageImage, 0, 0, width, height, 0.5)");
    expect(exporterSource).toContain("drawContainedImage(context, image, centerX - imageWidth / 2");
    expect(exporterSource).toContain("tradeThemeImageUrls");
    expect(exporterSource).toContain("context.rect(0, 0, split, height)");
    expect(exporterSource).toContain("context.rect(split, 0, split, height)");
    expect(exporterSource).toContain("drawCoverImage(context, leftScene, 0, 0, split, height, 0.04, false)");
    expect(exporterSource).toContain("drawCoverImage(context, rightScene, split, 0, split, height, 0.04, true)");
    expect(exporterSource).not.toContain("TRADE_ALERT_FOREGROUND_IMAGE_URLS");
    expect(exporterSource).toContain("tradeStageImageUrls");
    expect(exporterSource).toContain("drawCinematicTradeScene(");
    expect(exporterSource).toContain("const strokeWidth = Math.min(width * 0.92");
    expect(exporterSource).toContain("const strokeHeight = 174 * scale");
    expect(exporterSource).toContain("0.35 * scale");
  });

  it("uses one genuine category scene for uniform trades and a neutral crossover scene for mixed-category trades", () => {
    expect(getTradeAlertStageKey([{ category: "comics", title: "Star Wars" }, { category: "comics", title: "Daredevil" }])).toBe("comics");
    expect(getTradeAlertStageKey([{ category: "comics", title: "Star Wars" }, { category: "vintage_toys", title: "Action figure" }])).toBe("mixed-collectibles");
    expect(getTradeAlertStageKey([{ category: "sports_cards", title: "1982 Topps", visualHints: ["baseball"] }, { category: "sports_cards", title: "1989 Score", visualHints: ["football"] }])).toBe("sports-baseball-football");
  });

  it("centers the Tradebilia lockup above the brush heading and groups multiple items by trade side", () => {
    expect(exporterSource).toContain("drawBrand(context, logo, (width - logoWidth) / 2, 0, logoWidth, 72 * scale");
    expect(exporterSource).toContain('const groupLeft = side === "left" ? width * 0.055 : width * 0.565');
    expect(exporterSource).toContain('images[entry.index] ?? null');
  });

  it("routes every completed-trade platform through the cinematic composition", () => {
    expect(exporterSource).toContain("drawCompletedTradeLandscape");
    expect(exporterSource).toContain("drawCompletedTradeInstagram");
    expect(exporterSource).toContain("drawCompletedTradeTall");
    expect(exporterSource).toContain("drawCompletedTradeCinematic(context, draft, platform");
    expect(exporterSource).toContain('drawCompletedTradeCinematic(context, draft, "Instagram"');
    expect(exporterSource).toContain("const isTall = platform === \"Instagram\" || platform === \"Pinterest\"");
    expect(exporterSource).toContain("const isPinterest = platform === \"Pinterest\"");
    expect(exporterSource).toContain("function drawCinematicTradeGroup");
    expect(exporterSource).toContain("drawCinematicTradeGroup(context, offered");
    expect(exporterSource).toContain("drawCinematicTradeGroup(context, requested");
  });
});
