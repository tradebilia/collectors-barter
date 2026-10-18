import { invokeLLM } from "./_core/llm";
import {
  TNN_NETWORK_SPOKEN_NAME,
  TNN_REQUIRED_CLOSING,
  TNN_TRADEBILIA_PRONUNCIATION,
  TNN_VIDEO_DURATION_SECONDS,
  TNN_WEBSITE_TICKER,
  formatTnnGrade,
} from "../shared/tnnVideoPolicy";

export const TNN_SCRIPT_MODEL = "gpt-5-mini";
export const TNN_SCRIPT_MAX_COMPLETION_TOKENS = 700;
export const TNN_SELECTED_ITEM_COVERAGE_ERROR = "The TNN script did not mention every approved selected item.";
export const TNN_SCRIPT_WORD_COUNT_ERROR_PREFIX = "The TNN script must contain ";
export const TNN_ANCHOR_INTRODUCTION_ERROR = "The TNN script must include an on-air self-introduction from every selected anchor.";
export const TNN_ANCHOR_REPETITION_ERROR = "The TNN script must not repeat an anchor's full-name introduction or callout.";
export const TNN_SCRIPT_WORD_BUDGET = {
  45: { minimum: 80, maximum: 100 },
} as const;

export type TnnScriptDuration = keyof typeof TNN_SCRIPT_WORD_BUDGET;
export type TnnScriptAnchorMode = "max" | "sidney" | "duo";

export type TnnScriptItem = {
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
  sellerName: string;
  buyerName: string;
  cashOnly: boolean;
  selectedItems: TnnScriptItem[];
  additionalItemsCount: number;
  tickerText: string;
};

export type TnnScriptDraft = {
  script: string;
  wordCount: number;
  estimatedSpeechSeconds: number;
};

const BLOCKED_SCRIPT_PATTERNS = [
  /\$\s*\d/i,
  /\b(?:price|prices|value|valued|valuation|cash amount|dollars?|usd)\b/i,
  /\b(?:address|street|city|state|zip|postal|shipping|tracking|delivery|phone|email)\b/i,
  /\b(?:certificate number|cert number|serial number|order number|transaction id|trade id)\b/i,
];

const cleanText = (value: unknown, maximum = 180) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maximum);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countTnnAnchorSelfIntroductions(script: string, anchor: string) {
  return [...script.matchAll(new RegExp(`\\b(?:I'm|I['’]m|I am)\\s+${escapeRegExp(anchor)}\\b`, "gi"))].length;
}

function hasRepeatedTnnAnchorCallout(script: string, anchor: string) {
  const name = escapeRegExp(anchor);
  return new RegExp(`(?:\\b(?:again|once more|back to|returning to)\\b[^.!?]{0,48}\\b${name}\\b|\\b${name}\\b[^.!?]{0,48}\\b(?:again|once more)\\b)`, "i").test(script);
}

export function countTnnScriptWords(script: string | null | undefined) {
  return String(script ?? "").trim().match(/\S+/g)?.length ?? 0;
}

export function getTnnScriptAnchorNames(mode: TnnScriptAnchorMode) {
  if (mode === "duo") return ["Max Tradebloski", "Sidney Tradewell"];
  return [mode === "max" ? "Max Tradebloski" : "Sidney Tradewell"];
}

