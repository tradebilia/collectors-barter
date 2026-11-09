import { describe, expect, it, vi } from 'vitest';
import { lookupMercariSoldComps, lookupTcgplayerSoldComps, normalizeMercariSoldCandidate } from './soldCompsAdditionalMarketData';
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
    // A JSON object with no callable primitive conversion reaches the real normalizer.
    const http = httpFixtures([() => json({ items: [MERCARI, { ...MERCARI, itemId: 'bad-metadata', currency: { toString: null } }] })]);
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
