import { describe, expect, it } from "vitest";
import { getTradeAlertThemeAssetKeys, getTradeAlertVisualHints, resolveTradeAlertTheme } from "../shared/tradeAlertThemes";

describe("Trade Alert visual theme resolver", () => {
  it("selects contextually appropriate sports themes without mixing unrelated sports", () => {
    expect(resolveTradeAlertTheme({ category: "sports_cards", itemType: "single_card", title: "1982 Topps Rickey Henderson Baseball Rookie", visualHints: ["Baseball"] }).key).toBe("sports-baseball");
    expect(resolveTradeAlertTheme({ category: "sports_cards", itemType: "single_card", title: "1989 Score Barry Sanders Rookie", visualHints: ["Football"] }).key).toBe("sports-football");
    expect(resolveTradeAlertTheme({ category: "sports_cards", itemType: "single_card", title: "1996 Topps Hockey Prospect", visualHints: ["Hockey"] }).key).toBe("sports-hockey");
  });

  it("uses format-aware environments for music and video-game items", () => {
    expect(resolveTradeAlertTheme({ category: "music", itemType: "vinyl_record", title: "First Pressing Album" }).key).toBe("music-vinyl");
    expect(resolveTradeAlertTheme({ category: "music", itemType: "cassette_tape", title: "Rare Tape" }).key).toBe("music-cassette");
    expect(resolveTradeAlertTheme({ category: "video_games", itemType: "game", title: "Nintendo NES Classic" }).key).toBe("video-games-retro");
    expect(resolveTradeAlertTheme({ category: "video_games", itemType: "console", title: "Modern Console" }).key).toBe("video-games-modern");
  });

  it("covers every active collectible category with a deterministic fallback", () => {
    const categories = ["comics", "pokemon", "vintage_toys", "video_games", "coins", "stamps", "movies", "music", "autographs", "disney_pins"];
    expect(categories.map((category) => resolveTradeAlertTheme({ category }).assetKey)).toEqual([
      "comics", "pokemon", "vintage_toys", "video_games", "coins", "stamps", "movies", "music", "autographs", "disney_pins",
    ]);
    expect(resolveTradeAlertTheme({ category: "unknown", title: "Uncategorized item" }).key).toBe("collectibles");
  });

  it("retains separate environment assets for mixed-category trades", () => {
    expect(getTradeAlertThemeAssetKeys([
      { category: "sports_cards", itemType: "single_card", title: "Baseball card", visualHints: ["Baseball"] },
      { category: "comics", itemType: "single_comic", title: "Key comic" },
      { category: "music", itemType: "vinyl_record", title: "Vinyl" },
    ])).toEqual(["sports_cards", "comics", "music"]);
  });

  it("extracts only public-safe visual hints from item metadata", () => {
    expect(getTradeAlertVisualHints({
      category: "sports_cards",
      itemType: "single_card",
      title: "Baseball rookie",
      itemDetails: { sport: "Baseball", playerName: "Example Player", privateNote: "Do not expose" },
    })).toEqual(["Baseball rookie", "single card", "Baseball", "Example Player"]);
  });
});
