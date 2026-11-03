import { summarizeTestAiSourceRunOutcomes, type EvidenceSourceDecision } from '@shared/testAiEvidenceNormalization';

export function SourceRunOutcomeSummary({ sourceDecisions }: { sourceDecisions: EvidenceSourceDecision[] }) {
  const sourceRunOutcomes = summarizeTestAiSourceRunOutcomes(sourceDecisions);
  return <div className="rounded-lg border border-indigo-700/30 bg-indigo-950/15 p-2.5 space-y-2" aria-label="This-run source outcomes">
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-200">Where the pricing evidence is going</p>
      <p className="mt-0.5 text-[9px] text-gray-400">One simple summary of each source: what can support valuation, what shows current market pricing, what shows historical movement, and what is context only.</p>
    </div>
    <div className="grid gap-1 text-[9px] sm:grid-cols-2 lg:grid-cols-6">
      <p className="rounded border border-sky-700/30 bg-sky-950/20 px-2 py-1 text-sky-100"><strong>Returned</strong><br />Price-bearing records received.</p>
      <p className="rounded border border-emerald-700/30 bg-emerald-950/20 px-2 py-1 text-emerald-100"><strong>Sent to valuation</strong><br />Identity-checked completed-sale comparables.</p>
      <p className="rounded border border-cyan-700/30 bg-cyan-950/20 px-2 py-1 text-cyan-100"><strong>Current-value</strong><br />Active market evidence for today’s pricing.</p>
      <p className="rounded border border-amber-700/30 bg-amber-950/20 px-2 py-1 text-amber-100"><strong>Historical trend</strong><br />Older evidence showing price movement.</p>
      <p className="rounded border border-gray-700/40 bg-gray-950/30 px-2 py-1 text-gray-300"><strong>Context only</strong><br />Useful information not used as valuation evidence.</p>
      <p className="rounded border border-orange-700/30 bg-orange-950/20 px-2 py-1 text-orange-100"><strong>Held out</strong><br />Kept visible but excluded before valuation.</p>
    </div>
    <div className="space-y-1.5">
      {sourceRunOutcomes.map((outcome) => {
        const unavailable = outcome.status === 'error' || outcome.status === 'not_found';
        const marketSource = outcome.returned > 0 || outcome.completed > 0 || outcome.accepted > 0 || outcome.currentValue > 0 || outcome.context > 0;
        const state = outcome.timedOut ? 'timed out' : unavailable ? outcome.status.replace('_', ' ') : outcome.status === 'success' ? 'completed' : 'checking';
        return <div key={outcome.id} className="rounded border border-slate-700/50 bg-gray-950/35 p-2">
          <div className="flex flex-wrap items-center justify-between gap-1"><p className="text-[10px] font-semibold text-gray-200">{outcome.label}</p><span className={`rounded px-1.5 py-0.5 text-[8px] uppercase ${outcome.timedOut || unavailable ? 'bg-rose-950/50 text-rose-300' : outcome.status === 'success' ? 'bg-emerald-950/50 text-emerald-200' : 'bg-slate-800 text-slate-300'}`}>{state}</span></div>
          {unavailable ? <p className="mt-1 text-[9px] text-rose-100/80">{outcome.message || 'No usable result was returned. This affects source coverage only.'}</p> : marketSource ? <><div className="mt-1 grid gap-1 text-[9px] sm:grid-cols-6"><p className="text-sky-200"><strong>{outcome.returned}</strong> returned</p><p className="text-emerald-200"><strong>{outcome.accepted}</strong> sent to valuation</p><p className="text-cyan-200"><strong>{outcome.currentValue}</strong> current-value</p><p className="text-amber-200"><strong>{outcome.historicalTrend}</strong> historical trend</p><p className="text-gray-300"><strong>{outcome.context}</strong> context only</p><p className="text-orange-200"><strong>{outcome.excludedFromValuation}</strong> held out</p></div><p className="mt-1 text-[8px] text-gray-500">Completed sales found: {outcome.completed}. Sent to valuation is the final accepted comparable count.</p></> : <p className="mt-1 text-[9px] text-gray-400">Reference or certification source; no market-record destination applies.</p>}
        </div>;
      })}
    </div>
  </div>;
}
