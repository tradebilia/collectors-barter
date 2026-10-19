import { createHmac, timingSafeEqual } from "node:crypto";
import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";
import {
  TNN_DEFAULT_DUO_OPENING_STYLE,
  TNN_DUO_OPENING_STYLES,
  TNN_NETWORK_SPOKEN_NAME,
  TNN_TRADEBILIA_PRONUNCIATION,
  TNN_VIDEO_DURATION_SECONDS,
  TNN_WEBSITE_TICKER,
  formatTnnRequiredClosing,
  formatTnnGrade,
  isTnnDuoOpeningStyle,
  type TnnDuoOpeningStyle,
  isTnnHomepageTaglineId,
  type TnnHomepageTaglineId,
  type TnnTranscriptTurn,
} from "../shared/tnnVideoPolicy";

export const TNN_SCRIPT_MODEL = "gpt-5-mini";
export const TNN_SCRIPT_MAX_COMPLETION_TOKENS = 900;
export const TNN_SELECTED_ITEM_COVERAGE_ERROR = "The TNN script did not mention every approved selected item exactly as written.";
export const TNN_UNSUPPORTED_ADDITIONAL_ITEMS_ERROR = "The TNN script must not claim or imply that additional collector items changed hands when no additional items were approved.";
export const TNN_SCRIPT_WORD_COUNT_ERROR_PREFIX = "The TNN script must contain ";
export const TNN_ANCHOR_INTRODUCTION_ERROR = "The TNN transcript must include the required on-air self-introduction from every selected anchor.";
export const TNN_DUO_OPENING_ERROR = "The TNN duo transcript must open with Max's line followed immediately by Sidney's selected response.";
export const TNN_ANCHOR_REPETITION_ERROR = "The TNN transcript must not repeat an anchor's full name after their one self-introduction.";
export const TNN_FINAL_CLOSING_ERROR = "The TNN transcript must end with its selected approved homepage tagline followed by one final spoken 'Tradebilia.'.";
export const TNN_FACT_LOCK_ERROR = "The TNN transcript introduced a fact that is not approved for this completed trade.";
export const TNN_SCRIPT_INPUT_TOO_LONG_ERROR = "The selected exact names and item titles cannot fit the 45-second TNN format. Select fewer items or use shorter listing titles.";
export const TNN_SCRIPT_WORD_BUDGET = {
  45: { minimum: 80, maximum: 100 },
} as const;
/** Aim away from either hard boundary so normal newsroom pacing survives model tokenization differences. */
export const TNN_SCRIPT_TARGET_SPOKEN_WORDS = 90;
/** Initial draft plus bounded automatic length repairs; the user never has to retry a normal short draft manually. */
export const TNN_MAX_AUTOMATIC_DRAFT_ATTEMPTS = 4;

export type TnnScriptDuration = keyof typeof TNN_SCRIPT_WORD_BUDGET;
export type TnnScriptAnchorMode = "max" | "sidney" | "duo";
export type TnnScriptSpeaker = Exclude<TnnScriptAnchorMode, "duo">;
export type TnnScriptTurn = TnnTranscriptTurn;

export type TnnScriptItem = {
  listingId?: number | null;
  title: string;
  category?: string | null;
  itemType?: string | null;
  grade?: string | number | null;
  certificationCompany?: string | null;
  customGradingCompany?: string | null;
  facts?: Array<{ label: string; value: string }>;
};

export type TnnScriptDraftInput = {
  durationSeconds: TnnScriptDuration;
  anchorMode: TnnScriptAnchorMode;
  duoOpeningStyle: TnnDuoOpeningStyle;
  closingTaglineId: TnnHomepageTaglineId;
  sellerName: string;
  buyerName: string;
  cashOnly: boolean;
  selectedItems: TnnScriptItem[];
  additionalItemsCount: number;
  tickerText: string;
};

export type TnnScriptDraft = {
  /** Review-only transcript turns. `speaker` is never part of the spoken video copy. */
  turns: TnnScriptTurn[];
  /** Flattened spoken text retained for text-only consumers and safe migration. */
  script: string;
  wordCount: number;
  estimatedSpeechSeconds: number;
};

type TnnFactAudit = { approved: boolean; reason: string };

export class TnnWordBudgetError extends Error {
  readonly actualWordCount: number;
  readonly minimumWordCount: number;
  readonly maximumWordCount: number;
  readonly durationSeconds: TnnScriptDuration;

