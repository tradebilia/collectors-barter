import { meaningfulMetadataText, metadataBooleanState, readMetadataValue, STRUCTURED_GRADE_ALIASES } from './testAiMetadataValues';
import { parseComparableGrade, readSourceGradeClaimsFromTitle } from './testAiGradeComparison';

export type ExplicitGradingWitness = { field: string; source: 'structured' | 'title'; value: string };
export type ExplicitGradingObservation = ExplicitGradingWitness & {
  state: 'raw' | 'graded' | 'unknown'; kind: 'explicit' | 'grade' | 'grader';
};
export type ExplicitGradingState = {
  state: 'raw' | 'graded' | 'unknown' | 'conflicted'; witness?: ExplicitGradingWitness;
  observations: ExplicitGradingObservation[]; truncated?: true;
};
const key = (value: string) => value.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g, '');
const STATES = ['isgraded', 'graded', 'gradingstatus', 'gradingstate'];
const GRADES = new Set(STRUCTURED_GRADE_ALIASES.map(key));
const GRADERS = new Set(['certificationcompany', 'gradingcompany', 'grader']);
const WRAPPERS = ['normalizedStructuredMetadata', 'structuredMetadata', 'soldCompsMetadata', 'fullItemDetails',
  'itemDetails', 'item_details', 'details', 'itemSpecifics', 'item_specifics', 'specifics', 'aspects', 'metadata', 'rawMetadata'].map(key);
const RECOGNIZED_GRADER = /^(?:PSA|AFA|CGC|CBCS|PGX|BGS|BVG|BCCG|SGC|PCGS|NGC|WATA|VGA|HGA|CSG|ISA|GMA|PSE|ASG|PMG|ICG|ANACS|Beckett(?:\s+Grading\s+Services)?|Certified\s+Guaranty\s+Company|Professional\s+Sports\s+Authenticator|Numismatic\s+Guaranty\s+(?:Company|Corporation))$/i;
const RAW_TITLE = /\b(?:raw|ungraded|not[\s-]*(?:professionally[\s-]+)?graded)\b/gi;
const POSITIVE_TITLE = /\b(?:graded|slabbed|encapsulated)\b/gi;
const NEGATED = /\b(?:not|no|non|never|without|fake|faux|replica|reproduction|un)(?:[-\s]+(?:a|an|is|yet|professionally|being|been|by|for))*[-\s]*$/i;
const UNCERTAIN_TITLE_SUFFIX = /^\s*(?:style|like|candidate|ready|possible|maybe|\?)/i;

