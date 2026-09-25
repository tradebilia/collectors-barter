export type TestAiP0IdentityInput = {
  title: string;
  category: string;
  itemType?: string | null;
  grade?: string | null;
  condition?: string | null;
  certificationCompany?: string | null;
  itemDetails?: string | Record<string, unknown> | null;
};

export type P0IdentityField = {
  key: string;
  label: string;
  value: string;
  material: boolean;
};

export type P0IdentityReadiness = 'ready' | 'limited' | 'missing_critical';

export type TestAiP0Identity = {
  category: string;
  itemType: string;
  fields: P0IdentityField[];
  materialFields: string[];
  missingCriticalFields: string[];
  readiness: P0IdentityReadiness;
};

export type EvidenceSourceRole =
  | 'valuation_candidate'
  | 'asking_price_context'
  | 'historical_context'
  | 'certification_context'
  | 'reference_context';

export type P0EvidenceSufficiency = {
  status: 'sufficient' | 'limited' | 'unavailable';
  completedSaleCount: number;
  askingListingCount: number;
  historicalRecordCount: number;
  unavailableSourceCount: number;
  message: string;
};

type DetailRecord = Record<string, unknown>;

type IdentityRule = {
  fields: Array<{ key: string; label: string; aliases: string[]; material?: boolean }>;
  critical: string[];
};