  constructor(actualWordCount: number, durationSeconds: TnnScriptDuration, minimumWordCount: number, maximumWordCount: number) {
    super(`The TNN script must contain ${minimumWordCount}-${maximumWordCount} words for the selected ${durationSeconds}-second format.`);
    this.name = "TnnWordBudgetError";
    this.actualWordCount = actualWordCount;
    this.minimumWordCount = minimumWordCount;
    this.maximumWordCount = maximumWordCount;
    this.durationSeconds = durationSeconds;
  }
}

type TnnDraftLockPayload = { v: 1; exp: number; tradeId: number; digest: string };

const BLOCKED_SCRIPT_PATTERNS = [
  /\$\s*\d/i,
  /\b(?:price|prices|value|valued|valuation|cash amount|dollars?|usd)\b/i,
  /\b(?:address|street|city|state|zip|postal|shipping|tracking|delivery|phone|email)\b/i,
  /\b(?:certificate number|cert number|serial number|order number|transaction id|trade id)\b/i,
];
const EXTRA_ITEM_IMPLICATION_PATTERN = /\b(?:additional|other|more|further|remaining)\s+(?:collector\s+)?(?:items?|pieces?|collectibles?)\s+(?:also\s+)?(?:changed hands|joined|were included|moved|traded|exchanged)\b/i;
const TNN_DRAFT_LOCK_MAX_AGE_MS = 30 * 60 * 1000;

const cleanText = (value: unknown, maximum = 180) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maximum);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeApostrophes(value: string) {
  return value.replace(/[’]/g, "'").replace(/\bI am\b/gi, "I'm");
}

function normalizeForComparison(value: string) {
  return normalizeApostrophes(cleanText(value, 2_000)).replace(/\s+/g, " ").trim();
}

function sameSpokenLine(left: string, right: string) {
  return normalizeForComparison(left) === normalizeForComparison(right);
}

export function countTnnScriptWords(script: string | null | undefined) {
  return String(script ?? "").trim().match(/\S+/g)?.length ?? 0;
}

export function flattenTnnScriptTurns(turns: readonly TnnScriptTurn[]) {
  return turns.map((turn) => cleanText(turn.text, 700)).filter(Boolean).join(" ");
}

export function getTnnScriptAnchorNames(mode: TnnScriptAnchorMode) {
  if (mode === "duo") return ["Max Tradebloski", "Sidney Tradewell"];
  return [mode === "max" ? "Max Tradebloski" : "Sidney Tradewell"];
}

function countTnnAnchorNameMentions(script: string, anchor: string) {
  return [...script.matchAll(new RegExp(`\\b${escapeRegExp(anchor)}\\b`, "gi"))].length;
}

function selectedDuoOpening(input: TnnScriptDraftInput) {
  return TNN_DUO_OPENING_STYLES[input.duoOpeningStyle];
}

function selectedTnnClosing(input: TnnScriptDraftInput) {
  return formatTnnRequiredClosing(input.closingTaglineId);
}

export function normalizeTnnScriptInput(input: TnnScriptDraftInput): TnnScriptDraftInput {
  const durationSeconds = input.durationSeconds === TNN_VIDEO_DURATION_SECONDS
    ? input.durationSeconds
    : TNN_VIDEO_DURATION_SECONDS;
  const selectedItems = input.selectedItems
    .map((item) => ({
      listingId: Number.isInteger(item.listingId) && Number(item.listingId) > 0 ? Number(item.listingId) : null,
      title: cleanText(item.title),
      category: cleanText(item.category, 80) || null,
      itemType: cleanText(item.itemType, 80) || null,
      grade: cleanText(item.grade, 32) || null,
      certificationCompany: cleanText(item.certificationCompany, 80) || null,
      customGradingCompany: cleanText(item.customGradingCompany, 80) || null,
      facts: (item.facts ?? [])
        .map((fact) => ({ label: cleanText(fact.label, 48), value: cleanText(fact.value, 120) }))
        .filter((fact) => fact.label && fact.value)
        .slice(0, 4),
    }))
    .filter((item) => item.title)
    .slice(0, 6);
  return {
    durationSeconds,
    anchorMode: input.anchorMode === "max" || input.anchorMode === "duo" ? input.anchorMode : "sidney",
    duoOpeningStyle: isTnnDuoOpeningStyle(input.duoOpeningStyle) ? input.duoOpeningStyle : TNN_DEFAULT_DUO_OPENING_STYLE,
    closingTaglineId: isTnnHomepageTaglineId(input.closingTaglineId) ? input.closingTaglineId : "why_buy_or_sell",
    sellerName: cleanText(input.sellerName, 120),
    buyerName: cleanText(input.buyerName, 120),
    cashOnly: Boolean(input.cashOnly),
    selectedItems,
    additionalItemsCount: Math.max(0, Math.min(99, Math.trunc(Number(input.additionalItemsCount) || 0))),
    tickerText: TNN_WEBSITE_TICKER,
  };
}