/** Facts only, not scoring or stale-field cleanup. Callers own category policy (including Disney Pins). */
export function determineExplicitGradingState(
  input: unknown, options: { category?: string; title?: unknown; identityValues?: readonly unknown[] } = {},
): ExplicitGradingState {
  const observations: ExplicitGradingObservation[] = [];
  const seen = new WeakSet<object>();
  let remaining = 2048, truncated = false;
  const root = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : null;
  const videoGames = key(options.category ?? '') === 'videogames';
  function add(name: string, value: unknown, field: string): void {
    const normalized = key(name);
    const kind = STATES.includes(normalized) ? 'explicit'
      : GRADES.has(normalized) || (videoGames && normalized === 'gamegrade') ? 'grade'
      : GRADERS.has(normalized) ? 'grader' : null;
    if (!kind) return;
    const values = Array.isArray(value) ? value.slice(0, 256) : [value];
    if (Array.isArray(value) && value.length > 256) truncated = true;
    for (const entry of values) {
      if (remaining-- <= 0) { truncated = true; return; }
      if (entry !== null && typeof entry === 'object') continue;
      if (typeof entry === 'string' && entry.length > 200000) { truncated = true; continue; }
      const text = meaningfulMetadataText(entry);
      let state: ExplicitGradingObservation['state'] = 'unknown';
      if (kind === 'explicit') {
        const boolean = metadataBooleanState(entry);
        if (boolean === 'no' || /^(?:raw|ungraded|not[\s-]*graded)$/i.test(text)) state = 'raw';
        if (boolean === 'yes' || /^(?:graded|slabbed)$/i.test(text)) state = 'graded';
      } else if (kind === 'grade' && parseComparableGrade(entry, { allowBareNumeric: true, category: options.category })) state = 'graded';
      else if (kind === 'grader' && RECOGNIZED_GRADER.test(text)) state = 'graded';
      observations.push({ field, source: 'structured', value: text || String(entry ?? ''), state, kind });
    }
  }
  function visit(value: unknown, depth: number, path: string): void {
    if (depth > 6 || remaining-- <= 0) { truncated = true; return; }
    if (typeof value === 'string') {
      if (!/^\s*[\[{]/.test(value)) return;
      if (value.length > 200000) { truncated = true; return; }
      try { visit(JSON.parse(value), depth + 1, path); } catch { /* Invalid wrapper is not evidence. */ }
      return;
    }
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      if (value.length > 256) truncated = true;
      value.slice(0, 256).forEach((child, index) => visit(child, depth + 1, `${path}[${index}]`));
      return;
    }
    const record = value as Record<string, unknown>;
    const entries = Object.entries(record);
    if (entries.length > 512) truncated = true;
    const bounded = entries.slice(0, 512);
    const namedField = readMetadataValue(record, ['name', 'key', 'label', 'propertyName']);
    const namedValues = bounded.filter(([name]) => ['value', 'values', 'propertyvalue'].includes(key(name)));
    if (namedField && namedValues.length) {
      for (const [name, child] of namedValues) add(namedField, child, `${path}.${namedField}.${name}`);
      return;
    }
    // Originals remain separate: no first-value projection or Other/custom substitution.
    bounded.sort(([a], [b]) => (STATES.indexOf(key(a)) + 1 || 99) - (STATES.indexOf(key(b)) + 1 || 99));
    for (const [name, child] of bounded) add(name, child, path ? `${path}.${name}` : name);
    const wrappers = bounded.filter(([name]) => WRAPPERS.includes(key(name)))
      .sort(([a], [b]) => WRAPPERS.indexOf(key(a)) - WRAPPERS.indexOf(key(b)));
    for (const [name, child] of wrappers) visit(child, depth + 1, path ? `${path}.${name}` : name);
  }
  if (root) visit(root, 0, '');
  const suppliedTitle = options.title !== undefined ? options.title : root?.title;
  const title = typeof suppliedTitle === 'string' ? suppliedTitle.normalize('NFKC').trim() : '';
  if (title.length > 200000) truncated = true;
  else if (title) {
    const rawSpans: Array<{ start: number; end: number }> = [];
    const identityRawSpans: Array<{ start: number; end: number }> = [];
    const identitySpans: Array<{ start: number; end: number }> = [];
    const identities = options.identityValues ?? [];
    if (identities.length > 128) truncated = true;
    for (const identity of identities.slice(0, 128)) {
      const value = meaningfulMetadataText(identity).normalize('NFKC');
      if (value.length > 4096) { truncated = true; continue; }
      if (!value || !/\braw\b/i.test(value)) continue;
      const lower = title.toLowerCase(), phrase = value.toLowerCase();
      let start = lower.indexOf(phrase);
      while (start !== -1) {
        if (remaining-- <= 0) { truncated = true; break; }
        identitySpans.push({ start, end: start + phrase.length });
        start = lower.indexOf(phrase, start + phrase.length);
      }
    }
    for (const match of title.matchAll(RAW_TITLE)) {
      const start = match.index ?? 0;
      if (/^raw$/i.test(match[0]) && identitySpans.some(span => start >= span.start && start < span.end)) {
        identityRawSpans.push({ start, end: start + match[0].length }); continue;
      }
      if (NEGATED.test(title.slice(Math.max(0, start - 64), start))) continue;
      if (remaining-- <= 0) { truncated = true; break; }
      // Mask uncertain raw wording too: it is not a raw assertion, but must
      // not hide an independently valid grade elsewhere in the title.
      rawSpans.push({ start, end: start + match[0].length });
      if (UNCERTAIN_TITLE_SUFFIX.test(title.slice(start + match[0].length))) continue;
      observations.push({ field: 'title', source: 'title', value: match[0], state: 'raw', kind: 'explicit' });
    }
    for (const match of title.matchAll(POSITIVE_TITLE)) {
      const start = match.index ?? 0;
      if (rawSpans.some(span => start >= span.start && start < span.end)
        || NEGATED.test(title.slice(Math.max(0, start - 64), start))
        || UNCERTAIN_TITLE_SUFFIX.test(title.slice(start + match[0].length))) continue;
      if (remaining-- <= 0) { truncated = true; break; }
      observations.push({ field: 'title', source: 'title', value: match[0], state: 'graded', kind: 'explicit' });
    }
    // The shared title parser rejects all raw wording. Mask independent raw tokens
    // only, retaining 'not' for negative clauses so they cannot invent a positive.
    let gradeTitle = title;
    for (const span of [...rawSpans, ...identityRawSpans].sort((a, b) => b.start - a.start)) {
      const token = title.slice(span.start, span.end);
      gradeTitle = gradeTitle.slice(0, span.start) + (/^not/i.test(token) ? 'not ' : ' ') + gradeTitle.slice(span.end);
    }
    gradeTitle = gradeTitle.replace(/\b(?:not|never|no|without)\s+(?:(?:yet|professionally|been|being)\s+)*(?:graded|slabbed|encapsulated)\b/gi, 'not');
    for (const claim of readSourceGradeClaimsFromTitle(gradeTitle, { category: options.category })) {
      if (remaining-- <= 0) { truncated = true; break; }
      observations.push({ field: 'title', source: 'title',
        value: claim.grader ? `${claim.grader} ${claim.grade}` : claim.grade, state: 'graded', kind: 'grade' });
    }
  }
  const raw = observations.some(observation => observation.state === 'raw');
  const graded = observations.some(observation => observation.state === 'graded');
  const state = raw && graded ? 'conflicted' : truncated ? 'unknown' : raw ? 'raw' : graded ? 'graded' : 'unknown';
  const winner = state === 'raw' || state === 'graded' ?
    observations.find(observation => observation.state === state && observation.source === 'structured' && observation.kind === 'explicit')
      ?? observations.find(observation => observation.state === state && observation.source === 'structured')
      ?? observations.find(observation => observation.state === state && observation.source === 'title') : undefined;
  return { state, observations, ...(winner ? { witness: { field: winner.field, source: winner.source, value: winner.value } } : {}),
    ...(truncated ? { truncated: true as const } : {}) };
}
