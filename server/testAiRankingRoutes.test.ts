import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MetadataRankingBinding } from '../shared/testAiRankingPopulation';
import type { VisualEvidence } from './testAiVisualSourceFilter';

// Reviewed isolated harness ONLY. Provider/DB/news dependency modules must remain
// denied virtual harness boundaries. Router, normalization, scorer, visual filter,
// canonical signer/issuer and A/B transport are ACTUAL modules, never mocked.
const boundaries = vi.hoisted(() => ({ fetch: vi.fn(), llm: vi.fn(), mercari: vi.fn(), denied: [] as string[] }));
vi.mock('./_core/env', () => ({ ENV: { jwtSecret: 'stage4-synthetic-ranking-signing-key-not-a-service-credential', appId: 'stage4-ranking-test' } }));
vi.mock('./_core/llm', () => ({ invokeLLM: boundaries.llm }));
vi.mock('./soldCompsAdditionalMarketData', () => ({ lookupMercariSoldComps: boundaries.mercari,
  // Explicit fake owned-facts seam for this display test; real ownership is tested in the dedicated adapter process.
  getMercariObservedFacts: (row: { status?: string }) => ({ status: row.status === 'sold' ? 'sold' : 'unknown' }),
  lookupTcgplayerSoldComps: () => { boundaries.denied.push('TCGplayer'); throw new Error('Unconfigured provider forbidden'); } }));
import { testAIRouter, readEbayBrowseItemSummaries, EBAY_ACTIVE_EXACT_PAGE_LIMIT, EBAY_ACTIVE_QUERY_TIER_LIMIT } from './testAIRouter';
import { buildSoldCompsAnalysisSales, buildSoldCompsApprovalInput } from '../shared/testAiSoldCompsTransport';
import { retainOriginDisplayRanking } from '../shared/testAiRankingPopulation';
import { buildEbayVisualReviewListings } from '../shared/testAiRankingDisplay';
import { verifyCanonicalObservation } from './testAiCanonicalObservation';
import { sourceRetrievalCoverage, sourceRetainedEmptyMessage } from '../shared/testAiSourceDisplay';

const API_KEY = 'stage4-synthetic-sold-comps-api-key-not-a-service-credential';
const PRIMARY = 'https://example.test/stage4/target.jpg';
const NOW = new Date('2026-11-09T02:00:00.000Z');
const KOBE = { title: '1996 Topps Kobe Bryant #138 PSA 10', category: 'sports_cards', itemType: 'single_card',
  grade: '10', certificationCompany: 'PSA', itemDetails: JSON.stringify({ year: '1996', manufacturer: 'Topps', player: 'Kobe Bryant', cardNumber: '138' }) };
const ZELDA = { title: 'The Legend of Zelda NES PSA 7.5', category: 'video_games', itemType: 'game',
  grade: '7.5', certificationCompany: 'PSA', itemDetails: JSON.stringify({ gameTitle: 'The Legend of Zelda', platform: 'NES', releaseYear: '1987', completeInBox: 'Yes', sealed: 'No' }) };
const GRADED: VisualEvidence = { slabVisible: true, gradingLabelVisible: true, graderVisible: true,
  numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, artworkMatches: true };
type Row = Record<string, any>;
const wire = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const binding = (row: Row) => row.metadataRanking as MetadataRankingBinding;
const caller = (role = 'admin') => testAIRouter.createCaller({ user: { id: 1, role } as any, req: { headers: {} } as any, res: {} as any });
let soldRows: Row[] = [];
let activeRows: Row[] = [];
let allowVisual = false;
function providerRows(count = 3): Row[] {
  return Array.from({ length: count }, (_, index) => ({ title: KOBE.title, saleId: `stage4-${index}`, id: `stage4-${index}`,
    soldPrice: String(100 + index), soldCurrency: 'USD', endedAt: new Date(NOW.getTime() - (index + 1) * 86400000).toISOString(),
    url: `https://www.ebay.com/itm/stage4-${index}`, thumbnailUrl: `https://example.test/stage4/${index}.jpg`,
    imageUrl: `https://example.test/stage4/${index}.jpg`, saleForm: 'single_card', lotQuantity: 1,
    buyerPremium: 'included', shipping: 'excluded', tax: 'unknown', itemSpecifics: { Player: 'Kobe Bryant' } }));
}
function assertPopulation(rows: Row[], size: number, sourceId: string) {
  expect(rows.length).toBeGreaterThan(0);
  const ids = new Set(rows.map((row) => binding(row).populationId));
  expect(ids.size).toBe(1);
  const byOccurrence = new Map<string, Row>();
  for (const row of rows) {
    expect(binding(row)).toMatchObject({ sourceId, populationSize: size, scorerRole: 'exact_comparable' });
    expect(binding(row).score).toBe(row.metadataMatchScore);
    expect(binding(row).rank).toBe(row.metadataMatchRank);
    expect(row.metadataScoreAwards).toEqual(expect.any(Array));
    expect(row.metadataFieldComparisons).toEqual(expect.any(Array));
    const existing = byOccurrence.get(binding(row).occurrenceKey);
    if (existing) {
      expect(row.metadataRanking).toEqual(existing.metadataRanking);
      expect(row.metadataMatchReasons).toEqual(existing.metadataMatchReasons);
      expect(row.metadataScoreAwards).toEqual(existing.metadataScoreAwards);
    } else byOccurrence.set(binding(row).occurrenceKey, row);
  }
  const ranks = [...byOccurrence.values()].map((row) => row.metadataMatchRank);
  expect(new Set(ranks).size).toBe(ranks.length);
  return byOccurrence;
}

