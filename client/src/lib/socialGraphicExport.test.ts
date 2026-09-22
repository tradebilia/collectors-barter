import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  getSocialGraphicExportFileName,
  getTradeAlertStageKey,
  getTradeItemFactLine,
  getTradeItemGradeLine,
  getHighValueBackgroundUrl,
  getHighValueItemReferenceKey,
  getHighValueSubjectReferenceKey,
  getHighValueSecondaryPropUrl,
  getHighValueSecondaryVisualKey,
  HIGH_VALUE_ITEM_TYPE_BACKGROUND_URLS,
  HIGH_VALUE_ITEM_REFERENCE_BACKGROUND_URLS,
  HIGH_VALUE_SECONDARY_BACKGROUND_URLS,
  HIGH_VALUE_BRUSH_IMAGE_URL,
  SPORTS_CARD_SECONDARY_VISUAL_KEYS,
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
    expect(exporterSource).toContain("drawBackground(context, width, height");
    expect(exporterSource).toContain("getSocialPromotionItemTitle");
    expect(exporterSource).not.toContain("ORIGINAL IMAGE · FULLY SHOWN");
    expect(exporterSource).not.toContain("VIEW ITEM PROFILE");
  });

  it("routes high-value listings through the cinematic listing composition with a phrase footer", () => {
    expect(exporterSource).toContain("function drawCinematicListingHeader");
    expect(exporterSource).toContain("function drawTradeValuePlaque");
    expect(exporterSource).toContain("function drawHighValueListingCinematic");
    expect(exporterSource).toContain('drawHighValueListingCinematic(context, draft, platform');
    expect(exporterSource).toContain('"NEW HIGH-VALUE LISTING"');
    expect(HIGH_VALUE_BRUSH_IMAGE_URL).toContain("NewHighValueListing");
    expect(exporterSource).toContain("isFinishedListingBanner");
    expect(exporterSource).toContain("full source is intentionally drawn");
    expect(exporterSource).toContain("const strokeWidth = Math.min(width * 0.76, 912 * scale)");
    expect(exporterSource).toContain("const bannerY = 2 * scale");
    expect(exporterSource).toContain("const strokeHeight = 174 * scale");
    expect(exporterSource).toContain("const logoWidth = 700 * scale");
    expect(exporterSource).toContain("const strokeY = 62 * scale");
    expect(exporterSource).toContain("const sourceY = brushImage.naturalHeight * 0.11");
    expect(exporterSource).toContain("const bannerAngle = (-2.25 * Math.PI) / 180");
    expect(exporterSource).toContain("context.rotate(bannerAngle)");
    expect(exporterSource).toContain('drawCrispText(context, getSocialFooterPhrase(draft.id, platform).toUpperCase()');
    expect(exporterSource).not.toContain('"VIEW THIS ITEM ON TRADEBILIA"');
  });

  it("protects the left item zone and keeps tall listing details on the right", () => {
    expect(exporterSource).toContain("function drawHighValueBackground");
    expect(exporterSource).toContain("const itemZone = context.createLinearGradient");
    expect(exporterSource).toContain("drawBackground(context, width, height, background, 0.08)");
    expect(exporterSource).toContain("const panelX = isTall ? width * 0.40 : width * 0.37");
    expect(exporterSource).toContain("const panelWidth = isTall ? width * 0.56 : width * 0.43");
    expect(exporterSource).not.toContain("rgba(3, 12, 30, 0.97)");
    expect(exporterSource).toContain("const imageWidth = Math.min(width * 0.38, 410 * scale)");
    expect(exporterSource).toContain("const detailX = padding + imageWidth + 28 * scale");
    expect(exporterSource).toContain("drawMediaFrame(context, itemImage, padding, imageY, imageWidth, imageHeight");
    expect(exporterSource).toContain("drawCompleteFittedTitle(context, itemTitle, detailX, detailY, detailWidth");
    expect(exporterSource).toContain("drawTradeValuePlaque(context, value, detailX, plaqueY, detailWidth");
    expect(exporterSource).toContain("const imageY = 300 * scale");
    expect(exporterSource).toContain("const detailWidth = 390 * scale");
  });

  it("centers a compact Trade Value plaque around the label and value instead of the full detail column", () => {
    expect(exporterSource).toContain("const plaqueWidth = Math.min(width, Math.max(valueWidth + horizontalPadding * 2, labelWidth + horizontalPadding * 3.15))");
    expect(exporterSource).toContain("const plaqueX = x + (width - plaqueWidth) / 2");
    expect(exporterSource).toContain("const plaqueHeight = 90 * scale");
    expect(exporterSource).toContain("const textBlockTop = y + (height - textBlockHeight) / 2");
    expect(exporterSource).toContain("const opticalVerticalOffset = 6 * scale");
    expect(exporterSource).toContain("const labelBaselineY = textBlockTop + labelAscent + opticalVerticalOffset");
    expect(exporterSource).toContain("const valueBaselineY = textBlockTop + labelHeight + textGap + valueAscent + opticalVerticalOffset");
    expect(exporterSource).toContain("drawCrispText(context, value, plaqueX + plaqueWidth / 2, valueBaselineY)");
    expect(exporterSource).toContain("const footerClearance = (isTall ? 38 : 18) * scale");
    expect(exporterSource).toContain("const plaqueBottomLimit = footerBaselineY - footerClearance");
    expect(exporterSource).toContain("plaqueBottomLimit - plaqueHeight");
  });

  it("selects a specific high-value environment from category and item type", () => {
    expect(Object.keys(HIGH_VALUE_ITEM_TYPE_BACKGROUND_URLS)).toHaveLength(51);
    expect(getHighValueBackgroundUrl(promotionDraft.promotion)).toBe(HIGH_VALUE_ITEM_REFERENCE_BACKGROUND_URLS.michael_jordan);
    expect(getHighValueBackgroundUrl({ ...promotionDraft.promotion!, generatedBackgroundUrl: "/manus-storage/generated/high-value-jordan.png" })).toBe("/manus-storage/generated/high-value-jordan.png");
    expect(getHighValueBackgroundUrl({ ...promotionDraft.promotion!, category: null, itemType: null, generatedBackgroundUrl: "/manus-storage/generated/high-value-unclassified.png" })).toBe("/manus-storage/generated/high-value-unclassified.png");
    expect(getHighValueBackgroundUrl({ ...promotionDraft.promotion!, generatedBackgroundUrl: "https://untrusted.example/scene.png" })).toBe(HIGH_VALUE_ITEM_REFERENCE_BACKGROUND_URLS.michael_jordan);
    expect(getHighValueBackgroundUrl({ ...promotionDraft.promotion!, itemTitle: "Miles Davis Kind of Blue LP", category: "Music", itemType: "vinyl_record" })).toContain("music-vinyl-record");
    expect(getHighValueBackgroundUrl({ ...promotionDraft.promotion!, itemTitle: "The Beatles Sgt Pepper LP", category: "Music", itemType: "vinyl_record" })).toBe(HIGH_VALUE_ITEM_REFERENCE_BACKGROUND_URLS.beatles_sgt_pepper);
    expect(getHighValueBackgroundUrl({ ...promotionDraft.promotion!, itemTitle: "The Beatles Sgt Pepper Cassette", category: "Music", itemType: "cassette_tape" })).toBe(HIGH_VALUE_ITEM_REFERENCE_BACKGROUND_URLS.beatles_sgt_pepper);
    expect(getHighValueBackgroundUrl({ ...promotionDraft.promotion!, itemTitle: "The Beatles Sgt Pepper Console", category: "Video Games", itemType: "console" })).toBe(HIGH_VALUE_ITEM_REFERENCE_BACKGROUND_URLS.beatles_sgt_pepper);
    expect(getHighValueBackgroundUrl({ ...promotionDraft.promotion!, itemTitle: "Transformers Megatron G1", category: "Vintage Toys", itemType: "action_figure" })).toBe(HIGH_VALUE_ITEM_REFERENCE_BACKGROUND_URLS.megatron_transformers);
    expect(getHighValueBackgroundUrl({ ...promotionDraft.promotion!, itemTitle: "DareDevil 1st Electra", category: "Comics", itemType: "single_comic" })).toBe(HIGH_VALUE_ITEM_REFERENCE_BACKGROUND_URLS.daredevil_elektra);
    expect(getHighValueBackgroundUrl({ ...promotionDraft.promotion!, itemTitle: "Rickey Henderson Rookie", category: "Sports Cards", itemType: "single_card" })).toBe(HIGH_VALUE_ITEM_REFERENCE_BACKGROUND_URLS.rickey_henderson);
    expect(getHighValueBackgroundUrl({ ...promotionDraft.promotion!, itemTitle: "Vintage Teddy Bear", category: "Vintage Toys", itemType: "plush_toy" })).toContain("vintage-toys-plush-toy");
    expect(getHighValueBackgroundUrl({ ...promotionDraft.promotion!, itemTitle: "Nintendo NES Console", category: "Video Games", itemType: "console" })).toContain("video-games-console");
    expect(getHighValueBackgroundUrl({ ...promotionDraft.promotion!, itemTitle: "Unknown Music Format", category: "Music", itemType: "other_music_format" })).toContain("music-other-format");
    expect(getHighValueBackgroundUrl({ ...promotionDraft.promotion!, itemTitle: "Disney Chip Pin", category: "Disney Pins", itemType: "individual_pin" })).toBe(HIGH_VALUE_ITEM_TYPE_BACKGROUND_URLS["disney-pins-individual-pin"]);
    expect(HIGH_VALUE_ITEM_TYPE_BACKGROUND_URLS["disney-pins-individual-pin"]).toContain("disney-single-pin-category-v3");
    expect(HIGH_VALUE_ITEM_TYPE_BACKGROUND_URLS["pokemon-single-card"]).toContain("pokemon-single-card-category-v3");
    expect(HIGH_VALUE_ITEM_TYPE_BACKGROUND_URLS["autographs-signed-item"]).toContain("autographs-signed-item-category-v3");
    expect(HIGH_VALUE_ITEM_TYPE_BACKGROUND_URLS["stamps-single-stamp"]).toContain("stamps-single-stamp-category-v3");
    expect(HIGH_VALUE_SECONDARY_BACKGROUND_URLS.hockey).toContain("hockey-single-card-category-v3");
    expect(HIGH_VALUE_ITEM_TYPE_BACKGROUND_URLS["coins-single-coin"]).toContain("coins-single-coin-neutral-v2");
    expect(getHighValueBackgroundUrl({ ...promotionDraft.promotion!, itemTitle: "US Paper Money", category: "Coins", itemType: "paper_money_banknotes" })).toContain("coins-paper-money");
    expect(getHighValueBackgroundUrl({ ...promotionDraft.promotion!, itemTitle: "Pokémon Collection", category: "Pokémon", itemType: "unknown" })).toContain("pokemon-tcg-collector");
    expect(exporterSource).toContain("overlayAlpha = 0.66");
    expect(exporterSource).toContain("highValueBackground || heroBackground");
  });

  it("uses verified Sport-specific variants only after resolving the Sports Card item type", () => {
    expect(getHighValueItemReferenceKey(promotionDraft.promotion)).toBe("michael_jordan");
    expect(getHighValueSubjectReferenceKey({ ...promotionDraft.promotion!, itemTitle: "The Beatles Sgt Pepper LP", category: "Music", itemType: "vinyl_record" })).toBe("beatles_sgt_pepper");
    expect(getHighValueSubjectReferenceKey({ ...promotionDraft.promotion!, itemTitle: "Transformers Megatron G1", category: "Vintage Toys", itemType: "action_figure" })).toBe("megatron_transformers");
    expect(getHighValueSubjectReferenceKey({ ...promotionDraft.promotion!, itemTitle: "DareDevil 1st Electra", category: "Comics", itemType: "single_comic" })).toBe("daredevil_elektra");
    expect(getHighValueBackgroundUrl(promotionDraft.promotion)).toBe(HIGH_VALUE_ITEM_REFERENCE_BACKGROUND_URLS.michael_jordan);
    expect(getHighValueSecondaryVisualKey({ ...promotionDraft.promotion!, facts: [{ label: "Sport", value: "Baseball" }] })).toBe("baseball");
    expect(getHighValueBackgroundUrl({ ...promotionDraft.promotion!, itemTitle: "1989 Topps Baseball Card", facts: [{ label: "Sport", value: "Baseball" }] })).toContain("sports-baseball-stage");
    expect(getHighValueBackgroundUrl({ ...promotionDraft.promotion!, itemTitle: "1989 Racing Card", facts: [{ label: "Sport", value: "Racing" }] })).toBe(HIGH_VALUE_ITEM_TYPE_BACKGROUND_URLS["sports-cards-single-card"]);
    expect(getHighValueBackgroundUrl({ ...promotionDraft.promotion!, itemTitle: "Star Wars #1", category: "Comics", itemType: "single_comic", facts: [{ label: "Publisher", value: "Marvel" }] })).toBe(HIGH_VALUE_ITEM_TYPE_BACKGROUND_URLS["comics-single-comic"]);
    expect(getHighValueBackgroundUrl({ ...promotionDraft.promotion!, itemTitle: "Alex Ross Original Art", category: "Comics", itemType: "original_art", facts: [{ label: "Artist Name", value: "Alex Ross" }] })).toContain("comics-original-art");
    expect(getHighValueBackgroundUrl({ ...promotionDraft.promotion!, itemTitle: "Miles Davis Kind of Blue LP", category: "Music", itemType: "vinyl_record", facts: [{ label: "Artist / Performer", value: "Miles Davis" }] })).toContain("music-vinyl-record");
    expect(getHighValueSecondaryPropUrl({ ...promotionDraft.promotion!, facts: [{ label: "Sport", value: "Football" }] })).toBeNull();
    expect(exporterSource).toContain("return null;");
    expect(exporterSource).toContain("drawCoverImage(context, heroBackground, 0, 0, width, height, 0.5)");
    expect(exporterSource).toContain("HIGH_VALUE_SAFE_SPORT_VARIANT_KEYS");
    expect(exporterSource).toContain('context.filter = "blur(24px)"');
    expect(exporterSource).toContain("drawContainedImage(context, heroBackground, 0, 0, width, height)");
    expect(exporterSource).toContain("const plaqueY = plaqueBottomLimit - plaqueHeight");
  });

  it("covers every Sports Cards sport dropdown value", () => {
    expect(Object.keys(SPORTS_CARD_SECONDARY_VISUAL_KEYS)).toEqual([
      "baseball", "basketball", "football", "hockey", "soccer", "racing", "wrestling", "golf", "mma", "tennis", "multi sport", "mixed", "other",
    ]);
    for (const [sport, visualKey] of Object.entries(SPORTS_CARD_SECONDARY_VISUAL_KEYS)) {
      expect(getHighValueSecondaryVisualKey({ ...promotionDraft.promotion!, facts: [{ label: "Sport", value: sport }] })).toBe(visualKey);
    }
  });

  it("uses platform and Pokémon set-family dropdown facts when available", () => {
    expect(getHighValueSecondaryVisualKey({ ...promotionDraft.promotion!, category: "Video Games", itemType: "game", facts: [{ label: "Platform", value: "PlayStation" }] })).toBe("video_playstation");
    expect(getHighValueSecondaryVisualKey({ ...promotionDraft.promotion!, category: "Video Games", itemType: "console", facts: [{ label: "Platform", value: "NES" }] })).toBe("video_nintendo");
    expect(getHighValueSecondaryVisualKey({ ...promotionDraft.promotion!, category: "Pokémon", itemType: "single_card", facts: [{ label: "Set Name", value: "Wizards of the Coast" }] })).toBe("pokemon_vintage");
    expect(getHighValueSecondaryVisualKey({ ...promotionDraft.promotion!, category: "Pokémon", itemType: "single_card", facts: [{ label: "Set Name", value: "Scarlet & Violet" }] })).toBe("pokemon_modern");
  });

  it("uses non-displayed Sport hints when a single-card fact layout omits Sport", () => {
    expect(getHighValueSecondaryVisualKey({
      ...promotionDraft.promotion!,
      facts: [{ label: "Year", value: "1989" }, { label: "Grading Company", value: "PSA" }, { label: "Grade", value: "10" }],
      visualHints: ["Ken Griffey Jr", "Baseball", "Upper Deck"],
    })).toBe("baseball");
    expect(getHighValueSecondaryPropUrl({
      ...promotionDraft.promotion!,
      facts: [{ label: "Year", value: "1988" }, { label: "Grading Company", value: "PSA" }, { label: "Grade", value: "9" }],
      visualHints: ["Barry Sanders", "Football", "Score"],
    })).toBeNull();
  });

  it("routes every current high-value opportunity into a category, item-type, or secondary-specific environment", () => {
    const currentInventory = [
      { itemTitle: "1986 OPC Hockey Box BBCE", category: "sports_cards", itemType: "unopened_product", visualHints: ["Hockey"], facts: [], environmentKey: "hockey" },
      { itemTitle: "McFarlane King Spawn Original Art", category: "comics", itemType: "original_art", visualHints: ["Image", "Cover Art"], facts: [{ label: "Artist Name", value: "Todd McFarlane" }], environmentKey: "comics-original-art" },
      { itemTitle: "The Beatles Sgt Pepper's Lonely Hearts Club Band Stereo LP Graded 8", category: "music", itemType: "vinyl_record", visualHints: ["The Beatles", "Rock"], facts: [{ label: "Artist / Performer", value: "The Beatles" }], environmentKey: "beatles_sgt_pepper" },
      { itemTitle: "1986 Fleer Michael Jordan Rookie PSA 10", category: "sports_cards", itemType: "single_card", visualHints: ["Basketball"], facts: [], environmentKey: "michael_jordan" },
      { itemTitle: "Star Wars #1", category: "comics", itemType: "single_comic", visualHints: ["Marvel"], facts: [{ label: "Publisher", value: "Marvel" }], environmentKey: "comics-single-comic" },
      { itemTitle: "Barry Sanders Score Rookie", category: "sports_cards", itemType: "single_card", visualHints: ["Football"], facts: [], environmentKey: "barry_sanders" },
      { itemTitle: "Wayne Gretzky Rookie", category: "sports_cards", itemType: "single_card", visualHints: ["Hockey"], facts: [], environmentKey: "wayne_gretzky" },
      { itemTitle: "Rickey Henderson Rookie", category: "sports_cards", itemType: "single_card", visualHints: ["Baseball"], facts: [], environmentKey: "rickey_henderson" },
      { itemTitle: "DareDevil 1st Electra", category: "comics", itemType: "single_comic", visualHints: ["Marvel"], facts: [{ label: "Publisher", value: "Marvel" }], environmentKey: "daredevil_elektra" },
      { itemTitle: "Ken Griffey Jr Upper Deck Rookie PSA 10", category: "sports_cards", itemType: "single_card", visualHints: ["Baseball"], facts: [], environmentKey: "ken_griffey_jr" },
      { itemTitle: "Transformers Megatron G1", category: "vintage_toys", itemType: "action_figure", visualHints: ["Hasbro", "Transformers"], facts: [{ label: "Brand", value: "Hasbro" }], environmentKey: "megatron_transformers" },
    ];

    for (const item of currentInventory) {
      const promotion = { ...promotionDraft.promotion!, ...item };
      const expectedEnvironment = HIGH_VALUE_ITEM_TYPE_BACKGROUND_URLS[item.environmentKey]
        || HIGH_VALUE_ITEM_REFERENCE_BACKGROUND_URLS[item.environmentKey]
        || HIGH_VALUE_SECONDARY_BACKGROUND_URLS[item.environmentKey];
      expect(getHighValueBackgroundUrl(promotion), item.itemTitle).toBe(expectedEnvironment);
      expect(getHighValueSecondaryPropUrl(promotion), item.itemTitle).toBeNull();
    }
  });

  it("uses comic publisher and movie format dropdown facts when available", () => {
    expect(getHighValueSecondaryVisualKey({ ...promotionDraft.promotion!, category: "Comics", itemType: "single_comic", facts: [{ label: "Publisher", value: "Marvel" }] })).toBe("comics_marvel");
    expect(getHighValueSecondaryVisualKey({ ...promotionDraft.promotion!, category: "Comics", itemType: "single_comic", facts: [{ label: "Publisher", value: "DC" }] })).toBe("comics_dc");
    expect(getHighValueSecondaryVisualKey({ ...promotionDraft.promotion!, category: "Movies", itemType: "individual_movie", facts: [{ label: "Format", value: "VHS" }] })).toBe("movie_vhs");
    expect(getHighValueSecondaryVisualKey({ ...promotionDraft.promotion!, category: "Movies", itemType: "individual_movie", facts: [{ label: "Format", value: "Blu-ray" }] })).toBe("movie_disc");
    expect(getHighValueSecondaryVisualKey({ ...promotionDraft.promotion!, category: "Movies", itemType: "individual_movie", facts: [{ label: "Format", value: "4K UHD" }] })).toBe("movie_4k");
  });

  it("uses the exact Autograph Category dropdown values", () => {
    for (const [category, visualKey] of Object.entries({ Sports: "autograph_sports", Entertainment: "autograph_entertainment", Historical: "autograph_historical", Music: "autograph_music", Other: "autograph_other" })) {
      expect(getHighValueSecondaryVisualKey({ ...promotionDraft.promotion!, category: "Autographs", itemType: "signed_item", facts: [{ label: "Autograph Category", value: category }] })).toBe(visualKey);
    }
  });

  it("routes Vintage Toys brand dropdown values into safe family environments", () => {
    expect(getHighValueSecondaryVisualKey({ ...promotionDraft.promotion!, category: "Vintage Toys", itemType: "action_figure", facts: [{ label: "Brand", value: "Hasbro" }] })).toBe("toys_hasbro");
    expect(getHighValueSecondaryVisualKey({ ...promotionDraft.promotion!, category: "Vintage Toys", itemType: "action_figure", facts: [{ label: "Brand", value: "Mattel" }] })).toBe("toys_mattel");
    expect(getHighValueSecondaryVisualKey({ ...promotionDraft.promotion!, category: "Vintage Toys", itemType: "lego", facts: [{ label: "Brand", value: "LEGO" }] })).toBe("toys_lego");
    expect(getHighValueSecondaryVisualKey({ ...promotionDraft.promotion!, category: "Vintage Toys", itemType: "plush_toy", facts: [{ label: "Brand", value: "Ty" }] })).toBe("toys_plush");
    expect(getHighValueSecondaryVisualKey({ ...promotionDraft.promotion!, category: "Vintage Toys", itemType: "model_kit", facts: [{ label: "Brand", value: "Revell" }] })).toBe("toys_other");
  });

  it("uses every Coins Set Type dropdown value", () => {
    for (const [setType, visualKey] of Object.entries({ "Proof Set": "coins_proof", "Mint Set": "coins_mint", "Commemorative Set": "coins_commemorative", "Type Set": "coins_type" })) {
      expect(getHighValueSecondaryVisualKey({ ...promotionDraft.promotion!, category: "Coins", itemType: "coin_set", facts: [{ label: "Set Type", value: setType }] })).toBe(visualKey);
    }
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
    expect(TRADE_ALERT_BRUSH_IMAGE_URL).toContain("TradeAlert_00575de4.webp");
    expect(TRADE_ALERT_BRUSH_IMAGE_URL).not.toContain("trade-alert-banner-paint-swipe");
    expect(exporterSource).toContain('The approved paint-swipe asset already contains the finished TRADE ALERT');
    expect(exporterSource).toContain("const imageY = isTall ? 280 * scale : 274 * scale");
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
    expect(exporterSource).toContain("const leftScene = leftEnvironment ?? leftStageImage");
    expect(exporterSource).toContain("const rightScene = rightEnvironment ?? rightStageImage");
    expect(exporterSource).toContain("drawCoverImage(context, leftScene, 0, 0, split, height, 0.04, false)");
    expect(exporterSource).toContain("drawCoverImage(context, rightScene, split, 0, split, height, 0.04, true)");
    expect(exporterSource).not.toContain("TRADE_ALERT_FOREGROUND_IMAGE_URLS");
    expect(exporterSource).toContain("tradeStageImageUrls");
    expect(exporterSource).toContain("drawCinematicTradeScene(");
    expect(exporterSource).toContain("const strokeWidth = Math.min(width * 0.92");
    expect(exporterSource).toContain("const strokeHeight = 174 * scale");
    expect(exporterSource).toContain("0.18 * scale");
    expect(exporterSource).toContain("Math.round(16 * scale)");
    expect(exporterSource).toContain("const logoWidth = 700 * scale");
  });

  it("uses one genuine category scene for uniform trades and a neutral crossover scene for mixed-category trades", () => {
    expect(getTradeAlertStageKey([{ category: "comics", title: "Star Wars" }, { category: "comics", title: "Daredevil" }])).toBe("comics");
    expect(getTradeAlertStageKey([{ category: "comics", title: "Star Wars" }, { category: "vintage_toys", title: "Action figure" }])).toBe("mixed-collectibles");
    expect(getTradeAlertStageKey([{ category: "sports_cards", title: "1982 Topps", visualHints: ["baseball"] }, { category: "sports_cards", title: "1989 Score", visualHints: ["football"] }])).toBe("sports-baseball-football");
  });

  it("centers the Tradebilia lockup above the brush heading and groups multiple items by trade side", () => {
    expect(exporterSource).toContain("drawBrand(context, logo, (width - logoWidth) / 2, -5 * scale, logoWidth, 94 * scale");
    expect(exporterSource).toContain("const logoWidth = 700 * scale");
    expect(exporterSource).toContain("height - 30 * scale");
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
    expect(exporterSource).toContain("const captionBottom = imageY + imageHeight * 1.14 + 58 * scale");
    expect(exporterSource).toContain("scale * (isTall ? 1.16 : 1)");
    expect(exporterSource).toContain("(isTall ? 22 : 15) * scale");
    expect(exporterSource).toContain("isPinterest ? captionBottom + 66 * scale : imageY + imageHeight * 0.68");
  });
});
