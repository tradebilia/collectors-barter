import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TestAiCandidateStatus, TestAiExecutionSummary } from '../client/src/components/TestAiCandidateStatus';
import { candidateExecutionFact, candidateIdentityFact, hasActualVisualResponse, visualExecutionFailureLabels } from '../shared/testAiCandidateStatus';
import { diagnoseVisualResponse, sanitizeVisualExecutionAttemptDiagnostics } from '../shared/testAiVisualFailure';
import type { VisualExecution, VisualExecutionAttempt, VisualExecutionFailureCode } from '../shared/testAiVisualExecution';
import { parseAnalyzerResponse } from './testAiResponse';

const attempt = (patch: Partial<VisualExecutionAttempt> = {}): VisualExecutionAttempt => ({
  ordinal: 1, stage: 'initial', format: 'json_schema', outcome: 'no_decision', ...patch,
});
const receipt = (attempts: VisualExecutionAttempt[], patch: Partial<VisualExecution> = {}): VisualExecution => ({
  version: 1, state: 'dispatched_inconclusive', reasonCode: 'no_usable_decision',
  selectedForReview: true, hardExclusion: false, identity: { result: 'not_established', origin: 'none' }, attempts, ...patch,
});
const render = (visualExecution: VisualExecution) => renderToStaticMarkup(<TestAiCandidateStatus listing={{ visualExecution }} reconciled />);
const review = { candidateIndex: 0, verdict: 'match', confidence: 'high', rationale: 'Recorded visual evidence.' };
function diagnostic(content: string, options: {
  finishReason?: unknown; refusal?: unknown; normalizedReviewCount?: number; expectedCandidateIndex?: number; listingCount?: number;
} = {}) {
  return diagnoseVisualResponse({
    response: { choices: [{ finish_reason: options.finishReason, message: { content, ...(options.refusal !== undefined ? { refusal: options.refusal } : {}) } }] },
    content, parsedPayload: parseAnalyzerResponse(content), normalizedReviewCount: options.normalizedReviewCount ?? 0,
    listingCount: options.listingCount ?? 1, expectedCandidateIndex: options.expectedCandidateIndex ?? 0,
  });
}