function publicFactLines(items: readonly TnnScriptItem[]) {
  return items.map((item, index) => {
    const grade = formatTnnGrade(item.certificationCompany, item.customGradingCompany, item.grade);
    const facts = (item.facts ?? []).map((fact) => `${fact.label}: ${fact.value}`);
    return `${index + 1}. ${item.title}${item.category ? ` | category: ${item.category}` : ""}${item.itemType ? ` | type: ${item.itemType}` : ""}${grade ? ` | grade: ${grade}` : ""}${facts.length ? ` | approved background facts: ${facts.join("; ")}` : ""}`;
  }).join("\n");
}

function transcriptShapeInstruction(input: TnnScriptDraftInput) {
  if (input.anchorMode !== "duo") {
    const name = input.anchorMode === "max" ? "Max Tradebloski" : "Sidney Tradewell";
    return `Return 2-5 ordered turns. Every turn has speaker '${input.anchorMode}'. The first turn begins exactly 'Breaking News from Tradebilia.' and includes one self-introduction for ${name}; never repeat ${name} afterward. The final turn text must be exactly '${selectedTnnClosing(input)}'.`;
  }
  const opening = selectedDuoOpening(input);
  return [
    "Return exactly 5 ordered turns with this speaker sequence: max, sidney, max, sidney, max.",
    `Turn 1 speaker must be 'max' and its text must be exactly: '${opening.maxLine}'.`,
    `Turn 2 speaker must be 'sidney' and its text must be exactly: '${opening.sidneyLine}'.`,
    "Turns 3 and 4 must sound like a connected live broadcast: Max advances the confirmed report, then Sidney responds or bridges naturally with complementary detail rather than restating Max. Use at most one brief fact-locked ad-lib only when it sounds conversational and is grounded in approved facts. Speaker labels are review-only and never spoken.",
    `Turn 5 speaker must be 'max' and its text must be exactly '${selectedTnnClosing(input)}'. The preceding Sidney turn must be an ordinary newsroom handoff and must not contain the word Tradebilia or any tagline wording.`,
  ].join(" ");
}

export function buildTnnScriptPrompt(rawInput: TnnScriptDraftInput) {
  const input = normalizeTnnScriptInput(rawInput);
  const budget = TNN_SCRIPT_WORD_BUDGET[input.durationSeconds];
  const anchors = getTnnScriptAnchorNames(input.anchorMode);
  const tradeType = input.cashOnly ? "cash sale" : "collector trade";
  return [
    "Write one original, credible, energetic TNN breaking-news transcript for a completed Tradebilia transaction.",
    "This is a private admin draft for human approval before any video task is started. Return only strict JSON matching the supplied schema; never include markdown, labels in text, captions, production directions, or extra fields.",
    `Write exactly ${TNN_SCRIPT_TARGET_SPOKEN_WORDS} spoken words where natural; the accepted range is ${budget.minimum}-${budget.maximum} words, approximately ${input.durationSeconds} seconds at a professional newsroom pace. Count only the spoken text in turns, never speaker labels.`,
    transcriptShapeInstruction(input),
    `On-air presentation: ${anchors.join(" and ")}. If the word budget has room, use at most one brief, natural newsroom ad-lib comment only when grounded in approved transaction and item facts. Do not present an opinion, rarity, provenance, condition, date, place, ownership history, or collection history as fact unless it is explicitly listed below.`,
    `State the network exactly as '${TNN_NETWORK_SPOKEN_NAME}', never as an invented letter sequence. Every spoken occurrence of Tradebilia must be pronounced '${TNN_TRADEBILIA_PRONUNCIATION}'. Use Tradebilia only in the required opening and the final required closing '${selectedTnnClosing(input)}'; never say 'on Tradebilia', 'Tradebilia platform', or repeat the brand anywhere else. The selected closing tagline is approved brand copy, not a transaction claim, and may appear only in its final turn. Do not narrate the ticker or any website text.`,
    `Describe this only as a completed ${tradeType}. Name both sides exactly once in speech: seller ${input.sellerName || "Seller"}; buyer ${input.buyerName || "Buyer"}. Their names must never be proposed as on-screen text.`,
    "Use only the item names, grades, and approved background facts listed below. State every approved selected item title exactly as written, including casing, at least once. Never invent provenance, rarity, condition, prices, values, dates, places, ownership history, certification numbers, personal contact details, shipping details, or a call to buy/sell.",
    input.additionalItemsCount > 0
      ? `Only because ${input.additionalItemsCount} additional exchanged item${input.additionalItemsCount === 1 ? "" : "s"} was explicitly approved, say one time: 'Additional collector items changed hands as part of the completed transaction.' Do not name unselected items.`
      : "The approved selected items are the complete set of items exchanged in this report. Do not say or imply that any other collector item, piece, or collectible changed hands, joined, moved, traded, or was exchanged.",
    `Lower-screen ticker text is fixed to '${TNN_WEBSITE_TICKER}' and is never spoken.`,
    "Approved item facts:",
    publicFactLines(input.selectedItems) || "No item facts were supplied; refer only to the completed collector transaction.",
  ].join("\n");
}