beforeEach(() => {
  vi.clearAllMocks(); boundaries.denied.length = 0;
  soldRows = []; activeRows = []; allowVisual = false;
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(NOW);
  vi.stubEnv('SOLD_COMPS_API_KEY', API_KEY); vi.stubEnv('SOLID_COMPS_API_KEY', '');
  vi.stubEnv('EBAY_PROD_CLIENT_ID', 'stage4-synthetic-ebay-client');
  vi.stubEnv('EBAY_PROD_CLIENT_SECRET', 'stage4-synthetic-ebay-secret');
  boundaries.fetch.mockImplementation(async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.origin === 'https://api.sold-comps.com' && url.pathname === '/v1/scrape'
      && new Headers(init?.headers).get('Authorization') === `Bearer ${API_KEY}`
      && url.searchParams.get('count') === '100' && url.searchParams.get('sortOrder') === 'endedRecently'
      && url.searchParams.get('ebaySite') === 'ebay.com') {
      return { ok: true, status: 200, json: async () => ({ items: wire(soldRows) }), text: async () => 'Synthetic provider response' };
    }
    if (url.origin === 'https://api.ebay.com' && url.pathname === '/identity/v1/oauth2/token' && init?.method === 'POST') {
      return { ok: true, status: 200, json: async () => ({ access_token: 'stage4-synthetic-ebay-access' }) };
    }
    if (url.origin === 'https://api.ebay.com' && url.pathname === '/buy/browse/v1/item_summary/search'
      && new Headers(init?.headers).get('Authorization') === 'Bearer stage4-synthetic-ebay-access'
      && url.searchParams.get('limit') === '40') {
      return { ok: true, status: 200, json: async () => ({ itemSummaries: Number(url.searchParams.get('offset') ?? 0) === 0 ? wire(activeRows) : [] }) };
    }
    boundaries.denied.push(`unconfigured HTTP ${url.origin}${url.pathname}`);
    throw new Error('Only configured synthetic provider HTTP is permitted');
  });
  vi.stubGlobal('fetch', boundaries.fetch);
  boundaries.mercari.mockResolvedValue({ query: ZELDA.title, listings: [], metrics: null, error: null });
  boundaries.llm.mockImplementation(async (request: Row) => {
    if (!allowVisual) throw new Error('Configured synthetic model outage; no model execution');
    const content = request.messages?.[0]?.content;
    const text = Array.isArray(content) ? content.filter((part: Row) => part.type === 'text').map((part: Row) => part.text).join('\n') : '';
    const index = text.match(/CANDIDATE (\d+): title=/)?.[1];
    if (index === undefined || !text.includes('strict visual identity reviewer')) {
      boundaries.denied.push('unconfigured model request'); throw new Error('Unconfigured model request forbidden');
    }
    return { choices: [{ message: { content: JSON.stringify({ reviews: [{ candidateIndex: Number(index), verdict: 'match', confidence: 'high',
      rationale: 'Synthetic deciding pixels confirm identity, holder, grader and numeric grade.', visualDifferences: [], visualEvidence: GRADED }] }) } }] };
  });
});
afterEach(() => {
  try { expect(boundaries.denied).toEqual([]); }
  finally { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); }
});

