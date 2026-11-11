import React from 'react';
import { mergeCandidateDisplayGroups, reconcileCandidateFinalUse, candidateDisplayKey, type CandidateDisplayRow, type CandidateDisplayScope } from '../../../shared/testAiCandidateLedger';
import { formatCandidateDisplayPrice } from '../../../shared/testAiCandidateStatus';
import { MetadataComparisonTable, TestAiVisualComparison } from './TestAiMetadataComparisonTable';
import { TestAiCandidateStatus, useTestAiCandidateDisplay } from './TestAiCandidateStatus';
import { TestAiSafeImage } from './TestAiSafeImage';
import { candidateFinalDecision } from './test-ai/candidateFinalDecision';

function candidateImageUrl(listing: CandidateDisplayRow): string | undefined {
  const image = listing.imageUrl || listing.thumbnailUrl || listing.imageUrls?.[0] || listing.images?.[0];
  return typeof image === 'string' ? image : undefined;
}
function CandidateImage({ src, label, url }: { src?: string | null; label: string; url?: string }) {
  const image = src
    ? <TestAiSafeImage src={src} alt={`${label} item`} loading="lazy" referrerPolicy="no-referrer" unavailableLabel={`${label} image unavailable`} className="h-20 w-20 rounded-md border border-slate-700 bg-slate-950 object-contain !text-[11px]" />
    : <span role="img" aria-label={`${label} image unavailable`} className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-slate-700 bg-slate-950 px-1 text-center text-[11px] leading-snug text-slate-400">{label} image unavailable</span>;
  return <figure className="w-20 shrink-0">
    {url ? <a href={url} target="_blank" rel="noopener noreferrer" title={`Open ${label.toLowerCase()} listing`} aria-label={`Open ${label.toLowerCase()} listing`} className="block rounded-md hover:ring-2 hover:ring-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">{image}</a> : image}
    <figcaption className="mt-1 text-center text-[11px] font-medium text-slate-400">{label}</figcaption>
  </figure>;
}

/** One card per retained occurrence; the ledger remains the authority for joins and rank order. */
export function TestAiCandidateMasterList({ listings, sourceLabel, targetImageUrl, scope: suppliedScope, reconciled = false }: {
  listings: CandidateDisplayRow[]; sourceLabel: string; targetImageUrl?: string | null; scope?: CandidateDisplayScope; reconciled?: boolean;
}) {
  const context = useTestAiCandidateDisplay();
  const scope = suppliedScope ?? context.scope;
  const candidates = reconciled ? listings : reconcileCandidateFinalUse(mergeCandidateDisplayGroups([listings], scope), context.outcome, scope);
  return <section className="rounded-lg border border-slate-700/70 bg-slate-950/30 p-3 text-[12px]" aria-label={`${sourceLabel} ranked candidate master list`}>
    <header className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-700/60 pb-3">
      <div><h3 className="text-[12px] font-semibold text-slate-100">Final decisions — ranked candidates ({candidates.length})</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">Every retained candidate appears once. Ranking and image matches are not final valuation approval.</p></div>
      <span className="text-[11px] text-slate-400">{scope.side === 'item_a' ? 'Item A · ' : scope.side === 'item_b' ? 'Item B · ' : ''}{sourceLabel}</span>
    </header>
    {!candidates.length ? <p className="py-6 text-center text-[12px] text-slate-400" role="status">No retained candidate rows were returned for {sourceLabel}. Source retrieval and review coverage are not inferred from this empty list.</p>
      : <ol className="mt-3 space-y-3">{candidates.map((listing, index) => {
        const decision = candidateFinalDecision(listing);
        const url = typeof listing.itemUrl === 'string' && listing.itemUrl ? listing.itemUrl : typeof listing.url === 'string' ? listing.url : undefined;
        const title = typeof listing.title === 'string' && listing.title ? listing.title : 'Untitled candidate';
        return <li key={candidateDisplayKey(listing, scope, String(index))} className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3 hover:border-slate-500/70" data-candidate-card="true">
          <div className="flex flex-col items-start gap-3 sm:flex-row">
            <div className="flex shrink-0 gap-2" aria-label="Target and candidate images">
              <CandidateImage src={targetImageUrl} label="Target" />
              <CandidateImage src={candidateImageUrl(listing)} label="Candidate" url={url} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="min-w-0 flex-1 break-words text-[12px] font-semibold leading-relaxed text-slate-100">{url ? <a href={url} target="_blank" rel="noopener noreferrer" title="Open original candidate listing" className="rounded-sm text-sky-300 hover:text-sky-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">{title}</a> : title}</h4>
                <p className="shrink-0 text-[12px] font-semibold tabular-nums text-slate-100">{formatCandidateDisplayPrice(listing)}</p>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{listing.sourceLabel || listing.sourceId || sourceLabel} · {listing.metadataMatchRank ? `Rank #${listing.metadataMatchRank}` : 'Unranked'} · {listing.metadataMatchScore !== undefined && listing.metadataMatchScore !== null ? `Score ${listing.metadataMatchScore}/100` : 'Score unavailable'}{listing.metadataMatchLabel ? ` · ${listing.metadataMatchLabel}` : ''}</p>
              <div className="mt-2" data-final-decision-code={decision.code}>
                <span className={`inline-block rounded-md border px-2 py-1 text-[11px] font-semibold leading-snug ${decision.className}`}>{decision.label}</span>
                <p className="mt-1.5 break-words text-[12px] leading-relaxed text-slate-300">{decision.reason}</p>
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-2 border-t border-slate-700/50 pt-2" aria-label="Supporting candidate comparisons">
            <MetadataComparisonTable listing={listing} />
            <TestAiVisualComparison listing={listing} />
          </div>
          <details className="mt-2 rounded-md border border-slate-700/40 px-2 py-1.5">
            <summary className="cursor-pointer rounded-sm text-[11px] font-medium text-slate-400 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">Technical details</summary>
            <div className="pt-2 [&_p]:!text-[11px] [&_li]:!text-[11px] [&_div]:!text-[11px]"><TestAiCandidateStatus listing={listing} scope={scope} reconciled /></div>
          </details>
        </li>;
      })}</ol>}
  </section>;
}
