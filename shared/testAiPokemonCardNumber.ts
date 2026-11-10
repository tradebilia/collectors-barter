export type PokemonCardNumberComparison = 'match' | 'partial' | 'different' | 'unknown';
export type PokemonCardNumberComponent = Readonly<{
  number: string;
  prefix: string | null;
  suffix: string | null;
}>;
export type ParsedPokemonCardNumber = Readonly<{
  original: string | number;
  raw: string;
  canonical: string;
  numerator: PokemonCardNumberComponent;
  denominator: PokemonCardNumberComponent | null;
}>;
export type PokemonCardNumberTitleObservation = ParsedPokemonCardNumber & Readonly<{
  source: 'title';
  index: number;
}>;
export type PokemonCardNumbersFromTitle = Readonly<{
  observations: readonly PokemonCardNumberTitleObservation[];
  ambiguous: boolean;
}>;

// Bounds are syntax limits, not set/subset inference. Never truncate input.
const LABEL = '(?:#\\s*|card\\s+(?:number|no\\.?)\\s*[:#]?\\s*(?:#\\s*)?)';
const COMPONENT = '([a-z]{0,3})([0-9]{1,4})([a-z]{0,3})';
const STRUCTURED = new RegExp(`^(?:${LABEL})?${COMPONENT}(?:\\s*/\\s*${COMPONENT})?$`, 'i');
const canonicalNumber = (value: string): string => value.replace(/^0+(?=\d)/, '');
const componentText = (part: PokemonCardNumberComponent): string =>
  `${part.prefix ?? ''}${part.number}${part.suffix ?? ''}`;

/** Exact structured observation; unknown/malformed input is null, never a numeric tail. */
export function parsePokemonCardNumber(value: unknown): ParsedPokemonCardNumber | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 0)) return null;
  const raw = String(value);
  if (raw.length > 96) return null;
  const match = STRUCTURED.exec(raw.trim());
  if (!match) return null;
  const part = (offset: number): PokemonCardNumberComponent => ({
    prefix: match[offset] ? match[offset].toUpperCase() : null,
    number: canonicalNumber(match[offset + 1]),
    suffix: match[offset + 2] ? match[offset + 2].toUpperCase() : null,
  });
  const numerator = part(1);
  const denominator = match[5] === undefined ? null : part(4);
  return { original: value, raw, numerator, denominator,
    canonical: componentText(numerator) + (denominator ? `/${componentText(denominator)}` : '') };
}

function compareParsed(left: ParsedPokemonCardNumber, right: ParsedPokemonCardNumber): PokemonCardNumberComparison {
  let partial = Boolean(left.denominator) !== Boolean(right.denominator);
  const pairs = [[left.numerator, right.numerator], [left.denominator, right.denominator]] as const;
  for (const [a, b] of pairs) {
    if (!a || !b) continue;
    if (a.number !== b.number) return 'different';
    for (const role of ['prefix', 'suffix'] as const) {
      if (a[role] && b[role] && a[role] !== b[role]) return 'different';
      if (a[role] !== b[role]) partial = true;
    }
  }
  return partial ? 'partial' : 'match';
}

/** Both arguments are original structured values, not parsed objects. No scoring or set inference. */
export function comparePokemonCardNumbers(target: unknown, candidate: unknown): PokemonCardNumberComparison {
  const left = parsePokemonCardNumber(target);
  const right = parsePokemonCardNumber(candidate);
  return left && right ? compareParsed(left, right) : 'unknown';
}

