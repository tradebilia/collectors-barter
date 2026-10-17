export const TNN_VIDEO_DURATION_SECONDS = 45 as const;
export const TNN_VIDEO_DURATIONS = [TNN_VIDEO_DURATION_SECONDS] as const;
export type TnnVideoDuration = typeof TNN_VIDEO_DURATIONS[number];

export const TNN_WEBSITE_TICKER = "WWW.Tradebilia.com";
export const TNN_NETWORK_SPOKEN_NAME = "the TNN Network";
export const TNN_TRADEBILIA_PRONUNCIATION = "trade-bil-lee-uh";
export const TNN_REQUIRED_CLOSING = "Tradebilia.";

/**
 * PSA numeric grades are editorially rendered without meaningless trailing
 * zeros (for example, `10.00` becomes `10` and `9.0` becomes `9`). Other
 * companies' grade strings may encode meaningful qualifiers and remain intact.
 */
export function formatTnnGrade(
  certificationCompany: string | null | undefined,
  customGradingCompany: string | null | undefined,
  grade: string | number | null | undefined,
) {
  const company = String(certificationCompany || customGradingCompany || "").trim();
  const rawGrade = String(grade ?? "").trim();
  if (!rawGrade) return company;

  const isPsa = /(?:^|\b)PSA(?:\b|$)/i.test(company);
  const numericGrade = /^([+-]?\d+(?:\.\d+)?)$/.exec(rawGrade);
  const normalizedGrade = isPsa && numericGrade
    ? String(Number(numericGrade[1]))
    : rawGrade;

  return [company, normalizedGrade].filter(Boolean).join(" ");
}
