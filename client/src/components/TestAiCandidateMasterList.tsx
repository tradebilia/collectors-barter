import React from 'react';
import { mergeCandidateDisplayGroups, reconcileCandidateFinalUse, candidateDisplayKey, type CandidateDisplayRow, type CandidateDisplayScope } from '../../../shared/testAiCandidateLedger';
import { candidateFinalDecision, formatCandidateDisplayPrice } from '../../../shared/testAiCandidateStatus';
import { MetadataComparisonTable } from './TestAiMetadataComparisonTable';
import { TestAiCandidateImagePair, TestAiVisualDifferenceList, useTestAiCandidateDisplay } from './TestAiCandidateStatus';

/** One final-decision card per retained candidate; no separate exclusion panel. */
export function TestAiCandidateMasterList({ listings, sourceLabel, targetImageUrl, scope: suppliedScope }: {
  listings: CandidateDisplayRow[]; sourceLabel: string; targetImageUrl?: string | null; scope?: CandidateDisplayScope;
}) {
  const context = useTestAiCandidateDisplay();
  const scope = suppliedScope ?? context.scope;
  const candidates = reconcileCandidateFinalUse(mergeCandidateDisplayGroups([listings], scope), context.outcome, scope);
  if (!candidates.length) return null;
  const decisions = candidates.map(candidateFinalDecision);
  const counts = decisions.reduce((summary, decision) => {
    summary[decision.code] = (summary[decision.code] ?? 0) + 1;
    return summary;
  }, {} as Record<string, number>);
  return <section className="rounded border border-violet-700/35 bg-violet-950/15 p-2" aria-label={`${sourceLabel} final candidate decisions`}>
    <div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-violet-200">Final decisions — {sourceLabel} ({candidates.length})</p><p className="mt-0.5 text-[9px] text-violet-100/70">One card per retained candidate. Intermediate review states are hidden; each card shows the final decision and reason.</p></div><span className="shrink-0 text-[8px] text-violet-200/70">{scope.side === 'item_a' ? 'Item A · ' : scope.side === 'item_b' ? 'Item B · ' : ''}{sourceLabel}</span></div>
    <div className="mt-2 grid grid-cols-2 gap-1 text-[8px] sm:grid-cols-4"><p className="rounded bg-emerald-950/30 px-1.5 py-1 text-emerald-200"><strong>{counts.used_in_valuation ?? 0}</strong> used in valuation</p><p className="rounded bg-red-950/30 px-1.5 py-1 text-red-200"><strong>{(counts.visual_mismatch ?? 0) + (counts.hard_exclusion ?? 0)}</strong> identity/exclusion not used</p><p className="rounded bg-amber-950/30 px-1.5 py-1 text-amber-200"><strong>{(counts.context_only ?? 0) + (counts.pricing_rule ?? 0)}</strong> context/pricing not used</p><p className="rounded bg-slate-900/60 px-1.5 py-1 text-slate-300"><strong>{(counts.visual_unresolved ?? 0) + (counts.pre_review_exclusion ?? 0)}</strong> unresolved/pre-review</p></div>
    <div className="mt-2 max-h-[70vh] space-y-2 overflow-y-auto pr-1">{candidates.map((listing, index) => {
      const decision = candidateFinalDecision(listing);
      const hasDifferences = Array.isArray(listing.visualDifferences) && listing.visualDifferences.length > 0;
      return <article key={candidateDisplayKey(listing, scope, String(index))} className="rounded-lg border border-slate-700/60 bg-gray-950/45 p-2.5">
        <div className="flex items-start gap-2"><TestAiCandidateImagePair listing={listing} targetImageUrl={targetImageUrl} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="break-words text-[10px] font-semibold text-gray-100">{listing.itemUrl || listing.url ? <a href={listing.itemUrl || listing.url} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline">{listing.title || 'Untitled candidate'}</a> : listing.title || 'Untitled candidate'}</p><p className="mt-0.5 text-[8px] text-gray-500">Rank {listing.metadataMatchRank ?? 'unranked'} · score {listing.metadataMatchScore ?? 'unavailable'}/100</p></div><span className="shrink-0 text-[9px] text-gray-300">{formatCandidateDisplayPrice(listing)}</span></div><p className={`mt-2 text-[9px] font-bold ${decision.className}`}>{decision.label}</p><p className="mt-0.5 break-words text-[8px] leading-snug text-gray-400"><strong className="text-gray-300">Reason:</strong> {decision.reason}</p></div></div>
        <MetadataComparisonTable listing={listing} />{hasDifferences && <details className="mt-1.5"><summary className="cursor-pointer text-[8px] text-amber-200">View observed visual differences</summary><TestAiVisualDifferenceList listing={listing} /></details>}
      </article>;
    })}</div>
  </section>;
}
