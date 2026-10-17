import { describe, expect, it } from "vitest";
import {
  buildTnnScriptPrompt,
  countTnnScriptWords,
  validateTnnScriptDraft,
} from "./tnnVideoScript";
import {
  TNN_MIN_COMPLETED_TRADE_VALUE,
  buildTnnCompletedTradeVideoPlan,
  chooseNextTnnAnchor,
  isTnnEligibleCompletedTrade,
  withTnnVideoScript,
} from "../client/src/lib/socialContentManager";

const input = {
  durationSeconds: 30 as const,
  anchorMode: "duo" as const,
  sellerName: "Morgan Seller",
  buyerName: "Taylor Buyer",
  cashOnly: false,
  selectedItems: [
    { title: "1989 Nintendo Game", category: "Video Games", facts: [{ label: "Platform", value: "NES" }] },
    { title: "PSA 9 Trading Card", certificationCompany: "PSA", grade: "9", facts: [{ label: "Year", value: "1986" }] },
  ],
  additionalItemsCount: 1,
  tickerText: "Where collectors connect.",
};

const validScript = "Breaking News from Tradebilia. TNN reports that Morgan Seller and Taylor Buyer have completed a collector trade featuring 1989 Nintendo Game and a PSA 9 Trading Card. The selected pieces highlight NES and 1986 collector context for this memorable exchange. Additional collector items changed hands as part of the completed transaction. Tradebilia brings collectors together. Where collectors connect.";

describe("TNN completed-trade video policy", () => {
  it("requires an aggregate completed-trade value of at least $1,000 before the TNN studio is available", () => {
    expect(isTnnEligibleCompletedTrade({ tradeId: 44, estimatedValue: TNN_MIN_COMPLETED_TRADE_VALUE } as any)).toBe(true);
    expect(isTnnEligibleCompletedTrade({ tradeId: 44, estimatedValue: TNN_MIN_COMPLETED_TRADE_VALUE - 1 } as any)).toBe(false);
    expect(isTnnEligibleCompletedTrade({ tradeId: null, estimatedValue: TNN_MIN_COMPLETED_TRADE_VALUE + 1 } as any)).toBe(false);
  });

  it("uses the agreed solo alternation and occasional duo-report schedule", () => {
    expect(chooseNextTnnAnchor("max", 0.4)).toBe("sidney");
    expect(chooseNextTnnAnchor("sidney", 0.4)).toBe("max");
    expect(chooseNextTnnAnchor("max", 0.1)).toBe("duo");
  });

  it("builds a 16:9 plan with selected items and generic acknowledgement of the remainder", () => {
    const plan = buildTnnCompletedTradeVideoPlan({
      ...input,
      tradeItems: [...input.selectedItems, { title: "Comic Book" }, { title: "Coin" }],
      selectedItemIndexes: [0, 2],
      now: "2026-10-17T12:00:00.000Z",
    });
    expect(plan).toMatchObject({
      format: "16:9",
      durationSeconds: 30,
      anchorNames: ["Max Tradebloski", "Sidney Tradewell"],
      sellerName: "Morgan Seller",
      buyerName: "Taylor Buyer",
      additionalItemsCount: 2,
      scriptStatus: "not-drafted",
      generationAttempt: 0,
      generationStatus: "not-started",
      videoReviewStatus: "not-ready",
    });
    expect(plan.selectedItems.map((item) => item.title)).toEqual(["1989 Nintendo Game", "Comic Book"]);
    const withScript = withTnnVideoScript(plan, validScript, 1);
    expect(withScript.scriptStatus).toBe("draft-ready");
    expect(withScript.scriptWordCount).toBe(countTnnScriptWords(validScript));
  });
});

describe("TNN fact-locked script contract", () => {
  it("instructs the model to use a TNN newsroom, preserve privacy, and avoid on-screen names or values", () => {
    const prompt = buildTnnScriptPrompt(input);
    expect(prompt).toContain("Tradebilia News Network");
    expect(prompt).toContain("Max Tradebloski and Sidney Tradewell");
    expect(prompt).toContain("names must never be proposed as on-screen text");
    expect(prompt).toContain("Never invent provenance, rarity, condition, prices, values");
    expect(prompt).toContain("Additional collector items changed hands");
    expect(prompt).toContain("Where collectors connect.");
  });

  it("accepts a bounded compliant script and rejects private or financial details", () => {
    const validated = validateTnnScriptDraft(validScript, input);
    expect(validated.wordCount).toBeGreaterThanOrEqual(36);
    expect(validated.wordCount).toBeLessThanOrEqual(60);
    expect(validated.estimatedSpeechSeconds).toBeGreaterThan(0);
    expect(() => validateTnnScriptDraft(validScript.replace("collector trade", "$1,200 collector trade"), input)).toThrow(/disallowed/i);
    expect(() => validateTnnScriptDraft(validScript.replace("Additional collector items changed hands as part of the completed transaction. ", ""), input)).toThrow(/acknowledge/i);
  });
});