// Broad tokens consume malformed/overlong identifiers whole before the exact parser checks them.
const TITLE_TOKEN = new RegExp(`(?:${LABEL})?[a-z0-9]+(?:\\s*/\\s*[a-z0-9]+)?`, 'gi');
const NON_CARD_BEFORE = /(?:psa|bgs|cgc|sgc|grade|cert(?:ification)?\.?\s*(?:id|number|no\.?)?|certificate\s*(?:id|number|no\.?)?|holder(?:\s*id)?|serial(?:\s*(?:number(?:ed)?|no\.?))?|numbered|print\s*run|limited(?:\s*edition)?|edition|scale|ratio|date|year|price|usd|eur|gbp|lot(?:\s*of)?|qty|quantity|population|pop)\s*[:#=-]?\s*$/i;
const NON_CARD_AFTER = /^\s*(?:serial(?:\s*numbered)?\b|numbered\b|scale\b|ratio\b|grade\b|usd\b|eur\b|gbp\b|dollars?\b)/i;
const NON_CARD_ROLE = /^(?:PSA|BGS|CGC|SGC|USD|EUR|GBP)$/;

function safeTitleToken(title: string, index: number, raw: string, parsed: ParsedPokemonCardNumber): boolean {
  const before = title.slice(0, index);
  const after = title.slice(index + raw.length);
  // Do not salvage IDs, decimal/price tails, chained dates, or punctuation-joined suffixes.
  if (/[\p{L}\p{N}_$£€¥/#:+-]$/u.test(before) || /^[\p{L}\p{N}_/$£€¥:#+-]/u.test(after)) return false;
  if (/\d[.,]$/.test(before) || /^(?:\s*\/|[.,][\p{L}\p{N}_])/u.test(after) || /[$£€¥]\s*$/.test(before)) return false;
  if (NON_CARD_BEFORE.test(before) || NON_CARD_AFTER.test(after)) return false;
  if (!parsed.denominator && /^\s*(?:cards?|pieces?|lots?|copies)\b/i.test(after)) return false;
  for (const part of [parsed.numerator, parsed.denominator]) {
    if (part && (NON_CARD_ROLE.test(part.prefix ?? '') || NON_CARD_ROLE.test(part.suffix ?? ''))) return false;
  }
  const labeled = /^(?:#|card\s+(?:number|no\.?))/i.test(raw);
  if (!labeled && !parsed.denominator) return false;
  if (!labeled && parsed.denominator && !parsed.numerator.prefix && !parsed.numerator.suffix
    && !parsed.denominator.prefix && !parsed.denominator.suffix) {
    const n = Number(parsed.numerator.number), d = Number(parsed.denominator.number);
    // Bare month/day and year/year shapes are not clear collector fractions.
    if (n >= 1 && n <= 12 && d >= 1 && d <= 31) return false;
    if ((n >= 1900 && n <= 2099) || (d >= 1900 && d <= 2099)) return false;
  }
  return true;
}

/** Single-card title evidence only. Keep all witnesses; contradictions never acquire a winner. */
export function readPokemonCardNumbersFromTitle(title: unknown): PokemonCardNumbersFromTitle {
  if (typeof title !== 'string' || title.length > 4096) return { observations: [], ambiguous: false };
  const observations: PokemonCardNumberTitleObservation[] = [];
  let malformedDeclaration = false;
  // A fresh RegExp keeps calls independent (no shared global lastIndex).
  for (const match of title.matchAll(new RegExp(TITLE_TOKEN.source, TITLE_TOKEN.flags))) {
    const raw = match[0], index = match.index!;
    const parsed = parsePokemonCardNumber(raw);
    if (!parsed || !safeTitleToken(title, index, raw, parsed)) {
      const before = title.slice(0, index), after = title.slice(index + raw.length);
      const labeled = /^(?:#|card\s+(?:number|no\.?))/i.test(raw);
      if (labeled && !NON_CARD_BEFORE.test(before) && !NON_CARD_AFTER.test(after)
        && !/^\s*(?:cards?|pieces?|lots?|copies)\b/i.test(after)
        && (!parsed || /^(?:\s*\/|[\p{L}\p{N}_/.#+-])/u.test(after))) malformedDeclaration = true;
      continue;
    }
    if (observations.length === 32) return { observations: [], ambiguous: true };
    observations.push({ ...parsed, source: 'title', index });
  }
  const ambiguous = malformedDeclaration || observations.some((a, i) => observations.slice(i + 1)
    .some(b => compareParsed(a, b) === 'different'));
  return { observations, ambiguous };
}
