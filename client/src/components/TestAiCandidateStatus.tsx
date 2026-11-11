import React, { createContext, useContext, type ReactNode } from 'react';
import { candidateExecutionAttemptFacts, candidateExecutionFact, candidateExecutionReceipt, candidateIdentityFact, candidatePricingFact, formatCandidateDisplayPrice, hasActualVisualDispatch, hasActualVisualResponse, isHardCandidateDisplayException } from '../../../shared/testAiCandidateStatus';
import { candidateDisplayKey, mergeCandidateDisplayGroups, reconcileCandidateFinalUse, type CandidateDisplayRow, type CandidateDisplayScope, type CandidateFinalDisplayOutcome } from '../../../shared/testAiCandidateLedger';
import { MetadataComparisonTable } from './TestAiMetadataComparisonTable';
import { TestAiSafeImage } from './TestAiSafeImage';
import { sourceCurrentWindowLabel, sourceMetricDisplay, sourceRetrievalCoverage } from '../../../shared/testAiSourceDisplay';

const CandidateDisplayContext = createContext<{ scope: CandidateDisplayScope; outcome?: CandidateFinalDisplayOutcome | null; auditFailure?: string | null }>({ scope: {} });
export function TestAiCandidateDisplayProvider({ side, outcome, auditFailure, children }: { side: 'item_a' | 'item_b'; outcome?: CandidateFinalDisplayOutcome | null; auditFailure?: string | null; children: ReactNode }) {
  return <CandidateDisplayContext.Provider value={{ scope: { side }, outcome, auditFailure }}>{children}</CandidateDisplayContext.Provider>;
}
export function useTestAiCandidateDisplay() { return useContext(CandidateDisplayContext); }
export function TestAiCandidateStatus({ listing, scope: suppliedScope, reconciled = false }: { listing: CandidateDisplayRow; scope?: CandidateDisplayScope; reconciled?: boolean }) {
  const context = useTestAiCandidateDisplay();
  const scope = suppliedScope ?? context.scope;
  const row = reconciled ? listing : reconcileCandidateFinalUse([listing], context.outcome, scope, false)[0];
  const facts = [ ['Execution', candidateExecutionFact(row, scope)], ['Identity result', candidateIdentityFact(row)], ['Pricing use', candidatePricingFact(row)] ] as const;
  const attempts = candidateExecutionAttemptFacts(row);
  return <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[8px] leading-snug" aria-label="Candidate execution identity and pricing facts">
    {facts.map(([label, fact]) => <p key={label} className={fact.className} data-status-code={fact.code}><strong>{label}:</strong> {fact.label}{fact.reason ? <span className="text-gray-400"> · {fact.reason}</span> : null}</p>)}
    {attempts.length > 0 && <div className="w-full rounded border border-violet-800/40 bg-violet-950/20 px-1.5 py-1 text-violet-200" aria-label="Actual visual call attempts">
      <p className="font-semibold">Actual calls — execution diagnostics only</p>
      <ol className="mt-0.5 space-y-0.5">{attempts.map((attempt, index) => <li key={index} className="break-words whitespace-normal">
        <strong>Attempt {attempt.ordinal} · {attempt.stage} / {attempt.format}:</strong> {attempt.outcome}
        {attempt.failure && <span className={attempt.failure.className} data-visual-failure-code={attempt.failure.code}> · {attempt.failure.label}</span>}
        {attempt.metadata.length > 0 && <span className="text-gray-400"> · {attempt.metadata.join(' · ')}</span>}
      </li>)}</ol>
    </div>}
    {isHardCandidateDisplayException(row) && <p className="w-full text-red-300"><strong>Hard exclusion:</strong> {(row.evidenceReasons ?? []).join('; ') || candidateExecutionFact(row).reason || 'Producer-coded objective conflict'}</p>}
    {row.sourceRelevance?.role && row.sourceRelevance.role !== 'source_observation' && <p className="w-full text-gray-400"><strong>Source relevance diagnostic:</strong> {String(row.sourceRelevance.role).replace(/_/g, ' ')} · {row.sourceRelevance.disposition ?? 'not reported'} · not exact image identity or final pricing use.</p>}
    {row.sourceEconomics?.convention && <p className="w-full text-amber-200"><strong>Source amount convention:</strong> {String(row.sourceEconomics.convention).replace(/_/g, ' ')} · reported source context, not new pricing authority{Array.isArray(row.sourceEconomics.caveats) && row.sourceEconomics.caveats.length ? ` · ${row.sourceEconomics.caveats.join('; ')}` : ''}</p>}
  </div>;
}
export function TestAiVisualDifferenceList({ listing }: { listing: CandidateDisplayRow }) {
  const differences = Array.isArray(listing.visualDifferences) ? listing.visualDifferences : [];
  if (!differences.length) return null;
  const receipt = candidateExecutionReceipt(listing);
  const authoritativeMismatch = receipt
    ? hasActualVisualResponse(listing) && receipt.identity?.origin === 'visual' && receipt.identity?.result === 'mismatch'
    : !listing.visualExecution && listing.visualReviewStatus === 'mismatch';
  return <div className={`mt-1 rounded border p-1.5 ${authoritativeMismatch ? 'border-red-700/30 bg-red-950/20' : 'border-amber-700/30 bg-slate-900/30'}`}><p className={`text-[8px] font-bold uppercase tracking-wide ${authoritativeMismatch ? 'text-red-200' : 'text-amber-200'}`}>{authoritativeMismatch ? 'Why mismatch — all detected differences' : 'Observed differences — all detected differences'}</p><ul className="mt-1 space-y-1">{differences.map((difference: any, index: number) => <li key={`${difference.field}-${index}`} className="text-[8px] leading-snug text-gray-300"><strong className={authoritativeMismatch ? 'text-red-200' : 'text-slate-200'}>{difference.field}:</strong> target “{difference.targetObservation}” vs candidate “{difference.candidateObservation}”<span className="text-gray-500"> — {difference.impact}</span></li>)}</ul></div>;
}
export function TestAiCandidateImagePair({ listing, targetImageUrl }: { listing: CandidateDisplayRow; targetImageUrl?: string | null }) {
  const image = listing.imageUrl || listing.thumbnailUrl || listing.imageUrls?.[0] || listing.images?.[0];
  return <div className="grid w-24 shrink-0 grid-cols-2 gap-1">{[[targetImageUrl, 'Target', 'border-cyan-700/50', 'text-cyan-200'], [image, 'Candidate', 'border-emerald-700/50', 'text-emerald-200']].map(([url, label, border, color]) => url ? <figure key={label}><TestAiSafeImage src={url} alt={label === 'Target' ? 'Target item' : 'Marketplace candidate'} loading="lazy" referrerPolicy="no-referrer" className={`h-12 w-full rounded ${border} border bg-gray-950 object-contain`} /><figcaption className={`text-center text-[7px] uppercase ${color}`}>{label}</figcaption></figure> : <div key={label} className="flex h-12 items-center justify-center rounded border border-gray-700 bg-gray-950 text-center text-[7px] text-gray-500">{label} unavailable</div>)}</div>;
}
export function TestAiVisualReviewRow({ listing, targetImageUrl }: { listing: CandidateDisplayRow; targetImageUrl?: string | null }) {
  const rationale = listing.visualReviewRationale || 'No additional visual rationale supplied.';
  return <div className="flex items-start gap-2 rounded bg-gray-900/70 p-1.5"><TestAiCandidateImagePair listing={listing} targetImageUrl={targetImageUrl} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="break-words text-[9px] text-gray-300">{listing.title || 'Untitled marketplace candidate'}</p><span className="shrink-0 text-[10px] font-semibold text-white">{formatCandidateDisplayPrice(listing)}</span></div><TestAiCandidateStatus listing={listing} /><p className="break-words whitespace-normal text-[8px] leading-snug text-gray-400">{rationale}</p><details className="mt-1"><summary className="cursor-pointer text-[8px] text-cyan-200/80">View full explanation</summary><p className="mt-0.5 break-words whitespace-normal text-[8px] leading-snug text-gray-300">{rationale}</p>{listing.visualAudit && <p className="text-[8px] text-violet-200">Deciding audit: {listing.visualAudit.finalPass ?? 'unknown pass'} · retry {listing.visualAudit.retryStatus ?? 'unknown'} · {listing.visualAudit.decidingRationale ?? listing.visualAudit.retryReason ?? ''}</p>}</details><MetadataComparisonTable listing={listing} /><TestAiVisualDifferenceList listing={listing} /></div></div>;
}
export function selectTestAiVisualDisplayRows(groups: CandidateDisplayRow[][], scope: CandidateDisplayScope = {}) {
  return mergeCandidateDisplayGroups(groups, scope).filter(hasActualVisualDispatch);
}
export function TestAiExecutionSummary({ rows, sourceLabel, counts }: { rows: CandidateDisplayRow[]; sourceLabel: string; counts?: any }) {
  const dispatched = rows.filter(hasActualVisualDispatch), responses = rows.filter(hasActualVisualResponse);
  const matches = responses.filter((row) => row.visualExecution?.identity?.origin === 'visual' && row.visualExecution?.identity?.result === 'match' && row.visualExecution?.identity?.reviewVerdict !== 'rough_match');
  const mismatches = responses.filter((row) => row.visualExecution?.identity?.origin === 'visual' && row.visualExecution?.identity?.result === 'mismatch');
  return <p className="text-[9px] text-cyan-200/80">{sourceLabel} · known retained occurrences: {dispatched.length} dispatched · {responses.length} usable responses · {matches.length} image matches · {mismatches.length} image mismatches · {dispatched.length - matches.length - mismatches.length} unresolved · coverage {counts?.coverage ?? 'known rows only / unmeasured upstream'}{counts?.populationId ? ` · run ${counts.populationId}` : ''}</p>;
}
export function TestAiFinalLedgerRow({ comparable, index = 0 }: { comparable: CandidateDisplayRow; index?: number }) {
  const gate = comparable.valuationUse?.identityAdmission?.categoryIdentity ?? comparable.categoryIdentity;
  const use = comparable.valuationUse?.use;
  return <div data-ledger-key={comparable.valuationUse?.auditRef?.intakeRef ?? candidateDisplayKey(comparable, {}, String(index))} className="rounded border border-slate-800 bg-slate-900/60 px-1.5 py-1 text-[8px]">
    <p className="truncate text-gray-200">{formatCandidateDisplayPrice(comparable)} · {comparable.title}</p><TestAiCandidateStatus listing={comparable} reconciled />
    <p className="mt-0.5 text-gray-400">Final use code: {use?.code ?? 'Legacy / final use unavailable'}{use?.reasonCodes?.length ? ` · ${use.reasonCodes.join(' · ')}` : ''}</p>
    {use && <p className="mt-0.5 text-gray-500">Selected before outliers: {comparable.valuationUse.selection === 'selected_pre_outlier' ? 'yes' : 'no'} · sale diagnostics: {use.postPolicySaleDiagnostics ? 'yes' : 'no'} · current median diagnostics: {use.currentSaleMedianDiagnostics ? 'yes' : 'no'} · primary sales: {use.primaryMarketSales ? 'yes' : 'no'} · historical prompt: {use.historicalPromptIncluded === null ? 'unmeasured' : use.historicalPromptIncluded ? 'included' : 'not included'}{use.possibleDuplicateWarning ? ' · possible duplicate warning — retained' : ''}{use.smallSampleOutlierWarning ? ' · small-sample tail warning — retained' : ''}</p>}
    {gate && <p className="mt-0.5 text-gray-500">Category gate: {String(gate.status).replace(/_/g, ' ')}{gate.confirmedFields?.length ? ` · confirmed ${gate.confirmedFields.join(', ')}` : ''}{gate.unconfirmedFields?.length ? ` · review ${gate.unconfirmedFields.join(', ')}` : ''}{gate.conflicts?.length ? ` · conflict ${gate.conflicts.join(', ')}` : ''}</p>}
    <p className="mt-0.5 text-gray-600">{comparable.sourceLabel ?? comparable.sourceId ?? 'source unavailable'} · adapter {comparable.sourceAdapter ?? 'unverified'} · {comparable.saleStatus ?? 'status unavailable'} · {comparable.priceBasis ?? 'price basis unavailable'} · premium {comparable.buyerPremium ?? 'unknown'} · shipping {comparable.shipping ?? 'unknown'} · tax {comparable.tax ?? 'unknown'}</p>
    <p className="mt-0.5 break-all text-gray-700">Canonical transaction: {comparable.valuationUse?.auditRef?.verifiedCanonicalTransactionId ?? comparable.canonicalTransactionId ?? 'unavailable / context only'}</p>
    <details><summary className="cursor-pointer text-gray-600">Legacy pre-selection admission diagnostic</summary><p>{comparable.admissionCode ?? 'unavailable'} · accepted {String(comparable.accepted)} · {comparable.exclusionReason ?? 'no additional diagnostic'}</p></details>
  </div>;
}

