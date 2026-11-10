import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./_core/llm', () => ({ invokeLLM: vi.fn() }));
import { invokeLLM } from './_core/llm';
import { filterVisualSourceCandidates } from './testAiVisualSourceFilter';
import { boundedDiagnosticVisualExecution } from '../shared/testAiValuationUse';

const model = vi.mocked(invokeLLM);
const review = { candidateIndex: 999, verdict: 'match', confidence: 'high', rationale: 'Item identity is consistent.' };
const reply = (content: string, finish_reason = 'stop', refusal?: string) => ({ id: 'fixture', created: 0, model: 'fixture',
  choices: [{ index: 0, finish_reason, message: { role: 'assistant', content, ...(refusal ? { refusal } : {}) } }] }) as Awaited<ReturnType<typeof invokeLLM>>;
const run = () => filterVisualSourceCandidates({ sourceRole: 'marketplace', sourceLabel: 'Fixture active listings',
  targetImageUrl: 'https://example.invalid/target.jpg', targetMetadata: 'title=Example collectible; category=other',
  listings: [{ title: 'Example collectible', saleId: 'fixture-one', imageUrl: 'https://example.invalid/candidate.jpg' }] });
beforeEach(() => model.mockReset());
afterEach(() => vi.restoreAllMocks());

describe('actual visual execution producer diagnostics', () => {
  it.each([
    ['not JSON', 'invalid_json'], ['[]', 'invalid_response_shape'], ['{}', 'missing_reviews'],
    ['{"reviews":{}}', 'invalid_reviews'], ['{"reviews":[]}', 'empty_reviews'],
    [JSON.stringify({ reviews: [{ ...review, verdict: 'maybe' }] }), 'invalid_verdict'],
    [JSON.stringify({ reviews: [{ ...review, confidence: 'certain' }] }), 'invalid_confidence'],
    [JSON.stringify({ reviews: [{ ...review, rationale: '' }] }), 'missing_rationale'],
  ])('records %s as %s without additional calls or manufactured match', async (content, code) => {
    model.mockResolvedValue(reply(content));
    const result = await run();
    expect(model).toHaveBeenCalledTimes(1);
    expect(result.listings[0].visualExecution?.attempts[0]).toMatchObject({ outcome: 'no_decision', failureCode: code, finishReason: 'stop' });
    expect(result.visualExecutionCounts?.responseReviewedCandidateCount).toBe(0);
    expect(result.listings[0].visualExecution?.identity.result).not.toBe('match');
    expect(result.listings[0].visualReviewStatus).not.toBe('match');
  });
  it('records two observed empty replies at their actual existing attempts', async () => {
    model.mockResolvedValue(reply(''));
    const result = await run();
    expect(model).toHaveBeenCalledTimes(2);
    expect(result.listings[0].visualExecution?.attempts.map(a => [a.format, a.outcome, a.failureCode])).toEqual([
      ['json_schema', 'no_decision', 'empty_content'], ['json_object', 'no_decision', 'empty_content'],
    ]);
  });
  it('retains empty initial detail when existing object fallback recovers a rebound match', async () => {
    model.mockResolvedValueOnce(reply('')).mockResolvedValueOnce(reply(JSON.stringify({ reviews: [review] })));
    const result = await run();
    expect(model).toHaveBeenCalledTimes(2);
    const attempts = result.listings[0].visualExecution!.attempts;
    expect(attempts[0]).toMatchObject({ outcome: 'no_decision', failureCode: 'empty_content' });
    expect(attempts[1]).toMatchObject({ outcome: 'usable_review', candidateBinding: 'rebound_to_request' });
    expect(attempts[1].failureCode).toBeUndefined();
    expect(result.listings[0].visualExecution?.identity.result).toBe('match');
  });
  it.each([['', 'stop', 'provider_refusal'], ['{"reviews":', 'length', 'response_truncated']])('records refused/truncated response without exporting provider text', async (content, finish, code) => {
    model.mockResolvedValue(reply(content, finish, code === 'provider_refusal' ? 'Private refusal detail fixture' : undefined));
    const result = await run();
    expect(result.listings[0].visualExecution?.attempts.every(a => a.failureCode === code)).toBe(true);
    expect(JSON.stringify(result.listings[0].visualExecution)).not.toContain('Private refusal detail');
  });
  it('keeps accepted parser-repaired JSON and stale model index accepted even with length metadata', async () => {
    const content = JSON.stringify({ reviews: [review] }).replace('}]}', '},],}');
    model.mockResolvedValue(reply(content, 'length'));
    const result = await run();
    expect(model).toHaveBeenCalledTimes(1);
    expect(result.listings[0].visualExecution?.attempts[0]).toMatchObject({ outcome: 'usable_review', finishReason: 'length', candidateBinding: 'rebound_to_request' });
    expect(result.listings[0].visualExecution?.attempts[0].failureCode).toBeUndefined();
    expect(result.listings[0].visualReviewStatus).toBe('match');
  });
  it('classifies actual provider throw without copying exception text or guessing timeout', async () => {
    model.mockRejectedValue(new Error('timeout private provider detail fixture'));
    const result = await run();
    expect(model).toHaveBeenCalledTimes(2);
    expect(result.listings[0].visualExecution?.attempts.every(a => a.failureCode === 'provider_request_failed' && a.outcome === 'error')).toBe(true);
    expect(JSON.stringify(result.listings[0].visualExecution)).not.toContain('private provider detail');
    expect(result.visualExecutionCounts?.timedOutCandidateCount).toBe(0);
  });
  it('preserves allowlisted details but drops unknown enums and raw extra data in final transport', async () => {
    model.mockResolvedValue(reply('not JSON'));
    const result = await run();
    const receipt = result.listings[0].visualExecution!;
    const bounded = boundedDiagnosticVisualExecution({ ...receipt, attempts: receipt.attempts.map(a => ({ ...a, providerBody: 'private', errorMessage: 'private' })) });
    expect(bounded?.attempts[0]).toMatchObject({ failureCode: 'invalid_json', finishReason: 'stop', refusal: 'not_recorded' });
    expect(JSON.stringify(bounded)).not.toContain('private');
    const unknown = boundedDiagnosticVisualExecution({ ...receipt, attempts: receipt.attempts.map(a => ({ ...a, failureCode: 'future', finishReason: 'future' })) });
    expect(unknown?.attempts[0].failureCode).toBeUndefined();
    expect(unknown?.attempts[0].finishReason).toBeUndefined();
  });
});