const IDENTITY_RULES: Record<string, IdentityRule> = {
  sports_cards: {
    fields: [
      { key: 'player', label: 'Player', aliases: ['player', 'athlete', 'subject'], material: true },
      { key: 'year', label: 'Year', aliases: ['year', 'manufactureYear'], material: true },
      { key: 'manufacturer', label: 'Manufacturer', aliases: ['customManufacturer', 'manufacturer', 'brand'], material: true },
      { key: 'setName', label: 'Set', aliases: ['setName', 'set', 'cardSet'] },
      { key: 'cardNumber', label: 'Card #', aliases: ['cardNumber', 'cardNo', 'number'], material: true },
      { key: 'parallelVariation', label: 'Parallel / variation', aliases: ['parallelVariation', 'parallel', 'variation', 'variant'] },
      { key: 'certificationCompany', label: 'Grader', aliases: [], material: true },
      { key: 'grade', label: 'Grade', aliases: [], material: true },
    ],
    critical: ['player', 'year', 'manufacturer'],
  },
  pokemon: {
    fields: [
      { key: 'cardName', label: 'Card name', aliases: ['cardName', 'pokemonName', 'name'], material: true },
      { key: 'setName', label: 'Set', aliases: ['setName', 'set', 'cardSet'], material: true },
      { key: 'cardNumber', label: 'Card #', aliases: ['cardNumber', 'cardNo', 'number'], material: true },
      { key: 'editionEra', label: 'Edition / era', aliases: ['editionEra', 'edition', 'era'] },
      { key: 'finishVariant', label: 'Finish / variant', aliases: ['finishVariant', 'variant', 'variation'] },
      { key: 'language', label: 'Language', aliases: ['language'] },
      { key: 'certificationCompany', label: 'Grader', aliases: [], material: true },
      { key: 'grade', label: 'Grade', aliases: [], material: true },
    ],
    critical: ['cardName', 'setName', 'cardNumber'],
  },
  comics: {
    fields: [
      { key: 'comicTitle', label: 'Series', aliases: ['comicTitle', 'series', 'title'], material: true },
      { key: 'issueNumber', label: 'Issue #', aliases: ['issueNumber', 'issue', 'number'], material: true },
      { key: 'publisher', label: 'Publisher', aliases: ['publisher'], material: true },
      { key: 'volume', label: 'Volume', aliases: ['volume'] },
      { key: 'variantDescription', label: 'Variant', aliases: ['variantDescription', 'variant', 'variation'] },
      { key: 'certificationCompany', label: 'Grader', aliases: [], material: true },
      { key: 'grade', label: 'Grade', aliases: [], material: true },
    ],
    critical: ['comicTitle', 'issueNumber', 'publisher'],
  },
  coins: {
    fields: [
      { key: 'country', label: 'Country', aliases: ['country', 'issuingCountry'], material: true },
      { key: 'denomination', label: 'Denomination', aliases: ['denomination', 'faceValue'], material: true },
      { key: 'year', label: 'Year', aliases: ['year', 'issueYear'], material: true },
      { key: 'mintMark', label: 'Mint mark', aliases: ['mintMark', 'mint'] },
      { key: 'variety', label: 'Variety', aliases: ['variety', 'varietyName'] },
      { key: 'certificationCompany', label: 'Grader', aliases: [], material: true },
      { key: 'grade', label: 'Grade', aliases: [], material: true },
    ],
    critical: ['denomination', 'year'],
  },
  stamps: {
    fields: [
      { key: 'country', label: 'Country', aliases: ['country', 'issuingCountry'], material: true },
      { key: 'scottNumber', label: 'Scott #', aliases: ['scottNumber', 'catalogNumber'], material: true },
      { key: 'year', label: 'Year', aliases: ['year', 'issueYear'], material: true },
      { key: 'denomination', label: 'Denomination', aliases: ['denomination', 'faceValue'], material: true },
      { key: 'mintOrUsed', label: 'Mint / used', aliases: ['mintOrUsed'] },
      { key: 'hinged', label: 'Hinged', aliases: ['hinged', 'hingeStatus', 'gumCondition'] },
      { key: 'certificationCompany', label: 'Grader', aliases: [], material: true },
      { key: 'grade', label: 'Grade', aliases: [], material: true },
    ],
    critical: ['country', 'scottNumber'],
  },
  video_games: {
    fields: [
      { key: 'gameTitle', label: 'Game / console', aliases: ['gameTitle', 'consoleName', 'accessoryName', 'title'], material: true },
      { key: 'platform', label: 'Platform', aliases: ['platform', 'console', 'system'], material: true },
      { key: 'modelNumber', label: 'Model #', aliases: ['modelNumber', 'productCode', 'catalogNumber'] },
      { key: 'region', label: 'Region', aliases: ['region'] },
      { key: 'edition', label: 'Edition', aliases: ['edition', 'releaseType', 'version'] },
      { key: 'completeInBox', label: 'CIB', aliases: ['completeInBox'] },
      { key: 'sealed', label: 'Sealed', aliases: ['sealed', 'factorySealed'] },
      { key: 'certificationCompany', label: 'Grader', aliases: [], material: true },
      { key: 'grade', label: 'Grade', aliases: [], material: true },
    ],
    critical: ['gameTitle', 'platform'],
  },
  vintage_toys: {
    fields: [
      { key: 'toyName', label: 'Toy name', aliases: ['toyName', 'name'], material: true },
      { key: 'brand', label: 'Brand', aliases: ['brand', 'manufacturer', 'publisherBrand'], material: true },
      { key: 'franchise', label: 'Franchise / line', aliases: ['franchise', 'line', 'toyLine'] },
      { key: 'year', label: 'Year', aliases: ['year', 'manufactureYear'] },
      { key: 'setNumber', label: 'Set / model #', aliases: ['setNumber', 'modelNumber', 'catalogNumber'] },
      { key: 'packagingType', label: 'Packaging', aliases: ['packagingType'] },
      { key: 'complete', label: 'Complete', aliases: ['complete'] },
      { key: 'certificationCompany', label: 'Grader', aliases: [], material: true },
      { key: 'grade', label: 'Grade', aliases: [], material: true },
    ],
    critical: ['toyName'],
  },
  movies: {
    fields: [
      { key: 'title', label: 'Title', aliases: ['title', 'movieTitle'], material: true },
      { key: 'format', label: 'Format', aliases: ['customFormat', 'format', 'mediaFormat'], material: true },
      { key: 'releaseYear', label: 'Release year', aliases: ['releaseYear', 'year'] },
      { key: 'edition', label: 'Edition', aliases: ['edition', 'version', 'releaseType'], material: true },
      { key: 'region', label: 'Region', aliases: ['region'] },
      { key: 'sealed', label: 'Sealed', aliases: ['sealed', 'factorySealed'] },
      { key: 'certificationCompany', label: 'Grader', aliases: [], material: true },
      { key: 'grade', label: 'Grade', aliases: [], material: true },
    ],
    critical: ['title', 'format'],
  },
  autographs: {
    fields: [
      { key: 'signer', label: 'Signer', aliases: ['signer'], material: true },
      { key: 'signedItemType', label: 'Signed item', aliases: ['signedItemType', 'itemType'], material: true },
      { key: 'authenticationCompany', label: 'Authentication company', aliases: ['customAuthenticationCompany', 'authenticationCompany'], material: true },
      { key: 'certificateNumber', label: 'Certificate', aliases: ['certificateNumber', 'certNumber', 'authenticationNumber'], material: true },
      { key: 'inscriptionPresent', label: 'Inscription', aliases: ['inscriptionPresent'] },
    ],
    critical: ['signer', 'signedItemType'],
  },
  disney_pins: {
    fields: [
      { key: 'pinName', label: 'Pin name', aliases: ['pinName', 'name'], material: true },
      { key: 'character', label: 'Character', aliases: ['character'] },
      { key: 'series', label: 'Series', aliases: ['series'] },
      { key: 'year', label: 'Year', aliases: ['year'] },
      { key: 'pinTradingEvent', label: 'Event', aliases: ['pinTradingEvent', 'event'] },
      { key: 'limitedEdition', label: 'Limited edition', aliases: ['limitedEdition'] },
      { key: 'backstampInformation', label: 'Backstamp', aliases: ['backstampInformation', 'backstamp'] },
    ],
    critical: ['pinName'],
  },
  music: {
    fields: [
      { key: 'artist', label: 'Artist', aliases: ['artist', 'performer'], material: true },
      { key: 'releaseTitle', label: 'Release title', aliases: ['releaseTitle', 'albumTitle', 'title'], material: true },
      { key: 'catalogNumber', label: 'Catalog #', aliases: ['catalogNumber'] },
      { key: 'recordLabel', label: 'Label', aliases: ['recordLabel', 'label'] },
      { key: 'country', label: 'Country', aliases: ['country'] },
      { key: 'releaseYear', label: 'Release year', aliases: ['releaseYear', 'year'] },
      { key: 'edition', label: 'Edition', aliases: ['edition', 'version', 'pressingDetails'] },
      { key: 'certificationCompany', label: 'Grader', aliases: [], material: true },
      { key: 'grade', label: 'Grade', aliases: [], material: true },
    ],
    critical: ['artist', 'releaseTitle'],
  },
};

