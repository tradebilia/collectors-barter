export const TNN_VIDEO_DURATION_SECONDS = 45 as const;
export const TNN_VIDEO_DURATIONS = [TNN_VIDEO_DURATION_SECONDS] as const;
export type TnnVideoDuration = typeof TNN_VIDEO_DURATIONS[number];

export const TNN_WEBSITE_TICKER = "www.Tradebilia.com";
export const TNN_NETWORK_SPOKEN_NAME = "the TNN Network";
export const TNN_TRADEBILIA_PRONUNCIATION = "trade-bil-lee-uh";
export const TNN_REQUIRED_CLOSING = "Tradebilia.";

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
