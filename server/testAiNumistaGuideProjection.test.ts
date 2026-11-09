import { describe, expect, it, vi } from 'vitest';
import { lookupNumistaCoin } from './numistaMetadata';
import { numistaCoinGuideQuote } from './testAiGuideEvidence';
import { guideAnchorFields, normalizeTestAiEvidence } from '../shared/testAiEvidenceNormalization';
import { buildAnalysisSnapshot } from './testAiAnalysisSnapshot';

const target = { title: '1903 Morgan Dollar', category: 'coins', grade: 'MS65', certificationCompany: 'PCGS', itemType: 'single_coin',
  itemDetails: JSON.stringify({ country: 'United States', denomination: '$1', year: '1903', mintMark: '', variety: 'Morgan Dollar' }) };
const env = { NUMISTA_API_KEY: 'synthetic-projection-key', NUMISTA_CLIENT_ID: 'synthetic-client', NUMISTA_CLIENT_NAME: 'synthetic-test' };
const options = { now: new Date('2026-11-09T01:00:00Z'), signingKey: 'synthetic-projection-signing-key' };
function fakeFetch(issues: Array<{ id: number; year: number; mint_letter?: string }>) {
  const detail = { id: 12, title: '1903 Morgan Dollar', object_type: { name: 'Coin' }, issuer: { name: 'United States' },
    min_year: 1903, max_year: 1903, value: { text: '1 Dollar' } };
  return vi.fn()
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ access_token: 'synthetic-token' }) })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ types: [detail] }) })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => detail })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => issues })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ currency: 'USD', prices: [{ grade: 'UNC', price: 430 }] }) });
}

describe('actual Numista selected-issue projection with synthetic HTTP only', () => {
  it('preserves existing first-issue acquisition but rejects S issue fallback for a blank-mint target', async () => {
    const fetchMock = fakeFetch([{ id: 34, year: 1903, mint_letter: 'S' }, { id: 35, year: 1903, mint_letter: '' }]);
    const result = await lookupNumistaCoin(target, fetchMock as typeof fetch, env);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(result.data).toMatchObject({ guideIssueId: 34, guideIssueYear: 1903, guideIssueMintMark: 'S', guideValue: 430 });
    expect(numistaCoinGuideQuote(result, target, options).guideAnchor).toBeNull();
  });

  it('accepts explicitly known unmarked issue facts through the actual normalizer and pricing snapshot', async () => {
    const fetchMock = fakeFetch([{ id: 35, year: 1903, mint_letter: '' }]);
    const result = await lookupNumistaCoin(target, fetchMock as typeof fetch, env);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(result.data).toMatchObject({ guideIssueId: 35, guideIssueYear: 1903, guideIssueMintMark: '' });
    const quote = numistaCoinGuideQuote(result, target, options);
    expect(quote.guideWarnings).toEqual([]);
    const summary = normalizeTestAiEvidence(target, [{ id: 'numista', label: 'Numista Coin Catalog', kind: 'reference', status: 'success', fields: guideAnchorFields(quote.guideAnchor) }]);
    const snapshot = buildAnalysisSnapshot({ target, now: options.now, evidenceSummary: summary }, options);
    expect(snapshot.profile.primaryValue).toBe(430);
    expect(snapshot.profile.valuationBasis).toBe('guide_fallback');
    expect(snapshot.profile.authoritativeSaleCount).toBe(0);
  });

  it('preserves missing selected-issue mint as unknown, never inferring an unmarked issue from a broad title', async () => {
    const result = await lookupNumistaCoin(target, fakeFetch([{ id: 35, year: 1903 }]) as typeof fetch, env);
    expect(result.data?.guideIssueMintMark).toBeNull();
    expect(numistaCoinGuideQuote(result, target, options).guideAnchor).toBeNull();
  });
});
