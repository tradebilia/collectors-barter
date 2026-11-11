import { meaningfulMetadataText, readMetadataValue, STRUCTURED_GRADE_ALIASES } from './testAiMetadataValues';

export type ComparableGradeOptions = { allowBareNumeric?: boolean; category?: string };
export type ComparableGrade = {
  numeric: string;
  designation: string | null;
  plus: boolean;
  qualifiers: string[];
  /** An explicitly missing/unreadable qualifier cannot establish agreement. */
  qualifierUncertain: boolean;
};
export type GradeComparison = 'match' | 'different' | 'unknown';
export type SourceTitleGrade = { grade: string; grader: string | null; comparable: ComparableGrade };

const GRADERS = 'PSA|AFA|CGC|CBCS|BGS|BVG|BCCG|SGC|PCGS|NGC|WATA|VGA|HGA|CSG|ISA|GMA|PSE|ASG|PMG|ICG|ANACS';
const DESIGNATIONS = 'EX[- ]?MT|NM[- ]?MT|GEM[- ]?MT|MS|PR|PF|SP|AU|AG|PO|FR|VG|VF|XF|EF|EX|NM|MT|FN|FA|G|F';
const QUALIFIERS = 'DCAM|DMPL|DPL|CAM|PL|RD|RB|BN|OC|MC|ST|PD|MK|OF|NQ|EPQ|PPQ|FH|FBL|FB|FS|FT|SMS|STAR|CAC';
const SOFT_SUFFIX = 'A\\+{0,3}';
const UNCERTAIN = 'UNKNOWN|UNREADABLE|UNSPECIFIED|N\\s*\\/\\s*A|\\?';
const GRADE_TOKEN = `(?:(?:${DESIGNATIONS})\\s*)?\\d{1,3}(?:\\.\\d+)?\\+?`;
const SUFFIX_TOKEN = `(?:${QUALIFIERS}|${SOFT_SUFFIX}|${UNCERTAIN})`;
const SUFFIX_SEPARATOR = '(?:\\s*[-/,]\\s*|\\s+|\\s*\\(\\s*|(?=[A-Z?]))';
const GRADE_OBSERVATION = `${GRADE_TOKEN}(?:${SUFFIX_SEPARATOR}${SUFFIX_TOKEN}(?![A-Z+])\\s*\\)?)*`;
/** Shared bounded syntax for title readers; not a bare-number/query parser. */
export const TITLE_GRADE_OBSERVATION_PATTERN = GRADE_OBSERVATION;

export function hasExcludedSourceTitleGradeClaim(title: string): boolean {
  return /\b(?:raw|ungraded|not\s+(?:professionally\s+)?graded|not\s+certified|no\s+grade|grade\s+(?:unknown|unreadable)|(?:PSA|CGC|BGS|PCGS|NGC|WATA|VGA)\s+(?:style|like|candidate|ready))\b/i.test(title)
    || new RegExp(`\\b(?:not|no|non|without)\\s+(?:an?\\s+)?(?:${GRADERS})(?=\\b|\\d)`, 'i').test(title);
}

function isVideoGames(category = ''): boolean {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, '') === 'videogames';
}

/** Canonical decimal strings avoid rounding or IEEE-754 equality collapse. */
function canonicalDecimal(value: string): string | null {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return null;
  const [integer, fraction = ''] = value.split('.');
  const whole = integer.replace(/^0+(?=\d)/, '');
  const decimal = fraction.replace(/0+$/, '');
  if (!/[1-9]/.test(whole + decimal)) return null;
  return decimal ? `${whole}.${decimal}` : whole;
}

function stripPresentationNote(value: string): string {
  // Only our existing presentation suffixes, not meaningful grade parentheses.
  return value.replace(/\s*\((?:inferred from title|detected in title|from title)\)\s*$/i, '').trim();
}

function parseObservedGrade(value: string, options: ComparableGradeOptions): ComparableGrade | null {
  let observed = stripPresentationNote(value).toUpperCase().trim();
  observed = observed.replace(/^\(\s*([^()]*)\s*\)$/, '$1').trim();
  const match = observed.match(new RegExp(`^(?:(${DESIGNATIONS})\\s*)?(\\d+(?:\\.\\d+)?)(\\+?)(.*)$`, 'i'));
  if (!match) return null;
  const numeric = canonicalDecimal(match[2]);
  if (!numeric) return null;
  const designation = match[1]?.toUpperCase().replace(/[\s-]+/g, '') ?? null;
  const tail = match[4].trim();
  if (/^\+/.test(tail)) return null; // Numeric '++' is not a known grade fact.
  const qualifiers: string[] = [];
  let qualifierUncertain = false;
  const tokens = tail.replace(/N\s*\/\s*A/g, 'NA').replace(/[(),/;-]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    if (new RegExp(`^(?:${QUALIFIERS})$`, 'i').test(token)) qualifiers.push(token);
    else if (/^A\+{0,3}$/.test(token)) {
      if (!isVideoGames(options.category)) qualifiers.push(token);
    } else if (/^(?:UNKNOWN|UNREADABLE|UNSPECIFIED|N\/A|NA|\?)$/.test(token)) qualifierUncertain = true;
    else return null; // Do not silently discard an unreadable or unknown suffix.
  }
  return { numeric, designation, plus: match[3] === '+', qualifiers: [...new Set(qualifiers)].sort(), qualifierUncertain };
}