describe('Approved eBay Browse unreadable-response and partial-retention repair', () => {
  function activeProviderRows(count: number): Row[] {
    return providerRows(count).map((row) => ({ ...row, itemId: row.id, itemWebUrl: row.url,
      price: { value: row.soldPrice, currency: 'USD' }, buyingOptions: ['FIXED_PRICE'], image: { imageUrl: row.thumbnailUrl } }));
  }
  function overrideBrowse(reply: (url: URL) => any) {
    const ordinary = boundaries.fetch.getMockImplementation()!;
    boundaries.fetch.mockImplementation(async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.origin === 'https://api.ebay.com' && url.pathname === '/buy/browse/v1/item_summary/search'
        && new Headers(init?.headers).get('Authorization') === 'Bearer stage4-synthetic-ebay-access'
        && url.searchParams.get('limit') === '40') return reply(url);
      return ordinary(input, init);
    });
  }
  const browseCalls = () => boundaries.fetch.mock.calls.map((call) => new URL(String(call[0])))
    .filter((url) => url.pathname === '/buy/browse/v1/item_summary/search');
  const SENSITIVE = 'UNIQUE_SENSITIVE_EBAY_PROVIDER_DETAIL_20261110';
  const failedKinds = ['null-json', 'invalid-json', 'null-field', 'structured-errors', 'positive-total-missing',
    'all-invalid', 'timeout', 'http', 'sensitive-error', 'non-error'] as const;
  function failedReply(kind: typeof failedKinds[number]) {
    if (kind === 'timeout') throw Object.assign(new Error(SENSITIVE), { name: 'TimeoutError' });
    if (kind === 'sensitive-error') throw new Error(SENSITIVE);
    if (kind === 'non-error') throw { detail: SENSITIVE };
    return { ok: kind !== 'http', status: kind === 'http' ? 503 : 200, json: async () => {
      if (kind === 'invalid-json') throw new SyntaxError(SENSITIVE);
      if (kind === 'null-field') return { itemSummaries: null };
      if (kind === 'structured-errors') return { errors: [{ errorId: 1, message: SENSITIVE }] };
      if (kind === 'positive-total-missing') return { total: 40 };
      if (kind === 'all-invalid') return { itemSummaries: [null, false, []] };
      return null;
    } };
  }
  function assertAttempts(result: Row, failed: number, known: number, raw: number | null) {
    const attempts = result.retrievalCoverage as Row[];
    expect(attempts).toHaveLength(browseCalls().length);
    expect(attempts.map((attempt) => attempt.attempt)).toEqual(attempts.map((_, index) => index + 1));
    expect(attempts.every((attempt) => attempt.executed && attempt.stage === 'search')).toBe(true);
    expect(attempts.filter((attempt) => attempt.status === 'error')).toHaveLength(failed);
    expect(attempts.filter((attempt) => attempt.status === 'error').every((attempt) => attempt.received === null)).toBe(true);
    expect(result.sourcePopulation).toMatchObject({ knownQueryReturnedObservationCount: known,
      queryReturnedObservationCount: raw, queryCoverage: { measured: true, rawCountsComplete: raw !== null,
        executedQueryCount: attempts.length, failedQueryCount: failed } });
    for (const packet of [result, result.sourcePopulation]) {
      expect(sourceRetrievalCoverage(packet)).toMatchObject({ executedQueryCount: attempts.length, failedQueryCount: failed,
        partialRetrieval: failed > 0 || attempts.some((attempt) => (attempt.rejected ?? 0) > 0) });
    }
    expect(JSON.stringify(result)).not.toContain(SENSITIVE);
    expect(browseCalls().length).toBeLessThanOrEqual(EBAY_ACTIVE_EXACT_PAGE_LIMIT + EBAY_ACTIVE_QUERY_TIER_LIMIT - 1);
    expect(boundaries.llm).not.toHaveBeenCalled();
  }
  function assertRetained(result: Row, expected: Row[]) {
    const retained = [...result.visualFilter.listings, ...result.visualFilter.contextListings] as Row[];
    expect(retained).toHaveLength(expected.length);
    expect(new Set(retained.map((row) => row.itemId))).toEqual(new Set(expected.map((row) => row.itemId)));
    expect(result.sourcePopulation.retainedIngressCount).toBe(expected.length);
    expect(result.debug.totalFetched).toBe(expected.length);
    expect(result.listings).toHaveLength(Math.min(20, expected.length));
    const retainedUrls = new Set(expected.map((row) => row.itemWebUrl));
    expect(result.listings.every((row: Row) => retainedUrls.has(row.itemUrl))).toBe(true);
    expect(result.listings.map((row: Row) => row.itemUrl)).toEqual(retained.slice(0, 20).map((row) => row.itemWebUrl));
    expect(retained.every((row) => !row.identityApproval)).toBe(true);
  }

  it.each([null, undefined, 'not-json-object', 123, [], { itemSummaries: 'wrong-shape' },
    { itemSummaries: null }, { itemSummaries: undefined }, { total: 40 }, { total: 40, itemSummaries: null },
    { errors: [{ message: SENSITIVE }] }, { error: { message: SENSITIVE } }, { itemSummaries: [null, false, []] }])
    ('rejects unreadable response %j instead of reporting zero results', (body) => {
      expect(() => readEbayBrowseItemSummaries(body)).toThrow(/unreadable/i);
    });
  it('recognizes genuinely omitted/empty results and retains valid mixed-page siblings', () => {
    expect(readEbayBrowseItemSummaries({})).toEqual([]);
    expect(readEbayBrowseItemSummaries({ total: 0 })).toEqual([]);
    expect(readEbayBrowseItemSummaries({ itemSummaries: [] })).toEqual([]);
    expect(readEbayBrowseItemSummaries({ itemSummaries: [null, false, [], { itemId: 'valid' }] })).toEqual([{ itemId: 'valid' }]);
  });
  it.each(failedKinds)('first-page %s is a safely reported unmeasured failure, never zero matches', async (kind) => {
    overrideBrowse(() => failedReply(kind));
    const result = await caller().getEbayData({ ...KOBE, includeVisualReview: false }) as Row;
    expect(result.listings).toEqual([]);
    expect(result.error).toMatch(/^eBay Browse lookup (?:returned|timed out|failed)/);
    expect(result.error).not.toMatch(/Cannot read|itemSummaries.*null/i);
    expect(result.partialRetrieval).toBe(true);
    expect(result.debug).toMatchObject({ failedQueryCount: 1, exactTierPageCount: 0, exactTierOffsets: [],
      exactTierAttemptedOffsets: [0], exactTierFailedOffsets: [0] });
    if (kind === 'all-invalid') expect(result.retrievalCoverage[0]).toMatchObject({ rejected: 3, rejectionCounts: { row_not_object: 3 } });
    assertAttempts(result, 1, 0, null);
    expect(browseCalls()).toHaveLength(1);
    expect(sourceRetainedEmptyMessage(result, 0, 'eBay')).toMatch(/do not establish zero marketplace matches/i);
  });
  it.each([{}, { itemSummaries: [] }])('genuine empty success %j measures zero failures and returned rows', async (body) => {
    overrideBrowse(() => ({ ok: true, status: 200, json: async () => body }));
    const result = await caller().getEbayData({ ...KOBE, includeVisualReview: false }) as Row;
    expect(result.error).toBeNull(); expect(result.listings).toEqual([]);
    expect(result.partialRetrieval).toBe(false); expect(result.retrievalWarning).toBeNull();
    expect(result.debug.failedQueryCount).toBe(0);
    expect(result.retrievalCoverage.every((attempt: Row) => attempt.received === 0 && attempt.outcome === 'not_found')).toBe(true);
    assertAttempts(result, 0, 0, 0);
    expect(browseCalls()).toHaveLength(result.debug.queryTierCount);
    expect(sourceRetainedEmptyMessage(result, 0, 'eBay')).toMatch(/No completed eBay records found/i);
  });
  it.each(failedKinds)('keeps all 40 first-page ingress rows and the 20-row public cap when offset 40 fails (%s)', async (kind) => {
    const rows = activeProviderRows(40);
    overrideBrowse((url) => {
      if (Number(url.searchParams.get('offset')) === 0) return { ok: true, status: 200, json: async () => ({ itemSummaries: wire(rows) }) };
      return failedReply(kind);
    });
    const result = await caller().getEbayData({ ...KOBE, includeVisualReview: false }) as Row;
    expect(result.error).toBeNull(); assertRetained(result, rows);
    expect(result.debug.failedQueryCount).toBe(1);
    expect(result.debug.failedQueries[0]).toMatchObject({ tier: 0, offset: 40 });
    expect(result.debug.failedQueries[0].error).toMatch(/^eBay Browse lookup/);
    expect(result.debug).toMatchObject({ exactTierPageCount: 1, exactTierOffsets: [0],
      exactTierAttemptedOffsets: [0, 40], exactTierFailedOffsets: [40], queryTierCount: 1 });
    expect(result.retrievalCoverage[0]).toMatchObject({ received: 40, accepted: 40, rejected: 0 });
    if (kind === 'all-invalid') expect(result.retrievalCoverage[1]).toMatchObject({ rejected: 3, rejectionCounts: { row_not_object: 3 } });
    expect(result.partialRetrieval).toBe(true); expect(result.retrievalWarning).toMatch(/incomplete/i);
    assertAttempts(result, 1, 40, null);
    expect(browseCalls()).toHaveLength(2);
  });
  it.each(failedKinds)('keeps exact rows through failed fallback replies (%s) and measures every attempted tier', async (kind) => {
    const rows = activeProviderRows(1); let exactQuery: string | null = null;
    overrideBrowse((url) => {
      exactQuery ??= url.searchParams.get('q');
      if (url.searchParams.get('q') === exactQuery) return { ok: true, status: 200,
        json: async () => ({ itemSummaries: Number(url.searchParams.get('offset')) === 0 ? wire(rows) : [] }) };
      return failedReply(kind);
    });
    const result = await caller().getEbayData({ ...KOBE, includeVisualReview: false }) as Row;
    expect(result.error).toBeNull(); assertRetained(result, rows);
    const failed = result.debug.queryTierCount - 1;
    expect(failed).toBeGreaterThan(0); expect(result.debug.failedQueryCount).toBe(failed);
    expect(result.debug.failedQueries.every((failure: Row) => failure.tier > 0 && failure.offset === 0)).toBe(true);
    expect(result.partialRetrieval).toBe(true); expect(result.debug.queryTierCount).toBeLessThanOrEqual(EBAY_ACTIVE_QUERY_TIER_LIMIT);
    expect(result.debug.executedQueries.length).toBe(result.debug.queryTierCount);
    expect(result.debug).toMatchObject({ exactTierPageCount: 2, exactTierOffsets: [0, 40], exactTierFailedOffsets: [] });
    expect(result.retrievalCoverage.filter((attempt: Row) => attempt.tier > 0).every((attempt: Row) => attempt.offset === 0 && attempt.status === 'error')).toBe(true);
    assertAttempts(result, failed, 1, null);
    expect(browseCalls()).toHaveLength(2 + failed);
  });
  it.each(['first-page', 'later-page', 'fallback'])('retains mixed-array valid siblings and measures rejections on the actual %s reply', async (where) => {
    const rows = activeProviderRows(40); let exactQuery: string | null = null;
    overrideBrowse((url) => {
      exactQuery ??= url.searchParams.get('q');
      const exact = url.searchParams.get('q') === exactQuery;
      const offset = Number(url.searchParams.get('offset'));
      const mixed = where === 'first-page' ? exact && offset === 0
        : where === 'later-page' ? exact && offset === 40 : !exact;
      const items = mixed ? [...wire(rows.slice(1)), null, false, []]
        : exact && offset === 0 ? wire(where === 'first-page' ? [] : rows.slice(0, 1)) : [];
      return { ok: true, status: 200, json: async () => ({ itemSummaries: items }) };
    });
    const result = await caller().getEbayData({ ...KOBE, includeVisualReview: false }) as Row;
    expect(result.error).toBeNull(); expect(result.partialRetrieval).toBe(true);
    assertRetained(result, where === 'first-page' ? rows.slice(1) : rows);
    const mixedAttempts = result.retrievalCoverage.filter((attempt: Row) => attempt.rejected > 0);
    expect(mixedAttempts).toHaveLength(1);
    expect(mixedAttempts[0]).toMatchObject({ status: 'success', outcome: 'success_records', received: 42, accepted: 39,
      rejected: 3, rejectionCounts: { row_not_object: 3 }, offset: where === 'later-page' ? 40 : 0 });
    expect(where === 'fallback' ? mixedAttempts[0].tier > 0 : mixedAttempts[0].tier === 0).toBe(true);
    expect(result.debug.rejectedRowCount).toBe(3);
    expect(result.debug.failedQueryCount).toBe(0);
    expect(result.retrievalWarning).toMatch(/3 rejected malformed rows/i);
    const known = where === 'first-page' ? 42 : 43;
    assertAttempts(result, 0, known, known);
    // A short mixed page is not an empty page: the next exact offset is read.
    expect(result.debug.exactTierOffsets).toEqual(where === 'later-page' ? [0, 40, 80] : [0, 40]);
  });
  it('continues to a later bounded fallback after a failed tier, retaining both earlier and later valid rows', async () => {
    const rows = activeProviderRows(2); let exactQuery: string | null = null; let failedQuery: string | null = null;
    overrideBrowse((url) => {
      exactQuery ??= url.searchParams.get('q');
      if (url.searchParams.get('q') === exactQuery) return { ok: true, status: 200,
        json: async () => ({ itemSummaries: Number(url.searchParams.get('offset')) === 0 ? wire(rows.slice(0, 1)) : [] }) };
      failedQuery ??= url.searchParams.get('q');
      if (url.searchParams.get('q') === failedQuery) return failedReply('sensitive-error');
      return { ok: true, status: 200, json: async () => ({ itemSummaries: wire(rows.slice(1)) }) };
    });
    const result = await caller().getEbayData({ ...KOBE, includeVisualReview: false }) as Row;
    expect(result.error).toBeNull(); assertRetained(result, rows);
    expect(result.retrievalCoverage.some((attempt: Row) => attempt.tier > 1 && attempt.status === 'success')).toBe(true);
    assertAttempts(result, 1, result.retrievalCoverage.reduce((sum: number, attempt: Row) => sum + (attempt.received ?? 0), 0), null);
  });
  it('bounds all-fallback failures by the exact-page allowance plus one request per fallback tier', async () => {
    const rows = activeProviderRows(1); let exactQuery: string | null = null;
    overrideBrowse((url) => {
      exactQuery ??= url.searchParams.get('q');
      return url.searchParams.get('q') === exactQuery
        ? { ok: true, status: 200, json: async () => ({ itemSummaries: wire(rows) }) } : failedReply('non-error');
    });
    const result = await caller().getEbayData({ ...KOBE, includeVisualReview: false }) as Row;
    expect(result.error).toBeNull(); assertRetained(result, rows);
    const failed = result.debug.queryTierCount - 1;
    expect(failed).toBeGreaterThan(0);
    expect(result.debug.exactTierPageCount).toBe(EBAY_ACTIVE_EXACT_PAGE_LIMIT);
    expect(browseCalls()).toHaveLength(EBAY_ACTIVE_EXACT_PAGE_LIMIT + failed);
    assertAttempts(result, failed, EBAY_ACTIVE_EXACT_PAGE_LIMIT, null);
  });
  it('exact-empty plus failed fallback is partial-empty copy, never an unqualified no-listings claim', async () => {
    let exactQuery: string | null = null;
    overrideBrowse((url) => {
      exactQuery ??= url.searchParams.get('q');
      return url.searchParams.get('q') === exactQuery
        ? { ok: true, status: 200, json: async () => ({ itemSummaries: [] }) } : failedReply('structured-errors');
    });
    const result = await caller().getEbayData({ ...KOBE, includeVisualReview: false }) as Row;
    expect(result.error).toBeNull(); expect(result.listings).toEqual([]);
    expect(result.partialRetrieval).toBe(true); expect(result.retrievalWarning).toMatch(/incomplete/i);
    assertAttempts(result, result.debug.queryTierCount - 1, 0, null);
    const emptyCopy = sourceRetainedEmptyMessage(result, 0, 'eBay');
    expect(emptyCopy).toMatch(/No usable retained candidates.*do not establish zero marketplace matches/i);
    expect(emptyCopy).not.toMatch(/No listings found|No completed eBay records found/i);
  });
});

