import React from 'react';
import type { NormalizedEvidenceSummary } from '../../../../shared/testAiEvidenceNormalization';
import { collectEbayCandidateDisplayOccurrences, mergeCandidateDisplayGroups, reconcileCandidateFinalUse } from '../../../../shared/testAiCandidateLedger';
import { sourceVisualDisplayGroups, sourceRetainedDisplayGroups } from '../../../../shared/testAiSourceDisplay';
import { TestAiCandidateMasterList } from '../TestAiCandidateMasterList';
import { TestAiSafeImage } from '../TestAiSafeImage';
import { useTestAiCandidateDisplay } from '../TestAiCandidateStatus';

export type EvidenceReviewSource = { id: string; label: string; packet?: any; rows?: any[]; status?: string; message?: string | null };

/** Display the complete retained population, not the small analyzer submission subset. */
export function evidenceReviewCandidates(source: EvidenceReviewSource): any[] {
  const packet = source.packet;
  const array = (value: unknown): any[] => Array.isArray(value) ? value.filter(row => row && typeof row === 'object') : [];
  const groups = source.id === 'ebay_active' ? [collectEbayCandidateDisplayOccurrences(packet)] : [
    ...sourceRetainedDisplayGroups(packet), ...sourceVisualDisplayGroups(packet),
    array(packet?.preVisionFilter?.excludedListings), array(packet?.activeListings),
    array(packet?.data?.auctions), array(packet?.records), array(packet?.data?.records), array(packet?.data?.sales),
  ];
  return mergeCandidateDisplayGroups([...groups, array(source.rows)], { sourceId: source.id });
}

export type UsedValuationPriceSummary = { count: number; low: number | null; high: number | null; average: number | null };