export function TestAiFinalUseSummary({ report }: { report?: any }) {
  if (!report) return <p className="text-[9px] text-gray-500">Final pricing-use coverage unavailable / legacy.</p>;
  return <div className="text-[9px] text-gray-400" aria-label="Final submitted intake population facts"><p>Final submitted intake only · {report.side === 'item_a' ? 'Item A' : report.side === 'item_b' ? 'Item B' : 'side unscoped'} · run {report.analysisRunId} · basis {String(report.valuationBasis).replace(/_/g, ' ')}{report.primaryPricingReasonCodes?.length ? ` · ${report.primaryPricingReasonCodes.join(' · ')}` : ''}</p><div className="flex flex-wrap gap-x-2 gap-y-0.5">{(report.populations ?? []).map((population: any) => <p key={population.population}><strong>{population.label}:</strong> {population.count === null ? 'unmeasured' : population.count} {population.unit === 'submitted_intake_occurrence' ? 'intake occurrences' : population.unit} · {population.coverage}{population.currency ? ` · ${population.currency}` : ''}{population.priceRole ? ` · ${population.priceRole}` : ''}</p>)}</div></div>;
}

export function TestAiSourcePopulationSummary({ packet }: { packet?: any }) {
  if (!packet) return null;
  const execution = packet.execution;
  const retrieval = sourceRetrievalCoverage(packet);
  return <p className="text-[9px] text-violet-200" aria-label="Source retained ingress population">{packet.sourceId} · run {packet.populationId} · retained source ingress after retrieval union: {packet.retainedIngressCount} occurrences · query-return observations: {packet.queryReturnedObservationCount === null ? 'unmeasured' : packet.queryReturnedObservationCount} (may overlap) · retrieval coverage: {retrieval.label} · executed queries: {retrieval.executedQueryCount ?? 'unmeasured'} · failed queries: {retrieval.failedQueryCount ?? 'unmeasured'}{retrieval.note ? ` · ${retrieval.note}` : ''}{retrieval.partialRetrieval ? ' · Known returned rows retained; retrieval is not complete.' : ''}{execution ? ` · whole retained ingress execution: ${execution.dispatchedCandidateCount} dispatched / ${execution.responseReviewedCandidateCount} usable responses · execution coverage ${execution.coverage} (known ingress only; not retrieval coverage)` : ' · execution coverage unmeasured'}</p>;
}

