const PARSE_API_BASE = 'https://api.parse.bot/scraper';
const SGC_SCRAPER_ID = 'f63ad1cb-5b08-4e33-9ea8-573b416e936d';
const PRICECHARTING_SCRAPER_ID = 'bbbbdc36-6d99-4a7a-8115-cf766b2497e3';
const ONE_THIRTY_POINT_SCRAPER_ID = '28d873f5-47d5-4c01-a275-e80c6b3fc610';
const PWCC_FANATICS_COLLECT_SCRAPER_ID = '6f75fc48-78a3-4fa4-a96a-937d35bf9385';

type ParseEnv = Record<string, string | undefined>;

function parseErrorMessage(status: number, provider: string): string {
  if (status === 401 || status === 403) return `${provider} credentials are not authorized. Check the secure Parse key configuration.`;
  if (status === 404) return `No ${provider} record was found for that lookup.`;
  if (status === 429) return `${provider} rate limit reached. Try again shortly.`;
  return `${provider} lookup is temporarily unavailable. Try again shortly.`;
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? value as Record<string, any> : {};
}

export type SaleRecency = 'recent' | 'historical' | 'undated';

export function classifySaleRecency(date: unknown, referenceTime = Date.now()): SaleRecency {
  if (typeof date !== 'string' || !date.trim()) return 'undated';
  const saleTime = Date.parse(date);
  if (Number.isNaN(saleTime) || saleTime > referenceTime) return 'undated';
  return referenceTime - saleTime <= 365 * 24 * 60 * 60 * 1000 ? 'recent' : 'historical';
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
    if (!response.ok) return { certCode: normalizedCertCode, status: 'error' as const, message: parseErrorMessage(response.status, 'Parse SGC'), data: null };

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
    if (!searchResponse.ok) return { query: normalizedQuery, status: 'error' as const, message: parseErrorMessage(searchResponse.status, 'Parse PriceCharting'), data: null };

    const searchData = asObject(asObject(searchPayload).data ?? searchPayload);
    const firstCard = Array.isArray(searchData.cards) ? asObject(searchData.cards[0]) : {};
    if (!firstCard.set_slug || !firstCard.card_slug) {
      return { query: normalizedQuery, status: 'not_found' as const, message: 'No matching Pokémon card was found in PriceCharting.', data: null };
    }

    const detailUrl = `${PARSE_API_BASE}/${PRICECHARTING_SCRAPER_ID}/get_card_detail?set_slug=${encodeURIComponent(firstCard.set_slug)}&card_slug=${encodeURIComponent(firstCard.card_slug)}`;
    const detailResponse = await fetch(detailUrl, { headers });
    const detailPayload = await detailResponse.json().catch(() => null);
    if (!detailResponse.ok) return { query: normalizedQuery, status: 'error' as const, message: parseErrorMessage(detailResponse.status, 'Parse PriceCharting'), data: null };

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

export async function lookup130PointSales(query: string, env: ParseEnv = process.env) {
  const normalizedQuery = query.trim();
  const apiKey = env.PARSE_BOT_API_KEY;
  if (!apiKey) return { query: normalizedQuery, status: 'error' as const, message: 'Parse.bot API key not configured', data: null };
  if (!normalizedQuery) return { query: normalizedQuery, status: 'error' as const, message: 'Enter an item title before requesting 130point sales data.', data: null };

  try {
    const url = `${PARSE_API_BASE}/${ONE_THIRTY_POINT_SCRAPER_ID}/search_sold_items?sort=BestMatch&limit=10&query=${encodeURIComponent(normalizedQuery)}&marketplace=all`;
    const response = await fetch(url, { headers: { 'X-API-Key': apiKey } });
    const payload = await response.json().catch(() => null);
    if (!response.ok) return { query: normalizedQuery, status: 'error' as const, message: parseErrorMessage(response.status, 'Parse 130point'), data: null };

    const result = asObject(asObject(payload).data ?? payload);
      const items = Array.isArray(result.items) ? result.items.map((item: unknown) => {
        const sale = asObject(item);
        const date = sale.date ?? null;
        return {
          id: sale.id ?? null,
          title: sale.title ?? 'Untitled sale',
          price: sale.price ?? null,
          currency: sale.currency ?? 'USD',
          date,
          recency: classifySaleRecency(date),
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

function asIsoDateFromUnixSeconds(value: unknown): string | null {
  const seconds = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

export async function lookupPwccFanaticsCollectSales(query: string, env: ParseEnv = process.env) {
  const normalizedQuery = query.trim();
  const apiKey = env.PARSE_BOT_API_KEY;
  if (!apiKey) return { query: normalizedQuery, status: 'error' as const, message: 'Parse.bot API key not configured', data: null };
  if (!normalizedQuery) return { query: normalizedQuery, status: 'error' as const, message: 'Enter an item title before requesting PWCC/Fanatics Collect sales data.', data: null };

  try {
    const url = `${PARSE_API_BASE}/${PWCC_FANATICS_COLLECT_SCRAPER_ID}/search_listings?status=Sold&hits_per_page=10&page=0&keywords=${encodeURIComponent(normalizedQuery)}`;
    const response = await fetch(url, { headers: { 'X-API-Key': apiKey } });
    const payload = await response.json().catch(() => null);
    if (!response.ok) return { query: normalizedQuery, status: 'error' as const, message: parseErrorMessage(response.status, 'Parse PWCC / Fanatics Collect'), data: null };

    const result = asObject(asObject(payload).data ?? payload);
    const items = Array.isArray(result.results) ? result.results.map((item: unknown) => {
      const listing = asObject(item);
      const date = asIsoDateFromUnixSeconds(listing.sold_date);
      const cents = Number(listing.purchase_price_cents);
      return {
        id: listing.listing_uuid ?? listing.listing_id ?? listing.object_id ?? null,
        title: listing.title ?? 'Untitled PWCC / Fanatics Collect sale',
        price: Number.isFinite(cents) ? cents / 100 : null,
        currency: 'USD',
        date,
        recency: classifySaleRecency(date),
        saleType: listing.marketplace ?? 'Auction',
        marketplace: 'PWCC / Fanatics Collect',
        grade: listing.grade ?? null,
        gradingService: listing.grading_service ?? null,
        certNumber: listing.cert_number ?? null,
        year: listing.year ?? null,
        brand: listing.brand ?? null,
        cardNumber: listing.card_number ?? null,
        auctionName: listing.auction_name ?? null,
        url: null,
        imageUrl: listing.image_url ?? null,
      };
    }) : [];

    if (!items.length) return { query: normalizedQuery, status: 'not_found' as const, message: 'No PWCC / Fanatics Collect sold listings were returned for this query.', data: null };
    return {
      query: normalizedQuery,
      status: 'success' as const,
      data: {
        totalFound: result.total_hits ?? items.length,
        itemsReturned: result.hits_per_page ?? items.length,
        items,
      },
    };
  } catch {
    return { query: normalizedQuery, status: 'error' as const, message: 'Parse PWCC / Fanatics Collect lookup could not be reached. Try again shortly.', data: null };
  }
}
