import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { candidateExecutionFact, candidateIdentityFact, candidatePricingFact, hasActualVisualDispatch, hasActualVisualResponse, isHardCandidateDisplayException, formatCandidateDisplayPrice } from '../shared/testAiCandidateStatus';
import { mergeCandidateDisplayGroups, stampCandidateDisplayIntake } from '../shared/testAiCandidateLedger';
import { freezeMetadataRankingPopulation, bindMetadataRankingPopulation } from '../shared/testAiRankingPopulation';
import type { VisualExecution } from '../shared/testAiVisualExecution';
import { TestAiCandidateStatus, TestAiVisualReviewRow, TestAiExecutionSummary, TestAiFinalLedgerRow, TestAiFinalUseSummary, TestAiSourcePopulationSummary, selectTestAiVisualDisplayRows } from '../client/src/components/TestAiCandidateStatus';
import { TestAiCandidateMasterList } from '../client/src/components/TestAiCandidateMasterList';
import { candidateFinalDecision } from '../client/src/components/test-ai/candidateFinalDecision';
import { buildMarketProfile, type ComparableTarget, type MarketSale } from './testAiComparableEngine';

const now = new Date('2026-11-08T12:00:00Z');
const receipt = (patch: Partial<VisualExecution> = {}): VisualExecution => ({ version: 1, state: 'completed', reasonCode: 'review_returned', hardExclusion: false, selectedForReview: true,
  identity: { origin: 'visual', result: 'match', reviewVerdict: 'match' }, attempts: [{ ordinal: 1, stage: 'initial', format: 'json_schema', outcome: 'usable_review' }], ...patch });
const target: ComparableTarget = { title: 'Ken Griffey Jr 1989 Upper Deck #1', category: 'sports_cards', itemDetails: JSON.stringify({ player: 'Ken Griffey Jr', year: '1989', manufacturer: 'Upper Deck', cardNumber: '1' }) };
const sales = (count: number): MarketSale[] => Array.from({ length: count }, (_, index) => ({ title: target.title, saleId: `sale-${index}`, price: 100 + index,
  currency: 'USD', date: `2026-10-${String(index + 1).padStart(2, '0')}T00:00:00Z`, marketplace: 'Fixture Market', sourceId: 'fixture', sourceLabel: 'Fixture', originMarketplace: 'ebay', saleStatus: 'completed', priceBasis: 'sold', recency: 'recent', visualReviewStatus: 'match' }));

