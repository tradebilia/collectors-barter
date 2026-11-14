import React from 'react';
import type { NormalizedEvidenceSummary } from '../../../../shared/testAiEvidenceNormalization';
import { collectEbayCandidateDisplayOccurrences, mergeCandidateDisplayGroups, reconcileCandidateFinalUse } from '../../../../shared/testAiCandidateLedger';
import { sourceVisualDisplayGroups, sourceRetainedDisplayGroups } from '../../../../shared/testAiSourceDisplay';
import { isCurrentMarketContextSource } from '../../../../shared/testAiMarketContext';
import { candidateHistoricPrice, candidateHistoricSaleDate, hasActualVisualResponse } from '../../../../shared/testAiCandidateStatus';
import { candidateFinalDecision } from './candidateFinalDecision';
import { TestAiCandidateMasterList } from '../TestAiCandidateMasterList';
import { TestAiSafeImage } from '../TestAiSafeImage';
import { useTestAiCandidateDisplay } from '../TestAiCandidateStatus';

export type EvidenceReviewSource = { id: string; label: string; packet?: any; rows?: any[]; status?: string; message?: string | null };

/** Display the complete retained population, not the small analyzer submission subset. */
export function evidenceReviewCandidates(source: EvidenceReviewSource): any[] {
  const packet = source.packet;
  const array = (value: unknown): any[] => Array.isArray(value) ? value.filter(row => row && typeof row === 'object') : [];
  // Mercari's server-final ledger is authoritative: the packet also contains
  // pre-final visual/raw projections for diagnostics, but submitting those
  // copies can reintroduce the generic context-only transport shape and erase
  // the signed undated-sale admission. Keep the ledger's complete population
  // while avoiding duplicate stale projections in Item A intake.
  if (source.id === 'mercari_sold_comps') {
    const finalLedger = array(packet?.audit?.ledger);
    if (finalLedger.length) return mergeCandidateDisplayGroups([finalLedger], { sourceId: source.id });
  }
  const groups = source.id === 'ebay_active' ? [collectEbayCandidateDisplayOccurrences(packet)] : [
    ...sourceRetainedDisplayGroups(packet), ...sourceVisualDisplayGroups(packet),
    array(packet?.preVisionFilter?.excludedListings), array(packet?.activeListings),
    array(packet?.data?.auctions), array(packet?.records), array(packet?.data?.records), array(packet?.data?.sales),
  ];
  return mergeCandidateDisplayGroups([...groups, array(source.rows)], { sourceId: source.id });
}

export type UsedValuationPriceSummary = { count: number; low: number | null; high: number | null; average: number | null };
export type CurrentMarketPriceSummary = UsedValuationPriceSummary;
export type HistoricMarketContextSummary = UsedValuationPriceSummary & {
  oldestSaleDate: string | null; latestSaleDate: string | null; unknownSaleDateCount: number;
};

export function isConfirmedCurrentMarketMatch(row: any): boolean {
  return hasActualVisualResponse(row)
    && (row?.visualReviewStatus === 'match'
      || row?.visualExecution?.identity?.result === 'match'
      || row?.visualIdentityResult === 'match');
}

function isCurrentMarketContextCandidate(row: any): boolean {
  // eBay Active is current-market evidence, but it is not usable context until
  // the candidate has a proper metadata score, completed visual inspection,
  // and returned a confirmed or rough visual match. Unreviewed rows remain
  // visible for audit, but do not inflate the current-market count or prices.
  if (!hasActualVisualResponse(row)) return false;
  const visualResult = row?.visualReviewStatus
    ?? row?.visualExecution?.identity?.result
    ?? row?.visualIdentityResult;
  if (visualResult !== 'match' && visualResult !== 'rough_match') return false;
  const decisionCode = candidateFinalDecision(row).code;
  return decisionCode === 'ACTIVE_MARKET_CONTEXT_MATCH' || decisionCode === 'ACTIVE_MARKET_CONTEXT';
}

