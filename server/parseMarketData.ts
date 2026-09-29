const PARSE_API_BASE = 'https://api.parse.bot/scraper';
import { classifyApiFailure, recordApiFailure } from "./apiHealth";

const SGC_SCRAPER_ID = 'f63ad1cb-5b08-4e33-9ea8-573b416e936d';
const PRICECHARTING_SCRAPER_ID = 'bbbbdc36-6d99-4a7a-8115-cf766b2497e3';
const ONE_THIRTY_POINT_SCRAPER_ID = '28d873f5-47d5-4c01-a275-e80c6b3fc610';
const PWCC_SCRAPER_ID = '6f75fc48-78a3-4fa4-a96a-937d35bf9385';

type ParseEnv = Record<string, string | undefined>;

export type SaleRecency = 'recent' | 'historical' | 'undated';

export function classifySaleRecency(date: unknown, nowMs: number = Date.now()): SaleRecency {
  if (typeof date !== 'string' || !date.trim()) return 'undated';
  const saleMs = Date.parse(date);
  if (!Number.isFinite(saleMs)) return 'undated';
  const ageMs = nowMs - saleMs;
  return ageMs >= 0 && ageMs <= 365 * 24 * 60 * 60 * 1000 ? 'recent' : 'historical';
}

function parseErrorMessage(status: number, provider: string): string {
  if (status === 401 || status === 403) return `${provider} credentials are not authorized. Check the secure Parse key configuration.`;
  if (status === 404) return `No ${provider} record was found for that lookup.`;
  if (status === 429) return `${provider} rate limit reached. Try again shortly.`;
  return `${provider} lookup is temporarily unavailable. Try again shortly.`;
}

async function recordParseFailure(operation: string, status: number) {
  const safeMessage = parseErrorMessage(status, "Parse");
  await recordApiFailure({ provider: "Parse", operation, failureClass: classifyApiFailure({ statusCode: status, message: safeMessage }), statusCode: status, safeMessage });
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? value as Record<string, any> : {};
}

function normalizedCoinText(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function firstCoinYear(value: unknown): string | null {
  return normalizedCoinText(value).match(/\b(?:17|18|19|20)\d{2}\b/)?.[0] ?? null;
}

const COIN_MATERIALS = ['silver', 'gold', 'copper', 'bronze', 'platinum', 'palladium', 'nickel', 'aluminum', 'aluminium', 'steel', 'zinc'];
const COIN_DENOMINATIONS = ['half dollar', 'quarter', 'dime', 'nickel', 'cent', 'penny', 'dollar', 'eagle', 'three cent', 'two cent', 'five dollar', 'ten dollar', 'twenty dollar'];

/** Reject fuzzy PriceCharting coin matches that materially conflict with the selected coin. */
export function isPriceChartingCoinIdentityCompatible(query: string, candidate: string, candidateYear?: unknown): boolean {
  const queryText = normalizedCoinText(query);
  const candidateText = normalizedCoinText(candidate);
  const queryYear = firstCoinYear(queryText);
  const resultYear = firstCoinYear(candidateYear) ?? firstCoinYear(candidateText);
  if (queryYear && resultYear && queryYear !== resultYear) return false;

  const queryMaterial = COIN_MATERIALS.find(material => queryText.includes(material));
  const resultMaterial = COIN_MATERIALS.find(material => candidateText.includes(material));
  if (queryMaterial && resultMaterial && queryMaterial !== resultMaterial) return false;
  if (queryMaterial && !resultMaterial && (queryText.includes('silver') || queryText.includes('gold'))) return false;

  const queryDenomination = COIN_DENOMINATIONS.find(denomination => queryText.includes(denomination));
  const resultDenomination = COIN_DENOMINATIONS.find(denomination => candidateText.includes(denomination));
  if (queryDenomination && resultDenomination && queryDenomination !== resultDenomination) return false;
  return true;
}

export async function lookupSgcCertification(certCode: string, env: ParseEnv = process.env) {
  const normalizedCertCode = certCode.trim();
  const apiKey = env.PARSE_BOT_API_KEY;
  if (!apiKey) return { certCode: normalizedCertCode, status: 'error' as const, message: 'Parse.bot API key not configured', data: null };

  try {
    const response = await fetch(`${PARSE_API_BASE}/${SGC_SCRAPER_ID}/search_cert`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ cert_code: normalizedCertCode }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) { await recordParseFailure('SGC certification lookup', response.status); return { certCode: normalizedCertCode, status: 'error' as const, message: parseErrorMessage(response.status, 'Parse SGC'), data: null }; }

    const card = asObject(asObject(payload).data ?? payload);
    return {
      certCode: normalizedCertCode,
      status: 'success' as const,
      data: {
        certCode: card.cert_code ?? normalizedCertCode,
        subject: card.card_subject ?? null,
        cardSet: card.card_set ?? null,
        cardNumber: card.card_number ?? null,
        sport: card.sport ?? null,
        grade: card.grade ?? null,
        gradeRaw: card.grade_raw ?? null,
        gradeDesignation: card.grade_designation ?? null,
        population: card.population ?? null,
        popHigher: card.pop_higher ?? null,
        gradeDate: card.grade_date ?? null,
        description: card.card_description ?? null,
      },
    };
  } catch {
    return { certCode: normalizedCertCode, status: 'error' as const, message: 'Parse SGC lookup could not be reached. Try again shortly.', data: null };
  }
}

