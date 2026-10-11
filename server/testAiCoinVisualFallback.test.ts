import { describe, expect, it, vi } from 'vitest';
import {
  buildCoinVisualFallbackPrompt,
  parseCoinVisualCandidate,
  recoverNumistaWithVisualFallback,
  resolveCoinVisualFallback,
  shouldAttemptCoinVisualFallback,
  visualFallbackNotNeededReport,
} from './testAiCoinVisualFallback';

const candidate = {
  country: 'Mexico',
  denomination: '1 Peso',
  year: '1982',
  mintMark: 'Mexican Mint',
  variety: 'José María Morelos',
  metal: 'Stainless steel',
  objectType: 'circulation',
  visibleIdentifiers: ['1982', '1 Peso', 'MEXICO'],
  conflictsWithStructuredData: [],
  missingEvidence: [],
  confidence: 'high',
};

function visualResponse(value: unknown) {
  return vi.fn().mockResolvedValue({
    choices: [{ message: { content: JSON.stringify(value) } }],
  });
}

describe('Numista visual identity fallback', () => {
  it('documents the United States denomination convention and candidate-only boundaries', () => {
    const prompt = buildCoinVisualFallbackPrompt({
      title: '1945 Walking Liberty',
      itemDetails: JSON.stringify({ country: 'United States', denomination: '0.10' }),
    });

    expect(prompt).toContain('"1" means 1 Dollar');
    expect(prompt).toContain('".10" or "0.10" means 1 Dime');
    expect(prompt).toContain('a bare numeric denomination such as "1" is ambiguous');
    expect(prompt).toContain('may clarify it');
    expect(prompt).toContain('Numista must confirm every candidate');
    expect(prompt).toContain('Do not appraise');
  });

  it('normalizes only the supported structured response shape', () => {
    expect(parseCoinVisualCandidate(JSON.stringify(candidate))).toMatchObject({
      country: 'Mexico', denomination: '1 Peso', year: '1982', confidence: 'high',
    });
    expect(parseCoinVisualCandidate('{not JSON}')).toBeNull();
    expect(parseCoinVisualCandidate(JSON.stringify({ ...candidate, year: '184' }))?.year).toBe('');
  });

  it('uses high-confidence visible evidence to clarify an ambiguous non-US numeric denomination only for one retry', async () => {
    const llm = visualResponse(candidate);
    const result = await resolveCoinVisualFallback({
      title: '1982 Mexican coin',
      itemDetails: JSON.stringify({ country: 'Mexico', denomination: '1', year: '1982', mintMark: 'Mexican Mint' }),
      imageUrl: 'https://example.com/mexico-coin.jpg',
    }, llm as any);

    expect(result.report).toMatchObject({
      status: 'candidate_ready',
      appliedFields: ['Variety / series', 'Metal / composition', 'Object type'],
      replacedAmbiguousFields: ['Denomination'],
    });
    const details = JSON.parse(result.itemDetails ?? '{}');
    expect(details).toMatchObject({ country: 'Mexico', denomination: '1 Peso', year: '1982', mintMark: 'Mexican Mint' });
    expect(llm).toHaveBeenCalledOnce();
  });

  it('uses the verified image-first provider and retries a blank structured response once', async () => {
    const blankCandidate = {
      ...candidate,
      country: '', denomination: '', year: '', mintMark: '', variety: '', metal: '',
      visibleIdentifiers: [], confidence: 'low',
    };
    const llm = vi.fn()
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(blankCandidate) } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(candidate) } }] });

    const result = await resolveCoinVisualFallback({
      title: '1982 Mexican coin',
      itemDetails: JSON.stringify({ country: 'Mexico', denomination: '1', year: '1982' }),
      imageUrl: 'https://example.com/mexico-coin.jpg',
    }, llm as any);

    expect(result.report.status).toBe('candidate_ready');
    expect(llm).toHaveBeenCalledTimes(2);
    expect(llm.mock.calls[0][0]).toMatchObject({ model: 'gemini-3-flash-preview', maxTokens: 1300 });
    expect(llm.mock.calls[1][0]).toMatchObject({ model: 'gpt-5-mini', response_format: { type: 'json_object' }, reasoning: { effort: 'minimal' } });
  });

  it('distinguishes an unusable provider response from an unavailable provider', async () => {
    const blankCandidate = {
      ...candidate,
      country: '', denomination: '', year: '', mintMark: '', variety: '', metal: '',
      visibleIdentifiers: [], confidence: 'low',
    };
    const llm = vi.fn().mockResolvedValue({ choices: [{ message: { content: JSON.stringify(blankCandidate) } }] });

    const result = await resolveCoinVisualFallback({
      title: '1982 Mexican coin', itemDetails: '{}', imageUrl: 'https://example.com/mexico-coin.jpg',
    }, llm as any);

    expect(result.report.status).toBe('provider_response_unusable');
    expect(result.report.message).toContain('responded');
    expect(llm).toHaveBeenCalledTimes(2);
  });

  it('never overwrites a clear United States face value with an image candidate', async () => {
    const llm = visualResponse({ ...candidate, country: 'United States', denomination: '1 Dime', year: '1890', visibleIdentifiers: ['1890', 'DIME'] });
    const result = await resolveCoinVisualFallback({
      title: '1890 Morgan Dollar',
      itemDetails: JSON.stringify({ country: 'United States', denomination: '1', year: '1890' }),
      imageUrl: 'https://example.com/morgan.jpg',
    }, llm as any);

    expect(result.report.status).toBe('candidate_ready');
    expect(result.report.preservedFields).toEqual(expect.arrayContaining(['Country / issuer', 'Denomination', 'Year']));
    const details = JSON.parse(result.itemDetails ?? '{}');
    expect(details.denomination).toBe('1');
  });

  it('stops automatic retry when visual evidence conflicts with supplied metadata', async () => {
    const llm = visualResponse({ ...candidate, conflictsWithStructuredData: ['Visible denomination appears to be 1 Peso while listing says 5 Pesos'] });
    const result = await resolveCoinVisualFallback({
      title: '1982 Mexico coin',
      itemDetails: JSON.stringify({ country: 'Mexico', denomination: '5 Peso', year: '1982' }),
      imageUrl: 'https://example.com/conflict.jpg',
    }, llm as any);

    expect(result.report.status).toBe('manual_review_required');
    expect(result.itemDetails).toBeUndefined();
    expect(result.report.message).toContain('No listing field was overwritten');
  });

  it('does not call vision without a safe HTTPS image and only triggers for unresolved Numista outcomes', async () => {
    const llm = vi.fn();
    const result = await resolveCoinVisualFallback({ title: 'Coin', itemDetails: '{}' }, llm as any);

    expect(result.report.status).toBe('image_unavailable');
    expect(llm).not.toHaveBeenCalled();
    expect(shouldAttemptCoinVisualFallback({ status: 'not_found' })).toBe(true);
    expect(shouldAttemptCoinVisualFallback({ status: 'error', message: 'Enter structured coin fields such as country' })).toBe(true);
    expect(shouldAttemptCoinVisualFallback({ status: 'error', message: 'Numista authorization failed.' })).toBe(false);
    expect(shouldAttemptCoinVisualFallback({ status: 'success' })).toBe(false);
    expect(visualFallbackNotNeededReport().status).toBe('not_needed');
  });

  it('marks a visual candidate as confirmed only after the separate Numista retry succeeds', async () => {
    const lookup = vi.fn()
      .mockResolvedValueOnce({ status: 'not_found', message: 'Numista returned no matching coin catalogue types for the structured request.' })
      .mockResolvedValueOnce({
        status: 'success',
        data: {
          id: 1105,
          title: '1 Peso',
          sourceUrl: 'https://en.numista.com/catalogue/pieces1105.html',
          imageUrl: null,
          query: 'Mexico 1 Peso · year=1982',
          matchNote: 'Structured-field Numista catalogue match.',
          facts: [],
        },
      });
    const resolveFallback = vi.fn().mockResolvedValue({
      report: { status: 'candidate_ready', trigger: 'test', message: 'test', candidate, appliedFields: ['Denomination'], preservedFields: [], replacedAmbiguousFields: ['Denomination'], missingRequiredFields: [] },
      itemDetails: JSON.stringify({ country: 'Mexico', denomination: '1 Peso', year: '1982' }),
    });

    const result = await recoverNumistaWithVisualFallback({
      category: 'coins', title: '1982 Mexican coin', itemDetails: JSON.stringify({ country: 'Mexico', denomination: '1', year: '1982' }), imageUrl: 'https://example.com/mexico.jpg',
    }, lookup, resolveFallback);

    expect(lookup).toHaveBeenCalledTimes(2);
    expect(lookup.mock.calls[1][0].itemDetails).toContain('1 Peso');
    expect(result.visualFallback.status).toBe('confirmed_by_numista');
    expect(result.data?.matchNote).toContain('Numista confirmed');
    expect(result.data?.guideValue).toBeUndefined();
  });

  it('does not return a value when Numista cannot confirm the visual candidate', async () => {
    const lookup = vi.fn()
      .mockResolvedValueOnce({ status: 'not_found', message: 'No structured result.' })
      .mockResolvedValueOnce({ status: 'not_found', message: 'No candidate result.' });
    const resolveFallback = vi.fn().mockResolvedValue({
      report: { status: 'candidate_ready', trigger: 'test', message: 'test', candidate, appliedFields: ['Denomination'], preservedFields: [], replacedAmbiguousFields: ['Denomination'], missingRequiredFields: [] },
      itemDetails: JSON.stringify({ country: 'Mexico', denomination: '1 Peso', year: '1982' }),
    });

    const result = await recoverNumistaWithVisualFallback({ category: 'coins', imageUrl: 'https://example.com/mexico.jpg' }, lookup, resolveFallback);

    expect(result.status).toBe('not_found');
    expect(result.data).toBeUndefined();
    expect(result.visualFallback.status).toBe('candidate_not_confirmed');
    expect(result.visualFallback.message).toContain('not used for a value');
  });
});
