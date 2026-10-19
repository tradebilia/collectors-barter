export const TNN_VIDEO_DURATION_SECONDS = 45 as const;
export const TNN_VIDEO_DURATIONS = [TNN_VIDEO_DURATION_SECONDS] as const;
export type TnnVideoDuration = typeof TNN_VIDEO_DURATIONS[number];

export const TNN_WEBSITE_TICKER = "www.Tradebilia.com";
export const TNN_NETWORK_SPOKEN_NAME = "the TNN Network";
export const TNN_TRADEBILIA_PRONUNCIATION = "trade-bil-lee-uh";

/**
 * The only approved Tradebilia homepage phrase loop and TNN closing-tagline
 * source. Keep the entries in the exact homepage display order.
 */
export const TNN_HOMEPAGE_TAGLINES = {
  why_buy_or_sell: "Why buy or sell when you can trade?",
  trade_what_you_have: "Trade what you have. Get what you want.",
  have_it_want_it: "Have it. Want it. Trade it.",
  your_collection: "Your collection. Your trade. Your next find.",
  dont_buy_or_sell: "Don’t buy it. Don’t sell it. Trade for it.",
  turn_what_you_have: "Turn what you have into what you want.",
  collect_connect_trade: "Collect. Connect. Trade.",
  where_collectors_trade: "Where collectors trade what they love.",
  one_collection: "One collection. Endless possibilities.",
  smarter_way: "The smarter way to collect.",
  whats_yours: "What’s yours could be someone else’s treasure.",
  trade_your_way: "Trade your way to the collection you want",
} as const;

export const TNN_HOMEPAGE_TAGLINE_IDS = [
  "why_buy_or_sell",
  "trade_what_you_have",
  "have_it_want_it",
  "your_collection",
  "dont_buy_or_sell",
  "turn_what_you_have",
  "collect_connect_trade",
  "where_collectors_trade",
  "one_collection",
  "smarter_way",
  "whats_yours",
  "trade_your_way",
] as const;

export type TnnHomepageTaglineId = typeof TNN_HOMEPAGE_TAGLINE_IDS[number];
/** Ordered text values consumed by the public homepage phrase loop. */
export const TNN_HOMEPAGE_PHRASES = TNN_HOMEPAGE_TAGLINE_IDS.map((id) => TNN_HOMEPAGE_TAGLINES[id]);
export const TNN_DEFAULT_CLOSING_TAGLINE_ID: TnnHomepageTaglineId = "why_buy_or_sell";

export function isTnnHomepageTaglineId(value: unknown): value is TnnHomepageTaglineId {
  return typeof value === "string" && TNN_HOMEPAGE_TAGLINE_IDS.includes(value as TnnHomepageTaglineId);
}

/** Pure, injectable random selection for one stable TNN draft closing. */
export function chooseTnnClosingTaglineId(randomValue = Math.random()): TnnHomepageTaglineId {
  const normalizedRandom = Number.isFinite(randomValue) ? Math.min(Math.max(randomValue, 0), 0.999999) : 0.5;
  return TNN_HOMEPAGE_TAGLINE_IDS[Math.floor(normalizedRandom * TNN_HOMEPAGE_TAGLINE_IDS.length)] ?? TNN_DEFAULT_CLOSING_TAGLINE_ID;
}

export function getTnnHomepageTagline(taglineId: TnnHomepageTaglineId) {
  return TNN_HOMEPAGE_TAGLINES[taglineId];
}

/**
 * The tagline remains verbatim while the spoken close receives sentence
 * punctuation when required, then ends with the required Tradebilia sign-off.
 */
export function formatTnnRequiredClosing(taglineId: TnnHomepageTaglineId) {
  const tagline = getTnnHomepageTagline(taglineId).trim();
  const completedTagline = /[.!?]$/.test(tagline) ? tagline : `${tagline}.`;
  return `${completedTagline} Tradebilia.`;
}

