import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComparableTarget } from './testAiComparableEngine';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TestAiCandidateStatus, TestAiSourceRelevanceSummary } from '../client/src/components/TestAiCandidateStatus';

// ONLY for the reviewed isolated Stage 6 importer. All unrelated provider/DB/
// model modules remain throwing virtual dependencies. These named lookup mocks
// supply actual adapter-shaped rows; they do NOT test the adapters' HTTP/parser.
// Router, mapping, visual policy, signer, verifier, normalizer and scorer are real.
const boundaries = vi.hoisted(() => ({
  card: vi.fn(), cardsight: vi.fn(), lelands: vi.fn(), pristine: vi.fn(), comic: vi.fn(), specialist: vi.fn(),
  fetch: vi.fn(), llm: vi.fn(), denied: [] as string[],
}));
vi.mock('./_core/env', () => ({ ENV: { jwtSecret: 'stage6-named-route-synthetic-signing-key-not-a-service-credential', appId: 'stage6-source-route-test' } }));
vi.mock('./_core/llm', () => ({ invokeLLM: boundaries.llm }));
vi.mock('./theCardApi', () => ({ lookupTheCardApi: boundaries.card }));
vi.mock('./cardsightAi', () => ({ lookupCardsightAi: boundaries.cardsight }));
vi.mock('./parseAuctionMarketData', () => ({ lookupLelandsAuctions: boundaries.lelands, lookupPristineAuctions: boundaries.pristine,
  lookupCollectAuctions: () => { throw new Error('Unconfigured Collect acquisition forbidden'); } }));
vi.mock('./comicConnectMarketData', () => ({ lookupComicConnectSold: boundaries.comic }));
vi.mock('./specialistMarketplaceMarketData', () => ({ lookupSpecialistMarketplace: boundaries.specialist }));
import { testAIRouter } from './testAIRouter';
import { verifyCanonicalObservation, getVerifiedIdentityApproval } from './testAiCanonicalObservation';
import { normalizeAnalysisMarketSale } from './testAiMarketEvidence';
import { buildMarketProfile } from './testAiComparableEngine';
import { buildSoldCompsAnalysisSales } from '../shared/testAiSoldCompsTransport';

const NOW = new Date('2026-11-09T12:00:00.000Z');
const SIGNING_KEY = 'stage6-named-route-synthetic-signing-key-not-a-service-credential';
const PROVIDER_KEY = 'stage6-source-synthetic-http-key-not-a-service-credential';
const IMAGE = 'https://example.test/stage6/source-target.jpg';
const CARD = { title: '1996 Topps Kobe Bryant #138 PSA 10', category: 'sports_cards', itemType: 'single_card',
  grade: '10', certificationCompany: 'PSA', imageUrl: IMAGE,
  itemDetails: JSON.stringify({ year: '1996', manufacturer: 'Topps', player: 'Kobe Bryant', cardNumber: '138' }) };
const SIGNED = { title: 'Muhammad Ali signed boxing glove', category: 'autographs', itemType: 'signed_item',
  certificationCompany: 'Beckett Authentication Services',
  itemDetails: JSON.stringify({ signer: 'Muhammad Ali', signedItemType: 'Boxing Glove', authenticationCompany: 'Beckett Authentication Services' }) };
const ART = { title: 'John Byrne original comic art', category: 'comics', itemType: 'original_art',
  itemDetails: JSON.stringify({ artist: 'John Byrne', comicTitle: 'X-Men', artType: 'Published Page' }) };
const COMIC = { title: 'Amazing Spider-Man #300 CGC 9.8', category: 'comics', itemType: 'single_comic',
  grade: '9.8', certificationCompany: 'CGC', itemDetails: JSON.stringify({ comicTitle: 'Amazing Spider-Man', issueNumber: '300', year: '1988' }) };
