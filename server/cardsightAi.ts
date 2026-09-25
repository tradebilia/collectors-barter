export type CardsightLookupInput = {
  title: string;
  category: string;
  grade?: string | null;
  condition?: string | null;
  certificationCompany?: string | null;
  itemDetails?: string | null;
};

type JsonRecord = Record<string, unknown>;
type LookupStatus = 'success' | 'partial' | 'review_required' | 'not_found' | 'error';
type ApiResult = { status: number; payload: JsonRecord | null; error: string | null };

type CardsightIdentity = {
  subject: string;
  setName: string;
  cardNumber: string;
  year: string;
  manufacturer: string;
  variant: string;
};

const API_BASE = 'https://api.cardsight.ai/v1';
const CATALOG_LIMIT = 5;
const PRICING_LIMIT = 25;
const MARKETPLACE_LIMIT = 20;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function asRecords(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(asRecord).filter((entry) => Object.keys(entry).length > 0) : [];
}

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

function normalize(value: unknown): string {
  return text(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeCardNumber(value: unknown): string {
  const firstPart = text(value).replace(/^#/, '').trim().split('/')[0] ?? '';
  const normalized = normalize(firstPart);
  return /^\d+$/.test(normalized) ? String(Number(normalized)) : normalized;
}

function normalizeGrade(value: unknown): string {
  return normalize(value).replace(/\b(grade|gem|mint|near)\b/g, '').replace(/\s+/g, '');
}

function parseDetails(itemDetails: string | null | undefined): JsonRecord {
  if (!itemDetails?.trim()) return {};
  try { return asRecord(JSON.parse(itemDetails)); } catch { return {}; }
}

function firstText(details: JsonRecord, keys: string[]): string {
  for (const key of keys) {
    const value = text(details[key]);
    if (value) return value;
  }
  return '';
}

function firstYear(details: JsonRecord): string {
  const value = firstText(details, ['year', 'releaseYear', 'cardYear']);
  return /^\d{4}$/.test(value) ? value : '';
}

function isCardCategory(category: string): boolean {
  const normalized = normalize(category).replace(/ /g, '_');
  return normalized === 'sports_cards' || normalized === 'pokemon';
}

function cardsightPokemonReleaseName(setName: string): string {
  const normalized = normalize(setName);
  // Tradebilia inventory sometimes stores the printing descriptor as the set
  // (for example "Shadowless"), while Cardsight catalogs it as a Base release
  // plus a named parallel. Keep the parallel separate so the catalog identity
  // can resolve without accidentally treating a Base card as Shadowless.
  if (/^(shadowless|unlimited|1st edition|first edition|red cheeks)$/.test(normalized)) return 'Base';
  return setName;
}

function identityFromInput(input: CardsightLookupInput): CardsightIdentity {
  const details = parseDetails(input.itemDetails);
  const isPokemon = normalize(input.category).replace(/ /g, '_') === 'pokemon';
  const subject = firstText(details, isPokemon
    ? ['cardName', 'pokemonName', 'name', 'subject']
    : ['player', 'athlete', 'subject', 'cardName', 'name']);
  const rawSetName = firstText(details, ['setName', 'cardSet', 'set', 'series', 'productName', 'releaseName']);
  return {
    subject: subject || input.title.replace(/^pokemon\s+/i, '').trim(),
    setName: isPokemon ? cardsightPokemonReleaseName(rawSetName) : rawSetName,
    cardNumber: firstText(details, ['cardNumber', 'cardNo', 'number']),
    year: firstYear(details),
    manufacturer: firstText(details, ['manufacturer', 'brand']),
    variant: firstText(details, ['variant', 'parallel', 'parallelVariation', 'printing', 'edition', 'editionEra', 'finish', 'finishVariant']),
  };
}

export function getCardsightApiKey(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.CARDSIGHT_API_KEY?.trim() || null;
}

/** Builds one bounded exact-identity catalog request; it never performs image identification automatically. */
export function buildCardsightCatalogQuery(input: CardsightLookupInput) {
  const identity = identityFromInput(input);
  const params = new URLSearchParams({ take: String(CATALOG_LIMIT) });
  if (identity.subject) params.set('name', identity.subject);
  if (identity.cardNumber) params.set('number', identity.cardNumber.replace(/^#/, '').split('/')[0] ?? identity.cardNumber);
  // Cardsight.ai uses both release and set names. A listing’s “set” commonly maps
  // to a provider release (for example Pokémon Base Set → release Base), so do not
  // over-constrain the request to only one hierarchy level before candidate review.
  if (identity.setName) params.set('releaseName', identity.setName);
  if (identity.year) params.set('year', identity.year);
  if (identity.manufacturer) params.set('manufacturer', identity.manufacturer);
  return { identity, categorySupported: isCardCategory(input.category), path: `/catalog/cards?${params.toString()}`, catalogLimit: CATALOG_LIMIT };
}

export type CardsightCatalogCandidate = { card: JsonRecord; score: number; exactIdentity: boolean; matched: string[] };

export function rankCardsightCatalogCandidates(input: CardsightLookupInput, cards: JsonRecord[]): CardsightCatalogCandidate[] {
  const identity = identityFromInput(input);
  const subject = normalize(identity.subject);
  const setName = normalize(identity.setName);
  const cardNumber = normalizeCardNumber(identity.cardNumber);
  const year = identity.year;
  return cards.map((card) => {
    const matched: string[] = [];
    const cardSubject = normalize(card.name);
    const cardSetNames = [card.setName, card.releaseName].map(normalize).filter(Boolean);
    const cardNumberValue = normalizeCardNumber(card.number);
    const nameMatch = Boolean(subject && cardSubject && subject === cardSubject);
    const setMatch = Boolean(setName && cardSetNames.some((cardSet) => setName === cardSet || setName.includes(cardSet) || cardSet.includes(setName)));
    const numberMatch = Boolean(cardNumber && cardNumberValue && cardNumber === cardNumberValue);
    const yearMatch = Boolean(year && text(card.releaseYear) === year);
    let score = 0;
    if (nameMatch) { score += 8; matched.push('subject'); }
    if (setMatch) { score += 7; matched.push('set'); }
    if (numberMatch) { score += 8; matched.push('card number'); }
    if (yearMatch) { score += 3; matched.push('year'); }
    const exactIdentity = Boolean(nameMatch && (cardNumber ? numberMatch : setMatch) && (setName ? setMatch : true));
    return { card, score, exactIdentity, matched };
  }).sort((left, right) => right.score - left.score);
}

export function selectCardsightParallel(detail: JsonRecord, variant: string): { id: string | null; name: string | null; status: 'base' | 'exact' | 'review_required' } {
  if (!variant.trim()) return { id: null, name: null, status: 'base' };
  const expected = normalize(variant);
  const candidate = asRecords(detail.parallels).find((parallel) => {
    const name = normalize(parallel.name);
    return Boolean(name && (name === expected || name.includes(expected) || expected.includes(name)));
  });
  const id = text(candidate?.id);
  return id ? { id, name: text(candidate?.name) || null, status: 'exact' } : { id: null, name: null, status: 'review_required' };
}

function extractProviderMessages(payload: JsonRecord | null): string[] {
  return asRecords(payload?.messages).map((message) => text(message.message || message.detail || message.code)).filter(Boolean);
}

async function apiGet(path: string, apiKey: string): Promise<ApiResult> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: 'application/json', 'X-API-Key': apiKey },
      signal: AbortSignal.timeout(15_000),
    });
    const raw = await response.text();
    let payload: JsonRecord | null = null;
    try { payload = asRecord(JSON.parse(raw)); } catch { payload = null; }
    const providerMessage = text(payload?.message ?? payload?.error ?? raw.slice(0, 240));
    return { status: response.status, payload, error: response.ok ? null : providerMessage || `Cardsight.ai returned HTTP ${response.status}.` };
  } catch (error) {
    return { status: 0, payload: null, error: error instanceof Error ? error.message : 'Cardsight.ai request failed.' };
  }
}