function normalizeTnnTurns(value: unknown): TnnScriptTurn[] {
  if (!Array.isArray(value)) return [];
  return value.map((turn) => ({
    speaker: turn && typeof turn === "object" && (turn as { speaker?: unknown }).speaker === "max" ? "max" as const : "sidney" as const,
    text: cleanText(turn && typeof turn === "object" ? (turn as { text?: unknown }).text : "", 700),
  })).filter((turn) => turn.text);
}

function assertSpeakerTurnStructure(turns: readonly TnnScriptTurn[], input: TnnScriptDraftInput) {
  if (input.anchorMode !== "duo") {
    if (turns.length < 2 || turns.length > 5 || turns.some((turn) => turn.speaker !== input.anchorMode)) {
      throw new Error("The TNN solo transcript must use 2-5 turns assigned only to the selected anchor.");
    }
    const name = input.anchorMode === "max" ? "Max Tradebloski" : "Sidney Tradewell";
    if (!new RegExp(`^Breaking News from Tradebilia\\.\\s*(?:I'm|I['’]m|I am)\\s+${escapeRegExp(name)}\\b`, "i").test(turns[0]!.text)) {
      throw new Error(TNN_ANCHOR_INTRODUCTION_ERROR);
    }
    if (countTnnAnchorNameMentions(flattenTnnScriptTurns(turns), name) !== 1) throw new Error(TNN_ANCHOR_REPETITION_ERROR);
    return;
  }

  const opening = selectedDuoOpening(input);
  if (turns.length !== 5 || turns.map((turn) => turn.speaker).join(",") !== "max,sidney,max,sidney,max") {
    throw new Error("The TNN duo transcript must contain five alternating turns assigned Max, Sidney, Max, Sidney, Max.");
  }
  if (!sameSpokenLine(turns[0]!.text, opening.maxLine) || !sameSpokenLine(turns[1]!.text, opening.sidneyLine)) {
    throw new Error(TNN_DUO_OPENING_ERROR);
  }
  const script = flattenTnnScriptTurns(turns);
  if (countTnnAnchorNameMentions(script, "Max Tradebloski") !== 1 || countTnnAnchorNameMentions(script, "Sidney Tradewell") !== 1) {
    throw new Error(TNN_ANCHOR_REPETITION_ERROR);
  }
  if (/\bTradebilia\b/i.test(turns[3]!.text)) {
    throw new Error(TNN_FINAL_CLOSING_ERROR);
  }
}

function assertFactBoundaries(script: string, input: TnnScriptDraftInput) {
  if (BLOCKED_SCRIPT_PATTERNS.some((pattern) => pattern.test(script))) {
    throw new Error("The TNN transcript included disallowed private, price, value, delivery, or certificate information.");
  }
  const itemTitles = input.selectedItems.map((item) => item.title);
  if (itemTitles.some((title) => !script.includes(title))) throw new Error(TNN_SELECTED_ITEM_COVERAGE_ERROR);
  if (!script.includes(input.sellerName) || !script.includes(input.buyerName)) {
    throw new Error("The TNN transcript must name both completed-trade parties exactly as approved.");
  }
  if (input.additionalItemsCount > 0 && !/Additional collector items changed hands as part of the completed transaction\./.test(script)) {
    throw new Error("The TNN transcript must acknowledge additional collector items when the selection is capped.");
  }
  if (input.additionalItemsCount === 0 && EXTRA_ITEM_IMPLICATION_PATTERN.test(script)) {
    throw new Error(TNN_UNSUPPORTED_ADDITIONAL_ITEMS_ERROR);
  }
  if (!/\bthe\s+TNN\s+Network\b/i.test(script)) throw new Error("The TNN transcript must identify the TNN Network.");
}