export const TNN_DUO_OPENING_STYLE_VALUES = ["classic", "alongside", "joined", "here_with"] as const;
export type TnnDuoOpeningStyle = typeof TNN_DUO_OPENING_STYLE_VALUES[number];
export type TnnDuoOpeningStyleSelection = TnnDuoOpeningStyle | "random";
/** Review-only assignment; speaker labels are never spoken or rendered as captions. */
export type TnnTranscriptTurn = { speaker: "max" | "sidney"; text: string };
export type TnnDuoOpening = {
  label: string;
  /** Review-only combined preview; never rendered as a single speaker's line. */
  script: string;
  maxLine: string;
  sidneyLine: string;
};

/** Approved, fact-neutral two-voice exchanges for a duo TNN report. */
export const TNN_DUO_OPENING_STYLES: Record<TnnDuoOpeningStyle, TnnDuoOpening> = {
  classic: {
    label: "Classic co-anchor handoff",
    maxLine: "Breaking News from Tradebilia. I'm Max Tradebloski.",
    sidneyLine: "And I'm Sidney Tradewell.",
    script: "Breaking News from Tradebilia. I'm Max Tradebloski. And I'm Sidney Tradewell.",
  },
  alongside: {
    label: "Newsroom handoff",
    maxLine: "Breaking News from Tradebilia. I'm Max Tradebloski.",
    sidneyLine: "And I'm Sidney Tradewell, joining you from the TNN Network.",
    script: "Breaking News from Tradebilia. I'm Max Tradebloski. And I'm Sidney Tradewell, joining you from the TNN Network.",
  },
  joined: {
    label: "Reporting handoff",
    maxLine: "Breaking News from Tradebilia. I'm Max Tradebloski.",
    sidneyLine: "And I'm Sidney Tradewell, reporting for the TNN Network.",
    script: "Breaking News from Tradebilia. I'm Max Tradebloski. And I'm Sidney Tradewell, reporting for the TNN Network.",
  },
  here_with: {
    label: "Welcome handoff",
    maxLine: "Breaking News from Tradebilia. I'm Max Tradebloski.",
    sidneyLine: "And I'm Sidney Tradewell. Welcome to the TNN Network.",
    script: "Breaking News from Tradebilia. I'm Max Tradebloski. And I'm Sidney Tradewell. Welcome to the TNN Network.",
  },
} as const;

export const TNN_DEFAULT_DUO_OPENING_STYLE: TnnDuoOpeningStyle = "classic";

export function isTnnDuoOpeningStyle(value: unknown): value is TnnDuoOpeningStyle {
  return typeof value === "string" && TNN_DUO_OPENING_STYLE_VALUES.includes(value as TnnDuoOpeningStyle);
}

export function chooseTnnDuoOpeningStyle(randomValue = Math.random()): TnnDuoOpeningStyle {
  const normalizedRandom = Number.isFinite(randomValue) ? Math.min(Math.max(randomValue, 0), 0.999999) : 0.5;
  return TNN_DUO_OPENING_STYLE_VALUES[Math.floor(normalizedRandom * TNN_DUO_OPENING_STYLE_VALUES.length)] ?? TNN_DEFAULT_DUO_OPENING_STYLE;
}

/**
 * Purely numeric grades are editorially rendered without meaningless trailing
 * zeros (for example, `10.00` becomes `10` and `9.0` becomes `9`). Grade
 * strings with qualifiers such as `9.0 A` remain intact because their suffix
 * carries grading meaning.
 */
export function formatTnnGrade(
  certificationCompany: string | null | undefined,
  customGradingCompany: string | null | undefined,
  grade: string | number | null | undefined,
) {
  const rawCompany = String(certificationCompany || customGradingCompany || "").trim();
  const company = /^(?:other|unknown|n\/a|none|null|not specified)$/i.test(rawCompany) ? "" : rawCompany;
  const rawGrade = String(grade ?? "").trim();
  if (!rawGrade) return company;

  const numericGrade = /^([+-]?\d+(?:\.\d+)?)$/.exec(rawGrade);
  if (numericGrade && Number(numericGrade[1]) <= 0) return "";
  const normalizedGrade = numericGrade
    ? String(Number(numericGrade[1]))
    : rawGrade;

  return [company, normalizedGrade].filter(Boolean).join(" ");
}
