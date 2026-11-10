import { describe, expect, it, vi } from 'vitest';
import { getMercariObservedFacts, lookupMercariSoldComps, lookupTcgplayerSoldComps, normalizeMercariSoldCandidate,
  type AdditionalSoldCompsListing, type MercariSoldCompsReviewOptions } from './soldCompsAdditionalMarketData';
import { retrieveItemsAttempt, validateRetrievalRow } from '../shared/testAiRetrievalAttempt';

// Dedicated reviewed isolated importer required. Actual adapter/helper, synthetic HTTP only.
// Explicit options ensure these adapter calls never access real environment/configuration.
const KEY = { apiKey: 'stage6-synthetic-retrieval-key-not-a-service-credential' };
const TOY = { title: '70 Plymouth AAR Cuda Hot Wheels Treasure Hunt', category: 'vintage_toys',
  itemDetails: JSON.stringify({ year: '1970', vehicleName: 'Plymouth AAR Cuda', franchise: 'Hot Wheels', variant: 'Treasure Hunt' }) };
const TOY_QUERIES = ['1970 Plymouth AAR Cuda Hot Wheels Treasure Hunt', 'Plymouth AAR Cuda Hot Wheels',
  'Plymouth AAR Cuda', '70 Plymouth AAR Cuda Hot Wheels Treasure Hunt'];
const POKEMON = { title: 'Charizard Base Set #4', category: 'pokemon',
  itemDetails: JSON.stringify({ cardName: 'Charizard', cardNumber: '4', editionEra: 'Base Set' }) };
const MERCARI = { itemId: 'stage6-m1', title: 'Hot Wheels Plymouth AAR Cuda', price: '12', currency: 'USD',
  soldAt: '2026-09-01', url: 'https://www.mercari.com/us/item/stage6-m1/', condition: 'Pre-Owned',
  images: [{ url: 'https://example.test/stage6/front.jpg' }, { url: 'https://example.test/stage6/back.jpg' }],
  itemSpecifics: { Brand: 'Hot Wheels' }, categoryName: 'Vintage Toys', brand: 'Hot Wheels' };
const PRODUCTS = [1, 2, 3, 4].map((productId) => ({ productId, name: 'Charizard', productLine: 'Pokemon',
  setName: 'Base Set', number: '4/102', imageUrl: 'https://example.test/stage6/card.jpg' }));
const CONTRACT = { idFields: ['itemId'], titleFields: ['title'], priceFields: ['price'] };
const CONTEXT = { query: 'Synthetic query', stage: 'search' as const, attempt: 1 };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const malformed = () => new Response('{not JSON', { status: 200 });
type Fixture = () => Response | Promise<Response>;
function httpFixtures(fixtures: Fixture[]) {
  const calls: Array<{ url: URL; init?: RequestInit }> = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    expect(url.origin).toBe('https://api.sold-comps.com');
    expect(['/v1/mercari', '/v1/tcgplayer/search', '/v1/tcgplayer/sales']).toContain(url.pathname);
    calls.push({ url, init });
    const fixture = fixtures[calls.length - 1];
    if (!fixture) throw new Error('Unconfigured synthetic HTTP forbidden');
    return fixture();
  });
  return { calls, fetchImpl: fetchImpl as typeof fetch };
}
const empty = () => json({ items: [] });
const filled = () => json({ items: [MERCARI] });

// Currency no longer coerces through metadata. A descriptor failure exercises the
// same adapter normalization-failure receipt/retention boundary without getters.
const unreadableMercariMetadata = (row: Record<string, unknown>) => new Proxy(row, {
  getOwnPropertyDescriptor(target, key) {
    if (key === 'itemId') throw new Error('Synthetic descriptor unavailable');
    return Reflect.getOwnPropertyDescriptor(target, key);
  },
});
const originalRowsResponse = (rows: Record<string, unknown>[]) => ({ ok: true, status: 200,
  json: async () => ({ items: rows }) } as Response);

const SOLD = { ...MERCARI, status: 'sold' };
// Synthetic stop-policy stand-in only. Actual shared category preparation is parent-owned.
const factualReview = (rows: readonly AdditionalSoldCompsListing[]) => ({ supported: true,
  eligibleCount: rows.filter((row) => row.title === MERCARI.title && getMercariObservedFacts(row)?.status === 'sold').length });
const ineligibleReview = () => ({ supported: true, eligibleCount: 0 });

function assertSafe(value: unknown) {
  const wire = JSON.stringify(value);
  expect(wire).not.toContain(KEY.apiKey);
  expect(wire).not.toContain('RAW_PROVIDER_SECRET_SENTINEL');
  expect(wire).not.toContain('Authorization');
  expect(wire).not.toContain('Bearer');
}