function recency(date: string): 'recent' | 'historical' | 'undated' {
  const timestamp = Date.parse(date);
  if (!Number.isFinite(timestamp)) return 'undated';
  const days = Math.floor((Date.now() - timestamp) / 86_400_000);
  return days >= 0 && days <= 365 ? 'recent' : 'historical';
}

function matchingGradeCompanyGroups(groups: JsonRecord[], targetCompany: string, targetGrade: string): Array<{ company: string; grade: string; gradeId: string | null; records: JsonRecord[] }> {
  const company = normalize(targetCompany);
  const grade = normalizeGrade(targetGrade);
  if (!company || !grade) return [];
  return groups.flatMap((group) => {
    if (normalize(group.company_name) !== company) return [];
    return asRecords(group.grades).flatMap((gradeGroup) => normalizeGrade(gradeGroup.grade_value) === grade
      ? [{ company: text(group.company_name), grade: text(gradeGroup.grade_value), gradeId: text(gradeGroup.grade_id) || null, records: asRecords(gradeGroup.records) }]
      : []);
  });
}

export function flattenCardsightPricing(payload: JsonRecord | null, input: Pick<CardsightLookupInput, 'grade' | 'certificationCompany'>) {
  const targetCompany = text(input.certificationCompany);
  const targetGrade = text(input.grade);
  const targetIsGraded = Boolean(targetCompany && targetGrade);
  const groups = targetIsGraded
    ? matchingGradeCompanyGroups(asRecords(payload?.graded), targetCompany, targetGrade)
    : [{ company: '', grade: '', gradeId: null, records: asRecords(asRecord(payload?.raw).records) }];
  return groups.flatMap(({ company, grade, gradeId, records }) => records.map((record) => {
    const listingType = text(record.listing_type).toLowerCase();
    const isCompletedAuction = listingType === 'auction';
    const date = text(record.date) || null;
    return {
      ...record,
      saleId: null,
      sourceId: 'cardsight_ai',
      provider: 'Cardsight.ai',
      marketplace: text(record.source) || null,
      title: text(record.title) || 'Untitled Cardsight.ai record',
      price: Number.isFinite(Number(record.price)) ? Number(record.price) : null,
      currency: 'USD',
      date,
      recency: recency(date ?? ''),
      saleStatus: isCompletedAuction ? 'completed' as const : 'active' as const,
      completed: isCompletedAuction,
      listingType: listingType || null,
      url: text(record.url) || null,
      imageUrl: text(record.image_url) || null,
      parallelId: text(record.parallel_id) || null,
      parallelName: text(record.parallel_name) || null,
      certificationCompany: company || null,
      grade: grade || null,
      gradeId,
      priceSemantics: isCompletedAuction
        ? 'Completed auction price (bid side); still subject to Tradebilia identity, grade, date, duplicate, currency, and visual gates.'
        : 'Fixed / Buy It Now price (ask side); context only and never a deterministic valuation input.',
    };
  }));
}

