import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Dedicated isolated harness ONLY: testAIRouter -> actual adapter -> actual helper.
// Do not mock soldCompsAdditionalMarketData or testAiRetrievalAttempt here.
// All unrelated provider/DB/news modules must retain denied virtual boundaries.
const boundaries = vi.hoisted(() => ({ fetch: vi.fn(), llm: vi.fn(), denied: [] as string[] }));
vi.mock('./_core/env', () => ({ ENV: { jwtSecret: 'stage6-synthetic-retrieval-route-signing-key-not-a-service-credential', appId: 'stage6-retrieval-route' } }));
vi.mock('./_core/llm', () => ({ invokeLLM: boundaries.llm }));
import { testAIRouter, buildSoldCompsQueryCandidates } from './testAIRouter';
import { buildMarketplaceSearchDefinition } from '../shared/marketplaceSearchDefinition';
import { TestAiRetrievalLadder } from '../client/src/components/TestAiRetrievalLadder';
import { TestAiProcessCompleteNotice } from '../client/src/components/TestAiCandidateStatus';
import { verifyCanonicalObservation } from './testAiCanonicalObservation';
import { collectionLotGuard } from '../shared/testAiItemType';

const KEY = 'stage6-synthetic-retrieval-route-key-not-a-service-credential';
const TARGET = { title: '1996 Topps Kobe Bryant #138 PSA 10', category: 'sports_cards', itemType: 'single_card',
  grade: '10', certificationCompany: 'PSA', itemDetails: JSON.stringify({ year: '1996', manufacturer: 'Topps', player: 'Kobe Bryant', cardNumber: '138' }) };
const MOVIE = { title: 'Disney Hercules (1997) (Blu-ray) NEW', category: 'movies', condition: 'mint',
  itemDetails: JSON.stringify({ title: '1997', format: 'Blu-ray' }) };
const GAME = { title: 'The Legend of Zelda NES PSA 7.5', category: 'video_games', itemType: 'game', grade: '7.5',
  certificationCompany: 'PSA', itemDetails: JSON.stringify({ gameTitle: 'The Legend of Zelda', platform: 'NES', releaseYear: '1987', completeInBox: 'Yes', sealed: 'No' }) };
const COMIC = { title: 'Daredevil #168 CGC 9.8', category: 'comics', grade: '9.8', certificationCompany: 'CGC',
  itemDetails: JSON.stringify({ comicTitle: 'Daredevil', issueNumber: '168' }) };
type Row = Record<string, any>;
type Fixture = () => Response | Promise<Response>;
const caller = (role = 'admin') => testAIRouter.createCaller({ user: { id: 1, role } as any, req: { headers: {} } as any, res: {} as any });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const empty = () => json({ items: [] });
function ebayRow(id = 'stage6-sale-1'): Row {
  return { title: TARGET.title, saleId: id, id, soldPrice: '100', soldCurrency: 'USD', endedAt: '2026-11-08T12:00:00Z',
    url: `https://www.ebay.com/itm/${id}`, imageUrl: 'https://example.test/stage6/card.jpg', thumbnailUrl: 'https://example.test/stage6/card.jpg',
    itemSpecifics: { Player: 'Kobe Bryant' }, saleForm: 'single_card', lotQuantity: 1, buyerPremium: 'included' };
}
let fixtures: Fixture[] = [];
let requests: Array<{ url: URL; init?: RequestInit }> = [];
function ebayQueries(target: typeof TARGET | typeof COMIC = TARGET) {
  const definition = buildMarketplaceSearchDefinition(target);
  return buildSoldCompsQueryCandidates(definition.query, { preserveGrade: target.category === 'sports_cards', fallbackQueries: definition.fallbackQueries, prioritizeFallbackQueries: false });
}

