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
import { getSocialPromotionGradingStatus, type SocialPromotionGradingStatus } from "../shared/socialPromotionFacts";

export const TNN_SCRIPT_MODEL = "gpt-5-mini";
export const TNN_SCRIPT_MAX_COMPLETION_TOKENS = 900;
export const TNN_SELECTED_ITEM_COVERAGE_ERROR = "The TNN script did not mention every approved selected item exactly as written.";
export const TNN_UNSUPPORTED_ADDITIONAL_ITEMS_ERROR = "The TNN script must not claim or imply that additional collector items changed hands when no additional items were approved.";
export const TNN_SCRIPT_WORD_COUNT_ERROR_PREFIX = "The TNN script must contain ";
export const TNN_ANCHOR_INTRODUCTION_ERROR = "The TNN transcript must include the required on-air self-introduction from every selected anchor.";
export const TNN_DUO_OPENING_ERROR = "The TNN duo transcript must open with Max's line followed immediately by Sidney's selected response.";
export const TNN_ANCHOR_REPETITION_ERROR = "The TNN transcript must not repeat an anchor's full name after their one self-introduction.";
export const TNN_FINAL_CLOSING_ERROR = "The TNN transcript must end with its selected approved homepage tagline followed by one final spoken 'Tradebilia.'.";
export const TNN_SIDNEY_DETAIL_ERROR = "The TNN Sidney report turn must add approved item or trade detail rather than repeat a generic handoff.";
export const TNN_EDITORIAL_REPETITION_ERROR = "The TNN transcript repeats Max's item report in Sidney's turn instead of adding unused detail.";
export const TNN_EDITORIAL_META_LANGUAGE_ERROR = "The TNN transcript exposed database-style field or approval language instead of natural broadcast copy.";
export const TNN_EDITORIAL_FILLER_REPETITION_ERROR = "The TNN transcript stacks multiple review-summary filler lines in Sidney's report instead of ending on substantive broadcast detail.";
export const TNN_DUPLICATE_GRADE_DETAIL_ERROR = "The TNN transcript repeats a graded item's company or numeric grade as separate fragments instead of one natural grade description.";
export const TNN_ORDINAL_ITEM_REFERENCE_ERROR = "The TNN transcript uses ordinal item labels instead of natural item descriptors in Sidney's report.";
export const TNN_REPEATED_ITEM_SUBJECT_ERROR = "The TNN transcript repeats the same item subject in Sidney's short report instead of combining its approved details.";
export const TNN_ITEM_LIST_PUNCTUATION_ERROR = "The TNN transcript uses list punctuation in a two-item spoken headline instead of a natural conjunction.";
export const TNN_AWKWARD_FACT_CHAIN_ERROR = "The TNN transcript chains year and brand facts into an unnatural sentence instead of using one spoken item description.";
export const TNN_RAW_CONDITION_ERROR = "The TNN transcript must state the approved condition for every raw selected item and must not describe it with a grade.";
export const TNN_FACT_LOCK_ERROR = "The TNN transcript introduced a fact that is not approved for this completed trade.";
export const TNN_SCRIPT_INPUT_TOO_LONG_ERROR = "The selected exact names and item titles cannot fit the 45-second TNN format. Select fewer items or use shorter listing titles.";
export const TNN_SCRIPT_WORD_BUDGET = {
  45: { minimum: 80, maximum: 100 },
} as const;
/** Aim away from either hard boundary so normal newsroom pacing survives model tokenization differences. */
export const TNN_SCRIPT_TARGET_SPOKEN_WORDS = 90;
/** Initial draft plus bounded automatic length repairs; the user never has to retry a normal short draft manually. */
export const TNN_MAX_AUTOMATIC_DRAFT_ATTEMPTS = 4;
/** A fact-review disagreement receives bounded rewrites before canonical fallback. */
export const TNN_MAX_AUTOMATIC_FACT_LOCK_REWRITES = 2;

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
  /** Server-resolved classification; raw items use condition rather than grading language. */
  gradingStatus?: SocialPromotionGradingStatus;
  condition?: string | null;
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
const TNN_EDITORIAL_META_LANGUAGE = /\b(?:for item context|approved record|approved background facts?|selected pieces? for viewers|selected items? for viewers|this report recognizes|the exchange includes|listing notes|listed in [^.!?]{1,40}\s+condition|records? [^.!?]{1,80}\s+as|documented in records|noted in the report|here are the details|adding a specific detail|listed certified grade|underscoring the .*grade noted|being referenced in the report|approved grade|designation is being referenced|clarify the .* approved grade|the report stays focused on those verified item details|the completed exchange is now fully reported|give viewers the key facts from this completed exchange|those verified item details complete the report|the approved details remain tied to this confirmed exchange|the reported grades remain attached to each item|the approved grades distinguish the pieces|the approved condition and grade details distinguish the pieces|approved factor|approved for transfer|helping secure agreement|internal match|matching process|adjudication|retains? (?:its|the) .* designation|\bgraded\s+(?:nes|game|video game|console)\b|just cleared|collectors? will recognize|helped frame the trade)\b/i;
const TNN_EDITORIAL_FILLER_PATTERNS = [
  /both sides and each selected item identified for viewers/i,
  /clear, fact-based look at the finished exchange/i,
  /focus remains on what changed hands in this completed trade/i,
  /together, these details give collectors/i,
  /verified item details keep this report/i,
  /completes the verified picture/i,
];
/**
 * These phrases describe the already verified transaction; they add no item,
 * condition, provenance, value, date, or private-detail claim. Keeping this
 * vocabulary explicit prevents a secondary LLM reviewer from treating routine
 * newsroom connective language as an invented fact.
 */
