import { describe, expect, it } from 'vitest';
import { freezeMetadataRankingPopulation, bindMetadataRankingPopulation } from '../shared/testAiRankingPopulation';
import { candidateDisplayKey, mergeCandidateDisplayGroups, mergeCandidateDisplayProjection, mergeVisualReviewDisplayBatches, mergeEbayCandidateDisplayData, stampCandidateDisplayIntake, reconcileCandidateFinalUse, type CandidateFinalDisplayOutcome } from '../shared/testAiCandidateLedger';
import { summarizeVisualExecutionOccurrences, type VisualExecution } from '../shared/testAiVisualExecution';

const completed: VisualExecution = { version: 1, state: 'completed', reasonCode: 'review_returned', selectedForReview: true, hardExclusion: false,
  identity: { origin: 'visual', result: 'match', reviewVerdict: 'match' }, attempts: [{ ordinal: 1, stage: 'initial', format: 'json_schema', outcome: 'usable_review' }] };
function population(sourceId = 'ebay_sold_comps', populationId = 'source-run') {
  const frozen = freezeMetadataRankingPopulation([
    { id: 'shared', title: 'Identical title', price: 100 }, { id: 'shared', title: 'Identical title', price: 100 },
    { title: 'Identical title', price: 100 }, { title: 'Identical title', price: 100 },
  ], { sourceId, populationId });
  return bindMetadataRankingPopulation(frozen, frozen.listings.map((row, index) => ({ ...row, metadataMatchScore: 100 - index,
    metadataMatchRank: index + 1, metadataScoreAwards: [{ field: 'title', awardedPoints: 20 }],
    metadataFieldComparisons: [{ targetField: 'Title', candidateValue: row.title }] }))).listings;
}
function outcomeFor(submitted: any[], code = 'OUTLIER_EXCLUDED'): CandidateFinalDisplayOutcome {
  return { side: 'item_a', requestRunId: 'request-1', submitted, analysisRunId: 'server-run', finalRows: submitted.map((row, ordinal) => ({
    valuationUse: { version: 'stage5-final-use-v1', auditRef: { side: 'item_a', analysisRunId: 'server-run', intakeOrdinal: ordinal,
      intakeRef: `final:server-run:item_a:occ:${ordinal}`, displayCorrelation: row.displayCorrelation,
      sourceCorrelation: { metadataRanking: row.metadataRanking, metadataOriginOccurrenceKey: row.metadataOriginOccurrenceKey ?? null },
      verifiedObservationId: row.observationId ?? row.provenance?.payloadHash ?? null },
    identityAdmission: { accepted: true, basis: 'title_evidence', serverFinalApprovalVerified: false }, use: { code, primaryMarketSales: false } },
  })) };
}

