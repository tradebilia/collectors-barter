export type ToyNumericField = 'setNumber' | 'pieceCount' | 'numberOfPieces';

export interface ToyNumericEvidence {
  /** Exact digit spelling: leading zeroes are deliberately not canonicalized. */
  value: string;
  /** Original structured scalar text, or the actual digit capture from a title. */
  raw: string;
}

const SET_SCALAR = /^(?:(?:lego\s+)?set\s*(?:number|no\.?)?\s*[:=#]?\s*|#\s*)?([0-9]{1,7})$/i;
const PIECES_SCALAR = /^(?:(?:piece\s*count|number\s*of\s*pieces|pieces?|pcs|count)\s*[:=#]?\s*)?([0-9]{1,7})(?:\s+(?:pieces?|pcs))?$/i;

/**
 * Parse one entire scalar, never a convenient number inside arbitrary text.
 * Structured-field precedence, aliases and witness source are the caller's job.
 */
export function parseToyNumericValue(value: unknown, field: ToyNumericField): ToyNumericEvidence | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (typeof value === 'number' && (!Number.isInteger(value) || value <= 0 || value > 9999999)) return null;
  const raw = String(value);
  if (raw.length > 96) return null;
  const match = (field === 'setNumber' ? SET_SCALAR : PIECES_SCALAR).exec(raw.trim());
  if (!match || !/[1-9]/.test(match[1])) return null;
  return { value: match[1], raw };
}

const SET_LABEL = /\bset\s*(?:(?:number|no\.?)\s*|#\s*)?[:=#]?\s*$/i;
const PIECES_LABEL = /\b(?:piece[\s-]*count|number[\s-]*of[\s-]*pieces|pieces?|pcs|count)\s*[:=#]?\s*$/i;
const PIECES_SUFFIX = /^\s+(?:pieces?|pcs)\b(?![\s-]*count\b|\s*[:=])|^\s*-\s*(?:pieces?|pcs)\b(?![\s-]*count\b|\s*[:=])/i;
const COUNT_SUFFIX = /^\s*-?\s*count\b/i;
const YEAR = /^(?:18|19|20|21)[0-9]{2}$/;

// These contexts describe economics, certificates, quantities, ages or dates,
// not a toy identifier or a piece count. Keep them out of both title fields.
const NON_IDENTITY_PREFIX = /(?:[$€£¥]\s*|\b(?:usd|eur|gbp|cad|aud|jpy|cny|price|cost|asking(?:\s+price)?|sold\s+for|cert(?:ificate|ification)?|serial|barcode|upc|ean|id|psa|cgc|bgs|grade|lot(?:\s+of)?|qty|quantity|pack\s+of|box\s+of|set\s+of|year|release(?:\s+year)?|released|copyright|ages?)\.?\s*(?:(?:number|no\.?|id)\s*)?[:=#-]*\s*(?:#\s*)?)$/i;
const NON_IDENTITY_SUFFIX = /^\s*(?:[$€£¥%+]|(?:usd|eur|gbp|cad|aud|jpy|cny|dollars?|euros?|lots?(?!\s+of\b)|packs?|items?|years?\s+old|yrs?\s+old)\b)/i;

function boundedNumericToken(before: string, after: string): boolean {
  // No alphanumeric tails, signed/decimal/grouped numbers or serial ranges.
  if (/[a-z0-9_]$/i.test(before) || /^[a-z0-9_]/i.test(after)) return false;
  if (/[.+-]$/.test(before)) return false;
  if (/[0-9][.,]$/.test(before) || /^[.,][0-9]/.test(after)) return false;
  if (/[0-9][/:+-]\s*$/.test(before) || /^\s*[/:+-]\s*[0-9]/.test(after)) return false;
  if (/[$€£¥]\s*$/.test(before)) return false;
  return true;
}

export interface ToyNumericTitleObservations {
  observations: ToyNumericEvidence[];
  /** Conflicting exact values, or a plausible but invalid scalar, have no winner. */
  ambiguous: boolean;
}

/**
 * Inspect only a title supplied by the caller, not descriptions or sourceText.
 * Every full numeric token is considered independently of the target's shape.
 * Repeated identical captures are harmless; different leading-zero spellings
 * remain distinct. A plausible overlong/zero scalar blocks a convenient winner.
 */
export function extractToyNumericTitleEvidence(title: unknown, field: ToyNumericField): ToyNumericTitleObservations {
  const observations: ToyNumericEvidence[] = [];
  if (typeof title !== 'string' || !title.trim()) return { observations, ambiguous: false };
  if (title.length > 4096) return { observations, ambiguous: true };
  const isSet = field === 'setNumber';
  if (isSet && !/\blego\b/i.test(title)) return { observations, ambiguous: false };

  const plausibleValues = new Set<string>();
  let malformed = false;
  // Deliberately match the entire run, not a 1-7 digit substring of a longer ID.
  for (const match of title.matchAll(/[0-9]+/g)) {
    const raw = match[0];
    const index = match.index!;
    const before = title.slice(0, index);
    const after = title.slice(index + raw.length);
    if (!boundedNumericToken(before, after)) continue;
    if (NON_IDENTITY_PREFIX.test(before) || NON_IDENTITY_SUFFIX.test(after)) continue;

    const explicitSet = SET_LABEL.test(before);
    const piecePrefix = PIECES_LABEL.test(before) && !/[0-9]+\s+(?:pieces?|pcs)\s*$/i.test(before);
    const explicitPieces = piecePrefix || PIECES_SUFFIX.test(after) || COUNT_SUFFIX.test(after);
    if (isSet) {
      if (explicitPieces || YEAR.test(raw) && !explicitSet) continue;
      // A standalone "2 sets" is quantity. After another plausible identifier,
      // "6285 and 6286 sets" must remain conflicted, not silently choose 6285.
      if (/^\s+sets\b/i.test(after) && !explicitSet && plausibleValues.size === 0) continue;
    } else if (!explicitPieces || explicitSet) {
      // An identifier can never serve as a count merely because it is numeric.
      continue;
    }

    plausibleValues.add(raw);
    const parsed = parseToyNumericValue(raw, field);
    if (!parsed) {
      malformed = true;
      continue;
    }
    observations.push(parsed);
  }
  return { observations, ambiguous: malformed || plausibleValues.size > 1 };
}

/** Return the actual title capture only when one exact value is supported. */
export function readToyNumericTitleEvidence(title: unknown, field: ToyNumericField): ToyNumericEvidence | null {
  const result = extractToyNumericTitleEvidence(title, field);
  return !result.ambiguous && result.observations.length ? result.observations[0] : null;
}
