import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./_core/llm', () => ({ invokeLLM: vi.fn() }));
import { invokeLLM } from './_core/llm';
import { buildVisualTargetMetadata, filterVisualSourceCandidates, moviesBoxSetVisualScore, moviesVisualInstruction, type VisualSourceReview } from './testAiVisualSourceFilter';

const model = vi.mocked(invokeLLM);
const screenshotTitle = 'Moonlighting: Seasons One and Two Used DVD 1985 TV Bruce Willis Free USA Ship';
const target = (patch: Record<string, unknown> = {}, top: Record<string, unknown> = {}) => buildVisualTargetMetadata({
  title: 'Moonlighting Season 1&2', category: 'movies', itemType: 'box_set',
  fullItemDetails: { boxSetName: 'Moonlighting Season 1&2', format: 'DVD', numberOfMovies: 2, sealed: 'no', ...patch }, ...top,
});
const candidate = (patch: Record<string, unknown> = {}) => ({ title: screenshotTitle, saleId: 'fixture-moonlighting',
  imageUrl: 'https://example.invalid/candidate.jpg', ...patch });
const run = (metadata = target(), item = candidate()) => filterVisualSourceCandidates({
  sourceRole: 'marketplace', sourceLabel: 'Fixture active listings', targetImageUrl: 'https://example.invalid/target.jpg',
  targetMetadata: metadata, listings: [item],
});
const difference = { field: 'packaging', targetObservation: 'Front cover shown with a clear outer edge and no prominent black case border.',
  candidateObservation: 'Front cover is inside a black plastic DVD keep case with a thick visible border.',
  impact: 'secondary presentation difference — does not block product identity' };
const response = (verdict: VisualSourceReview['verdict'] = 'match', patch: Partial<VisualSourceReview> = {}) => ({
  id: 'fixture', created: 0, model: 'fixture', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant',
    content: JSON.stringify({ reviews: [{ candidateIndex: 999, verdict, confidence: 'high',
      rationale: 'Both show the same Moonlighting Seasons One and Two DVD cover artwork; only ordinary case presentation differs.',
      visualEvidence: { identityMatches: true, artworkMatches: true, rawOrLooseVisible: true },
      visualDifferences: [difference], ...patch }] }) } }],
}) as Awaited<ReturnType<typeof invokeLLM>>;
const policyCount = (params: Parameters<typeof invokeLLM>[0]) => JSON.stringify(params.messages).split('MOVIES PRODUCT IDENTITY VS PRESENTATION').length - 1;
const allRows = (result: Awaited<ReturnType<typeof run>>) => [...result.listings, ...(result.contextListings ?? [])];
beforeEach(() => model.mockReset());
afterEach(() => vi.restoreAllMocks());

