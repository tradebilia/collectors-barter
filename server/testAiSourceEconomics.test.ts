import { describe, expect, it, vi } from 'vitest';
vi.mock('./_core/env', () => ({ ENV: { jwtSecret: 'stage6-source-synthetic-key-not-a-service-credential' } }));
import { mapNamedSourceEconomics, mapNamedSourcePartitions, NAMED_SOURCE_MAPPING_POLICY, type NamedSourceAdapter } from './testAiSourceEconomics';
import { sealCanonicalObservation, verifyCanonicalObservation, getVerifiedIdentityApproval } from './testAiCanonicalObservation';
import { normalizeAnalysisMarketSale } from './testAiMarketEvidence';
import { buildMarketProfile } from './testAiComparableEngine';

const NOW = new Date('2026-11-09T12:00:00.000Z');
const KEY = 'stage6-source-explicit-synthetic-signing-key';
const TARGET = { title: '1996 Topps Kobe Bryant #138 PSA 10', category: 'sports_cards', itemType: 'single_card',
  grade: '10', certificationCompany: 'PSA', itemDetails: JSON.stringify({ year: '1996', manufacturer: 'Topps', player: 'Kobe Bryant', cardNumber: '138' }) };
const wire = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function row(patch: Record<string, any> = {}): Record<string, any> {
  return { title: TARGET.title, price: 120, currency: 'USD', date: '2026-11-01T00:00:00.000Z',
    saleId: 'observed-record-1', url: 'https://synthetic.invalid/transaction/1', completed: true, confirmed: true,
    saleStatus: 'completed', priceBasis: 'sold', visualRequirement: 'not_required', visualReviewStatus: 'not_reviewed',
    evidenceDisposition: 'valuation_eligible', evidenceReasons: [], ...patch };
}
// Exact normalized adapter keys from parseAuctionMarketData.ts, not the generic
// cross-provider superset above. Mapper-only admission is not route image approval.
function lelandsRow(patch: Record<string, any> = {}): Record<string, any> {
  const sale = { sourceId: 'lelands', provider: 'Lelands via Parse.bot', title: TARGET.title,
    url: 'https://synthetic.invalid/lelands/lot/1', lotId: 'lelands-actual-1', auctionName: null, category: null,
    description: null, imageUrl: null, imageUrls: [], status: 'sold', sold: true, price: 120, currency: 'USD',
    priceBasis: 'sold_for_price_including_buyers_premium', buyersPremiumIncluded: true,
    date: '2026-11-01T00:00:00.000Z', datePrecision: 'auction_end', grader: 'PSA', grade: '10',
    bidCount: null, finalAmount: 120, identityMatched: true, identityScore: 1, matchedTokens: ['kobe', 'bryant'],
    saleStatus: 'completed', completed: true,
    priceSemantics: 'Lelands SOLD FOR amount including buyer premium; candidate only after identity and evidence gates.', ...patch };
  return { ...sale, raw: { item_id: sale.lotId, source_url: sale.url, sale: { title: sale.title,
    status: sale.status, final_amount: sale.finalAmount, currency: sale.currency, price_basis: sale.priceBasis,
    buyer_premium_included: sale.buyersPremiumIncluded, sale_datetime: sale.date, grader: sale.grader, grade: sale.grade } } };
}
function pristineRow(patch: Record<string, any> = {}): Record<string, any> {
  const sale = { sourceId: 'pristine_auction', provider: 'Pristine Auction via Parse.bot', title: TARGET.title,
    url: 'https://synthetic.invalid/pristine/lot/1', lotId: 'pristine-actual-1', subtitle: null, imageUrl: null,
    status: 'completed', sold: true, completed: true, price: 120, winningBid: 100, buyerPremium: 20, totalPrice: 120,
    currency: 'USD', priceBasis: 'hammer_plus_premium', date: '2026-11-01T00:00:00.000Z', datePrecision: 'completed_at',
    bidCount: null, grader: 'PSA', grade: '10', identityMatched: true, identityScore: 1, matchedTokens: ['kobe', 'bryant'],
    saleStatus: 'completed', priceSemantics: 'Pristine winning bid and all-in total; candidate only after identity and evidence gates.', ...patch };
  return { ...sale, raw: { title: sale.title, url: sale.url, lot_id: sale.lotId, status: sale.status, sold: sale.sold,
    winning_bid: sale.winningBid, buyer_premium: sale.buyerPremium, total_price: sale.totalPrice,
    currency: sale.currency, price_basis: sale.priceBasis, completed_at: sale.date, grader: sale.grader, grade: sale.grade } };
}
function chain(adapter: NamedSourceAdapter, raw: Record<string, any>, options?: Parameters<typeof mapNamedSourceEconomics>[2]) {
  const mapped = mapNamedSourceEconomics(adapter, raw, options);
  const sealed = { ...mapped, ...sealCanonicalObservation(adapter, mapped, { acquiredAt: NOW, signingKey: KEY }) };
  const transported = wire(sealed);
  const verification = verifyCanonicalObservation(transported, { now: NOW, signingKey: KEY });
  const normalized = normalizeAnalysisMarketSale(transported, NOW, { signingKey: KEY, target: TARGET, category: TARGET.category });
  expect(verification.verified).toBe(true);
  expect(sealed.identityApproval).toBeUndefined();
  expect(getVerifiedIdentityApproval(verification.sale, TARGET)).toBeNull();
  expect(verification.sale.price).toBe(Number(raw.price));
  return { mapped, sealed, verification, normalized };
}
function held(result: ReturnType<typeof chain>) {
  expect(result.normalized.valuationEligible).toBe(false);
  expect(result.verification.sale.evidenceDisposition).not.toBe('valuation_eligible');
  const profile = buildMarketProfile(TARGET, [result.normalized.sale], null, NOW);
  expect(profile.primaryValue).toBeNull();
  expect(profile.authoritativeSaleCount).toBe(0);
}