describe('Stage 6 actual scalar/envelope/HTTP retrieval contract', () => {
  it('distinguishes valid empty, valid records and all-invalid rows', async () => {
    for (const [body, outcome, received, accepted, rejected] of [
      [{ items: [] }, 'not_found', 0, 0, 0],
      [{ items: [MERCARI] }, 'success_records', 1, 1, 0],
      [{ items: [null, { ...MERCARI, price: true }] }, 'row_rejection', 2, 0, 2],
    ] as const) {
      const result = await retrieveItemsAttempt(async () => json(body), CONTEXT, CONTRACT);
      expect(result.receipt).toMatchObject({ outcome, received, accepted, rejected });
      expect(result.items).toHaveLength(accepted);
    }
  });

  it.each([null, false, 42, 'items', [], [MERCARI], {}, { message: 'RAW_PROVIDER_SECRET_SENTINEL' },
    { data: { items: [MERCARI] } }, { items: null }, { items: {} }, { items: 'abc' }])(
    'rejects unsupported envelopes without measuring zero: %j', async (body) => {
      const result = await retrieveItemsAttempt(async () => json(body), CONTEXT, CONTRACT);
      expect(result.receipt).toMatchObject({ status: 'error', outcome: 'unexpected_shape', received: null, accepted: null, rejected: null });
      expect(result.items).toEqual([]);
      assertSafe(result.receipt);
    });

  it('does not turn malformed JSON into an empty search', async () => {
    const result = await retrieveItemsAttempt(async () => malformed(), CONTEXT, CONTRACT);
    expect(result.receipt).toMatchObject({ outcome: 'invalid_json', httpStatus: 200, received: null });
  });

  it.each([[401, 'auth_error'], [403, 'auth_error'], [404, 'http_error'], [408, 'http_error'],
    [429, 'rate_limited'], [500, 'http_error'], [503, 'http_error']] as const)(
    'classifies HTTP %s without exposing or reading the error body', async (status, outcome) => {
      const read = vi.fn(async () => { throw new Error('RAW_PROVIDER_SECRET_SENTINEL'); });
      const result = await retrieveItemsAttempt(async () => ({ ok: false, status, json: read }), CONTEXT, CONTRACT);
      expect(result.receipt).toMatchObject({ status: 'error', outcome, httpStatus: status, received: null, accepted: null, rejected: null });
      expect(read).not.toHaveBeenCalled();
      assertSafe(result.receipt);
    });

  it.each([['Error', 'network_error'], ['TimeoutError', 'timeout'], ['AbortError', 'aborted']] as const)(
    'uses typed %s transport classification, never exception prose', async (name, outcome) => {
      const failure = new Error('RAW_PROVIDER_SECRET_SENTINEL timeout words are not type evidence'); failure.name = name;
      const result = await retrieveItemsAttempt(async () => { throw failure; }, CONTEXT, CONTRACT);
      expect(result.receipt).toMatchObject({ outcome, received: null, httpStatus: null });
      assertSafe(result.receipt);
    });

  it.each(['TimeoutError', 'AbortError'])(
    'retains typed %s during response body reading', async (name) => {
      const failure = new Error('RAW_PROVIDER_SECRET_SENTINEL'); failure.name = name;
      const result = await retrieveItemsAttempt(async () => ({ ok: true, status: 200, json: async () => { throw failure; } }), CONTEXT, CONTRACT);
      expect(result.receipt.outcome).toBe(name === 'TimeoutError' ? 'timeout' : 'aborted');
      expect(result.receipt.received).toBeNull();
    });

  it.each([true, false, [], ['12'], {}, { value: '12' }, '', '  ', 'NaN', 'Infinity', 0, -1, NaN, Infinity])(
    'rejects nonpositive/nonfinite/coercible non-scalar prices: %j', (price) => {
      expect(validateRetrievalRow({ ...MERCARI, price }, CONTRACT)).toContain('invalid_price');
      expect(normalizeMercariSoldCandidate({ ...MERCARI, price })).toBeNull();
    });

  it.each([null, true, [], {}, '  ', 2026, NaN, Infinity])('rejects unusable title types: %j', (title) => {
    expect(validateRetrievalRow({ ...MERCARI, title }, CONTRACT)).toContain('invalid_title');
    expect(normalizeMercariSoldCandidate({ ...MERCARI, title })).toBeNull();
  });

  it.each([null, true, [], {}, '  ', NaN, Infinity])('rejects unusable ID types: %j', (itemId) => {
    expect(validateRetrievalRow({ ...MERCARI, itemId }, CONTRACT)).toContain('invalid_id');
  });

  it('retains supported numeric scalar IDs/prices with textual titles, without inventing numeric titles or alias discovery', () => {
    expect(validateRetrievalRow({ itemId: 12, title: 'Observed title', price: '12.50' }, CONTRACT)).toEqual([]);
    expect(validateRetrievalRow({ itemId: 12, title: 2026, price: '12.50' }, CONTRACT)).toEqual(['invalid_title']);
    expect(normalizeMercariSoldCandidate({ itemId: 'm', listingTitle: 'Alias only', soldPrice: 12 })).toBeNull();
    expect(normalizeMercariSoldCandidate({ ...MERCARI, title: { value: 'Wrapped title' } })).toBeNull();
  });

  it('uses the ordinary eBay existing scalar alias policy with first-observed precedence', async () => {
    const ebayContract = { idFields: ['saleId', 'id', 'itemId'], titleFields: ['title'], priceFields: ['soldPrice', 'price'] };
    const aliasRow = { itemId: 123, title: 'Observed eBay title', price: '100.50', galleryImages: [{ url: 'https://example.test/front.jpg' }] };
    expect(validateRetrievalRow(aliasRow, ebayContract)).toEqual([]);
    for (const row of [{ ...aliasRow, saleId: {} }, { ...aliasRow, soldPrice: true }, { ...aliasRow, price: { value: 100 } },
      { ...aliasRow, title: 2026 }, { ...aliasRow, title: ['Observed eBay title'] }]) {
      expect(validateRetrievalRow(row, ebayContract)).not.toEqual([]);
    }
    const result = await retrieveItemsAttempt(async () => json({ items: [{ ...aliasRow, title: 2026 }, aliasRow] }), CONTEXT, ebayContract);
    expect(result.items).toEqual([aliasRow]);
    expect(result.receipt).toMatchObject({ received: 2, accepted: 1, rejected: 1, rejectionCounts: { invalid_title: 1 } });
  });
});

