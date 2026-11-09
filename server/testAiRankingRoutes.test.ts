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
  lookupTcgplayerSoldComps: () => { boundaries.denied.push('TCGplayer'); throw new Error('Unconfigured provider forbidden'); } }));
import { testAIRouter } from './testAIRouter';
import { buildSoldCompsAnalysisSales, buildSoldCompsApprovalInput } from '../shared/testAiSoldCompsTransport';
import { retainOriginDisplayRanking } from '../shared/testAiRankingPopulation';
import { buildEbayVisualReviewListings } from '../shared/testAiRankingDisplay';
import { verifyCanonicalObservation } from './testAiCanonicalObservation';

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
