import { titleContainsValue } from "./testAiTitleEvidence";
import { extractCandidateStructuredMetadata, meaningfulMetadataText, readMetadataValue, metadataBooleanState, STRUCTURED_GRADE_ALIASES } from './testAiMetadataValues';
import { compareComparableGrades, findStructuredGradeConflict, parseSourceGradeFromTitle } from './testAiGradeComparison';
import { comparePokemonCardNumbers, parsePokemonCardNumber, readPokemonCardNumbersFromTitle } from './testAiPokemonCardNumber';
import { parseToyNumericValue, extractToyNumericTitleEvidence, type ToyNumericField } from './testAiToyNumericEvidence';
import { autographAuthenticatorsEquivalent } from './testAiAutographAuthentication';

export type MetadataConflict = {
  field: string;
  targetValue: string;
  candidateValue: string;
  reason: string;
};

type MetadataRecord = Record<string, unknown>;

const FIELD_ALIASES: Record<string, string[]> = {
  grade: [...STRUCTURED_GRADE_ALIASES],
  manufacturer: ['manufacturer', 'brand', 'maker'],
  brand: ['brand', 'manufacturer', 'maker'],
  series: ['series', 'setName', 'set', 'toyLine'],
  setName: ['setName', 'series', 'set'],
  edition: ['edition', 'editionEra', 'releaseType'],
  variant: ['variant', 'parallel', 'finish', 'holoType', 'printing'],
  parallel: ['parallel', 'parallelVariation', 'variant', 'finish', 'printing'],
  parallelVariation: ['parallelVariation', 'parallel', 'variant', 'finish', 'printing'],
  gradeQualifier: ['gradeQualifier', 'qualifier', 'gradeDesignation', 'labelDesignation'],
  certificationLabelStatus: ['certificationLabelStatus', 'labelStatus', 'labelColor', 'cgcLabel'],
  labelNotation: ['labelNotation', 'restorationDetail', 'labelNote'],
  designation: ['designation', 'coinDesignation'],
  upc: ['upc', 'UPC', 'barcode', 'barCode', 'ean', 'gtin', 'productUpc'],
  perforation: ['perforation', 'perf'],
  watermark: ['watermark', 'watermarkType'],
  overprintSurcharge: ['overprintSurcharge', 'overprint', 'surcharge'],
  pressingDetails: ['pressingDetails', 'matrixRunout', 'runout', 'pressing'],
  serialNumber: ['serialNumber', 'serial', 'printRun'],
  packaging: ['packagingType', 'packageType', 'sealedStatus', 'completeness'],
  sealedStatus: ['sealedStatus', 'packageStatus'],
  gradingCompany: ['gradingCompany', 'certificationCompany', 'grader'],
  cardNumber: ['cardNumber', 'number'],
  issueNumber: ['issueNumber', 'number'],
  catalogNumber: ['catalogNumber', 'catalogNo', 'catalog'],
  platform: ['platform', 'console'],
  releaseYear: ['releaseYear', 'year'],
  issueYear: ['issueYear', 'year'],
};

const CATEGORY_FIELDS: Record<string, string[]> = {
  sports_cards: ['player', 'year', 'manufacturer', 'brand', 'series', 'setName', 'sport', 'team', 'league', 'cardNumber', 'rookieStatus', 'parallel', 'serialNumber', 'variant', 'gradeQualifier', 'gradingCompany', 'grade'],
  pokemon: ['cardName', 'setName', 'series', 'cardNumber', 'rarity', 'language', 'finish', 'finishVariant', 'cardType', 'mechanic', 'holoType', 'variant', 'year', 'gradeQualifier', 'gradingCompany', 'grade', 'sealedStatus'],
  coins: ['country', 'denomination', 'year', 'mintMark', 'variety', 'series', 'metal', 'strike', 'designation', 'gradingCompany', 'grade'],
  comics: ['publisher', 'series', 'issueNumber', 'volume', 'variant', 'edition', 'certificationLabelStatus', 'labelNotation', 'gradingCompany', 'grade', 'distributionType'],
  video_games: ['gameTitle', 'platform', 'edition', 'region', 'releaseType', 'sealedStatus', 'publisher', 'catalogNumber', 'upc', 'gradingCompany', 'grade'],
  stamps: ['country', 'catalogNumber', 'denomination', 'issueYear', 'year', 'perforation', 'watermark', 'overprintSurcharge', 'variety', 'gradingCompany', 'grade'],
  movies: ['title', 'format', 'releaseYear', 'edition', 'releaseType', 'gradingCompany', 'grade'],
  autographs: ['signer', 'signedItemType', 'authenticationCompany', 'certificationNumber', 'year', 'edition'],
  disney_pins: ['character', 'pinName', 'series', 'releaseEvent', 'editionSize', 'limitedEdition', 'year'],
  vintage_toys: ['brand', 'manufacturer', 'toyLine', 'character', 'productType', 'year', 'version', 'packagingType', 'sealedStatus', 'completeness', 'gradingCompany', 'grade'],
  music: ['artist', 'releaseTitle', 'format', 'recordLabel', 'catalogNumber', 'country', 'pressing', 'pressingDetails', 'year'],
};