type Row = Record<string, any>;
const wire = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const caller = (role = 'admin') => testAIRouter.createCaller({ user: { id: 1, role } as any, req: { headers: {} } as any, res: {} as any });
let providerRows: Row[] = [];
let laterEbayFailure = false;
let ebayCalls = 0;
function row(id: string, patch: Row = {}): Row {
  return { title: CARD.title, saleId: id, lotId: id, id, price: 120, currency: 'USD', date: '2026-11-01T00:00:00.000Z',
    url: `https://synthetic.invalid/lot/${id}`, imageUrl: `https://example.test/stage6/${id}.jpg`,
    completed: true, confirmed: true, saleStatus: 'completed', priceBasis: 'sold', identityMatched: true,
    valuationEligible: true, raw: { sentinel: `actual-raw-${id}` }, ...patch };
}
function result(sales: Row[], context: Row[] = [], patch: Row = {}) {
  return { status: 'success', query: 'unchanged synthetic acquisition query', sales, context,
    messages: ['synthetic provider message'], raw: { sentinel: 'provider-envelope' }, ...patch };
}
// Exact normalized keys from the actual adapter return expressions, without the
// common row() superset's saleId/id/confirmed/valuationEligible/evidence aliases.
// This remains a lookup-fixture boundary, NOT upstream HTTP/parser validation.
function lelandsRow(id: string, patch: Row = {}): Row {
  const sale = { sourceId: 'lelands', provider: 'Lelands via Parse.bot', title: CARD.title,
    url: `https://synthetic.invalid/lelands/lot/${id}`, lotId: id, auctionName: null, category: null,
    description: null, imageUrl: IMAGE, imageUrls: [], status: 'sold', sold: true, price: 120, currency: 'USD',
    priceBasis: 'sold_for_price_including_buyers_premium', buyersPremiumIncluded: true,
    date: '2026-11-01T00:00:00.000Z', datePrecision: 'auction_end', grader: 'PSA', grade: '10',
    bidCount: null, finalAmount: 120, identityMatched: true, identityScore: 1, matchedTokens: ['kobe', 'bryant'],
    saleStatus: 'completed', completed: true,
    priceSemantics: 'Lelands SOLD FOR amount including buyer premium; candidate only after identity and evidence gates.', ...patch };
  return { ...sale, raw: { item_id: id, source_url: sale.url, sale: { title: sale.title, status: sale.status,
    final_amount: sale.finalAmount, currency: sale.currency, price_basis: sale.priceBasis,
    buyer_premium_included: sale.buyersPremiumIncluded, sale_datetime: sale.date, grader: sale.grader, grade: sale.grade } } };
}
function pristineRow(id: string, patch: Row = {}): Row {
  const sale = { sourceId: 'pristine_auction', provider: 'Pristine Auction via Parse.bot', title: CARD.title,
    url: `https://synthetic.invalid/pristine/lot/${id}`, lotId: id, subtitle: null, imageUrl: IMAGE,
    status: 'completed', sold: true, completed: true, price: 120, winningBid: 100, buyerPremium: 20, totalPrice: 120,
    currency: 'USD', priceBasis: 'hammer_plus_premium', date: '2026-11-01T00:00:00.000Z', datePrecision: 'completed_at',
    bidCount: null, grader: 'PSA', grade: '10', identityMatched: true, identityScore: 1, matchedTokens: ['kobe', 'bryant'],
    saleStatus: 'completed', priceSemantics: 'Pristine winning bid and all-in total; candidate only after identity and evidence gates.', ...patch };
  return { ...sale, raw: { title: sale.title, url: sale.url, lot_id: id, status: sale.status, sold: sale.sold,
    winning_bid: sale.winningBid, buyer_premium: sale.buyerPremium, total_price: sale.totalPrice,
    currency: sale.currency, price_basis: sale.priceBasis, completed_at: sale.date, grader: sale.grader, grade: sale.grade } };
}
function auctionResult(source: 'lelands' | 'pristine_auction', sales: Row[], context: Row[] = [], patch: Row = {}): Row {
  return { source, status: 'success', query: 'unchanged synthetic auction query', sales, context,
    messages: ['Synthetic archived detail observations; existing identity and evidence gates remain.'],
    raw: { search: { synthetic: source }, details: [...sales, ...context].map((sale) => sale.raw) }, visualFilter: null, ...patch };
}
function weissRow(id: string, patch: Row = {}): Row {
  return { sourceId: 'weiss', provider: 'Weiss Auctions', title: 'Muhammad Ali Signed EVERLAST Boxing Glove PSA/DNA',
    description: null, lotId: id, auctionName: null, url: `https://synthetic.invalid/weiss/lot/${id}`, imageUrl: IMAGE,
    saleStatus: 'completed', completed: true, price: 120, currency: 'USD', date: '2026-11-01T00:00:00.000Z',
    grade: null, certificationCompany: 'PSA/DNA', priceBasis: 'closed', buyerPremiumIncluded: false,
    winningBid: 120, buyerPremiumPercentage: null, identityMatched: true, matchedTokens: ['muhammad', 'ali'],
    exclusionReason: null, valuationEligible: true, ...patch };
}
function verify(sale: Row) {
  const verified = verifyCanonicalObservation(wire(sale), { now: NOW, signingKey: SIGNING_KEY });
  expect(verified.verified).toBe(true);
  expect(sale.provenance).toMatchObject({ version: '2.9.0', policyVersion: '2.9.0' });
  expect(sale.identityApproval).toBeUndefined();
  expect(getVerifiedIdentityApproval(verified.sale, CARD)).toBeNull();
  return verified.sale;
}
function expectHeld(sales: Row[], target: ComparableTarget = CARD) {
  const normalized = sales.map((sale) => {
    const decision = normalizeAnalysisMarketSale(wire(sale), NOW, { signingKey: SIGNING_KEY, target, category: target.category });
    expect(decision.valuationEligible).toBe(false);
    expect(decision.sale.evidenceDisposition).not.toBe('valuation_eligible');
    return decision.sale;
  });
  const profile = buildMarketProfile(target, normalized, null, NOW);
  expect(profile.authoritativeSaleCount).toBe(0); expect(profile.primaryValue).toBeNull();
  return normalized;
}
function sourceRows(source: Row) { return [...(source.sales ?? []), ...(source.context ?? [])]; }

