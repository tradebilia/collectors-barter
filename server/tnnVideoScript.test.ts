import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
import { invokeLLM } from "./_core/llm";
import {
  buildTnnScriptPrompt,
  countTnnScriptWords,
  draftTnnScript,
  getStructuredResponseText,
  TNN_ANCHOR_INTRODUCTION_ERROR,
  TNN_SCRIPT_MAX_COMPLETION_TOKENS,
  TNN_SELECTED_ITEM_COVERAGE_ERROR,
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
  durationSeconds: 45 as const,
  anchorMode: "duo" as const,
  sellerName: "Morgan Seller",
  buyerName: "Taylor Buyer",
  cashOnly: false,
  selectedItems: [
    { title: "1989 Nintendo Game", category: "Video Games", facts: [{ label: "Platform", value: "NES" }] },
    { title: "PSA 9 Trading Card", certificationCompany: "PSA", grade: "9", facts: [{ label: "Year", value: "1986" }] },
  ],
  additionalItemsCount: 1,
  tickerText: "WWW.Tradebilia.com",
};

const validScript = "Breaking News from Tradebilia. I'm Max Tradebloski with the TNN Network, joined by Sidney Tradewell. Tonight, Morgan Seller and Taylor Buyer have completed a collector trade featuring 1989 Nintendo Game and PSA 9 Trading Card. The exchange highlights a classic NES collectible alongside a 1986 graded card, with each selected piece presented as part of this completed collector transaction. I'm Sidney Tradewell. Additional collector items changed hands as part of the completed transaction. This is another moment for collectors to celebrate thoughtful exchanges and the shared passion behind every item. Tradebilia.";
const mockedInvokeLLM = vi.mocked(invokeLLM);

const responseFor = (script: string) => ({
  id: "test",
  created: 0,
  model: "gpt-5-mini",
  choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant" as const, content: JSON.stringify({ script }) } }],
});

