export type TestAiMetadataRecord = Record<string, unknown>;

/** Primary display order only; independent aliases remain separate observations. */
export const STRUCTURED_GRADE_ALIASES = ['grade', 'numericGrade', 'finalGrade', 'professionalGrade'] as const;

function fieldKey(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

const PLACEHOLDER = /^(?:unknown|other|n\s*\/?\s*a|not\s+applicable|not\s+(?:available|provided|specified)|null|undefined|none|unspecified|unavailable|missing|not\s+known|unreadable|[-–—?]+)$/i;

/** Evidence text only: No/false/zero/raw are facts, not generic placeholders. */
export function meaningfulMetadataText(value: unknown): string {
  function text(child: unknown, depth: number): string {
    if (depth > 6 || child === null || child === undefined) return '';
    if (Array.isArray(child)) return child.slice(0, 256).map(entry => text(entry, depth + 1)).filter(Boolean).join(', ');
    if (typeof child === 'number') return Number.isFinite(child) ? String(child) : '';
    if (typeof child !== 'string' && typeof child !== 'boolean') return '';
    const result = String(child).trim();
    return result && !PLACEHOLDER.test(result) ? result : '';
  }
  return text(value, 0);
}

/** Explicit Boolean states only; arbitrary words/absence never become false. */
export function metadataBooleanState(value: unknown): 'yes' | 'no' | null {
  const text = meaningfulMetadataText(value).toLowerCase();
  if (/^(?:yes|true|1)$/.test(text)) return 'yes';
  if (/^(?:no|false|0)$/.test(text)) return 'no';
  return null;
}

/** Flat, ordered, case/punctuation-insensitive aliases with Other/custom recovery. */
export function readMetadataValue(record: unknown, aliases: readonly string[]): string {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return '';
  const entries = Object.entries(record as TestAiMetadataRecord);
  const customAliases = aliases.map(alias => fieldKey(alias).startsWith('custom') ? fieldKey(alias) : `custom${fieldKey(alias)}`);
  const customValue = (keys: readonly string[]): string => {
    for (const wanted of keys) {
      for (const [key, value] of entries) {
        if (fieldKey(key) !== wanted) continue;
        const text = meaningfulMetadataText(value);
        if (text) return text;
      }
    }
    return '';
  };
  for (const alias of aliases) {
    const wanted = fieldKey(alias);
    // Exact spelling has precedence when duplicate normalized labels exist.
    const matches = entries.filter(([key]) => fieldKey(key) === wanted)
      .sort(([left], [right]) => Number(right === alias) - Number(left === alias));
    for (const [, value] of matches) {
      const text = meaningfulMetadataText(value);
      if (text) return text;
      const raw = Array.isArray(value) ? value.filter(entry => typeof entry === 'string').join(', ').trim() : String(value ?? '').trim();
      if (/^other$/i.test(raw)) {
        const custom = customValue([`custom${wanted}`, ...customAliases]);
        if (custom) return custom;
      }
    }
  }
  return customValue(customAliases);
}

const WRAPPERS = [
  'normalizedStructuredMetadata', 'structuredMetadata', 'soldCompsMetadata',
  'fullItemDetails', 'itemDetails', 'item_details', 'details',
  'itemSpecifics', 'item_specifics', 'specifics', 'aspects', 'metadata', 'rawMetadata',
] as const;
const WRAPPER_PRIORITY = new Map<string, number>(WRAPPERS.map((name, index) => [fieldKey(name), index + 1]));
const KNOWN_FIELDS = `category itemType productType form saleForm isGraded graded gradingStatus condition mediaCondition functionalCondition cosmeticCondition grade numericGrade finalGrade professionalGrade certificationCompany gradingCompany grader gradeQualifier qualifier gradeDesignation labelDesignation certificationLabelStatus labelStatus labelColor cgcLabel labelNotation restorationDetail labelNote designation coinDesignation player athlete subject year manufactureYear releaseYear issueYear globalReleaseYear country issuingCountry denomination faceValue mintMark mint variety varietyName metal strike series setName set cardSet sport team league cardName pokemonName cardNumber cardNo number issueNumber issueNo issue volume publisher brand manufacturer maker toyLine parallel parallelVariation variant variation finish finishVariant holoType printing rarity language cardType mechanic serialNumber printRun edition editionEra releaseType version gameTitle videoGameTitle consoleName accessoryName accessoryType platform console system modelNumber productCode catalogNumber catalogNo scottNumber catalog region countryOfOrigin upc barcode barCode ean gtin productUpc sealed factorySealed sealedStatus seal packageStatus packaging packagingType packageType completeness complete completeInBox completeBox cib isComplete originalPackaging originalBoxIncluded workingCondition workingFeatures toyName toyNameCharacter characterName character vehicleName playsetName gamePuzzleName modelKitName objectType toyType toyForm franchise line publisherBrand setNumber theme releaseVersion colorway cardVariant movieTitle format mediaFormat collectibleType movieItemType posterFormat posterType posterSize dimensions size propType memorabiliaType screenUsed screenWorn provenance propProvenance signer signedItemType authenticationCompany certificateNumber certificationNumber certNumber authenticationNumber inscription inscriptionText inscriptionPresent personalization pinName pinTradingEvent event releaseEvent editionSize limitedEdition pinNumber backstampInformation backstamp artist performer releaseTitle albumTitle album recordLabel label pressing pressingDetails matrixRunout runout perforation perf watermark watermarkType overprintSurcharge overprint surcharge hinged hingeStatus gumCondition mintOrUsed`.split(/\s+/);
const CANONICAL_FIELDS = new Map(KNOWN_FIELDS.map(name => [fieldKey(name), name]));

// Transport and title channels are never relabeled as structured identity.
const NON_IDENTITY = /^(?:title|name|itemtitle|listingtitle|productname|normalizedlistingtitle(?:source|candidates)?|titleevidence|titlesource|titlecandidates|description|image(?:s|url|urls|urlsource)?|thumbnail(?:url)?|photos|galleryimages|id|saleid|listingid|itemid|sourceid|source|providerreference|url|itemurl|itemweburl|permalink|link|price|currency|date|soldprice|soldat|listingprice|retrievedat|expiresat|metadatamatch.*|metadatafieldcomparisons|ranking.*|displayranking.*|visual.*|evidencedisposition|valuation.*|guide.*|debug.*|status|score|rank|awards|trusted.*|signedpayload|signingauthority|signature|approval.*)$/i;

function canonicalField(name: string): string {
  const normalized = fieldKey(name);
  if (normalized.startsWith('custom')) {
    const base = CANONICAL_FIELDS.get(normalized.slice(6));
    return base ? `custom${base.charAt(0).toUpperCase()}${base.slice(1)}` : name;
  }
  return CANONICAL_FIELDS.get(normalized) ?? name;
}

/**
 * Bounded provider-structure projection, not a fact inference engine. Only
 * known wrappers are traversed; raw input, titles and arbitrary objects stay
 * untouched. Named aspect arrays follow the existing sold-comps conventions.
 */
export function extractCandidateStructuredMetadata(listing: unknown): TestAiMetadataRecord {
  const observations = new Map<string, { key: string; value: unknown; priority: number; meaningful: boolean }>();
  const seen = new WeakSet<object>();
  let remaining = 2048;
  function add(name: string, value: unknown, priority: number): void {
    const normalized = fieldKey(name);
    if (!normalized || NON_IDENTITY.test(normalized) || WRAPPER_PRIORITY.has(normalized)) return;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) return;
    const meaningful = Boolean(meaningfulMetadataText(value));
    const prior = observations.get(normalized);
    if (prior && (prior.meaningful && !meaningful || prior.meaningful === meaningful && prior.priority <= priority)) return;
    // Copy arrays so the projection cannot mutate an original provider array.
    const projected = Array.isArray(value)
      ? value.slice(0, 256).filter(entry => entry === null || ['string', 'number', 'boolean'].includes(typeof entry))
      : value;
    observations.set(normalized, { key: canonicalField(name), value: projected, priority, meaningful });
  }
  function visit(value: unknown, depth: number, priority: number): void {
    if (depth > 6 || remaining-- <= 0) return;
    if (typeof value === 'string') {
      if (!/^\s*[\[{]/.test(value) || value.length > 200000) return;
      try { visit(JSON.parse(value), depth + 1, priority); } catch { /* malformed wrapper remains absent */ }
      return;
    }
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const entry of value.slice(0, 256)) visit(entry, depth + 1, priority);
      return;
    }
    const record = value as TestAiMetadataRecord;
    const namedField = readMetadataValue(record, ['name', 'key', 'label', 'propertyName']);
    const namedValueKey = Object.keys(record).find(key => ['value', 'values', 'propertyvalue'].includes(fieldKey(key)));
    if (namedField && namedValueKey !== undefined) {
      add(namedField, record[namedValueKey], priority);
      return;
    }
    for (const [name, child] of Object.entries(record).slice(0, 512)) {
      const normalized = fieldKey(name);
      const knownDirect = CANONICAL_FIELDS.has(normalized)
        || normalized.startsWith('custom') && CANONICAL_FIELDS.has(normalized.slice(6));
      if (!WRAPPER_PRIORITY.has(normalized) && (depth > 0 || knownDirect)) {
        const resolved = /^other$/i.test(String(child ?? '').trim()) ? readMetadataValue(record, [name]) : '';
        add(name, resolved || child, priority);
      }
    }
    const wrappers = Object.entries(record)
      .filter(([name]) => WRAPPER_PRIORITY.has(fieldKey(name)))
      .sort(([left], [right]) => WRAPPER_PRIORITY.get(fieldKey(left))! - WRAPPER_PRIORITY.get(fieldKey(right))!);
    for (const [name, child] of wrappers) visit(child, depth + 1, priority + WRAPPER_PRIORITY.get(fieldKey(name))!);
  }
  visit(listing, 0, 0);
  const raw: TestAiMetadataRecord = {};
  for (const observation of [...observations.values()].sort((left, right) => left.priority - right.priority)) {
    const existing = raw[observation.key];
    if (existing === undefined || !meaningfulMetadataText(existing)) raw[observation.key] = observation.value;
  }
  const result: TestAiMetadataRecord = {};
  for (const [name, observed] of Object.entries(raw)) {
    const value = readMetadataValue(raw, [name]);
    if (value) result[name] = meaningfulMetadataText(observed) ? observed : value;
  }
  // Keep the existing primary grade convenience value without erasing its
  // source alias or replacing an independently supplied meaningful grade.
  if (!meaningfulMetadataText(result.grade)) {
    for (const alias of STRUCTURED_GRADE_ALIASES) {
      const value = readMetadataValue(result, [alias]);
      if (!value) continue;
      result.grade = meaningfulMetadataText(result[alias]) ? result[alias] : value;
      break;
    }
  }
  return result;
}
