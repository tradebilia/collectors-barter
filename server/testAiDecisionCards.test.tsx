import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TestAiCandidateMasterList } from '../client/src/components/TestAiCandidateMasterList';
import { TestAiCandidateDisplayProvider } from '../client/src/components/TestAiCandidateStatus';
import { candidateFinalDecision } from '../client/src/components/test-ai/candidateFinalDecision';
import { stampCandidateDisplayIntake, type CandidateDisplayRow, type CandidateFinalDisplayOutcome } from '../shared/testAiCandidateLedger';
import type { VisualExecution } from '../shared/testAiVisualExecution';

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const receipt = (patch: Partial<VisualExecution> = {}): VisualExecution => ({
  version: 1, state: 'completed', reasonCode: 'review_returned', hardExclusion: false, selectedForReview: true,
  identity: { origin: 'visual', result: 'match', reviewVerdict: 'match' },
  attempts: [{ ordinal: 1, stage: 'initial', format: 'json_schema', outcome: 'usable_review' }], ...patch,
});
function cards(rows: CandidateDisplayRow[], options: { outcome?: CandidateFinalDisplayOutcome; side?: 'item_a' | 'item_b'; targetImageUrl?: string } = {}) {
  return renderToStaticMarkup(createElement(TestAiCandidateDisplayProvider, {
    side: options.side ?? 'item_a', outcome: options.outcome,
    children: createElement(TestAiCandidateMasterList, { listings: rows, sourceLabel: 'Fixture market', targetImageUrl: options.targetImageUrl }),
  }));
}
function finalOutcome(submitted: CandidateDisplayRow[], codes: string[] = ['CURRENT_SALES_PRIMARY']): CandidateFinalDisplayOutcome {
  return { side: 'item_a', requestRunId: 'request-current', analysisRunId: 'server-current', submitted,
    finalRows: submitted.map((row, ordinal) => ({ valuationUse: {
      version: 'stage5-final-use-v1', sourceAdmission: { verification: 'verified' },
      auditRef: { side: 'item_a', analysisRunId: 'server-current', intakeOrdinal: ordinal,
        displayCorrelation: copy(row.displayCorrelation), verifiedObservationId: row.observationId ?? null,
        sourceCorrelation: { metadataOriginOccurrenceKey: row.metadataOriginOccurrenceKey ?? null } },
      identityAdmission: { accepted: true, basis: 'title_evidence' },
      use: { code: codes[ordinal] ?? 'CURRENT_SALES_PRIMARY', primaryMarketSales: (codes[ordinal] ?? 'CURRENT_SALES_PRIMARY') === 'CURRENT_SALES_PRIMARY', reasonCodes: [] },
    } })) };
}
function submittedRows() {
  return stampCandidateDisplayIntake([{ metadataOriginOccurrenceKey: 'fixture:source-run:occ:0', sourceId: 'fixture',
    title: 'Coin', price: 120, currency: 'CAD', visualExecution: receipt() }], 'item_a', 'request-current');
}