function wordBudgetFloor(input: TnnScriptDraftInput) {
  const opening = input.anchorMode === "duo"
    ? `${selectedDuoOpening(input).maxLine} ${selectedDuoOpening(input).sidneyLine}`
    : `Breaking News from Tradebilia. I'm ${input.anchorMode === "max" ? "Max Tradebloski" : "Sidney Tradewell"}.`;
  const requiredText = [
    opening,
    "the TNN Network",
    input.sellerName,
    input.buyerName,
    ...input.selectedItems.flatMap((item) => {
      const grade = item.certificationCompany || item.customGradingCompany
        ? formatTnnGrade(item.certificationCompany, item.customGradingCompany, item.grade)
        : "";
      return ["The exchange includes", item.title, grade ? `graded ${grade}` : ""];
    }),
    input.additionalItemsCount > 0 ? "Additional collector items changed hands as part of the completed transaction." : "",
    selectedTnnClosing(input),
  ].filter(Boolean).join(" ");
  return countTnnScriptWords(requiredText);
}

export function assertTnnWordBudgetFeasible(rawInput: TnnScriptDraftInput) {
  const input = normalizeTnnScriptInput(rawInput);
  const budget = TNN_SCRIPT_WORD_BUDGET[input.durationSeconds];
  if (wordBudgetFloor(input) > budget.maximum) throw new Error(TNN_SCRIPT_INPUT_TOO_LONG_ERROR);
}

function createTnnWordBudgetFallback(rawInput: TnnScriptDraftInput): TnnScriptTurn[] | null {
  const input = normalizeTnnScriptInput(rawInput);
  const budget = TNN_SCRIPT_WORD_BUDGET[input.durationSeconds];
  const tradeType = input.cashOnly ? "completed cash sale" : "completed collector trade";
  const itemLines = input.selectedItems.map((item) => {
    const grade = item.certificationCompany || item.customGradingCompany
      ? formatTnnGrade(item.certificationCompany, item.customGradingCompany, item.grade)
      : "";
    return grade
      ? `The exchange includes ${item.title}, graded ${grade}.`
      : `The exchange includes ${item.title}.`;
  });
  const openingText = input.anchorMode === "duo"
    ? `${selectedDuoOpening(input).maxLine} ${selectedDuoOpening(input).sidneyLine}`
    : `Breaking News from Tradebilia. I'm ${input.anchorMode === "max" ? "Max Tradebloski" : "Sidney Tradewell"}.`;
  const duoBridge = input.anchorMode === "duo" ? "And here is the confirmed detail:" : "";
  const requiredLines = [
    `The TNN Network confirms a ${tradeType} between seller ${input.sellerName} and buyer ${input.buyerName}.`,
    ...itemLines,
    ...(input.additionalItemsCount > 0 ? ["Additional collector items changed hands as part of the completed transaction."] : []),
  ];
  const optionalLines = [
    "This report recognizes the completed exchange and names each selected item for viewers.",
    "Tonight's update keeps the focus on the confirmed collector transaction and its selected items.",
    "The report provides a clear newsroom account of this completed exchange.",
    "For collectors following the story, the focus remains on the documented transaction.",
    "The completed exchange is presented here as a concise collector update.",
  ];
  const flexibleLines = [...requiredLines];
  for (const line of optionalLines) {
    const nextCount = countTnnScriptWords(`${openingText} ${flexibleLines.join(" ")} ${duoBridge} ${line} ${selectedTnnClosing(input)}`);
    if (nextCount > budget.maximum) continue;
    flexibleLines.push(line);
    if (nextCount >= TNN_SCRIPT_TARGET_SPOKEN_WORDS) break;
  }
  const opening = input.anchorMode === "duo"
    ? selectedDuoOpening(input)
    : null;
  const maxTurnLines = flexibleLines.slice(0, Math.max(2, Math.ceil(flexibleLines.length / 2)));
  const sidneyTurnLines = flexibleLines.slice(maxTurnLines.length);
  const turns: TnnScriptTurn[] = input.anchorMode === "duo"
    ? [
        { speaker: "max", text: opening!.maxLine },
        { speaker: "sidney", text: opening!.sidneyLine },
        { speaker: "max", text: maxTurnLines.join(" ") },
        { speaker: "sidney", text: [duoBridge, ...sidneyTurnLines].filter(Boolean).join(" ") },
        { speaker: "max", text: selectedTnnClosing(input) },
      ]
    : [
        { speaker: input.anchorMode, text: `Breaking News from Tradebilia. I'm ${input.anchorMode === "max" ? "Max Tradebloski" : "Sidney Tradewell"}.` },
        { speaker: input.anchorMode, text: flexibleLines.join(" ") },
        { speaker: input.anchorMode, text: selectedTnnClosing(input) },
      ];
  const wordCount = countTnnScriptWords(flattenTnnScriptTurns(turns));
  return wordCount >= budget.minimum && wordCount <= budget.maximum ? turns : null;
}