function normalizeCategory(category: string): string {
  return String(category ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(', ');
  return String(value).trim();
}

function parseDetails(value: TestAiP0IdentityInput['itemDetails']): DetailRecord {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as DetailRecord : {};
  } catch {
    return {};
  }
}

function firstText(details: DetailRecord, aliases: string[]): string {
  for (const key of aliases) {
    const value = text(details[key]);
    if (value) return value;
  }
  return '';
}

function normalizeCompany(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function displayCategory(category: string): string {
  return category.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function buildTestAiP0Identity(input: TestAiP0IdentityInput): TestAiP0Identity {
  const category = normalizeCategory(input.category);
  const details = parseDetails(input.itemDetails);
  const rule = IDENTITY_RULES[category] ?? {
    fields: [{ key: 'title', label: 'Title', aliases: ['title'], material: true }],
    critical: ['title'],
  };
  const fields = rule.fields.map((field) => {
    let value = field.aliases.length ? firstText(details, field.aliases) : '';
    if (field.key === 'title') value = value || text(input.title);
    if (field.key === 'gameTitle') value = value || text(input.title);
    if (field.key === 'certificationCompany') value = text(input.certificationCompany) || firstText(details, ['certificationCompany', 'gradingCompany', 'customGradingCompany']);
    if (field.key === 'grade') value = text(input.grade) || firstText(details, ['grade']);
    if (field.key === 'certificateNumber') value = firstText(details, ['certificateNumber', 'certificationNumber', 'certNumber', 'authenticationNumber']);
    if (field.key === 'comicTitle' && !value) value = text(input.title);
    if (field.key === 'cardName' && !value) value = text(input.title);
    if (field.key === 'releaseTitle' && !value) value = text(input.title);
    return { key: field.key, label: field.label, value, material: Boolean(field.material) };
  }).filter((field) => field.value);

  const known = new Map(fields.map((field) => [field.key, field.value]));
  const missingCriticalFields = rule.critical
    .filter((key) => !known.get(key))
    .map((key) => rule.fields.find((field) => field.key === key)?.label ?? key);
  const materialFields = fields.filter((field) => field.material).map((field) => field.key);
  const readiness: P0IdentityReadiness = missingCriticalFields.length === 0
    ? 'ready'
    : missingCriticalFields.length >= rule.critical.length
      ? 'missing_critical'
      : 'limited';

  return {
    category: displayCategory(category),
    itemType: text(input.itemType).replace(/[_-]+/g, ' ') || 'Unspecified item type',
    fields,
    materialFields,
    missingCriticalFields,
    readiness,
  };
}

export function evidenceRoleForSourceKind(kind: string): EvidenceSourceRole {
  if (kind === 'market_completed') return 'valuation_candidate';
  if (kind === 'market_current') return 'asking_price_context';
  if (kind === 'market_historical') return 'historical_context';
  if (kind === 'certification') return 'certification_context';
  return 'reference_context';
}

export function buildP0EvidenceSufficiency(input: {
  completedSaleCount?: number;
  askingListingCount?: number;
  historicalRecordCount?: number;
  unavailableSourceCount?: number;
}): P0EvidenceSufficiency {
  const completedSaleCount = Number(input.completedSaleCount ?? 0);
  const askingListingCount = Number(input.askingListingCount ?? 0);
  const historicalRecordCount = Number(input.historicalRecordCount ?? 0);
  const unavailableSourceCount = Number(input.unavailableSourceCount ?? 0);
  const status = completedSaleCount >= 3 ? 'sufficient' : completedSaleCount > 0 ? 'limited' : 'unavailable';
  const message = status === 'sufficient'
    ? `${completedSaleCount} completed-sale record${completedSaleCount === 1 ? '' : 's'} are available for identity review before any value is considered.`
    : status === 'limited'
      ? `Only ${completedSaleCount} completed-sale record${completedSaleCount === 1 ? '' : 's'} is available; treat any valuation view as low-confidence.`
      : askingListingCount > 0 || historicalRecordCount > 0
        ? 'No completed-sale evidence is selected. Asking prices and historical records remain context only.'
        : 'No selected market evidence is available. Add a completed-sales source or review additional identifiers.';
  return { status, completedSaleCount, askingListingCount, historicalRecordCount, unavailableSourceCount, message };
}