export async function lookupPriceCharting(query: string, env: ParseEnv = process.env) {
  const normalizedQuery = query.trim();
  const apiKey = env.PARSE_BOT_API_KEY;
  if (!apiKey) return { query: normalizedQuery, status: 'error' as const, message: 'Parse.bot API key not configured', data: null };
  if (!normalizedQuery) return { query: normalizedQuery, status: 'error' as const, message: 'Enter an item title before requesting PriceCharting data.', data: null };

  try {
    const headers = { 'X-API-Key': apiKey };
    const searchResponse = await fetch(`${PARSE_API_BASE}/${PRICECHARTING_SCRAPER_ID}/search_pokemon_cards?query=${encodeURIComponent(normalizedQuery)}`, { headers });
    const searchPayload = await searchResponse.json().catch(() => null);
    if (!searchResponse.ok) { await recordParseFailure('PriceCharting search', searchResponse.status); return { query: normalizedQuery, status: 'error' as const, message: parseErrorMessage(searchResponse.status, 'Parse PriceCharting'), data: null }; }

    const searchData = asObject(asObject(searchPayload).data ?? searchPayload);
    const firstCard = Array.isArray(searchData.cards) ? asObject(searchData.cards[0]) : {};
    if (!firstCard.set_slug || !firstCard.card_slug) {
      return { query: normalizedQuery, status: 'not_found' as const, message: 'No matching Pokémon card was found in PriceCharting.', data: null };
    }

    const detailUrl = `${PARSE_API_BASE}/${PRICECHARTING_SCRAPER_ID}/get_card_detail?set_slug=${encodeURIComponent(firstCard.set_slug)}&card_slug=${encodeURIComponent(firstCard.card_slug)}`;
    const detailResponse = await fetch(detailUrl, { headers });
    const detailPayload = await detailResponse.json().catch(() => null);
    if (!detailResponse.ok) { await recordParseFailure('PriceCharting detail', detailResponse.status); return { query: normalizedQuery, status: 'error' as const, message: parseErrorMessage(detailResponse.status, 'Parse PriceCharting'), data: null }; }

    const card = asObject(asObject(detailPayload).data ?? detailPayload);
    const prices = asObject(card.prices ?? firstCard.prices);
    return {
      query: normalizedQuery,
      status: 'success' as const,
      data: {
        name: card.name ?? firstCard.name ?? null,
        set: card.set ?? firstCard.set ?? null,
        cardNumber: card.card_number ?? card.number ?? null,
        releaseDate: card.release_date ?? null,
        publisher: card.publisher ?? null,
        url: card.url ?? firstCard.url ?? null,
        imageUrl: card.image_url ?? card.image ?? null,
        prices,
      },
    };
  } catch {
    return { query: normalizedQuery, status: 'error' as const, message: 'Parse PriceCharting lookup could not be reached. Try again shortly.', data: null };
  }
}

