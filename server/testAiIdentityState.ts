import { normalizeNumericGrade } from '../shared/publicGradeValues';

export type IdentityState = 'raw' | 'graded' | 'unknown';

export type IdentityStateSnapshot = {
  state: IdentityState;
  grade: string | null;
  grader: string | null;
  parallel: string | null;
  autograph: 'auto' | 'non_auto' | 'unknown';
  signatureNames: string[];
  lot: boolean;
  negativeSignals: string[];
};

const GRADERS = ['psa', 'cgc', 'cbcs', 'bgs', 'sgc', 'pgs', 'csg', 'hga', 'pcgs', 'ngc', 'wata', 'vga', 'afa'];
const NEGATIVE_PATTERNS: Array<[RegExp, string]> = [
  [/\bcustom\s*(?:card|reprint|replica)\b|\breprint\b|\bproxy\b/i, 'custom/reprint/proxy'],
  [/\bcase\s*break\s*spot\b|\bbreak\s*spot\b/i, 'case-break spot'],
  [/\b(?:lot|bundle|collection)\s+of\s+\d+\b|\b\d+\s*(?:cards|comics|pins|games|records)\b/i, 'lot/bundle'],
  [/\b(?:damaged|creased|trimmed|altered|restored)\b/i, 'condition alteration'],
];

function normalized(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9.+#/-]+/g, ' ').trim();
}

function findGrader(text: string): string | null {
  return GRADERS.find((grader) => new RegExp(`\\b${grader}\\b`, 'i').test(text)) ?? null;
}

function findGrade(text: string, grader: string | null): string | null {
  if (grader) {
    const match = text.match(new RegExp(`\\b${grader}\\s*(?:graded?\\s*)?([a-z]{0,8}\\s*\\d{1,3}(?:\\.\\d+)?)`, 'i'));
    if (match?.[1]) return match[1].replace(/\s+/g, '').toUpperCase();
  }
  const generic = text.match(/\b(?:grade|graded)\s*[:#-]?\s*([a-z]{0,8}\s*\d{1,3}(?:\.\d+)?)\b/i);
  return generic?.[1]?.replace(/\s+/g, '').toUpperCase() ?? null;
}

function findParallel(text: string): string | null {
  const match = text.match(/\b(?:silver|gold|blue|red|green|refractor|prizm|parallel|variant|alternate|color match|wave|shimmer|holo(?:graphic)?)\b(?:\s+(?:parallel|variant|refractor))?/i);
  return match?.[0]?.trim().toLowerCase() ?? null;
}

function normalizeSignatureName(value: unknown): string {
  return normalized(value).replace(/\b(?:signed|signature|autograph|autographed|by)\b/g, ' ').replace(/\bmc\s+(?=[a-z])/g, 'mc').replace(/\s+/g, ' ').trim();
}

function collectSignatureNames(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((entry) => {
    if (entry && typeof entry === 'object') {
      const record = entry as Record<string, unknown>;
      return collectSignatureNames(record.name ?? record.signer ?? record.signedBy ?? record.artist ?? record.value);
    }
    return String(entry ?? '').split(/\s*(?:,|;|&|\band\b)\s*/i).map(normalizeSignatureName).filter((name) => name.length >= 2);
  });
}

function trimSignatureDescription(value: string): string {
  return value
    .split(/\s+(?=(?:first|origin|appearance|white pages|off[- ]white|newsstand|direct edition)\b)/i)[0]
    .replace(/[–—-]\s*$/, '')
    .trim();
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      const above = previous[column];
      previous[column] = left[row - 1] === right[column - 1]
        ? diagonal
        : Math.min(diagonal + 1, previous[column] + 1, previous[column - 1] + 1);
      diagonal = above;
    }
  }
  return previous[right.length];
}

function signatureNamesEquivalent(left: string, right: string): boolean {
  if (left === right) return true;
  const leftTokens = left.split(' ').filter(Boolean);
  const rightTokens = right.split(' ').filter(Boolean);
  if (leftTokens.length !== rightTokens.length) return false;
  return leftTokens.every((token, index) => {
    const candidate = rightTokens[index] ?? '';
    return token.length >= 5 && candidate.length >= 5 && editDistance(token, candidate) <= 1;
  });
}

function signatureNameSetsEquivalent(targetNames: string[], saleNames: string[]): boolean {
  if (targetNames.length !== saleNames.length) return false;
  const remaining = [...saleNames];
  return targetNames.every((targetName) => {
    const matchIndex = remaining.findIndex((saleName) => signatureNamesEquivalent(targetName, saleName));
    if (matchIndex < 0) return false;
    remaining.splice(matchIndex, 1);
    return true;
  });
}