describe('Stage 6 actual Mercari adapter bounded fallback and retention', () => {
  it('explicit null configuration and unsupported input make no HTTP calls', async () => {
    const http = httpFixtures([]);
    const missing = await lookupMercariSoldComps(TOY, http.fetchImpl, { apiKey: null });
    expect(missing.metrics).toBeNull();
    expect(missing.retrievalCoverage[0]).toMatchObject({ outcome: 'config_unavailable', executed: false, received: null });
    const invalid = await lookupMercariSoldComps({ title: '', category: 'other' }, http.fetchImpl, KEY);
    expect(invalid.retrievalCoverage[0]).toMatchObject({ outcome: 'input_unsupported', executed: false });
    expect(http.calls).toHaveLength(0);
  });

  it('retains valid siblings with metadata/photos and rejects only malformed rows', async () => {
    const http = httpFixtures([() => json({ items: [null, { ...MERCARI, title: {} }, { ...MERCARI, price: true }, MERCARI], hasNextPage: 'false' })]);
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY);
    expect(result.listings).toHaveLength(1);
    expect(result.listings[0]).toMatchObject({ imageUrls: ['https://example.test/stage6/front.jpg', 'https://example.test/stage6/back.jpg'],
      marketplaceCondition: 'Pre-Owned', providerMetadata: { categoryName: 'Vintage Toys', brand: 'Hot Wheels', itemSpecifics: { Brand: 'Hot Wheels' } } });
    expect(result.listings[0].canonicalCandidate?.rawMetadata.images).toEqual(MERCARI.images);
    expect(result.retrievalCoverage[0]).toMatchObject({ outcome: 'success_records', received: 4, accepted: 1, rejected: 3,
      rejectionCounts: { row_not_object: 1, invalid_title: 1, invalid_price: 1 } });
    expect(result.error).toBeNull(); expect(result.partial).toBe(true); expect(result.attemptIssues).toHaveLength(1);
    expect(result.hasNextPage).toBe(false);
    expect(http.calls).toHaveLength(1);
  });

  it('all-invalid primary rows reach only existing tiers, then the first minimal-valid response stops', async () => {
    const http = httpFixtures([() => json({ items: [{ ...MERCARI, price: true }, { ...MERCARI, title: ' ' }] }), filled]);
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY);
    expect(http.calls.map((call) => call.url.searchParams.get('keyword'))).toEqual(TOY_QUERIES.slice(0, 2));
    expect(result.retrievalCoverage.map((receipt) => receipt.outcome)).toEqual(['row_rejection', 'success_records']);
    expect(result.listings).toHaveLength(1); expect(result.error).toBeNull(); expect(result.partial).toBe(true);
  });

  it('a valid wrong-target/no-photo/context-only row stops before downstream scoring/image/economics', async () => {
    const http = httpFixtures([() => json({ items: [{ itemId: 'wrong-target', title: 'Completely different damaged lot of 50', price: 0.01 }] })]);
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY);
    expect(result.listings).toHaveLength(1);
    expect(result.listings[0]).toMatchObject({ imageUrl: null, evidenceDisposition: 'warning_review' });
    expect(result.retrievalCoverage[0].outcome).toBe('success_records');
    expect(http.calls).toHaveLength(1);
  });

  it('keeps a valid sibling when actual metadata normalization throws and still stops on minimal progress', async () => {
    const unreadable = unreadableMercariMetadata({ ...MERCARI, itemId: 'bad-metadata' });
    const http = httpFixtures([() => originalRowsResponse([MERCARI, unreadable])]);
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY);
    expect(http.calls).toHaveLength(1); expect(result.listings).toHaveLength(1);
    expect(result.retrievalCoverage[0]).toMatchObject({ accepted: 2, rejected: 0, normalized: 1,
      normalizationRejected: 1, rejectionCounts: { normalization_failure: 1 } });
    expect(result.error).toBeNull(); expect(result.partial).toBe(true);
  });

  it('does not execute a manufactured usable-success then later error path', async () => {
    const unreachable = vi.fn(() => { throw new Error('Unreachable later query'); });
    const http = httpFixtures([filled, unreachable]);
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY);
    expect(result.error).toBeNull(); expect(result.partial).toBe(false);
    expect(http.calls).toHaveLength(1); expect(unreachable).not.toHaveBeenCalled();
  });

  it('keeps earlier HTTP issues after later success', async () => {
    const http = httpFixtures([() => json({ message: 'RAW_PROVIDER_SECRET_SENTINEL' }, 401), filled]);
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY);
    expect(result.retrievalCoverage.map((receipt) => receipt.outcome)).toEqual(['auth_error', 'success_records']);
    expect(result.metrics?.retrievalCoverage).toEqual(result.retrievalCoverage);
    expect(result.attemptIssues).toHaveLength(1); expect(result.partial).toBe(true); expect(result.error).toBeNull();
    assertSafe(result.retrievalCoverage);
  });

  it('keeps earlier JSON failure after later valid empties, without claiming the failure count is zero', async () => {
    const http = httpFixtures([malformed, empty, empty, empty]);
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY);
    expect(result.retrievalCoverage.map((receipt) => receipt.outcome)).toEqual(['invalid_json', 'not_found', 'not_found', 'not_found']);
    expect(result.retrievalCoverage[0].received).toBeNull();
    expect(result.error).toContain('invalid JSON'); expect(result.partial).toBe(false);
    expect(result.attemptIssues).toHaveLength(1);
  });

  it('keeps exact empty/all-invalid four-tier order, URL bounds, and existing 10-second signals', async () => {
    const signals = vi.spyOn(AbortSignal, 'timeout');
    try {
      const http = httpFixtures([empty, () => json({ items: [{ ...MERCARI, price: [] }] }), empty, empty]);
      const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY);
      expect(http.calls.map((call) => call.url.searchParams.get('keyword'))).toEqual(TOY_QUERIES);
      expect(signals.mock.calls).toEqual([[10000], [10000], [10000], [10000]]);
      for (const { url, init } of http.calls) {
        expect(url.searchParams.get('count')).toBe('100'); expect(url.searchParams.get('page')).toBe('1');
        expect(url.searchParams.get('sortOrder')).toBe('newest'); expect(url.searchParams.get('sold')).toBe('true');
        expect(init?.signal).toBeInstanceOf(AbortSignal);
      }
      expect(result.metrics?.executedQueries).toEqual(TOY_QUERIES);
      expect(result.metrics?.fallbackQueriesUsed).toEqual(TOY_QUERIES.slice(1));
      expect(result.error).toContain('minimal validation');
    } finally { signals.mockRestore(); }
  });

  it('preserves actual Boolean pagination and deduplicates only normalized sale IDs', async () => {
    const http = httpFixtures([() => json({ items: [MERCARI, MERCARI, { ...MERCARI, itemId: 'different' }], hasNextPage: true })]);
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY);
    expect(result.retrievalCoverage[0]).toMatchObject({ received: 3, accepted: 3 });
    expect(result.received).toBe(2); expect(result.hasNextPage).toBe(true);
  });
});