function key(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/[’']/g, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function compact(value: unknown): string {
  return key(value).replace(/[^a-z0-9]+/g, '');
}

function musicFormatComparable(value: unknown): string {
  const normalized = compact(value);
  if (['cassette', 'cassettetape', 'audiocassette'].includes(normalized)) return 'cassettetape';
  if (['cd', 'compactdisc', 'compactdisk'].includes(normalized)) return 'compactdisc';
  if (['vinyl', 'vinylrecord', 'record', 'lp', 'ep'].includes(normalized)) return 'vinylrecord';
  if (['8track', '8tracktape', 'eighttrack', 'eighttracktape'].includes(normalized)) return '8tracktape';
  return normalized;
}

/** Compare exact normalized Autographs authentication-company aliases. */
export function autographAuthenticationCompaniesEquivalent(left: unknown, right: unknown): boolean {
  return autographAuthenticatorsEquivalent(left, right);
}

function fieldComparable(field: string, value: string): string {
  if (/^(?:sealed|factorySealed|sealedStatus|sealStatus|complete|isComplete|completeness|completeInBox|originalPackaging|originalBoxIncluded|isGraded|graded)$/i.test(field)) {
    const state = metadataBooleanState(value);
    if (state) return state;
  }
  // Grade qualifiers carry punctuation facts (A+ is not A++ outside games).
  return /^(?:gradeQualifier|qualifier|gradeDesignation|labelDesignation|designation|coinDesignation)$/i.test(field)
    ? key(value).replace(/[^a-z0-9+]+/g, '')
    : compact(value);
}

function movieMaterialCondition(value: string): 'sealed' | 'for_parts' | 'damaged' | 'incomplete' | null {
  const normalized = key(value);
  if (/\b(?:sealed|factory sealed|unopened)\b/.test(normalized)) return 'sealed';
  if (/\b(?:for parts|parts only)\b/.test(normalized)) return 'for_parts';
  if (/\b(?:damaged|broken|unplayable)\b/.test(normalized)) return 'damaged';
  if (/\b(?:incomplete|missing (?:disc|disk|manual|insert|component|part)|disc only|disk only|case only)\b/.test(normalized)) return 'incomplete';
  return null;
}

function parseDetails(value: unknown): MetadataRecord {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as MetadataRecord;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as MetadataRecord : {};
  } catch {
    return {};
  }
}

function metadataValue(metadata: string, field: string): string {
  return metadata.match(new RegExp(`(?:^|;)\\s*${field}=([^;]*)`, 'i'))?.[1]?.trim() ?? '';
}

function targetDetails(metadata: string): MetadataRecord {
  return parseDetails(metadataValue(metadata, 'fullItemDetails') || metadataValue(metadata, 'itemDetails') || metadataValue(metadata, 'details'));
}

function firstValue(record: MetadataRecord, field: string): string {
  return readMetadataValue(record, FIELD_ALIASES[field] ?? [field]);
}

function normalizeCategory(value: string): string {
  return key(value).replace(/ /g, '_');
}