export function normalizeTnnScriptInput(input: TnnScriptDraftInput): TnnScriptDraftInput {
  const durationSeconds = input.durationSeconds === TNN_VIDEO_DURATION_SECONDS
    ? input.durationSeconds
    : TNN_VIDEO_DURATION_SECONDS;
  const selectedItems = input.selectedItems
    .map((item) => ({
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

export function buildTnnScriptPrompt(rawInput: TnnScriptDraftInput) {
  const input = normalizeTnnScriptInput(rawInput);
  const budget = TNN_SCRIPT_WORD_BUDGET[input.durationSeconds];
  const anchors = getTnnScriptAnchorNames(input.anchorMode);
  const tradeType = input.cashOnly ? "cash sale" : "collector trade";
  return [
    "Write one original, credible, energetic TNN breaking-news anchor script for a completed Tradebilia transaction.",
    "This is a private admin draft for human approval before any video task is started. Return only strict JSON that matches the supplied schema.",
    `Target spoken length: ${budget.minimum}-${budget.maximum} words, approximately ${input.durationSeconds} seconds at a professional newsroom pace.`,
    `On-air presentation: ${input.anchorMode === "duo" ? `${anchors[0]} and ${anchors[1]} share the report, each with at least one natural spoken line. Each must introduce themselves exactly once using one of these exact forms: "I'm ${anchors[0]}" or "I’m ${anchors[0]}" or "I am ${anchors[0]}"; and "I'm ${anchors[1]}" or "I’m ${anchors[1]}" or "I am ${anchors[1]}". When both introductions happen at the very beginning, make the handoff conversational: "I'm ${anchors[0]}, and I'm ${anchors[1]}" (or the equivalent approved apostrophe form), not two disconnected introductions. After those introductions, continue the handoff naturally using first names, roles, or no name; never repeat either full name, say "again," or re-introduce an anchor.` : `${anchors[0]} delivers the solo report and introduces themselves exactly once using one of these exact forms: "I'm ${anchors[0]}" or "I’m ${anchors[0]}" or "I am ${anchors[0]}" immediately after the opening line. After that introduction, do not repeat the full name or re-introduce the anchor.`} If the 45-second word budget has room, add at most one or two brief, natural newsroom ad-lib comments grounded in the approved transaction and item facts; never add a new fact, value, opinion presented as fact, or private detail.`,
    `Begin with the words 'Breaking News from Tradebilia.' State the network exactly as '${TNN_NETWORK_SPOKEN_NAME}', never as an invented letter sequence. Every spoken occurrence of Tradebilia must be pronounced '${TNN_TRADEBILIA_PRONUNCIATION}'. End the final spoken sentence exactly with '${TNN_REQUIRED_CLOSING}' Do not narrate the ticker or any other website text.`,
    `Describe this only as a completed ${tradeType}. Name both sides exactly once in speech: seller ${input.sellerName || "Seller"}; buyer ${input.buyerName || "Buyer"}. Their names must never be proposed as on-screen text.`,
    "Use only the item names, grades, and approved background facts listed below. State every approved selected item title exactly as written at least once; you may paraphrase its facts but not its title. Never invent provenance, rarity, condition, prices, values, dates, places, ownership history, certification numbers, personal contact details, shipping details, or a call to buy/sell.",
    "Do not include captions, production directions, scene directions, speaker labels, markdown, bullet points, or quoted visual text in the script. The video-production layer handles the newsroom visuals.",
    `If the selected items do not cover the entire transaction, say one time: '${input.additionalItemsCount === 1 ? "Additional collector items changed hands as part of the completed transaction." : "Additional collector items changed hands as part of the completed transaction."}' Do not name unselected items.`,
    `Lower-screen ticker text is fixed to '${TNN_WEBSITE_TICKER}' and is never spoken.`,
    "Approved item facts:",
    publicFactLines(input.selectedItems) || "No item facts were supplied; refer only to the completed collector transaction.",
  ].join("\n");
}

export function validateTnnScriptDraft(rawScript: string, input: TnnScriptDraftInput): TnnScriptDraft {
  const script = cleanText(rawScript, 2_000);
  const normalizedInput = normalizeTnnScriptInput(input);
  const budget = TNN_SCRIPT_WORD_BUDGET[normalizedInput.durationSeconds];
  const wordCount = countTnnScriptWords(script);
  if (!script) throw new Error("The TNN script draft was empty.");
  if (wordCount < budget.minimum || wordCount > budget.maximum) {
    throw new Error(`The TNN script must contain ${budget.minimum}-${budget.maximum} words for the selected ${normalizedInput.durationSeconds}-second format.`);
  }
  if (!/^breaking news from tradebilia\b/i.test(script)) {
    throw new Error("The TNN script must begin with 'Breaking News from Tradebilia.'");
  }
  if (!/\bthe\s+TNN\s+Network\b/i.test(script)) {
    throw new Error("The TNN script must identify the TNN Network.");
  }
  if (BLOCKED_SCRIPT_PATTERNS.some((pattern) => pattern.test(script))) {
    throw new Error("The TNN script included disallowed private, price, value, delivery, or certificate information.");
  }
  const itemTitles = normalizedInput.selectedItems.map((item) => item.title.toLowerCase());
  if (itemTitles.some((title) => !script.toLowerCase().includes(title))) {
    throw new Error(TNN_SELECTED_ITEM_COVERAGE_ERROR);
  }
  if (!script.toLowerCase().includes(normalizedInput.sellerName.toLowerCase()) || !script.toLowerCase().includes(normalizedInput.buyerName.toLowerCase())) {
    throw new Error("The TNN script must name both completed-trade parties in speech.");
  }
  if (normalizedInput.additionalItemsCount > 0 && !/additional collector items changed hands/i.test(script)) {
    throw new Error("The TNN script must acknowledge additional collector items when the selection is capped.");
  }
  const anchors = getTnnScriptAnchorNames(normalizedInput.anchorMode);
  if (anchors.some((anchor) => !new RegExp(`\\b(?:I['’]m|I am)\\s+${escapeRegExp(anchor)}\\b`, "i").test(script))) {
    throw new Error(TNN_ANCHOR_INTRODUCTION_ERROR);
  }
  if (anchors.some((anchor) => countTnnAnchorSelfIntroductions(script, anchor) !== 1 || hasRepeatedTnnAnchorCallout(script, anchor))) {
    throw new Error(TNN_ANCHOR_REPETITION_ERROR);
  }
  if (!new RegExp(`${escapeRegExp(TNN_REQUIRED_CLOSING)}$`, "i").test(script)) {
    throw new Error("The TNN script must end with 'Tradebilia.'");
  }
  return { script, wordCount, estimatedSpeechSeconds: Math.ceil(wordCount / 2) };
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

function buildCorrectiveTnnItemCoveragePrompt(input: TnnScriptDraftInput) {
  const titles = normalizeTnnScriptInput(input).selectedItems.map((item) => item.title);
  return [
    "Corrective retry: the prior TNN draft did not state every approved selected item title verbatim.",
    "Return one complete replacement script only as the required strict JSON. Do not explain the correction.",
    `You must include each of these titles exactly as written: ${titles.join(" | ") || "No selected titles supplied"}.`,
    "Keep every original privacy, factual-boundary, duration, party-name, and closing-tagline rule from the user request.",
  ].join("\n");
}

function buildCorrectiveTnnWordCountPrompt(input: TnnScriptDraftInput) {
  const normalizedInput = normalizeTnnScriptInput(input);
  const budget = TNN_SCRIPT_WORD_BUDGET[normalizedInput.durationSeconds];
  return [
    "Corrective retry: the prior TNN draft was outside the required spoken word range.",
    "Return one complete replacement script only as the required strict JSON. Do not explain the correction.",
    `The replacement script must contain ${budget.minimum}-${budget.maximum} spoken words, inclusive. Count every spoken word, including the opening and closing; do not count punctuation as words.`,
    "Keep every original privacy, factual-boundary, anchor-introduction, selected-item-coverage, network-wording, and closing-tagline rule from the user request.",
  ].join("\n");
}

function buildCorrectiveTnnAnchorIntroductionPrompt(input: TnnScriptDraftInput) {
  const anchors = getTnnScriptAnchorNames(normalizeTnnScriptInput(input).anchorMode);
  return [
    "Corrective retry: the prior TNN draft did not include the required on-air self-introduction from every selected anchor.",
    "Return one complete replacement script only as the required strict JSON. Do not explain the correction.",
    `Include these exact self-introduction forms in spoken text: "I'm ${anchors[0]}" or "I’m ${anchors[0]}" or "I am ${anchors[0]}"${anchors.length > 1 ? `; and "I'm ${anchors[1]}" or "I’m ${anchors[1]}" or "I am ${anchors[1]}"` : ""}.`,
    "Keep every original privacy, factual-boundary, duration, selected-item-coverage, network-wording, party-name, and closing-tagline rule from the user request.",
  ].join("\\n");
}

function buildCorrectiveTnnAnchorRepetitionPrompt(input: TnnScriptDraftInput) {
  const anchors = getTnnScriptAnchorNames(normalizeTnnScriptInput(input).anchorMode);
  return [
    "Corrective retry: the prior TNN draft repeated an anchor's full-name introduction or callout.",
    "Return one complete replacement script only as the required strict JSON. Do not explain the correction.",
    `Introduce each selected anchor exactly once: ${anchors.map((anchor) => `"I'm ${anchor}" or "I’m ${anchor}" or "I am ${anchor}"`).join("; ")}. After each introduction, use first names, roles, or no name; do not repeat a full name, say "again," or re-introduce an anchor.`,
    "Keep at most one or two brief, fact-locked broadcast ad-lib comments only if they fit the 45-second word budget, and keep every original privacy, factual-boundary, duration, selected-item-coverage, network-wording, party-name, and closing-tagline rule.",
  ].join("\\n");
}

async function requestTnnScript(input: TnnScriptDraftInput, correctiveInstruction?: string) {
  const response = await invokeLLM({
    model: TNN_SCRIPT_MODEL,
    messages: [
      { role: "system", content: "You are a precise newsroom copywriter. Follow the supplied factual boundaries exactly." },
      { role: "user", content: buildTnnScriptPrompt(input) },
      ...(correctiveInstruction ? [{ role: "user" as const, content: correctiveInstruction }] : []),
    ],
    temperature: 0.85,
    reasoning: { effort: "minimal" },
    max_completion_tokens: TNN_SCRIPT_MAX_COMPLETION_TOKENS,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "tnn_completed_trade_script",
        strict: true,
        schema: {
          type: "object",
          properties: { script: { type: "string" } },
          required: ["script"],
          additionalProperties: false,
        },
      },
    },
  });
  const choice = response.choices[0];
  const content = getStructuredResponseText(choice?.message.content);
  if (!content) {
    if (choice?.finish_reason === "length") {
      throw new Error("The TNN script draft reached its response limit before returning content. Please retry.");
    }
    throw new Error("The TNN script service returned no usable structured content. Please retry.");
  }
  try {
    const parsed = JSON.parse(content) as { script?: unknown };
    return String(parsed.script ?? "");
  } catch {
    throw new Error("The TNN script service returned invalid structured content.");
  }
}

export async function draftTnnScript(input: TnnScriptDraftInput): Promise<TnnScriptDraft> {
  try {
    return validateTnnScriptDraft(await requestTnnScript(input), input);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    const correctiveInstruction = error.message === TNN_SELECTED_ITEM_COVERAGE_ERROR
      ? buildCorrectiveTnnItemCoveragePrompt(input)
      : error.message.startsWith(TNN_SCRIPT_WORD_COUNT_ERROR_PREFIX)
        ? buildCorrectiveTnnWordCountPrompt(input)
        : error.message === TNN_ANCHOR_INTRODUCTION_ERROR
          ? buildCorrectiveTnnAnchorIntroductionPrompt(input)
          : error.message === TNN_ANCHOR_REPETITION_ERROR
            ? buildCorrectiveTnnAnchorRepetitionPrompt(input)
            : null;
    if (!correctiveInstruction) throw error;
    return validateTnnScriptDraft(
      await requestTnnScript(input, correctiveInstruction),
      input
    );
  }
}
