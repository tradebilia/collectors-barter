import { buildTestAiP0Identity } from './testAiP0Evidence';
import { parseTestAiDetails, resolveTestAiDetailValue } from './testAiCriteria';
import { canonicalVideoGameGrader } from './videoGameGraderEquivalence';

export const IDENTITY_APPROVAL_TARGET_VERSION = 'identity-target-v1' as const;
export type IdentityApprovalTargetInput = {
  title?: string | null;
  category?: string | null;
  itemType?: string | null;
  grade?: string | null;
  condition?: string | null;
  certificationCompany?: string | null;
  itemDetails?: string | Record<string, unknown> | null;
};
export type CanonicalIdentityApprovalTarget = {
  version: typeof IDENTITY_APPROVAL_TARGET_VERSION;
  fields: Readonly<Record<string, string>>;
  serialized: string;
  conflicts: string[];
};

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value).trim() : '';
}
function known(value: unknown): string {
  const valueText = text(value);
  return /^(?:unknown|other|n\/?a|null|undefined|unspecified|not known)$/i.test(valueText) ? '' : valueText;
}
function semantic(value: unknown): string {
  return known(value).normalize('NFKC').toLowerCase().replace(/[_\s-]+/g, ' ').trim();
}
/** Exact decimal string normalization: no Number coercion or rounding. Qualifiers remain material. */
export function canonicalIdentityApprovalGrade(value: unknown): string {
  const raw = known(value).toUpperCase().replace(/\s+/g, '');
  if (!/^\d+(?:\.\d+)?$/.test(raw)) return raw;
  const [integer, fraction = ''] = raw.split('.');
  const whole = integer.replace(/^0+(?=\d)/, '');
  const tail = fraction.replace(/0+$/, '');
  return `${whole}${tail ? `.${tail}` : ''}`;
}
function booleanState(value: unknown): string {
  const raw = semantic(value);
  if (/^(yes|true|1)$/.test(raw)) return 'yes';
  if (/^(no|false|0)$/.test(raw)) return 'no';
  return raw;
}