describe('Stage 5 actual candidate display merge boundary', () => {
  it('preserves a completed deciding response in both orders while enriching stale rich metadata', () => {
    const [parent] = population();
    const decided = { ...parent, visualExecution: completed, visualReviewStatus: 'match', evidenceDisposition: 'valuation_eligible', visualAudit: { decidingRationale: 'actual decision' } };
    const stale = { ...parent, visualReviewStatus: 'not_reviewed', evidenceDisposition: 'warning_review', imageUrl: 'https://example.test/rich.jpg', metadataFieldComparisons: [{ targetField: 'Title' }] };
    for (const groups of [[decided, stale], [stale, decided]]) {
      const [row] = mergeCandidateDisplayGroups([groups]);
      expect(row.visualReviewStatus).toBe('match'); expect(row.evidenceDisposition).toBe('valuation_eligible');
      expect(row.visualAudit.decidingRationale).toBe('actual decision'); expect(row.imageUrl).toContain('rich.jpg');
    }
  });
  it('latest actual deciding attempt wins without unioning earlier positive evidence', () => {
    const [parent] = population();
    const initial = { ...parent, visualExecution: completed, visualEvidence: { slabVisible: true } };
    const later = { ...parent, visualExecution: { ...completed, identity: { origin: 'visual', result: 'manual_unknown', reviewVerdict: 'unreadable' },
      attempts: [...completed.attempts, { ordinal: 2, stage: 'high_resolution_retry', format: 'json_object', outcome: 'usable_review' }] }, visualEvidence: { slabVisible: false } };
    const [row] = mergeCandidateDisplayGroups([[later, initial]]);
    expect(row.visualExecution.identity.reviewVerdict).toBe('unreadable'); expect(row.visualEvidence).toEqual({ slabVisible: false });
  });
  it('preserves original source ranks and award highlights across subset reviews in both orders', () => {
    const [parent] = population();
    const reviewed = { ...parent, metadataOriginOccurrenceKey: parent.metadataRanking.occurrenceKey,
      metadataRanking: { ...parent.metadataRanking, populationId: 'subset', occurrenceKey: 'subset:run:id:occ:0' },
      metadataMatchRank: 1, metadataMatchScore: 1, metadataScoreAwards: [], visualExecution: completed };
    for (const groups of [[parent, reviewed], [reviewed, parent]]) {
      const [row] = mergeCandidateDisplayGroups([groups]);
      expect(row.metadataRanking.populationId).toBe('source-run'); expect(row.metadataMatchScore).toBe(parent.metadataMatchScore);
      expect(row.metadataScoreAwards).toEqual(parent.metadataScoreAwards); expect(row.visualExecution).toEqual(completed);
    }
  });
  it('does not collapse repeated IDs, identical titles/prices or missing-ID retained occurrences', () => {
    const rows = population();
    expect(mergeCandidateDisplayGroups([rows, rows.map((row) => ({ ...row }))])).toHaveLength(4);
    expect(mergeCandidateDisplayGroups([[{ title: 'Same', price: 1 }, { title: 'Same', price: 1 }]])).toHaveLength(2);
    expect(candidateDisplayKey(rows[0], { side: 'item_a' })).not.toBe(candidateDisplayKey(rows[0], { side: 'item_b' }));
    expect(mergeCandidateDisplayGroups([population('other-source'), rows])).toHaveLength(8);
    expect(mergeCandidateDisplayGroups([population('ebay_sold_comps', 'other-run'), rows], { runId: 'source-run' })).toHaveLength(4);
  });
  it('retains provider-failure partial completed rows and deduplicates repeated batch projections', () => {
    const [parent] = population();
    const row = { ...parent, visualExecution: completed };
    const batch = { listings: [row], visualFilter: { status: 'completed' } };
    const partial = { listings: [{ ...row }], error: 'provider unavailable', visualFilter: { status: 'provider_unavailable' } };
    const display = mergeVisualReviewDisplayBatches([batch, partial])!;
    expect(display.listings).toHaveLength(1); expect(display.displayCoverage).toBe('partial'); expect(display.error).toBeTruthy();
    const merged = mergeEbayCandidateDisplayData({ listings: [parent] }, display)!;
    expect(merged.listings).toHaveLength(1); expect(merged.listings[0].visualExecution).toEqual(completed);
    const counts = summarizeVisualExecutionOccurrences(display.listings, 1);
    expect(counts.dispatchedCandidateCount).toBe(1); expect(counts.responseReviewedCandidateCount).toBe(1);
  });
  it('canonical-only projections enrich only an unambiguous known source/run occurrence', () => {
    const [parent, second] = population();
    const known = { ...parent, observationId: 'observation', provenance: { payloadHash: 'observation' } };
    const canonicalOnly = { sourceId: 'ebay_sold_comps', metadataRanking: { populationId: 'source-run', sourceId: 'ebay_sold_comps' }, provenance: { payloadHash: 'observation' }, imageUrl: 'https://example.test/canonical.jpg' };
    expect(mergeCandidateDisplayGroups([[known], [canonicalOnly]])).toHaveLength(1);
    expect(mergeCandidateDisplayGroups([[known, { ...second, observationId: 'observation' }], [canonicalOnly]])).toHaveLength(3);
  });
});