export function validateTnnScriptDraft(rawTurns: unknown, rawInput: TnnScriptDraftInput): TnnScriptDraft {
  const input = normalizeTnnScriptInput(rawInput);
  const turns = normalizeTnnTurns(rawTurns);
  const script = flattenTnnScriptTurns(turns);
  const budget = TNN_SCRIPT_WORD_BUDGET[input.durationSeconds];
  const wordCount = countTnnScriptWords(script);
  if (!turns.length || !script) throw new Error("The TNN transcript draft was empty.");
  if (wordCount < budget.minimum || wordCount > budget.maximum) {
    throw new TnnWordBudgetError(wordCount, input.durationSeconds, budget.minimum, budget.maximum);
  }
  assertSpeakerTurnStructure(turns, input);
  if (!/^Breaking News from Tradebilia\./i.test(turns[0]!.text)) {
    throw new Error("The TNN transcript must begin with 'Breaking News from Tradebilia.'");
  }
  if (!sameSpokenLine(turns.at(-1)?.text ?? "", selectedTnnClosing(input)) || turns.slice(1, -1).some((turn) => /\bTradebilia\b/i.test(turn.text))) {
    throw new Error(TNN_FINAL_CLOSING_ERROR);
  }
  assertFactBoundaries(script, input);
  return { turns, script, wordCount, estimatedSpeechSeconds: Math.ceil(wordCount / 2) };
}

export function getStructuredResponseText(content: unknown): string | null {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  const text = content
    .filter((part): part is { type?: unknown; text: string } => typeof part === "object" && part !== null && (part as { type?: unknown }).type === "text" && typeof (part as { text?: unknown }).text === "string")
    .map((part) => part.text)
    .join("");
  return text || null;
}

function correctiveInstructionFor(error: Error, input: TnnScriptDraftInput) {
  const normalized = normalizeTnnScriptInput(input);
  const opening = selectedDuoOpening(normalized);
  const common = "Return one complete replacement transcript only as the required strict JSON. Preserve every privacy, fact-boundary, duration, party-name, selected-item, network, and terminal-sign-off rule.";
  if (error.message === TNN_SELECTED_ITEM_COVERAGE_ERROR) {
    return `Corrective retry: include each selected title exactly as written: ${normalized.selectedItems.map((item) => item.title).join(" | ")}. ${common}`;
  }
  if (error instanceof TnnWordBudgetError || error.message.startsWith(TNN_SCRIPT_WORD_COUNT_ERROR_PREFIX)) {
    const budget = TNN_SCRIPT_WORD_BUDGET[normalized.durationSeconds];
    const actual = error instanceof TnnWordBudgetError ? error.actualWordCount : "an invalid number of";
    const direction = error instanceof TnnWordBudgetError && error.actualWordCount < budget.minimum
      ? "Expand only the flexible report turns with fact-locked, neutral newsroom detail."
      : error instanceof TnnWordBudgetError && error.actualWordCount > budget.maximum
      ? "Trim only the flexible report turns while retaining every required title and fact."
      : "Adjust only the flexible report turns.";
    const flexibleTurns = normalized.anchorMode === "duo"
      ? "Keep exact turns 1, 2, and 5 unchanged; revise only turns 3 and 4."
      : "Keep the required opening and final sign-off unchanged; revise only the flexible middle turns.";
    return `Automatic length repair: the prior transcript contained ${actual} spoken words. Rewrite it to exactly ${TNN_SCRIPT_TARGET_SPOKEN_WORDS} spoken words; ${budget.minimum}-${budget.maximum} spoken words is the accepted range and speaker labels never count. ${flexibleTurns} ${direction} ${common}`;
  }
  if (error.message === TNN_DUO_OPENING_ERROR || error.message === TNN_ANCHOR_INTRODUCTION_ERROR || error.message === TNN_ANCHOR_REPETITION_ERROR) {
    return normalized.anchorMode === "duo"
      ? `Corrective retry: produce exactly five turns with speakers max, sidney, max, sidney, max. Max turn one must say '${opening.maxLine}'. Sidney turn two must immediately answer '${opening.sidneyLine}'. No later turn may use either full anchor name. ${common}`
      : `Corrective retry: put the selected anchor's single self-introduction in the first turn and do not repeat their full name. ${common}`;
  }
  if (error.message === TNN_FINAL_CLOSING_ERROR) {
    return `Corrective retry: reserve Tradebilia for the opening and the final standalone turn only. The final turn text must be exactly '${selectedTnnClosing(normalized)}', and the prior turn must not mention Tradebilia or repeat the selected tagline. ${common}`;
  }
  if (error.message === TNN_UNSUPPORTED_ADDITIONAL_ITEMS_ERROR) {
    return `Corrective retry: the selected items are the entire completed trade set. Remove every statement or implication that any other item, piece, or collectible changed hands. ${common}`;
  }
  return null;
}

