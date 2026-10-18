import { describe, expect, it, vi, beforeEach } from "vitest";
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
import { invokeLLM } from "./_core/llm";
import {
  buildTnnScriptPrompt,
  countTnnScriptWords,
  createTnnScriptFactLock,
  draftTnnScript,
  flattenTnnScriptTurns,
  TNN_DUO_OPENING_ERROR,
  TNN_FACT_LOCK_ERROR,
  TNN_FINAL_CLOSING_ERROR,
  TNN_SCRIPT_MAX_COMPLETION_TOKENS,
  TNN_SELECTED_ITEM_COVERAGE_ERROR,
  TNN_UNSUPPORTED_ADDITIONAL_ITEMS_ERROR,
  validateTnnScriptDraft,
  verifyTnnScriptFactLock,
  type TnnScriptTurn,
} from "./tnnVideoScript";
import {
  buildTnnCompletedTradeVideoPlan,
  withTnnVideoScript,
} from "../client/src/lib/socialContentManager";
import { TNN_DUO_OPENING_STYLES, TNN_DUO_OPENING_STYLE_VALUES } from "../shared/tnnVideoPolicy";

const input = {
  durationSeconds: 45 as const,
  anchorMode: "duo" as const,
  duoOpeningStyle: "classic" as const,
  sellerName: "Morgan Seller",
  buyerName: "Taylor Buyer",
  cashOnly: false,
  selectedItems: [
    { listingId: 101, title: "1989 Nintendo Game", category: "Video Games", facts: [{ label: "Platform", value: "NES" }] },
    { listingId: 102, title: "PSA 9 Trading Card", certificationCompany: "PSA", grade: "9", facts: [{ label: "Year", value: "1986" }] },
  ],
  additionalItemsCount: 0,
  tickerText: "www.Tradebilia.com",
};

const validTurns: TnnScriptTurn[] = [
  { speaker: "max", text: "Breaking News from Tradebilia. I'm Max Tradebloski." },
  { speaker: "sidney", text: "And I'm Sidney Tradewell." },
  { speaker: "max", text: "Today, the TNN Network confirms a completed collector trade between Morgan Seller and Taylor Buyer. The exchange features 1989 Nintendo Game and PSA 9 Trading Card, each selected precisely for this finished collector transaction and presented with care." },
  { speaker: "sidney", text: "The 1989 Nintendo Game brings its approved NES platform context to the exchange, while the PSA 9 Trading Card carries approved 1986 context. Both collectors completed this focused exchange, with every selected piece acknowledged in this report." },
  { speaker: "max", text: "Tradebilia." },
];

const mockedInvokeLLM = vi.mocked(invokeLLM);
const structuredResponse = (value: unknown) => ({
  id: "test",
  created: 0,
  model: "gpt-5-mini",
  choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant" as const, content: JSON.stringify(value) } }],
});

beforeEach(() => mockedInvokeLLM.mockReset());