describe('Stage 5 actual request receipt / server final-use source join', () => {
  it('stamps only already selected rows in exact order without changing evidence or counts', () => {
    const input = population(); const submitted = stampCandidateDisplayIntake(input, 'item_a', 'request-1');
    expect(submitted).toHaveLength(input.length); expect(submitted.map((row) => row.id)).toEqual(input.map((row) => row.id));
    submitted.forEach(({ displayCorrelation, ...row }, ordinal) => { expect(row).toEqual(input[ordinal]); expect(displayCorrelation.requestOccurrenceRef).toContain(`intake:${ordinal}`); });
  });
  it('actual terminal outlier code overrides source eligibility and stale USED_DIRECT; absent intake is not submitted', () => {
    const rows = population(); const submitted = stampCandidateDisplayIntake(rows.slice(0, 1), 'item_a', 'request-1');
    const outcome = outcomeFor(submitted);
    const reconciled = reconcileCandidateFinalUse(rows, outcome, { side: 'item_a' });
    expect(reconciled[0].valuationUse.use.code).toBe('OUTLIER_EXCLUDED');
    expect(reconciled[1].candidatePricingLink).toBe('not_submitted');
    expect(reconcileCandidateFinalUse(reconciled, null)[0]).not.toHaveProperty('valuationUse');
    expect(reconcileCandidateFinalUse(rows, outcome, { side: 'item_b' })[0]).not.toHaveProperty('valuationUse');
  });
  it('reordered projections join by actual receipt ordinal, never title/price; forged or stale server receipt stays unresolved', () => {
    const rows = population(); const submitted = stampCandidateDisplayIntake(rows, 'item_a', 'request-1');
    const outcome = outcomeFor(submitted, 'CURRENT_SALES_PRIMARY'); outcome.finalRows.reverse();
    const reconciled = reconcileCandidateFinalUse([...rows].reverse(), outcome, { side: 'item_a' });
    expect(reconciled[0].valuationUse.auditRef.intakeOrdinal).toBe(3);
    outcome.finalRows[0].valuationUse.auditRef.displayCorrelation = { ...submitted[3].displayCorrelation, requestOccurrenceRef: 'stale-request' };
    expect(reconcileCandidateFinalUse(rows, outcome, { side: 'item_a' })[3].candidatePricingLink).toBe('submitted_unresolved');
    outcome.finalRows[0].valuationUse.auditRef.analysisRunId = 'old-server-run';
    expect(reconcileCandidateFinalUse(rows, outcome, { side: 'item_a' })[3].candidatePricingLink).toBe('submitted_unresolved');
  });
  it('canonical-only final links require unique source and submitted observation plus server verification', () => {
    const row = { sourceId: 'source', provenance: { payloadHash: 'canonical-observation' } };
    const submitted = stampCandidateDisplayIntake([row], 'item_a', 'request-1'); const outcome = outcomeFor(submitted);
    expect(reconcileCandidateFinalUse([row], outcome, { side: 'item_a' })[0].candidatePricingLink).toBe('unresolved');
    const scope = { side: 'item_a' as const, sourceId: 'source', runId: 'request-1' };
    expect(reconcileCandidateFinalUse([row], outcome, scope)[0].valuationUse.use.code).toBe('OUTLIER_EXCLUDED');
    expect(reconcileCandidateFinalUse([row, { ...row }], outcome, scope)[0].candidatePricingLink).toBe('unresolved');
    outcome.finalRows[0].valuationUse.auditRef.verifiedObservationId = null;
    expect(reconcileCandidateFinalUse([row], outcome, scope)[0].candidatePricingLink).toBe('submitted_unresolved');
  });
});