describe('visual failure transparency: pure diagnostics and safe visible status', () => {
  it.each(Object.keys(visualExecutionFailureLabels) as VisualExecutionFailureCode[])('renders fixed safe detail for %s without inventing a usable response', (failureCode) => {
    const execution = receipt([attempt({ failureCode })]);
    const html = render(execution);
    expect(html).toContain(`data-visual-failure-code="${failureCode}"`);
    expect(html).toContain(visualExecutionFailureLabels[failureCode]);
    expect(html).toContain('Actual calls — execution diagnostics only');
    expect(html).toContain('Attempt 1');
    expect(html).not.toContain('<details');
    expect(html).not.toContain('Image match');
    expect(html).not.toContain('Completed response');
    expect(hasActualVisualResponse({ visualExecution: execution })).toBe(false);
  });

  it('distinguishes legacy absent detail from unknown diagnostic without guessing schema failure', () => {
    const legacy = render(receipt([attempt()]));
    expect(legacy).toContain('Legacy detail not recorded');
    expect(legacy).not.toContain('Invalid JSON');
    expect(legacy).not.toContain('Reviews field missing');
    const unknown = render(receipt([attempt({ failureCode: 'future_failure' as VisualExecutionFailureCode })]));
    expect(unknown).toContain('Failure reason not recorded');
    expect(unknown).toContain('data-visual-failure-code="reason_not_recorded"');
    expect(unknown).not.toContain('future_failure');
  });

  it('shows timeout and provider request failure as recorded, without copying exception text', () => {
    const timeout = render(receipt([attempt({ outcome: 'timed_out', errorCode: 'candidate_timeout', failureCode: 'candidate_timeout' })],
      { state: 'timed_out', reasonCode: 'candidate_timeout' }));
    expect(timeout).toContain('Timed out — no usable response');
    expect(timeout).toContain('Candidate call timed out');
    const provider = render(receipt([attempt({ outcome: 'error', errorCode: 'provider_error', failureCode: 'provider_request_failed' })], { reasonCode: 'provider_error' }));
    expect(provider).toContain('Provider request failed');
    expect(provider).not.toContain('Invalid JSON');
  });

  it('does not call an observed empty response a provider-request failure even when the legacy outcome is error', () => {
    const html = render(receipt([attempt({ outcome: 'error', errorCode: 'provider_error', failureCode: 'empty_content' })], { reasonCode: 'provider_error' }));
    expect(html).toContain('Dispatched — Empty response content');
    expect(html).not.toContain('Provider failure — dispatched');
    expect(html).not.toContain('Provider request failed');
  });

  it.each(['no_decision', 'error', 'timed_out'] as const)('retains initial match and visibly preserves failed %s retry', (outcome) => {
    const execution = receipt([attempt({ outcome: 'usable_review' }), attempt({ ordinal: 2, stage: 'high_resolution_retry', format: 'json_object', outcome,
      failureCode: outcome === 'timed_out' ? 'candidate_timeout' : outcome === 'error' ? 'provider_request_failed' : 'invalid_json' })],
    { identity: { origin: 'visual', result: 'match', reviewVerdict: 'match' } });
    const row = { visualExecution: execution };
    const html = render(execution);
    expect(html).toContain('Response retained; retry');
    expect(html).toContain('Image match');
    expect(html).toContain('Attempt 1');
    expect(html).toContain('Usable review returned');
    expect(html).toContain('Attempt 2');
    expect(html).toContain('High-resolution retry');
    expect(candidateIdentityFact(row).label).toBe('Image match');
    expect(hasActualVisualResponse(row)).toBe(true);
    expect(execution.attempts[0].outcome).toBe('usable_review');
  });

  it('retains recovered usable fallback and all failed initial / retry / third attempts', () => {
    const execution = receipt([
      attempt({ outcome: 'error', failureCode: 'provider_request_failed' }),
      attempt({ ordinal: 2, format: 'json_object', outcome: 'usable_review' }),
      attempt({ ordinal: 3, stage: 'high_resolution_retry', outcome: 'timed_out', failureCode: 'candidate_timeout' }),
      attempt({ ordinal: 4, stage: 'disney_third_confirmation', format: 'json_object', failureCode: 'empty_reviews' }),
    ]);
    const html = render(execution);
    expect(html).toContain('Response retained; retry failed');
    expect(html).toContain('Provider request failed');
    expect(html).toContain('Usable review returned');
    expect(html).toContain('Candidate call timed out');
    expect(html).toContain('Disney third confirmation');
    expect(html).toContain('Reviews array empty');
    expect(html).not.toContain('Image match');
    const recovered = { visualExecution: receipt(execution.attempts.slice(0, 2), { state: 'completed', reasonCode: 'review_returned' }) };
    expect(candidateExecutionFact(recovered).label).toBe('Completed response — recovered failed attempt');
  });

  it('does not fabricate identity from a failed response or count failed attempts as matches', () => {
    const row = { visualReviewStatus: 'match', visualReviewRationale: 'Legacy claimed match', visualExecution: receipt([attempt({ failureCode: 'invalid_verdict' })]) };
    const html = renderToStaticMarkup(<><TestAiCandidateStatus listing={row} reconciled /><TestAiExecutionSummary rows={[row]} sourceLabel="Fixture" /></>);
    expect(html).toContain('Not image reviewed');
    expect(html).toContain('0 usable responses');
    expect(html).toContain('0 image matches');
    expect(html).not.toContain('Identity result:</strong> Image match');
  });

  it('drops raw provider content, errors, image URLs and malicious enum values from diagnostic DOM and attributes', () => {
    const secret = 'sk-private-demo-secret';
    const rawAttempt = { ...attempt({ outcome: 'error' }), failureCode: secret, finishReason: secret, refusal: secret, candidateBinding: secret,
      stage: secret, format: secret, errorCode: secret, errorMessage: `Bearer ${secret}`, providerBody: secret,
      imageUrl: `https://private.test/image?api_key=${secret}` } as unknown as VisualExecutionAttempt;
    const execution = receipt([rawAttempt], { reasonCode: secret as VisualExecution['reasonCode'] });
    const html = render(execution);
    expect(html).toContain('Failure reason not recorded');
    expect(html).not.toContain(secret);
    expect(html).not.toContain('Bearer');
    expect(html).not.toContain('private.test');
    expect(sanitizeVisualExecutionAttemptDiagnostics(rawAttempt)).toEqual({});
    const safe = sanitizeVisualExecutionAttemptDiagnostics({ failureCode: 'invalid_json', finishReason: 'length', refusal: 'present', candidateBinding: 'rebound_to_request', providerBody: secret });
    expect(safe).toEqual({ failureCode: 'invalid_json', finishReason: 'length', refusal: 'present', candidateBinding: 'rebound_to_request' });
  });

  it.each([
    ['', 'empty_content'], ['not JSON', 'invalid_json'], ['[]', 'invalid_response_shape'], ['null', 'invalid_response_shape'],
    ['{}', 'missing_reviews'], ['{"reviews":{}}', 'invalid_reviews'], ['{"reviews":[]}', 'empty_reviews'],
    [JSON.stringify({ reviews: [{ ...review, verdict: 'maybe' }] }), 'invalid_verdict'],
    [JSON.stringify({ reviews: [{ ...review, confidence: 'certain' }] }), 'invalid_confidence'],
    [JSON.stringify({ reviews: [{ ...review, rationale: '' }] }), 'missing_rationale'],
  ] as const)('observes %s as %s only after no normalized review', (content, failureCode) => {
    expect(diagnostic(content).failureCode).toBe(failureCode);
  });

  it('records refusal presence and output-limit finish reason as enums, never refusal text', () => {
    const secret = 'sk-refusal-secret';
    const refused = diagnostic('', { refusal: `Cannot comply ${secret}`, finishReason: 'stop' });
    expect(refused).toMatchObject({ failureCode: 'provider_refusal', refusal: 'present', finishReason: 'stop' });
    expect(JSON.stringify(refused)).not.toContain(secret);
    expect(diagnostic('{"reviews":', { finishReason: 'length' })).toMatchObject({ failureCode: 'response_truncated', finishReason: 'length' });
    expect(diagnostic('', { finishReason: secret })).toMatchObject({ failureCode: 'empty_content', finishReason: 'other', refusal: 'not_recorded' });
    const html = render(receipt([attempt({ failureCode: 'response_truncated', finishReason: 'length', refusal: 'not_recorded' })]));
    expect(html).toContain('Finish: output limit reached');
    expect(html).not.toContain(secret);
  });

  it('does not reject repaired JSON, rebound indexes, or compact fallback reviews already accepted by normalizers', () => {
    const rebound = diagnostic(JSON.stringify({ reviews: [{ ...review, candidateIndex: 999 }] }), { normalizedReviewCount: 1, finishReason: 'length', refusal: 'Provider text' });
    expect(rebound.failureCode).toBeUndefined();
    expect(rebound.candidateBinding).toBe('rebound_to_request');
    const repaired = diagnostic('```json\n{"reviews":[{"candidateIndex":0,"verdict":"match","confidence":"high","rationale":"Evidence",}],}\n```', { normalizedReviewCount: 1 });
    expect(repaired.failureCode).toBeUndefined();
    expect(repaired.candidateBinding).toBe('bound_to_request');
    expect(diagnostic('{"visualEvidence":{"identityMatches":true}}', { normalizedReviewCount: 1 }).failureCode).toBeUndefined();
  });

  it('uses binding failure only for invalid actual dispatch binding and keeps ambiguous rejections unknown', () => {
    expect(diagnostic(JSON.stringify({ reviews: [{ ...review, candidateIndex: 999 }] }), { expectedCandidateIndex: 2, listingCount: 1 }).failureCode).toBe('invalid_candidate_binding');
    expect(diagnostic(JSON.stringify({ reviews: [{ ...review, candidateIndex: 999 }] })).failureCode).toBe('reason_not_recorded');
    const mixed = { reviews: [{ ...review, verdict: 'unknown' }, { ...review, confidence: 'unknown' }] };
    expect(diagnostic(JSON.stringify(mixed)).failureCode).toBe('reason_not_recorded');
  });
});