export async function lookupPriceChartingCoin(query: string, env: ParseEnv = process.env) {
  const normalizedQuery = query.trim();
  const apiKey = env.PARSE_BOT_API_KEY;
  if (!apiKey) return { query: normalizedQuery, status: 'error' as const, message: 'Parse.bot API key not configured', data: null };
  if (!normalizedQuery) return { query: normalizedQuery, status: 'error' as const, message: 'Enter a coin title, year, mint, or type before requesting PriceCharting data.', data: null };
  try {
    const response = await fetch(`${PARSE_API_BASE}/${PRICECHARTING_SCRAPER_ID}/search_coins?query=${encodeURIComponent(normalizedQuery)}`, { headers: { 'X-API-Key': apiKey } });
    const payload = await response.json().catch(() => null);
    if (!response.ok) { await recordParseFailure('PriceCharting coin search', response.status); return { query: normalizedQuery, status: 'error' as const, message: parseErrorMessage(response.status, 'Parse PriceCharting'), data: null }; }
    const result = asObject(asObject(payload).data ?? payload);
    const coins = Array.isArray(result.coins) ? result.coins : Array.isArray(result.items) ? result.items : [];
    const firstCoin = coins
      .map(asObject)
      .find(coin => isPriceChartingCoinIdentityCompatible(normalizedQuery, `${coin.name ?? ''} ${coin.set ?? ''}`, coin.year ?? coin.release_date));
    if (!firstCoin?.set_slug || !firstCoin?.coin_slug) {
      const message = coins.length > 0
        ? 'PriceCharting returned only coins with conflicting year, material, or denomination; no value was accepted.'
        : 'No matching US coin was found in PriceCharting.';
      return { query: normalizedQuery, status: 'not_found' as const, message, data: null };
    }
    const detailResponse = await fetch(`${PARSE_API_BASE}/${PRICECHARTING_SCRAPER_ID}/get_coin_detail?set_slug=${encodeURIComponent(String(firstCoin.set_slug))}&coin_slug=${encodeURIComponent(String(firstCoin.coin_slug))}`, { headers: { 'X-API-Key': apiKey } });
    const detailPayload = await detailResponse.json().catch(() => null);
    if (!detailResponse.ok) { await recordParseFailure('PriceCharting coin detail', detailResponse.status); return { query: normalizedQuery, status: 'error' as const, message: parseErrorMessage(detailResponse.status, 'Parse PriceCharting'), data: null }; }
    const coin = asObject(asObject(detailPayload).data ?? detailPayload);
    const resultName = `${coin.name ?? firstCoin.name ?? ''} ${coin.set ?? firstCoin.set ?? ''}`;
    if (!isPriceChartingCoinIdentityCompatible(normalizedQuery, resultName, coin.year ?? coin.release_date ?? firstCoin.year ?? firstCoin.release_date)) {
      return { query: normalizedQuery, status: 'not_found' as const, message: 'PriceCharting returned a coin with conflicting year, material, or denomination; no value was accepted.', data: null };
    }
    return { query: normalizedQuery, status: 'success' as const, data: { name: coin.name ?? firstCoin.name ?? null, set: coin.set ?? firstCoin.set ?? null, year: coin.year ?? coin.release_date ?? null, mint: coin.mint ?? null, mintage: coin.mintage ?? coin.metadata?.mintage ?? null, url: coin.url ?? firstCoin.url ?? null, prices: asObject(coin.prices ?? firstCoin.prices), source: 'US coin price-guide context' } };
  } catch {
    return { query: normalizedQuery, status: 'error' as const, message: 'Parse PriceCharting coin lookup could not be reached. Try again shortly.', data: null };
  }
}

export async function lookupPriceChartingVideoGame(upc: string, env: ParseEnv = process.env) {
  const normalizedUpc = upc.trim();
  const apiKey = env.PARSE_BOT_API_KEY;
  if (!apiKey) return { upc: normalizedUpc, status: 'error' as const, message: 'Parse.bot API key not configured', data: null };
  if (!/^\d{8,14}$/.test(normalizedUpc)) return { upc: normalizedUpc, status: 'error' as const, message: 'Enter an 8- to 14-digit video-game UPC/barcode for PriceCharting lookup.', data: null };
  try {
    const response = await fetch(`${PARSE_API_BASE}/${PRICECHARTING_SCRAPER_ID}/lookup_video_game_by_upc?upc=${encodeURIComponent(normalizedUpc)}`, { headers: { 'X-API-Key': apiKey } });
    const payload = await response.json().catch(() => null);
    if (!response.ok) { await recordParseFailure('PriceCharting video-game UPC lookup', response.status); return { upc: normalizedUpc, status: 'not_found' as const, message: 'No matching video game was found for this UPC in PriceCharting.', data: null }; }
    const game = asObject(asObject(payload).data ?? payload);
    return { upc: normalizedUpc, status: 'success' as const, data: { title: game.title ?? game.name ?? null, platform: game.platform ?? game.console ?? null, platformSlug: game.platform_slug ?? null, gameSlug: game.game_slug ?? null, priceChartingId: game.pricecharting_id ?? game.id ?? null, associatedUpcs: Array.isArray(game.upcs) ? game.upcs : [], url: game.url ?? null, prices: asObject(game.prices) } };
  } catch {
    return { upc: normalizedUpc, status: 'error' as const, message: 'Parse PriceCharting video-game lookup could not be reached. Try again shortly.', data: null };
  }
}

