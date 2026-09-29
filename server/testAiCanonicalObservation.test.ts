import { describe, expect, it } from 'vitest';
import { sealCanonicalObservation, verifyCanonicalObservation } from './testAiCanonicalObservation';

const signingKey = 'canonical-observation-test-key';
const acquiredAt = new Date('2026-09-28T12:00:00.000Z');

function completedSale(overrides: Record<string, unknown> = {}) {
  return {
    title: '1996 Topps Kobe Bryant #138 PSA 10',
    price: 1000,
    currency: 'USD',
    date: '2026-09-02T00:00:00.000Z',
    sourceId: 'sold_comps',
    saleId: 'ebay-123',
    url: 'https://www.ebay.com/itm/123?utm_source=test',
    saleStatus: 'completed' as const,
    priceBasis: 'sold' as const,
    ...overrides,
  };
}

describe('canonical server observation provenance', () => {
  it('seals only normalized provider facts and verifies them with a canonical URL', () => {
    const sealed = sealCanonicalObservation('sold_comps', completedSale(), { signingKey, acquiredAt, query: '1996 Topps Kobe Bryant 138 PSA 10' });
    expect(sealed.provenanceToken).toBeTruthy();
    expect(sealed.provenance?.canonicalTransactionId).toBe('url:ebay.com/itm/123');
    const verified = verifyCanonicalObservation({ provenanceToken: sealed.provenanceToken }, { signingKey, now: acquiredAt });
    expect(verified.verified).toBe(true);
    if (!verified.verified) return;
    expect(verified.sale).toMatchObject({
      sourceId: 'sold_comps',
      sourceAdapter: 'sold_comps',
      originMarketplace: 'ebay',
      saleStatus: 'completed',
      priceBasis: 'sold',
      canonicalTransactionId: 'url:ebay.com/itm/123',
    });
  });

  it('rejects browser tampering with a signed observation token', () => {
    const sealed = sealCanonicalObservation('sold_comps', completedSale(), { signingKey, acquiredAt });
    const verified = verifyCanonicalObservation({
      ...completedSale({ price: 999_999 }),
      provenanceToken: sealed.provenanceToken,
    }, { signingKey, now: acquiredAt });
    expect(verified.verified).toBe(true);
    if (!verified.verified) return;
    expect(verified.sale.price).toBe(1000);
  });

  it('rejects expired and malformed provenance tokens while retaining context facts', () => {
    const sealed = sealCanonicalObservation('sold_comps', completedSale(), { signingKey, acquiredAt });
    const expired = verifyCanonicalObservation({ ...completedSale(), provenanceToken: sealed.provenanceToken }, {
      signingKey,
      now: new Date(acquiredAt.getTime() + 21 * 60 * 1_000),
    });
    expect(expired.verified).toBe(false);
    expect(expired.reasons.join(' ')).toContain('expired');

    const malformed = verifyCanonicalObservation({ ...completedSale(), provenanceToken: 'not.a.valid.token' }, { signingKey, now: acquiredAt });
    expect(malformed.verified).toBe(false);
    expect(malformed.sale.evidenceDisposition).toBe('context_only');
  });
});
