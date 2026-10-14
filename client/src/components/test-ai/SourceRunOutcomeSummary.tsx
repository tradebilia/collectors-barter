import { summarizeTestAiSourceRunOutcomes, type EvidenceSourceDecision } from '@shared/testAiEvidenceNormalization';

export function SourceRunOutcomeSummary({ sourceDecisions }: { sourceDecisions: EvidenceSourceDecision[] }) {
  const sourceRunOutcomes = summarizeTestAiSourceRunOutcomes(sourceDecisions);
  return <div className="rounded-lg border border-indigo-700/30 bg-indigo-950/15 p-2.5 space-y-2" aria-label="This-run source outcomes">
    <div><p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-200">This-run source outcomes</p><p className="mt-0.5 text-[9px] text-gray-400">A plain-language account of what each selected source returned and what the analyzer can use in this run. This is not a provider scorecard or historical reliability rate, and no result is stored.</p></div>
    <div className="grid gap-1 text-[9px] sm:grid-cols-2 lg:grid-cols-5">
      <p className="rounded border border-sky-700/30 bg-sky-950/20 px-2 py-1 text-sky-100"><strong>Returned records</strong><br />All price-bearing records received from the source.</p>
      <p className="rounded border border-emerald-700/30 bg-emerald-950/20 px-2 py-1 text-emerald-100"><strong>Sent to analyzer</strong><br />Records classified as valuation, current-value, or historical evidence.</p>
      <p className="rounded border border-amber-700/30 bg-amber-950/20 px-2 py-1 text-amber-100"><strong>Held out</strong><br />Completed records kept for review but not sent as evidence.</p>
      <p className="rounded border border-gray-700/40 bg-gray-950/30 px-2 py-1 text-gray-300"><strong>Context / review</strong><br />Asking prices, references, mismatches, and other non-evidence records.</p>
      <p className="rounded border border-rose-700/30 bg-rose-950/20 px-2 py-1 text-rose-100"><strong>Unavailable</strong><br />No result or provider issue—not proof the item is wrong.</p>
    </div>
    <div className="space-y-1.5">
      {sourceRunOutcomes.map((outcome) => {
        const unavailable = outcome.status === 'error' || outcome.status === 'not_found';
        const marketSource = outcome.returned > 0 || outcome.completed > 0 || outcome.accepted > 0 || outcome.currentValue > 0 || outcome.context > 0;
        const state = outcome.timedOut ? 'timed out' : unavailable ? outcome.status.replace('_', ' ') : outcome.status === 'success' ? 'completed' : 'checking';
        const sentToAnalyzer = outcome.accepted + outcome.currentValue + outcome.historicalTrend;
        return <div key={outcome.id} className="rounded border border-slate-700/50 bg-gray-950/35 p-2">
          <div className="flex flex-wrap items-center justify-between gap-1"><p className="text-[10px] font-semibold text-gray-200">{outcome.label}</p><span className={`rounded px-1.5 py-0.5 text-[8px] uppercase ${outcome.timedOut || unavailable ? 'bg-rose-950/50 text-rose-300' : outcome.status === 'success' ? 'bg-emerald-950/50 text-emerald-200' : 'bg-slate-800 text-slate-300'}`}>{state}</span></div>
          {unavailable ? <p className="mt-1 text-[9px] text-rose-100/80">{outcome.message || 'No usable result was returned. This affects source coverage only.'}</p> : marketSource ? <><div className="mt-1 grid gap-1 text-[9px] sm:grid-cols-4"><p className="text-sky-200"><strong>{outcome.returned}</strong> returned records</p><p className="text-emerald-200"><strong>{sentToAnalyzer}</strong> sent to analyzer</p><p className="text-amber-200"><strong>{outcome.excludedFromValuation}</strong> held out</p><p className="text-gray-300"><strong>{outcome.context}</strong> context / review</p></div><p className="mt-1 text-[8px] text-gray-500">Completed sales found: {outcome.completed}. Accepted for valuation: {outcome.accepted}. Current-value market evidence: {outcome.currentValue}. Historical trend records: {outcome.historicalTrend}.</p></> : <p className="mt-1 text-[9px] text-gray-400">Reference or certification source; no market-record outcome applies.</p>}
        </div>;
      })}
    </div>
  </div>;
}