export async function lookupPriceChartingCardBySlugs(setSlug: string, cardSlug: string, env: ParseEnv = process.env) {
  const normalizedSetSlug = setSlug.trim();
  const normalizedCardSlug = cardSlug.trim();
  const apiKey = env.PARSE_BOT_API_KEY;
  if (!apiKey) return { setSlug: normalizedSetSlug, cardSlug: normalizedCardSlug, status: 'error' as const, message: 'Parse.bot API key not configured', data: null };
  if (!normalizedSetSlug || !normalizedCardSlug) return { setSlug: normalizedSetSlug, cardSlug: normalizedCardSlug, status: 'error' as const, message: 'Enter both PriceCharting set and card slugs for this TCG lookup.', data: null };
  try {
    const response = await fetch(`${PARSE_API_BASE}/${PRICECHARTING_SCRAPER_ID}/get_card_detail?set_slug=${encodeURIComponent(normalizedSetSlug)}&card_slug=${encodeURIComponent(normalizedCardSlug)}`, { headers: { 'X-API-Key': apiKey } });
    const payload = await response.json().catch(() => null);
    if (!response.ok) { await recordParseFailure('PriceCharting TCG detail', response.status); return { setSlug: normalizedSetSlug, cardSlug: normalizedCardSlug, status: 'not_found' as const, message: 'No matching card was found for these PriceCharting slugs.', data: null }; }
    const card = asObject(asObject(payload).data ?? payload);
    return { setSlug: normalizedSetSlug, cardSlug: normalizedCardSlug, status: 'success' as const, data: { name: card.name ?? null, set: card.set ?? null, cardNumber: card.card_number ?? card.number ?? null, releaseDate: card.release_date ?? null, publisher: card.publisher ?? null, url: card.url ?? null, imageUrl: card.image_url ?? card.image ?? null, prices: asObject(card.prices), source: 'PriceCharting TCG detail context' } };
  } catch {
    return { setSlug: normalizedSetSlug, cardSlug: normalizedCardSlug, status: 'error' as const, message: 'Parse PriceCharting TCG lookup could not be reached. Try again shortly.', data: null };
  }
}

export async function lookupPriceChartingBigMovers(env: ParseEnv = process.env) {
  const apiKey = env.PARSE_BOT_API_KEY;
  if (!apiKey) return { status: 'error' as const, message: 'Parse.bot API key not configured', data: null };
  try {
    const response = await fetch(`${PARSE_API_BASE}/${PRICECHARTING_SCRAPER_ID}/get_big_movers`, { headers: { 'X-API-Key': apiKey } });
    const payload = await response.json().catch(() => null);
    if (!response.ok) { await recordParseFailure('PriceCharting market movers', response.status); return { status: 'error' as const, message: parseErrorMessage(response.status, 'Parse PriceCharting'), data: null }; }
    const result = asObject(asObject(payload).data ?? payload);
    const movers = Array.isArray(result.movers) ? result.movers : Array.isArray(result.items) ? result.items : [];
    return { status: 'success' as const, data: { movers: movers.slice(0, 25).map((entry: unknown) => { const mover = asObject(entry); return { name: mover.name ?? null, url: mover.url ?? null, category: mover.category ?? mover.console ?? null, price: mover.price ?? mover.current_price ?? null, change: mover.change ?? mover.dollar_change ?? null, percentChange: mover.percent_change ?? null }; }), source: 'Cross-category games, cards, and coins market-mover context' } };
  } catch {
    return { status: 'error' as const, message: 'Parse PriceCharting market-movers lookup could not be reached. Try again shortly.', data: null };
  }
}