async function requestTnnScript(input: TnnScriptDraftInput, correctiveInstruction?: string) {
  const response = await invokeLLM({
    model: TNN_SCRIPT_MODEL,
    messages: [
      { role: "system", content: "You are a precise newsroom copywriter. Follow the supplied factual boundaries and speaker-turn structure exactly." },
      { role: "user", content: buildTnnScriptPrompt(input) },
      ...(correctiveInstruction ? [{ role: "user" as const, content: correctiveInstruction }] : []),
    ],
    temperature: 0.65,
    reasoning: { effort: "minimal" },
    max_completion_tokens: TNN_SCRIPT_MAX_COMPLETION_TOKENS,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "tnn_completed_trade_transcript",
        strict: true,
        schema: {
          type: "object",
          properties: {
            turns: {
              type: "array",
              minItems: 2,
              maxItems: 5,
              items: {
                type: "object",
                properties: { speaker: { type: "string", enum: ["max", "sidney"] }, text: { type: "string" } },
                required: ["speaker", "text"],
                additionalProperties: false,
              },
            },
          },
          required: ["turns"],
          additionalProperties: false,
        },
      },
    },
  });
  const choice = response.choices[0];
  const content = getStructuredResponseText(choice?.message.content);
  if (!content) {
    if (choice?.finish_reason === "length") throw new Error("The TNN transcript reached its response limit before returning content. Please retry.");
    throw new Error("The TNN transcript service returned no usable structured content. Please retry.");
  }
  try {
    return (JSON.parse(content) as { turns?: unknown }).turns;
  } catch {
    throw new Error("The TNN transcript service returned invalid structured content.");
  }
}

async function auditTnnScriptFacts(draft: TnnScriptDraft, rawInput: TnnScriptDraftInput): Promise<TnnFactAudit> {
  const input = normalizeTnnScriptInput(rawInput);
  const response = await invokeLLM({
    model: TNN_SCRIPT_MODEL,
    messages: [
      { role: "system", content: "You are a strict completed-trade fact checker. Reject any claim not directly supported by the approved parties, selected titles, grades, explicit facts, transaction type, or allowed neutral newsroom language." },
      { role: "user", content: [
        "Audit this TNN transcript. Approve only if it adds no unapproved factual claim, provenance, rarity, condition, date, place, ownership history, collection history, value, privacy detail, or extra-item implication.",
        `Approved transaction type: ${input.cashOnly ? "cash sale" : "collector trade"}.`,
        `Approved seller: ${input.sellerName}; approved buyer: ${input.buyerName}.`,
        `Additional approved exchanged items: ${input.additionalItemsCount}.`,
        `Approved final brand close (not a transaction claim and allowed only in the final turn): ${selectedTnnClosing(input)}`,
        "Approved selected item facts:",
        publicFactLines(input.selectedItems) || "No item facts supplied.",
        "Transcript turns:",
        ...draft.turns.map((turn) => `${turn.speaker.toUpperCase()}: ${turn.text}`),
      ].join("\n") },
    ],
    temperature: 0,
    reasoning: { effort: "minimal" },
    max_completion_tokens: 220,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "tnn_transcript_fact_lock",
        strict: true,
        schema: {
          type: "object",
          properties: { approved: { type: "boolean" }, reason: { type: "string" } },
          required: ["approved", "reason"],
          additionalProperties: false,
        },
      },
    },
  });
  const content = getStructuredResponseText(response.choices[0]?.message.content);
  if (!content) throw new Error("The TNN fact-lock review returned no usable result. Please retry.");
  try {
    const parsed = JSON.parse(content) as Partial<TnnFactAudit>;
    if (typeof parsed.approved !== "boolean" || typeof parsed.reason !== "string") throw new Error("invalid");
    return { approved: parsed.approved, reason: cleanText(parsed.reason, 360) || "The fact-lock reviewer rejected the transcript." };
  } catch {
    throw new Error("The TNN fact-lock review returned invalid structured content. Please retry.");
  }
}