function candidatePrice(row: any): number | null {
  for (const value of [row?.price, row?.soldPrice, row?.salePrice, row?.finalPrice, row?.transactionPrice, row?.currentPrice, row?.current_price, row?.amount]) {
    const raw = value && typeof value === 'object' ? value.value ?? value.amount ?? value.price : value;
    const parsed = typeof raw === 'string' ? Number(raw.replace(/[$,]/g, '')) : Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function candidateCurrency(row: any): string | null {
  const candidates = [row?.currency, row?.soldCurrency, row?.saleCurrency, row?.price?.currency, row?.currentPrice?.currency];
  const currency = candidates.find((value) => typeof value === 'string' && value.trim());
  return currency ? currency.trim().toUpperCase() : null;
}

function isUsdPrice(row: any): boolean {
  return candidateCurrency(row) === 'USD';
}

export function summarizeUsedValuationPrices(rows: any[]): UsedValuationPriceSummary {
  const prices = rows.filter((row) => row?.valuationUse?.use?.code === 'CURRENT_SALES_PRIMARY')
    .filter(isUsdPrice)
    .map(candidatePrice).filter((price): price is number => price !== null);
  if (!prices.length) return { count: 0, low: null, high: null, average: null };
  return { count: prices.length, low: Math.min(...prices), high: Math.max(...prices), average: prices.reduce((total, price) => total + price, 0) / prices.length };
}

export function summarizeCurrentMarketPrices(rows: any[]): CurrentMarketPriceSummary {
  const prices = rows.filter((row) => isCurrentMarketContextSource({
    sourceId: row?.sourceId,
    role: row?.role ?? row?.sourceRole,
    kind: row?.kind,
    saleStatus: row?.saleStatus,
    priceBasis: row?.priceBasis,
  }) && isCurrentMarketContextCandidate(row) && isUsdPrice(row)).map(candidatePrice).filter((price): price is number => price !== null);
  if (!prices.length) return { count: 0, low: null, high: null, average: null };
  return { count: prices.length, low: Math.min(...prices), high: Math.max(...prices), average: prices.reduce((total, price) => total + price, 0) / prices.length };
}

export function summarizeHistoricMarketContext(rows: any[]): HistoricMarketContextSummary {
  // Reconciliation attaches the current request's final report. Neither an old
  // source date nor report-only eligibility flags authorizes historic membership.
  const historicRows = rows.filter((row) => row?.valuationUse?.use?.code === 'HISTORIC_MARKET_CONTEXT');
  const prices = historicRows.map(candidateHistoricPrice).filter((price): price is number => price !== null);
  const dates = historicRows.map(candidateHistoricSaleDate).filter((date): date is string => date !== null).sort();
  return {
    count: prices.length,
    low: prices.length ? Math.min(...prices) : null,
    high: prices.length ? Math.max(...prices) : null,
    average: prices.length ? prices.reduce((total, price) => total + price, 0) / prices.length : null,
    oldestSaleDate: dates[0] ?? null,
    latestSaleDate: dates.at(-1) ?? null,
    unknownSaleDateCount: historicRows.length - dates.length,
  };
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
  const reconciledGroups = groups.map(source => ({ ...source,
    candidates: reconcileCandidateFinalUse(source.candidates, context.outcome, { side: scopeSide, sourceId: source.id }),
  }));
  const displayed = reconciledGroups.flatMap(source => source.candidates);
  const used = displayed.filter(row => row.valuationUse?.use?.code === 'CURRENT_SALES_PRIMARY').length;
  const usedPriceSummary = summarizeUsedValuationPrices(displayed);
  const historicRows = displayed.filter(row => row.valuationUse?.use?.code === 'HISTORIC_MARKET_CONTEXT');
  const historicSummary = summarizeHistoricMarketContext(historicRows);
  const currentMarketRows = displayed.filter(row => isCurrentMarketContextSource({
    sourceId: row?.sourceId,
    role: row?.role ?? row?.sourceRole,
    kind: row?.kind,
    saleStatus: row?.saleStatus,
    priceBasis: row?.priceBasis,
  }) && isCurrentMarketContextCandidate(row));
  const currentMarketPriceSummary = summarizeCurrentMarketPrices(currentMarketRows);
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
        <p><strong className="text-slate-200">Not used</strong> — final analysis ran, but this candidate was not selected for the valuation result; historic market context is shown separately.</p>
        <p><strong className="text-sky-200">Historic market context</strong> — final analysis confirmed a matching completed sale over one year ago (older than 365 days). Its sold amount and date provide context, not today’s value.</p>
        <p><strong className="text-cyan-200">Candidate</strong> — a retained marketplace record shown for review; appearing here does not automatically make it a comparable.</p>
        <p><strong className="text-slate-200">Unknown</strong> — the source did not provide that field; it is not automatically treated as a mismatch. An unknown sale date is not evidence of a historic sale.</p>
      </div>
    </div>
    <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Target item · {side === 'left' ? 'Item A' : 'Item B'}</h3><div className="flex gap-3">
        {item.primaryPhotoUrl ? <TestAiSafeImage src={item.primaryPhotoUrl} alt="Target item reference" className="h-24 w-20 rounded border border-cyan-800/40 bg-slate-950 object-contain" /> : <div className="flex h-24 w-20 items-center justify-center rounded border border-slate-700 text-center text-xs text-slate-500">Target image unavailable</div>}
        <div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-100">{item.id ? <a className="hover:text-cyan-200 hover:underline" href={`/item/${item.id}`} target="_blank" rel="noreferrer">{item.title}</a> : item.title}</p><p className="mt-1 text-xs text-slate-400">{item.category.replace(/_/g, ' ')}{item.itemType ? ` · ${item.itemType.replace(/_/g, ' ')}` : ''}</p></div>
      </div></div>
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3"><h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Run summary · displayed candidates only</h3><div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-3 xl:grid-cols-5">
        <div><p className="text-xl font-semibold text-cyan-200">{displayed.length}</p><p className="text-xs text-slate-400">Candidates</p></div>
        <div><p className="text-xl font-semibold text-emerald-200">{used}</p><p className="text-xs text-slate-400">Used in valuation</p></div>
        <div><p className="text-xl font-semibold text-amber-200">{Math.max(0, displayed.length - used - historicRows.length)}</p><p className="text-xs text-slate-400">Not used</p></div>
        <div><p className="text-xl font-semibold text-sky-200">{currentMarketRows.length}</p><p className="text-xs text-slate-400">Current market context</p></div>
        <div><p className="text-xl font-semibold text-sky-200">{historicRows.length}</p><p className="text-xs text-slate-400">Historic market context</p></div>
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
      <div className="mt-3 rounded border border-sky-800/40 bg-sky-950/20 p-2" aria-label="Prices from current market context">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-200">Prices from current market context</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div><p className="text-sm font-semibold text-sky-100">{formatRunSummaryPrice(currentMarketPriceSummary.low)}</p><p className="text-[10px] text-slate-400">Low Asking Price</p></div>
          <div><p className="text-sm font-semibold text-sky-100">{formatRunSummaryPrice(currentMarketPriceSummary.high)}</p><p className="text-[10px] text-slate-400">High Asking Price</p></div>
          <div><p className="text-sm font-semibold text-sky-100">{formatRunSummaryPrice(currentMarketPriceSummary.average)}</p><p className="text-[10px] text-slate-400">Average Asking Price</p></div>
        </div>
        <p className="mt-1 text-[10px] text-slate-500">Based on {currentMarketPriceSummary.count} active listing{currentMarketPriceSummary.count === 1 ? '' : 's'} with a reported asking price. These prices are context only and do not set the primary sold-comps value.</p>
      </div>
      <div className="mt-3 rounded border border-sky-800/40 bg-sky-950/20 p-2" aria-label="Historic market context sold prices and sale dates">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-200">Historic market context · USD sold prices</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div><p className="text-sm font-semibold text-sky-100">{formatRunSummaryPrice(historicSummary.low)}</p><p className="text-[10px] text-slate-400">Low Sold Price</p></div>
          <div><p className="text-sm font-semibold text-sky-100">{formatRunSummaryPrice(historicSummary.high)}</p><p className="text-[10px] text-slate-400">High Sold Price</p></div>
          <div><p className="text-sm font-semibold text-sky-100">{formatRunSummaryPrice(historicSummary.average)}</p><p className="text-[10px] text-slate-400">Average Sold Price</p></div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-center">
          <div><p className="text-sm font-semibold text-sky-100">{historicSummary.oldestSaleDate ?? 'Unknown'}</p><p className="text-[10px] text-slate-400">Oldest Sale Date</p></div>
          <div><p className="text-sm font-semibold text-sky-100">{historicSummary.latestSaleDate ?? 'Unknown'}</p><p className="text-[10px] text-slate-400">Latest Sale Date</p></div>
        </div>
        <p className="mt-1 text-[10px] text-slate-500">Prices use {historicSummary.count} final historic-context candidate{historicSummary.count === 1 ? '' : 's'} with a positive reported USD sold amount. Dates use the final normalized sale date; Unknown dates are omitted from the range{historicSummary.unknownSaleDateCount ? ` (${historicSummary.unknownSaleDateCount} Unknown)` : ''}. Matching sales over one year ago provide context only, not today’s value, and do not set the current valuation.</p>
      </div>
      {valuationNotRun ? <p className="mt-2 text-xs text-amber-200">Final valuation analysis has not run yet; current valuation counts are 0.</p> : resolved < displayed.length && <p className="mt-2 text-xs text-amber-200">{displayed.length - resolved} candidate decisions have no resolved final valuation record; their cards explain what is known.</p>}</div>
    </div>
    <div aria-label="Evidence review candidate results" className="space-y-4">
      {reconciledGroups.filter(source => source.candidates.length > 0).map(source => <TestAiCandidateMasterList key={source.id} listings={source.candidates} sourceLabel={source.label} targetImageUrl={item.primaryPhotoUrl} scope={{ side: scopeSide, sourceId: source.id }} reconciled />)}
      {displayed.length === 0 && <p role="status" className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300">No candidate records are available yet. Source status and any retrieval errors are listed below; this is not proof that the marketplace has no matches.</p>}
    </div>
    <div className="rounded-lg border border-slate-800 p-3"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Source results</h3><div className="space-y-2">{reconciledGroups.map(source => <div key={source.id} className="text-xs"><div className="flex flex-wrap items-baseline justify-between gap-1"><span className="text-slate-200">{source.label}</span><span className={source.status === 'error' || source.status === 'partial' ? 'text-amber-200' : 'text-slate-400'}>{source.candidates.length > 0 ? `${source.candidates.length} candidates displayed${source.status === 'partial' || source.status === 'error' ? ' · partial/error response retained' : ''}` : source.status === 'error' ? 'Request failed — no candidate records' : source.status === 'idle' ? 'Not searched or still awaiting response' : source.status === 'not_found' ? 'No usable candidate records / review unresolved' : 'No candidate records returned'}</span></div>{source.message && <p className="mt-1 rounded border border-amber-700/40 bg-amber-950/20 px-2 py-1 text-amber-200">{source.message}</p>}</div>)}</div></div>
    <details className="rounded-lg border border-slate-800 bg-slate-950/50 p-3"><summary className="cursor-pointer text-xs font-semibold text-slate-300">Evidence diagnostics — identity, guides and source notes</summary><div className="mt-3 space-y-3 text-xs text-slate-400">
      <p>{summary.identityReadiness.missingCriticalFields.length ? `Missing target identifiers: ${summary.identityReadiness.missingCriticalFields.join(', ')}` : 'Target category-critical identifiers are supplied.'}</p>
      <p>{summary.evidenceSufficiency.message}</p>
      {summary.identity.map(field => <p key={field.key}>{field.label}: {field.value}</p>)}
      {summary.reviewFlags.map((flag, index) => <p key={index} className="text-amber-200">{flag.message}</p>)}
      {summary.guideAnchors.map((anchor, index) => <p key={index}>{anchor.sourceLabel}: {anchor.currency || 'Currency unknown'} {anchor.value.toLocaleString()} · grade {anchor.grade || 'unknown'} · guide reference, not a completed sale.</p>)}
    </div></details>
  </section>;
}