export function extractSignatureNames(input: { title?: string | null; itemDetails?: string | null }): string[] {
  let details: Record<string, unknown> = {};
  try {
    const parsed = input.itemDetails ? JSON.parse(input.itemDetails) : {};
    if (parsed && typeof parsed === 'object') details = parsed;
  } catch { /* malformed details remain unknown */ }
  // Comics created by Add Inventory persist the individual signer inputs as
  // `signatures`; retain the broader aliases for older/imported records.
  const explicitKeys = ['signatures', 'signer', 'signers', 'signatureName', 'signatureNames', 'signedBy', 'signedByName', 'autographBy', 'autographNames', 'artistSignature'];
  const names = explicitKeys.flatMap((key) => collectSignatureNames(details[key]));
  const titleNames = String(input.title ?? '').match(/\b(?:signed|autograph(?:ed)?)\s+by\s+(.+?)(?=\s+[-–—(]|$)/i)?.[1];
  if (titleNames) names.push(...collectSignatureNames(trimSignatureDescription(titleNames)));
  return [...new Set(names.map((name) => normalizeSignatureName(name)).filter(Boolean))];
}

export function extractIdentityState(input: { title?: string | null; grade?: string | null; certificationCompany?: string | null; condition?: string | null; itemDetails?: string | null }): IdentityStateSnapshot {
  let details: Record<string, unknown> = {};
  try {
    const parsed = input.itemDetails ? JSON.parse(input.itemDetails) : {};
    if (parsed && typeof parsed === 'object') details = parsed;
  } catch { /* malformed details remain unknown */ }
  const text = normalized([input.title, input.grade, input.certificationCompany, input.condition, ...Object.values(details)].join(' '));
  const grader = findGrader(text);
  const grade = input.grade?.trim() || findGrade(text, grader);
  const gradedSignal = Boolean(grader || input.grade || /\b(?:graded|slab|certified|encapsulated)\b/i.test(text));
  const rawSignal = /\b(?:raw|ungraded|ungraded copy|no grade|未评级)\b/i.test(text);
  const autograph = /\b(?:autograph|autographed|signed|signature|auto)\b/i.test(text) ? 'auto' : 'unknown';
  const signatureNames = extractSignatureNames(input);
  const lot = /\b(?:lot|bundle|collection)\b|\b(?:near\s+)?complete\s+(?:set|collection)\b|\b\d+\s*(?:cards|comics|pins|games|records)\b/i.test(text);
  const negativeSignals = NEGATIVE_PATTERNS.filter(([pattern]) => pattern.test(text)).map(([, label]) => label);
  return {
    state: gradedSignal && !rawSignal ? 'graded' : rawSignal && !gradedSignal ? 'raw' : 'unknown',
    grade: grade ? grade.replace(/\s+/g, '').toUpperCase() : null,
    grader,
    parallel: findParallel(text),
    autograph,
    signatureNames,
    lot,
    negativeSignals,
  };
}

export function identityStateConflicts(target: IdentityStateSnapshot, sale: IdentityStateSnapshot, compareSignatureNames = false): string[] {
  const conflicts: string[] = [];
  if (target.state !== 'unknown' && sale.state !== 'unknown' && target.state !== sale.state) conflicts.push(`raw/graded state differs (${sale.state} vs ${target.state})`);
  if (target.grader && sale.grader && target.grader !== sale.grader) conflicts.push(`grading company differs (${sale.grader.toUpperCase()} vs ${target.grader.toUpperCase()})`);
  if (target.grade && sale.grade && target.grade !== sale.grade && normalizeNumericGrade(target.grade) !== normalizeNumericGrade(sale.grade)) conflicts.push(`grade differs (${sale.grade} vs ${target.grade})`);
  if (target.parallel && sale.parallel && target.parallel !== sale.parallel) conflicts.push(`parallel/variant differs (${sale.parallel} vs ${target.parallel})`);
  if (target.autograph === 'auto' && sale.autograph === 'unknown') conflicts.push('autograph status is not stated');
  if (target.autograph === 'unknown' && sale.autograph === 'auto') conflicts.push('sale declares an autograph/signature not declared by target');
  if (compareSignatureNames && target.autograph === 'auto' && sale.autograph === 'auto' && target.signatureNames.length) {
    if (!sale.signatureNames.length) conflicts.push('signature name is not stated');
    else if (!signatureNameSetsEquivalent(target.signatureNames, sale.signatureNames)) conflicts.push(`signature name set differs (${sale.signatureNames.join(', ')} vs ${target.signatureNames.join(', ')})`);
  }
  if (target.lot !== sale.lot && (target.lot || sale.lot)) conflicts.push('single item versus lot/bundle differs');
  conflicts.push(...sale.negativeSignals.map((signal) => `negative listing signal: ${signal}`));
  return conflicts;
}