describe('Stage 4 ACTUAL source route population and display projections', () => {
  it('Sold-Comps no-target route uses one population across raw-hard, assessment-hard and shared context copies', async () => {
    soldRows = providerRows(4);
    soldRows[0].title = '1996 Topps Kobe Bryant #139 PSA 10'; // outer raw number gate
    soldRows[1].lotQuantity = 2; // assessment gate
    soldRows[2].thumbnailUrl = null; soldRows[2].imageUrl = null;
    const result = await caller().getSoldCompsData(KOBE) as unknown as Row;
    expect(result.error).toBeNull();
    expect(result.audit.rawReceived).toBe(4);
    const rows = result.audit.ledger as Row[];
    const occurrences = assertPopulation(rows, 4, 'ebay_sold_comps');
    expect(occurrences.size).toBe(4);
    expect(rows.find((row) => row.saleId === soldRows[0].saleId).evidenceDisposition).toBe('rejected_objective_conflict');
    expect(rows.find((row) => row.saleId === soldRows[1].saleId).evidenceDisposition).toBe('rejected_objective_conflict');
    expect(boundaries.llm).not.toHaveBeenCalled();
    expect([...occurrences.values()].every((row) => !row.identityApproval)).toBe(true);
  });

  it('Sold-Comps completed ACTUAL visual review and actual A/B transport retain awards/rank; signing remains genuine', async () => {
    soldRows = providerRows(3).map((row, index) => ({ ...row, soldPrice: String(6000 + index) }));
    soldRows[0].soldPrice = '100000'; // hard price gate, identical metadata score still displays rank 1
    allowVisual = true;
    const input = buildSoldCompsApprovalInput({ ...KOBE, imageUrl: PRIMARY, statedTradeValue: 20000 }, KOBE);
    const result = await caller().getSoldCompsData(input) as unknown as Row;
    expect(result.error).toBeNull();
    const all = result.audit.ledger as Row[];
    assertPopulation(all, 3, 'ebay_sold_comps');
    expect(result.listings).toHaveLength(2);
    expect(result.listings.map((row: Row) => row.metadataMatchRank)).toEqual([2, 3]);
    expect(boundaries.llm).toHaveBeenCalled();
    for (const row of result.listings) {
      expect(row.identityApproval).toBeTruthy();
      expect(verifyCanonicalObservation(wire(row), { now: NOW }).verified).toBe(true);
    }
    const itemA = buildSoldCompsAnalysisSales(result, true);
    const itemB = buildSoldCompsAnalysisSales(result, true);
    expect(itemA).toEqual(itemB);
    for (const [index, row] of result.listings.entries()) {
      expect(itemA[index].metadataRanking).toEqual(row.metadataRanking);
      expect(itemB[index].metadataScoreAwards).toEqual(row.metadataScoreAwards);
      expect(itemB[index].metadataFieldComparisons).toEqual(row.metadataFieldComparisons);
    }
  });

  it('Active response and separate review whitelist carry same occurrences despite existing outer hard partitions', async () => {
    activeRows = providerRows(3).map((row) => ({ ...row, itemId: row.id, itemWebUrl: row.url,
      price: { value: row.soldPrice, currency: 'USD' }, buyingOptions: ['FIXED_PRICE'], image: { imageUrl: row.thumbnailUrl } }));
    activeRows[0].title = '1996 Topps Kobe Bryant #139 PSA 10';
    activeRows[1].lotQuantity = 2;
    const result = await caller().getEbayData({ ...KOBE, includeVisualReview: false }) as unknown as Row;
    expect(result.error).toBeNull();
    const all = [...result.listings, ...result.visualReviewListings, ...result.preVisionFilter.excludedListings,
      ...result.visualFilter.contextListings] as Row[];
    expect(assertPopulation(all, 3, 'ebay_active').size).toBe(3);
    expect(result.preVisionFilter.excludedListings).toHaveLength(2);
    expect(boundaries.llm).not.toHaveBeenCalled();
    for (const row of result.visualReviewListings) {
      const same = all.find((candidate) => binding(candidate).occurrenceKey === binding(row).occurrenceKey);
      expect(row.metadataRanking).toEqual(same.metadataRanking);
      expect(row.metadataScoreAwards).toEqual(same.metadataScoreAwards);
    }
  });

  it('Mercari Video Games no-target and provider-outage copies preserve full available population including duplicate ledgers', async () => {
    const mercariRows = providerRows(3).map((row, index) => ({ ...row,
      title: index === 0 ? '1987 The Legend of Zelda SNES PSA 7.5 CIB' : '1987 The Legend of Zelda NES PSA 7.5 CIB',
      itemUrl: `https://www.mercari.com/us/item/stage4-${index}/`, price: 100 + index, currency: 'USD',
      sourceId: 'mercari_sold_comps', sourceLabel: 'Sold-Comps (Mercari Sold)', marketplace: 'Mercari',
      status: 'sold',
      itemSpecifics: { Platform: index === 0 ? 'SNES' : 'NES' }, evidenceDisposition: 'warning_review', evidenceReasons: [] }));
    boundaries.mercari.mockResolvedValue({ query: ZELDA.title, listings: mercariRows, metrics: null, error: null });
    const noTarget = await caller().getMercariSoldCompsData(ZELDA) as unknown as Row;
    expect(assertPopulation(noTarget.audit.ledger, 3, 'mercari_sold_comps').size).toBe(3);
    expect(boundaries.llm).not.toHaveBeenCalled();
    const outage = await caller().getMercariSoldCompsData({ ...ZELDA, imageUrl: PRIMARY }) as unknown as Row;
    expect(assertPopulation(outage.audit.ledger, 3, 'mercari_sold_comps').size).toBe(3);
    expect(boundaries.llm).toHaveBeenCalled();
    expect(outage.audit.ledger.every((row: Row) => !row.identityApproval)).toBe(true);
    const noTargetById = new Map((noTarget.audit.ledger as Row[]).map((row) => [row.saleId, row]));
    for (const row of outage.audit.ledger) {
      expect(row.metadataMatchScore).toBe(noTargetById.get(row.saleId)!.metadataMatchScore);
      expect(row.metadataMatchRank).toBe(noTargetById.get(row.saleId)!.metadataMatchRank);
      expect(row.metadataScoreAwards).toEqual(noTargetById.get(row.saleId)!.metadataScoreAwards);
    }
  });

  it('subset route never trusts browser ranks/scores/awards; only originating occurrence hint survives for local client merge', async () => {
    const requestRows = providerRows(2).map((row, index) => ({ ...row,
      metadataMatchScore: index ? 1000000 : -99, metadataMatchRank: index ? 1 : 999,
      metadataScoreAwards: [{ field: 'browser-fake', awardedPoints: 100 }],
      metadataRanking: { populationId: 'browser-parent', sourceId: 'ebay_active', occurrenceKey: `parent-${index}`,
        ordinal: index, populationSize: 999, scorerRole: 'exact_comparable', score: 1000000, rank: 1 } }));
    const pageDto = buildEbayVisualReviewListings({ visualReviewListings: requestRows });
    expect(pageDto[0].metadataRanking.occurrenceKey).toBe('parent-0');
    expect(pageDto[0]).not.toHaveProperty('metadataScoreAwards');
    const result = await caller().reviewEbayVisualData({ targetImageUrl: PRIMARY,
      targetMetadata: 'title=1996 Topps Kobe Bryant #138 PSA 10; category=sports_cards; itemType=single_card; grade=10; certificationCompany=PSA; fullItemDetails={"year":"1996","manufacturer":"Topps","player":"Kobe Bryant","cardNumber":"138"}',
      listings: pageDto.map((row, index) => ({ ...row, metadataMatchScore: requestRows[index].metadataMatchScore, metadataMatchRank: requestRows[index].metadataMatchRank, metadataScoreAwards: requestRows[index].metadataScoreAwards })) }) as unknown as Row;
    const all = [...result.listings, ...(result.visualFilter.contextListings ?? [])] as Row[];
    expect(assertPopulation(all, 2, 'ebay_active_subset').size).toBe(2);
    expect(all.map((row) => row.metadataMatchRank)).toEqual([1, 2]);
    for (const row of all) {
      expect(binding(row).populationId).not.toBe('browser-parent');
      expect(row.metadataScoreAwards.some((award: Row) => award.field === 'browser-fake')).toBe(false);
      const index = Number(String(row.id).split('-').pop());
      expect(row.metadataOriginOccurrenceKey).toBe(`parent-${index}`);
      const knownBase = { ...requestRows[index], metadataMatchScore: 88, metadataMatchRank: 12 + index,
        metadataRanking: { ...requestRows[index].metadataRanking, score: 88, rank: 12 + index } };
      const merged = retainOriginDisplayRanking(knownBase, row);
      expect(merged.metadataMatchRank).toBe(12 + index);
      expect(merged.visualReviewStatus).toBe(row.visualReviewStatus);
      expect(merged.evidenceDisposition).toBe(row.evidenceDisposition);
      expect(row.identityApproval).toBeUndefined();
    }
  });

  it('keeps source runs separate and Collection/Lot source guard nonranking with no provider/model calls', async () => {
    soldRows = providerRows(1);
    const a = await caller().getSoldCompsData(KOBE) as unknown as Row;
    const b = await caller().getSoldCompsData(KOBE) as unknown as Row;
    expect(binding(a.audit.ledger[0]).populationId).not.toBe(binding(b.audit.ledger[0]).populationId);
    vi.clearAllMocks();
    const lot = await caller().getSoldCompsData({ ...KOBE, itemType: 'collection_lot' }) as unknown as Row;
    expect(lot).toMatchObject({ status: 'not_comparable', comparable: false });
    expect(lot.message).toContain('Collection/Lot');
    expect(lot).not.toHaveProperty('metadataRanking');
    expect(boundaries.fetch).not.toHaveBeenCalled();
    expect(boundaries.llm).not.toHaveBeenCalled();
  });

  it('preserves administrator gate on all actual source and subset routes before synthetic boundaries', async () => {
    await expect(caller('user').getSoldCompsData(KOBE)).rejects.toThrow();
    await expect(caller('user').getEbayData(KOBE)).rejects.toThrow();
    await expect(caller('user').getMercariSoldCompsData(ZELDA)).rejects.toThrow();
    await expect(caller('user').reviewEbayVisualData({ targetImageUrl: PRIMARY, targetMetadata: 'category=video_games', listings: [] })).rejects.toThrow();
    expect(boundaries.fetch).not.toHaveBeenCalled(); expect(boundaries.llm).not.toHaveBeenCalled();
    expect(boundaries.mercari).not.toHaveBeenCalled();
  });
});

