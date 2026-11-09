import type { MarketProfile } from '../../../server/testAiComparableEngine';

export function pricingBasisLabel(basis: MarketProfile['valuationBasis'] | undefined): string {
  return basis === 'market_sales' ? 'Recent comparable sales'
    : basis === 'guide_fallback' ? 'Guide fallback — limited market evidence'
    : 'Insufficient evidence';
}

function money(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? `$${value.toLocaleString()}` : 'Not verified';
}

/** Existing final-summary layout, with no candidate filtering or client pricing calculation. */
export function TestAiPricingSummary({ items }: {
  items: Array<{ label: string; item: { title: string }; profile: MarketProfile }>;
}) {
  return <section aria-label="Final valuation summary" className="rounded-xl border-2 border-emerald-500/60 bg-emerald-950/20 p-4 space-y-3">
    <div>
      <p className="text-emerald-200 text-sm font-bold uppercase tracking-wide">Final valuation summary</p>
      <p className="mt-1 text-gray-300 text-xs">Sufficient valid recent sales determine the value alone. Otherwise, an applicable verified guide may provide a clearly labeled fallback estimate.</p>
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map(({ label, item, profile }) => {
        const range = profile.marketRange?.supported
          ? `${money(profile.marketRange.low)}–${money(profile.marketRange.high)}` : 'Not verified';
        const isMarket = profile.valuationBasis === 'market_sales';
        const isGuide = profile.valuationBasis === 'guide_fallback';
        return <div key={label} className="rounded-lg border border-emerald-700/50 bg-gray-950/50 p-3 space-y-2">
          <p className="text-white text-sm font-semibold">{label} · {item.title}</p>
          <p className="text-[10px] text-emerald-100"><span className="font-semibold">Valuation basis:</span> {pricingBasisLabel(profile.valuationBasis)}</p>
          <div className="grid grid-cols-2 gap-2">
            <div><p className="text-[9px] uppercase tracking-wide text-gray-500">{isGuide ? 'Guide fallback estimate' : 'Estimated value'}</p><p className="text-xl font-bold text-emerald-200">{money(profile.primaryValue)}</p></div>
            <div><p className="text-[9px] uppercase tracking-wide text-gray-500">Market evidence confidence</p><p className="text-xl font-bold capitalize text-white">{profile.evidenceQuality ?? 'low'}</p></div>
          </div>
          <p className="text-[9px] text-gray-400">Observed current-sale range: {range}{profile.marketRange?.supported && !isMarket ? ' (preliminary evidence only)' : ''} · Current accepted sales: {profile.currentWindowSaleCount ?? 0} · Category minimum: {profile.categoryEvidenceThresholds?.minimumSelectedSales ?? 'unavailable'}.</p>
          {profile.guideAnchorValue !== null && <p className="text-[9px] text-sky-200">Guide {isGuide ? 'fallback' : 'reference'}: {profile.guideAnchorSourceLabel ?? 'Verified guide'} · Grade {profile.guideAnchorGrade ?? 'unknown'}{profile.guideAnchorMatchType === 'mapped' ? ' (documented grade band)' : ''} · {money(profile.guideAnchorValue)}{isMarket ? ' · No guide contribution to the sale-based value.' : ''}</p>}
          <p className="text-[9px] text-gray-400">{profile.valuationBasisReason}</p>
          {!isMarket && <p className="text-[9px] text-amber-200">Cash guidance is withheld unless both items meet the definitive completed-sale evidence requirements. A guide estimate does not establish a supported market range.</p>}
        </div>;
      })}
    </div>
  </section>;
}