describe("TNN structured speaker transcript", () => {
  it("requires an unambiguous five-turn Max/Sidney newsroom handoff, one introduction each, and a single clean final sign-off", () => {
    const draft = validateTnnScriptDraft(validTurns, input);
    expect(draft.turns).toEqual(validTurns);
    expect(draft.wordCount).toBeGreaterThanOrEqual(80);
    expect(draft.wordCount).toBeLessThanOrEqual(100);
    expect(draft.turns.map((turn) => turn.speaker)).toEqual(["max", "sidney", "max", "sidney", "max"]);
    expect(draft.turns[0]?.text).toBe(TNN_DUO_OPENING_STYLES.classic.maxLine);
    expect(draft.turns[1]?.text).toBe(TNN_DUO_OPENING_STYLES.classic.sidneyLine);
    expect(draft.turns.at(-1)?.text).toBe("Tradebilia.");
    expect(draft.turns.slice(1, -1).join(" ")).not.toMatch(/Tradebilia/i);
    expect(countTnnScriptWords(flattenTnnScriptTurns(draft.turns))).toBe(draft.wordCount);
  });

  it("rejects disconnected, delayed, same-speaker, or repeated-name duo introductions", () => {
    expect(() => validateTnnScriptDraft([{ ...validTurns[0]!, text: "Breaking News from Tradebilia. I'm Max Tradebloski, and I'm Sidney Tradewell." }, ...validTurns.slice(1)], input)).toThrow(TNN_DUO_OPENING_ERROR);
    expect(() => validateTnnScriptDraft([{ ...validTurns[0]!, speaker: "sidney" }, ...validTurns.slice(1)], input)).toThrow(/five alternating turns/i);
    expect(() => validateTnnScriptDraft([{ ...validTurns[0]!, text: "Breaking News from Tradebilia. I'm Max Tradebloski." }, { ...validTurns[1]!, text: "I'm Sidney Tradewell." }, ...validTurns.slice(2)], input)).toThrow(TNN_DUO_OPENING_ERROR);
    expect(() => validateTnnScriptDraft(validTurns.map((turn, index) => index === 2 ? { ...turn, text: `${turn.text} Max Tradebloski says the report remains focused.` } : turn), input)).toThrow(/must not repeat/i);
  });

  it("uses every approved opening style as two separate assigned lines, accepting smart apostrophes", () => {
    for (const duoOpeningStyle of TNN_DUO_OPENING_STYLE_VALUES) {
      const opening = TNN_DUO_OPENING_STYLES[duoOpeningStyle];
      const turns = validTurns.map((turn, index) => index === 0
        ? { ...turn, text: opening.maxLine }
        : index === 1 ? { ...turn, text: opening.sidneyLine } : turn);
      expect(() => validateTnnScriptDraft(turns, { ...input, duoOpeningStyle })).not.toThrow();
      const smartTurns = turns.map((turn) => ({ ...turn, text: turn.text.replaceAll("I'm", "I’m") }));
      expect(() => validateTnnScriptDraft(smartTurns, { ...input, duoOpeningStyle })).not.toThrow();
    }
  });

  it("enforces literal item titles, one-for-one truthfulness, and a standalone final closing", () => {
    expect(() => validateTnnScriptDraft(validTurns.map((turn) => ({ ...turn, text: turn.text.replaceAll("PSA 9 Trading Card", "the trading card") })), input)).toThrow(TNN_SELECTED_ITEM_COVERAGE_ERROR);
    expect(() => validateTnnScriptDraft(validTurns.map((turn, index) => index === 3 ? { ...turn, text: `${turn.text} Other collector pieces also joined this completed transaction.` } : turn), input)).toThrow(TNN_UNSUPPORTED_ADDITIONAL_ITEMS_ERROR);
    expect(() => validateTnnScriptDraft(validTurns.map((turn, index) => index === 4 ? { ...turn, text: "NotTradebilia." } : turn), input)).toThrow(TNN_FINAL_CLOSING_ERROR);
    expect(() => validateTnnScriptDraft(validTurns.map((turn, index) => index === 3 ? { ...turn, text: `${turn.text} This happened on Tradebilia.` } : turn), input)).toThrow(TNN_FINAL_CLOSING_ERROR);
  });

  it("states the structured JSON, fact, privacy, item, and non-repetitive-closing requirements in the drafting prompt", () => {
    const prompt = buildTnnScriptPrompt(input);
    expect(prompt).toContain("speaker sequence: max, sidney, max, sidney, max");
    expect(prompt).toContain("Speaker labels are review-only");
    expect(prompt).toContain("Turn 1 speaker must be 'max'");
    expect(prompt).toContain("Turn 2 speaker must be 'sidney'");
    expect(prompt).toContain("Turn 5 speaker must be 'max' and its text must be exactly 'Tradebilia.'");
    expect(prompt).toContain("Do not say or imply that any other collector item");
    expect(prompt).toContain("Never invent provenance, rarity, condition, prices, values");
    expect(TNN_SCRIPT_MAX_COMPLETION_TOKENS).toBe(900);
  });

  it("stores review-only turns rather than ambiguous prose in the browser-local video plan", () => {
    const plan = buildTnnCompletedTradeVideoPlan({
      sellerName: input.sellerName,
      buyerName: input.buyerName,
      tradeItems: input.selectedItems,
      selectedItemIndexes: [0, 1],
      cashOnly: false,
      durationSeconds: 45,
      anchorMode: "duo",
      tickerText: input.tickerText,
    });
    const withTranscript = withTnnVideoScript(plan, validTurns, 1, "fact-lock");
    expect(withTranscript.scriptTurns).toEqual(validTurns);
    expect(withTranscript.script).toBe(flattenTnnScriptTurns(validTurns));
    expect(withTranscript.factLock).toBe("fact-lock");
  });

  it("creates a short-lived immutable fact lock for the exact transcript and input", () => {
    const draft = validateTnnScriptDraft(validTurns, input);
    const lock = createTnnScriptFactLock(44, draft, input, { now: 10_000, signingKey: "test-key" });
    expect(verifyTnnScriptFactLock(lock, 44, draft, input, { now: 10_001, signingKey: "test-key" })).toBe(true);
    expect(verifyTnnScriptFactLock(lock, 44, { ...draft, turns: [...draft.turns.slice(0, -1), { speaker: "max", text: "Tradebilia now." }] }, input, { now: 10_001, signingKey: "test-key" })).toBe(false);
    expect(verifyTnnScriptFactLock(lock, 44, draft, input, { now: 1_900_001, signingKey: "test-key" })).toBe(false);
  });

  it("does one bounded corrective replacement before fact locking a transcript", async () => {
    const unsupportedTurns = validTurns.map((turn, index) => index === 3 ? { ...turn, text: `${turn.text} Other collector pieces also joined this completed transaction.` } : turn);
    mockedInvokeLLM
      .mockResolvedValueOnce(structuredResponse({ turns: unsupportedTurns }) as any)
      .mockResolvedValueOnce(structuredResponse({ turns: validTurns }) as any)
      .mockResolvedValueOnce(structuredResponse({ approved: true, reason: "Approved facts only." }) as any);

    await expect(draftTnnScript(input)).resolves.toMatchObject({ turns: validTurns });
    expect(mockedInvokeLLM).toHaveBeenCalledTimes(3);
    expect(mockedInvokeLLM.mock.calls[1]?.[0].messages).toHaveLength(3);
    expect(mockedInvokeLLM.mock.calls[1]?.[0].messages[2]).toMatchObject({ content: expect.stringContaining("Remove every statement or implication") });
  });

  it("retries once when the bounded fact-lock review rejects unsupported wording, then fails closed", async () => {
    mockedInvokeLLM
      .mockResolvedValueOnce(structuredResponse({ turns: validTurns }) as any)
      .mockResolvedValueOnce(structuredResponse({ approved: false, reason: "Unsupported collection-history claim." }) as any)
      .mockResolvedValueOnce(structuredResponse({ turns: validTurns }) as any)
      .mockResolvedValueOnce(structuredResponse({ approved: true, reason: "Approved facts only." }) as any);
    await expect(draftTnnScript(input)).resolves.toMatchObject({ turns: validTurns });
    expect(mockedInvokeLLM).toHaveBeenCalledTimes(4);
    expect(mockedInvokeLLM.mock.calls[2]?.[0].messages[2]).toMatchObject({ content: expect.stringContaining("Unsupported collection-history claim") });

    mockedInvokeLLM.mockReset();
    mockedInvokeLLM
      .mockResolvedValueOnce(structuredResponse({ turns: validTurns }) as any)
      .mockResolvedValueOnce(structuredResponse({ approved: false, reason: "Unsupported claim." }) as any)
      .mockResolvedValueOnce(structuredResponse({ turns: validTurns }) as any)
      .mockResolvedValueOnce(structuredResponse({ approved: false, reason: "Still unsupported." }) as any);
    await expect(draftTnnScript(input)).rejects.toThrow(TNN_FACT_LOCK_ERROR);
  });
});
