export type PokemonPriceTrackerLookupInput = {
  title: string;
  category: string;
  grade?: string | null;
  condition?: string | null;
  certificationCompany?: string | null;
  itemDetails?: string | null;
};

type JsonRecord = Record<string, unknown>;
type ApiResponse = {
  status: number;
  payload: JsonRecord | null;
  error: string | null;
  audit: {
    apiCallsConsumed: string | null;
    apiCallsBreakdown: string | null;
    dailyCreditsRemaining: string | null;
    minuteCallsRemaining: string | null;
    totalCreditsRemaining: string | null;
  };
};

type RankedCandidate = {
  card: JsonRecord;
  score: number;
  exactIdentity: boolean;
  matched: string[];
};

const API_BASE = 'https://www.pokemonpricetracker.com/api/v2';
const CANDIDATE_LIMIT = 1;
const FALLBACK_CANDIDATE_LIMIT = 3;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function asRecords(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) return value.map(asRecord).filter((entry) => Object.keys(entry).length > 0);
  const record = asRecord(value);
  return Object.keys(record).length ? [record] : [];
}

function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalize(value: unknown): string {
  return text(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseDetails(itemDetails: string | null | undefined): JsonRecord {
  if (!itemDetails?.trim()) return {};
  try {
    return asRecord(JSON.parse(itemDetails));
  } catch {
    return {};
  }
}

function firstText(details: JsonRecord, keys: string[]): string {
  for (const key of keys) {
    const value = text(details[key]);
    if (value) return value;
  }
  return '';
}

function normalizeLanguage(value: unknown): 'english' | 'japanese' {
  return normalize(value).includes('japan') ? 'japanese' : 'english';
}

function displayCardNumber(number: string, total: string): string {
  const cleanNumber = number.replace(/^#/, '').trim();
  const cleanTotal = total.trim();
  if (!cleanNumber) return '';
  return cleanTotal && !cleanNumber.includes('/') ? `${cleanNumber}/${cleanTotal}` : cleanNumber;
}

function normalizeCardNumberPart(value: string): string {
  const normalizedValue = normalize(value);
  return /^\d+$/.test(normalizedValue) ? String(Number(normalizedValue)) : normalizedValue;
}

function cardNumberMatches(expected: string, candidate: JsonRecord): boolean {
  const expectedParts = expected.replace(/^#/, '').trim().split('/').map(normalizeCardNumberPart);
  const candidateParts = text(candidate.cardNumber).replace(/^#/, '').trim().split('/').map(normalizeCardNumberPart);
  const candidateNumber = candidateParts[0] || '';
  const candidateTotal = normalizeCardNumberPart(text(candidate.totalSetNumber)) || candidateParts[1] || '';
  if (!expectedParts[0] || !candidateNumber || expectedParts[0] !== candidateNumber) return false;
  return expectedParts.length < 2 || !expectedParts[1] || expectedParts[1] === candidateTotal;
}

function cardPrintings(candidate: JsonRecord): string[] {
  const prices = asRecord(candidate.prices);
  const variants = asRecord(candidate.variants);
  const available = Array.isArray(candidate.printingsAvailable) ? candidate.printingsAvailable : [];
  return [
    prices.primaryPrinting,
    ...Object.keys(variants),
    ...available,
  ].map(normalize).filter(Boolean);
}

function listingIdentity(input: PokemonPriceTrackerLookupInput) {
  const details = parseDetails(input.itemDetails);
  const cardName = firstText(details, ['cardName', 'pokemonName', 'name']) || input.title.replace(/^pokemon\s+/i, '').trim();
  const cardNumber = firstText(details, ['cardNumber', 'cardNo', 'number']);
  const setName = firstText(details, ['setName', 'set', 'cardSet', 'expansion']);
  const variant = firstText(details, ['variant', 'variation', 'printing', 'editionEra', 'finish']);
  const language = normalizeLanguage(firstText(details, ['language', 'cardLanguage', 'printingLanguage']));
  const search = [cardName, cardNumber, setName, variant].filter(Boolean).join(' ').trim() || input.title.trim();
  return { cardName, cardNumber, setName, variant, language, search };
}

export function buildPokemonPriceTrackerQuery(input: PokemonPriceTrackerLookupInput) {
  const identity = listingIdentity(input);
  return {
    query: identity.search,
    language: identity.language,
    identity,
    candidateLimit: CANDIDATE_LIMIT,
  };
}

export function rankPokemonPriceTrackerCandidates(input: PokemonPriceTrackerLookupInput, candidates: JsonRecord[]): RankedCandidate[] {
  const identity = listingIdentity(input);
  const expectedName = normalize(identity.cardName);
  const expectedSet = normalize(identity.setName);
  const expectedVariant = normalize(identity.variant);

  return candidates
    .map((card) => {
      let score = 0;
      const matched: string[] = [];
      const candidateName = normalize(card.name);
      const candidateSet = normalize(card.setName);
      const numberMatch = identity.cardNumber ? cardNumberMatches(identity.cardNumber, card) : false;
      const setMatch = Boolean(expectedSet && candidateSet && (candidateSet === expectedSet || candidateSet.includes(expectedSet) || expectedSet.includes(candidateSet)));
      const nameMatch = Boolean(expectedName && candidateName && (candidateName === expectedName || candidateName.includes(expectedName) || expectedName.includes(candidateName)));
      const exactNameMatch = Boolean(expectedName && candidateName && candidateName === expectedName);
      const variantMatch = Boolean(expectedVariant && cardPrintings(card).some((printing) => printing === expectedVariant || printing.includes(expectedVariant) || expectedVariant.includes(printing)));

      if (nameMatch) { score += 6; matched.push('card name'); }
      if (numberMatch) { score += 7; matched.push('card number'); }
      if (setMatch) { score += 6; matched.push('set'); }
      if (variantMatch) { score += 3; matched.push('printing / variant'); }
      const exactIdentity = Boolean(exactNameMatch && numberMatch && setMatch);
      return { card, score, exactIdentity, matched };
    })
    .sort((left, right) => right.score - left.score);
}

export function getPokemonPriceTrackerApiKey(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.POKEMON_PRICE_TRACKER_API_KEY?.trim() || null;
}

async function apiGet(path: string, apiKey: string): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    const raw = await response.text();
    let payload: JsonRecord | null = null;
    try {
      payload = asRecord(JSON.parse(raw));
    } catch {
      payload = null;
    }
    const message = text(payload?.message ?? payload?.error ?? raw.slice(0, 240));
    return {
      status: response.status,
      payload,
      error: response.ok ? null : message || `Pokémon Price Tracker returned HTTP ${response.status}.`,
      audit: {
        apiCallsConsumed: response.headers.get('x-api-calls-consumed') ?? response.headers.get('x-ratelimit-cost'),
        apiCallsBreakdown: response.headers.get('x-api-calls-breakdown'),
        dailyCreditsRemaining: response.headers.get('x-ratelimit-daily-remaining'),
        minuteCallsRemaining: response.headers.get('x-ratelimit-minute-remaining'),
        totalCreditsRemaining: response.headers.get('x-ratelimit-total-remaining'),
      },
    };
  } catch (error) {
    return {
      status: 0,
      payload: null,
      error: error instanceof Error ? error.message : 'Pokémon Price Tracker request failed.',
      audit: { apiCallsConsumed: null, apiCallsBreakdown: null, dailyCreditsRemaining: null, minuteCallsRemaining: null, totalCreditsRemaining: null },
    };
  }
}

function responseMetadata(payload: JsonRecord | null): JsonRecord {
  return asRecord(payload?.metadata);
}

function populationStatus(response: ApiResponse) {
  if (response.status === 200) return { status: 'available' as const, message: null, data: response.payload?.data ?? null, audit: response.audit };
  if (response.status === 403) return { status: 'unavailable_for_plan' as const, message: 'Population data requires the provider’s Business or Enterprise access. No population data was used.', data: null, audit: response.audit };
  if (response.status === 404) return { status: 'not_found' as const, message: 'No population record was returned for this catalog candidate.', data: null, audit: response.audit };
  return { status: 'error' as const, message: response.error ?? 'Population lookup could not be completed.', data: null, audit: response.audit };
}

/**
 * Sandbox-only adapter. It requests a bounded candidate list, then one exact-card
 * detail record with all documented optional field groups. Prices, histories,
 * eBay aggregates/listings, Cardmarket, and population never feed valuation.
 */
export async function lookupPokemonPriceTracker(input: PokemonPriceTrackerLookupInput) {
  const category = normalize(input.category).replace(/ /g, '_');
  const request = buildPokemonPriceTrackerQuery(input);
  if (category !== 'pokemon') {
    return {
      status: 'error' as const,
      request,
      candidates: [],
      selected: null,
      detail: null,
      population: { status: 'not_checked' as const, message: 'Pokémon Price Tracker is available only for Pokémon/TCG items.', data: null, audit: null },
      metadata: null,
      audit: { search: null, detail: null, population: null },
      messages: ['Pokémon Price Tracker is available only for Pokémon/TCG items.'],
      raw: { search: null, detail: null, population: null },
    };
  }

  const apiKey = getPokemonPriceTrackerApiKey();
  if (!apiKey) {
    return {
      status: 'error' as const,
      request,
      candidates: [],
      selected: null,
      detail: null,
      population: { status: 'not_checked' as const, message: 'POKEMON_PRICE_TRACKER_API_KEY is not configured.', data: null, audit: null },
      metadata: null,
      audit: { search: null, detail: null, population: null },
      messages: ['POKEMON_PRICE_TRACKER_API_KEY is not configured.'],
      raw: { search: null, detail: null, population: null },
    };
  }

  const searchParams = new URLSearchParams({ search: request.query, language: request.language, limit: String(request.candidateLimit) });
  const search = await apiGet(`/cards?${searchParams.toString()}`, apiKey);
  if (search.error) {
    return {
      status: 'error' as const,
      request,
      candidates: [],
      selected: null,
      detail: null,
      population: { status: 'not_checked' as const, message: 'Population was not requested because catalog lookup failed.', data: null, audit: null },
      metadata: responseMetadata(search.payload),
      audit: { search: search.audit, detail: null, population: null },
      messages: [search.error],
      raw: { search: search.payload, detail: null, population: null },
    };
  }

  let candidateSearch = search;
  let searchAudit: unknown = search.audit;
  let rawSearch: unknown = search.payload;
  let usedBroadFallback = false;
  if (asRecords(search.payload?.data).length === 0 && request.identity.cardName) {
    const fallbackParams = new URLSearchParams({
      search: request.identity.cardName,
      language: request.language,
      limit: String(FALLBACK_CANDIDATE_LIMIT),
    });
    if (request.identity.setName) fallbackParams.set('set', request.identity.setName);
    const fallback = await apiGet(`/cards?${fallbackParams.toString()}`, apiKey);
    if (!fallback.error) {
      candidateSearch = fallback;
      usedBroadFallback = true;
    }
    searchAudit = { primary: search.audit, fallback: fallback.audit };
    rawSearch = { primary: search.payload, fallback: fallback.payload };
  }

  const candidates = rankPokemonPriceTrackerCandidates(input, asRecords(candidateSearch.payload?.data));
  const selected = candidates.find((candidate) => candidate.exactIdentity) ?? null;
  if (!selected) {
    return {
      status: candidates.length ? 'review_required' as const : 'not_found' as const,
      request,
      candidates,
      selected: null,
      detail: null,
      population: { status: 'not_checked' as const, message: 'Population was not requested because no exact set, card number, and card-name candidate was established.', data: null, audit: null },
      metadata: responseMetadata(candidateSearch.payload),
      audit: { search: searchAudit, detail: null, population: null },
      messages: [usedBroadFallback ? 'The precise catalog query returned no result, so a bounded name-and-set fallback was used.' : null, candidates.length ? 'Catalog candidates were returned, but none matched the listing on card name, card number, and set. Review manually before using provider context.' : 'No catalog candidates were returned.'].filter((message): message is string => Boolean(message)),
      raw: { search: rawSearch, detail: null, population: null },
    };
  }

  const selectedId = text(selected.card.tcgPlayerId || selected.card.id);
  const detailParams = new URLSearchParams({
    language: request.language,
    includeHistory: 'true',
    includeEbay: 'true',
    includeCardmarket: 'true',
  });
  const detail = selectedId
    ? await apiGet(`/cards/${encodeURIComponent(selectedId)}?${detailParams.toString()}`, apiKey)
    : { status: 0, payload: null, error: 'The exact catalog candidate did not include a retrievable ID.', audit: { apiCallsConsumed: null, apiCallsBreakdown: null, dailyCreditsRemaining: null, minuteCallsRemaining: null, totalCreditsRemaining: null } };
  const population = selectedId
    ? await apiGet(`/population?${new URLSearchParams({ tcgPlayerId: selectedId, language: request.language, limit: '1' }).toString()}`, apiKey)
    : { status: 0, payload: null, error: 'No catalog ID was available for population lookup.', audit: { apiCallsConsumed: null, apiCallsBreakdown: null, dailyCreditsRemaining: null, minuteCallsRemaining: null, totalCreditsRemaining: null } };

  const messages = [
    'Provider catalog, guide prices, price history, eBay data, Cardmarket data, and population are shown as source-attributed context only. They do not alter Tradebilia valuation, confidence, or verdicts.',
    usedBroadFallback ? 'The precise catalog query returned no result, so a bounded name-and-set fallback was used.' : null,
    detail.error ? `Detail-field request: ${detail.error}` : null,
    population.status === 403 ? 'Population data is unavailable on the current provider plan.' : population.error ? `Population request: ${population.error}` : null,
  ].filter((message): message is string => Boolean(message));

  return {
    status: detail.error ? 'partial' as const : 'success' as const,
    request,
    candidates,
    selected,
    detail: detail.payload?.data ?? null,
    population: populationStatus(population),
    metadata: responseMetadata(detail.payload) || responseMetadata(candidateSearch.payload),
    audit: { search: searchAudit, detail: detail.audit, population: population.audit },
    messages,
    raw: { search: rawSearch, detail: detail.payload, population: population.payload },
  };
}