function flattenCardsightMarketplace(payload: JsonRecord | null, input: Pick<CardsightLookupInput, 'grade' | 'certificationCompany'>) {
  const targetCompany = text(input.certificationCompany);
  const targetGrade = text(input.grade);
  const targetIsGraded = Boolean(targetCompany && targetGrade);
  const groups = targetIsGraded
    ? matchingGradeCompanyGroups(asRecords(payload?.graded), targetCompany, targetGrade)
    : [{ company: '', grade: '', gradeId: null, records: asRecords(asRecord(payload?.raw).records) }];
  return groups.flatMap(({ company, grade, gradeId, records }) => records.map((record) => ({
    ...record,
    sourceId: 'cardsight_ai',
    provider: 'Cardsight.ai',
    marketplace: text(record.source) || null,
    title: text(record.title) || 'Untitled current listing',
    price: Number.isFinite(Number(record.price)) ? Number(record.price) : null,
    currency: 'USD',
    listingType: text(record.listing_type) || null,
    url: text(record.url) || null,
    imageUrl: text(record.image_url) || null,
    endDate: text(record.end_date) || null,
    bidCount: Number.isFinite(Number(record.bid_count)) ? Number(record.bid_count) : null,
    parallelId: text(record.parallel_id) || null,
    parallelName: text(record.parallel_name) || null,
    certificationCompany: company || null,
    grade: grade || null,
    gradeId,
  })));
}

