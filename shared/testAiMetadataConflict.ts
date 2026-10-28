export type MetadataConflict = {
  field: string;
  targetValue: string;
  candidateValue: string;
  reason: string;
};

type MetadataRecord = Record<string, unknown>;

const FIELD_ALIASES: Record<string, string[]> = {
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
  sealedStatus: ['sealedStatus', 'condition', 'packageStatus'],
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
  pokemon: ['cardName', 'setName', 'series', 'cardNumber', 'rarity', 'language', 'holoType', 'variant', 'year', 'gradeQualifier', 'gradingCompany', 'grade', 'sealedStatus'],
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
  for (const alias of FIELD_ALIASES[field] ?? [field]) {
    const value = record[alias];
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
  }
  return '';
}

function normalizeCategory(value: string): string {
  return key(value).replace(/ /g, '_');
}

function canonicalFields(metadata: string): MetadataRecord {
  const details = targetDetails(metadata);
  const fields: MetadataRecord = { ...details };
  for (const field of new Set(Object.values(FIELD_ALIASES).flat())) {
    const direct = metadataValue(metadata, field);
    if (direct) fields[field] = direct;
  }
  fields.title = metadataValue(metadata, 'title');
  fields.category = metadataValue(metadata, 'category');
  fields.itemType = metadataValue(metadata, 'itemType');
  fields.grade = metadataValue(metadata, 'grade') || fields.grade;
  fields.certificationCompany = metadataValue(metadata, 'certificationCompany') || fields.certificationCompany;
  return fields;
}

function candidateFields(candidate: MetadataRecord): MetadataRecord {
  const details = parseDetails(candidate.itemDetails ?? candidate.fullItemDetails ?? candidate.details);
  return { ...details, ...candidate };
}

function valueMatchesEvidence(value: string, evidence: string): boolean {
  const wanted = compact(value);
  const haystack = compact(evidence);
  return wanted.length >= 2 && haystack.includes(wanted);
}

function explicitNumberEvidence(field: string, value: string, title: string): boolean {
  const normalized = String(value).match(/\d+[A-Za-z]?/)?.[0];
  if (!normalized) return false;
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (field === 'issueNumber') return new RegExp(`(?:issue|no\\.?|number|#)\\s*#?${escaped}\\b`, 'i').test(title);
  if (field === 'cardNumber' || field === 'catalogNumber') return new RegExp(`(?:card|card\\s*no\\.?|catalog|cat\\.?|#)\\s*#?${escaped}\\b`, 'i').test(title);
  return false;
}

function explicitGradeConflict(target: string, candidateTitle: string): string | null {
  const targetGrade = String(target).match(/[0-9]+(?:\.[0-9]+)?/)?.[0];
  if (!targetGrade) return null;
  const candidateGrade = candidateTitle.match(/\b(?:PSA|AFA|CGC|CBCS|BGS|SGC|PCGS|NGC|WATA|VGA)\s*(?:graded\s*)?([0-9]+(?:\.[0-9]+)?)/i)?.[1];
  if (candidateGrade && Number(candidateGrade) !== Number(targetGrade)) return candidateGrade;
  return null;
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
export function findMaterialMetadataConflicts(targetMetadata: string, candidate: MetadataRecord): MetadataConflict[] {
  const target = canonicalFields(targetMetadata);
  const candidateRecord = candidateFields(candidate);
  const category = normalizeCategory(String(target.category ?? ''));
  const fields = [...new Set([
    ...(CATEGORY_FIELDS[category] ?? []),
    ...Object.keys(target),
  ])].filter(field => ![
    'title',
    'category',
    'itemType',
    'isGraded',
    'fullItemDetails',
    'itemDetails',
    'details',
  ].includes(field)
    && !(category === 'music' && ['condition', 'mediaCondition'].includes(field))
    && !isIndividualCertificateOrHolderIdentifier(field));
  const candidateTitle = String(candidate.title ?? '');
  const conflicts: MetadataConflict[] = [];

  for (const field of fields) {
    const targetValue = firstValue(target, field);
    if (!targetValue || /^(unknown|n ?a|none|raw|ungraded)$/i.test(targetValue)) continue;
    const directCandidateValue = firstValue(candidateRecord, field);
    if (field === 'serialNumber') {
      const targetPrintRun = printRunDenominator(targetValue);
      const candidatePrintRun = printRunDenominator(directCandidateValue);
      if (targetPrintRun && candidatePrintRun && targetPrintRun !== candidatePrintRun) {
        conflicts.push({ field, targetValue, candidateValue: directCandidateValue, reason: 'candidate metadata declares a different serial-number print-run denominator' });
      }
      continue;
    }
    if (directCandidateValue && compact(directCandidateValue) !== compact(targetValue)) {
      conflicts.push({ field, targetValue, candidateValue: directCandidateValue, reason: `${field} differs in explicit provider metadata` });
      continue;
    }
    if (field === 'year' || field === 'releaseYear' || field === 'issueYear') {
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
    if (field === 'grade') {
      const differentGrade = explicitGradeConflict(targetValue, candidateTitle);
      if (differentGrade) conflicts.push({ field, targetValue, candidateValue: differentGrade, reason: 'candidate title declares a different grade' });
      continue;
    }
    if (field === 'platform' || field === 'language' || field === 'country' || field === 'sport' || field === 'publisher' || field === 'manufacturer' || field === 'brand') {
      if (!valueMatchesEvidence(targetValue, candidateTitle) && directCandidateValue) conflicts.push({ field, targetValue, candidateValue: directCandidateValue, reason: `${field} differs in explicit provider metadata` });
    }
  }
  return conflicts;
}

export function metadataConflictReviewReason(conflicts: MetadataConflict[]): string {
  return conflicts.map(conflict => `Metadata conflict: ${conflict.reason} (target ${conflict.field}=${conflict.targetValue}; candidate=${conflict.candidateValue}). Candidate retained for manual review.`).join(' ');
}