function canonicalFields(metadata: string): MetadataRecord {
  const details = targetDetails(metadata);
  const fields: MetadataRecord = { ...details };
  for (const field of new Set(Object.values(FIELD_ALIASES).flat())) {
    const direct = meaningfulMetadataText(metadataValue(metadata, field));
    if (direct) fields[field] = direct;
  }
  fields.title = metadataValue(metadata, 'title');
  fields.category = metadataValue(metadata, 'category');
  fields.itemType = metadataValue(metadata, 'itemType');
  fields.grade = meaningfulMetadataText(metadataValue(metadata, 'grade')) || fields.grade;
  fields.certificationCompany = meaningfulMetadataText(metadataValue(metadata, 'certificationCompany')) || fields.certificationCompany;
  return { ...extractCandidateStructuredMetadata({ itemDetails: fields }), title: fields.title };
}

function candidateFields(candidate: MetadataRecord): MetadataRecord {
  return extractCandidateStructuredMetadata(candidate);
}

function isPokemonNumberField(field: string): boolean {
  return ['cardnumber', 'cardno', 'number'].includes(field.toLowerCase().replace(/[^a-z0-9]/g, ''));
}

/** Keep independent aliases/array observations; placeholders never become numbers. */
function declaredNumericValues(record: MetadataRecord, isField: (field: string) => boolean,
  parseValue: (value: unknown) => { raw: string } | null): string[] {
  const values: string[] = [];
  const seen = new WeakSet<object>();
  let remaining = 2048;
  const wrappers = new Set(['normalizedstructuredmetadata', 'structuredmetadata', 'soldcompsmetadata',
    'fullitemdetails', 'itemdetails', 'details', 'itemspecifics', 'specifics', 'aspects', 'metadata', 'rawmetadata']);
  const add = (value: unknown) => {
    for (const observation of Array.isArray(value) ? value.slice(0, 256) : [value]) {
      const parsed = parseValue(observation);
      if (parsed) values.push(parsed.raw);
    }
  };
  const visit = (value: unknown, depth: number): void => {
    if (depth > 6 || remaining-- <= 0) return;
    if (typeof value === 'string') {
      if (value.length <= 200000 && /^\s*[\[{]/.test(value)) {
        try { visit(JSON.parse(value), depth + 1); } catch { /* malformed wrapper is unknown */ }
      }
      return;
    }
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      value.slice(0, 256).forEach(child => visit(child, depth + 1));
      return;
    }
    const fields = value as MetadataRecord;
    const aspect = readMetadataValue(fields, ['name', 'key', 'label', 'propertyName']);
    if (isField(aspect)) {
      Object.entries(fields).filter(([field]) => /^(?:value|values|propertyvalue)$/i.test(field)).forEach(([, child]) => add(child));
    }
    for (const [field, child] of Object.entries(fields).slice(0, 512)) {
      if (isField(field)) add(child);
      if (wrappers.has(field.toLowerCase().replace(/[^a-z0-9]/g, ''))) visit(child, depth + 1);
    }
  };
  visit(record, 0);
  return [...new Set(values)];
}

function pokemonNumberValues(record: MetadataRecord): string[] {
  return declaredNumericValues(record, isPokemonNumberField, parsePokemonCardNumber);
}

const TOY_NUMERIC_ALIASES: Readonly<Record<'setNumber' | 'pieceCount', readonly string[]>> = {
  setNumber: ['setNumber', 'setNo', 'number'],
  pieceCount: ['pieceCount', 'pieces', 'numberOfPieces'],
};

function isToyNumericField(field: string): boolean {
  return Object.values(TOY_NUMERIC_ALIASES).flat().some(alias => compact(alias) === compact(field));
}

function toyNumericConflicts(targetMetadata: string, target: MetadataRecord, candidate: MetadataRecord,
  candidateRecord: MetadataRecord, candidateTitle: string): MetadataConflict[] {
  const conflicts: MetadataConflict[] = [];
  for (const [field, aliases] of Object.entries(TOY_NUMERIC_ALIASES)) {
    const numericField = field as ToyNumericField;
    const parse = (value: unknown) => parseToyNumericValue(value, numericField);
    const isField = (value: string) => aliases.some(alias => compact(alias) === compact(value));
    const targetTitle = extractToyNumericTitleEvidence(String(target.title ?? ''), numericField);
    const sourceTitle = extractToyNumericTitleEvidence(candidateTitle, numericField);
    const targetValues = [...new Set([
      ...declaredNumericValues(target, isField, parse),
      ...declaredNumericValues(targetDetails(targetMetadata), isField, parse),
      ...aliases.flatMap(alias => {
        const value = parse(metadataValue(targetMetadata, alias));
        return value ? [value.raw] : [];
      }),
      ...targetTitle.observations.map(value => value.raw),
    ])];
    const candidateValues = [...new Set([
      ...declaredNumericValues(candidateRecord, isField, parse),
      ...declaredNumericValues(candidate, isField, parse),
      ...sourceTitle.observations.map(value => value.raw),
    ])];
    const add = (targetValue: string, candidateValue: string, reason: string) => {
      if (!conflicts.some(conflict => conflict.field === field && conflict.targetValue === targetValue && conflict.candidateValue === candidateValue)) {
        conflicts.push({ field, targetValue, candidateValue, reason });
      }
    };
    const different = (left: string, right: string) => parse(left)?.value !== parse(right)?.value;
    targetValues.forEach(expected => candidateValues.forEach(observed => {
      if (different(expected, observed)) add(expected, observed, `${field} differs in explicit toy numeric evidence`);
    }));
    for (const values of [targetValues, candidateValues]) {
      values.forEach((value, index) => values.slice(index + 1).forEach(other => {
        if (different(value, other)) add(value, other, `${field} title or structured aliases declare contradictory values`);
      }));
    }
    if ((targetTitle.ambiguous || sourceTitle.ambiguous) && !conflicts.some(conflict => conflict.field === field)) {
      add(targetValues[0] ?? '', candidateValues.join(', '), `${field} title evidence is ambiguous; no numeric winner is selected`);
    }
  }
  return conflicts;
}

function pokemonNumberConflicts(targetValues: string[], candidateValues: string[], ambiguous: boolean): MetadataConflict[] {
  const conflicts: MetadataConflict[] = [];
  const add = (targetValue: string, candidateValue: string, reason: string) => {
    if (!conflicts.some(conflict => conflict.targetValue === targetValue && conflict.candidateValue === candidateValue)) {
      conflicts.push({ field: 'cardNumber', targetValue, candidateValue, reason });
    }
  };
  for (const targetValue of targetValues) {
    for (const candidateValue of candidateValues) {
      if (comparePokemonCardNumbers(targetValue, candidateValue) === 'different') {
        add(targetValue, candidateValue, 'Card/catalog number differs: candidate declares a different Pokémon card number, denominator or namespace');
      }
    }
  }
  for (const values of [targetValues, candidateValues]) {
    values.forEach((value, index) => values.slice(index + 1).forEach(other => {
      if (comparePokemonCardNumbers(value, other) === 'different') {
        add(value, other, 'Pokémon card-number title or structured aliases declare contradictory identities');
      }
    }));
  }
  if (ambiguous && !conflicts.length) {
    add(targetValues[0] ?? '', candidateValues.join(', '), 'candidate title has ambiguous opposed Pokémon card-number observations');
  }
  return conflicts;
}

function valueMatchesEvidence(value: string, evidence: string): boolean {
  const wanted = compact(value);
  const haystack = compact(evidence);
  return wanted.length >= 2 && (haystack.includes(wanted) || titleContainsValue(evidence, value));
}

function explicitNumberEvidence(field: string, value: string, title: string): boolean {
  const normalized = String(value).match(/\d+[A-Za-z]?/)?.[0];
  if (!normalized) return false;
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (field === 'issueNumber') return new RegExp(`(?:issue|no\\.?|number|#)\\s*#?${escaped}\\b`, 'i').test(title);
  if (field === 'cardNumber' || field === 'catalogNumber') return new RegExp(`(?:card|card\\s*no\\.?|catalog|cat\\.?|#)\\s*#?${escaped}\\b`, 'i').test(title);
  return false;
}

function explicitGradeConflict(target: string, candidateTitle: string, category: string): string | null {
  const observed = parseSourceGradeFromTitle(candidateTitle, { category });
  return observed && compareComparableGrades(target, observed.comparable, { allowBareNumeric: true, category }) === 'different'
    ? observed.grade : null;
}

function isTitleEchoForIdentityField(field: string, candidateValue: string, candidateTitle: string): boolean {
  const normalizedField = field.toLowerCase().replace(/[_-]+/g, '');
  if (!['brand', 'manufacturer', 'maker'].includes(normalizedField)) return false;
  return Boolean(candidateValue && candidateTitle && compact(candidateValue) === compact(candidateTitle));
}

function isGradingCompanyField(field: string): boolean {
  return ['gradingcompany', 'certificationcompany', 'grader'].includes(field.toLowerCase().replace(/[_-]+/g, ''));
}

function printRunDenominator(value: string): string {
  return String(value).match(/\d+\s*\/\s*(\d{1,7})/)?.[1] ?? '';
}

function isIndividualCertificateOrHolderIdentifier(field: string): boolean {
  const normalized = field.toLowerCase().replace(/[_-]+/g, '');
  return /^(?:certification|certificate|cert|authentication|auth|coa)(?:number|id|identifier|code)?$/.test(normalized)
    || /^(?:holder|slab)(?:id|number|identifier|serial|barcode|qrcode|qr|tracking)?$/.test(normalized)
    || /^(?:grading|slab|holder)(?:barcode|qrcode|qr|tracking|serial)(?:id|number|code)?$/.test(normalized)
    || /^(?:(?:certification|certificate|cert|authentication|auth|coa|holder|slab|grading)?tracking)(?:id|number|identifier|code)?$/.test(normalized);
}

/**
 * Returns only explicit, material conflicts. An absent candidate field is not
 * a conflict; this keeps provider omissions reviewable instead of fail-open or
 * fail-closed by guesswork.
 */
export function findMaterialMetadataConflicts(
  targetMetadata: string,
  candidate: MetadataRecord,
  options: { ignoreSubjectiveConditionDifferences?: boolean } = {},
): MetadataConflict[] {
  const target = canonicalFields(targetMetadata);
  const candidateRecord = candidateFields(candidate);
  const category = normalizeCategory(String(target.category ?? ''));
  const boardGameTarget = category === 'vintage_toys'
    && /^(?:board_game(?:[_/].*)?|puzzle)$/.test(normalizeCategory(String(target.itemType ?? '')));
  const targetCondition = firstValue(target, 'condition');
  const targetIsGraded = /^(?:yes|true|graded)$/i.test(String(target.isGraded ?? '').trim())
    || (Boolean(firstValue(target, 'grade')) && !/^(?:unknown|n ?a|none|raw|ungraded|0(?:\.0+)?)$/i.test(firstValue(target, 'grade')) && Boolean(firstValue(target, 'gradingCompany')));
  const targetHasMaterialCondition = /\b(?:sealed|factory\s+sealed|for\s+parts|parts\s+only|unopened)\b/i.test(targetCondition);
  const targetHasExplicitSealedState = Boolean(firstValue(target, 'sealedStatus')) || targetHasMaterialCondition;
  const fields = [...new Set([
    ...(CATEGORY_FIELDS[category] ?? []),
    ...Object.keys(target).map(field => STRUCTURED_GRADE_ALIASES.some(alias => alias === field) ? 'grade' : field),
  ])].filter(field => ![
    'title',
    'category',
    'itemType',
    'isGraded',
    'fullItemDetails',
    'itemDetails',
    'details',
  ].includes(field)
    && !isGradingCompanyField(field)
    && !(category === 'disney_pins' && ['grade', 'gradingCompany', 'certificationCompany', 'grader'].includes(field))
    && !((options.ignoreSubjectiveConditionDifferences || targetIsGraded) && ['condition', 'mediaCondition'].includes(field))
    && !((options.ignoreSubjectiveConditionDifferences || targetIsGraded) && field === 'sealedStatus' && !targetHasExplicitSealedState)
    && !(category === 'music' && ['condition', 'mediaCondition'].includes(field))
    // Genre labels are broad marketplace classifications (for example Rock
    // versus Grunge), not exact release identity. Keep them informational.
    && !(category === 'music' && field === 'genre')
    // Disney Pins are identity-matched by the pin itself, character, series,
    // year, and edition facts; marketplace condition is informational only.
    && !(category === 'disney_pins' && ['condition', 'mediaCondition'].includes(field))
    // Working-feature status is optional operational context for Vintage Toys,
    // not a hard identity discriminator for visual matching.
    && !(category === 'vintage_toys' && field === 'workingFeatures')
    && !isIndividualCertificateOrHolderIdentifier(field));
  const candidateTitle = String(
    candidate.title
      ?? candidate.itemTitle
      ?? candidate.listingTitle
      ?? candidate.name
      ?? candidate.productName
      ?? candidateRecord.title
      ?? candidateRecord.itemTitle
      ?? candidateRecord.listingTitle
      ?? '',
  );
  const conflicts: MetadataConflict[] = [];
  if (category === 'pokemon') {
    const targetTitleNumbers = readPokemonCardNumbersFromTitle(String(target.title ?? ''));
    const candidateTitleNumbers = readPokemonCardNumbersFromTitle(candidateTitle);
    const targetNumbers = [...new Set([
      ...pokemonNumberValues(target),
      ...pokemonNumberValues(targetDetails(targetMetadata)),
      ...['cardNumber', 'cardNo', 'number'].flatMap(field => {
        const parsed = parsePokemonCardNumber(metadataValue(targetMetadata, field));
        return parsed ? [parsed.raw] : [];
      }),
      ...targetTitleNumbers.observations.map(observation => observation.raw),
    ])];
    const candidateNumbers = [...new Set([
      ...pokemonNumberValues(candidateRecord),
      ...pokemonNumberValues(candidate),
      ...candidateTitleNumbers.observations.map(observation => observation.raw),
    ])];
    conflicts.push(...pokemonNumberConflicts(targetNumbers, candidateNumbers,
      targetTitleNumbers.ambiguous || candidateTitleNumbers.ambiguous));
  }
  if (category === 'vintage_toys') {
    conflicts.push(...toyNumericConflicts(targetMetadata, target, candidate, candidateRecord, candidateTitle));
  }

  for (const field of fields) {
    // Pokémon collector identities are compared above, not punctuation-stripped
    // exact fields or a first-digit title regex. Other categories keep that path.
    if (category === 'pokemon' && isPokemonNumberField(field)) continue;
    if (category === 'vintage_toys' && isToyNumericField(field)) continue;
    const targetValue = firstValue(target, field);
    if (!targetValue || /^(unknown|n ?a|none|raw|ungraded)$/i.test(targetValue)) continue;
    const rawCandidateValue = firstValue(candidateRecord, field);
    // Some marketplace adapters expose a convenience `brand`/`manufacturer`
    // property that is actually a copy of the listing title when no structured
    // aspect was supplied. That is title evidence, not explicit field evidence;
    // treating it as a brand would create false hard conflicts.
    const directCandidateValue = isTitleEchoForIdentityField(field, rawCandidateValue, candidateTitle)
      ? ''
      : rawCandidateValue;
    if (category === 'video_games' && /^(?:gradeQualifier|qualifier|gradeDesignation|labelDesignation)$/i.test(field)
      && /^A\+{0,3}$/i.test(targetValue) && (!directCandidateValue || /^A\+{0,3}$/i.test(directCandidateValue))) continue;
    if (field === 'grade') {
      const structuredGrade = findStructuredGradeConflict(targetValue, candidateRecord, { category });
      const titleGrade = explicitGradeConflict(targetValue, candidateTitle, category);
      const differentGrade = structuredGrade ?? titleGrade;
      if (differentGrade) conflicts.push({ field, targetValue, candidateValue: differentGrade, reason: 'candidate declares a different numeric grade, plus, designation or qualifier' });
      continue;
    }
    if (field === 'serialNumber') {
      const targetPrintRun = printRunDenominator(targetValue);
      const candidatePrintRun = printRunDenominator(directCandidateValue);
      if (targetPrintRun && candidatePrintRun && targetPrintRun !== candidatePrintRun) {
        conflicts.push({ field, targetValue, candidateValue: directCandidateValue, reason: 'candidate metadata declares a different serial-number print-run denominator' });
      }
      continue;
    }
    if (category === 'movies' && /^(?:condition|mediaCondition)$/i.test(field)) {
      // Marketplace labels such as Excellent, Good, Fair, Used, and Pre-Owned
      // are subjective quality descriptions. They must reach visual review,
      // not become hard identity exclusions. Only material product-state
      // declarations remain hard: sealed/opened, for-parts, damaged, or
      // incomplete/missing-component forms.
      const targetMaterial = movieMaterialCondition(targetValue);
      const candidateMaterial = movieMaterialCondition(directCandidateValue);
      if (targetMaterial && candidateMaterial && targetMaterial === candidateMaterial) continue;
      if (targetMaterial || candidateMaterial) {
        conflicts.push({ field, targetValue, candidateValue: directCandidateValue, reason: 'Movie material condition declares a hard product-state conflict' });
      }
      continue;
    }
    if (category === 'autographs' && /^(?:authenticationCompany|customAuthenticationCompany|authCompany|authenticator)$/i.test(field)
      && directCandidateValue && autographAuthenticationCompaniesEquivalent(targetValue, directCandidateValue)) continue;
    if (category === 'music' && field === 'format'
      && musicFormatComparable(targetValue) && musicFormatComparable(targetValue) === musicFormatComparable(directCandidateValue)) continue;
    if (directCandidateValue && fieldComparable(field, directCandidateValue) !== fieldComparable(field, targetValue)) {
      const videoGameSpecializedStateField = category === 'video_games'
        && ['workingCondition', 'originalPackaging', 'originalBoxIncluded'].includes(field);
      // Video Game identity logic understands equivalent provider wording such
      // as Tested Working/Working and Boxed/Yes. Do not let the generic layer
      // reject those values before the category-specific rule evaluates them.
      if (videoGameSpecializedStateField) continue;
      const videoGameAccessoryTitleMatch = category === 'video_games'
        && normalizeCategory(String(target.itemType ?? '')) === 'accessory'
        && ['accessoryName', 'accessoryType'].includes(field)
        && titleContainsValue(candidateTitle, targetValue);
      if (videoGameAccessoryTitleMatch) continue;
      conflicts.push({ field, targetValue, candidateValue: directCandidateValue, reason: `${field} differs in explicit provider metadata` });
      continue;
    }
    if (field === 'year' || field === 'releaseYear' || field === 'issueYear') {
      // Board Game years are optional structured metadata. A year appearing
      // only in a marketplace title can describe an edition or listing and
      // must not become a hard metadata conflict.
      if (boardGameTarget && !directCandidateValue) continue;
      const targetYear = targetValue.match(/\b\d{4}\b/)?.[0];
      const candidateYears = [...candidateTitle.matchAll(/\b(?:18|19|20)\d{2}\b/g)].map(match => match[0]);
      if (targetYear && candidateYears.length && !candidateYears.includes(targetYear)) conflicts.push({ field, targetValue, candidateValue: candidateYears[0], reason: 'candidate title declares a different year' });
      continue;
    }
    if (field === 'issueNumber' || field === 'cardNumber' || field === 'catalogNumber' || field === 'upc') {
      if (explicitNumberEvidence(field, targetValue, candidateTitle)) continue;
      const numberLabel = field === 'upc' ? '(?:upc|ean|barcode)' : '(?:issue|no\.?|number|card\s*(?:no\.?)?|catalog|cat\.?|#)';
      const hasDifferentExplicitNumber = new RegExp(`${numberLabel}\\s*#?\\d+[A-Za-z]?`, 'i').test(candidateTitle) && !valueMatchesEvidence(targetValue, candidateTitle);
      if (hasDifferentExplicitNumber) conflicts.push({ field, targetValue, candidateValue: candidateTitle, reason: field === 'upc' ? 'candidate title declares a different UPC/EAN/barcode' : 'candidate title declares a different issue/card/catalog number' });
      continue;
    }
    if (field === 'platform' || field === 'language' || field === 'country' || field === 'sport' || field === 'publisher' || field === 'manufacturer' || field === 'brand') {
      if (!valueMatchesEvidence(targetValue, candidateTitle)
        && directCandidateValue
        && compact(directCandidateValue) !== compact(targetValue)) {
        conflicts.push({ field, targetValue, candidateValue: directCandidateValue, reason: `${field} differs in explicit provider metadata` });
      }
    }
  }
  return conflicts;
}

export function metadataConflictReviewReason(conflicts: MetadataConflict[]): string {
  return conflicts.map(conflict => `Metadata conflict: ${conflict.reason} (target ${conflict.field}=${conflict.targetValue}; candidate=${conflict.candidateValue}). Candidate retained for manual review.`).join(' ');
}
