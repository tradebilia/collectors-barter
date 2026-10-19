import { describe, expect, it } from "vitest";
import {
  TNN_DUO_OPENING_STYLES,
  TNN_DUO_OPENING_STYLE_VALUES,
  TNN_HOMEPAGE_PHRASES,
  TNN_HOMEPAGE_TAGLINE_IDS,
  TNN_HOMEPAGE_TAGLINES,
  TNN_NETWORK_SPOKEN_NAME,
  TNN_TRADEBILIA_PRONUNCIATION,
  TNN_VIDEO_DURATION_SECONDS,
  TNN_WEBSITE_TICKER,
  chooseTnnClosingTaglineId,
  chooseTnnDuoOpeningStyle,
  formatTnnGrade,
  formatTnnRequiredClosing,
  isTnnHomepageTaglineId,
  isTnnDuoOpeningStyle,
} from "./tnnVideoPolicy";

const approvedHomepagePhrases = [
  "Why buy or sell when you can trade?",
  "Trade what you have. Get what you want.",
  "Have it. Want it. Trade it.",
  "Your collection. Your trade. Your next find.",
  "Don’t buy it. Don’t sell it. Trade for it.",
  "Turn what you have into what you want.",
  "Collect. Connect. Trade.",
  "Where collectors trade what they love.",
  "One collection. Endless possibilities.",
  "The smarter way to collect.",
  "What’s yours could be someone else’s treasure.",
  "Trade your way to the collection you want",
];

describe("TNN video render policy", () => {
  it("locks the approved length, network wording, phonetic guide, and website ticker", () => {
    expect(TNN_VIDEO_DURATION_SECONDS).toBe(45);
    expect(TNN_WEBSITE_TICKER).toBe("www.Tradebilia.com");
    expect(TNN_NETWORK_SPOKEN_NAME).toBe("the TNN Network");
    expect(TNN_TRADEBILIA_PRONUNCIATION).toBe("trade-bil-lee-uh");
  });

  it("uses the exact ordered 12-tagline homepage loop as the only TNN closing source", () => {
    expect(TNN_HOMEPAGE_TAGLINE_IDS).toEqual([
      "why_buy_or_sell", "trade_what_you_have", "have_it_want_it", "your_collection",
      "dont_buy_or_sell", "turn_what_you_have", "collect_connect_trade", "where_collectors_trade",
      "one_collection", "smarter_way", "whats_yours", "trade_your_way",
    ]);
    expect(TNN_HOMEPAGE_PHRASES).toEqual(approvedHomepagePhrases);
    expect(TNN_HOMEPAGE_TAGLINE_IDS.map((id) => TNN_HOMEPAGE_TAGLINES[id])).toEqual(approvedHomepagePhrases);
  });

  it("resolves only approved closing taglines deterministically and ends every composed closing in Tradebilia", () => {
    expect(chooseTnnClosingTaglineId(0)).toBe("why_buy_or_sell");
    expect(chooseTnnClosingTaglineId(0.0834)).toBe("trade_what_you_have");
    expect(chooseTnnClosingTaglineId(0.999)).toBe("trade_your_way");
    expect(isTnnHomepageTaglineId("whats_yours")).toBe(true);
    expect(isTnnHomepageTaglineId("anything_else")).toBe(false);
    for (const taglineId of TNN_HOMEPAGE_TAGLINE_IDS) {
      const closing = formatTnnRequiredClosing(taglineId);
      expect(closing).toMatch(/Tradebilia\.$/);
      expect(closing).toContain(TNN_HOMEPAGE_TAGLINES[taglineId].replace(/[.!?]$/, ""));
    }
    expect(formatTnnRequiredClosing("trade_your_way")).toBe("Trade your way to the collection you want. Tradebilia.");
  });

  it("removes redundant trailing zeros from purely numeric grades across grading companies", () => {
    expect(formatTnnGrade("PSA", null, "10.00")).toBe("PSA 10");
    expect(formatTnnGrade("PSA", null, "9.0")).toBe("PSA 9");
    expect(formatTnnGrade("PSA", null, "7.5")).toBe("PSA 7.5");
    expect(formatTnnGrade("AFA", null, "80.00")).toBe("AFA 80");
    expect(formatTnnGrade("WATA", null, "9.6")).toBe("WATA 9.6");
    expect(formatTnnGrade(null, "Custom Grader", "8.50")).toBe("Custom Grader 8.5");
    expect(formatTnnGrade("WATA", null, "9.0 A")).toBe("WATA 9.0 A");
  });

  it("offers only approved fact-neutral duo openings and deterministically resolves random selections", () => {
    expect(TNN_DUO_OPENING_STYLE_VALUES).toEqual(["classic", "alongside", "joined", "here_with"]);
    expect(chooseTnnDuoOpeningStyle(0)).toBe("classic");
    expect(chooseTnnDuoOpeningStyle(0.25)).toBe("alongside");
    expect(chooseTnnDuoOpeningStyle(0.5)).toBe("joined");
    expect(chooseTnnDuoOpeningStyle(0.99)).toBe("here_with");
    expect(isTnnDuoOpeningStyle("joined")).toBe(true);
    expect(isTnnDuoOpeningStyle("freeform")).toBe(false);
    for (const style of TNN_DUO_OPENING_STYLE_VALUES) {
      const opening = TNN_DUO_OPENING_STYLES[style];
      expect(opening.maxLine).toBe("Breaking News from Tradebilia. I'm Max Tradebloski.");
      expect(opening.sidneyLine).toMatch(/^And I'm Sidney Tradewell[,.]/);
      expect(opening.script).toContain(opening.maxLine);
      expect(opening.script).toContain(opening.sidneyLine);
    }
    expect(TNN_DUO_OPENING_STYLES.alongside.sidneyLine).toBe("And I'm Sidney Tradewell, joining you from the TNN Network.");
  });
});
