import { invokeLLM } from "./_core/llm";

export const TNN_SCRIPT_MODEL = "gpt-5-mini";
export const TNN_SCRIPT_WORD_BUDGET = {
  30: { minimum: 36, maximum: 60 },
  45: { minimum: 60, maximum: 90 },
  60: { minimum: 84, maximum: 120 },
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

export function countTnnScriptWords(script: string | null | undefined) {
  return String(script ?? "").trim().match(/\S+/g)?.length ?? 0;
}

export function getTnnScriptAnchorNames(mode: TnnScriptAnchorMode) {
  if (mode === "duo") return ["Max Tradebloski", "Sidney Tradewell"];
  return [mode === "max" ? "Max Tradebloski" : "Sidney Tradewell"];
}

export function normalizeTnnScriptInput(input: TnnScriptDraftInput): TnnScriptDraftInput {
  const durationSeconds = ([30, 45, 60] as const).includes(input.durationSeconds)
    ? input.durationSeconds
    : 30;
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
    tickerText: cleanText(input.tickerText, 120),
  };
}

function publicFactLines(items: readonly TnnScriptItem[]) {
  return items.map((item, index) => {
    const grade = [item.certificationCompany || item.customGradingCompany, item.grade]
      .filter(Boolean)
      .join(" ");
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
    "Write one original, credible, energetic TNN (Tradebilia News Network) breaking-news anchor script for a completed Tradebilia transaction.",
    "This is a private admin draft for human approval before any video task is started. Return only strict JSON that matches the supplied schema.",
    `Target spoken length: ${budget.minimum}-${budget.maximum} words, approximately ${input.durationSeconds} seconds at a professional newsroom pace.`,
    `On-air presentation: ${input.anchorMode === "duo" ? `${anchors[0]} and ${anchors[1]} share the report, each with at least one natural spoken line.` : `${anchors[0]} delivers the solo report.`}`,
    "Begin with the words 'Breaking News from Tradebilia.' Mention TNN once naturally. End with the approved Tradebilia tagline exactly once.",
    `Describe this only as a completed ${tradeType}. Name both sides exactly once in speech: seller ${input.sellerName || "Seller"}; buyer ${input.buyerName || "Buyer"}. Their names must never be proposed as on-screen text.`,
    "Use only the item names, grades, and approved background facts listed below. You may paraphrase facts without adding claims. Never invent provenance, rarity, condition, prices, values, dates, places, ownership history, certification numbers, personal contact details, shipping details, or a call to buy/sell.",
    "Do not include captions, production directions, scene directions, speaker labels, markdown, bullet points, or quoted visual text in the script. The video-production layer handles the newsroom visuals.",
    `If the selected items do not cover the entire transaction, say one time: '${input.additionalItemsCount === 1 ? "Additional collector items changed hands as part of the completed transaction." : "Additional collector items changed hands as part of the completed transaction."}' Do not name unselected items.`,
    `Approved closing tagline: ${input.tickerText || "Where collectors connect."}`,
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
  if (!/\bTNN\b|Tradebilia News Network/i.test(script)) {
    throw new Error("The TNN script must identify Tradebilia News Network.");
  }
  if (BLOCKED_SCRIPT_PATTERNS.some((pattern) => pattern.test(script))) {
    throw new Error("The TNN script included disallowed private, price, value, delivery, or certificate information.");
  }
  const itemTitles = normalizedInput.selectedItems.map((item) => item.title.toLowerCase());
  if (itemTitles.length && !itemTitles.some((title) => script.toLowerCase().includes(title))) {
    throw new Error("The TNN script did not mention an approved selected item.");
  }
  if (!script.toLowerCase().includes(normalizedInput.sellerName.toLowerCase()) || !script.toLowerCase().includes(normalizedInput.buyerName.toLowerCase())) {
    throw new Error("The TNN script must name both completed-trade parties in speech.");
  }
  if (normalizedInput.additionalItemsCount > 0 && !/additional collector items changed hands/i.test(script)) {
    throw new Error("The TNN script must acknowledge additional collector items when the selection is capped.");
  }
  if (normalizedInput.tickerText && !script.toLowerCase().includes(normalizedInput.tickerText.toLowerCase())) {
    throw new Error("The TNN script must include the selected homepage tagline.");
  }
  return { script, wordCount, estimatedSpeechSeconds: Math.ceil(wordCount / 2) };
}

export async function draftTnnScript(input: TnnScriptDraftInput): Promise<TnnScriptDraft> {
  const response = await invokeLLM({
    model: TNN_SCRIPT_MODEL,
    messages: [
      { role: "system", content: "You are a precise newsroom copywriter. Follow the supplied factual boundaries exactly." },
      { role: "user", content: buildTnnScriptPrompt(input) },
    ],
    temperature: 0.85,
    max_completion_tokens: 380,
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
  const content = response.choices[0]?.message.content;
  if (typeof content !== "string") throw new Error("The TNN script service returned an unsupported response.");
  let parsed: { script?: unknown };
  try {
    parsed = JSON.parse(content) as { script?: unknown };
  } catch {
    throw new Error("The TNN script service returned invalid structured content.");
  }
  return validateTnnScriptDraft(String(parsed.script ?? ""), input);
}