beforeEach(() => {
  vi.clearAllMocks(); boundaries.denied.length = 0; providerRows = []; laterEbayFailure = false; ebayCalls = 0;
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(NOW);
  vi.stubEnv('SOLD_COMPS_API_KEY', PROVIDER_KEY); vi.stubEnv('SOLID_COMPS_API_KEY', '');
  vi.stubEnv('EBAY_PROD_CLIENT_ID', ''); vi.stubEnv('EBAY_PROD_CLIENT_SECRET', '');
  for (const lookup of [boundaries.card, boundaries.cardsight, boundaries.lelands, boundaries.pristine, boundaries.comic, boundaries.specialist])
    lookup.mockImplementation(() => { throw new Error('Unconfigured named provider fixture'); });
  boundaries.fetch.mockImplementation(async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.origin !== 'https://api.sold-comps.com' || url.pathname !== '/v1/scrape'
      || !url.searchParams.get('keyword') || url.searchParams.get('count') !== '100'
      || url.searchParams.get('sortOrder') !== 'endedRecently' || url.searchParams.get('ebaySite') !== 'ebay.com'
      || new Headers(init?.headers).get('Authorization') !== `Bearer ${PROVIDER_KEY}`) {
      boundaries.denied.push('unconfigured HTTP'); throw new Error('HTTP forbidden outside configured synthetic special eBay source');
    }
    ebayCalls += 1;
    if (laterEbayFailure && ebayCalls > 1) return { ok: false, status: 503, text: async () => 'Synthetic later-query failure' };
    return { ok: true, status: 200, json: async () => ({ items: wire(providerRows) }), text: async () => 'Synthetic eBay response' };
  });
  vi.stubGlobal('fetch', boundaries.fetch);
  boundaries.llm.mockImplementation(async (request: Row) => {
    const system = request.messages?.[0]?.content;
    const text = Array.isArray(system) ? system.filter((part: Row) => part.type === 'text').map((part: Row) => part.text).join('\n') : '';
    const index = text.match(/CANDIDATE (\d+): title=/)?.[1];
    if (!text.includes('strict visual identity reviewer') || index === undefined) {
      boundaries.denied.push('unconfigured model request'); throw new Error('Only configured synthetic final image result permitted');
    }
    return { choices: [{ message: { content: JSON.stringify({ reviews: [{ candidateIndex: Number(index), verdict: 'match', confidence: 'high',
      rationale: 'Synthetic deciding pixels confirm card identity and grading label.', visualDifferences: [],
      visualEvidence: { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true,
        gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, artworkMatches: true } }] }) } }] };
  });
});
afterEach(() => {
  try { expect(boundaries.denied).toEqual([]); }
  finally { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); }
});