const COMMON: Record<string, string[]> = {
  grade: ['grade', 'numericGrade'], certificationCompany: ['certificationCompany', 'gradingCompany', 'grader'],
  gradeQualifier: ['gradeQualifier', 'qualifier', 'labelDesignation', 'gradeDesignation'], designation: ['designation'],
  certificationLabelStatus: ['certificationLabelStatus', 'labelStatus'],
  language: ['language'], edition: ['edition', 'releaseType'], variant: ['variant', 'variation'],
  sealed: ['sealed', 'factorySealed', 'sealedStatus', 'sealStatus'], completeInBox: ['completeInBox', 'cib'],
  packaging: ['packaging', 'packagingType', 'packageType', 'packageStatus'], completeness: ['completeness'],
  productForm: ['productForm'], isGraded: ['isGraded', 'graded', 'gradingStatus'],
  saleForm: ['saleForm', 'form'], gradedState: ['gradedState', 'gradingState', 'rawOrGraded'],
  lotQuantity: ['lotQuantity', 'quantity'],
};
const CATEGORY: Record<string, Record<string, string[]>> = {
  sports_cards: { player: ['player', 'athlete', 'subject'], year: ['year', 'manufactureYear'], manufacturer: ['manufacturer', 'brand'], setName: ['setName', 'set', 'cardSet'], cardNumber: ['cardNumber', 'cardNo', 'number'], parallelVariation: ['parallelVariation', 'parallel'], sport: ['sport'], productFormat: ['productFormat'], productName: ['productName'] },
  pokemon: { cardName: ['cardName', 'pokemonName', 'name'], setName: ['setName', 'set', 'cardSet'], cardNumber: ['cardNumber', 'cardNo', 'number'], editionEra: ['editionEra', 'era'], finish: ['finish', 'finishVariant'], cardType: ['cardType', 'mechanic'], printing: ['printing'], year: ['year'] },
  coins: { country: ['country', 'issuingCountry'], denomination: ['denomination', 'faceValue'], year: ['year', 'issueYear', 'mintYear'], mintMark: ['mintMark', 'mint'], variety: ['variety', 'varietyName'], series: ['series', 'coinSeries'], strikeType: ['strikeType'], proof: ['proof'], gradeClass: ['gradeClass'], specialDesignation: ['specialDesignation'] },
  comics: { comicTitle: ['comicTitle', 'series', 'title'], issueNumber: ['issueNumber', 'issueNo', 'issue', 'number'], publisher: ['publisher'], volume: ['volume'], variantDescription: ['variantDescription'], printing: ['printing'], distributionType: ['distributionType', 'distribution'], labelNotation: ['labelNotation', 'labelNote', 'restorationDetail'] },
  video_games: { gameTitle: ['gameTitle', 'videoGameTitle', 'consoleName', 'accessoryName', 'title'], platform: ['platform', 'console', 'system'], modelNumber: ['modelNumber', 'productCode', 'catalogNumber'], region: ['region'], edition: ['edition', 'releaseType', 'version'], releaseYear: ['releaseYear', 'year'], upc: ['upc', 'ean', 'gtin'], cartridgeIncluded: ['cartridgeIncluded'], discIncluded: ['discIncluded'], manualIncluded: ['manualIncluded'], boxIncluded: ['boxIncluded'] },
  stamps: { country: ['country', 'issuingCountry'], scottNumber: ['scottNumber', 'catalogNumber'], year: ['year', 'issueYear'], denomination: ['denomination', 'faceValue'], mintOrUsed: ['mintOrUsed'], hinged: ['hinged', 'hingeStatus'], gumCondition: ['gumCondition'], perforation: ['perforation'], watermark: ['watermark'], overprintSurcharge: ['overprintSurcharge'] },
  vintage_toys: { toyName: ['toyName', 'toyNameCharacter', 'characterName', 'vehicleName', 'playsetName', 'gamePuzzleName', 'name'], brand: ['brand', 'manufacturer', 'publisherBrand'], franchise: ['franchise', 'line', 'toyLine'], year: ['year', 'manufactureYear'], setNumber: ['setNumber', 'modelNumber', 'catalogNumber'], complete: ['complete'], toyForm: ['toyForm', 'objectType', 'productType', 'toyType'], version: ['version', 'releaseVersion'], colorway: ['colorway'] },
  movies: { title: ['title', 'movieTitle'], format: ['format', 'mediaFormat'], releaseYear: ['releaseYear', 'year'], region: ['region'], collectibleType: ['collectibleType', 'objectType', 'movieItemType'], posterFormat: ['posterFormat', 'posterType'], posterSize: ['posterSize', 'dimensions', 'size'], propType: ['propType', 'memorabiliaType'], screenUsed: ['screenUsed'], screenWorn: ['screenWorn'] },
  disney_pins: { pinName: ['pinName', 'name'], character: ['character'], series: ['series'], year: ['year'], pinTradingEvent: ['pinTradingEvent', 'event'], limitedEdition: ['limitedEdition'], openEdition: ['openEdition'], editionSize: ['editionSize'], pinNumber: ['pinNumber'], backstampInformation: ['backstampInformation', 'backstamp'], artistProof: ['artistProof'], preProduction: ['preProduction'], backerCardIncluded: ['backerCardIncluded'], numberOfPins: ['numberOfPins'], completeSet: ['completeSet'] },
  music: { artist: ['artist', 'performer'], releaseTitle: ['releaseTitle', 'albumTitle', 'album', 'title'], catalogNumber: ['catalogNumber'], recordLabel: ['recordLabel', 'label'], country: ['country'], releaseYear: ['releaseYear', 'year'], format: ['format', 'mediaFormat'], pressing: ['pressing', 'pressingDetails'], matrixRunout: ['matrixRunout', 'runout'] },
};
const BOOLEAN_FIELDS = new Set(['isGraded', 'sealed', 'completeInBox', 'complete', 'boxIncluded', 'manualIncluded', 'discIncluded', 'cartridgeIncluded', 'proof', 'screenUsed', 'screenWorn', 'limitedEdition', 'openEdition', 'artistProof', 'preProduction', 'backerCardIncluded', 'completeSet']);
const DISNEY_IRRELEVANT_GRADING_FIELDS = new Set(['grade', 'certificationCompany', 'gradeQualifier', 'designation', 'certificationLabelStatus', 'isGraded', 'gradedState']);
function hardForm(value: unknown): string {
  const normalized = semantic(value);
  if (/^(?:factory sealed|sealed|unopened)$/.test(normalized)) return 'sealed';
  if (/^(?:cib|complete in box)$/.test(normalized)) return 'cib';
  if (/^(?:loose|boxed|box only|manual only|accessory only|components only|opened|unsealed)$/.test(normalized)) return normalized;
  return '';
}

