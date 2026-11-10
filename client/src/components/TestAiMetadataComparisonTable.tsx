import React from 'react';
import { candidateExecutionReceipt, candidateExecutionFact, hasActualVisualResponse } from '../../../shared/testAiCandidateStatus';

type ScoringEvidence = {
  awardField: string;
  source: string;
  awardedPoints: number;
  shared?: boolean;
  evidence: Array<{ field: string; source: string; value?: string }>;
};

type RankingContribution = {
  matched?: boolean;
  structured?: boolean;
  titleDerived?: boolean;
  points?: number;
  awardedPoints?: number;
  sources?: string[];
  reasons?: string[];
  scoringEvidence?: ScoringEvidence[];
  awards?: Array<{ field: string; source: string; awardedPoints: number; evidence?: ScoringEvidence['evidence'] }>;
};

/** Presentation only: an award explains points, never identity or price authority. */
export function metadataContributionTooltip(contribution?: RankingContribution): string | undefined {
  if (!contribution?.matched) return undefined;
  const points = contribution.awardedPoints ?? contribution.points;
  const source = contribution.sources?.join(', ') || (contribution.structured && contribution.titleDerived
    ? 'mixed evidence' : contribution.structured ? 'structured evidence' : contribution.titleDerived ? 'title-derived evidence' : 'combined or rule evidence');
  return `${points !== undefined ? `${points} awarded point${points === 1 ? '' : 's'} · ` : ''}${source}`;
}

function scoringSourceLabel(source: string): string {
  if (source === 'title') return 'Title evidence';
  if (source === 'structured') return 'Structured evidence';
  if (source === 'mixed') return 'Mixed scoring evidence';
  return `Rule/combined scoring evidence (${source})`;
}

/** Use only recorded awards; never substitute the listing title or parser hint. */
export function metadataSelectedScoringEvidence(contribution?: RankingContribution): ScoringEvidence[] {
  if (!contribution?.matched) return [];
  if (Array.isArray(contribution.scoringEvidence)) return contribution.scoringEvidence;
  return (contribution.awards ?? []).filter(award => award.awardedPoints > 0).map(award => ({
    awardField: award.field, source: award.source, awardedPoints: award.awardedPoints, evidence: award.evidence ?? [],
  }));
}

