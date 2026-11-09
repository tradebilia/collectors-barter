import { parseTestAiDetails, resolveTestAiGradingCompany } from './testAiCriteria';

export type GuideTargetInput = {
  title: string;
  category: string;
  grade?: string | null;
  condition?: string | null;
  itemType?: string | null;
  certificationCompany?: string | null;
  gradingCompany?: string | null;
  itemDetails?: string | null;
};

/** Target binding only; no price, provider assertion, or browser trust flag. */
export function guideTargetInput(target: GuideTargetInput) {
  const details = parseTestAiDetails(target.itemDetails);
  return {
    title: target.title, category: target.category, grade: target.grade ?? undefined,
    condition: target.condition ?? undefined, itemType: target.itemType ?? undefined,
    certificationCompany: resolveTestAiGradingCompany(details, target.certificationCompany ?? target.gradingCompany ?? undefined) || undefined,
    itemDetails: target.itemDetails ?? undefined,
  };
}

/** Preserve the existing source query; bind its result to the actual valuation target. */
export function buildCoinGuideLookupInput(sourceTarget: GuideTargetInput, valuationTarget: GuideTargetInput = sourceTarget) {
  const details = parseTestAiDetails(sourceTarget.itemDetails);
  const year = String(details.year ?? details.issueYear ?? details.mintYear ?? '').trim();
  const variety = String(details.variety ?? details.varietyName ?? details.coinType ?? details.series ?? '').replace(/\s+/g, ' ').trim();
  const rawMintMark = String(details.mintMark ?? details.mint ?? details.mintmark ?? '').trim();
  return {
    year, variety, mintMark: /^[A-Za-z]$/.test(rawMintMark) ? rawMintMark.toUpperCase() : undefined,
    guideTarget: guideTargetInput(valuationTarget),
  };
}
