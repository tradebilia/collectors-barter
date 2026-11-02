import {
  AUTOGRAPH_SEARCH_DESIGNATION,
  buildComicsOriginalArtQueries,
  buildSportsCardTestAiCriteria,
  buildSportsCardTestAiQueries,
  buildStructuredItemQuery,
  buildVideoGameTestAiCriteria,
  normalizeTestAiGrade,
  parseTestAiDetails,
  resolveTestAiDetailValue,
  resolveTestAiGradingCompany,
  resolveTestAiYear,
} from './testAiCriteria';

export type MarketplaceSearchDefinitionInput = {
  title: string;
  category: string;
  itemType?: string | null;
  grade?: string | null;
  condition?: string | null;
  certificationCompany?: string | null;
  itemDetails?: unknown;
};

export type MarketplaceSearchDefinition = {
  category: string;
  itemType: string;
  query: string;
  baseQuery: string;
  fallbackQueries: string[];
  designation: string | null;
  fieldsUsed: string[];
  marketContextOnly: boolean;
};

function categoryName(category: string): string {
  return category.trim().toLowerCase().replace(/[- ]+/g, '_');
}

function itemTypeName(itemType: string | null | undefined): string {
  return String(itemType ?? '').trim().toLowerCase().replace(/[ -]+/g, '_');
}