describe('Stage 5 actual status render component', () => {
  it('does not infer hard exclusion, dispatch or response from prose, requirement, verdict or audit shape', () => {
    const legacy = { title: 'Legacy', visualRequirement: 'required', visualReviewStatus: 'match', visualReviewRationale: 'No hard conflict; no wrong platform', visualAudit: { initialModel: 'model' } };
    expect(isHardCandidateDisplayException(legacy)).toBe(false); expect(hasActualVisualDispatch(legacy)).toBe(false); expect(hasActualVisualResponse(legacy)).toBe(false);
    const html = renderToStaticMarkup(<TestAiCandidateStatus listing={legacy} />);
    expect(html).toContain('Legacy / unknown'); expect(html).not.toContain('Hard exclusion:'); expect(html).not.toContain('Completed response'); expect(html).not.toContain('Sent to AI');
  });
  it('deterministic metadata holds stay out of the image rows and never become AI mismatches', () => {
    const held = { visualReviewStatus: 'mismatch', visualExecution: receipt({ state: 'not_dispatched', reasonCode: 'declared_identity_conflict', selectedForReview: false, hardExclusion: true,
      identity: { origin: 'deterministic', result: 'mismatch' }, attempts: [] }) };
    const html = renderToStaticMarkup(<TestAiCandidateStatus listing={held} />);
    expect(html).toContain('Deterministic metadata conflict'); expect(html).toContain('Not dispatched'); expect(html).not.toContain('Image mismatch');
    expect(selectTestAiVisualDisplayRows([[held]])).toHaveLength(0);
  });
  it('rough match remains unconfirmed and selected terminal rows do not claim a pending worker', () => {
    const rough = { visualExecution: receipt({ identity: { origin: 'visual', result: 'manual_unknown', reviewVerdict: 'rough_match' } }) };
    expect(candidateIdentityFact(rough).label).toBe('Rough / unconfirmed match');
    const selected = { visualExecution: receipt({ state: 'selected_pending', reasonCode: 'adaptive_match_target', attempts: [] }) };
    expect(candidateExecutionFact(selected).label).toContain('not dispatched'); expect(candidateExecutionFact(selected).label).not.toContain('pending');
  });
  it('typed recovered timeout and failed optional retry retain independent earlier identity honestly', () => {
    const recovered = { visualExecution: receipt({ attempts: [{ ordinal: 1, stage: 'initial', format: 'json_schema', outcome: 'timed_out' }, { ordinal: 2, stage: 'initial', format: 'json_object', outcome: 'usable_review' }] }) };
    expect(candidateExecutionFact(recovered).label).toContain('recovered timeout');
    const retry = { visualExecution: receipt({ attempts: [...recovered.visualExecution.attempts, { ordinal: 3, stage: 'high_resolution_retry', format: 'json_schema', outcome: 'timed_out' }] }) };
    expect(candidateExecutionFact(retry).label).toContain('Response retained; retry timed out'); expect(candidateIdentityFact(retry).label).toBe('Image match');
  });
  it('provider failure actual attempt is displayed unresolved, synthetic unreadable has no usable response', () => {
    const failed = { title: 'Failure', visualReviewStatus: 'unreadable', visualExecution: receipt({ state: 'dispatched_inconclusive', reasonCode: 'provider_error', identity: { origin: 'none', result: 'not_established' },
      attempts: [{ ordinal: 1, stage: 'initial', format: 'json_schema', outcome: 'error', errorCode: 'provider_error' }] }) };
    expect(hasActualVisualResponse(failed)).toBe(false); expect(selectTestAiVisualDisplayRows([[failed]])).toHaveLength(1);
    const html = renderToStaticMarkup(<TestAiVisualReviewRow listing={failed} targetImageUrl="https://example.test/target.jpg" />);
    expect(html).toContain('Provider failure'); expect(html).not.toContain('Completed response');
  });
  it('unknown execution can coexist with server final visual approval without fabricated call provenance', () => {
    const row = { valuationUse: { identityAdmission: { serverFinalApprovalVerified: true }, use: { code: 'CURRENT_SALES_DIAGNOSTIC_ONLY' } } };
    const html = renderToStaticMarkup(<TestAiCandidateStatus listing={row} reconciled />);
    expect(html).toContain('Legacy / unknown'); expect(html).toContain('final server identity approved'); expect(html).toContain('Current-sales diagnostics only');
  });
  it('source eligibility before analysis never means used; terminal use supersedes accepted and legacy USED_DIRECT', () => {
    const row = { evidenceDisposition: 'valuation_eligible', accepted: true, admissionCode: 'USED_DIRECT' };
    expect(candidatePricingFact(row).label).toContain('final analysis not run');
    const html = renderToStaticMarkup(<TestAiFinalLedgerRow comparable={{ ...row, currency: 'CAD', price: 12, valuationUse: { use: { code: 'OUTLIER_EXCLUDED', reasonCodes: [], primaryMarketSales: false, postPolicySaleDiagnostics: false, currentSaleMedianDiagnostics: false, historicalPromptIncluded: null }, identityAdmission: {}, selection: 'selected_pre_outlier' } }} />);
    expect(html).toContain('Outlier excluded'); expect(html).toContain('CAD 12'); expect(html).not.toContain('Used in direct valuation'); expect(html).not.toContain('$12');
  });
  it('renders a plain-language final-analysis blocker instead of a technical code chain', () => {
    const decision = candidateFinalDecision({ valuationUse: { use: { code: 'REVIEW_REQUIRED', reasonCodes: ['INVALID_PRICE', 'REQUIRED_APPROVAL_MISSING'], primaryMarketSales: false }, sourceAdmission: { blockerCodes: ['SOURCE_DISPOSITION_RESTRICTIVE'], verifiedSourceDisposition: 'context_only', reasonDetails: ['meaningful observed provider record ID or valid listing/transaction URL is missing; retained as context only', 'APPROVAL_VISUAL_IDENTITY_CONFLICT: deciding evidence reports false for dateMatches.'] } } });
    expect(decision.label).toBe('NOT USED — REVIEW REQUIRED');
    expect(decision.reason).toContain('context only');
    expect(decision.reason).toContain('did not include a verified provider ID or valid listing URL');
    expect(decision.reason).not.toContain('dateMatches');
    expect(decision.reason).not.toContain('INVALID_PRICE');
    expect(decision.reason).not.toContain('REQUIRED_APPROVAL_MISSING');
    expect(decision.reason).not.toContain('SOURCE_DISPOSITION_RESTRICTIVE');
  });
  it('reports the authoritative Mercari final blocker instead of blaming a missing visual response', () => {
    const decision = candidateFinalDecision({ sourceId: 'mercari_sold_comps', requestedMode: 'sold', visualReviewStatus: 'not_reviewed',
      visualExecution: receipt({ state: 'dispatched_inconclusive', reasonCode: 'provider_error', identity: { origin: 'none', result: 'not_established' },
        attempts: [{ ordinal: 1, stage: 'initial', format: 'json_object', outcome: 'no_decision', failureCode: 'response_truncated', finishReason: 'length' }] }),
      valuationUse: { use: { code: 'REVIEW_REQUIRED', reasonCodes: ['PROVENANCE_UNVERIFIED', 'INVALID_DATE', 'REQUIRED_APPROVAL_MISSING'], primaryMarketSales: false },
        sourceAdmission: { blockerCodes: ['PROVENANCE_UNVERIFIED', 'INVALID_DATE', 'REQUIRED_APPROVAL_MISSING'], reasonDetails: ['sale date is missing, invalid, or future-dated'] } } });
    expect(decision.reason).toContain('Required server-final identity approval is missing or not bound to this target and image');
    expect(decision.reason).not.toContain('visual AI was called but did not return a usable review');
    expect(decision.reason).not.toContain('no visual match was confirmed');
    expect(decision.reason).not.toContain('sale date is missing');
    expect(decision.reason).not.toContain('server provenance was not verified');
  });
  it('does not call an intentionally unreviewed Autographs row a Mercari visual failure', () => {
    const decision = candidateFinalDecision({ sourceId: 'mercari_sold_comps', visualRequirement: 'not_required_autograph_market_context',
      visualReviewStatus: 'not_reviewed', requestedMode: 'sold', valuationUse: { use: { code: 'CURRENT_SALES_DIAGNOSTIC_ONLY', reasonCodes: [] },
        sourceAdmission: { blockerCodes: [], reasonDetails: [] } } });
    expect(decision.reason).not.toContain('visual AI review was not completed');
    expect(decision.reason).toContain('shown for comparison only');
  });
  it('names the actual missing signature wording when final signed-item approval was not established', () => {
    const decision = candidateFinalDecision({ visualRequirement: 'not_required',
      valuationUse: { use: { code: 'REVIEW_REQUIRED', reasonCodes: ['UNIVERSAL_REVIEW_REQUIRED'] },
        identityAdmission: { blockerCodes: ['UNIVERSAL_REVIEW_REQUIRED'], reasonDetails: ['autograph status is not stated'] } } });
    expect(decision.reason).toContain('listing title does not state that the item is signed or autographed');
    expect(decision.reason).not.toContain('universal identity field');
  });
  it('does not blame visual review for a signed-item relevance rejection even on a legacy display row', () => {
    const decision = candidateFinalDecision({ sourceId: 'mercari_sold_comps', metadataMatchScore: 45,
      metadataRanking: { scorerRole: 'signed_item_relevance' }, evidenceDisposition: 'context_only',
      evidenceReasons: ['signed object type is missing or does not match the target'],
      valuationUse: { use: { code: 'REVIEW_REQUIRED', reasonCodes: [] } } });
    expect(decision.reason).toContain('signed object type is missing or does not match');
    expect(decision.reason).not.toContain('visual AI review was not completed');
  });
  it('describes no-visual Autographs market admission without technical warning codes', () => {
    const decision = candidateFinalDecision({ sourceId: 'mercari_sold_comps',
      valuationUse: { use: { code: 'CURRENT_SALES_PRIMARY', reasonCodes: ['MERCARI_UNDATED_QUALIFIED_EXCEPTION'] },
        identityAdmission: { basis: 'server_autograph_market_relevance' } } });
    expect(decision.label).toBe('USED IN VALUATION');
    expect(decision.reason).toContain('Exact image review is not required');
    expect(decision.reason).toContain('Sale date remains Unknown');
    expect(decision.reason).not.toContain('MERCARI_UNDATED_QUALIFIED_EXCEPTION');
  });
  it('preserves eight metadata columns, Potential Points, source highlights, target/candidate images and one master list', () => {
    const frozen = freezeMetadataRankingPopulation([{ title: target.title, imageUrl: 'https://example.test/candidate.jpg', currency: 'CAD', price: 100 }], { sourceId: 'fixture', populationId: 'rank-run' });
    const row = { ...frozen.listings[0], metadataMatchScore: 100, metadataFieldComparisons: [{ targetField: 'Player', targetValue: 'Ken Griffey Jr', candidateField: 'player', candidateValue: 'Ken Griffey Jr', titleDerivedValue: 'Ken Griffey Jr', status: 'match', rankingContribution: { matched: true, structured: true, titleDerived: true, awardedPoints: 20, sources: ['structured', 'title'] } }] };
    const [ranked] = bindMetadataRankingPopulation(frozen, [row]).listings;
    const html = renderToStaticMarkup(<TestAiCandidateMasterList listings={mergeCandidateDisplayGroups([[ranked], [{ ...ranked, visualExecution: receipt() }]])} sourceLabel="Fixture" targetImageUrl="https://example.test/target.jpg" scope={{ side: 'item_a' }} />);
    expect((html.match(/<th /g) ?? []).length).toBe(8); expect((html.match(/<img /g) ?? []).length).toBe(2);
    expect(html).toContain('Potential Points'); expect(html).not.toContain('20 awarded points'); expect(html).toContain('Candidate title-derived value'); expect(html).toContain('Final decisions — ranked candidates (1)');
    expect(html).toContain('VALUATION NOT RUN'); expect(html).not.toContain('NOT ACCEPTED'); expect(html).toContain('Full metadata comparison'); expect(html).not.toContain('Hard exception — not sent to AI');
  });
  it('currency-unknown records and source aggregate summaries never assume dollars or add overlapping populations', () => {
    expect(formatCandidateDisplayPrice({ price: 12 })).toBe('Currency unknown 12');
    const html = renderToStaticMarkup(<TestAiSourcePopulationSummary packet={{ sourceId: 'fixture', populationId: 'run', retainedIngressCount: 4, queryReturnedObservationCount: null, queryCoverage: { measured: false } }} />);
    expect(html).toContain('query-return observations: unmeasured'); expect(html).toContain('may overlap'); expect(html).not.toContain('observations: 0');
  });
});

