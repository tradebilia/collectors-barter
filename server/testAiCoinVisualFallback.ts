import { invokeLLM, type ImageContent, type TextContent } from './_core/llm';
import { parseTestAiDetails } from '../shared/testAiCriteria';
import type { NumistaLookup } from './numistaMetadata';

export type CoinVisualFallbackStatus =
  | 'not_needed'
  | 'image_unavailable'
  | 'provider_unavailable'
  | 'provider_response_unusable'
  | 'low_confidence'
  | 'manual_review_required'
  | 'unresolved'
  | 'candidate_ready'
  | 'confirmed_by_numista'
  | 'candidate_not_confirmed';

export type CoinVisualCandidate = {
  country: string;
  denomination: string;
  year: string;
  mintMark: string;
  variety: string;
  metal: string;
  objectType: 'circulation' | 'commemorative' | 'bullion_with_face_value' | 'bullion_weight_only' | 'pattern' | 'token' | 'unknown';
  visibleIdentifiers: string[];
  conflictsWithStructuredData: string[];
  missingEvidence: string[];
  confidence: 'high' | 'medium' | 'low';
};

export type CoinVisualFallbackReport = {
  status: CoinVisualFallbackStatus;
  trigger: string;
  message: string;
  candidate?: CoinVisualCandidate;
  appliedFields: string[];
  preservedFields: string[];
  replacedAmbiguousFields: string[];
  missingRequiredFields: string[];
};

export type CoinVisualFallbackResolution = {
  report: CoinVisualFallbackReport;
  itemDetails?: string;
};

type CoinVisualFallbackInput = {
  title?: string;
  itemDetails?: unknown;
  imageUrl?: string;
};

type VisualLlm = typeof invokeLLM;

const MAX_TEXT_LENGTH = 220;
const OBJECT_TYPES = new Set<CoinVisualCandidate['objectType']>([
  'circulation',
  'commemorative',
  'bullion_with_face_value',
  'bullion_weight_only',
  'pattern',
  'token',
  'unknown',
]);

function text(value: unknown, limit = MAX_TEXT_LENGTH): string {
  return (typeof value === 'string' || typeof value === 'number' ? String(value) : '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

function normalized(value: unknown): string {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function stringList(value: unknown, limit = 6): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((entry) => text(entry, 280)).filter(Boolean))].slice(0, limit);
}

function isSafeVisionImageUrl(value?: string): boolean {
  if (!value) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function usableYear(value: string): string {
  return /^(?:17|18|19|20)\d{2}$/.test(value) ? value : '';
}

function isUnitedStates(value: string): boolean {
  const country = normalized(value);
  return country === 'united states' || country === 'united states of america' || country === 'usa' || country === 'us';
}

/**
 * A numeric value without a unit is unsafe in almost every currency system.
 * Tradebilia's explicit US convention is the sole exception: 1 means $1 and
 * .10 means one dime. Other numeric inputs can be replaced only by visible,
 * medium/high-confidence image evidence, and that replacement is displayed.
 */
function isAmbiguousBareDenomination(value: unknown, country: string): boolean {
  const denomination = text(value);
  if (!/^\d+(?:\.\d+)?$/.test(denomination)) return false;
  if (!isUnitedStates(country)) return true;
  return !['1', '0.10', '.10'].includes(denomination);
}

function detailsObject(itemDetails: unknown): Record<string, unknown> {
  const parsed = parseTestAiDetails(itemDetails);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? { ...parsed } : {};
}

function firstValue(details: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = text(details[key]);
    if (value) return value;
  }
  return '';
}

function extractResponseText(content: unknown): string {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';
  return content
    .filter((part): part is TextContent => Boolean(part) && typeof part === 'object' && (part as TextContent).type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim();
}

export function parseCoinVisualCandidate(content: string): CoinVisualCandidate | null {
  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const raw = JSON.parse(cleaned) as Record<string, unknown>;
    const confidence = raw.confidence === 'high' || raw.confidence === 'medium' || raw.confidence === 'low'
      ? raw.confidence
      : 'low';
    const objectType = typeof raw.objectType === 'string' && OBJECT_TYPES.has(raw.objectType as CoinVisualCandidate['objectType'])
      ? raw.objectType as CoinVisualCandidate['objectType']
      : 'unknown';
    return {
      country: text(raw.country),
      denomination: text(raw.denomination),
      year: usableYear(text(raw.year)),
      mintMark: text(raw.mintMark, 80),
      variety: text(raw.variety),
      metal: text(raw.metal, 120),
      objectType,
      visibleIdentifiers: stringList(raw.visibleIdentifiers),
      conflictsWithStructuredData: stringList(raw.conflictsWithStructuredData),
      missingEvidence: stringList(raw.missingEvidence),
      confidence,
    };
  } catch {
    return null;
  }
}

