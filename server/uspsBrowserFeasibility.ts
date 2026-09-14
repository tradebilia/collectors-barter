export type UspsBrowserResultCategory =
  | "normal_result"
  | "challenge_or_block"
  | "timeout"
  | "unavailable";

export type UspsBrowserClassification = {
  category: UspsBrowserResultCategory;
  confidence: "high" | "medium" | "low";
  title?: string;
  evidence: string;
};

export function classifyUspsBrowserResponse(input: {
  htmlText: string;
  title?: string;
}): UspsBrowserClassification {
  const text = input.htmlText.replace(/\s+/g, " ").trim();
  const lower = text.toLowerCase();
  const title = input.title?.replace(/\s+/g, " ").trim() || undefined;

  if (/captcha|verify you are human|access denied|request blocked|unusual traffic|robot/i.test(`${title ?? ""} ${lower}`)) {
    return { category: "challenge_or_block", confidence: "high", title, evidence: text.slice(0, 1_000) };
  }
  if (/tracking not available|label created, not yet in system|pre-shipment/i.test(lower)) {
    return { category: "normal_result", confidence: "medium", title, evidence: text.slice(0, 1_000) };
  }
  if (/usps tracking|track your package|tracking results/i.test(lower)) {
    return { category: "normal_result", confidence: "low", title, evidence: text.slice(0, 1_000) };
  }
  return { category: "unavailable", confidence: "medium", title, evidence: text.slice(0, 1_000) };
}