const TNN_APPROVED_NEUTRAL_NEWSROOM_LANGUAGE = [
  "completed collector trade",
  "completed exchange",
  "completed transaction",
  "between seller [approved seller] and buyer [approved buyer]",
  "the TNN Network confirms the completed trade",
  "the TNN Network reports the completed trade",
  "this report recognizes the completed exchange",
  "the selected items are acknowledged in this report",
] as const;

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

function humanizeTnnFact(label: string, value: string): string | null {
  const normalizedLabel = label.toLowerCase().replace(/[/:_-]+/g, " ").replace(/\s+/g, " ").trim();
  const normalizedValue = value.trim();
  // Boolean flags and administrative grading fields are not broadcast facts.
  if (/^(?:yes|no|true|false|n\/a|none|null)$/i.test(normalizedValue)) return null;
  if (/condition|state|quality|grade|grading|grader|certification|certificate|slab/.test(normalizedLabel)) return null;
  if (/platform|console|system/.test(normalizedLabel)) return `uses ${normalizedValue} as its platform`;
  if (/character|toy name/.test(normalizedLabel)) return `identifies the character as ${normalizedValue}`;
  if (/brand|manufacturer|maker/.test(normalizedLabel)) return `comes from ${normalizedValue}`;
  if (/line|series/.test(normalizedLabel)) return `comes from the ${normalizedValue} line`;
  if (/cover art|artwork|cover/.test(normalizedLabel)) return `features ${normalizedValue}`;
  if (/box|packaging|package/.test(normalizedLabel)) return `has ${normalizedValue.toLowerCase()} packaging`;
  if (/year|release/.test(normalizedLabel)) return `dates to ${normalizedValue}`;
  if (/item type|format|edition/.test(normalizedLabel)) return `is a ${normalizedValue.toLowerCase()}`;
  // Unknown fields are intentionally omitted rather than exposed as “the listing notes…”.
  return null;
}

function spokenTnnItemType(itemType: string | null | undefined) {
  const normalized = cleanText(itemType, 60).toLowerCase().replace(/[_-]+/g, " ");
  const labels: Record<string, string> = {
    "single comic": "comic",
    "signed item": "signed piece",
    "action figure": "figure",
    "original art": "original art",
    "single coin": "coin",
    "single card": "trading card",
    "card set": "card set",
    "video game": "video game",
  };
  return labels[normalized] ?? normalized;
}

function spokenTnnBackgroundOptions(item: TnnScriptItem) {
  const facts = item.facts ?? [];
  const brandFact = facts.find((fact) => /brand|manufacturer|maker/i.test(fact.label) && !isRedundantTnnFact(item, fact));
  const platformFact = facts.find((fact) => /platform|console|system/i.test(fact.label) && !isRedundantTnnFact(item, fact));
  const yearFact = facts.find((fact) => /year|release/i.test(fact.label) && !isRedundantTnnFact(item, fact));
  const combined = platformFact && yearFact
    ? `is a ${yearFact.value} ${platformFact.value} ${spokenTnnItemType(item.itemType)}`
    : brandFact && yearFact
      ? `is a ${brandFact.value} ${spokenTnnItemType(item.itemType)} from ${yearFact.value}`
      : "";
  const consumedFacts = combined
    ? new Set([platformFact, brandFact, yearFact])
    : new Set<object>();
  return [
    combined,
    ...facts
      .filter((fact) => !consumedFacts.has(fact))
      .filter((fact) => !isRedundantTnnFact(item, fact))
      .map((fact) => humanizeTnnFact(fact.label, fact.value)),
  ].filter((option): option is string => Boolean(option));
}