export function MetadataComparisonTable({ listing }: { listing: any }) {
  const comparisons = Array.isArray(listing?.metadataFieldComparisons) ? listing.metadataFieldComparisons : [];
  if (comparisons.length === 0) return <details className="mt-1 rounded border border-cyan-700/30 bg-cyan-950/20 p-2">
    <summary className="cursor-pointer text-[12px] font-semibold text-cyan-200">Full metadata comparison</summary>
    <p className="mt-2 text-xs text-slate-400">No field comparison was returned for this candidate. Missing metadata is not an image mismatch.</p>
  </details>;
  const statusClass: Record<string, string> = { match: 'text-emerald-300', different: 'text-red-300', unknown: 'text-amber-200' };
  const termClass = (contribution?: RankingContribution) => contribution?.matched
    ? 'rounded bg-sky-900/50 px-1 text-sky-100 ring-1 ring-sky-400/50' : 'text-gray-300';
  const structuredClass = (contribution?: RankingContribution) => contribution?.matched && contribution.structured
    ? 'rounded bg-cyan-900/60 px-1 text-cyan-100 ring-1 ring-cyan-400/60' : 'text-gray-300';
  const titleClass = (contribution?: RankingContribution) => contribution?.matched && contribution.titleDerived
    ? 'rounded bg-violet-900/60 px-1 text-violet-100 ring-1 ring-violet-400/60' : 'text-gray-200';
  return <details className="mt-1 rounded border border-cyan-700/30 bg-cyan-950/20 p-1.5">
    <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wide text-cyan-200">Full metadata comparison</summary>
    <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-gray-400" aria-label="Ranking highlight legend">
      <span className="rounded bg-cyan-900/60 px-1 text-cyan-100 ring-1 ring-cyan-400/60">Scored field</span>
      <span className="rounded bg-violet-900/60 px-1 text-violet-100 ring-1 ring-violet-400/60">Title-derived scored field</span>
      <span>Highlighted field names contributed to the ranking score. Selected scoring evidence is separate from structured values and independent title parsing; it does not confirm identity or valuation.</span>
    </div>
    <div className="mt-1 overflow-x-auto"><table className="w-full min-w-[520px] border-collapse text-[11px] leading-snug">
      <thead><tr className="border-b border-cyan-800/50 text-left text-cyan-200/80"><th className="p-1">Target field</th><th className="p-1">Target value</th><th className="p-1">Candidate field</th><th className="p-1">Candidate value</th><th className="p-1">Candidate title-derived value / scoring evidence</th><th className="p-1">Result</th></tr></thead>
      <tbody>{comparisons.map((comparison: any, comparisonIndex: number) => {
        const contribution = comparison.rankingContribution as RankingContribution | undefined;
        const label = metadataContributionTooltip(contribution);
        const scoringEvidence = metadataSelectedScoringEvidence(contribution);
        return <tr key={`${comparison.targetField}-${comparisonIndex}`} className="border-b border-gray-800/60 align-top">
          <td className="p-1 font-semibold"><span className={termClass(contribution)} title={label}>{comparison.targetField || 'Unknown field'}</span>{label && <div className="mt-1 font-normal text-sky-200" data-ranking-contribution>{label}</div>}</td>
          <td className="max-w-[150px] break-words p-1 text-gray-200">{comparison.targetValue || 'Unknown'}</td>
          <td className="p-1 font-semibold"><span className={structuredClass(contribution)} title={contribution?.structured ? label : undefined}>{comparison.candidateField || 'Unknown field'}</span></td>
          <td className="max-w-[150px] break-words p-1 text-gray-200">{comparison.candidateValue || 'Unknown'}</td>
          <td className="max-w-[250px] break-words p-1 text-gray-200">
            <div><span className="text-gray-400">Independent title parse: </span><span className={titleClass(contribution)} title={contribution?.titleDerived ? label : undefined}>{comparison.titleDerivedValue || 'Unknown'}</span>{comparison.titleDerivedStatus && <span className={`ml-1 font-semibold uppercase ${statusClass[comparison.titleDerivedStatus] ?? statusClass.unknown}`}>({comparison.titleDerivedStatus})</span>}</div>
            {scoringEvidence.map((award, awardIndex) => <div key={`${award.awardField}-${awardIndex}`} className="mt-1 border-t border-gray-700/70 pt-1" data-selected-scoring-evidence>
              <div className="font-semibold text-sky-200">{scoringSourceLabel(award.source)} · {award.awardField} · {award.awardedPoints} awarded point{award.awardedPoints === 1 ? '' : 's'}{award.shared ? ' (shared term, not additional points)' : ''}</div>
              {award.evidence.length > 0 ? <>
                <div className="text-gray-400">Recorded scoring witness, not a structured or extracted field value:</div>
                {award.evidence.map((evidence, evidenceIndex) => <div key={`${evidence.field}-${evidenceIndex}`} className={evidence.source === 'title' ? 'text-violet-200' : 'text-cyan-200'}>{scoringSourceLabel(evidence.source)} · {evidence.field}: {evidence.value || 'Unknown (no value recorded)'}</div>)}
              </> : <div className="text-gray-400">No field value recorded by this scoring term. Unknown values remain Unknown.</div>}
            </div>)}
          </td>
          <td className={`p-1 font-semibold uppercase ${statusClass[comparison.status] ?? statusClass.unknown}`}>{comparison.status || 'unknown'}</td>
        </tr>;
      })}</tbody></table></div>
  </details>;
}

/** Visual observations only. Never manufactures a mismatch from metadata or a missing call. */
export function TestAiVisualComparison({ listing }: { listing: any }) {
  const receipt = candidateExecutionReceipt(listing);
  const reviewed = hasActualVisualResponse(listing);
  const differences = reviewed && Array.isArray(listing.visualDifferences) ? listing.visualDifferences.filter((difference: any) => difference && typeof difference === 'object') : [];
  const execution = candidateExecutionFact(listing);
  return <details className="mt-2 rounded border border-slate-700/60 bg-slate-950/40 p-2" aria-label="Candidate visual comparison">
    <summary className="cursor-pointer text-[12px] font-semibold text-cyan-200">Visual comparison</summary>
    <div className="mt-2 space-y-2 text-[12px] text-slate-300">
      {differences.length > 0 ? <ul className="space-y-2">{differences.map((difference: any, index: number) => <li key={index} className="rounded bg-slate-900/60 p-2">
        <p className="font-semibold text-slate-100">{difference.field || 'Visual detail'}</p>
        <p><span className="text-cyan-200">Target:</span> {difference.targetObservation || 'Observation not recorded'}</p>
        <p><span className="text-emerald-200">Candidate:</span> {difference.candidateObservation || 'Observation not recorded'}</p>
        {difference.impact && <p className="mt-1 text-amber-200">{difference.impact}</p>}
      </li>)}</ul> : <p>{!reviewed ? `No completed visual comparison. ${execution.label}${execution.reason ? ` — ${execution.reason}` : ''}.`
        : receipt?.identity?.reviewVerdict === 'rough_match' || receipt?.identity?.reviewVerdict === 'unreadable'
          ? 'Visual identity was not confirmed; no specific visual differences were recorded.'
          : receipt?.identity?.result === 'mismatch' ? 'The reviewer reported a mismatch but did not record specific visual differences.'
            : receipt?.identity?.result === 'match' ? 'No specific visual differences were recorded.' : 'No visual differences were recorded; identity remains unconfirmed.'}</p>}
    </div>
  </details>;
}