export async function lookup130PointSales(query: string, env: ParseEnv = process.env) {
  const normalizedQuery = query.trim();
  const apiKey = env.PARSE_BOT_API_KEY;
  if (!apiKey) return { query: normalizedQuery, status: 'error' as const, message: 'Parse.bot API key not configured', data: null };
  if (!normalizedQuery) return { query: normalizedQuery, status: 'error' as const, message: 'Enter an item title before requesting 130point sales data.', data: null };

  try {
    const url = `${PARSE_API_BASE}/${ONE_THIRTY_POINT_SCRAPER_ID}/search_sold_items?sort=BestMatch&limit=10&query=${encodeURIComponent(normalizedQuery)}&marketplace=all`;
    const response = await fetch(url, { headers: { 'X-API-Key': apiKey } });
    const payload = await response.json().catch(() => null);
    if (!response.ok) { await recordParseFailure('130point sales lookup', response.status); return { query: normalizedQuery, status: 'error' as const, message: parseErrorMessage(response.status, 'Parse 130point'), data: null }; }

    const result = asObject(asObject(payload).data ?? payload);
    const items = Array.isArray(result.items) ? result.items.map((item: unknown) => {
      const sale = asObject(item);
      return {
        id: sale.id ?? null,
        title: sale.title ?? 'Untitled sale',
        price: sale.price ?? null,
        // Provider currency must be explicit. A missing currency remains
        // review/context evidence and cannot be promoted by a client default.
        currency: sale.currency ?? null,
        date: sale.date ?? null,
        recency: classifySaleRecency(sale.date),
        saleType: sale.sale_type ?? null,
        marketplace: sale.sold_via ?? null,
        url: sale.url ?? null,
        imageUrl: sale.image_url ?? null,
      };
    }) : [];

    return {
      query: normalizedQuery,
      status: 'success' as const,
      data: {
        totalFound: result.total_found ?? items.length,
        itemsReturned: result.items_returned ?? items.length,
        items,
      },
    };
  } catch {
    return { query: normalizedQuery, status: 'error' as const, message: 'Parse 130point lookup could not be reached. Try again shortly.', data: null };
  }
}

export async function lookupPwccSales(query: string, env: ParseEnv = process.env) {
  const normalizedQuery = query.trim();
  const apiKey = env.PARSE_BOT_API_KEY;
  if (!apiKey) return { query: normalizedQuery, status: 'error' as const, message: 'Parse.bot API key not configured', data: null };
  if (!normalizedQuery) return { query: normalizedQuery, status: 'error' as const, message: 'Enter an item title before requesting PWCC / Fanatics Collect sales data.', data: null };
  try {
    const params = new URLSearchParams({ keywords: normalizedQuery, status: 'Sold', page: '0', hits_per_page: '10' });
    const response = await fetch(`${PARSE_API_BASE}/${PWCC_SCRAPER_ID}/search_listings?${params.toString()}`, { headers: { 'X-API-Key': apiKey } });
    const payload = await response.json().catch(() => null);
    if (!response.ok) { await recordParseFailure('PWCC / Fanatics Collect lookup', response.status); return { query: normalizedQuery, status: 'error' as const, message: parseErrorMessage(response.status, 'PWCC / Fanatics Collect'), data: null }; }
    const result = asObject(asObject(payload).data ?? payload);
    const listings = Array.isArray(result.results) ? result.results.map((listing: unknown) => {
      const sale = asObject(listing);
      const soldDate = typeof sale.sold_date === 'number' ? new Date(sale.sold_date * 1000).toISOString().slice(0, 10) : sale.sold_date ?? null;
      const cents = sale.purchase_price_cents ?? sale.current_price_cents ?? null;
      return {
        id: sale.listing_uuid ?? sale.listing_id ?? null,
        title: sale.title ?? 'Untitled PWCC listing',
        price: typeof cents === 'number' ? cents / 100 : null,
        currency: typeof sale.currency === 'string' && sale.currency.trim() ? sale.currency.trim() : null,
        date: soldDate,
        recency: classifySaleRecency(soldDate),
        marketplace: sale.marketplace ?? 'Fanatics Collect',
        saleType: sale.auction_name ?? sale.marketplace ?? 'Sold listing',
        grade: sale.grade ?? null,
        certificationCompany: sale.grading_service ?? null,
        certNumber: sale.cert_number ?? null,
        url: sale.listing_uuid ? `https://www.pwccmarketplace.com/items/${sale.listing_uuid}` : null,
        imageUrl: sale.image_url ?? null,
      };
    }) : [];
    return { query: normalizedQuery, status: 'success' as const, data: { totalFound: result.total_hits ?? listings.length, itemsReturned: listings.length, items: listings } };
  } catch {
    return { query: normalizedQuery, status: 'error' as const, message: 'PWCC / Fanatics Collect lookup could not be reached. Try again shortly.', data: null };
  }
}