function populationForTarget(payload: JsonRecord | null, parallel: { id: string | null; status: string }, certificationCompany: string | null | undefined) {
  if (!payload) return null;
  const variant = parallel.status === 'base'
    ? asRecord(payload.base)
    : asRecords(payload.parallels).find((entry) => text(entry.parallel_id) === parallel.id) ?? {};
  const company = normalize(certificationCompany);
  const companyData = asRecords(variant.grading_companies).find((entry) => normalize(entry.name) === company) ?? null;
  return {
    totalPopulation: payload.total_population ?? null,
    variantPopulation: variant.total_population ?? null,
    gradingCompany: companyData ? {
      name: text(companyData.name),
      totalPopulation: companyData.total_population ?? null,
      lastSyncedAt: text(companyData.last_synced_at) || null,
      gradingTypes: companyData.grading_types ?? [],
    } : null,
  };
}

/**
 * Read-only, sandbox-only Cardsight.ai adapter. It requests catalog identity first,
 * refuses unresolved parallel data, preserves provider payloads for review, and only
 * marks dated auction results as candidate completed-sale evidence.
 */
export async function lookupCardsightAi(input: CardsightLookupInput) {
  const request = buildCardsightCatalogQuery(input);
  if (!request.categorySupported) {
    return { status: 'error' as LookupStatus, request, candidates: [], selected: null, detail: null, parallel: null, sales: [], activeListings: [], population: null, messages: ['Cardsight.ai is available only for Sports Cards and Pokémon/TCG items.'], raw: { catalog: null, detail: null, pricing: null, marketplace: null, population: null } };
  }
  const apiKey = getCardsightApiKey();
  if (!apiKey) {
    return { status: 'error' as LookupStatus, request, candidates: [], selected: null, detail: null, parallel: null, sales: [], activeListings: [], population: null, messages: ['CARDSIGHT_API_KEY is not configured.'], raw: { catalog: null, detail: null, pricing: null, marketplace: null, population: null } };
  }

  const catalog = await apiGet(request.path, apiKey);
  if (catalog.error) {
    return { status: 'error' as LookupStatus, request, candidates: [], selected: null, detail: null, parallel: null, sales: [], activeListings: [], population: null, messages: [catalog.error], raw: { catalog: catalog.payload, detail: null, pricing: null, marketplace: null, population: null } };
  }

  const candidates = rankCardsightCatalogCandidates(input, asRecords(catalog.payload?.cards));
  const selected = candidates.find((candidate) => candidate.exactIdentity) ?? null;
  if (!selected) {
    return { status: candidates.length ? 'review_required' as LookupStatus : 'not_found' as LookupStatus, request, candidates, selected: null, detail: null, parallel: null, sales: [], activeListings: [], population: null, messages: [candidates.length ? 'Catalog candidates were returned, but none passed the strict subject, set, and card-number identity gate. No pricing or population lookup was requested.' : 'No Cardsight.ai catalog candidate was returned for this listing identity.'], raw: { catalog: catalog.payload, detail: null, pricing: null, marketplace: null, population: null } };
  }

  const cardId = text(selected.card.id);
  const detail = cardId ? await apiGet(`/catalog/cards/${encodeURIComponent(cardId)}`, apiKey) : { status: 0, payload: null, error: 'The matched catalog candidate did not include a card ID.' };
  if (detail.error || !detail.payload) {
    return { status: 'partial' as LookupStatus, request, candidates, selected, detail: null, parallel: null, sales: [], activeListings: [], population: null, messages: [`Card-detail request: ${detail.error ?? 'No detail payload returned.'}`], raw: { catalog: catalog.payload, detail: detail.payload, pricing: null, marketplace: null, population: null } };
  }

  const parallel = selectCardsightParallel(detail.payload, request.identity.variant);
  if (parallel.status === 'review_required') {
    return { status: 'review_required' as LookupStatus, request, candidates, selected, detail: detail.payload, parallel, sales: [], activeListings: [], population: null, messages: [`The listing specifies variant / parallel “${request.identity.variant}”, but it did not resolve to a Cardsight.ai parallel. No price, active-market, or population data was requested.`], raw: { catalog: catalog.payload, detail: detail.payload, pricing: null, marketplace: null, population: null } };
  }

  const parallelParams = new URLSearchParams({ period: '1y', listing_type: 'both', limit: String(PRICING_LIMIT) });
  const marketplaceParams = new URLSearchParams({ listing_type: 'both', limit: String(MARKETPLACE_LIMIT) });
  if (parallel.status === 'base') {
    parallelParams.set('parallel_id', 'null');
    marketplaceParams.set('parallel_id', 'null');
  } else if (parallel.id) {
    parallelParams.set('parallel_id', parallel.id);
    marketplaceParams.set('parallel_id', parallel.id);
  }

  const [pricing, marketplace, population] = await Promise.all([
    apiGet(`/pricing/${encodeURIComponent(cardId)}?${parallelParams.toString()}`, apiKey),
    apiGet(`/marketplace/${encodeURIComponent(cardId)}?${marketplaceParams.toString()}`, apiKey),
    apiGet(`/population/card/${encodeURIComponent(cardId)}`, apiKey),
  ]);
  const sales = flattenCardsightPricing(pricing.payload, input);
  const activeListings = flattenCardsightMarketplace(marketplace.payload, input);
  const providerMessages = [
    ...extractProviderMessages(pricing.payload),
    ...extractProviderMessages(marketplace.payload),
  ];
  const messages = [
    'Cardsight.ai catalog, population, and active listings are source-attributed context only. Only individually dated completed auction records that pass Tradebilia identity, grade/company, recency, duplicate, currency, and visual safeguards can support sandbox valuation.',
    parallel.status === 'base' ? 'The listing has no declared variant / parallel, so this lookup is limited to the provider base-card partition.' : `The lookup is limited to the exact provider parallel: ${parallel.name}.`,
    pricing.error ? `Pricing request: ${pricing.error}` : null,
    marketplace.error ? `Active-market request: ${marketplace.error}` : null,
    population.error ? `Population request: ${population.error}` : null,
    ...providerMessages,
  ].filter((message): message is string => Boolean(message));

  return {
    status: pricing.error && marketplace.error && population.error ? 'partial' as LookupStatus : 'success' as LookupStatus,
    request,
    candidates,
    selected,
    detail: detail.payload,
    parallel,
    sales,
    activeListings,
    population: { status: population.error ? 'unavailable' as const : 'available' as const, data: populationForTarget(population.payload, parallel, input.certificationCompany), message: population.error, totalPopulation: population.payload?.total_population ?? null },
    messages,
    raw: { catalog: catalog.payload, detail: detail.payload, pricing: pricing.payload, marketplace: marketplace.payload, population: population.payload },
    diagnostics: { pricingStatus: pricing.status, marketplaceStatus: marketplace.status, populationStatus: population.status, pricingLimit: PRICING_LIMIT, marketplaceLimit: MARKETPLACE_LIMIT },
  };
}
