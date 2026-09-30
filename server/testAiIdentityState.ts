import { normalizeNumericGrade } from '../shared/publicGradeValues';

export type IdentityState = 'raw' | 'graded' | 'unknown';

export type IdentityStateSnapshot = {
  state: IdentityState;
  grade: string | null;
  grader: string | null;
  parallel: string | null;
  autograph: 'auto' | 'non_auto' | 'unknown';
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
  const lot = /\b(?:lot|bundle|collection)\b|\b(?:near\s+)?complete\s+(?:set|collection)\b|\b\d+\s*(?:cards|comics|pins|games|records)\b/i.test(text);
  const negativeSignals = NEGATIVE_PATTERNS.filter(([pattern]) => pattern.test(text)).map(([, label]) => label);
  return {
    state: gradedSignal && !rawSignal ? 'graded' : rawSignal && !gradedSignal ? 'raw' : 'unknown',
    grade: grade ? grade.replace(/\s+/g, '').toUpperCase() : null,
    grader,
    parallel: findParallel(text),
    autograph,
    lot,
    negativeSignals,
  };
}

export function identityStateConflicts(target: IdentityStateSnapshot, sale: IdentityStateSnapshot): string[] {
  const conflicts: string[] = [];
  if (target.state !== 'unknown' && sale.state !== 'unknown' && target.state !== sale.state) conflicts.push(`raw/graded state differs (${sale.state} vs ${target.state})`);
  if (target.grader && sale.grader && target.grader !== sale.grader) conflicts.push(`grading company differs (${sale.grader.toUpperCase()} vs ${target.grader.toUpperCase()})`);
  if (target.grade && sale.grade && target.grade !== sale.grade && normalizeNumericGrade(target.grade) !== normalizeNumericGrade(sale.grade)) conflicts.push(`grade differs (${sale.grade} vs ${target.grade})`);
  if (target.parallel && sale.parallel && target.parallel !== sale.parallel) conflicts.push(`parallel/variant differs (${sale.parallel} vs ${target.parallel})`);
  if (target.autograph === 'auto' && sale.autograph === 'unknown') conflicts.push('autograph status is not stated');
  if (target.autograph === 'unknown' && sale.autograph === 'auto') conflicts.push('sale declares an autograph/signature not declared by target');
  if (target.lot !== sale.lot && (target.lot || sale.lot)) conflicts.push('single item versus lot/bundle differs');
  conflicts.push(...sale.negativeSignals.map((signal) => `negative listing signal: ${signal}`));
  return conflicts;
}