describe('approved follow-up sold review opportunity at actual route boundaries', () => {
  it('ordinary sold route retains an eight-review Video Game opportunity and existing signed A/B authority', async () => {
    soldRows = providerRows(12).map((row, index) => ({ ...row, title: 'The Legend of Zelda NES CIB PSA 7.5',
      itemSpecifics: { Platform: 'NES' }, saleForm: 'single_game', soldPrice: String(100 + index) }));
    allowVisual = true;
    const result = await caller().getSoldCompsData(buildSoldCompsApprovalInput({ ...ZELDA, imageUrl: PRIMARY, statedTradeValue: 100 }, ZELDA)) as unknown as Row;
    expect(result.error).toBeNull();
    expect(result.visualFilter.reviewBudget).toMatchObject({ singleMarketplaceSalesRequirement: 6, requestedSelectionBudget: 8,
      selectedCount: 8, queuedCount: 8, dispatchedCount: 8, admittedCurrentSalesCount: null, verifiedCurrentSalesDeficit: null });
    expect(result.listings).toHaveLength(8); expect(result.audit.ledger).toHaveLength(12);
    expect(result.listings.every((row: Row) => row.identityApproval && verifyCanonicalObservation(wire(row), { now: NOW }).verified)).toBe(true);
    const itemA = buildSoldCompsAnalysisSales(result, true), itemB = buildSoldCompsAnalysisSales(wire(result), true);
    expect(itemA).toEqual(itemB); expect(itemA).toHaveLength(8);
    expect(result.audit.ledger.filter((row: Row) => row.visualExecution?.attempts?.length).map((row: Row) => row.metadataMatchRank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it('browser Active subset cannot opt into a sold-source opportunity or identity approval', async () => {
    allowVisual = true;
    const listings = providerRows(12).map((row, index) => ({ ...row, title: 'The Legend of Zelda NES CIB PSA 7.5',
      itemDetails: ZELDA.itemDetails, sourceLabel: 'eBay Sold-Comps', reviewBudgetRole: 'sold_source', metadataMatchScore: 1000000,
      saleStatus: 'completed', priceBasis: 'sold', itemSpecifics: { Platform: 'NES' }, id: `browser-budget-${index}` }));
    const result = await caller().reviewEbayVisualData({ targetImageUrl: PRIMARY,
      targetMetadata: 'title=The Legend of Zelda NES PSA 7.5; category=video_games; itemType=game; grade=7.5; certificationCompany=PSA; isGraded=Yes; fullItemDetails={"gameTitle":"The Legend of Zelda","platform":"NES","completeInBox":"Yes","sealed":"No"}',
      listings, reviewBudgetRole: 'sold_source' } as any) as unknown as Row;
    expect(result.visualFilter.reviewBudget).toBeUndefined();
    expect(result.visualFilter.visualExecutionCounts.selectedCandidateCount).toBeLessThan(8);
    expect([...result.listings, ...(result.visualFilter.contextListings ?? [])].every((row: Row) => !row.identityApproval)).toBe(true);
  });
});