describe('Test AI candidate decision cards (real component)', () => {
  it('renders an explicit empty state rather than a blank panel or an inferred zero-match result', () => {
    const html = cards([]);
    expect(html).toContain('No retained candidate rows were returned');
    expect(html).toContain('Source retrieval and review coverage are not inferred');
    expect(html).not.toContain('data-candidate-card');
  });
  it('keeps missing-image rows visible with two honest placeholders and no invented target item route', () => {
    const html = cards([{ title: 'Image missing', price: 10, currency: 'USD' }]);
    expect(html).toContain('Target image unavailable');
    expect(html).toContain('Candidate image unavailable');
    expect(html).toContain('Image missing');
    expect(html).not.toContain('/item/');
    expect(html).not.toContain('<img');
  });
  it('renders 80px side-by-side images and uses only the actual candidate listing URL', () => {
    const html = cards([{ title: 'Linked candidate', itemUrl: 'https://example.test/listing/123', imageUrl: 'https://example.test/candidate.jpg',
      metadataMatchRank: 2, metadataMatchScore: 87, price: 100, currency: 'CAD' }], { targetImageUrl: 'https://example.test/target.jpg' });
    expect((html.match(/<img /g) ?? []).length).toBe(2);
    expect(html).toContain('h-20 w-20');
    expect(html).toContain('href="https://example.test/listing/123"');
    expect(html).toContain('Rank #2'); expect(html).toContain('Score 87/100'); expect(html).toContain('CAD 100');
    expect(html).toContain('focus-visible:ring-2');
  });
  it('does not label an image match or valuation eligibility rejected or used before analysis', () => {
    const html = cards([{ title: 'Matched', evidenceDisposition: 'valuation_eligible', accepted: true, admissionCode: 'USED_DIRECT', visualExecution: receipt() }]);
    expect(html).toContain('VALUATION NOT RUN');
    expect(html).toContain('Image match recorded; final valuation analysis has not run');
    expect(html).not.toContain('USED IN VALUATION');
    expect(html).not.toContain('NOT ACCEPTED');
    expect(html).not.toContain('NOT USED — IDENTITY MISMATCH');
  });
  it('explains when a candidate was stopped before visual review for a low metadata score', () => {
    const decision = candidateFinalDecision({
      title: 'Barry Bonds Signed Baseball',
      metadataMatchScore: 60,
      evidenceDisposition: 'pre_vision_score_excluded',
      visualReviewRationale: 'Autographs metadata score 60/100 is below the visual-review minimum of 70.',
      candidatePricingLink: 'not_submitted',
    });
    expect(decision.label).toBe('NOT USED — SCORE TOO LOW');
    expect(decision.reason).toContain('metadata score was 60/100, below the required minimum of 70/100');
    expect(decision.reason).not.toContain('final valuation analysis');
  });
  it('puts the below-threshold score ahead of downstream provenance blockers', () => {
    const decision = candidateFinalDecision({
      title: 'Nirvana Nevermind Cassette Tape', metadataMatchScore: 50,
      evidenceDisposition: 'pre_vision_score_excluded',
      visualReviewRationale: 'Music metadata score 50/100 is below the visual-review minimum of 60.',
      candidatePricingLink: 'not_submitted',
      valuationUse: {
        sourceAdmission: { blockerCodes: ['PROVENANCE_UNVERIFIED', 'SOURCE_DISPOSITION_RESTRICTIVE'] },
        use: { code: 'REVIEW_REQUIRED', reasonCodes: ['PROVENANCE_UNVERIFIED', 'CATEGORY_REVIEW_REQUIRED'] },
      },
    });
    expect(decision.label).toBe('NOT USED — SCORE TOO LOW');
    expect(decision.reason).toBe('Not sent to visual review: metadata score was 50/100, below the required minimum of 60/100. Because visual review was not completed, this candidate could not proceed to valuation.');
    expect(decision.reason).not.toContain('provenance');
  });
  it('never fabricates mismatch or live processing from a legacy missing receipt', () => {
    const html = cards([{ title: 'Legacy', visualReviewStatus: 'mismatch', visualAudit: { initialModel: 'legacy' } }]);
    expect(html).toContain('NOT USED — REVIEW UNRESOLVED');
    expect(html).toContain('Execution provenance unavailable');
    expect(html).not.toContain('Image mismatch'); expect(html).not.toContain('active request');
  });
  it.each([
    ['error', 'provider_error', 'provider_request_failed', 'Provider request failed'],
    ['no_decision', 'no_usable_decision', 'empty_reviews', 'Reviews array empty'],
  ] as const)('keeps %s attempts unresolved with safe recorded failure labels', (outcome, reasonCode, failureCode, label) => {
    const html = cards([{ title: 'Failed review', visualReviewStatus: 'mismatch', visualExecution: receipt({
      state: 'dispatched_inconclusive', reasonCode, identity: { origin: 'none', result: 'not_established' },
      attempts: [{ ordinal: 1, stage: 'initial', format: 'json_schema', outcome, failureCode,
        errorCode: 'provider_error', ...({ rawResponse: 'SECRET_PROVIDER_BODY_AND_URL' } as Record<string, unknown>) }],
    }) }]);
    expect(html).toContain('NOT USED — REVIEW UNRESOLVED'); expect(html).toContain(label);
    expect(html).not.toContain('SECRET_PROVIDER_BODY_AND_URL'); expect(html).not.toContain('Image mismatch');
  });
  it('keeps rough and undispatched selected reviews unresolved, not completed or background processing', () => {
    const rough = cards([{ title: 'Rough', visualExecution: receipt({ identity: { origin: 'visual', result: 'manual_unknown', reviewVerdict: 'rough_match' } }) }]);
    expect(rough).toContain('NOT USED — REVIEW UNRESOLVED'); expect(rough).toContain('Rough / unconfirmed match');
    const selected = cards([{ title: 'Selected', visualExecution: receipt({ state: 'selected_pending', reasonCode: 'adaptive_match_target', attempts: [] }) }]);
    expect(selected).toContain('Not reviewed — selected but not dispatched'); expect(selected).toContain('Match target reached');
    expect(selected).not.toContain('active request'); expect(selected).not.toContain('Completed response');
  });
  it('shows actual hard-exclusion evidence rather than a generic identity/source conflict', () => {
    const html = cards([{ title: 'Excluded', evidenceReasons: ['Certification number differs: expected 123, observed 456'],
      visualExecution: receipt({ state: 'not_dispatched', reasonCode: 'declared_identity_conflict', hardExclusion: true,
        identity: { origin: 'deterministic', result: 'mismatch' }, attempts: [] }) }]);
    expect(html).toContain('NOT USED — HARD EXCLUSION'); expect(html).toContain('Certification number differs');
    expect(html).not.toContain('objective identity or source conflict'); expect(html).not.toContain('Image mismatch');
  });
  it('resolves primary use through the real provider and valid intake/outcome receipts', () => {
    const submitted = submittedRows(); const html = cards(submitted, { outcome: finalOutcome(submitted) });
    expect(html).toContain('USED IN VALUATION'); expect(html).toContain('Used to support primary sales valuation');
    expect(html).toContain('data-final-decision-code="CURRENT_SALES_PRIMARY"');
    expect(html).not.toContain('VALUATION NOT RUN');
  });
  it('does not attach old-run or other-side final approval', () => {
    const submitted = submittedRows(); const outcome = finalOutcome(submitted);
    const wrongSide = cards(submitted, { outcome, side: 'item_b' });
    expect(wrongSide).not.toContain('USED IN VALUATION'); expect(wrongSide).toContain('Item B');
    const old = copy(submitted); old[0].displayCorrelation.requestOccurrenceRef = 'old:item_a:intake:0';
    const stale = cards(old, { outcome });
    expect(stale).not.toContain('USED IN VALUATION'); expect(stale).toContain('NOT USED — NOT ASSESSED'); expect(stale).toContain('Not submitted / not assessed');
  });
  it('retains every independent candidate including identical titles, amounts and excluded rows', () => {
    const html = cards([{ title: 'Same', price: 100 }, { title: 'Same', price: 100 },
      { title: 'Hard held', evidenceDisposition: 'rejected_objective_conflict', evidenceReasons: ['Wrong platform'] }]);
    expect((html.match(/data-candidate-card="true"/g) ?? []).length).toBe(3);
    expect(html).toContain('ranked candidates (3)'); expect(html).toContain('Hard held');
  });
  it('places technical attempt detail inside a closed details element', () => {
    const html = cards([{ title: 'Matched', visualExecution: receipt() }]);
    expect(html).toMatch(/<details[^>]*><summary[^>]*>Technical details<\/summary>/);
    expect(html).not.toMatch(/<details[^>]*\sopen(?:=|\s|>)/);
    expect(html.indexOf('Technical details')).toBeLessThan(html.indexOf('Actual calls — execution diagnostics only'));
  });
});