function text(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values.map(text).filter(Boolean))];
}
const NON_IDENTITY_TITLE_TOKENS = new Set([
  'new', 'used', 'mint', 'near', 'excellent', 'good', 'fair', 'poor', 'sealed', 'open', 'opened',
  'unopened', 'like', 'condition', 'blu', 'ray', 'dvd', 'vhs', 'cd', 'box', 'set', 'raw', 'graded',
  'authentic', 'authenticated', 'signed', 'autograph', 'psa', 'bgs', 'cgc', 'sgc', 'pcgs', 'ngc',
  'wata', 'afa', 'jsa', 'coa', 'holo', 'holofoil', 'english', 'japanese', 'german', 'french',
  'disney', 'pin', 'pins', 'movie', 'film', 'game', 'video',
]);
function meaningfulTitleTokens(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/\b(?:19|20)\d{2}\b/g, ' ')
    .replace(/\b\d+(?:\.\d+)?\b/g, ' ')
    .replace(/[^a-z]+/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !NON_IDENTITY_TITLE_TOKENS.has(token));
}
function ensureIdentityAnchor(baseQuery: string, title: string): string {
  const normalizedBase = baseQuery.toLowerCase();
  const identityTokens = meaningfulTitleTokens(title);
  if (!identityTokens.length || identityTokens.some((token) => new RegExp(`\\b${token.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i').test(normalizedBase))) return baseQuery;
  return unique([title, baseQuery]).join(' ').slice(0, 240).trim();
}

function appendSearchContext(baseQuery: string, input: MarketplaceSearchDefinitionInput, details: Record<string, any>): string {
  const cert = resolveTestAiGradingCompany(details, input.certificationCompany ?? '');
  const category = categoryName(input.category);
  const grade = normalizeTestAiGrade(input.grade, cert, category);
  const condition = text(input.condition);
  const context = cert && grade
    ? [cert, grade]
    : grade
      ? [grade]
      : condition && category !== 'video_games'
        ? [condition]
        : [];
  return unique([baseQuery, ...context]).join(' ').slice(0, 240).trim();
}

/**
 * The single source-neutral marketplace search contract.
 * Providers may translate the resulting query into their own URL/API format,
 * but they must start with this same category/item-type identity definition.
 */
export function buildMarketplaceSearchDefinition(input: MarketplaceSearchDefinitionInput): MarketplaceSearchDefinition {
  const category = categoryName(input.category);
  const itemType = itemTypeName(input.itemType);
  const details = parseTestAiDetails(input.itemDetails);
  const value = (...keys: string[]) => keys.map((key) => resolveTestAiDetailValue(details, key)).find(Boolean) ?? '';
  const cert = resolveTestAiGradingCompany(details, input.certificationCompany ?? '');
  const grade = text(input.grade);
  const condition = text(input.condition);
  const fieldsUsed: string[] = [];
  let designation: string | null = null;
  let marketContextOnly = false;
  let baseTerms: string[] = [];
  let fallbackQueries: string[] = [];

  if (category === 'cert_direct') {
    baseTerms = [input.title];
    fieldsUsed.push('prebuilt certificate query');
  } else if (category === 'comics' && itemType === 'original_art') {
    const queries = buildComicsOriginalArtQueries(input.itemDetails, input.title);
    baseTerms = [queries[0] ?? input.title];
    fallbackQueries = queries;
    marketContextOnly = true;
    fieldsUsed.push('artist', 'artwork title / character', 'art type', 'comic title', 'issue number');
  } else if (category === 'sports_cards') {
    baseTerms = [buildSportsCardTestAiCriteria(details, input.itemType ?? '')];
    fieldsUsed.push('year', 'manufacturer', 'sport', 'player/card identity', 'card number or product identity');
    fallbackQueries = buildSportsCardTestAiQueries(details, input.title, cert, grade, input.itemType ?? '');
  } else if (category === 'comics') {
    const comicTitle = value('comicTitle', 'series', 'title') || input.title;
    const issueNumber = value('issueNumber', 'issueNo', 'issue');
    baseTerms = [comicTitle, issueNumber ? issueNumber.replace(/^#/, '') : '', value('year', 'publicationYear', 'issueYear'), value('publisher'), value('variant')];
    fieldsUsed.push('comic title', 'issue number', 'year', 'publisher', 'variant');
  } else if (category === 'video_games') {
    baseTerms = [buildVideoGameTestAiCriteria(details, input.title)];
    fieldsUsed.push('release year', 'game title', 'platform');
  } else if (category === 'movies') {
    baseTerms = [value('title', 'movieTitle', 'name') || input.title, value('format')];
    fieldsUsed.push('movie title', 'format');
  } else if (category === 'autographs') {
    designation = AUTOGRAPH_SEARCH_DESIGNATION;
    baseTerms = [designation, value('signer') || input.title, value('signedItemType'), value('autographCategory'), value('authenticationCompany', 'customAuthenticationCompany'), value('inscription', 'inscriptionText', 'personalization')];
    fieldsUsed.push('signer', 'signed item type', 'autograph category', 'authentication company', 'inscription');
    marketContextOnly = true;
  } else if (category === 'pokemon') {
    baseTerms = [value('year'), value('editionEra'), value('cardName', 'pokemonName', 'name'), value('cardNumber', 'cardNo', 'number'), value('finish', 'finishVariant'), value('cardType', 'mechanic'), value('language')];
    fieldsUsed.push('year', 'edition/era', 'card name', 'card number', 'finish', 'card type/mechanic', 'language');
  } else if (category === 'vintage_toys') {
    baseTerms = [value('year'), value('toyName', 'toyNameCharacter', 'vehicleName', 'playsetName', 'gamePuzzleName', 'modelKitName') || input.title, value('brand', 'franchise'), value('line'), value('setNumber'), value('version', 'variant')];
    fieldsUsed.push('year', 'toy identity', 'brand/franchise', 'line', 'set number', 'version/variant');
  } else if (category === 'disney_pins') {
    baseTerms = ['Disney Pins', value('character'), value('pinName', 'name'), value('edition', 'variant')];
    fieldsUsed.push('character', 'pin name', 'edition/variant');
  } else if (category === 'stamps') {
    baseTerms = [value('year'), value('scottNumber', 'catalogNumber'), value('denomination'), value('country'), value('series'), value('perforation'), value('watermark'), value('overprintSurcharge')];
    fieldsUsed.push('year', 'catalog/Scott number', 'denomination', 'country', 'series', 'perforation', 'watermark', 'overprint/surcharge');
  } else if (category === 'music') {
    baseTerms = [value('releaseTitle', 'album'), value('artist', 'performer'), value('releaseYear'), value('catalogNumber'), value('pressingDetails')];
    fieldsUsed.push('release title', 'artist', 'release year', 'catalog number', 'pressing details');
  } else if (category === 'coins') {
    baseTerms = [value('year'), value('denomination'), value('series', 'coinSeries', 'name', 'subject'), value('mintMark', 'mint'), value('country'), value('variety'), value('designation')];
    fieldsUsed.push('year', 'denomination', 'series', 'mint mark', 'country', 'variety', 'designation');
  } else {
    baseTerms = [buildStructuredItemQuery(category, details, [], input.itemType ?? '') || input.title];
    fieldsUsed.push('category-defined structured identity fields');
  }

  const structuredBaseQuery = unique(baseTerms).join(' ').trim() || input.title.trim();
  const baseQuery = ensureIdentityAnchor(structuredBaseQuery, input.title.trim());
  const query = category === 'cert_direct'
    ? input.title.trim()
    : appendSearchContext(baseQuery, input, details);
  const standardFallbacks = unique([query, baseQuery, input.title]);
  const mergedFallbacks = unique([...fallbackQueries, ...standardFallbacks]).slice(0, 10);

  return {
    category,
    itemType,
    query,
    baseQuery,
    fallbackQueries: mergedFallbacks,
    designation,
    fieldsUsed,
    marketContextOnly,
  };
}