export function TestAiProcessCompleteNotice({ data }: { data?: any }) {
  if (!data) return <p className="rounded border border-amber-700/40 bg-amber-950/25 px-2 py-1 text-[10px] font-semibold text-amber-200" aria-label="Source request end coverage">No returned source response — request execution and result coverage are unknown. This is not a zero-match result.</p>;
  const retrieval = sourceRetrievalCoverage(data);
  return <p className={`rounded border px-2 py-1 text-[10px] font-semibold ${retrieval.partial ? 'border-amber-700/40 bg-amber-950/25 text-amber-200' : 'border-emerald-700/40 bg-emerald-950/25 text-emerald-200'}`} aria-label="Source request end coverage">{retrieval.partial ? 'Source request ended with partial/error coverage — known returned rows retained below.' : 'Source request ended — returned source results are displayed below.'} Retrieval: {retrieval.label} · executed queries: {retrieval.executedQueryCount ?? 'unmeasured'} · failed queries: {retrieval.failedQueryCount ?? 'unmeasured'}{retrieval.note ? ` · ${retrieval.note}` : ''} Selected but undispatched rows are not background jobs.</p>;
}
export function TestAiSourceCurrentWindowCount({ count, kind }: { count: number; kind: string }) {
  return <p className="text-cyan-200"><strong>{count}</strong> {sourceCurrentWindowLabel(kind)}</p>;
}
export function TestAiSourceMetricSummary({ metrics, members, sourceLabel, role }: {
  metrics?: any; members?: ReadonlyArray<CandidateDisplayRow>; sourceLabel: string; role: string;
}) {
  if (!metrics) return null;
  const display = sourceMetricDisplay(metrics, members);
  return <div className="space-y-1.5" aria-label={`${sourceLabel} source-stage aggregate display`}>
    <p className="text-[9px] text-amber-200">{sourceLabel} · {role} · {display.observationCount ?? 'unmeasured'} priced observations · {display.reason}</p>
    <div className="grid grid-cols-4 gap-2 text-[11px]">{[
      ['Average', display.avg], ['Median', display.median], ['Range', display.range], ['Legacy confidence', String(metrics.confidence ?? 'unreported').toUpperCase()],
    ].map(([label, value]) => <div key={label} className="rounded bg-gray-900/40 p-1.5 text-center"><p className="mb-0.5 text-[9px] uppercase text-gray-500">{label}</p><p className={`font-semibold ${label === 'Legacy confidence' ? metrics.confidence === 'high' ? 'text-green-400' : metrics.confidence === 'medium' ? 'text-yellow-400' : 'text-red-400' : 'text-white'}`}>{value}</p></div>)}</div>
  </div>;
}

export function TestAiSourceRelevanceSummary({ audit }: { audit?: any }) {
  if (typeof audit?.sourceRelevanceEligible !== 'number' || !Number.isFinite(audit.sourceRelevanceEligible)) return null;
  return <p className="text-[9px] text-amber-200" aria-label="Special source relevance only">{audit.sourceRelevanceEligible} source-relevance-qualified records retained as context. This is not an exact item identity confirmation or final valuation-use count.</p>;
}

export function TestAiSourceStatusBadges({ sources }: { sources: ReadonlyArray<{ id: string; label: string; status: string; message?: string | null }> }) {
  return <div className="flex flex-wrap gap-1 pt-1">{sources.map((source) => <span key={source.id} title={source.message || undefined} className={`rounded px-1 py-0.5 text-[8px] ${source.status === 'success' ? 'bg-emerald-950/60 text-emerald-200' : source.status === 'error' ? 'bg-rose-950/60 text-rose-200' : source.status === 'partial' ? 'bg-amber-950/60 text-amber-200' : 'bg-slate-800 text-slate-300'}`}>{source.label}: {source.status.replace('_', ' ')}</span>)}</div>;
}