describe('Step 6 Mercari server-owned review-opportunity adapter mode', () => {
  it.each([
    ['wrong target', { ...SOLD, itemId: 'wrong', title: 'Different damaged lot of 50' }, 1],
    ['active matching row', { ...MERCARI, itemId: 'active', status: 'active' }, 1],
    ['all normalization failed', unreadableMercariMetadata({ ...SOLD, itemId: 'bad' }), 0],
  ] as const)('continues after %s and stops on an eligible fallback, retaining normalization counts', async (_label, primary, normalized) => {
    const populations: string[][] = [];
    const reviewOpportunity = vi.fn((rows: readonly AdditionalSoldCompsListing[]) => {
      populations.push(rows.map((row) => row.saleId));
      return factualReview(rows);
    });
    const http = httpFixtures([() => originalRowsResponse([primary]), () => json({ items: [SOLD] })]);
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY, { reviewOpportunity });
    expect(http.calls.map((call) => call.url.searchParams.get('keyword'))).toEqual(TOY_QUERIES.slice(0, 2));
    expect(populations[0]).toHaveLength(normalized);
    expect(populations[1]).toHaveLength(normalized + 1);
    expect(result.listings).toHaveLength(normalized + 1);
    expect(result.retrievalCoverage[0]).toMatchObject({ status: 'success', outcome: 'success_records', httpStatus: 200,
      received: 1, accepted: 1, rejected: 0, normalized, normalizationRejected: 1 - normalized });
    expect(result.reviewOpportunity).toMatchObject({ supported: true, eligibleCount: 1, stopReason: 'eligible_review_opportunity',
      processingIssues: [], evaluations: [{ attempt: 1, supported: true, eligibleCount: 0 }, { attempt: 2, supported: true, eligibleCount: 1 }] });
    expect(result.error).toBeNull();
    expect(result.partial).toBe(normalized === 0);
    expect(result.received).toBe(normalized + 1);
  });

  it('stops on a mixed primary opportunity without dropping invalid, wrong or active siblings', async () => {
    const http = httpFixtures([() => json({ items: [null, { ...SOLD, itemId: 'wrong', title: 'Wrong lot' },
      { ...MERCARI, itemId: 'active', status: 'active' }, SOLD], hasNextPage: true })]);
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY, { reviewOpportunity: factualReview });
    expect(http.calls).toHaveLength(1); expect(result.listings).toHaveLength(3);
    expect(result.retrievalCoverage[0]).toMatchObject({ received: 4, accepted: 3, rejected: 1, normalized: 3 });
    expect(result.reviewOpportunity).toMatchObject({ eligibleCount: 1, stopReason: 'eligible_review_opportunity' });
    expect(result.hasNextPage).toBe(true); expect(result.partial).toBe(true);
  });

  it('exhausts exactly four distinct existing queries when every retained row is ineligible', async () => {
    const signals = vi.spyOn(AbortSignal, 'timeout');
    try {
      const http = httpFixtures([1, 2, 3, 4].map((id) => () => json({ items: [{ ...MERCARI, itemId: `held-${id}`, status: 'active' }] })));
      const reviewOpportunity = vi.fn(factualReview);
      const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY, { reviewOpportunity, now: () => 1000 });
      expect(http.calls.map((call) => call.url.searchParams.get('keyword'))).toEqual(TOY_QUERIES);
      expect(new Set(result.metrics?.executedQueries).size).toBe(4);
      expect(signals.mock.calls).toEqual([[10000], [10000], [10000], [10000]]);
      for (const { url } of http.calls) {
        expect(url.pathname).toBe('/v1/mercari');
        expect(Object.fromEntries(url.searchParams)).toMatchObject({ page: '1', count: '100', sortOrder: 'newest', sold: 'true' });
      }
      expect(reviewOpportunity.mock.calls.map(([rows]) => rows.length)).toEqual([1, 2, 3, 4]);
      expect(result.reviewOpportunity).toMatchObject({ supported: true, eligibleCount: 0, stopReason: 'queries_exhausted', retrievalDeadlineAt: 41000 });
      expect(result.retrievalCoverage.map((receipt) => receipt.outcome)).toEqual(Array(4).fill('success_records'));
      expect(result.listings).toHaveLength(4); expect(result.error).toBeNull(); expect(result.partial).toBe(false);
      expect(result.attemptIssues).toEqual([]);
    } finally { signals.mockRestore(); }
  });

  it('evaluates the same first-saleId unique union returned, not a later eligible duplicate', async () => {
    const first = { ...MERCARI, itemId: 'repeat', status: 'active' };
    const reviewOpportunity = vi.fn(factualReview);
    const http = httpFixtures([() => json({ items: [first, first] }),
      () => json({ items: [{ ...SOLD, itemId: 'repeat' }] }),
      () => json({ items: [{ ...SOLD, itemId: 'different-id-same-title' }] })]);
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY, { reviewOpportunity });
    expect(http.calls).toHaveLength(3);
    expect(reviewOpportunity.mock.calls.map(([rows]) => rows.map((row) => row.saleId))).toEqual([
      ['mercari:repeat'], ['mercari:repeat'], ['mercari:repeat', 'mercari:different-id-same-title'],
    ]);
    expect(reviewOpportunity.mock.calls[0][0][0]).toBe(result.listings[0]);
    expect(reviewOpportunity.mock.calls[2][0][1]).toBe(result.listings[1]);
    expect(getMercariObservedFacts(result.listings[0])?.status).toBe('active');
    expect(result.retrievalCoverage.map((receipt) => receipt.normalized)).toEqual([2, 1, 1]);
    expect(result.received).toBe(2); expect(result.reviewOpportunity?.eligibleCount).toBe(1);
  });

  it.each([
    ['HTTP', () => json({ message: 'RAW_PROVIDER_SECRET_SENTINEL' }, 503), 'http_error', 503],
    ['JSON', malformed, 'invalid_json', 200],
    ['shape', () => json({ items: {} }), 'unexpected_shape', 200],
    ['network', () => { throw new Error('RAW_PROVIDER_SECRET_SENTINEL'); }, 'network_error', null],
    ['timeout', () => { const error = new Error('RAW_PROVIDER_SECRET_SENTINEL'); error.name = 'TimeoutError'; throw error; }, 'timeout', null],
    ['abort', () => { const error = new Error('RAW_PROVIDER_SECRET_SENTINEL'); error.name = 'AbortError'; throw error; }, 'aborted', null],
  ] as const)('retains primary context and exact later %s failure while staying within the query cap', async (_label, failure, outcome, httpStatus) => {
    const http = httpFixtures([() => json({ items: [{ ...MERCARI, status: 'active' }], hasNextPage: true }), failure, empty, empty]);
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY, { reviewOpportunity: factualReview });
    expect(http.calls).toHaveLength(4); expect(result.listings).toHaveLength(1);
    expect(result.retrievalCoverage[0]).toMatchObject({ status: 'success', outcome: 'success_records', received: 1, normalized: 1 });
    expect(result.retrievalCoverage[1]).toMatchObject({ status: 'error', outcome, httpStatus, received: null, accepted: null,
      rejected: null, normalized: null, normalizationRejected: null });
    expect(result.metrics?.retrievalCoverage).toEqual(result.retrievalCoverage);
    expect(result.attemptIssues).toHaveLength(1); expect(result.partial).toBe(true);
    expect(result.error).toBeNull(); expect(result.hasNextPage).toBe(true);
    expect(result.reviewOpportunity).toMatchObject({ stopReason: 'queries_exhausted', eligibleCount: 0, processingIssues: [] });
    assertSafe(result);
  });

  it('keeps earlier and current success receipts when the second callback throws', async () => {
    let count = 0;
    const reviewOpportunity = vi.fn(() => {
      if (++count === 2) throw new Error('RAW_PROVIDER_SECRET_SENTINEL');
      return { supported: true, eligibleCount: 0 };
    });
    const http = httpFixtures([() => json({ items: [{ ...MERCARI, itemId: 'one' }] }),
      () => json({ items: [{ ...MERCARI, itemId: 'two' }] })]);
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY, { reviewOpportunity });
    expect(http.calls).toHaveLength(2); expect(result.listings).toHaveLength(2);
    expect(result.retrievalCoverage.map((receipt) => [receipt.status, receipt.outcome, receipt.normalized])).toEqual([
      ['success', 'success_records', 1], ['success', 'success_records', 1],
    ]);
    expect(result.reviewOpportunity).toMatchObject({ supported: null, eligibleCount: null, stopReason: 'processing_error',
      processingIssues: [{ attempt: 2, code: 'callback_exception', message: 'Mercari review-opportunity processing unavailable' }] });
    expect(result.attemptIssues).toEqual([]); expect(result.partial).toBe(true); expect(result.error).toBeNull();
    assertSafe(result);
  });

  it.each([
    ['async resolve', () => Promise.resolve({ supported: true, eligibleCount: 1 }), 'callback_async'],
    ['async reject', () => Promise.reject(new Error('RAW_PROVIDER_SECRET_SENTINEL')), 'callback_async'],
    ['thenable', () => ({ then: () => { throw new Error('Must not invoke thenable'); }, supported: true, eligibleCount: 1 }), 'callback_async'],
    ['null', () => null, 'callback_invalid'],
    ['array', () => [{ supported: true, eligibleCount: 1 }], 'callback_invalid'],
    ['missing field', () => ({ eligibleCount: 1 }), 'callback_invalid'],
    ['wrong supported type', () => ({ supported: 'true', eligibleCount: 1 }), 'callback_invalid'],
    ['wrong count type', () => ({ supported: true, eligibleCount: '1' }), 'callback_invalid'],
    ['NaN count', () => ({ supported: true, eligibleCount: NaN }), 'callback_invalid'],
    ['negative count', () => ({ supported: true, eligibleCount: -1 }), 'callback_invalid'],
    ['fractional count', () => ({ supported: true, eligibleCount: 0.5 }), 'callback_invalid'],
    ['exceeds union', () => ({ supported: true, eligibleCount: 2 }), 'callback_invalid'],
    ['contradictory unsupported', () => ({ supported: false, eligibleCount: 1 }), 'callback_invalid'],
    ['getter fields', () => ({ get supported() { throw new Error('RAW_PROVIDER_SECRET_SENTINEL'); }, eligibleCount: 1 }), 'callback_invalid'],
  ] as const)('fails closed on %s without turning successful retrieval into an HTTP error', async (_label, callback, code) => {
    const http = httpFixtures([() => json({ items: [SOLD] })]);
    const options = { reviewOpportunity: callback } as unknown as MercariSoldCompsReviewOptions;
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY, options);
    expect(http.calls).toHaveLength(1); expect(result.listings).toHaveLength(1);
    expect(result.retrievalCoverage[0]).toMatchObject({ status: 'success', outcome: 'success_records', httpStatus: 200,
      received: 1, accepted: 1, rejected: 0, normalized: 1 });
    expect(result.reviewOpportunity).toMatchObject({ supported: null, eligibleCount: null, stopReason: 'processing_error',
      processingIssues: [{ attempt: 1, code }] });
    expect(result.attemptIssues).toEqual([]); expect(result.partial).toBe(true); expect(result.error).toBeNull();
    assertSafe(result);
  });

  it('freezes the callback population and retained identity, preserving rows when deletion is attempted', async () => {
    const http = httpFixtures([() => json({ items: [SOLD] })]);
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY, { reviewOpportunity: (rows) => {
      expect(Object.isFrozen(rows)).toBe(true); expect(Object.isFrozen(rows[0])).toBe(true);
      (rows as AdditionalSoldCompsListing[]).pop();
      return { supported: true, eligibleCount: 1 };
    } });
    expect(result.listings).toHaveLength(1); expect(result.listings[0].saleId).toBe(`mercari:${SOLD.itemId}`);
    expect(result.reviewOpportunity?.processingIssues[0].code).toBe('callback_exception');
    expect(result.retrievalCoverage[0].outcome).toBe('success_records');
  });

  it('preserves unsupported/context minimal-valid stops without an invented ranking rule', async () => {
    const http = httpFixtures([filled]);
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY,
      { reviewOpportunity: () => ({ supported: false, eligibleCount: 0 }) });
    expect(http.calls).toHaveLength(1); expect(result.listings).toHaveLength(1);
    expect(result.reviewOpportunity).toMatchObject({ supported: false, eligibleCount: 0, stopReason: 'unsupported_context' });
  });

  it('shrinks request timeouts against one fake-clock invocation deadline and retains progress on expiry', async () => {
    let time = 1000;
    const signals = vi.spyOn(AbortSignal, 'timeout');
    try {
      const http = httpFixtures([
        () => { time = 39000; return json({ items: [{ ...MERCARI, itemId: 'one' }] }); },
        () => { time = 41000; return json({ items: [{ ...MERCARI, itemId: 'two' }] }); },
      ]);
      const reviewOpportunity = vi.fn(ineligibleReview);
      const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY,
        { reviewOpportunity, now: () => time, retrievalDeadlineAt: 999999 });
      expect(signals.mock.calls).toEqual([[10000], [2000]]);
      expect(http.calls).toHaveLength(2); expect(reviewOpportunity).toHaveBeenCalledTimes(1);
      expect(result.reviewOpportunity).toMatchObject({ retrievalDeadlineAt: 41000, stopReason: 'retrieval_deadline', processingIssues: [] });
      expect(result.listings).toHaveLength(2); expect(result.partial).toBe(true); expect(result.error).toBeNull();
      expect(result.retrievalCoverage.map((receipt) => receipt.outcome)).toEqual(['success_records', 'success_records']);
    } finally { signals.mockRestore(); }
  });

  it('checks the deadline before dispatch, honors a stricter deadline and does not reset it after preparation', async () => {
    let time = 1000;
    const signals = vi.spyOn(AbortSignal, 'timeout');
    try {
      const http = httpFixtures([() => json({ items: [MERCARI] })]);
      const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY,
        { now: () => time, retrievalDeadlineAt: 1750, reviewOpportunity: () => { time = 1750; return ineligibleReview(); } });
      expect(signals.mock.calls).toEqual([[750]]); expect(http.calls).toHaveLength(1);
      expect(result.reviewOpportunity).toMatchObject({ retrievalDeadlineAt: 1750, stopReason: 'retrieval_deadline' });
      expect(result.listings).toHaveLength(1); expect(result.partial).toBe(true);
      const denied = httpFixtures([]);
      const expired = await lookupMercariSoldComps(TOY, denied.fetchImpl, KEY,
        { reviewOpportunity: ineligibleReview, now: () => 2000, retrievalDeadlineAt: 1999 });
      expect(denied.calls).toHaveLength(0); expect(expired.retrievalCoverage).toEqual([]);
      expect(expired.reviewOpportunity?.stopReason).toBe('retrieval_deadline');
    } finally { signals.mockRestore(); }
  });

  it('ignores review clocks/deadlines without a callback and preserves explicit null configuration', async () => {
    const forbiddenClock = vi.fn(() => { throw new Error('Clock must be unused'); });
    const http = httpFixtures([filled]);
    const legacy = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY, { now: forbiddenClock, retrievalDeadlineAt: 0 });
    expect(http.calls).toHaveLength(1); expect(legacy.reviewOpportunity).toBeNull(); expect(forbiddenClock).not.toHaveBeenCalled();
    const denied = httpFixtures([]); const callback = vi.fn(factualReview);
    const missing = await lookupMercariSoldComps(TOY, denied.fetchImpl, { apiKey: null }, { reviewOpportunity: callback });
    expect(missing.retrievalCoverage[0]).toMatchObject({ outcome: 'config_unavailable', executed: false, received: null });
    expect(denied.calls).toHaveLength(0); expect(callback).not.toHaveBeenCalled();
  });

  it('preserves actual raw fact fields and types before overlays; provider-forged facts are never readable authority', async () => {
    const row = { itemId: 'facts', title: MERCARI.title, price: '12', status: 'active', currency: false,
      soldPrice: null, soldCurrency: 0, soldAt: undefined, date: 123, endedAt: ['not-a-date'], soldDate: '',
      saleStatus: 'completed', priceBasis: 'sold', observedFacts: { status: 'sold', verified: true },
      verified: true, score: 100, evidenceDisposition: 'verified',
      providerMetadata: { observedFacts: { status: 'sold' }, status: 'sold', score: 100, verified: true } };
    const http = httpFixtures([() => ({ ok: true, status: 200, json: async () => ({ items: [row] }) } as Response)]);
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY,
      { reviewOpportunity: () => ({ supported: false, eligibleCount: 0 }) });
    const listing = result.listings[0]; const facts = getMercariObservedFacts(listing)!;
    expect(facts.status).toBe('active'); expect(Object.isFrozen(facts)).toBe(true); expect(Object.isFrozen(facts.fields)).toBe(true);
    expect(facts.fields).toMatchObject({ status: { present: true, type: 'string', value: 'active' },
      currency: { present: true, type: 'boolean', value: false }, price: { present: true, type: 'string', value: '12' },
      soldPrice: { present: true, type: 'null', value: null }, soldCurrency: { present: true, type: 'number', value: 0 },
      soldAt: { present: true, type: 'undefined', value: undefined }, date: { present: true, type: 'number', value: 123 },
      endedAt: { present: true, type: 'array', value: ['not-a-date'] }, soldDate: { present: true, type: 'string', value: '' },
      completedAt: { present: false, type: 'undefined', value: undefined },
      saleStatus: { present: true, type: 'string', value: 'completed' }, priceBasis: { present: true, type: 'string', value: 'sold' } });
    expect(listing.currency).toBeNull(); expect(listing.endedAt).toBeNull();
    expect(listing.canonicalCandidate).toMatchObject({ saleStatus: 'active', priceBasis: 'asking', currency: null, date: null });
    expect(listing.mercariObservation).toBe(facts.report);
    expect(facts).toMatchObject({ observedStatus: 'active', listingStatus: 'active', requestedMode: 'sold' });
    row.status = 'sold'; row.endedAt[0] = 'changed';
    expect(facts.status).toBe('active'); expect(facts.fields.endedAt.value).toEqual(['not-a-date']);
    expect(Object.isFrozen(facts.fields.endedAt.value)).toBe(true);
    expect(getMercariObservedFacts({ ...listing })).toBeNull();
    expect(getMercariObservedFacts(JSON.parse(JSON.stringify(listing)))).toBeNull();
    expect(getMercariObservedFacts(listing.providerMetadata)).toBeNull();
    expect(getMercariObservedFacts(normalizeMercariSoldCandidate(SOLD))).toBeNull();
    expect(getMercariObservedFacts({ observedFacts: facts })).toBeNull();
  });

  it.each(['sold', 'active', 'completed', 'Sold', ' sold ', 'closed', '', null, false, { value: 'sold' }] as const)(
    'maps only exact observed status %j without treating legacy aliases or brand as completion', async (status) => {
      const http = httpFixtures([() => json({ items: [{ ...MERCARI, status, saleStatus: 'completed', priceBasis: 'sold',
        brand: 'Mercari Sold', observedFacts: { status: 'sold' }, verified: true, score: 100 }] })]);
      const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY,
        { reviewOpportunity: () => ({ supported: false, eligibleCount: 0 }) });
      expect(getMercariObservedFacts(result.listings[0])?.status).toBe(status === 'sold' ? 'sold' : status === 'active' ? 'active' : 'unknown');
      expect(getMercariObservedFacts(result.listings[0])?.fields.status).toMatchObject({ present: true, value: status });
    });

  it('does not stop on provider-forged observed facts, scores or evidence when direct status is active', async () => {
    const forged = { ...SOLD, itemId: 'forged', status: 'active', verified: true, metadataMatchScore: 100,
      metadataRanking: { score: 100 }, ranking: { score: 100 }, evidenceDisposition: 'verified',
      observedFacts: { status: 'sold', fields: { status: { present: true, type: 'string', value: 'sold' } } },
      providerMetadata: { status: 'sold', verified: true, observedFacts: { status: 'sold' } } };
    const http = httpFixtures([() => json({ items: [forged] }), () => json({ items: [SOLD] })]);
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY, { reviewOpportunity: factualReview });
    expect(http.calls).toHaveLength(2); expect(result.listings).toHaveLength(2);
    expect(getMercariObservedFacts(result.listings[0])?.status).toBe('active');
    expect(result.reviewOpportunity?.evaluations.map((evaluation) => evaluation.eligibleCount)).toEqual([0, 1]);
    expect(getMercariObservedFacts(result.listings[0].providerMetadata?.observedFacts)).toBeNull();
  });

  it.each(['', '  ', 0, false, null, { code: 'USD' }] as const)(
    'preserves actual currency %j rather than treating a display alias as observed USD', async (currency) => {
      const http = httpFixtures([() => json({ items: [{ ...SOLD, currency }] })]);
      const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY,
        { reviewOpportunity: () => ({ supported: false, eligibleCount: 0 }) });
      expect(result.listings).toHaveLength(1);
      const facts = getMercariObservedFacts(result.listings[0])!;
      expect(facts.fields.currency).toMatchObject({ present: true, value: currency,
        type: currency === null ? 'null' : typeof currency });
      expect(facts.fields.currency.value).not.toBe('USD');
      expect(result.listings[0].currency).toBeNull();
      expect(result.listings[0].canonicalCandidate?.currency).toBeNull();
    });

  it.each([NaN, Infinity, -Infinity] as const)('fails closed on invalid server clock %j before any dispatch', async (time) => {
    const http = httpFixtures([]); const callback = vi.fn(ineligibleReview);
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY, { now: () => time, reviewOpportunity: callback });
    expect(http.calls).toHaveLength(0); expect(callback).not.toHaveBeenCalled(); expect(result.listings).toEqual([]);
    expect(result.retrievalCoverage).toEqual([]); expect(result.attemptIssues).toEqual([]);
    expect(result.reviewOpportunity).toMatchObject({ stopReason: 'processing_error',
      processingIssues: [{ attempt: 0, code: 'clock_invalid' }] });
  });

  it('keeps omitted status/currency/date unknown despite sold query and defaulted display aliases', async () => {
    const http = httpFixtures([() => json({ items: [{ itemId: 'missing-facts', title: MERCARI.title, price: 12 }] })]);
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY,
      { reviewOpportunity: () => ({ supported: false, eligibleCount: 0 }) });
    const facts = getMercariObservedFacts(result.listings[0])!;
    expect(facts.status).toBe('unknown');
    for (const key of ['status', 'currency', 'soldAt', 'priceBasis', 'soldPrice', 'date'] as const) {
      expect(facts.fields[key]).toEqual({ present: false, type: 'undefined', value: undefined });
    }
    expect(result.listings[0]).toMatchObject({ currency: null, endedAt: null, date: null, saleStatus: 'unknown', priceBasis: 'unknown' });
  });
});