describe('Stage 6 ACTUAL named source routes and restrictive source-fact sealing', () => {
  it('maps The Card API actual confirmed eBay versus Goldin origin after unchanged real visual filter', async () => {
    boundaries.card.mockResolvedValue(result([row('card-ebay', { platform: 'eBay', listing_type: 'best_offer', original_price: 180 }),
      row('card-goldin', { platform: 'Goldin', buyerPremiumPercentage: 25 })]));
    const source = await caller().getTheCardApiData(CARD) as Row;
    expect(boundaries.card).toHaveBeenCalledWith(CARD);
    expect(sourceRows(source)).toHaveLength(2);
    const ebay = sourceRows(source).find((sale) => sale.saleId === 'card-ebay')!;
    const goldin = sourceRows(source).find((sale) => sale.saleId === 'card-goldin')!;
    expect(verify(ebay)).toMatchObject({ originMarketplace: 'ebay', price: 120, priceBasis: 'sold', buyerPremium: 'included' });
    expect(ebay).toMatchObject({ original_price: 180, listing_type: 'best_offer' });
    expect(verify(goldin)).toMatchObject({ originMarketplace: 'goldin', price: 120, priceBasis: 'realized', buyerPremium: 'excluded' });
    expectHeld(sourceRows(source));
    expect(boundaries.llm).toHaveBeenCalled(); expect(boundaries.fetch).not.toHaveBeenCalled();
    expect(sourceRows(source).some((sale) => sale.visualRequirement === 'required')).toBe(true);
  });
  it('retains The Card API partial source status/raw/messages and both actual no-image partitions', async () => {
    boundaries.card.mockResolvedValue(result([row('partial-good', { platform: 'eBay' }), row('partial-conflict', { platform: 'Goldin', title: '1996 Topps Kobe Bryant #139 PSA 10' })], [],
      { status: 'partial', messages: ['synthetic catalog failed; sales retained'], audit: { issue: 'synthetic partial receipt' } }));
    const source = await caller().getTheCardApiData({ ...CARD, imageUrl: undefined }) as Row;
    expect(source).toMatchObject({ status: 'partial', raw: { sentinel: 'provider-envelope' }, audit: { issue: 'synthetic partial receipt' },
      messages: ['synthetic catalog failed; sales retained'] });
    expect(source.sales).toHaveLength(0); expect(source.context).toHaveLength(2);
    for (const sale of source.context) { verify(sale); expect(sale.raw.sentinel).toContain('actual-raw-'); }
    expectHeld(source.context); expect(boundaries.llm).not.toHaveBeenCalled();
  });
  it.each(['getTheCardApiData', 'getCardsightAiData', 'getLelandsAuctionData', 'getPristineAuctionData'] as const)
  ('preserves actual empty error partition for %s without manufacturing a sale or request', async (route) => {
    const lookup = route === 'getTheCardApiData' ? boundaries.card : route === 'getCardsightAiData' ? boundaries.cardsight
      : route === 'getLelandsAuctionData' ? boundaries.lelands : boundaries.pristine;
    lookup.mockResolvedValue(result([], [], { status: 'error', messages: ['synthetic acquisition error'] }));
    const source = await caller()[route](CARD) as Row;
    expect(source).toMatchObject({ status: 'error', sales: [], context: [], messages: ['synthetic acquisition error'] });
    expect(boundaries.llm).not.toHaveBeenCalled(); expect(boundaries.fetch).not.toHaveBeenCalled();
  });
  it('keeps Cardsight bid-side and active BIN context after actual final visual result', async () => {
    boundaries.cardsight.mockResolvedValue(result([row('bid', { listingType: 'auction', saleId: null }),
      row('bin', { listingType: 'fixed', completed: false, saleStatus: 'active' })], [], { activeListings: [row('active-context')] }));
    const source = await caller().getCardsightAiData(CARD) as Row;
    const bid = sourceRows(source).find((sale) => sale.id === 'bid')!;
    const bin = sourceRows(source).find((sale) => sale.id === 'bin')!;
    expect(verify(bid)).toMatchObject({ saleStatus: 'completed', priceBasis: 'realized', buyerPremium: 'unknown' });
    expect(verify(bin)).toMatchObject({ saleStatus: 'active', priceBasis: 'unknown', buyerPremium: 'unknown' });
    expect(source.activeListings).toHaveLength(1); expectHeld(sourceRows(source));
  });
  it('uses actual Lelands flags and retains existing provider-context plus review-context in partial response', async () => {
    boundaries.lelands.mockResolvedValue(result([row('lelands-true', { buyersPremiumIncluded: true }),
      row('lelands-false', { buyersPremiumIncluded: false }), row('lelands-null', { buyersPremiumIncluded: null })],
      [row('lelands-provider-held', { completed: false, saleStatus: 'unknown', exclusionReason: 'actual provider no completed amount' })],
      { status: 'partial', messages: ['synthetic later-detail error; earlier rows retained'] }));
    const source = await caller().getLelandsAuctionData({ ...CARD, imageUrl: undefined }) as Row;
    expect(source.status).toBe('partial'); expect(sourceRows(source)).toHaveLength(4);
    const byId = new Map(sourceRows(source).map((sale) => [sale.saleId, verify(sale)]));
    expect(byId.get('lelands-true')?.buyerPremium).toBe('included');
    expect(byId.get('lelands-false')?.buyerPremium).toBe('excluded');
    expect(byId.get('lelands-null')?.buyerPremium).toBe('unknown');
    expect(byId.get('lelands-provider-held')?.evidenceDisposition).toBe('context_only');
    expectHeld(sourceRows(source)); expect(boundaries.llm).not.toHaveBeenCalled();
  });
  it('requires selected positive Pristine total without double premium or losing malformed context metadata', async () => {
    boundaries.pristine.mockResolvedValue(result([pristineRow('valid-total'),
      row('missing-total', { totalPrice: null, winningBid: 120 }), row('zero-total', { totalPrice: 0 }),
      row('different-total', { totalPrice: 150 })], [row('provider-context', { totalPrice: { invalid: true }, exclusionReason: 'actual detail error' })],
      { status: 'partial', messages: ['synthetic detail issue'] }));
    const source = await caller().getPristineAuctionData({ ...CARD, imageUrl: undefined }) as Row;
    expect(sourceRows(source)).toHaveLength(5); expect(source.status).toBe('partial');
    for (const sale of sourceRows(source)) {
      const actual = verify(sale); expect(actual.price).toBe(120);
      expect(actual.buyerPremium).toBe(sale.saleId === 'valid-total' ? 'included' : 'unknown');
    }
    expect(source.context.find((sale: Row) => sale.saleId === 'provider-context').totalPrice).toEqual({ invalid: true });
    expectHeld(sourceRows(source));
  });
  it.each(['lelands', 'pristine_auction'] as const)
  ('preserves exact compatible %s full-total economics and unchanged required visual policy', async (adapter) => {
    const raw = adapter === 'lelands' ? lelandsRow('actual-compatible') : pristineRow('actual-compatible', { totalPrice: '120.00' });
    for (const key of ['saleId', 'id', 'confirmed', 'valuationEligible', 'evidenceDisposition', 'visualRequirement']) expect(raw).not.toHaveProperty(key);
    const lookup = adapter === 'lelands' ? boundaries.lelands : boundaries.pristine;
    const route = adapter === 'lelands' ? 'getLelandsAuctionData' : 'getPristineAuctionData';
    lookup.mockResolvedValue(auctionResult(adapter, [raw]));
    const source = await caller()[route](CARD) as Row;
    expect(lookup).toHaveBeenCalledTimes(1); expect(lookup).toHaveBeenCalledWith(CARD);
    expect(sourceRows(source)).toHaveLength(1);
    const sale = sourceRows(source)[0];
    expect(verify(sale)).toMatchObject({ saleId: raw.lotId, price: 120, priceBasis: 'realized', buyerPremium: 'included', visualRequirement: 'required' });
    expect(sale.raw).toEqual(raw.raw);
    if (adapter === 'pristine_auction') expect(sale).toMatchObject({ totalPrice: '120.00', winningBid: 100 });
    else expect(sale.finalAmount).toBe(120);
    expectHeld([sale]); expect(boundaries.llm).toHaveBeenCalled(); expect(boundaries.fetch).not.toHaveBeenCalled();
  });
  it.each([
    ['lelands', { priceBasis: 'hammer' }], ['lelands', { priceBasis: 'buyer_premium_excluded' }],
    ['pristine_auction', { priceBasis: 'hammer' }], ['pristine_auction', { priceBasis: 'buyer_premium_excluded' }],
    ['pristine_auction', { winningBid: 120 }], ['pristine_auction', { winningBid: '120.00', buyerPremium: '20.00' }],
    ['pristine_auction', { priceBasis: 'hammer', winningBid: 120, buyerPremium: 20 }],
  ] as const)('seals actual %s explicit contradiction %# restrictively without fee math, new selection, or dispatch', async (adapter, patch) => {
    const raw = adapter === 'lelands' ? lelandsRow('actual-contradiction', patch) : pristineRow('actual-contradiction', patch);
    const lookup = adapter === 'lelands' ? boundaries.lelands : boundaries.pristine;
    const route = adapter === 'lelands' ? 'getLelandsAuctionData' : 'getPristineAuctionData';
    lookup.mockResolvedValue(auctionResult(adapter, [raw]));
    const source = await caller()[route]({ ...CARD, imageUrl: undefined }) as Row;
    expect(lookup).toHaveBeenCalledTimes(1); expect(sourceRows(source)).toHaveLength(1);
    const sale = sourceRows(source)[0];
    expect(verify(sale)).toMatchObject({ saleId: raw.lotId, price: 120, buyerPremium: 'excluded', evidenceDisposition: 'context_only' });
    expect(sale.raw).toEqual(raw.raw); expect(sale.sourceEconomics.convention).toBe('hammer_excluded');
    if (adapter === 'pristine_auction') expect(sale).toMatchObject({ totalPrice: 120, winningBid: raw.winningBid });
    else expect(sale.finalAmount).toBe(120);
    const forged = wire({ ...sale, buyerPremium: 'included', evidenceDisposition: 'valuation_eligible', valuationEligible: true });
    expect(normalizeAnalysisMarketSale(forged, NOW, { signingKey: SIGNING_KEY, target: CARD }).valuationEligible).toBe(false);
    const html = renderToStaticMarkup(createElement(TestAiCandidateStatus, { listing: sale }));
    for (const label of ['Execution:', 'Identity result:', 'Pricing use:', 'Source amount convention:', 'hammer excluded', 'Source context / review']) expect(html).toContain(label);
    expect(html).toContain(adapter === 'lelands' ? 'cannot be overwritten' : 'contradicts included-total use');
    expectHeld([sale]); expect(boundaries.llm).not.toHaveBeenCalled(); expect(boundaries.fetch).not.toHaveBeenCalled();
  });
  it.each(['lelands', 'pristine_auction'] as const)
  ('maps and seals successful actual %s context-only output without manufacturing sales or image dispatch', async (adapter) => {
    const fixture = adapter === 'lelands' ? lelandsRow : pristineRow;
    // lookupSource marks a completed wrong-identity detail completed:false but
    // retains the observed sold status, amount, date, URL, premium and raw detail.
    const wrongIdentity = fixture('actual-wrong-identity', { title: '1996 Topps Kobe Bryant #139 PSA 10',
      identityMatched: false, identityScore: 0, matchedTokens: [], completed: false, valuationEligible: false });
    const incomplete = fixture('actual-incomplete', { status: 'active', saleStatus: 'active', sold: false,
      completed: false, price: null, identityMatched: false, valuationEligible: false });
    const incoming = auctionResult(adapter, [], [wrongIdentity, incomplete]);
    const lookup = adapter === 'lelands' ? boundaries.lelands : boundaries.pristine;
    const route = adapter === 'lelands' ? 'getLelandsAuctionData' : 'getPristineAuctionData';
    lookup.mockResolvedValue(incoming);
    const source = await caller()[route](CARD) as Row;
    expect(lookup).toHaveBeenCalledTimes(1); expect(lookup).toHaveBeenCalledWith(CARD);
    expect(source).toMatchObject({ status: 'success', sales: [], messages: incoming.messages, raw: incoming.raw, visualFilter: null });
    expect(source.context).toHaveLength(2);
    source.context.forEach((sale: Row, index: number) => {
      const original = incoming.context[index];
      expect(verify(sale)).toMatchObject({ saleId: original.lotId, price: original.price, date: original.date,
        url: original.url.replace(/^https?:\/\//, ''), evidenceDisposition: 'context_only' });
      expect(sale.url).toBe(original.url);
      expect(sale.raw).toEqual(original.raw); expect(sale.sourceEconomics.finalContextOnly).toBe(true);
      expect(sale.sourceRelevance.valuationEligible).toBe(false);
      expect(sale.visualRequirement).toBeUndefined();
    });
    expectHeld(source.context); expect(boundaries.llm).not.toHaveBeenCalled(); expect(boundaries.fetch).not.toHaveBeenCalled();
  });
  it.each(['lelands', 'pristine_auction'] as const)
  ('preserves genuine %s errors and unsigned context diagnostics rather than treating them as success', async (adapter) => {
    const raw = adapter === 'lelands' ? lelandsRow('error-diagnostic') : pristineRow('error-diagnostic');
    const incoming = auctionResult(adapter, [], [raw], { status: 'error', messages: ['synthetic failed acquisition'] });
    const lookup = adapter === 'lelands' ? boundaries.lelands : boundaries.pristine;
    const route = adapter === 'lelands' ? 'getLelandsAuctionData' : 'getPristineAuctionData';
    lookup.mockResolvedValue(incoming);
    const source = await caller()[route](CARD) as Row;
    expect(source).toEqual(incoming); expect(source.context[0].provenanceToken).toBeUndefined();
    expect(lookup).toHaveBeenCalledTimes(1); expect(boundaries.llm).not.toHaveBeenCalled(); expect(boundaries.fetch).not.toHaveBeenCalled();
  });
  it('admits eligible eBay Autographs relevance sales while retaining exclusions as context without image dispatch', async () => {
    providerRows = [100, 105, 110, 115, 10000].map((price, index) => row(`signed-${index}`, {
      title: 'Muhammad Ali Signed EVERLAST Boxing Glove PSA/DNA', price, soldPrice: String(price), soldCurrency: 'USD',
      endedAt: '2026-11-01T00:00:00.000Z', date: undefined, url: `https://www.ebay.com/itm/123456789${index}`, rawSentinel: `signed-raw-${index}` }));
    providerRows.push(row('signed-replica', { title: 'Muhammad Ali facsimile signed boxing glove replica', soldPrice: '120', soldCurrency: 'USD', endedAt: '2026-11-01T00:00:00.000Z' }));
    const source = await caller().getSoldCompsData(SIGNED) as Row;
    expect(source.marketContextOnly).toBe(false); expect(source.audit.valuationEligible).toBeGreaterThan(0);
    expect(source.audit.sourceRelevanceEligible).toBeGreaterThan(0);
    expect(source.contextListings).toHaveLength(1);
    const requestsBeforeRender = boundaries.fetch.mock.calls.length;
    const summary = renderToStaticMarkup(createElement(TestAiSourceRelevanceSummary, { audit: source.audit }));
    expect(summary).toContain(`${source.audit.sourceRelevanceEligible} source-relevance-qualified records retained as context.`);
    expect(summary).toContain('not an exact item identity confirmation or final valuation-use count');
    expect(summary).not.toContain('0 source-relevance-qualified');
    const all = [...source.listings, ...source.contextListings]; expect(all).toHaveLength(6);
    expect(source.audit.ledger).toEqual(all);
    for (const sale of all) {
      const verified = verify(sale);
      expect(verified).toMatchObject({ originMarketplace: 'ebay', date: sale.endedAt, saleStatus: 'completed', priceBasis: 'sold' });
      expect(sale.sourceRelevance.role).toBe('signed_item_relevance');
      expect(sale.metadataRanking).toBeDefined(); expect(sale.metadataScoreAwards).toBeDefined();
      const html = renderToStaticMarkup(createElement(TestAiCandidateStatus, { listing: sale }));
      if (verified.evidenceDisposition === 'valuation_eligible') {
        expect(html).toContain('signed item relevance');
        expect(html).not.toContain('Source context / review');
      } else {
        expect(html).toContain('Source context / review');
      }
      if (verified.evidenceDisposition === 'valuation_eligible') expect(html).toContain('SOURCE_ELIGIBLE_BEFORE_ANALYSIS');
      else expect(html).not.toContain('SOURCE_ELIGIBLE_BEFORE_ANALYSIS');
    }
    expect(source.listings.some((sale: Row) => sale.priceTailExcludedFromMetrics)).toBe(true);
    expect(source.contextListings[0].sourceRelevance.valuationEligible).toBe(false);
    // The existing tail gate changes disposition, not every raw Boolean alias.
    expect(source.listings.find((sale: Row) => sale.priceTailExcludedFromMetrics).sourceRelevance.disposition).toBe('context_only');
    const a = wire(buildSoldCompsAnalysisSales(source, true)), b = wire(buildSoldCompsAnalysisSales(source, true));
    expect(a).toEqual(b);
    expect(a.some((sale: Row) => sale.evidenceDisposition === 'valuation_eligible')).toBe(true);
    expectHeld(a.filter((sale: Row) => sale.priceTailExcludedFromMetrics) as Row[], SIGNED as typeof CARD);
    expect(boundaries.fetch).toHaveBeenCalledTimes(requestsBeforeRender);
    expect(boundaries.llm).not.toHaveBeenCalled();
  });
  it.each([null, 'CAD'])('does not default special eBay currency %s into USD range or money', async (currency) => {
    providerRows = [row('signed-currency', { title: 'Muhammad Ali Signed EVERLAST Boxing Glove PSA/DNA', soldPrice: '120', soldCurrency: currency,
      currency, endedAt: '2026-11-01T00:00:00.000Z' })];
    const source = await caller().getSoldCompsData(SIGNED) as Row;
    expect(source.listings).toHaveLength(1); expect(source.listings[0].currency).toBe(currency);
    expect(verify(source.listings[0]).currency).toBe(currency); expect(source.metrics).toBeNull();
    expectHeld(source.listings, SIGNED as typeof CARD); expect(boundaries.llm).not.toHaveBeenCalled();
  });
  it('keeps Original Art raw/relevance/execution facts and source token final context; never primary', async () => {
    providerRows = [row('art-row', { title: 'John Byrne X-Men original comic art page', soldPrice: '120', soldCurrency: 'USD',
      date: undefined, endedAt: '2026-11-01T00:00:00.000Z', rawSentinel: 'retained-art-raw' })];
    const source = await caller().getSoldCompsData(ART) as Row;
    expect(source.listings).toHaveLength(1); expect(source.audit.valuationEligible).toBe(0);
    const sale = source.listings[0]; verify(sale);
    expect(sale).toMatchObject({ evidenceDisposition: 'context_only', rawSentinel: 'retained-art-raw',
      sourceRelevance: { role: 'original_art_relevance' }, visualExecution: { state: 'not_dispatched' } });
    expectHeld(source.listings, ART as typeof CARD); expect(boundaries.llm).not.toHaveBeenCalled();
  });
  it.each(['signed_item', 'original_art'] as const)('retains earlier special eBay %s rows with later-query partial diagnostics', async (kind) => {
    const target = kind === 'signed_item' ? SIGNED : ART;
    providerRows = [row('special-partial', { title: kind === 'signed_item'
      ? 'Muhammad Ali Signed EVERLAST Boxing Glove PSA/DNA' : 'John Byrne X-Men original comic art page',
      soldPrice: '120', soldCurrency: 'USD', endedAt: '2026-11-01T00:00:00.000Z' })];
    laterEbayFailure = true;
    const source = await caller().getSoldCompsData(target) as Row;
    expect(ebayCalls).toBeGreaterThan(1);
    expect(source.listings).toHaveLength(1); verify(source.listings[0]);
    expect(source.partial).toBe(true);
    expect(source.attemptIssues.length).toBeGreaterThan(0);
    expect(source.retrievalCoverage).toEqual(source.audit.retrievalCoverage);
    expect(source.retrievalCoverage[0].status).toBe('success');
    expect(source.retrievalCoverage.slice(1).every((attempt: Row) => attempt.status === 'error')).toBe(true);
    if (kind === 'signed_item') expect(source.listings[0].evidenceDisposition).toBe('valuation_eligible');
    else expectHeld(source.listings, target);
    expect(boundaries.llm).not.toHaveBeenCalled();
  });
  it('signs ComicConnect context partition restrictively and preserves nonvisual sales policy', async () => {
    boundaries.comic.mockResolvedValue(result([row('comic-sale', { title: COMIC.title, buyerPremiumIncluded: null })],
      [row('comic-context', { title: COMIC.title, valuationEligible: true, identityMatched: true })]));
    const source = await caller().getComicConnectData(COMIC) as Row;
    expect(source.sales).toHaveLength(1); expect(source.context).toHaveLength(1);
    expect(verify(source.sales[0])).toMatchObject({ priceBasis: 'sold', buyerPremium: 'unknown' });
    expect(normalizeAnalysisMarketSale(wire(source.sales[0]), NOW, { signingKey: SIGNING_KEY, target: COMIC }).valuationEligible).toBe(true);
    expect(verify(source.context[0]).evidenceDisposition).toBe('context_only');
    const promoted = { ...source.context[0], evidenceDisposition: 'valuation_eligible', valuationEligible: true, identityMatched: true };
    expect(normalizeAnalysisMarketSale(wire(promoted), NOW, { signingKey: SIGNING_KEY, target: COMIC }).valuationEligible).toBe(false);
    expect(boundaries.llm).not.toHaveBeenCalled();
  });
  it.each([365, 366, 730, 731])('does not broaden ComicConnect recency at day %s by signing', async (ageDays) => {
    boundaries.comic.mockResolvedValue(result([row('comic-date', { title: COMIC.title,
      date: new Date(NOW.getTime() - ageDays * 86400000).toISOString(), timeWindow: 'extended_12_to_36_months' })]));
    const source = await caller().getComicConnectData(COMIC) as Row;
    const normal = normalizeAnalysisMarketSale(source.sales[0], NOW, { signingKey: SIGNING_KEY, target: COMIC, category: 'comics' });
    expect(normal.valuationEligible).toBe(ageDays <= 365);
    const extended = normalizeAnalysisMarketSale(source.sales[0], NOW, { signingKey: SIGNING_KEY, target: COMIC, category: 'comics', allowIlliquidExtension: true });
    expect(extended.valuationEligible).toBe(ageDays <= 730);
  });
  it('seals only registered Weiss context facts and leaves other specialist registry sources untouched', async () => {
    boundaries.specialist.mockResolvedValueOnce(result([row('weiss-sale', { sourceId: 'weiss', priceBasis: 'closed', buyerPremiumIncluded: false, winningBid: 120 })],
      [row('weiss-context', { sourceId: 'weiss', completed: false, saleStatus: 'unknown', priceBasis: 'unknown', buyerPremiumIncluded: null, exclusionReason: 'actual incomplete flags' })]));
    const source = await caller().getSpecialistMarketplaceData({ ...CARD, sourceId: 'weiss' }) as Row;
    expect(sourceRows(source)).toHaveLength(2);
    expect(verify(source.sales[0])).toMatchObject({ sourceAdapter: 'weiss', price: 120, priceBasis: 'closed', buyerPremium: 'excluded', evidenceDisposition: 'context_only' });
    verify(source.context[0]); expectHeld(sourceRows(source)); expect(boundaries.llm).not.toHaveBeenCalled();
    boundaries.specialist.mockResolvedValueOnce(result([row('ngc-untouched', { sourceId: 'ngc' })]));
    const other = await caller().getSpecialistMarketplaceData({ ...CARD, sourceId: 'ngc' }) as Row;
    expect(other.sales[0].provenanceToken).toBeUndefined();
  });
  it('labels exact Weiss Signed Item source relevance separately from zero final money and rejected relevance without image dispatch', async () => {
    const relevant = weissRow('weiss-signed');
    const rejected = weissRow('weiss-replica', { title: 'Muhammad Ali facsimile signed boxing glove replica',
      identityMatched: false, matchedTokens: [], valuationEligible: false, exclusionReason: 'Replica/facsimile is not an authentic signed item.' });
    for (const raw of [relevant, rejected]) {
      for (const key of ['saleId', 'id', 'confirmed', 'metadataRanking', 'visualRequirement', 'raw']) expect(raw).not.toHaveProperty(key);
    }
    boundaries.specialist.mockResolvedValue({ source: 'weiss', label: 'Weiss Auctions', searchContract: 'automatic_title_search',
      query: 'unchanged synthetic Weiss query', sales: [relevant], context: [rejected],
      requestUrl: 'https://synthetic.invalid/weiss/completed-search', recordCap: 12, status: 'success', messages: ['Synthetic final hammer observation.'] });
    const input = { ...SIGNED, imageUrl: IMAGE, sourceId: 'weiss' as const };
    const source = await caller().getSpecialistMarketplaceData(input) as Row;
    expect(boundaries.specialist).toHaveBeenCalledTimes(1); expect(boundaries.specialist).toHaveBeenCalledWith(input);
    expect(source.sales).toHaveLength(1); expect(source.context).toHaveLength(1);
    expect(source.sales[0].sourceRelevance).toMatchObject({ role: 'signed_item_relevance', valuationEligible: true, identityMatched: true });
    expect(source.context[0].sourceRelevance).toMatchObject({ role: 'signed_item_relevance', valuationEligible: false, identityMatched: false, exclusionReason: rejected.exclusionReason });
    for (const sale of sourceRows(source)) {
      expect(verify(sale)).toMatchObject({ sourceAdapter: 'weiss', price: 120, priceBasis: 'closed', buyerPremium: 'excluded', evidenceDisposition: 'context_only' });
      expect(sale.valuationEligible).toBe(false); expect(sale.visualRequirement).toBeUndefined();
      expect(sale.metadataFieldComparisons).toBeDefined();
      const html = renderToStaticMarkup(createElement(TestAiCandidateStatus, { listing: sale }));
      for (const label of ['Execution:', 'Identity result:', 'Pricing use:', 'signed item relevance', 'Source context / review', 'hammer excluded']) expect(html).toContain(label);
      expect(html).toContain('not exact image identity or final pricing use');
    }
    expectHeld(sourceRows(source), SIGNED); expect(boundaries.llm).not.toHaveBeenCalled(); expect(boundaries.fetch).not.toHaveBeenCalled();
  });
  it('retains existing Weiss rank/raw diagnostics while adding only Signed Item relevance and restrictive source proof', async () => {
    // Optional existing diagnostics are a preservation control, not claims that
    // the public Weiss parser currently emits rank/raw/visual execution fields.
    const raw = weissRow('weiss-existing-diagnostics', { metadataRanking: { occurrenceKey: 'weiss-existing-rank', scorerRole: 'exact_comparable' },
      metadataMatchRank: 7, raw: { sentinel: 'existing-Weiss-provider-diagnostic' }, visualRequirement: 'required',
      visualExecution: { state: 'not_dispatched', reasonCode: 'workflow_context_only', attempts: [] } });
    boundaries.specialist.mockResolvedValue(result([raw]));
    const source = await caller().getSpecialistMarketplaceData({ ...SIGNED, sourceId: 'weiss' }) as Row;
    const sale = source.sales[0];
    expect(sale.sourceRelevance.role).toBe('signed_item_relevance');
    for (const field of ['metadataRanking', 'metadataMatchRank', 'raw', 'visualRequirement', 'visualExecution']) expect(sale[field]).toEqual(raw[field]);
    expect(verify(sale).visualRequirement).toBe('required');
    expectHeld([sale], SIGNED); expect(boundaries.llm).not.toHaveBeenCalled(); expect(boundaries.fetch).not.toHaveBeenCalled();
  });
  it('Goldin actual reviewed partitions preserve returned all-in amount and required visual but new proof remains context', async () => {
    boundaries.specialist.mockResolvedValue(result([row('goldin-sale', { sourceId: 'goldin', priceBasis: 'closed', buyerPremiumIncluded: true,
      winningBid: 100, buyerPremiumPercentage: 20 })], [row('goldin-held', { sourceId: 'goldin', title: '1996 Topps Kobe Bryant #139 PSA 10',
      priceBasis: 'closed', buyerPremiumIncluded: true, exclusionReason: 'actual wrong card' })]));
    const source = await caller().getSpecialistMarketplaceData({ ...CARD, sourceId: 'goldin' }) as Row;
    expect(sourceRows(source)).toHaveLength(2);
    for (const sale of sourceRows(source)) expect(verify(sale)).toMatchObject({ sourceAdapter: 'goldin', price: 120, buyerPremium: 'included', evidenceDisposition: 'context_only' });
    expect(sourceRows(source).some((sale) => sale.visualRequirement === 'required')).toBe(true);
    expectHeld(sourceRows(source)); expect(boundaries.llm).toHaveBeenCalled();
  });
  it('Goldin signed-item actual relevance context is sealed after shared special partitions with no visual dispatch', async () => {
    boundaries.specialist.mockResolvedValue(result([row('goldin-signed', { title: 'Muhammad Ali Signed EVERLAST Boxing Glove PSA/DNA',
      sourceId: 'goldin', priceBasis: 'closed', buyerPremiumIncluded: true, winningBid: 100, buyerPremiumPercentage: 20 })]));
    const source = await caller().getSpecialistMarketplaceData({ ...SIGNED, sourceId: 'goldin' }) as Row;
    expect(sourceRows(source)).toHaveLength(1);
    const sale = sourceRows(source)[0]; verify(sale);
    expect(sale.sourceRelevance.role).toBe('signed_item_relevance');
    expect(sale.evidenceDisposition).toBe('context_only'); expectHeld(sourceRows(source), SIGNED as typeof CARD);
    expect(boundaries.llm).not.toHaveBeenCalled();
  });
  it('preserves specialist error with returned diagnostics rather than signing or dispatching it', async () => {
    const diagnostic = row('error-diagnostic', { sourceId: 'goldin', completed: false, saleStatus: 'unknown' });
    boundaries.specialist.mockResolvedValue(result([], [diagnostic], { status: 'error', messages: ['synthetic unavailable source'] }));
    const source = await caller().getSpecialistMarketplaceData({ ...CARD, sourceId: 'goldin' }) as Row;
    expect(source).toMatchObject({ status: 'error', sales: [], context: [diagnostic], messages: ['synthetic unavailable source'] });
    expect(source.context[0].provenanceToken).toBeUndefined(); expect(boundaries.llm).not.toHaveBeenCalled();
  });
  it('requires administrator access before any named source boundary', async () => {
    await expect(caller('user').getTheCardApiData(CARD)).rejects.toThrow();
    await expect(caller('user').getSpecialistMarketplaceData({ ...CARD, sourceId: 'weiss' })).rejects.toThrow();
    expect(boundaries.card).not.toHaveBeenCalled(); expect(boundaries.specialist).not.toHaveBeenCalled();
    expect(boundaries.llm).not.toHaveBeenCalled(); expect(boundaries.fetch).not.toHaveBeenCalled();
  });
});