export const COIN_VISUAL_FALLBACK_RESPONSE_FORMAT = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'tradebilia_coin_visual_fallback',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        country: { type: 'string' },
        denomination: { type: 'string' },
        year: { type: 'string' },
        mintMark: { type: 'string' },
        variety: { type: 'string' },
        metal: { type: 'string' },
        objectType: { type: 'string', enum: ['circulation', 'commemorative', 'bullion_with_face_value', 'bullion_weight_only', 'pattern', 'token', 'unknown'] },
        visibleIdentifiers: { type: 'array', items: { type: 'string' } },
        conflictsWithStructuredData: { type: 'array', items: { type: 'string' } },
        missingEvidence: { type: 'array', items: { type: 'string' } },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      },
      required: ['country', 'denomination', 'year', 'mintMark', 'variety', 'metal', 'objectType', 'visibleIdentifiers', 'conflictsWithStructuredData', 'missingEvidence', 'confidence'],
      additionalProperties: false,
    },
  },
};

const COIN_VISUAL_FALLBACK_ATTEMPTS = [
  // Gemini Flash is the project's verified image-first structured-output path.
  // It is tried first so a normal lookup uses one vision request.
  {
    model: 'gemini-3-flash-preview',
    response_format: COIN_VISUAL_FALLBACK_RESPONSE_FORMAT,
    maxTokens: 1300,
  },
  // Keep a bounded compatible fallback for a temporary provider/model failure.
  // GPT needs minimal reasoning here so its output budget remains available for
  // the small JSON candidate rather than internal reasoning.
  {
    model: 'gpt-5-mini',
    response_format: { type: 'json_object' as const },
    maxCompletionTokens: 1300,
    reasoning: { effort: 'minimal' },
  },
] as const;

export function buildCoinVisualFallbackPrompt(input: CoinVisualFallbackInput): string {
  const details = detailsObject(input.itemDetails);
  return `You are a cautious coin visual-identification fallback. Inspect only what can be seen in the supplied coin image. Do not appraise, authenticate, estimate value, invent an unseen date/mint/denomination, or treat a metal weight as a face value. Produce a candidate only, not a confirmed identity; Numista must confirm every candidate.

Tradebilia input convention: for United States listings, a denomination input of "1" means 1 Dollar and ".10" or "0.10" means 1 Dime. For every other country, a bare numeric denomination such as "1" is ambiguous—not a clear denomination—and a visible unit such as "1 Peso" or "1 Onza" may clarify it. Do not report that non-U.S. numeric-to-unit clarification as a conflict. Do not override any other clear supplied field. If the image appears to disagree with a clear supplied country, denomination, year, mint, or type, explain the disagreement in conflictsWithStructuredData and leave that field candidate-only.

For denomination, always include the unit, for example "1 Peso", "1 Dime", "1/2 Dollar", or "1 Onza". Do not return a number alone. For bullion, distinguish bullion_with_face_value from bullion_weight_only and preserve the weight unit in denomination. Use high confidence only for direct visible text/marks; use medium only for a strong design-based candidate with a visible supporting clue; otherwise use low. Place only short, observable details in visibleIdentifiers.

LISTING TITLE: ${text(input.title, 240) || 'not supplied'}
STRUCTURED LISTING DETAILS: ${JSON.stringify(details)}

Return JSON only.`;
}