describe('STEP A Mercari adapter truthful observed listing context', () => {
  it('retains one first-ID union and disjoint effective partitions after sold conflicts and active-first duplicates', async () => {
    const activeFirst = { ...SOLD, itemId: 'repeat-mode', status: 'active' };
    const conflict = { ...SOLD, itemId: 'conflict', completed: false, soldAt: '2026-09-01' };
    const eligible = { ...SOLD, itemId: 'new-sold', soldAt: undefined };
    const http = httpFixtures([
      () => json({ items: [activeFirst, conflict] }),
      () => json({ items: [{ ...SOLD, itemId: 'repeat-mode', price: '100', title: 'Better later title' }, eligible] }),
    ]);
    const callback = vi.fn(factualReview);
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY, { requestedMode: 'sold', reviewOpportunity: callback });
    expect(http.calls).toHaveLength(2);
    expect(result.listings).toHaveLength(3);
    expect(result.returnedPopulations.activeListings).toEqual([result.listings[0]]);
    expect(result.returnedPopulations.unknownListings).toEqual([result.listings[1]]);
    expect(result.returnedPopulations.soldListings).toEqual([result.listings[2]]);
    expect(new Set(Object.values(result.returnedPopulations).flat()).size).toBe(result.listings.length);
    expect(result.listings[0]).toMatchObject({ price: 12, title: MERCARI.title, listingStatus: 'active' });
    expect(getMercariObservedFacts(result.listings[1])).toMatchObject({ status: 'unknown', observedStatus: 'sold', listingStatus: 'unknown' });
    expect(result.listings[1].mercariObservation?.statusIssues).toContain('status_conflict:completed');
    expect(result.reviewOpportunity?.evaluations.map((evaluation) => evaluation.eligibleCount)).toEqual([0, 1]);
    expect(result.requestedMode).toBe('sold');
    expect(result.retrievalCoverage.every((receipt) => receipt.requestedMode === 'sold')).toBe(true);
    for (const listing of result.listings) {
      expect(listing.date).toBeNull(); expect(listing.endedAt).toBeNull(); expect(listing.completedStatusBasis).toBeNull();
      expect(listing.canonicalCandidate?.valuation.disposition).toBe('context_only');
      expect(listing.canonicalCandidate?.date).toBeNull();
      if (listing.listingStatus !== 'active') expect(listing).toMatchObject({ saleStatus: 'unknown', priceBasis: 'unknown' });
    }
  });

  it('encodes only the owned invocation mode and retains response scrapedAt as retrieval context, never a sale date', async () => {
    const http = httpFixtures([() => json({ scrapedAt: '2026-11-10T12:00:00Z', requestedMode: 'sold', items: [
      { ...SOLD, requestedMode: 'sold', soldAt: '2026-09-01', soldDate: '2026-09-02', date: '2026-09-03', endedAt: '2026-09-04' },
    ] })]);
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY, { requestedMode: 'active' });
    expect(http.calls).toHaveLength(1);
    expect(http.calls[0].url.searchParams.get('sold')).toBe('false');
    expect(result.requestedMode).toBe('active');
    expect(result.retrievalCoverage[0]).toMatchObject({ requestedMode: 'active', responseScrapedAt: {
      present: true, type: 'string', value: '2026-11-10T12:00:00Z' } });
    const listing = result.listings[0]; const facts = getMercariObservedFacts(listing)!;
    expect(facts.report).toBe(listing.mercariObservation);
    expect(facts.requestedMode).toBe('active');
    expect(facts.report.statusIssues).toContain('requested_mode_row_mismatch');
    expect(facts.report.responseScrapedAt).toEqual(result.retrievalCoverage[0].responseScrapedAt);
    expect(listing).toMatchObject({ listingStatus: 'sold', saleStatus: 'unknown', priceBasis: 'unknown', date: null, endedAt: null });
    expect(listing.canonicalCandidate).toMatchObject({ date: null, saleStatus: 'unknown', priceBasis: 'unknown' });
    expect(listing.canonicalCandidate?.rawMetadata).toMatchObject({ soldAt: '2026-09-01', soldDate: '2026-09-02',
      date: '2026-09-03', endedAt: '2026-09-04' });
  });

  it('retains malformed optional currency rows without coercion/failure while keeping original prices separate', async () => {
    const http = httpFixtures([() => json({ items: [{ ...SOLD, itemId: 'currency-object', currency: { toString: null } },
      { ...SOLD, itemId: 'currency-conflict', soldCurrency: 'EUR', originalPrice: '20', soldPrice: '11', finalPrice: '10' },
      { ...SOLD, itemId: 'no-currency', currency: null, soldCurrency: 'USD' }] })]);
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY);
    expect(http.calls).toHaveLength(1); expect(result.listings).toHaveLength(3);
    expect(result.retrievalCoverage[0]).toMatchObject({ normalized: 3, normalizationRejected: 0 });
    expect(result.partial).toBe(false);
    for (const listing of result.listings) expect(listing.currency).toBeNull();
    const listing = result.listings[1];
    expect(listing.price).toBe(12);
    expect(listing.canonicalCandidate?.rawMetadata).toMatchObject({ price: '12', soldPrice: '11', originalPrice: '20', finalPrice: '10',
      currency: 'USD', soldCurrency: 'EUR' });
    expect(listing.mercariObservation?.economicIssues).toEqual(expect.arrayContaining(['currency_conflict:soldCurrency',
      'price_conflict:soldPrice', 'price_conflict:finalPrice', 'final_price_basis_unverified', 'sale_date_unknown']));
    expect(listing.mercariObservation?.economicIssues.some((issue) => issue.includes('originalPrice'))).toBe(false);
    expect(listing).not.toHaveProperty('soldPrice');
  });

  it('does not expose reflected sensitive metadata or share mutable original ownership in any projection', async () => {
    const metadata = { keep: 'Original', Authorization: 'RAW_PROVIDER_SECRET_SENTINEL', apiKey: 'RAW_PROVIDER_SECRET_SENTINEL',
      nested: { accessToken: 'RAW_PROVIDER_SECRET_SENTINEL', condition: 'Original' } };
    const row = { ...SOLD, metadata, providerMetadata: { metadata, observedFacts: { status: 'sold', verified: true } } };
    const http = httpFixtures([() => originalRowsResponse([row])]);
    const result = await lookupMercariSoldComps(TOY, http.fetchImpl, KEY);
    assertSafe(result);
    const listing = result.listings[0]; const report = getMercariObservedFacts(listing)!.report;
    expect(listing.rawMetadata).toBe(listing.canonicalCandidate?.rawMetadata);
    expect(Object.isFrozen(listing.rawMetadata)).toBe(true);
    expect(listing.rawMetadata?.metadata).toEqual({ keep: 'Original', nested: { condition: 'Original' } });
    metadata.keep = 'Changed'; metadata.nested.condition = 'Changed';
    expect(report.fields.metadata.value).toEqual({ keep: 'Original', nested: { condition: 'Original' } });
    expect(getMercariObservedFacts({ ...listing, mercariObservation: report })).toBeNull();
    expect(getMercariObservedFacts(JSON.parse(JSON.stringify(listing)))).toBeNull();
  });
});