describe('Stage 5 actual final engine to rendered status/ledger/summary', () => {
  it('renders actual IQR terminal exclusion while preserving original identity and pre-outlier selected fact', () => {
    const input = sales(10); input[9].price = 10000;
    const profile = buildMarketProfile(target, input, null, now, null, null, { side: 'item_a', analysisRunId: 'iqr-run', historicalPromptSales: [] });
    const tail = profile.comparables.find((row) => row.saleId === 'sale-9')!;
    expect(tail.valuationUse?.use.code).toBe('OUTLIER_EXCLUDED'); expect(tail.valuationUse?.identityAdmission.accepted).toBe(true);
    const html = renderToStaticMarkup(<TestAiFinalLedgerRow comparable={tail} />);
    expect(html).toContain('Outlier excluded'); expect(html).toContain('Selected before outliers: yes'); expect(html).toContain('primary sales: no');
  });
  it('renders actual current diagnostics under global hold without labeling accepted rows primary used', () => {
    const profile = buildMarketProfile(target, sales(6), null, now, { materialReviewRequired: true, materialFlags: ['fixture hold'], sourceAlignmentStatus: 'conflicted' }, null, { side: 'item_a', analysisRunId: 'hold-run', historicalPromptSales: [] });
    const row = profile.comparables.find((row) => row.valuationUse?.use.currentSaleMedianDiagnostics)!;
    expect(row.valuationUse?.use.primaryMarketSales).toBe(false);
    const html = renderToStaticMarkup(<><TestAiFinalLedgerRow comparable={row} /><TestAiFinalUseSummary report={profile.finalUseReport} /></>);
    expect(html).toContain('Current-sales diagnostics only'); expect(html).toContain('primary sales: no'); expect(html).toContain('MATERIAL_IDENTITY_HOLD');
  });
  it('renders actual duplicate suppression without stale primary admission label; small-sample flag remains retained', () => {
    const original = sales(6); original[5].price = 10000;
    const profile = buildMarketProfile(target, [...original, { ...original[0] }], null, now, null, null, { side: 'item_a', analysisRunId: 'duplicate-run' });
    const duplicate = profile.comparables.find((row) => row.valuationUse?.use.code === 'EXACT_DUPLICATE')!;
    expect(duplicate).toBeDefined();
    const html = renderToStaticMarkup(<TestAiFinalLedgerRow comparable={duplicate} />);
    expect(html).toContain('Exact duplicate excluded'); expect(html).not.toContain('Used to support primary sales valuation');
    const tail = profile.comparables.find((row) => row.saleId === 'sale-5')!;
    expect(tail.valuationUse?.use.smallSampleOutlierWarning).toBe(true); expect(tail.valuationUse?.use.postPolicySaleDiagnostics).toBe(true);
  });
});