function applyVisualCandidate(input: CoinVisualFallbackInput, candidate: CoinVisualCandidate): CoinVisualFallbackResolution {
  const details = detailsObject(input.itemDetails);
  const originalCountry = firstValue(details, ['country', 'issuingCountry', 'issuer']);
  const appliedFields: string[] = [];
  const preservedFields: string[] = [];
  const replacedAmbiguousFields: string[] = [];

  const mergeField = (
    label: string,
    keys: string[],
    fallbackKey: string,
    visualValue: string,
    allowAmbiguousReplacement = false,
  ) => {
    if (!visualValue) return;
    const existingKey = keys.find((key) => text(details[key]));
    const existing = existingKey ? text(details[existingKey]) : '';
    const canReplaceAmbiguous = allowAmbiguousReplacement && existing && isAmbiguousBareDenomination(existing, originalCountry || candidate.country);
    if (existing && !canReplaceAmbiguous) {
      preservedFields.push(label);
      return;
    }
    details[existingKey ?? fallbackKey] = visualValue;
    if (canReplaceAmbiguous) replacedAmbiguousFields.push(label);
    else appliedFields.push(label);
  };

  mergeField('Country / issuer', ['country', 'issuingCountry', 'issuer'], 'country', candidate.country);
  mergeField('Denomination', ['denomination', 'faceValue', 'value'], 'denomination', candidate.denomination, true);
  mergeField('Year', ['year', 'issueYear', 'mintYear'], 'year', candidate.year);
  mergeField('Mint mark', ['mintMark', 'mint', 'mintmark'], 'mintMark', candidate.mintMark);
  mergeField('Variety / series', ['variety', 'coinType', 'series', 'design', 'type'], 'variety', candidate.variety);
  mergeField('Metal / composition', ['metal', 'composition'], 'metal', candidate.metal);
  mergeField('Object type', ['objectType', 'type'], 'objectType', candidate.objectType === 'unknown' ? '' : candidate.objectType);

  const finalCountry = firstValue(details, ['country', 'issuingCountry', 'issuer']);
  const finalDenomination = firstValue(details, ['denomination', 'faceValue', 'value']);
  const finalYear = usableYear(firstValue(details, ['year', 'issueYear', 'mintYear']));
  const missingRequiredFields = [
    !finalCountry && 'country / issuer',
    !finalDenomination && 'denomination with unit',
    !finalYear && 'year',
  ].filter((value): value is string => Boolean(value));

  const reportBase = {
    trigger: 'The structured Numista lookup did not produce a safe catalogue match, so the listing image was reviewed as a candidate-only fallback.',
    candidate,
    appliedFields,
    preservedFields: [...new Set(preservedFields)],
    replacedAmbiguousFields,
    missingRequiredFields,
  };

  if (candidate.confidence === 'low' || candidate.visibleIdentifiers.length === 0) {
    return {
      report: {
        ...reportBase,
        status: 'low_confidence',
        message: 'Visual fallback did not produce enough visible evidence for a safe Numista retry. The listing remains unresolved.',
      },
    };
  }
  if (candidate.conflictsWithStructuredData.length > 0) {
    return {
      report: {
        ...reportBase,
        status: 'manual_review_required',
        message: 'Visual fallback found a possible conflict with supplied listing data. No listing field was overwritten and Numista was not retried automatically.',
      },
    };
  }
  if (missingRequiredFields.length > 0) {
    return {
      report: {
        ...reportBase,
        status: 'unresolved',
        message: `Visual fallback could not safely establish ${missingRequiredFields.join(', ')}. A clearer front/back image or structured fields are required before retrying Numista.`,
      },
    };
  }

  return {
    report: {
      ...reportBase,
      status: 'candidate_ready',
      message: 'Visual fallback supplied missing or ambiguous identity fields for one read-only Numista retry. The candidate is not confirmed unless Numista returns a matching catalogue type.',
    },
    itemDetails: JSON.stringify(details),
  };
}

function hasUsableCandidateIdentity(candidate: CoinVisualCandidate | null): candidate is CoinVisualCandidate {
  return Boolean(candidate && (
    candidate.country
    || candidate.denomination
    || candidate.year
    || candidate.mintMark
    || candidate.variety
  ));
}