describe('Stage 6 actual Pokémon-only TCG adapter product-sales retention', () => {
  it('unsupported category does not read configuration or request HTTP', async () => {
    const http = httpFixtures([]);
    const result = await lookupTcgplayerSoldComps({ title: 'Charizard', category: 'sports_cards' }, http.fetchImpl, KEY);
    expect(result.retrievalCoverage[0]).toMatchObject({ outcome: 'input_unsupported', executed: false, received: null });
    expect(http.calls).toHaveLength(0);
  });

  it.each([['HTTP', () => json({ message: 'RAW_PROVIDER_SECRET_SENTINEL' }, 503), 'http_error'],
    ['JSON', malformed, 'invalid_json'], ['shape', () => json({ items: {} }), 'unexpected_shape'],
    ['network', () => { throw new Error('RAW_PROVIDER_SECRET_SENTINEL'); }, 'network_error']] as const)(
    'keeps product A sales/history when product B has a later %s failure and does not add product C calls', async (_label, failure, outcome) => {
      const http = httpFixtures([() => json({ items: PRODUCTS }), () => json({ items: [{ price: 42, soldDate: '2026-09-07', quantity: 1, variant: 'Holofoil' }] }), failure]);
      const result = await lookupTcgplayerSoldComps(POKEMON, http.fetchImpl, KEY);
      expect(result.listings).toHaveLength(1);
      expect(result.listings[0]).toMatchObject({ price: 42, endedAt: '2026-09-07', evidenceDisposition: 'warning_review', providerMetadata: { variant: 'Holofoil' } });
      expect(result.error).toBeNull(); expect(result.partial).toBe(true);
      expect(result.retrievalCoverage.map((receipt) => receipt.stage)).toEqual(['search', 'product_sales', 'product_sales']);
      expect(result.retrievalCoverage.map((receipt) => receipt.query)).toEqual([result.query, '1', '2']);
      expect(result.retrievalCoverage[2]).toMatchObject({ outcome, received: null, accepted: null });
      expect(result.metrics?.retrievalCoverage).toEqual(result.retrievalCoverage);
      expect(result.metrics?.executedQueries).toEqual([result.query]);
      expect(result.productsMatched).toBe(4);
      expect(result.productsReviewed).toBe(2);
      expect(http.calls.slice(1).map((call) => call.url.searchParams.get('productId'))).toEqual(['1', '2']);
      expect(http.calls).toHaveLength(3); assertSafe(result.retrievalCoverage);
    });

  it('counts only product A as reviewed when its sales request fails before selected B/C/D execute', async () => {
    const http = httpFixtures([() => json({ items: PRODUCTS }), () => json({}, 503)]);
    const result = await lookupTcgplayerSoldComps(POKEMON, http.fetchImpl, KEY);
    expect(result.productsMatched).toBe(4); expect(result.productsReviewed).toBe(1);
    expect(result.retrievalCoverage.filter((receipt) => receipt.stage === 'product_sales' && receipt.executed)).toHaveLength(1);
    expect(http.calls.slice(1).map((call) => call.url.searchParams.get('productId'))).toEqual(['1']);
    expect(result.listings).toEqual([]); expect(result.error).toContain('HTTP 503'); expect(result.partial).toBe(false);
  });

  it('validates sale siblings without price/date inference and continues existing selected products', async () => {
    const http = httpFixtures([() => json({ items: PRODUCTS.slice(0, 2) }),
      () => json({ items: [{ price: true, soldDate: '2026-09-07' }, { price: 10, soldDate: null }] }),
      () => json({ items: [{ price: '42', soldDate: '2026-09-07', variant: 'Holofoil' }, { price: [40], soldDate: '2026-09-07' }] })]);
    const result = await lookupTcgplayerSoldComps(POKEMON, http.fetchImpl, KEY);
    expect(result.retrievalCoverage.map((receipt) => receipt.outcome)).toEqual(['success_records', 'row_rejection', 'success_records']);
    expect(result.retrievalCoverage[1]).toMatchObject({ received: 2, accepted: 0, rejected: 2, rejectionCounts: { invalid_price: 1, invalid_date: 1 } });
    expect(result.listings).toHaveLength(1); expect(result.partial).toBe(true); expect(result.error).toBeNull();
  });

  it('retains product A after actual product B metadata normalization fails', async () => {
    const http = httpFixtures([() => json({ items: [PRODUCTS[0], { ...PRODUCTS[1], setName: { toString: null } }, PRODUCTS[2]] }),
      () => json({ items: [{ price: 42, soldDate: '2026-09-07' }] }),
      () => json({ items: [{ price: 43, soldDate: '2026-09-08' }] })]);
    const result = await lookupTcgplayerSoldComps(POKEMON, http.fetchImpl, KEY);
    expect(result.listings).toHaveLength(1); expect(result.error).toBeNull(); expect(result.partial).toBe(true);
    expect(result.retrievalCoverage[2]).toMatchObject({ accepted: 1, rejected: 0, normalized: 0,
      normalizationRejected: 1, outcome: 'row_rejection', rejectionCounts: { normalization_failure: 1 } });
    expect(result.productsMatched).toBe(3); expect(result.productsReviewed).toBe(2);
    expect(http.calls).toHaveLength(3);
  });

  it('keeps the product cap, Pokémon filter, request context and no extra fallback after selected products', async () => {
    const more = Array.from({ length: 6 }, (_, index) => ({ ...PRODUCTS[0], productId: index + 10 }));
    const http = httpFixtures([() => json({ items: [{ productId: {}, name: 'Invalid', productLine: 'Pokemon' },
      { productId: 'wrong-category', name: 'Not Pokémon', productLine: 'Magic' }, ...more] }), empty, empty, empty, empty]);
    const result = await lookupTcgplayerSoldComps(POKEMON, http.fetchImpl, KEY);
    expect(result.productsMatched).toBe(4); expect(result.productsReviewed).toBe(4); expect(http.calls).toHaveLength(5);
    expect(result.retrievalCoverage[0]).toMatchObject({ received: 8, accepted: 7, rejected: 1 });
    expect(result.metrics?.executedQueries).toEqual([result.query]);
    expect(http.calls[0].url.searchParams.get('count')).toBe('4');
    expect(http.calls[0].url.searchParams.get('sortOrder')).toBe('bestMatch');
    expect(http.calls.slice(1).map((call) => call.url.searchParams.get('productId'))).toEqual(['10', '11', '12', '13']);
    expect(http.calls.slice(1).every((call) => call.url.searchParams.get('listingType') === 'ListingWithPhotos')).toBe(true);
  });
});