/**
 * Title channel only. Recognized grader/labeled/designation/parenthesized
 * grade syntax is required; arbitrary years, issue numbers and negated grade
 * claims are not evidence. Retain independent claims even without a winner.
 */
export function readSourceGradeClaimsFromTitle(value: unknown, options: Pick<ComparableGradeOptions, 'category'> = {}): SourceTitleGrade[] {
  const title = stripPresentationNote(meaningfulMetadataText(value));
  if (!title || hasExcludedSourceTitleGradeClaim(title)) return [];
  const claims: SourceTitleGrade[] = [];
  const patterns = [
    new RegExp(`\\b(${GRADERS})(?=\\b|\\d)\\s*[:=-]?\\s*(?:graded\\s*)?(?:grade\\s*[:=-]?\\s*)?\\(?\\s*((?:[QC]\\s*)?${GRADE_OBSERVATION})(?![\\d.+])`, 'gi'),
    new RegExp(`\\b(?:grade|graded|score|rating)\\b\\s*(?:(?:is|of)\\s*)?[:=-]?\\s*\\(?\\s*(${GRADE_OBSERVATION})(?![\\d.+])`, 'gi'),
    new RegExp(`\\b((?:${DESIGNATIONS})\\s*\\d{1,3}(?:\\.\\d+)?\\+?(?:${SUFFIX_SEPARATOR}${SUFFIX_TOKEN}(?![A-Z+])\\s*\\)?)*)(?![\\d.+])`, 'gi'),
  ];
  for (const [index, pattern] of patterns.entries()) {
    for (const match of title.matchAll(pattern)) {
      const before = title.slice(Math.max(0, (match.index ?? 0) - 32), match.index).trim();
      if (/\b(?:not|non|no|without|fake|faux|replica|reproduction|raw|ungraded)(?:[-\s]+(?:a|an|by|for|grade|graded))?[-\s]*$/i.test(before)) continue;
      let grade = (index === 0 ? match[2] : match[1]).trim();
      // Vintage Toy generation codes (G1, G2, …) are not independent grade
      // observations. A grader/labeled G grade remains evidence via patterns
      // 0/1; only the unlabelled designation scan is context-sensitive.
      if (index === 2 && /^G\d+$/i.test(grade)
        && (options.category ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '') === 'vintagetoys') continue;
      // Existing AFA Vintage Toys Q/C labels are numeric grade prefixes, not
      // Coin strike designations. Preserve every qualifier/plus and deny this
      // alias outside the original grader/category contract.
      if (/^[QC]\s*\d/i.test(grade)) {
        if (index !== 0 || match[1].toUpperCase() !== 'AFA'
          || (options.category ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '') !== 'vintagetoys') continue;
        grade = grade.replace(/^[QC]\s*/i, '');
      }
      // CGC numeric grades do not use the A/A+/A++ soft suffix used by some
      // game-title conventions. Treat that stray title letter as listing
      // noise so `CGC 8 A` becomes the comparable numeric grade `8`.
      if (index === 0 && match[1].toUpperCase() === 'CGC') {
        grade = grade.replace(/\s+A\+{0,3}(?=\s|$)/gi, '').trim();
      }

      // A grader-level opening parenthesis is outside the captured grade.
      // Remove only unmatched outer closing parentheses, not (OC)/(PL).
      while (grade.endsWith(')') && (grade.match(/\)/g)?.length ?? 0) > (grade.match(/\(/g)?.length ?? 0)) grade = grade.slice(0, -1).trim();
      const comparable = parseObservedGrade(grade, options);
      if (!comparable) continue;
      // Prefix recognition alone must not consume model-code fragments.
      const after = title[(match.index ?? 0) + match[0].length] ?? '';
      if (/[A-Za-z0-9_+]/.test(after) && !/\s$/.test(match[0])) continue;
      const following = title.slice((match.index ?? 0) + match[0].length);
      if (/^\s*(?:grade\s+)?qualifiers?\s*[:=-]?\s*(?:unknown|unreadable|unspecified|\?)/i.test(following)) comparable.qualifierUncertain = true;
      // A directly attached parenthesis not consumed by the known suffix
      // grammar is uncertainty, not permission to confirm the numeric prefix.
      // Grader-level closing parentheses and ordinary title words are exempt.
      if (/^\s*[-]\s*[A-Z?]/i.test(following) || /^\s*\(/.test(following)) comparable.qualifierUncertain = true;
      if ((grade.match(/\(/g)?.length ?? 0) > (grade.match(/\)/g)?.length ?? 0)) comparable.qualifierUncertain = true;
      claims.push({ grade, grader: index === 0 ? match[1].toUpperCase() : null, comparable });
    }
  }
  return claims;
}

/** Multiple incompatible or incomplete claims cannot select an aggregate grade. */
export function parseSourceGradeFromTitle(value: unknown, options: Pick<ComparableGradeOptions, 'category'> = {}): SourceTitleGrade | null {
  const claims = readSourceGradeClaimsFromTitle(value, options);
  if (!claims.length) return null;
  const first = claims[0];
  // No first-claim winner when another claim is incompatible or incomplete.
  if (claims.slice(1).some(claim => compareParsedGrades(first.comparable, claim.comparable) !== 'match')) return null;
  return first;
}

/** Bare numbers are allowed only by an explicit structured-field caller. */
export function parseComparableGrade(value: unknown, options: ComparableGradeOptions = {}): ComparableGrade | null {
  const text = stripPresentationNote(meaningfulMetadataText(value));
  if (!text || /\b(?:raw|ungraded|not\s+graded)\b/i.test(text)) return null;
  const parsed = parseObservedGrade(text, options);
  if (parsed && (options.allowBareNumeric || parsed.designation || /^\s*\(/.test(text))) return parsed;
  if (new RegExp(`^\\s*\\(?\\s*(?:(?:${DESIGNATIONS})\\s*)?\\d`, 'i').test(text)) return null;
  return parseSourceGradeFromTitle(text, { category: options.category })?.comparable ?? null;
}

function comparableObject(value: unknown): value is ComparableGrade {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const grade = value as Partial<ComparableGrade>;
  return typeof grade.numeric === 'string' && canonicalDecimal(grade.numeric) !== null
    && (grade.designation === null || typeof grade.designation === 'string')
    && typeof grade.plus === 'boolean' && Array.isArray(grade.qualifiers)
    && typeof grade.qualifierUncertain === 'boolean'
    && grade.qualifiers.every(qualifier => typeof qualifier === 'string');
}

function compareParsedGrades(left: ComparableGrade, right: ComparableGrade): GradeComparison {
  if (canonicalDecimal(left.numeric) !== canonicalDecimal(right.numeric) || left.plus !== right.plus) return 'different';
  if (left.designation && right.designation && left.designation !== right.designation) return 'different';
  const a = [...new Set(left.qualifiers)].sort();
  const b = [...new Set(right.qualifiers)].sort();
  if (a.length && b.length && a.join('|') !== b.join('|')) {
    const onlyLeft = a.filter(qualifier => !b.includes(qualifier));
    const onlyRight = b.filter(qualifier => !a.includes(qualifier));
    return onlyLeft.length && onlyRight.length ? 'different' : 'unknown';
  }
  if (left.qualifierUncertain || right.qualifierUncertain || Boolean(left.designation) !== Boolean(right.designation)
    || Boolean(a.length) !== Boolean(b.length)) return 'unknown';
  return 'match';
}

/** No grade rounding, grader-family inference, query rewriting or authority. */
export function compareComparableGrades(left: unknown, right: unknown, options: ComparableGradeOptions = {}): GradeComparison {
  const a = comparableObject(left) ? left : parseComparableGrade(left, options);
  const b = comparableObject(right) ? right : parseComparableGrade(right, options);
  return a && b ? compareParsedGrades(a, b) : 'unknown';
}

/**
 * Pure flat-record reader for the existing structured grade conflict branch.
 * Inspect every known alias; ordered primary display values are not authority
 * to erase another alias. Null means no known difference, never confirmation.
 * Project known provider wrappers first when the supplied record is not flat.
 */
export function findStructuredGradeConflict(
  targetGrade: unknown,
  structuredMetadata: unknown,
  options: Pick<ComparableGradeOptions, 'category'> = {},
): string | null {
  for (const alias of STRUCTURED_GRADE_ALIASES) {
    const observed = readMetadataValue(structuredMetadata, [alias]);
    if (observed && compareComparableGrades(targetGrade, observed, { allowBareNumeric: true, category: options.category }) === 'different') return observed;
  }
  return null;
}