beforeEach(() => {
  vi.clearAllMocks(); boundaries.denied.length = 0; fixtures = []; requests = [];
  boundaries.llm.mockImplementation(() => { boundaries.denied.push('model'); throw new Error('Unconfigured model forbidden'); });
  // Only synthetic values are written. No real configuration is captured/read by tests.
  vi.stubEnv('SOLD_COMPS_API_KEY', KEY); vi.stubEnv('SOLID_COMPS_API_KEY', '');
  boundaries.fetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.origin !== 'https://api.sold-comps.com' || !['/v1/scrape', '/v1/mercari', '/v1/tcgplayer/search', '/v1/tcgplayer/sales'].includes(url.pathname)) {
      boundaries.denied.push(`unconfigured HTTP ${url.origin}${url.pathname}`); throw new Error('Unconfigured HTTP forbidden');
    }
    expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${KEY}`);
    requests.push({ url, init });
    const fixture = fixtures[requests.length - 1];
    if (!fixture) { boundaries.denied.push('unconfigured fixture'); throw new Error('Unconfigured synthetic response forbidden'); }
    return fixture();
  });
  vi.stubGlobal('fetch', boundaries.fetch);
});
afterEach(() => {
  try { expect(boundaries.denied).toEqual([]); }
  finally { vi.unstubAllGlobals(); vi.unstubAllEnvs(); }
});

function coverage(result: Row): Row[] {
  expect(result.retrievalCoverage).toEqual(result.audit.retrievalCoverage);
  return result.retrievalCoverage;
}
function retained(result: Row): Row[] {
  return result.audit?.ledger ?? result.listings;
}

function rendered(result: Row, marketplace: string) {
  return renderToStaticMarkup(createElement(Fragment, null,
    createElement(TestAiRetrievalLadder, { data: result, sourceLabel: marketplace, marketplace }),
    createElement(TestAiProcessCompleteNotice, { data: result })));
}

describe('Stage 6 actual ordinary eBay route retrieval union', () => {
  it.each([TARGET, COMIC])('rejects numeric title after earlier success without losing prior union, valid siblings or grade/issue receipts: $category', async (target) => {
    const expected = ebayQueries(target); expect(expected.length).toBeGreaterThan(1);
    const prior = { ...ebayRow('prior-text-sale'), title: target.title };
    const sibling = { ...ebayRow('valid-text-sibling'), title: target.title };
    fixtures = expected.map((_query, index) => () => json({ items: index === 0 ? [prior] : index === 1
      ? [{ ...ebayRow('numeric-title'), title: 2026 }, sibling] : [] }));
    const result = await caller().getSoldCompsData(target) as unknown as Row;
    expect(result.error).toBeNull(); expect(result.partial).toBe(true);
    expect(coverage(result)[0]).toMatchObject({ received: 1, accepted: 1, normalized: 1, normalizationRejected: 0 });
    expect(coverage(result)[1]).toMatchObject({ outcome: 'success_records', received: 2, accepted: 1, rejected: 1,
      normalized: 1, normalizationRejected: 0, rejectionCounts: { invalid_title: 1 } });
    expect(result.attemptIssues).toHaveLength(1);
    expect(result.audit.rawReceived).toBe(2);
    for (const id of ['prior-text-sale', 'valid-text-sibling']) expect(retained(result).some((row) => row.saleId === id)).toBe(true);
    expect(retained(result).some((row) => row.saleId === 'numeric-title')).toBe(false);
    expect(requests.map(({ url }) => url.searchParams.get('keyword'))).toEqual(expected);
    expect(boundaries.llm).not.toHaveBeenCalled();
  });

  it('retains prior union and valid sibling when a later minimally valid grade metadata row actually throws during normalization', async () => {
    const expected = ebayQueries();
    const bad = { ...ebayRow('bad-grade-metadata'), grade: { toString: null } };
    fixtures = expected.map((_query, index) => () => json({ items: index === 0 ? [ebayRow('prior-normalized')]
      : index === 1 ? [bad, ebayRow('normalization-sibling')] : [] }));
    const result = await caller().getSoldCompsData(TARGET) as unknown as Row;
    expect(result.error).toBeNull(); expect(result.partial).toBe(true);
    expect(coverage(result)[1]).toMatchObject({ received: 2, accepted: 2, rejected: 0, normalized: 1, normalizationRejected: 1,
      rejectionCounts: { normalization_failure: 1 } });
    expect(result.attemptIssues).toHaveLength(1); expect(result.audit.rawReceived).toBe(2);
    for (const id of ['prior-normalized', 'normalization-sibling']) expect(retained(result).some((row) => row.saleId === id && !row.retrievalDiagnostic)).toBe(true);
    expect(result.retrievalDiagnostics).toHaveLength(1);
    expect(result.retrievalDiagnostics[0]).toMatchObject({ saleId: 'bad-grade-metadata', rawMetadata: bad,
      retrievalDiagnostic: true, valuationEligible: false, evidenceDisposition: 'context_only', visualReviewStatus: 'not_reviewed' });
    expect(requests.map(({ url }) => url.searchParams.get('keyword'))).toEqual(expected);
    expect(boundaries.llm).not.toHaveBeenCalled();
  });

  it('retains the complete earlier union and receipts as non-authoritative context when actual later structured processing throws', async () => {
    const expected = ebayQueries();
    // The existing Sold-Comps named-field normalizer ignores an arbitrary
    // object field, while the real structured comparison reader later attempts
    // its primitive conversion. No helper, ranking or adapter is mocked.
    const bad = { ...ebayRow('later-processing-failure'), itemSpecifics: { ProviderObservation: { toString: null } } };
    fixtures = expected.map((_query, index) => () => json({ items: index === 0 ? [ebayRow('prior-processing-success')]
      : index === 1 ? [bad, ebayRow('processing-sibling')] : [] }));
    const result = await caller().getSoldCompsData(TARGET) as unknown as Row;
    expect(result.error).toBeNull(); expect(result.partial).toBe(true); expect(result.metrics).toBeNull();
    expect(result.processingIssue).toContain('processing did not complete');
    expect(result.listings).toEqual([]); expect(result.contextListings).toHaveLength(3);
    expect(coverage(result)).toHaveLength(expected.length);
    expect(coverage(result)[1]).toMatchObject({ received: 2, accepted: 2, normalized: 2, normalizationRejected: 0 });
    for (const id of ['prior-processing-success', 'later-processing-failure', 'processing-sibling']) {
      const row = result.contextListings.find((item: Row) => item.saleId === id);
      expect(row).toMatchObject({ evidenceDisposition: 'context_only', valuationEligible: false, visualReviewStatus: 'not_reviewed' });
      expect(row.identityApproval).toBeUndefined(); expect(row.provenanceToken).toBeUndefined();
      expect(row.rawMetadata.saleId).toBe(id);
    }
    expect(result.audit.rawReceived).toBe(3); expect(result.sourcePopulation.retainedIngressCount).toBe(3);
    expect(requests.map(({ url }) => url.searchParams.get('keyword'))).toEqual(expected);
    expect(boundaries.llm).not.toHaveBeenCalled();
  });

  it.each(['imageUrl', 'galleryImages'] as const)('carries accepted itemId/price scalar aliases and %s through actual visual preparation, sealing and main projection with original raw intact', async (photoField) => {
    const expected = ebayQueries();
    const front = 'https://example.test/stage6/alias-front.jpg';
    const back = 'https://example.test/stage6/alias-back.jpg';
    const rows = [62345, 'distinct-alias-id'].map((itemId) => {
      const { saleId: _saleId, id: _id, soldPrice: _price, thumbnailUrl: _thumb, imageUrl: _image, url: _url, ...rest } = ebayRow();
      return { ...rest, itemId, price: '100.50', itemSpecifics: [{ name: 'Player', value: 'Kobe Bryant' }],
        providerDetail: { observed: 'original-structured-metadata' },
        ...(photoField === 'imageUrl' ? { imageUrl: front } : { galleryImages: [{ url: front }, { imageUrl: back }] }) };
    });
    fixtures = expected.map((_query, index) => () => json({ items: index === 0 ? rows : [] }));
    boundaries.llm.mockImplementation(async (request: Row) => {
      const content = request.messages?.[0]?.content;
      const text = Array.isArray(content) ? content.filter((part: Row) => part.type === 'text').map((part: Row) => part.text).join('\n') : '';
      const index = text.match(/CANDIDATE (\d+): title=/)?.[1];
      if (index === undefined || !text.includes('strict visual identity reviewer')) {
        boundaries.denied.push('unconfigured model request'); throw new Error('Unconfigured model request forbidden');
      }
      expect(content.filter((part: Row) => part.type === 'image_url').map((part: Row) => part.image_url.url)).toContain(front);
      return { choices: [{ message: { content: JSON.stringify({ reviews: [{ candidateIndex: Number(index), verdict: 'match', confidence: 'high',
        rationale: 'Synthetic deciding pixels confirm the exact card, slab, grader and numeric grade.', visualDifferences: [],
        visualEvidence: { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true,
          gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, artworkMatches: true } }] }) } }] };
    });
    const targetImage = 'https://example.test/stage6/target.jpg';
    const result = await caller().getSoldCompsData({ ...TARGET, imageUrl: targetImage, approvalTarget: TARGET,
      approvalTargetImageReference: targetImage }) as unknown as Row;
    expect(result.error).toBeNull(); expect(result.partial).toBe(false); expect(result.listings).toHaveLength(2);
    expect(coverage(result)[0]).toMatchObject({ received: 2, accepted: 2, normalized: 2, normalizationRejected: 0 });
    for (const original of rows) {
      const row = result.listings.find((item: Row) => item.saleId === String(original.itemId));
      expect(row).toMatchObject({ price: 100.50, currency: 'USD', imageUrl: front,
        imageUrls: photoField === 'imageUrl' ? [front] : [front, back], rawMetadata: original, providerMetadata: original });
      expect(row.rawMetadata.soldPrice).toBeUndefined(); expect(row.rawMetadata.saleId).toBeUndefined();
      expect(row.identityApproval).toBeTruthy();
      const verified = verifyCanonicalObservation(JSON.parse(JSON.stringify(row)));
      expect(verified.verified).toBe(true);
      expect(verified.sale).toMatchObject({ saleId: String(original.itemId), price: 100.50, currency: 'USD' });
    }
    expect(result.sourcePopulation.retainedIngressCount).toBe(2);
    expect(boundaries.llm).toHaveBeenCalledTimes(2);
    expect(requests.map(({ url }) => url.searchParams.get('keyword'))).toEqual(expected);
  });

  it.each([['missing key', { ...TARGET }, 'config_unavailable'],
    ['unsupported input', { title: '', category: 'sports_cards' }, 'input_unsupported']] as const)(
    'ordinary %s emits one consistent non-executed bounded receipt and no provider/model call', async (label, target, outcome) => {
      if (label === 'missing key') { vi.stubEnv('SOLD_COMPS_API_KEY', ''); vi.stubEnv('SOLID_COMPS_API_KEY', ''); }
      const result = await caller().getSoldCompsData(target) as unknown as Row;
      expect(requests).toHaveLength(0); expect(boundaries.llm).not.toHaveBeenCalled();
      expect(result.listings).toEqual([]); expect(result.metrics).toBeNull(); expect(result.partial).toBe(false);
      expect(coverage(result)).toHaveLength(1);
      expect(coverage(result)[0]).toMatchObject({ executed: false, outcome, received: null, accepted: null, rejected: null, httpStatus: null });
      expect(result.attemptIssues).toEqual(result.retrievalCoverage);
      expect(result.sourcePopulation.queryCoverage).toMatchObject({ executedQueryCount: 0, unavailableAttemptCount: 1 });
      expect(result.audit).toMatchObject({ rawReceived: 0, ledger: [] });
      expect(JSON.stringify(result.retrievalCoverage)).not.toContain(KEY);
    });

  it('Collection/Lot keeps the actual non-comparable guard ahead of unavailable/query/model work', async () => {
    vi.stubEnv('SOLD_COMPS_API_KEY', ''); vi.stubEnv('SOLID_COMPS_API_KEY', '');
    const input = { ...TARGET, itemType: 'collection_lot' };
    const result = await caller().getSoldCompsData(input);
    expect(result).toEqual(collectionLotGuard(input));
    expect(result).toMatchObject({ status: 'not_comparable', comparable: false });
    expect(requests).toHaveLength(0); expect(boundaries.llm).not.toHaveBeenCalled();
  });

  it.each([['fetch', () => { throw new Error('RAW_PROVIDER_SECRET_SENTINEL'); }, 'network_error'],
    ['JSON', () => new Response('{bad JSON', { status: 200 }), 'invalid_json'],
    ['shape', () => json({ items: 'not an array' }), 'unexpected_shape'],
    ['HTTP', () => json({ message: 'RAW_PROVIDER_SECRET_SENTINEL' }, 503), 'http_error']] as const)(
    'retains first minimally valid rows after later %s failure and completes all existing tiers', async (_label, failure, outcome) => {
      const expected = ebayQueries(); expect(expected.length).toBeGreaterThan(1);
      fixtures = expected.map((_query, index) => index === 0 ? () => json({ items: [ebayRow()] }) : index === 1 ? failure : empty);
      const result = await caller().getSoldCompsData(TARGET) as unknown as Row;
      expect(result.error).toBeNull(); expect(result.partial).toBe(true); expect(result.attemptIssues).toHaveLength(1);
      const receipts = coverage(result);
      expect(receipts[0]).toMatchObject({ outcome: 'success_records', received: 1, accepted: 1 });
      expect(receipts[1]).toMatchObject({ outcome, received: null, accepted: null, rejected: null });
      expect(requests.map(({ url }) => url.searchParams.get('keyword'))).toEqual(expected);
      expect(retained(result).some((row) => row.saleId === 'stage6-sale-1')).toBe(true);
      expect(result.audit.rawReceived).toBe(1);
      expect(result.sourcePopulation.retainedIngressCount).toBe(1);
      for (const { url, init } of requests) {
        expect(url.searchParams.get('count')).toBe('100'); expect(url.searchParams.get('sortOrder')).toBe('endedRecently');
        expect(url.searchParams.get('ebaySite')).toBe('ebay.com'); expect(init?.signal).toBeUndefined();
      }
      expect(JSON.stringify(receipts)).not.toContain('RAW_PROVIDER_SECRET_SENTINEL');
      expect(JSON.stringify(receipts)).not.toContain(KEY);
      const html = rendered(result, 'eBay');
      expect(html).toContain(`data-retrieval-outcome="${outcome}"`);
      expect(html).toContain('unmeasured');
      expect(html).toContain('partial/error retrieval');
    });

  it('preserves first HTTP failure stop when no minimally valid raw progress exists', async () => {
    fixtures = [() => json({ message: 'RAW_PROVIDER_SECRET_SENTINEL' }, 401)];
    const result = await caller().getSoldCompsData(TARGET) as unknown as Row;
    expect(requests).toHaveLength(1); expect(result.listings).toEqual([]); expect(result.metrics).toBeNull();
    expect(result.retrievalCoverage[0]).toMatchObject({ outcome: 'auth_error', received: null });
    expect(result.error).toContain('HTTP 401'); expect(result.error).not.toContain('RAW_PROVIDER_SECRET_SENTINEL');
    expect(result.partial).toBe(false);
    expect(rendered(result, 'eBay')).toContain('auth_error');
  });

  it('invalid raw rows do not confer progress that continues after the first HTTP failure', async () => {
    fixtures = [() => json({ items: [{ ...ebayRow(), title: {} }, { ...ebayRow(), soldPrice: true }] }), () => json({ items: [] }, 503)];
    const result = await caller().getSoldCompsData(TARGET) as unknown as Row;
    expect(requests).toHaveLength(2); expect(result.listings).toEqual([]);
    expect(result.retrievalCoverage.map((row: Row) => row.outcome)).toEqual(['row_rejection', 'http_error']);
    expect(result.retrievalCoverage[0]).toMatchObject({ received: 2, accepted: 0, rejected: 2 });
  });

  it('valid wrong-target rows count as retrieval progress before downstream target gates', async () => {
    const expected = ebayQueries();
    fixtures = expected.map((_query, index) => index === 0 ? () => json({ items: [{ ...ebayRow(), title: '1996 Topps Kobe Bryant #139 PSA 10' }] })
      : index === 1 ? () => json({}, 503) : empty);
    const result = await caller().getSoldCompsData(TARGET) as unknown as Row;
    expect(result.error).toBeNull(); expect(result.partial).toBe(true);
    expect(requests).toHaveLength(expected.length);
    expect(result.audit.rawReceived).toBe(1);
    expect(retained(result).some((row) => row.saleId === 'stage6-sale-1')).toBe(true);
  });

  it('unions valid siblings, preserves duplicate semantics and rejects malformed coercions', async () => {
    const expected = ebayQueries();
    fixtures = expected.map((_query, index) => () => json({ items: index === 0
      ? [null, { ...ebayRow(), soldPrice: [100] }, ebayRow()]
      : index === 1 ? [ebayRow(), ebayRow('stage6-sale-2')] : [] }));
    const result = await caller().getSoldCompsData(TARGET) as unknown as Row;
    expect(result.error).toBeNull(); expect(result.audit.rawReceived).toBe(2);
    expect(coverage(result)[0]).toMatchObject({ received: 3, accepted: 1, rejected: 2 });
    expect(result.partial).toBe(true);
    expect(retained(result).filter((row) => ['stage6-sale-1', 'stage6-sale-2'].includes(row.saleId))).not.toHaveLength(0);
    expect(requests).toHaveLength(expected.length);
  });

  it('all-invalid rows remain visible errors after the unchanged all-tier ladder', async () => {
    const expected = ebayQueries(); fixtures = expected.map(() => () => json({ items: [{ ...ebayRow(), soldPrice: {} }] }));
    const result = await caller().getSoldCompsData(TARGET) as unknown as Row;
    expect(result.listings).toEqual([]); expect(result.error).toContain('minimal validation');
    expect(result.retrievalCoverage).toHaveLength(expected.length); expect(result.partial).toBe(false);
  });

  it('non-admin access rejects before any provider work', async () => {
    await expect(caller('user').getSoldCompsData(TARGET)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(requests).toHaveLength(0);
  });
});

describe('Stage 6 actual Mercari adapter -> actual source route handoff', () => {
  it.each([MOVIE, GAME])('retains earlier query issues through actual no-image $category route', async (target) => {
    fixtures = [() => json({ message: 'RAW_PROVIDER_SECRET_SENTINEL' }, 401), () => json({ items: [{ itemId: 'stage6-mercari-route',
      title: target.title, price: '100', currency: 'USD', soldAt: '2026-11-08', url: 'https://www.mercari.com/us/item/stage6-mercari-route/',
      imageUrl: 'https://example.test/stage6/mercari.jpg' }] })];
    const result = await caller().getMercariSoldCompsData(target) as unknown as Row;
    expect(requests.map(({ url }) => url.pathname)).toEqual(['/v1/mercari', '/v1/mercari']);
    expect(result.error).toBeNull(); expect(result.partial).toBe(true);
    expect(coverage(result).map((row) => row.outcome)).toEqual(['auth_error', 'success_records']);
    expect(result.attemptIssues).toHaveLength(1);
    expect(result.sourcePopulation.retainedIngressCount).toBe(1);
    expect(retained(result).some((row) => row.saleId === 'mercari:stage6-mercari-route')).toBe(true);
    expect(retained(result).every((row) => !row.identityApproval)).toBe(true);
    const html = rendered(result, 'Mercari');
    expect(html).toContain('auth_error'); expect(html).toContain('success_records');
    expect(html).toContain('partial/error retrieval'); expect(html).toContain('unmeasured');
  });

  it('provider-unavailable route retains a non-executed typed receipt without provider work', async () => {
    vi.stubEnv('SOLD_COMPS_API_KEY', ''); vi.stubEnv('SOLID_COMPS_API_KEY', '');
    const result = await caller().getMercariSoldCompsData(MOVIE) as unknown as Row;
    expect(requests).toHaveLength(0);
    expect(coverage(result)[0]).toMatchObject({ executed: false, outcome: 'config_unavailable', received: null });
    expect(result.listings).toEqual([]); expect(result.partial).toBe(false);
  });

  it('primary 401 then valid empty fallback preserves the earlier issue in actual rendered output', async () => {
    fixtures = [() => json({}, 401), empty, empty, empty];
    const result = await caller().getMercariSoldCompsData(MOVIE) as unknown as Row;
    expect(result.listings).toEqual([]); expect(result.error).toContain('HTTP 401');
    expect(coverage(result)[0]).toMatchObject({ outcome: 'auth_error', received: null });
    expect(coverage(result).slice(1).every((row) => row.outcome === 'not_found' && row.received === 0)).toBe(true);
    expect(requests.length).toBeGreaterThan(1); expect(requests.length).toBeLessThanOrEqual(4);
    const html = rendered(result, 'Mercari');
    expect(html).toContain('auth_error'); expect(html).toContain('not_found'); expect(html).toContain('partial/error retrieval');
  });

  it('all-invalid primary then valid fallback retains row rejection diagnostics in the actual renderer', async () => {
    fixtures = [() => json({ items: [{ itemId: 'invalid', title: {}, price: true }] }),
      () => json({ items: [{ itemId: 'valid-fallback', title: MOVIE.title, price: '15', soldAt: '2026-11-08', currency: 'USD' }] })];
    const result = await caller().getMercariSoldCompsData(MOVIE) as unknown as Row;
    expect(requests).toHaveLength(2); expect(result.error).toBeNull(); expect(result.partial).toBe(true);
    expect(coverage(result).map((row) => row.outcome)).toEqual(['row_rejection', 'success_records']);
    const html = rendered(result, 'Mercari');
    expect(html).toContain('invalid_title: 1'); expect(html).toContain('invalid_price: 1');
    expect(html).toContain('partial/error retrieval');
  });

  it('first valid provider row later held by real target metadata/no-image gates never triggers more Mercari queries', async () => {
    fixtures = [() => json({ items: [{ itemId: 'held-target', title: '1996 Topps Kobe Bryant #139 PSA 10',
      price: '100', currency: 'USD', soldAt: '2026-11-08' }] })];
    const result = await caller().getMercariSoldCompsData(TARGET) as unknown as Row;
    expect(requests).toHaveLength(1); expect(result.error).toBeNull();
    expect(coverage(result)[0]).toMatchObject({ outcome: 'success_records', accepted: 1 });
    expect(retained(result).some((row) => row.saleId === 'mercari:held-target')).toBe(true);
    expect(retained(result).every((row) => !row.identityApproval)).toBe(true);
    const html = rendered(result, 'Mercari');
    expect(html).toContain('success_records'); expect(html).not.toContain('Fallback 1');
    expect(html).toContain('before metadata ranking, image review or pricing eligibility');
  });

  it('actual Pokémon TCG route retains product A when product B fails and renders the product attempt separately', async () => {
    fixtures = [() => json({ items: [{ productId: 1, name: 'Charizard', productLine: 'Pokemon' },
      { productId: 2, name: 'Charizard', productLine: 'Pokemon' },
      { productId: 3, name: 'Charizard', productLine: 'Pokemon' },
      { productId: 4, name: 'Charizard', productLine: 'Pokemon' }] }),
      () => json({ items: [{ price: '42', soldDate: '2026-11-08' }] }), () => json({}, 503)];
    const result = await caller().getTcgplayerSoldCompsData({ title: 'Charizard', category: 'pokemon' }) as unknown as Row;
    expect(requests).toHaveLength(3); expect(result.listings).toHaveLength(1);
    expect(result.error).toBeNull(); expect(result.partial).toBe(true);
    expect(result.productsMatched).toBe(4); expect(result.productsReviewed).toBe(2);
    expect(requests.slice(1).map(({ url }) => url.searchParams.get('productId'))).toEqual(['1', '2']);
    expect(result.metrics.retrievalCoverage).toEqual(result.retrievalCoverage);
    expect(result.retrievalCoverage[2]).toMatchObject({ stage: 'product_sales', query: '2', outcome: 'http_error', received: null });
    const html = rendered(result, 'TCGplayer');
    expect(html).toContain('Product sales attempt 3'); expect(html).toContain('http_error');
    expect(html).toContain('partial/error retrieval'); expect(html).toContain('unmeasured');
    expect(result.listings[0].evidenceDisposition).toBe('warning_review');
  });

  it('non-admin actual Mercari route rejects before the actual adapter makes a request', async () => {
    await expect(caller('user').getMercariSoldCompsData(MOVIE)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(requests).toHaveLength(0);
  });
});