describe('Movies-specific product identity policy', () => {
  it.each(['individual_movie', 'box_set'])('targets only the supported Movies / %s item type', itemType => {
    const instruction = moviesVisualInstruction(buildVisualTargetMetadata({ title: 'Example', category: 'movies', itemType }));
    expect(instruction).toContain('MOVIES PRODUCT IDENTITY VS PRESENTATION');
    expect(instruction).toContain('return match even if these secondary details differ');
    expect(instruction).toContain('Do not downgrade to rough_match or unreadable');
    expect(instruction).toContain('black plastic keep-case border');
    expect(instruction).toContain('explicit target metadata');
    expect(instruction).toContain('graded-versus-ungraded');
    expect(instruction).toContain('ordinary retail case is not a grading slab');
    expect(instruction).toContain('number of seasons with number of discs or movies');
    expect(instruction).toContain('evidence establishing the difference');
  });
  it.each(['video_games', 'comics', 'vintage_toys', 'disney_pins', 'music', 'coins'])('does not change %s instructions', category => {
    expect(moviesVisualInstruction(buildVisualTargetMetadata({ title: 'Example', category, itemType: 'box_set' }))).toBe('');
  });
  it.each(['collection/lot', 'collection_lot', 'unknown'])('does not activate a new policy for Movies / %s', itemType => {
    expect(moviesVisualInstruction(buildVisualTargetMetadata({ title: 'Example', category: 'movies', itemType }))).toBe('');
  });

  it('delivers the policy to the actual initial call and retains an accepted similar-copy match with secondary observations and score 75', async () => {
    const before = moviesBoxSetVisualScore(candidate(), target());
    expect(before.score).toBe(75);
    model.mockResolvedValue(response());
    const result = await run();
    expect(model).toHaveBeenCalledTimes(1);
    expect(policyCount(model.mock.calls[0][0])).toBe(1);
    expect(model.mock.calls[0][0]).toMatchObject({ maxCompletionTokens: 1800, temperature: 0, response_format: { type: 'json_schema' } });
    expect(result.listings[0]).toMatchObject({ visualReviewStatus: 'match', metadataMatchScore: 75,
      visualDifferences: [difference], visualExecution: { identity: { result: 'match', origin: 'visual' } } });
    expect(moviesBoxSetVisualScore(candidate(), target())).toEqual(before);
  });

  it('retains specific rough uncertainty instead of promoting every rough response', async () => {
    model.mockResolvedValue(response('rough_match', { confidence: 'medium', rationale: 'Season designation is obscured; cannot confirm included seasons.' }));
    const result = await run();
    expect(model).toHaveBeenCalledTimes(1);
    expect(result.listings[0].visualReviewStatus).toBe('rough_match');
    expect(result.listings[0].visualExecution?.identity.result).not.toBe('match');
  });

  it('retains a genuinely observed different-content visual mismatch', async () => {
    model.mockResolvedValue(response('mismatch', { rationale: 'Target cover states Seasons One and Two; candidate cover states Season Three. Included seasons differ.',
      visualEvidence: { identityMatches: false, artworkMatches: false }, visualDifferences: [{ field: 'included seasons',
        targetObservation: 'Seasons One and Two', candidateObservation: 'Season Three', impact: 'different collection contents' }] }));
    const result = await run();
    expect(result.listings[0].visualReviewStatus).toBe('mismatch');
    expect(result.listings[0].visualExecution?.identity).toMatchObject({ result: 'mismatch', origin: 'visual' });
  });

  it('delivers the same policy during the existing ordinary gallery retry without adding calls', async () => {
    model.mockResolvedValueOnce(response('unreadable', { confidence: 'low', rationale: 'Season text is obscured and unreadable.' })).mockResolvedValueOnce(response());
    const result = await run(target(), candidate({ imageUrls: ['https://example.invalid/candidate.jpg', 'https://example.invalid/gallery.jpg'] }));
    expect(model).toHaveBeenCalledTimes(2);
    for (const [params] of model.mock.calls) expect(policyCount(params)).toBe(1);
    expect(JSON.stringify(model.mock.calls[1][0].messages)).toContain('HIGH-RESOLUTION ESCALATION');
    expect(result.listings[0].visualReviewStatus).toBe('match');
    expect(result.listings[0].visualAudit?.finalPass).toBe('high_resolution_retry');
  });

  it('delivers the policy to independent grading escalation while preserving slab and grade requirements', async () => {
    const metadata = target({ isGraded: 'yes' }, { grade: '9.8', certificationCompany: 'CGC' });
    const item = candidate({ title: 'Moonlighting Seasons One and Two DVD Used CGC 9.8' });
    model.mockResolvedValueOnce(response('mismatch', { rationale: 'Candidate appears raw without a grading label.', visualEvidence: { rawOrLooseVisible: true } }))
      .mockResolvedValueOnce(response('match', { rationale: 'Both clear CGC slabs show 9.8 and matching Moonlighting collection artwork.', visualEvidence: {
        slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true,
        rawOrLooseVisible: false, identityMatches: true, artworkMatches: true,
      } }));
    const result = await run(metadata, item);
    expect(model).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(model.mock.calls[1][0].messages)).toContain('INDEPENDENT HIGH-RESOLUTION GRADING ADJUDICATION');
    for (const [params] of model.mock.calls) expect(policyCount(params)).toBe(1);
    expect(result.listings[0].visualReviewStatus).toBe('match');
  });

  it.each([
    ['wrong format', {}, { title: 'Moonlighting Seasons One and Two Used VHS' }],
    ['sealed versus opened', { sealed: 'yes' }, {}],
    ['graded versus raw', { isGraded: 'yes' }, { title: 'Moonlighting Seasons One and Two DVD Used raw ungraded' }],
    ['empty case', {}, { title: 'Moonlighting Seasons One and Two DVD empty case only no discs' }],
  ] as const)('preserves pre-vision hard protection for %s', async (_label, details, patch) => {
    model.mockRejectedValue(new Error('A hard hold must not invoke the model'));
    const result = await run(target(details), candidate(patch));
    expect(model).not.toHaveBeenCalled();
    expect(allRows(result)[0].visualExecution?.state).toBe('not_dispatched');
    expect(allRows(result)[0].visualReviewStatus).not.toBe('match');
  });
});