beforeEach(() => {
  mockedInvokeLLM.mockReset();
});

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
      durationSeconds: 45,
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
    expect(prompt).toContain("the TNN Network");
    expect(prompt).toContain("trade-bil-lee-uh");
    expect(prompt).toContain("Max Tradebloski and Sidney Tradewell");
    expect(prompt).toContain('"I\'m Max Tradebloski" or "I’m Max Tradebloski" or "I am Max Tradebloski"');
    expect(prompt).toContain('"I\'m Sidney Tradewell" or "I’m Sidney Tradewell" or "I am Sidney Tradewell"');
    expect(prompt).toContain("names must never be proposed as on-screen text");
    expect(prompt).toContain("State every approved selected item title exactly as written");
    expect(prompt).toContain("Never invent provenance, rarity, condition, prices, values");
    expect(prompt).toContain("Additional collector items changed hands");
    expect(prompt).toContain("WWW.Tradebilia.com");
    expect(validScript.endsWith("Tradebilia.")).toBe(true);
  });

  it("accepts a bounded compliant script and rejects private or financial details", () => {
    const validated = validateTnnScriptDraft(validScript, input);
    expect(validated.wordCount).toBeGreaterThanOrEqual(80);
    expect(validated.wordCount).toBeLessThanOrEqual(100);
    expect(validated.estimatedSpeechSeconds).toBeGreaterThan(0);
    expect(validateTnnScriptDraft(validScript.replace("I'm Max Tradebloski", "I’m Max Tradebloski").replace("I'm Sidney Tradewell", "I’m Sidney Tradewell"), input)).toMatchObject({ script: expect.stringContaining("I’m Max Tradebloski") });
    expect(() => validateTnnScriptDraft(validScript.replace("collector trade", "$1,200 collector trade"), input)).toThrow(/disallowed/i);
    expect(() => validateTnnScriptDraft(validScript.replace("Additional collector items changed hands as part of the completed transaction. ", ""), input)).toThrow(/acknowledge/i);
    expect(() => validateTnnScriptDraft(validScript.replace("PSA 9 Trading Card", "graded card"), input)).toThrow(TNN_SELECTED_ITEM_COVERAGE_ERROR);
    expect(() => validateTnnScriptDraft(validScript.replace("the TNN Network", "TNN"), input)).toThrow(/TNN Network/i);
    expect(() => validateTnnScriptDraft(validScript.replace("I'm Sidney Tradewell. ", ""), input)).toThrow(/every selected anchor/i);
  });

  it("uses minimal reasoning and a sufficient completion budget, accepting a documented text-part response", () => {
    const source = readFileSync(new URL("./tnnVideoScript.ts", import.meta.url), "utf8");
    expect(TNN_SCRIPT_MAX_COMPLETION_TOKENS).toBe(700);
    expect(source).toContain('reasoning: { effort: "minimal" }');
    expect(source).toContain("max_completion_tokens: TNN_SCRIPT_MAX_COMPLETION_TOKENS");
    expect(getStructuredResponseText([{ type: "text", text: JSON.stringify({ script: validScript }) }])).toBe(JSON.stringify({ script: validScript }));
    expect(getStructuredResponseText(undefined)).toBeNull();
  });

  it("runs one corrective script-only retry when, and only when, the first draft omits a selected title", async () => {
    const incompleteButOtherwiseCompliant = validScript
      .replace("1989 Nintendo Game and PSA 9 Trading Card", "a video game and a graded trading card");
    mockedInvokeLLM
      .mockResolvedValueOnce(responseFor(incompleteButOtherwiseCompliant) as any)
      .mockResolvedValueOnce(responseFor(validScript) as any);

    await expect(draftTnnScript(input)).resolves.toMatchObject({ script: validScript });
    expect(mockedInvokeLLM).toHaveBeenCalledTimes(2);
    const [initial, corrective] = mockedInvokeLLM.mock.calls.map(([request]) => request);
    expect(initial.messages).toHaveLength(2);
    expect(corrective.messages).toHaveLength(3);
    expect(corrective.messages[2]).toMatchObject({
      content: expect.stringContaining("1989 Nintendo Game | PSA 9 Trading Card"),
    });
  });

  it("runs one corrective script-only retry when the first 45-second draft is too short", async () => {
    const shortButOtherwiseCompliant = "Breaking News from Tradebilia. I'm Max Tradebloski with the TNN Network, joined by Sidney Tradewell. Morgan Seller and Taylor Buyer completed a collector trade featuring 1989 Nintendo Game and PSA 9 Trading Card. I'm Sidney Tradewell. Additional collector items changed hands as part of the completed transaction. Tradebilia.";
    expect(countTnnScriptWords(shortButOtherwiseCompliant)).toBeLessThan(80);
    mockedInvokeLLM
      .mockResolvedValueOnce(responseFor(shortButOtherwiseCompliant) as any)
      .mockResolvedValueOnce(responseFor(validScript) as any);

    await expect(draftTnnScript(input)).resolves.toMatchObject({ script: validScript });
    expect(mockedInvokeLLM).toHaveBeenCalledTimes(2);
    const [, corrective] = mockedInvokeLLM.mock.calls.map(([request]) => request);
    expect(corrective.messages[2]).toMatchObject({
      content: expect.stringContaining("must contain 80-100 spoken words"),
    });
  });

  it("runs one corrective script-only retry when a duo draft omits one anchor self-introduction", async () => {
    const missingMaxIntroduction = validScript.replace("I'm Max Tradebloski with the TNN Network, joined by Sidney Tradewell.", "Max Tradebloski reports for the TNN Network, joined by Sidney Tradewell.");
    expect(() => validateTnnScriptDraft(missingMaxIntroduction, input)).toThrow(TNN_ANCHOR_INTRODUCTION_ERROR);
    mockedInvokeLLM
      .mockResolvedValueOnce(responseFor(missingMaxIntroduction) as any)
      .mockResolvedValueOnce(responseFor(validScript) as any);

    await expect(draftTnnScript(input)).resolves.toMatchObject({ script: validScript });
    expect(mockedInvokeLLM).toHaveBeenCalledTimes(2);
    const [, corrective] = mockedInvokeLLM.mock.calls.map(([request]) => request);
    expect(corrective.messages[2]).toMatchObject({
      content: expect.stringContaining('"I\'m Max Tradebloski" or "I’m Max Tradebloski" or "I am Max Tradebloski"'),
    });
  });
});