describe('candidate final decision presentation (no filtering or pricing authority)', () => {
  it('respects authoritative Mercari sold mode instead of promoting contradictory row status into active classification', () => {
    const decision = candidateFinalDecision({ sourceId: 'mercari_sold_comps', requestedMode: 'sold', priceBasis: 'sold', visualExecution: receipt(), mercariObservation: { priceContext: 'active_asking' } });
    expect(decision.reason).toContain('Sold-mode Mercari listing');
    expect(decision.reason).not.toContain('Active asking-price');
    expect(decision.reason).toContain('No server-issued date-exception approval is attached');
    expect(decision.reason).not.toContain('final transaction amount and sale-event date are unverified');
  });
  it.each([
    ['OUTLIER_EXCLUDED', 'NOT USED — OUTLIER', 'Outlier excluded'],
    ['EXACT_DUPLICATE', 'NOT USED — EXACT DUPLICATE', 'Exact duplicate excluded'],
    ['OMITTED_BY_CAP', 'NOT USED — OMITTED BY CAP', 'Matched but omitted by cap'],
    ['CONTEXT_ONLY', 'NOT USED — CONTEXT ONLY', 'Context only'],
  ])('preserves the specific %s final code and reasonCodes', (code, label, reason) => {
    const result = candidateFinalDecision({ valuationUse: { use: { code, reasonCodes: ['HIGH_VALUE_PRICE_TOO_LOW', 'RECORDED_POLICY_REASON'] } } });
    expect(result.label).toBe(label); expect(result.reason).toContain(reason); expect(result.code).toBe(code);
    expect(result.reason).not.toContain('HIGH_VALUE_PRICE_TOO_LOW');
    expect(result.reason).not.toContain('RECORDED_POLICY_REASON');
  });
  it('explains an approved matching candidate that was not selected because current support is insufficient', () => {
    const result = candidateFinalDecision({
      valuationUse: {
        identityAdmission: { serverFinalApprovalVerified: true },
        sourceAdmission: { blockerCodes: [], reasonDetails: [] },
        use: { code: 'SOURCE_ELIGIBLE_NOT_SELECTED', reasonCodes: ['MERCARI_UNDATED_QUALIFIED_EXCEPTION', 'MERCARI_UNDATED_TIMING_UNVERIFIED', 'INSUFFICIENT_CURRENT_SUPPORT'] },
      },
    });
    expect(result.label).toBe('MATCH CONFIRMED — NOT USED IN VALUE');
    expect(result.reason).toContain('The item is a confirmed match');
    expect(result.reason).toContain('One qualifying sale is sufficient during sandbox testing');
    expect(result.reason).toContain('did not supply the specific reason');
    expect(result.reason).not.toContain('One matching sale by itself is not enough');
    expect(result.reason).not.toContain('no verified sale date');
    expect(result.reason).not.toContain('INSUFFICIENT_CURRENT_SUPPORT');
    expect(result.reason).not.toContain('MERCARI_UNDATED_TIMING_UNVERIFIED');
  });
  it('translates an eBay approval rejection into the actual investigation reason', () => {
    const result = candidateFinalDecision({
      sourceId: 'sold_comps',
      valuationUse: {
        sourceAdmission: {
          verification: 'verified',
          reportedDisposition: 'valuation_eligible',
          verifiedSourceDisposition: 'context_only',
          blockerCodes: ['SOURCE_DISPOSITION_RESTRICTIVE', 'REQUIRED_APPROVAL_MISSING'],
          reasonDetails: ['Final approval rejected: APPROVAL_IDENTITY_NOT_CONFIRMED: deciding visual evidence did not confirm identityMatches=true.'],
        },
        identityAdmission: { accepted: false },
        use: { code: 'REVIEW_REQUIRED', reasonCodes: ['SOURCE_DISPOSITION_RESTRICTIVE', 'REQUIRED_APPROVAL_MISSING'] },
      },
    });
    expect(result.label).toBe('NOT USED — REVIEW REQUIRED');
    expect(result.reason).toContain('The primary reason this candidate was stopped is:');
    expect(result.reason).toContain('the visual evidence did not confirm the candidate was the same product identity');
    expect(result.reason).not.toContain('The sale price was excluded from the valuation.');
    expect(result.reason).not.toContain('Not used in valuation.');
    expect(result.reason).not.toContain('server-final target/source/image-bound approval');
    expect(result.reason).not.toContain('APPROVAL_IDENTITY_NOT_CONFIRMED');
  });
  it('shows only the first actionable blocker instead of repeating downstream exclusions', () => {
    const result = candidateFinalDecision({
      sourceId: 'sold_comps',
      valuationUse: {
        sourceAdmission: {
          verification: 'verified',
          reportedDisposition: 'valuation_eligible',
          verifiedSourceDisposition: 'context_only',
          blockerCodes: ['SOURCE_DISPOSITION_RESTRICTIVE', 'INVALID_PRICE', 'INVALID_DATE'],
          reasonDetails: [
            'explicit stated grade conflicts with target grade 9.4',
            'server provenance reference is absent or signing is unavailable',
            'the source did not verify that this was a completed sale',
            'the sale date is missing, invalid, or future-dated',
          ],
        },
        identityAdmission: { accepted: false },
        use: { code: 'REVIEW_REQUIRED', reasonCodes: ['SOURCE_DISPOSITION_RESTRICTIVE', 'INVALID_PRICE', 'INVALID_DATE'] },
      },
    });
    expect(result.reason).toContain('explicit stated grade conflicts with target grade 9.4');
    expect(result.reason).not.toContain('server provenance reference is absent');
    expect(result.reason).not.toContain('completed sale');
    expect(result.reason).not.toContain('sale date');
    expect(result.reason).not.toContain('sale price was excluded');
  });
  it('uses explicit asking-price economics, never arbitrary title text, for active context', () => {
    const active = candidateFinalDecision({ title: 'Ordinary candidate', saleStatus: 'active', visualExecution: receipt() });
    expect(active.label).toBe('MATCH CONFIRMED — CURRENT MARKET CONTEXT'); expect(active.reason).toContain('current asking-price activity');
    const completed = candidateFinalDecision({ title: 'Active asking price in old title', saleStatus: 'completed', visualExecution: receipt() });
    expect(completed.reason).toContain('Image match recorded'); expect(completed.reason).not.toContain('Active asking-price context only');
  });
  it('labels a confirmed eBay Active match as current-market context instead of a post-visual failure', () => {
    const active = candidateFinalDecision({
      sourceId: 'ebay_active', saleStatus: 'active', priceBasis: 'asking', price: 19.99, currency: 'USD',
      visualExecution: receipt(), valuationUse: { use: { code: 'REVIEW_REQUIRED', reasonCodes: ['PROVENANCE_UNVERIFIED', 'NOT_COMPLETED', 'INVALID_DATE'] } },
    });
    expect(active.label).toBe('MATCH CONFIRMED — CURRENT MARKET CONTEXT');
    expect(active.reason).toContain('current asking-price activity at USD 19.99');
    expect(active.reason).toContain('not a completed sale');
    expect(active.reason).toContain('not used to set the primary sold-comps value');
    expect(active.reason).not.toContain('PROVENANCE_UNVERIFIED');
    expect(active.reason).not.toContain('INVALID_DATE');
  });
  it('keeps an undispatched price-bearing active listing visible as current-market context', () => {
    const active = candidateFinalDecision({
      sourceId: 'ebay_active', saleStatus: 'active', priceBasis: 'asking', price: 200, currency: 'USD',
      metadataMatchScore: 70, candidatePricingLink: 'not_submitted',
      visualExecution: { version: 1, state: 'completed', reasonCode: 'workflow_context_only', selectedForReview: false, attempts: [] },
    });
    expect(active.label).toBe('CURRENT MARKET CONTEXT — NOT VISUALLY REVIEWED');
    expect(active.reason).toContain('current asking-price activity at USD 200');
    expect(active.reason).toContain('not sent for image review');
    expect(active.reason).toContain('not used to set the primary sold-comps value');
  });
});