export async function draftTnnScript(input: TnnScriptDraftInput): Promise<TnnScriptDraft> {
  assertTnnWordBudgetFeasible(input);
  let correctiveInstruction: string | undefined;
  let standardCorrectiveRetryUsed = false;
  let lastWordBudgetError: TnnWordBudgetError | null = null;
  for (let attempt = 0; attempt < TNN_MAX_AUTOMATIC_DRAFT_ATTEMPTS; attempt += 1) {
    try {
      const draft = validateTnnScriptDraft(await requestTnnScript(input, correctiveInstruction), input);
      const factAudit = await auditTnnScriptFacts(draft, input);
      if (factAudit.approved) return draft;
      if (standardCorrectiveRetryUsed) throw new Error(`${TNN_FACT_LOCK_ERROR} ${factAudit.reason}`);
      standardCorrectiveRetryUsed = true;
      correctiveInstruction = `Corrective retry: the bounded fact-lock review rejected the prior draft: ${factAudit.reason} Remove or rewrite every unsupported claim. ${transcriptShapeInstruction(normalizeTnnScriptInput(input))} Return one complete replacement transcript only as the required strict JSON.`;
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (error instanceof TnnWordBudgetError) {
        lastWordBudgetError = error;
        if (attempt < TNN_MAX_AUTOMATIC_DRAFT_ATTEMPTS - 1) {
          correctiveInstruction = correctiveInstructionFor(error, input) ?? correctiveInstruction;
          continue;
        }
        break;
      }
      if (standardCorrectiveRetryUsed || error.message.startsWith(TNN_FACT_LOCK_ERROR)) throw error;
      const nextInstruction = correctiveInstructionFor(error, input);
      if (!nextInstruction) throw error;
      standardCorrectiveRetryUsed = true;
      correctiveInstruction = nextInstruction;
    }
  }
  if (lastWordBudgetError) {
    const fallbackTurns = createTnnWordBudgetFallback(input);
    if (!fallbackTurns) throw new Error(TNN_SCRIPT_INPUT_TOO_LONG_ERROR);
    const fallback = validateTnnScriptDraft(fallbackTurns, input);
    const factAudit = await auditTnnScriptFacts(fallback, input);
    if (factAudit.approved) return fallback;
    throw new Error(`${TNN_FACT_LOCK_ERROR} ${factAudit.reason}`);
  }
  throw new Error("The TNN transcript could not be fact-locked.");
}

function draftLockPayload(tradeId: number, draft: TnnScriptDraft, input: TnnScriptDraftInput, exp: number): TnnDraftLockPayload {
  const normalized = normalizeTnnScriptInput(input);
  const material = JSON.stringify({
    tradeId,
    exp,
    input: normalized,
    turns: draft.turns,
  });
  const digest = createHmac("sha256", ENV.jwtSecret || "tnn-draft-lock-unavailable").update(material, "utf8").digest("hex");
  return { v: 1, exp, tradeId, digest };
}

function encodeDraftLock(payload: TnnDraftLockPayload, signingKey: string) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", signingKey).update(encoded, "utf8").digest("base64url");
  return `${encoded}.${signature}`;
}

export function createTnnScriptFactLock(tradeId: number, draft: TnnScriptDraft, input: TnnScriptDraftInput, options?: { now?: number; signingKey?: string }) {
  const signingKey = options?.signingKey ?? ENV.jwtSecret;
  if (!signingKey) throw new Error("TNN draft locking is unavailable because the server signing key is not configured.");
  const now = options?.now ?? Date.now();
  return encodeDraftLock(draftLockPayload(tradeId, draft, input, now + TNN_DRAFT_LOCK_MAX_AGE_MS), signingKey);
}

export function verifyTnnScriptFactLock(lock: string, tradeId: number, draft: TnnScriptDraft, input: TnnScriptDraftInput, options?: { now?: number; signingKey?: string }) {
  const signingKey = options?.signingKey ?? ENV.jwtSecret;
  if (!signingKey || !lock.includes(".")) return false;
  const [encoded, suppliedSignature] = lock.split(".");
  if (!encoded || !suppliedSignature) return false;
  const expectedSignature = createHmac("sha256", signingKey).update(encoded, "utf8").digest("base64url");
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as TnnDraftLockPayload;
    if (payload.v !== 1 || payload.tradeId !== tradeId || !Number.isFinite(payload.exp) || payload.exp < (options?.now ?? Date.now())) return false;
    const expectedPayload = draftLockPayload(tradeId, draft, input, payload.exp);
    return timingSafeEqual(Buffer.from(payload.digest), Buffer.from(expectedPayload.digest));
  } catch {
    return false;
  }
}
