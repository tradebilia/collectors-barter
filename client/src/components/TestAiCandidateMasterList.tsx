import { mergeCandidateDisplayGroups, reconcileCandidateFinalUse, candidateDisplayKey, type CandidateDisplayRow, type CandidateDisplayScope } from '../../../shared/testAiCandidateLedger';
import { candidateIdentityFact, candidatePricingFact, formatCandidateDisplayPrice, hasActualVisualResponse, isHardCandidateDisplayException } from '../../../shared/testAiCandidateStatus';
import { MetadataComparisonTable } from './TestAiMetadataComparisonTable';
import { TestAiCandidateImagePair, useTestAiCandidateDisplay } from './TestAiCandidateStatus';

function finalDecision(listing: CandidateDisplayRow): { label: string; reason: string; className: string } {
  const useCode = listing.valuationUse?.use?.code;
  if (useCode === 'CURRENT_SALES_PRIMARY') return { label: 'ACCEPTED FOR VALUATION', reason: 'Approved as primary current-sales evidence.', className: 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200' };
  if (useCode === 'FINAL_HARD_EXCLUDED' || isHardCandidateDisplayException(listing)) return { label: 'NOT ACCEPTED', reason: 'Hard exclusion: objective identity or source conflict.', className: 'border-red-500/50 bg-red-950/40 text-red-200' };
  const identity = candidateIdentityFact(listing);
  if (identity.code === 'mismatch' || identity.code === 'deterministic_conflict') return { label: 'NOT ACCEPTED', reason: identity.label, className: 'border-red-500/50 bg-red-950/40 text-red-200' };
  if (hasActualVisualResponse(listing) && identity.code === 'match') return { label: 'NOT ACCEPTED FOR VALUATION', reason: 'Visual match recorded, but no final valuation-use approval was recorded.', className: 'border-amber-500/50 bg-amber-950/40 text-amber-200' };
  const pricing = candidatePricingFact(listing);
  if (pricing.code === 'NOT_SUBMITTED_NOT_ASSESSED') return { label: 'NOT REVIEWED', reason: pricing.label, className: 'border-slate-500/50 bg-slate-900/60 text-slate-200' };
  return { label: 'NOT ACCEPTED', reason: identity.label === 'Not image reviewed' ? 'No final visual identity decision was recorded.' : identity.label, className: 'border-amber-500/50 bg-amber-950/40 text-amber-200' };
}

/** The existing master-list layout, not a second exclusion panel or rank engine. */
export function TestAiCandidateMasterList({ listings, sourceLabel, targetImageUrl, scope: suppliedScope }: {
  listings: CandidateDisplayRow[]; sourceLabel: string; targetImageUrl?: string | null; scope?: CandidateDisplayScope;
}) {
  const context = useTestAiCandidateDisplay();
  const scope = suppliedScope ?? context.scope;
  const candidates = reconcileCandidateFinalUse(mergeCandidateDisplayGroups([listings], scope), context.outcome, scope);
  if (!candidates.length) return null;
  return <section className="rounded border border-violet-700/35 bg-violet-950/15 p-2" aria-label={`${sourceLabel} ranked candidate master list`}>
    <div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-violet-200">Final decisions — ranked candidates ({candidates.length})</p><p className="mt-0.5 text-[9px] text-violet-100/70">Every retained candidate appears once. The badge below is the final user-facing outcome; expand metadata only when you need the supporting comparison.</p></div><span className="shrink-0 text-[8px] text-violet-200/70">{scope.side === 'item_a' ? 'Item A · ' : scope.side === 'item_b' ? 'Item B · ' : ''}{sourceLabel}</span></div>
    <div className="mt-1 max-h-96 space-y-1 overflow-y-auto pr-1">{candidates.map((listing, index) => <div key={candidateDisplayKey(listing, scope, String(index))} className="rounded bg-gray-950/40 p-1.5">
      <div className="flex items-start gap-2"><TestAiCandidateImagePair listing={listing} targetImageUrl={targetImageUrl} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="break-words text-[9px] font-semibold text-gray-100">{listing.itemUrl || listing.url ? <a href={listing.itemUrl || listing.url} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline">{listing.title || 'Untitled candidate'}</a> : listing.title || 'Untitled candidate'}</p><span className="shrink-0 text-[8px] text-gray-300">{formatCandidateDisplayPrice(listing)}</span></div><p className="text-[8px] text-cyan-200">{listing.metadataMatchLabel ?? 'Metadata ranking'} · {listing.metadataMatchRank ? `Rank #${listing.metadataMatchRank}` : 'Unranked'} · {listing.metadataMatchScore !== undefined && listing.metadataMatchScore !== null ? `${listing.metadataMatchScore}/100` : 'Score unavailable'}</p><div className={`mt-1 rounded border px-2 py-1 ${finalDecision(listing).className}`}><p className="text-[9px] font-bold tracking-wide">{finalDecision(listing).label}</p><p className="mt-0.5 text-[8px]">{finalDecision(listing).reason}</p></div></div></div>
      <MetadataComparisonTable listing={listing} />
    </div>)}</div>
  </section>;
}
