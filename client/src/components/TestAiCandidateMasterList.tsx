import { mergeCandidateDisplayGroups, reconcileCandidateFinalUse, candidateDisplayKey, type CandidateDisplayRow, type CandidateDisplayScope } from '../../../shared/testAiCandidateLedger';
import { formatCandidateDisplayPrice } from '../../../shared/testAiCandidateStatus';
import { MetadataComparisonTable } from './TestAiMetadataComparisonTable';
import { TestAiCandidateStatus, TestAiCandidateImagePair, TestAiVisualDifferenceList, useTestAiCandidateDisplay } from './TestAiCandidateStatus';

/** The existing master-list layout, not a second exclusion panel or rank engine. */
export function TestAiCandidateMasterList({ listings, sourceLabel, targetImageUrl, scope: suppliedScope }: {
  listings: CandidateDisplayRow[]; sourceLabel: string; targetImageUrl?: string | null; scope?: CandidateDisplayScope;
}) {
  const context = useTestAiCandidateDisplay();
  const scope = suppliedScope ?? context.scope;
  const candidates = reconcileCandidateFinalUse(mergeCandidateDisplayGroups([listings], scope), context.outcome, scope);
  if (!candidates.length) return null;
  return <section className="rounded border border-violet-700/35 bg-violet-950/15 p-2" aria-label={`${sourceLabel} ranked candidate master list`}>
    <div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-violet-200">All candidates — ranked master list ({candidates.length})</p><p className="mt-0.5 text-[9px] text-violet-100/70">Known retained source occurrences, once per bound occurrence in source rank order. Execution, identity and final pricing use are independent facts; not every retrieved row reaches final intake.</p></div><span className="shrink-0 text-[8px] text-violet-200/70">{scope.side === 'item_a' ? 'Item A · ' : scope.side === 'item_b' ? 'Item B · ' : ''}{sourceLabel}</span></div>
    <div className="mt-1 max-h-96 space-y-1 overflow-y-auto pr-1">{candidates.map((listing, index) => <div key={candidateDisplayKey(listing, scope, String(index))} className="rounded bg-gray-950/40 p-1.5">
      <div className="flex items-start gap-2"><TestAiCandidateImagePair listing={listing} targetImageUrl={targetImageUrl} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="break-words text-[9px] font-semibold text-gray-100">{listing.itemUrl || listing.url ? <a href={listing.itemUrl || listing.url} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline">{listing.title || 'Untitled candidate'}</a> : listing.title || 'Untitled candidate'}</p><span className="shrink-0 text-[8px] text-gray-300">{formatCandidateDisplayPrice(listing)}</span></div><p className="text-[8px] text-cyan-200">{listing.metadataMatchLabel ?? 'Metadata ranking'} · {listing.metadataMatchRank ? `Rank #${listing.metadataMatchRank}` : 'Unranked'} · {listing.metadataMatchScore !== undefined && listing.metadataMatchScore !== null ? `${listing.metadataMatchScore}/100` : 'Score unavailable'}{listing.metadataMatchReasons?.length ? ` · ${listing.metadataMatchReasons.join(', ')}` : ''}</p><TestAiCandidateStatus listing={listing} scope={scope} reconciled /></div></div>
      <MetadataComparisonTable listing={listing} /><TestAiVisualDifferenceList listing={listing} />
    </div>)}</div>
  </section>;
}
