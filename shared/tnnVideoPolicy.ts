export const TNN_VIDEO_DURATION_SECONDS = 45 as const;
export const TNN_VIDEO_DURATIONS = [TNN_VIDEO_DURATION_SECONDS] as const;
export type TnnVideoDuration = typeof TNN_VIDEO_DURATIONS[number];

export const TNN_WEBSITE_TICKER = "www.Tradebilia.com";
export const TNN_NETWORK_SPOKEN_NAME = "the TNN Network";
export const TNN_TRADEBILIA_PRONUNCIATION = "trade-bil-lee-uh";
export const TNN_REQUIRED_CLOSING = "Tradebilia.";

export const TNN_DUO_OPENING_STYLE_VALUES = ["classic", "alongside", "joined", "here_with"] as const;
export type TnnDuoOpeningStyle = typeof TNN_DUO_OPENING_STYLE_VALUES[number];
export type TnnDuoOpeningStyleSelection = TnnDuoOpeningStyle | "random";

/** Approved, fact-neutral handoffs for a duo TNN report. */
export const TNN_DUO_OPENING_STYLES: Record<TnnDuoOpeningStyle, { label: string; script: string }> = {
  classic: {
    label: "Classic co-anchor handoff",
    script: "I'm Max Tradebloski, and I'm Sidney Tradewell.",
  },
  alongside: {
    label: "Newsroom handoff",
    script: "I'm Max Tradebloski, and I'm Sidney Tradewell, joining you from the TNN Network.",
  },
  joined: {
    label: "Reporting handoff",
    script: "I'm Max Tradebloski, and I'm Sidney Tradewell, reporting for the TNN Network.",
  },
  here_with: {
    label: "Welcome handoff",
    script: "I'm Max Tradebloski, and I'm Sidney Tradewell. Welcome to the TNN Network.",
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
  const company = String(certificationCompany || customGradingCompany || "").trim();
  const rawGrade = String(grade ?? "").trim();
  if (!rawGrade) return company;

  const numericGrade = /^([+-]?\d+(?:\.\d+)?)$/.exec(rawGrade);
  const normalizedGrade = numericGrade
    ? String(Number(numericGrade[1]))
    : rawGrade;

  return [company, normalizedGrade].filter(Boolean).join(" ");
}