/** Bind declared collectible identity, not price, specimen tracking IDs, or JSON key order. */
export function canonicalizeIdentityApprovalTarget(input: IdentityApprovalTargetInput): CanonicalIdentityApprovalTarget {
  const conflicts: string[] = [];
  const details = parseTestAiDetails(input.itemDetails);
  if (typeof input.itemDetails === 'string' && input.itemDetails.trim()) {
    try { const parsed = JSON.parse(input.itemDetails); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) conflicts.push('malformed itemDetails'); }
    catch { conflicts.push('malformed itemDetails'); }
  }
  const fields: Record<string, string> = {};
  const category = semantic(input.category).replace(/ /g, '_');
  if (category) fields.category = category;
  else conflicts.push('missing category');
  const aliases = { ...COMMON, ...(CATEGORY[category] ?? {}) };
  const convert = (key: string, value: unknown): string => key === 'grade' ? canonicalIdentityApprovalGrade(value)
    : key === 'certificationCompany' ? canonicalVideoGameGrader(category, known(value))
      : BOOLEAN_FIELDS.has(key) ? booleanState(value) : semantic(value);
  const collect = (key: string, values: unknown[]) => {
    const normalized = [...new Set(values.map((value) => {
      // Only pure descriptive sealed-label suffixes are soft. Numeric grades
      // and qualifiers containing anything else remain material declarations.
      if (category === 'video_games' && key === 'gradeQualifier' && /^(?:sealed\s+)?A\+{1,3}$/i.test(known(value))) return '';
      return convert(key, value);
    }).filter(Boolean))];
    if (normalized.length > 1) conflicts.push(`conflicting ${key}`);
    if (normalized[0]) fields[key] = normalized[0];
  };
  if ([input.itemType, details.itemType].some((value) => value !== undefined && value !== null
    && !['string', 'number', 'boolean'].includes(typeof value))) conflicts.push('malformed itemType');
  collect('itemType', [input.itemType, resolveTestAiDetailValue(details, 'itemType')]);
  for (const [key, readers] of Object.entries(aliases)) {
    // The established pin workflow ignores stale grading declarations before
    // collecting conflicts, not merely after requiring fabricated slab facts.
    if (category === 'disney_pins' && DISNEY_IRRELEVANT_GRADING_FIELDS.has(key)) continue;
    if (readers.some((reader) => details[reader] !== undefined && details[reader] !== null
      && !['string', 'number', 'boolean'].includes(typeof details[reader]))) conflicts.push(`malformed ${key}`);
    const values: unknown[] = readers.map((reader) => typeof details[reader] === 'boolean' ? details[reader] : resolveTestAiDetailValue(details, reader));
    if (key === 'grade') values.push(input.grade);
    if (key === 'certificationCompany') values.push(input.certificationCompany, resolveTestAiDetailValue(details, 'customGradingCompany'));
    collect(key, values);
  }
  // Reuse established category field readers for title fallback only. Alias values
  // above deliberately inspect every declaration instead of silently taking first.
  const identity = buildTestAiP0Identity({ ...input, title: input.title ?? '', category: input.category ?? '', itemDetails: details });
  for (const field of identity.fields) {
    if (/certificate|certNumber|authentication/i.test(field.key)) continue;
    if (category === 'disney_pins' && DISNEY_IRRELEVANT_GRADING_FIELDS.has(field.key)) continue;
    if (!fields[field.key] && field.key in aliases) {
      const value = convert(field.key, field.value);
      if (value) fields[field.key] = value;
    }
  }
  if (!CATEGORY[category] && known(input.title)) fields.title = semantic(input.title);
  const hasBaseIdentity = ['player', 'cardName', 'gameTitle', 'comicTitle', 'denomination', 'scottNumber', 'toyName', 'pinName', 'releaseTitle', 'title']
    .some((key) => fields[key]);
  if (!hasBaseIdentity && known(input.title)) fields.title = semantic(input.title);
  if (fields.isGraded === 'yes') fields.isGraded = 'graded';
  if (fields.isGraded === 'no') fields.isGraded = 'raw';
  const states = (category === 'disney_pins' ? [] : [fields.gradedState, semantic(input.condition), semantic(details.condition), semantic(input.grade), semantic(input.certificationCompany), semantic(fields.grade), semantic(fields.certificationCompany)])
    .filter((value) => /^(?:raw|ungraded|graded|slabbed|encapsulated|none|no certification)$/.test(value))
    .map((value) => /^(?:raw|ungraded|none|no certification)$/.test(value) ? 'raw' : 'graded');
  if (fields.isGraded === 'graded' || fields.isGraded === 'raw') states.push(fields.isGraded);
  if ((fields.grade && !/^(RAW|UNGRADED|NONE)$/.test(fields.grade)) || (fields.certificationCompany && !/^(NONE|RAW|UNGRADED)$/.test(fields.certificationCompany))) states.push('graded');
  if (new Set(states).size > 1) conflicts.push('conflicting raw/graded state');
  if (states.length) fields.gradedState = states[0];
  delete fields.isGraded;
  if (fields.gradedState === 'raw') { delete fields.grade; delete fields.certificationCompany; }
  const forms = [...new Set([input.condition, details.condition, details.mediaCondition].map(hardForm).filter(Boolean))];
  if (forms.length > 1) conflicts.push('conflicting hard condition');
  if (forms[0]) fields.hardCondition = forms[0];
  const declaredForms = [fields.productForm, fields.packaging, fields.saleForm, fields.hardCondition].map(hardForm).filter(Boolean);
  if (new Set(declaredForms).size > 1) conflicts.push('conflicting hard form');
  if (fields.sealed === 'yes' && declaredForms.some((form) => form !== 'sealed')) conflicts.push('sealed contradicts hard form');
  if (fields.sealed === 'no' && declaredForms.includes('sealed')) conflicts.push('unsealed contradicts hard form');
  if (fields.sealed === 'yes' && fields.hardCondition && fields.hardCondition !== 'sealed') conflicts.push('sealed contradicts hard condition');
  if (fields.sealed === 'no' && fields.hardCondition === 'sealed') conflicts.push('unsealed contradicts hard condition');
  if (fields.sealed === 'yes') {
    if (fields.completeInBox === 'no') conflicts.push('sealed contradicts incomplete target');
    else fields.completeInBox = 'yes';
  }
  const sorted = Object.freeze(Object.fromEntries(Object.keys(fields).sort().map((key) => [key, fields[key]])));
  return { version: IDENTITY_APPROVAL_TARGET_VERSION, fields: sorted, serialized: JSON.stringify({ version: IDENTITY_APPROVAL_TARGET_VERSION, fields: sorted }), conflicts: [...new Set(conflicts)].sort() };
}
export type CanonicalIdentityApprovalCandidateFields = { fields: Readonly<Record<string, string>>; conflicts: string[] };
/** Only actual, already parsed provider declarations; never pass a listing or target title. */
export function canonicalizeIdentityApprovalCandidateFields(categoryValue: string, metadata: Record<string, string>): CanonicalIdentityApprovalCandidateFields {
  const category = semantic(categoryValue).replace(/ /g, '_');
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata) || Object.keys(metadata).length > 100) {
    return { fields: Object.freeze({}), conflicts: ['malformed candidate identity fields'] };
  }
  const aliases = { ...COMMON, ...(CATEGORY[category] ?? {}) };
  const allowed = new Set(['itemType', 'condition', 'mediaCondition', 'hardCondition', 'customGradingCompany',
    ...Object.keys(aliases), ...Object.values(aliases).flat().filter((key) => key !== 'title')]);
  const allKnown = new Set(['itemType', 'condition', 'mediaCondition', 'hardCondition', 'customGradingCompany',
    ...Object.keys(COMMON), ...Object.values(COMMON).flat(),
    ...Object.values(CATEGORY).flatMap((categoryAliases) => [...Object.keys(categoryAliases), ...Object.values(categoryAliases).flat()])]);
  // Listing title is not structured identity, even for categories with a title alias.
  allowed.delete('title');
  const conflicts: string[] = [];
  const details: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    // The provider parser is shared across categories. Recognized but unrelated
    // keys are not declarations about this collectible (nor signed output keys).
    if (key !== 'title' && !allowed.has(key) && allKnown.has(key)) continue;
    if (!allowed.has(key)) conflicts.push(`unsupported candidate identity field ${key}`);
    else if (typeof value !== 'string' || value.length > 300) conflicts.push(`malformed candidate identity field ${key}`);
    else details[key] = value;
  }
  const canonical = canonicalizeIdentityApprovalTarget({ category, condition: details.hardCondition, itemDetails: details });
  const fields: Record<string, string> = { ...canonical.fields };
  delete fields.category;
  if (category === 'movies' && fields.title) { fields.movieTitle = fields.title; delete fields.title; }
  if (JSON.stringify(fields).length > 3_000) conflicts.push('candidate identity fields exceed bound');
  return { fields: Object.freeze(fields), conflicts: [...new Set([...conflicts, ...canonical.conflicts])].sort() };
}
/** Partial known provider facts are neutral when absent; known contradictions cannot be approved away. */
export function identityApprovalCandidateFieldsCompatible(target: Readonly<Record<string, string>>, candidate: Readonly<Record<string, string>>): boolean {
  if (Object.entries(candidate).some(([key, value]) => {
    const targetValue = target.category === 'movies' && key === 'movieTitle' ? target.title : target[key];
    return value && targetValue && targetValue !== value && !(hardForm(targetValue) && hardForm(targetValue) === hardForm(value))
      && !(target.category === 'sports_cards' && key === 'year');
  })) return false;
  const targetForms = [target.hardCondition, target.productForm, target.packaging, target.saleForm].map(hardForm).filter(Boolean);
  const candidateForms = [candidate.hardCondition, candidate.productForm, candidate.packaging, candidate.saleForm].map(hardForm).filter(Boolean);
  if (targetForms.length && candidateForms.some((form) => !targetForms.includes(form))) return false;
  if (target.sealed === 'yes' && (candidate.sealed === 'no' || candidateForms.some((form) => form !== 'sealed') || candidate.completeInBox === 'no')) return false;
  if (candidate.sealed === 'yes' && (target.sealed === 'no' || targetForms.some((form) => form !== 'sealed') || target.completeInBox === 'no')) return false;
  return true;
}
export function identityApprovalTargetsEquivalent(left: IdentityApprovalTargetInput, right: IdentityApprovalTargetInput): boolean {
  const a = canonicalizeIdentityApprovalTarget(left), b = canonicalizeIdentityApprovalTarget(right);
  return a.conflicts.length === 0 && b.conflicts.length === 0 && a.serialized === b.serialized;
}