function candidatePrice(row: any): number | null {
  for (const value of [row?.price, row?.soldPrice, row?.finalPrice, row?.transactionPrice]) {
    const parsed = typeof value === 'string' ? Number(value.replace(/[$,]/g, '')) : Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

export function summarizeUsedValuationPrices(rows: any[]): UsedValuationPriceSummary {
  const prices = rows.filter((row) => row?.valuationUse?.use?.code === 'CURRENT_SALES_PRIMARY')
    .map(candidatePrice).filter((price): price is number => price !== null);
  if (!prices.length) return { count: 0, low: null, high: null, average: null };
  return { count: prices.length, low: Math.min(...prices), high: Math.max(...prices), average: prices.reduce((total, price) => total + price, 0) / prices.length };
}

function formatRunSummaryPrice(value: number | null): string {
  return value === null ? 'Not available' : `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function TestAiEvidenceReview({ item, side, summary, sources }: {
  item: { id?: number; title: string; category: string; itemType?: string | null; primaryPhotoUrl?: string | null };
  side: 'left' | 'right'; summary: NormalizedEvidenceSummary; sources: EvidenceReviewSource[];
}) {
  const context = useTestAiCandidateDisplay();
  const scopeSide = side === 'left' ? 'item_a' : 'item_b';
  const groups = sources.map(source => ({ ...source, candidates: evidenceReviewCandidates(source) }));
  const displayed = groups.flatMap(source => reconcileCandidateFinalUse(source.candidates, context.outcome, { side: scopeSide, sourceId: source.id }));
  const used = displayed.filter(row => row.valuationUse?.use?.code === 'CURRENT_SALES_PRIMARY').length;
  const usedPriceSummary = summarizeUsedValuationPrices(displayed);
  const resolved = displayed.filter(row => row.valuationUse?.use?.code).length;
  const valuationNotRun = !context.outcome;
  return <section className="space-y-4 rounded-xl border border-cyan-800/40 bg-slate-950/40 p-4" aria-label={`${scopeSide === 'item_a' ? 'Item A' : 'Item B'} evidence review`}>
    <header><h2 className="text-base font-semibold text-cyan-200">Evidence Review — candidate decisions</h2><p className="mt-1 text-xs text-slate-400">Each candidate has one outcome and its reason. Metadata and visual differences are available beneath each image pair.</p></header>
    <div className="rounded-lg border border-cyan-800/40 bg-slate-900/70 p-3" aria-label="Evidence review terminology key">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Terminology key</h3>
      <div className="mt-2 grid gap-2 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-3">
        <p><strong className="text-emerald-200">Accepted for valuation</strong> — the final analysis selected this candidate as usable valuation evidence.</p>
        <p><strong className="text-amber-200">Valuation not run</strong> — the candidate has not been through final valuation analysis yet; this is not a rejection.</p>
        <p><strong className="text-rose-200">Not accepted</strong> — a hard identity, evidence, or safety rule prevented valuation use.</p>
        <p><strong className="text-slate-200">Not used</strong> — final analysis ran, but this candidate was not selected for the valuation result.</p>
        <p><strong className="text-cyan-200">Candidate</strong> — a retained marketplace record shown for review; appearing here does not automatically make it a comparable.</p>
        <p><strong className="text-slate-200">Unknown</strong> — the source did not provide that field; it is not automatically treated as a mismatch.</p>
      </div>
    </div>
    <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Target item · {side === 'left' ? 'Item A' : 'Item B'}</h3><div className="flex gap-3">
        {item.primaryPhotoUrl ? <TestAiSafeImage src={item.primaryPhotoUrl} alt="Target item reference" className="h-24 w-20 rounded border border-cyan-800/40 bg-slate-950 object-contain" /> : <div className="flex h-24 w-20 items-center justify-center rounded border border-slate-700 text-center text-xs text-slate-500">Target image unavailable</div>}
        <div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-100">{item.id ? <a className="hover:text-cyan-200 hover:underline" href={`/item/${item.id}`} target="_blank" rel="noreferrer">{item.title}</a> : item.title}</p><p className="mt-1 text-xs text-slate-400">{item.category.replace(/_/g, ' ')}{item.itemType ? ` · ${item.itemType.replace(/_/g, ' ')}` : ''}</p></div>
      </div></div>
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3"><h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Run summary · displayed candidates only</h3><div className="grid grid-cols-3 gap-2 text-center">
        <div><p className="text-xl font-semibold text-cyan-200">{displayed.length}</p><p className="text-xs text-slate-400">Candidates</p></div>
        <div><p className="text-xl font-semibold text-emerald-200">{used}</p><p className="text-xs text-slate-400">Used in valuation</p></div>
        <div><p className="text-xl font-semibold text-amber-200">{Math.max(0, displayed.length - used)}</p><p className="text-xs text-slate-400">Not used</p></div>
      </div>
      <div className="mt-3 rounded border border-emerald-800/40 bg-emerald-950/20 p-2" aria-label="Prices from items used in valuation">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Prices from items used in valuation</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div><p className="text-sm font-semibold text-emerald-100">{formatRunSummaryPrice(usedPriceSummary.low)}</p><p className="text-[10px] text-slate-400">Low Price</p></div>
          <div><p className="text-sm font-semibold text-emerald-100">{formatRunSummaryPrice(usedPriceSummary.high)}</p><p className="text-[10px] text-slate-400">High Price</p></div>
          <div><p className="text-sm font-semibold text-emerald-100">{formatRunSummaryPrice(usedPriceSummary.average)}</p><p className="text-[10px] text-slate-400">Average Price</p></div>
        </div>
        <p className="mt-1 text-[10px] text-slate-500">Based only on {usedPriceSummary.count} candidate{usedPriceSummary.count === 1 ? '' : 's'} with the final primary-sales valuation-use decision.</p>
      </div>
      {valuationNotRun ? <p className="mt-2 text-xs text-amber-200">Final valuation analysis has not run yet; current valuation counts are 0.</p> : resolved < displayed.length && <p className="mt-2 text-xs text-amber-200">{displayed.length - resolved} candidate decisions have no resolved final valuation record; their cards explain what is known.</p>}</div>
    </div>
    <div aria-label="Evidence review candidate results" className="space-y-4">
      {groups.filter(source => source.candidates.length > 0).map(source => <TestAiCandidateMasterList key={source.id} listings={source.candidates} sourceLabel={source.label} targetImageUrl={item.primaryPhotoUrl} scope={{ side: scopeSide, sourceId: source.id }} />)}
      {displayed.length === 0 && <p role="status" className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300">No candidate records are available yet. Source status and any retrieval errors are listed below; this is not proof that the marketplace has no matches.</p>}
    </div>
    <div className="rounded-lg border border-slate-800 p-3"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Source results</h3><div className="space-y-2">{groups.map(source => <div key={source.id} className="text-xs"><div className="flex flex-wrap items-baseline justify-between gap-1"><span className="text-slate-200">{source.label}</span><span className={source.status === 'error' || source.status === 'partial' ? 'text-amber-200' : 'text-slate-400'}>{source.candidates.length > 0 ? `${source.candidates.length} candidates displayed${source.status === 'partial' || source.status === 'error' ? ' · partial/error response retained' : ''}` : source.status === 'error' ? 'Request failed — no candidate records' : source.status === 'idle' ? 'Not searched or still awaiting response' : source.status === 'not_found' ? 'No usable candidate records / review unresolved' : 'No candidate records returned'}</span></div>{source.message && <p className="mt-1 rounded border border-amber-700/40 bg-amber-950/20 px-2 py-1 text-amber-200">{source.message}</p>}</div>)}</div></div>
    <details className="rounded-lg border border-slate-800 bg-slate-950/50 p-3"><summary className="cursor-pointer text-xs font-semibold text-slate-300">Evidence diagnostics — identity, guides and source notes</summary><div className="mt-3 space-y-3 text-xs text-slate-400">
      <p>{summary.identityReadiness.missingCriticalFields.length ? `Missing target identifiers: ${summary.identityReadiness.missingCriticalFields.join(', ')}` : 'Target category-critical identifiers are supplied.'}</p>
      <p>{summary.evidenceSufficiency.message}</p>
      {summary.identity.map(field => <p key={field.key}>{field.label}: {field.value}</p>)}
      {summary.reviewFlags.map((flag, index) => <p key={index} className="text-amber-200">{flag.message}</p>)}
      {summary.guideAnchors.map((anchor, index) => <p key={index}>{anchor.sourceLabel}: {anchor.currency || 'Currency unknown'} {anchor.value.toLocaleString()} · grade {anchor.grade || 'unknown'} · guide reference, not a completed sale.</p>)}
    </div></details>
  </section>;
}
