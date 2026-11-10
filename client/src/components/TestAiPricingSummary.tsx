import type { MarketProfile } from '../../../server/testAiComparableEngine';
import type { AnalysisSnapshot } from '../../../server/testAiAnalysisSnapshot';
import { TEST_AI_VALUE_UNAVAILABLE_MESSAGE } from '../../../shared/testAiEvidenceNormalization';

export function pricingBasisLabel(basis: MarketProfile['valuationBasis'] | undefined): string {
  return basis === 'market_sales' ? 'Recent comparable sales'
    : basis === 'guide_fallback' ? 'Guide fallback — limited market evidence'
    : 'Insufficient evidence';
}

/** Primary values must be actual positive finite numbers, not coerced diagnostics. */
export function hasUsableTestAiPrimary(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function money(value: number | null | undefined): string {
  return hasUsableTestAiPrimary(value) ? `$${value.toLocaleString()}` : 'Not verified';
}

/** Bounded plain diagnostic text only; never serialize query errors or provider objects. */
export function boundedTestAiSourceMessage(...values: unknown[]): string | null {
  const parts = values.slice(0, 8).flatMap((value) => Array.isArray(value) ? value.slice(0, 8) : [value])
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.slice(0, 1200).replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/<[^>]*>/g, '').replace(/https?:\/\/\S+/gi, '[source URL omitted]')
      .replace(/\b(?:authorization|bearer|api[_ -]?key|token|secret|password)\s*[:=]\s*\S+/gi, '[private detail omitted]')
      .replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return Array.from(new Set(parts)).join(' ').slice(0, 600) || null;
}

export type TestAiPricingSummaryItem = {
  label: string;
  item: { title: string };
  profile: MarketProfile;
  /** Final returned snapshot evidence only, never a newer browser source summary. */
  evidence?: AnalysisSnapshot['evidence'] | null;
};

function frozenSourceFacts(evidence: TestAiPricingSummaryItem['evidence']): string {
  const warnings = (evidence?.reviewFlags ?? []).slice(0, 20).map((warning) => boundedTestAiSourceMessage(warning)).filter(Boolean);
  if (!evidence?.sourceStatuses?.length) return `Source coverage was not included in this analysis.${warnings.length ? ` Review: ${warnings.join(' ')}` : ''}`;
  const sources = evidence.sourceStatuses.slice(0, 60).map((source) => {
    const message = boundedTestAiSourceMessage(source.message);
    const unresolved = /\b(?:review|selection|select|unresolved|candidate not confirmed)\b/i.test(message ?? '');
    const outcome = source.status === 'error'
      ? 'could not be checked; failed or unreadable retrieval does not establish zero matches'
      : source.status === 'partial'
        ? 'partial/error retrieval; known observations are retained; unreadable responses are not zero matches'
        : source.status === 'idle'
          ? 'not searched or not completed'
          : source.status === 'not_found'
            ? unresolved ? 'unresolved review or selection, not a completed empty lookup' : 'no record returned for this analysis lookup'
            : source.status === 'success' ? 'reported result available' : 'source coverage unknown for this analysis';
    return `${boundedTestAiSourceMessage(source.label) ?? 'Reported source'}: ${outcome}${message ? ` — ${message}` : ''}.`;
  });
  return `Reported source outcomes for this frozen analysis: ${sources.join(' ')}${warnings.length ? ` Review: ${warnings.join(' ')}` : ''}`;
}

/** Existing final-summary layout, with no candidate filtering or client pricing calculation. */
export function TestAiPricingSummary({ items }: { items: TestAiPricingSummaryItem[] }) {
  return <section aria-label="Final valuation summary" className="rounded-xl border-2 border-emerald-500/60 bg-emerald-950/20 p-4 space-y-3">
    <div>
      <p className="text-emerald-200 text-sm font-bold uppercase tracking-wide">Final valuation summary</p>
      <p className="mt-1 text-gray-300 text-xs">Sufficient valid recent sales determine the value alone. Otherwise, an applicable verified guide may provide a clearly labeled fallback estimate.</p>
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map(({ label, item, profile, evidence }) => {
        const range = profile.marketRange?.supported
          ? `${money(profile.marketRange.low)}–${money(profile.marketRange.high)}` : 'Not verified';
        const isMarket = profile.valuationBasis === 'market_sales';
        const isGuide = profile.valuationBasis === 'guide_fallback';
        const hasPrimary = hasUsableTestAiPrimary(profile.primaryValue);
        return <div key={label} className="rounded-lg border border-emerald-700/50 bg-gray-950/50 p-3 space-y-2">
          <p className="text-white text-sm font-semibold">{label} · {item.title}</p>
          <p className="text-[10px] text-emerald-100"><span className="font-semibold">Valuation basis:</span> {pricingBasisLabel(profile.valuationBasis)}</p>
          <div className="grid grid-cols-2 gap-2">
            <div><p className="text-[9px] uppercase tracking-wide text-gray-500">{isGuide ? 'Guide fallback estimate' : 'Estimated value'}</p><p className={hasPrimary ? 'text-xl font-bold text-emerald-200' : 'text-xl font-bold text-emerald-200 whitespace-normal break-words'}>{hasPrimary ? money(profile.primaryValue) : TEST_AI_VALUE_UNAVAILABLE_MESSAGE}</p></div>
            <div><p className="text-[9px] uppercase tracking-wide text-gray-500">Market evidence confidence</p><p className="text-xl font-bold capitalize text-white">{profile.evidenceQuality ?? 'low'}</p></div>
          </div>
          <p className="text-[9px] text-gray-400">Observed current-sale range: {range}{profile.marketRange?.supported && !isMarket ? ' (preliminary evidence only)' : ''} · Current accepted sales: {profile.currentWindowSaleCount ?? 0} · Category minimum: {profile.categoryEvidenceThresholds?.minimumSelectedSales ?? 'unavailable'}.</p>
          {hasUsableTestAiPrimary(profile.guideAnchorValue) && <p className="text-[9px] text-sky-200">Guide {isGuide ? 'fallback' : 'reference'}: {profile.guideAnchorSourceLabel ?? 'Verified guide'} · Grade {profile.guideAnchorGrade ?? 'unknown'}{profile.guideAnchorMatchType === 'mapped' ? ' (documented grade band)' : ''} · {money(profile.guideAnchorValue)}{isMarket ? ' · No guide contribution to the sale-based value.' : ''}</p>}
          <p className="text-[9px] text-gray-400">{profile.valuationBasisReason} {frozenSourceFacts(evidence)}</p>
          {!isMarket && <p className="text-[9px] text-amber-200">Cash guidance is withheld unless both items meet the definitive completed-sale evidence requirements. A guide estimate does not establish a supported market range.</p>}
        </div>;
      })}
    </div>
  </section>;
}