export async function resolveCoinVisualFallback(
  input: CoinVisualFallbackInput,
  llm: VisualLlm = invokeLLM,
): Promise<CoinVisualFallbackResolution> {
  if (!isSafeVisionImageUrl(input.imageUrl)) {
    return {
      report: {
        status: 'image_unavailable',
        trigger: 'The structured Numista lookup did not produce a safe catalogue match.',
        message: 'No safe HTTPS listing image was available for visual fallback. The listing remains unresolved.',
        appliedFields: [],
        preservedFields: [],
        replacedAmbiguousFields: [],
        missingRequiredFields: [],
      },
    };
  }

  const messages = [{
    role: 'user' as const,
    content: [
      { type: 'text' as const, text: buildCoinVisualFallbackPrompt(input) },
      { type: 'image_url' as const, image_url: { url: input.imageUrl, detail: 'high' } } as ImageContent,
    ],
  }];
  let providerResponded = false;
  let lastError: unknown;

  for (const attempt of COIN_VISUAL_FALLBACK_ATTEMPTS) {
    try {
      const response = await llm({ ...attempt, messages, temperature: 0 });
      providerResponded = true;
      const candidate = parseCoinVisualCandidate(extractResponseText(response.choices[0]?.message?.content));
      if (hasUsableCandidateIdentity(candidate)) return applyVisualCandidate(input, candidate);
      lastError = new Error('The vision model returned no usable structured coin identity');
    } catch (error) {
      lastError = error;
    }
  }

  if (!providerResponded && lastError instanceof Error) {
    console.warn('[Test AI] Numista visual fallback unavailable:', lastError.message);
  }
  return {
    report: {
      status: providerResponded ? 'provider_response_unusable' : 'provider_unavailable',
      trigger: 'The structured Numista lookup did not produce a safe catalogue match.',
      message: providerResponded
        ? 'The visual provider responded, but none of its compatible retries produced a usable structured coin identity. The listing remains metadata-only.'
        : 'The visual provider could not complete a compatible image-identification retry. The listing remains metadata-only.',
      appliedFields: [],
      preservedFields: [],
      replacedAmbiguousFields: [],
      missingRequiredFields: [],
    },
  };
}

export function shouldAttemptCoinVisualFallback(result: { status: string; message?: string }): boolean {
  return result.status === 'not_found' || (result.status === 'error' && /enter structured coin fields/i.test(result.message ?? ''));
}

export function visualFallbackNotNeededReport(): CoinVisualFallbackReport {
  return {
    status: 'not_needed',
    trigger: 'The structured Numista lookup produced a catalogue result, so visual fallback was not needed.',
    message: 'Structured fields produced the Numista result directly. No visual candidate was used.',
    appliedFields: [],
    preservedFields: [],
    replacedAmbiguousFields: [],
    missingRequiredFields: [],
  };
}

export async function recoverNumistaWithVisualFallback(
  input: { category: string; title?: string; itemDetails?: string; grade?: string; condition?: string; imageUrl?: string },
  lookup: (request: { category: string; title?: string; itemDetails?: string; grade?: string; condition?: string }) => Promise<NumistaLookup>,
  resolveFallback: (request: CoinVisualFallbackInput) => Promise<CoinVisualFallbackResolution> = resolveCoinVisualFallback,
): Promise<NumistaLookup & { visualFallback: CoinVisualFallbackReport }> {
  const structuredResult = await lookup(input);
  if (!shouldAttemptCoinVisualFallback(structuredResult)) {
    return { ...structuredResult, visualFallback: visualFallbackNotNeededReport() };
  }

  const fallback = await resolveFallback(input);
  if (!fallback.itemDetails) return { ...structuredResult, visualFallback: fallback.report };

  const retriedResult = await lookup({ ...input, itemDetails: fallback.itemDetails });
  if (retriedResult.status !== 'success' || !retriedResult.data) {
    return {
      ...structuredResult,
      visualFallback: {
        ...fallback.report,
        status: 'candidate_not_confirmed',
        message: 'Visual fallback supplied a candidate identity, but Numista did not confirm a matching catalogue type. The candidate was not used for a value.',
      },
    };
  }

  return {
    ...retriedResult,
    data: {
      ...retriedResult.data,
      matchNote: `${retriedResult.data.matchNote} Numista confirmed this result after a visible-field visual fallback; the image candidate itself is not a value source.`,
    },
    visualFallback: {
      ...fallback.report,
      status: 'confirmed_by_numista',
      message: 'Visual fallback supplied missing or ambiguous identity fields, and Numista confirmed the returned catalogue type. The image did not supply a price or bypass Numista matching.',
    },
  };
}