describe('Stage 6 actual named source mapping and canonical economic handoff', () => {
  it('admits an eligible no-visual Autographs Sold-Comps sale without converting it to context only', () => {
    const result = chain('sold_comps', row({
      valuationEligible: true,
      visualRequirement: 'not_required_autograph_market_context',
      metadataMatchScore: 90,
    }), { role: 'signed_item_relevance', partition: 'sales' });
    expect(result.mapped.sourceEconomics.finalContextOnly).toBe(false);
    expect(result.normalized).toMatchObject({ valuationEligible: true, sale: { evidenceDisposition: 'valuation_eligible' } });
  });

  it('keeps context partitions and non-Autograph relevance held', () => {
    const context = chain('sold_comps', row({ valuationEligible: true, visualRequirement: 'not_required_autograph_market_context' }),
      { role: 'signed_item_relevance', partition: 'context' });
    expect(context.normalized.valuationEligible).toBe(false);
    const originalArt = chain('sold_comps', row({ valuationEligible: true, visualRequirement: 'not_required_original_art_market_context' }),
      { role: 'original_art_relevance', partition: 'sales' });
    expect(originalArt.normalized.valuationEligible).toBe(false);
  });

  it('preserves confirmed eBay negotiated amount and maps Goldin hammer without borrowing premium', () => {
    const ebay = chain('the_card_api', row({ platform: 'eBay', listing_type: 'best_offer', original_price: 160, buyer_premium: 25 }));
    expect(ebay.mapped).toMatchObject({ price: 120, original_price: 160, listing_type: 'best_offer',
      originMarketplace: 'ebay', priceBasis: 'sold', buyerPremium: 'included' });
    expect(ebay.normalized.valuationEligible).toBe(true);
    const goldin = chain('the_card_api', row({ platform: 'Goldin', buyerPremiumPercentage: 25, buyerPremium: 'included' }));
    expect(goldin.verification.sale).toMatchObject({ originMarketplace: 'goldin', price: 120, priceBasis: 'realized', buyerPremium: 'excluded' });
    held(goldin);
  });
  it.each(['unknown', 'OtherVenue', null])('holds unresolved The Card API origin %s', (platform) => {
    const result = chain('the_card_api', row({ platform, marketplace: null }));
    expect(result.verification.sale.priceBasis).toBe('unknown'); held(result);
  });
  it('does not let wrapper completed/sold override an unconfirmed The Card API row', () => {
    const result = chain('the_card_api', row({ platform: 'eBay', confirmed: false, price_confirmed: false }));
    expect(result.verification.sale.saleStatus).toBe('unknown'); held(result);
  });
  it.each([
    ['auction', true, 'completed', 'realized', 'bid_side_unresolved'],
    ['fixed', false, 'active', 'unknown', 'active_ask'],
    ['bin', false, 'active', 'unknown', 'active_ask'],
  ])('keeps Cardsight %s economics unresolved instead of laundering sold', (listingType, completed, status, basis, convention) => {
    const result = chain('cardsight_ai', row({ listingType, completed, saleStatus: status, buyerPremium: 'included' }));
    expect(result.verification.sale).toMatchObject({ saleStatus: status, priceBasis: basis, buyerPremium: 'unknown' });
    expect(result.mapped.sourceEconomics.convention).toBe(convention); held(result);
  });
  it.each([true, false, null, undefined, 'true', 1])('requires actual Lelands inclusion Boolean %s', (buyersPremiumIncluded) => {
    const result = chain('lelands', lelandsRow({ buyersPremiumIncluded }));
    expect(result.verification.sale.buyerPremium).toBe(buyersPremiumIncluded === true ? 'included' : buyersPremiumIncluded === false ? 'excluded' : 'unknown');
    if (buyersPremiumIncluded === true) expect(result.normalized.valuationEligible).toBe(true);
    else held(result);
  });
  it.each(['hammer', 'hammer_price', 'hammer_only', 'buyer_premium_excluded'])
  ('holds actual Lelands inclusion true contradicting reported basis %s without changing amount or raw', (priceBasis) => {
    const raw = lelandsRow({ priceBasis });
    const result = chain('lelands', raw);
    expect(result.mapped).toMatchObject({ price: 120, finalAmount: 120, buyersPremiumIncluded: true, raw: raw.raw });
    expect(result.verification.sale).toMatchObject({ priceBasis: 'realized', buyerPremium: 'excluded', evidenceDisposition: 'context_only' });
    expect(result.verification.sale.evidenceReasons?.join(' ')).toContain('cannot be overwritten');
    held(result);
  });
  it.each([120, '120.00'])('includes only selected positive actual Pristine total %s', (totalPrice) => {
    const raw = pristineRow({ totalPrice });
    const result = chain('pristine_auction', raw);
    expect(result.mapped).toMatchObject({ totalPrice, winningBid: 100, raw: raw.raw });
    expect(result.verification.sale).toMatchObject({ price: 120, priceBasis: 'realized', buyerPremium: 'included' });
    expect(result.normalized.valuationEligible).toBe(true);
  });
  it.each([
    { priceBasis: 'hammer' }, { priceBasis: 'hammer_price' }, { priceBasis: 'buyer_premium_excluded' },
    { winningBid: 120 }, { winningBid: '120.00', buyerPremium: '20.00' },
    { buyerPremium: 'excluded' },
  ])('holds explicit actual Pristine contradiction %# despite selected positive total equality', (patch) => {
    const raw = pristineRow(patch);
    const result = chain('pristine_auction', raw);
    expect(result.mapped).toMatchObject({ price: 120, totalPrice: 120, winningBid: raw.winningBid, raw: raw.raw });
    expect(result.verification.sale).toMatchObject({ buyerPremium: 'excluded', evidenceDisposition: 'context_only' });
    expect(result.verification.sale.evidenceReasons?.join(' ')).toContain('contradicts included-total use');
    const forged = wire({ ...result.sealed, buyerPremium: 'included', evidenceDisposition: 'valuation_eligible', valuationEligible: true });
    expect(normalizeAnalysisMarketSale(forged, NOW, { signingKey: KEY, target: TARGET }).valuationEligible).toBe(false);
    held(result);
  });
  it.each([
    { winningBid: null }, { winningBid: undefined }, { buyerPremium: null }, { buyerPremium: undefined },
    { winningBid: 120, buyerPremium: null }, { winningBid: 120, buyerPremium: 0 },
  ])('does not invent contradiction or require undisclosed optional Pristine bid/premium %#', (patch) => {
    const result = chain('pristine_auction', pristineRow(patch));
    expect(result.verification.sale.buyerPremium).toBe('included');
    expect(result.normalized.valuationEligible).toBe(true);
  });
  it.each([null, undefined, 0, -120, '', ' ', 'bad', Infinity, true, [], [120], { value: 120 }, 150])
  ('holds invalid/missing/unselected Pristine total %# without altering amount', (totalPrice) => {
    const result = chain('pristine_auction', row({ totalPrice, winningBid: 120, buyerPremiumIncluded: true }));
    expect(result.verification.sale.buyerPremium).toBe('unknown'); held(result);
  });
  it('maps actual date, URL and observed lot ID aliases without creating occurrence identity or currency', () => {
    const source = row({ saleId: null, id: undefined, lotId: 'observed-lot', url: undefined, date: undefined,
      itemUrl: 'https://synthetic.invalid/lot/observed', endedAt: '2026-11-02T00:00:00.000Z', currency: null,
      buyersPremiumIncluded: true, metadataOriginOccurrenceKey: 'display-only-occurrence' });
    const result = chain('lelands', source);
    expect(result.mapped).toMatchObject({ saleId: 'observed-lot', date: source.endedAt, url: source.itemUrl, currency: null });
    expect(result.normalized.valuationEligible).toBe(false);
    const anonymous = mapNamedSourceEconomics('lelands', { ...source, saleId: null, lotId: null, id: null, itemUrl: null });
    expect(anonymous.saleId).toBeNull(); expect(anonymous.url).toBeNull();
  });
  it.each(['warning_review', 'context_only', 'rejected_objective_conflict', 'omitted_by_cap', 'not_visually_reviewed_window'])
  ('preserves existing restrictive %s through mapping and actual verification', (evidenceDisposition) => {
    const result = chain('lelands', row({ buyersPremiumIncluded: true, evidenceDisposition, evidenceReasons: ['actual prior restriction'] }));
    expect(result.verification.sale.evidenceDisposition).toBe(evidenceDisposition);
    expect(result.mapped.sourceRelevance.reasons).toEqual(['actual prior restriction']); held(result);
  });
  it('retains required visual and actual execution/rank/raw fields; generic source proof is not approval', () => {
    const raw = row({ platform: 'eBay', visualRequirement: 'required', visualReviewStatus: 'match',
      visualExecution: { state: 'reviewed', attempts: [{ ordinal: 1, outcome: 'completed' }] },
      metadataRanking: { occurrenceKey: 'observed-occurrence' }, metadataScoreAwards: [{ field: 'year', awarded: 5 }],
      raw: { complete: 'provider metadata' }, metadataMatchScore: 100 });
    const result = chain('the_card_api', raw);
    for (const field of ['visualExecution', 'metadataRanking', 'metadataScoreAwards', 'raw', 'metadataMatchScore'])
      expect(result.mapped[field as keyof typeof result.mapped]).toEqual(raw[field]);
    expect(result.verification.sale.visualRequirement).toBe('required'); held(result);
  });
  it.each(['signed_item_relevance', 'original_art_relevance'] as const)
  ('signs special eBay %s facts as final context while preserving actual relevance', (role) => {
    const result = chain('sold_comps', row({ date: undefined, endedAt: '2026-11-02T00:00:00.000Z',
      url: undefined, itemUrl: 'https://www.ebay.com/itm/1234567890', valuationEligible: true }), { role });
    expect(result.mapped.sourceRelevance).toMatchObject({ role, disposition: 'valuation_eligible', valuationEligible: true });
    expect(result.verification.sale).toMatchObject({ date: '2026-11-02T00:00:00.000Z', originMarketplace: 'ebay',
      saleStatus: 'completed', priceBasis: 'sold', evidenceDisposition: 'context_only' });
    held(result);
  });
  it('translates ComicConnect actual context membership before signing despite producer eligibility flags', () => {
    const raw = row({ lotId: 'comic-lot', identityMatched: true, valuationEligible: true });
    const sales = chain('comicconnect', raw, { partition: 'sales' });
    expect(sales.normalized.valuationEligible).toBe(true);
    const context = chain('comicconnect', raw, { partition: 'context' }); held(context);
    const promoted = { ...context.sealed, evidenceDisposition: 'valuation_eligible', valuationEligible: true, identityMatched: true };
    const verified = verifyCanonicalObservation(wire(promoted), { now: NOW, signingKey: KEY });
    expect(verified.sale.evidenceDisposition).toBe('context_only');
    expect(normalizeAnalysisMarketSale(promoted, NOW, { signingKey: KEY }).valuationEligible).toBe(false);
  });
  it('preserves both final partitions and producer exclusions without upgrading by sales membership', () => {
    const partitions = mapNamedSourcePartitions('comicconnect', { listings: [row({ saleId: 'sales-held', exclusionReason: 'actual producer exclusion' })],
      contextListings: [row({ saleId: 'context-held', valuationEligible: true })] });
    expect(partitions.sales).toHaveLength(1); expect(partitions.context).toHaveLength(1);
    expect(partitions.sales[0].evidenceDisposition).toBe('context_only');
    expect(partitions.context[0].evidenceDisposition).toBe('context_only');
  });
  it.each([
    ['weiss', false, 'hammer_excluded'], ['goldin', true, 'reported_included_total'],
  ] as const)('new %s source proof never activates primary or changes provider amount', (adapter, buyerPremiumIncluded, convention) => {
    const result = chain(adapter, row({ priceBasis: 'closed', lotId: 'specialist-observed-lot', buyerPremiumIncluded,
      winningBid: 100, buyerPremiumPercentage: adapter === 'goldin' ? 20 : null, visualRequirement: 'required' }));
    expect(result.verification.sale).toMatchObject({ price: 120, priceBasis: 'closed', visualRequirement: 'required' });
    expect(result.mapped.sourceEconomics).toMatchObject({ policy: NAMED_SOURCE_MAPPING_POLICY, convention, finalContextOnly: true }); held(result);
  });
  it('retains signed economics and restriction against forged display diagnostics', () => {
    const result = chain('the_card_api', row({ platform: 'Goldin' }));
    const forged = wire({ ...result.sealed, priceBasis: 'sold', buyerPremium: 'included', evidenceDisposition: 'valuation_eligible',
      sourceEconomics: { finalContextOnly: false, convention: 'reported_included_total' } });
    const normalized = normalizeAnalysisMarketSale(forged, NOW, { signingKey: KEY, target: TARGET });
    expect(normalized.sale).toMatchObject({ priceBasis: 'realized', buyerPremium: 'excluded', evidenceDisposition: 'context_only' });
    expect(normalized.valuationEligible).toBe(false);
  });
  it('fails closed for missing synthetic key, token tamper and expiry without renewing proof', () => {
    const mapped = mapNamedSourceEconomics('lelands', row({ buyersPremiumIncluded: true }));
    const noKey = { ...mapped, ...sealCanonicalObservation('lelands', mapped, { acquiredAt: NOW, signingKey: '' }) };
    expect(noKey.provenanceToken).toBeNull();
    expect(normalizeAnalysisMarketSale(noKey, NOW, { signingKey: '' }).valuationEligible).toBe(false);
    const valid = chain('lelands', row({ buyersPremiumIncluded: true }));
    expect(verifyCanonicalObservation({ ...valid.sealed, provenanceToken: `${valid.sealed.provenanceToken}tampered` }, { now: NOW, signingKey: KEY }).verified).toBe(false);
    expect(verifyCanonicalObservation(valid.sealed, { now: new Date(NOW.getTime() + 21 * 60 * 1000), signingKey: KEY }).verified).toBe(false);
  });
});
