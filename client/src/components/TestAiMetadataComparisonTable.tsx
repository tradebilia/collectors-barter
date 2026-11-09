type RankingContribution = {
  matched?: boolean;
  structured?: boolean;
  titleDerived?: boolean;
  points?: number;
  awardedPoints?: number;
  sources?: string[];
  reasons?: string[];
};

/** Presentation only: an award explains points, never identity or price authority. */
export function metadataContributionTooltip(contribution?: RankingContribution): string | undefined {
  if (!contribution?.matched) return undefined;
  const points = contribution.awardedPoints ?? contribution.points;
  const source = contribution.sources?.join(', ') || (contribution.structured && contribution.titleDerived
    ? 'mixed evidence' : contribution.structured ? 'structured evidence' : contribution.titleDerived ? 'title-derived evidence' : 'combined or rule evidence');
  return `${points !== undefined ? `${points} awarded point${points === 1 ? '' : 's'} · ` : ''}${source}`;
}

export function MetadataComparisonTable({ listing }: { listing: any }) {
  const comparisons = Array.isArray(listing?.metadataFieldComparisons) ? listing.metadataFieldComparisons : [];
  if (comparisons.length === 0) return null;
  const statusClass: Record<string, string> = { match: 'text-emerald-300', different: 'text-red-300', unknown: 'text-amber-200' };
  const termClass = (contribution?: RankingContribution) => contribution?.matched
    ? 'rounded bg-sky-900/50 px-1 text-sky-100 ring-1 ring-sky-400/50' : 'text-gray-300';
  const structuredClass = (contribution?: RankingContribution) => contribution?.matched && contribution.structured
    ? 'rounded bg-cyan-900/60 px-1 text-cyan-100 ring-1 ring-cyan-400/60' : 'text-gray-300';
  const titleClass = (contribution?: RankingContribution) => contribution?.matched && contribution.titleDerived
    ? 'rounded bg-violet-900/60 px-1 text-violet-100 ring-1 ring-violet-400/60' : 'text-gray-200';
  return <details className="mt-1 rounded border border-cyan-700/30 bg-cyan-950/20 p-1.5" open>
    <summary className="cursor-pointer text-[8px] font-bold uppercase tracking-wide text-cyan-200">Target vs candidate fields</summary>
    <div className="mt-1 flex flex-wrap items-center gap-1 text-[8px] text-gray-400" aria-label="Ranking highlight legend">
      <span className="rounded bg-cyan-900/60 px-1 text-cyan-100 ring-1 ring-cyan-400/60">Scored field</span>
      <span className="rounded bg-violet-900/60 px-1 text-violet-100 ring-1 ring-violet-400/60">Title-derived scored field</span>
      <span>Highlighted field names contributed to the ranking score.</span>
    </div>
    <div className="mt-1 overflow-x-auto"><table className="w-full min-w-[520px] border-collapse text-[8px] leading-snug">
      <thead><tr className="border-b border-cyan-800/50 text-left text-cyan-200/80"><th className="p-1">Target field</th><th className="p-1">Target value</th><th className="p-1">Candidate field</th><th className="p-1">Candidate value</th><th className="p-1">Candidate title-derived value</th><th className="p-1">Result</th></tr></thead>
      <tbody>{comparisons.map((comparison: any, comparisonIndex: number) => {
        const contribution = comparison.rankingContribution as RankingContribution | undefined;
        const label = metadataContributionTooltip(contribution);
        return <tr key={`${comparison.targetField}-${comparisonIndex}`} className="border-b border-gray-800/60 align-top">
          <td className="p-1 font-semibold"><span className={termClass(contribution)} title={label}>{comparison.targetField || 'Unknown field'}</span></td>
          <td className="max-w-[150px] break-words p-1 text-gray-200">{comparison.targetValue || 'Unknown'}</td>
          <td className="p-1 font-semibold"><span className={structuredClass(contribution)} title={contribution?.structured ? label : undefined}>{comparison.candidateField || 'Unknown field'}</span></td>
          <td className="max-w-[150px] break-words p-1 text-gray-200">{comparison.candidateValue || 'Unknown'}</td>
          <td className="max-w-[190px] break-words p-1 text-gray-200"><span className={titleClass(contribution)} title={contribution?.titleDerived ? label : undefined}>{comparison.titleDerivedValue || 'Unknown'}</span>{comparison.titleDerivedStatus && <span className={`ml-1 font-semibold uppercase ${statusClass[comparison.titleDerivedStatus] ?? statusClass.unknown}`}>({comparison.titleDerivedStatus})</span>}</td>
          <td className={`p-1 font-semibold uppercase ${statusClass[comparison.status] ?? statusClass.unknown}`}>{comparison.status || 'unknown'}</td>
        </tr>;
      })}</tbody>
    </table></div>
  </details>;
}