function spokenTnnDetailOptions(item: TnnScriptItem) {
  const grade = item.gradingStatus === "graded"
    ? formatTnnGrade(item.certificationCompany, item.customGradingCompany, item.grade)
    : "";
  const options = [
    grade ? `graded ${grade}` : "",
    item.gradingStatus === "raw" && item.condition ? `in ${item.condition} condition` : "",
    ...spokenTnnBackgroundOptions(item),
  ];
  return options.filter((option): option is string => Boolean(option));
}

function spokenTnnDetailValues(item: TnnScriptItem) {
  return [
    item.gradingStatus === "graded" ? formatTnnGrade(item.certificationCompany, item.customGradingCompany, item.grade) : "",
    item.gradingStatus === "raw" ? item.condition : "",
    ...(item.facts ?? [])
      .filter((fact) => !isRedundantTnnFact(item, fact))
      .map((fact) => fact.value),
  ].filter((value): value is string => Boolean(value));
}

function spokenTnnItemSubject(item: TnnScriptItem) {
  const character = item.facts?.find((fact) => /character|toy name/i.test(fact.label))?.value;
  if (/action[_ ]figure/i.test(item.itemType ?? "") && character) return `The ${character} figure`;
  if (/original[_ ]art/i.test(item.itemType ?? "")) return "The original art";
  if (/card[_ ]set/i.test(item.itemType ?? "")) {
    const setName = item.facts?.find((fact) => /set name/i.test(fact.label))?.value;
    return `The ${setName || "card set"}`;
  }
  const titleWords = cleanText(item.title, 100).replace(/[#:(),]/g, " ").split(/\s+/).filter(Boolean).slice(0, 2).join(" ");
  if (/single[_ ]comic/i.test(item.itemType ?? "")) return `The ${titleWords || "comic"} comic`;
  if (/single[_ ]card/i.test(item.itemType ?? "") || /card/i.test(item.category ?? "")) return `The ${titleWords || "trading"} card`;
  if (/signed[_ ]item/i.test(item.itemType ?? "")) {
    const isPhoto = item.facts?.some((fact) => /item type|format/i.test(fact.label) && /photo/i.test(fact.value));
    return isPhoto ? "The signed photo" : "The signed piece";
  }
  const type = spokenTnnItemType(item.itemType);
  return type ? `The ${type}` : "The item";
}

function isRedundantTnnFact(item: TnnScriptItem, fact: { label: string; value: string }) {
  const label = fact.label.toLowerCase().replace(/[/:_-]+/g, " ").replace(/\s+/g, " ").trim();
  const value = fact.value.toLowerCase().replace(/[/:_-]+/g, " ").replace(/\s+/g, " ").trim();
  const title = item.title.toLowerCase();
  const subject = spokenTnnItemSubject(item).toLowerCase();
  return !value || value === label || title.includes(value) || subject.includes(value);
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
    .map((item) => {
      const gradingStatus = item.gradingStatus === "graded" || item.gradingStatus === "raw"
        ? item.gradingStatus
        : getSocialPromotionGradingStatus({ grade: item.grade });
      return {
        listingId: Number.isInteger(item.listingId) && Number(item.listingId) > 0 ? Number(item.listingId) : null,
        title: cleanText(item.title),
        category: cleanText(item.category, 80) || null,
        itemType: cleanText(item.itemType, 80) || null,
        gradingStatus,
        condition: gradingStatus === "raw" ? cleanText(item.condition, 80) || null : null,
        grade: gradingStatus === "graded" ? cleanText(item.grade, 32) || null : null,
        certificationCompany: gradingStatus === "graded" ? cleanText(item.certificationCompany, 80) || null : null,
        customGradingCompany: gradingStatus === "graded" ? cleanText(item.customGradingCompany, 80) || null : null,
        facts: (item.facts ?? [])
        .map((fact) => ({ label: cleanText(fact.label, 48), value: cleanText(fact.value, 120) }))
        .filter((fact) => fact.label && fact.value && Boolean(humanizeTnnFact(fact.label, fact.value)))
        .slice(0, 4),
      };
    })
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
    const facts = spokenTnnBackgroundOptions(item);
    const itemState = item.gradingStatus === "raw"
      ? ` | raw/ungraded item | required condition: ${item.condition || "not supplied"}`
      : ` | graded item${grade ? ` | approved grade: ${grade}` : ""}`;
    return `${index + 1}. ${item.title}${item.category ? ` | category: ${item.category}` : ""}${item.itemType ? ` | type: ${spokenTnnItemType(item.itemType)}` : ""}${itemState}${facts.length ? ` | approved background facts: ${facts.join("; ")}` : ""}`;
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
    "Turn 3 is Max's headline report: identify the completed transaction, both parties, and the selected items. Turn 4 is Sidney's substantive follow-up, not a placeholder handoff: she must add at least one new approved item or trade detail by naming an approved item title, grade, or explicit approved fact, and should explain that detail in natural newsroom language. Do not write 'here are the details' or meta-commentary about the report unless the same turn immediately supplies the approved detail. Never merely restate Max's headline. Use at most one brief fact-locked ad-lib only when it sounds conversational and is grounded in approved facts. Speaker labels are review-only and never spoken.",
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
    "Use only the item names, stated graded/raw status, grades, required raw conditions, and approved background facts listed below. State every approved selected item title exactly as written, including casing, at least once. A raw/ungraded item must be described using its required condition and must never be assigned a grade, grading company, slab, or numeric grade. A graded item may use only its approved grade context; do not add its listing condition. Never invent provenance, rarity, condition, prices, values, dates, places, ownership history, certification numbers, personal contact details, shipping details, or a call to buy/sell.",
    "Editorial rule: write an actual two-anchor broadcast, not a database recap. Max turn 3 owns the headline, parties, and first mention of the selected item titles. Sidney turn 4 owns the unused item detail or item context; she must not repeat Max's transaction headline, parties, or complete item list. Allocate each useful grade, raw condition, and background fact once. If a fact has already been spoken, use a short natural transition instead of repeating it. Never pad the word budget with generic summaries such as 'the report stays focused,' 'the completed exchange is now fully reported,' 'these details give viewers the key facts,' 'the approved details remain tied to this confirmed exchange,' or 'the approved grades distinguish the pieces.' If approved facts already fill the report, stop naturally after the final item detail; if more words are needed, add another unused approved fact rather than a report summary. Do not make unsupported audience or collector claims such as 'collectors will recognize' and do not say a fact 'helped frame the trade.' Do not explain internal matching, approval, adjudication, transfer decisions, recordkeeping, or why the parties agreed; those are production-side decisions, not broadcast facts. Never say 'approved factor,' 'approved for transfer,' 'helping secure agreement,' 'internal match,' 'retains its designation,' 'documented in records,' or similar process language. Do not turn a title containing words like 'Graded' into awkward copy such as 'Graded NES game'; preserve the exact title once, then describe the item naturally with its approved type, grade, or platform. Never say 'for item context,' 'the approved record lists,' 'the exchange includes,' 'here are the details,' 'this report recognizes,' or any database field label. Convert labels into natural language: say 'the listing identifies the platform as NES,' and never reproduce an internal field label followed by a colon or describe a record as merely listing a field value. Say a raw item is 'in Mint condition,' not 'listed in Mint condition.' Never call items 'the first item' or 'the second item'; use a natural descriptor such as 'the original art,' 'the Megatron figure,' or 'the trading card' when the approved type supports it. When naming two items, use a normal spoken conjunction without a stray comma before 'and.'",
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
  const sidneyText = turns[3]!.text;
  if (/\b(?:first|second|third|fourth|fifth|sixth)\s+item\b/i.test(sidneyText)) {
    throw new Error(TNN_ORDINAL_ITEM_REFERENCE_ERROR);
  }
  if (TNN_EDITORIAL_META_LANGUAGE.test(sidneyText) || input.selectedItems.some((item) => (item.facts ?? []).some((fact) => sidneyText.includes(`${fact.label}:`)))) {
    throw new Error(TNN_EDITORIAL_META_LANGUAGE_ERROR);
  }
  if (TNN_EDITORIAL_FILLER_PATTERNS.filter((pattern) => pattern.test(sidneyText)).length >= 2) {
    throw new Error(TNN_EDITORIAL_FILLER_REPETITION_ERROR);
  }
  for (const item of input.selectedItems) {
    const subject = spokenTnnItemSubject(item);
    if (subject !== "The item" && (sidneyText.match(new RegExp(`\\b${escapeRegExp(subject)}\\b`, "gi"))?.length ?? 0) > 1) {
      throw new Error(TNN_REPEATED_ITEM_SUBJECT_ERROR);
    }
  }
  const gradedItemCount = input.selectedItems.filter((item) => item.gradingStatus === "graded").length;
  if (gradedItemCount > 0 && (sidneyText.match(/\bgraded\b/gi)?.length ?? 0) > gradedItemCount) {
    throw new Error(TNN_DUPLICATE_GRADE_DETAIL_ERROR);
  }
  if (/\b(?:dates to|is from)\s+\d{4}\s+and comes from\b/i.test(sidneyText)) {
    throw new Error(TNN_AWKWARD_FACT_CHAIN_ERROR);
  }
  const maxReport = turns[2]!.text;
  if (input.selectedItems.length === 2 && new RegExp(`${escapeRegExp(input.selectedItems[0]!.title)}\\s*,\\s*and\\s*${escapeRegExp(input.selectedItems[1]!.title)}`, "i").test(maxReport)) {
    throw new Error(TNN_ITEM_LIST_PUNCTUATION_ERROR);
  }
  const sidneyDetailEvidence = input.selectedItems.flatMap((item) => spokenTnnDetailValues(item));
  if (!sidneyDetailEvidence.some((evidence) => sidneyText.includes(evidence))) {
    throw new Error(TNN_SIDNEY_DETAIL_ERROR);
  }
  const repeatedTitles = input.selectedItems.filter((item) => maxReport.includes(item.title) && sidneyText.includes(item.title));
  const unusedDetailExists = input.selectedItems.some((item) => spokenTnnDetailOptions(item).some((detail) => !maxReport.includes(detail)));
  if (unusedDetailExists && repeatedTitles.length === input.selectedItems.length && input.selectedItems.length > 1) {
    throw new Error(TNN_EDITORIAL_REPETITION_ERROR);
  }
}

function assertFactBoundaries(script: string, input: TnnScriptDraftInput) {
  if (BLOCKED_SCRIPT_PATTERNS.some((pattern) => pattern.test(script))) {
    throw new Error("The TNN transcript included disallowed private, price, value, delivery, or certificate information.");
  }
  const itemTitles = input.selectedItems.map((item) => item.title);
  if (itemTitles.some((title) => !script.includes(title))) throw new Error(TNN_SELECTED_ITEM_COVERAGE_ERROR);
  const rawItems = input.selectedItems.filter((item) => item.gradingStatus === "raw");
  if (rawItems.some((item) => !item.condition || !script.includes(item.condition))) {
    throw new Error(TNN_RAW_CONDITION_ERROR);
  }
  if (/\b(?:grade|graded|grading company|slab)\s*(?:of\s*)?0(?:\.0+)?\b/i.test(script) || rawItems.some((item) => new RegExp(`${escapeRegExp(item.title)}\\s*,?\\s*(?:is|was|listed as|with|at)?\\s*(?:a )?(?:grade|graded|grading company|slab)\\b`, "i").test(script))) {
    throw new Error(TNN_RAW_CONDITION_ERROR);
  }
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
  if (TNN_EDITORIAL_META_LANGUAGE.test(script) || input.selectedItems.some((item) => (item.facts ?? []).some((fact) => script.includes(`${fact.label}:`)))) {
    throw new Error(TNN_EDITORIAL_META_LANGUAGE_ERROR);
  }
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
      const grade = item.gradingStatus === "graded"
        ? formatTnnGrade(item.certificationCompany, item.customGradingCompany, item.grade)
        : "";
      return ["The exchange includes", item.title, grade ? `graded ${grade}` : item.condition ? `in ${item.condition} condition` : ""];
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
  const openingText = input.anchorMode === "duo"
    ? `${selectedDuoOpening(input).maxLine} ${selectedDuoOpening(input).sidneyLine}`
    : `Breaking News from Tradebilia. I'm ${input.anchorMode === "max" ? "Max Tradebloski" : "Sidney Tradewell"}.`;
  const titleList = input.selectedItems.length === 1
    ? input.selectedItems[0]!.title
    : input.selectedItems.length === 2
      ? `${input.selectedItems[0]!.title} and ${input.selectedItems[1]!.title}`
      : `${input.selectedItems.slice(0, -1).map((item) => item.title).join(", ")}, and ${input.selectedItems.at(-1)!.title}`;
  const detailLines = input.selectedItems.flatMap((item) => {
    const subject = spokenTnnItemSubject(item);
    const options = spokenTnnDetailOptions(item);
    if (!options.length) return [`${subject} is identified in the completed exchange.`];
    const [first, ...remaining] = options;
    if (!remaining.length) return [`${subject} is ${first}.`];
    return [`${subject} is ${first} ${remaining.map((detail) => `and ${detail}`).join(" ")}.`];
  });
  const requiredLines = [
    `The TNN Network confirms a ${tradeType} between seller ${input.sellerName} and buyer ${input.buyerName}, featuring ${titleList}.`,
    ...detailLines,
    ...(input.additionalItemsCount > 0 ? ["Additional collector items changed hands as part of the completed transaction."] : []),
  ];
  const hasRawItems = input.selectedItems.some((item) => item.gradingStatus === "raw");
  const hasGradedItems = input.selectedItems.some((item) => item.gradingStatus === "graded");
  const optionalLines = [
    hasRawItems && hasGradedItems
      ? "The pieces sit alongside the stated raw condition and reported score."
      : hasRawItems
        ? "The item's stated condition remains the key distinction in this exchange."
        : "Each piece carries its own reported score.",
    "Those item details stay tied to the confirmed exchange.",
    hasRawItems && hasGradedItems
      ? "The different statuses remain with their respective items."
      : hasRawItems
        ? "That condition remains with the item throughout this completed exchange."
        : "Those scores remain with their respective pieces.",
    hasRawItems
      ? hasGradedItems
        ? "The condition belongs to that item."
        : "The piece is presented as ungraded rather than graded."
      : "Each score belongs to its named item.",
  ];
  const flexibleLines = [...requiredLines];
  for (const line of optionalLines) {
    const nextCount = countTnnScriptWords(`${openingText} ${flexibleLines.join(" ")} ${line} ${selectedTnnClosing(input)}`);
    if (nextCount > budget.maximum) continue;
    flexibleLines.push(line);
    if (nextCount >= TNN_SCRIPT_TARGET_SPOKEN_WORDS) break;
  }
  const opening = input.anchorMode === "duo"
    ? selectedDuoOpening(input)
    : null;
  const maxTurnLines = input.anchorMode === "duo"
    ? flexibleLines.slice(0, 1)
    : flexibleLines.slice(0, Math.max(2, Math.ceil(flexibleLines.length / 2)));
  const sidneyTurnLines = flexibleLines.slice(maxTurnLines.length);
  const turns: TnnScriptTurn[] = input.anchorMode === "duo"
    ? [
        { speaker: "max", text: opening!.maxLine },
        { speaker: "sidney", text: opening!.sidneyLine },
        { speaker: "max", text: maxTurnLines.join(" ") },
        { speaker: "sidney", text: sidneyTurnLines.join(" ") },
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

/**
 * The fallback is assembled only from canonical server-resolved facts and
 * fixed newsroom language, then passes the same structural validator as an AI
 * response. It is safe to use when the secondary LLM fact reviewer is
 * unavailable or contradicts its own approved neutral-language contract.
 */
function createValidatedTnnFallback(input: TnnScriptDraftInput): TnnScriptDraft {
  const fallbackTurns = createTnnWordBudgetFallback(input);
  if (!fallbackTurns) throw new Error(TNN_SCRIPT_INPUT_TOO_LONG_ERROR);
  return validateTnnScriptDraft(fallbackTurns, input);
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
  if (!/^Breaking News from Tradebilia\./i.test(turns[0]!.text)) {
    throw new Error("The TNN transcript must begin with 'Breaking News from Tradebilia.'");
  }
  if (!sameSpokenLine(turns.at(-1)?.text ?? "", selectedTnnClosing(input)) || turns.slice(1, -1).some((turn) => /\bTradebilia\b/i.test(turn.text))) {
    throw new Error(TNN_FINAL_CLOSING_ERROR);
  }
  assertFactBoundaries(script, input);
  assertSpeakerTurnStructure(turns, input);
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
  if (error.message === TNN_SIDNEY_DETAIL_ERROR) {
    const approvedDetail = normalized.selectedItems.map((item) => {
      const grade = formatTnnGrade(item.certificationCompany, item.customGradingCompany, item.grade);
      const fact = item.facts?.[0];
      return `${item.title}${grade ? ` (${grade})` : item.condition ? ` (raw; condition: ${item.condition})` : ""}${fact ? `; ${fact.label}: ${fact.value}` : ""}`;
    }).join(" | ");
    return `Corrective retry: keep the exact five-turn duo sequence and rewrite only Sidney's substantive fourth turn. She must explain at least one approved item detail from this list: ${approvedDetail}. Do not use a generic handoff such as 'here are the details' without immediately giving that detail. ${common}`;
  }
  if (error.message === TNN_EDITORIAL_REPETITION_ERROR) {
    return `Corrective retry: keep Max's headline in turn 3, but rewrite only Sidney's turn 4 so she uses one unused approved grade, raw condition, or background fact. Do not repeat Max's complete item list, transaction headline, or party names. Use natural broadcast language, not a recap of the database. ${common}`;
  }
  if (error.message === TNN_EDITORIAL_META_LANGUAGE_ERROR) {
    return `Corrective retry: remove all database-style language, internal matching rationale, transfer-approval language, recordkeeping language, unsupported collector opinions, and review-summary filler from the flexible report turns. Never say 'for item context,' 'approved record,' 'the exchange includes,' 'here are the details,' 'this report recognizes,' 'adding a specific detail,' 'being referenced in the report,' 'approved grade,' 'approved factor,' 'approved for transfer,' 'helping secure agreement,' 'internal match,' 'retains its designation,' 'documented in records,' 'noted in the report,' 'collectors will recognize,' 'helped frame the trade,' 'the report stays focused,' 'the completed exchange is now fully reported,' 'those verified item details complete the report,' 'the approved details remain tied to this confirmed exchange,' or 'the approved grades distinguish the pieces.' Do not turn a title containing 'Graded' into 'Graded NES game' or similar awkward copy. Never explain why the parties agreed or why an item passed an internal review. Never pad the word budget with a generic summary; use another unused approved fact or end naturally. ${common}`;
  }
  if (error.message === TNN_EDITORIAL_FILLER_REPETITION_ERROR) {
    return `Corrective retry: keep Sidney's approved item facts, but remove stacked review-summary endings. Use at most one short transition after the substantive item sentences, then end the report naturally. Do not say 'together, these details give collectors,' 'verified item details keep this report,' 'clear, fact-based look at the finished exchange,' or 'the focus remains on what changed hands.' ${common}`;
  }
  if (error.message === TNN_DUPLICATE_GRADE_DETAIL_ERROR) {
    return `Corrective retry: describe each graded item with one natural phrase containing its complete approved company and grade, such as 'graded AFA 60'. Do not repeat the company or numeric grade as separate fragments afterward. ${common}`;
  }
  if (error.message === TNN_ORDINAL_ITEM_REFERENCE_ERROR) {
    return `Corrective retry: replace ordinal labels such as 'the first item' or 'the second item' with natural approved descriptors such as the original art, the figure, the card, or the set. Keep Sidney focused on unused detail and do not repeat Max's item list. ${common}`;
  }
  if (error.message === TNN_REPEATED_ITEM_SUBJECT_ERROR) {
    return `Corrective retry: mention each natural item subject only once in Sidney's turn. Combine related approved details into one sentence, for example, 'the Megatron figure is graded AFA 60 and has boxed packaging.' Do not drop any approved detail. ${common}`;
  }
  if (error.message === TNN_ITEM_LIST_PUNCTUATION_ERROR) {
    return `Corrective retry: this report names exactly two selected items, so join their titles with a normal spoken 'and' and no comma before it. Keep the wording conversational rather than formatted as a written list. ${common}`;
  }
  if (error.message === TNN_AWKWARD_FACT_CHAIN_ERROR) {
    return `Corrective retry: do not say an item 'dates to [year] and comes from [brand].' Combine those approved facts naturally, for example, 'a Topps card from 1980.' Keep the exact fact values without sounding like a field-by-field list. ${common}`;
  }
  if (error.message === TNN_RAW_CONDITION_ERROR) {
    const rawItems = normalized.selectedItems.filter((item) => item.gradingStatus === "raw")
      .map((item) => `${item.title}: raw/ungraded; condition ${item.condition || "not supplied"}`)
      .join(" | ");
    return `Corrective retry: these selected items are raw/ungraded and must be described only with their approved condition, never with a grade, grading company, or slab: ${rawItems}. Preserve all other rules. ${common}`;
  }
  if (error.message === TNN_UNSUPPORTED_ADDITIONAL_ITEMS_ERROR) {
    return `Corrective retry: the selected items are the entire completed trade set. Remove every statement or implication that any other item, piece, or collectible changed hands. ${common}`;
  }
  return null;
}

function factLockCorrectionInstruction(input: TnnScriptDraftInput) {
  const normalized = normalizeTnnScriptInput(input);
  return [
    "Automatic fact-lock repair: return one complete replacement transcript only as the required strict JSON.",
    "Use only the approved parties, selected titles, explicit graded/raw status, grades, required raw conditions, explicit item facts, transaction type, required opening, TNN Network wording, and final brand close.",
    `Ordinary neutral newsroom wording is expressly approved: ${TNN_APPROVED_NEUTRAL_NEWSROOM_LANGUAGE.join("; ")}.`,
    "Do not add a value, price, date, place, or unapproved condition, provenance, rarity, ownership history, contact detail, certificate detail, or any unselected item. Preserve each required approved raw-item condition exactly as supplied.",
    transcriptShapeInstruction(normalized),
  ].join(" ");
}

function isTnnFactReviewAvailabilityError(error: Error) {
  return error.message.startsWith("The TNN fact-lock review returned");
}

/**
 * These failures arise from generated transcript content or the model service,
 * not from an impossible completed-trade selection. They can safely use the
 * canonical deterministic transcript after one fixed repair request because
 * that transcript is built only from server-verified facts.
 */
function isRecoverableTnnDraftError(error: Error) {
  return /^(?:The TNN transcript|The TNN duo transcript|The TNN solo transcript)/.test(error.message);
}

async function requestTnnScript(input: TnnScriptDraftInput, correctiveInstruction?: string) {
  let response: Awaited<ReturnType<typeof invokeLLM>>;
  try {
    response = await invokeLLM({
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
  } catch {
    throw new Error("The TNN transcript service is temporarily unavailable.");
  }
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
  let response: Awaited<ReturnType<typeof invokeLLM>>;
  try {
    response = await invokeLLM({
      model: TNN_SCRIPT_MODEL,
      messages: [
        { role: "system", content: "You are a strict completed-trade fact checker. Reject any claim not directly supported by the approved parties, selected titles, grades, explicit facts, transaction type, or allowed neutral newsroom language." },
        { role: "user", content: [
          "Audit this TNN transcript. Approve only if it adds no unapproved factual claim, provenance, rarity, condition, date, place, ownership history, collection history, value, privacy detail, or extra-item implication.",
          `Approved transaction type: ${input.cashOnly ? "cash sale" : "collector trade"}.`,
          `Approved seller: ${input.sellerName}; approved buyer: ${input.buyerName}.`,
          `Additional approved exchanged items: ${input.additionalItemsCount}.`,
          `Approved final brand close (not a transaction claim and allowed only in the final turn): ${selectedTnnClosing(input)}`,
          `Approved neutral newsroom language (not additional factual claims): ${TNN_APPROVED_NEUTRAL_NEWSROOM_LANGUAGE.join("; ")}.`,
          "Do not reject an otherwise compliant transcript merely because it combines the approved seller and buyer names with the approved completed transaction type in ordinary newsroom grammar.",
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
  } catch {
    throw new Error("The TNN fact-lock review returned no usable result.");
  }
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
  let factLockRewriteCount = 0;
  let lastWordBudgetError: TnnWordBudgetError | null = null;
  for (let attempt = 0; attempt < TNN_MAX_AUTOMATIC_DRAFT_ATTEMPTS; attempt += 1) {
    try {
      const draft = validateTnnScriptDraft(await requestTnnScript(input, correctiveInstruction), input);
      const factAudit = await auditTnnScriptFacts(draft, input);
      if (factAudit.approved) return draft;
      if (factLockRewriteCount < TNN_MAX_AUTOMATIC_FACT_LOCK_REWRITES && attempt < TNN_MAX_AUTOMATIC_DRAFT_ATTEMPTS - 1) {
        factLockRewriteCount += 1;
        correctiveInstruction = factLockCorrectionInstruction(input);
        continue;
      }
      return createValidatedTnnFallback(input);
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
      if (isTnnFactReviewAvailabilityError(error)) return createValidatedTnnFallback(input);
      if (standardCorrectiveRetryUsed || error.message.startsWith(TNN_FACT_LOCK_ERROR)) return createValidatedTnnFallback(input);
      const nextInstruction = correctiveInstructionFor(error, input);
      if (!nextInstruction && !isRecoverableTnnDraftError(error)) throw error;
      standardCorrectiveRetryUsed = true;
      correctiveInstruction = nextInstruction ?? factLockCorrectionInstruction(input);
    }
  }
  if (lastWordBudgetError) {
    return createValidatedTnnFallback(input);
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
