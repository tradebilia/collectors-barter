export type DisneyPinForm = 'single' | 'set' | 'lot' | 'unknown';

type DisneyPinFormInput = {
  title?: unknown;
  itemType?: unknown;
  productType?: unknown;
  form?: unknown;
  saleForm?: unknown;
  itemDetails?: unknown;
  lotQuantity?: unknown;
  itemCount?: unknown;
  numberOfItems?: unknown;
  numberOfPins?: unknown;
  quantity?: unknown;
  targetItemType?: unknown;
};

function normalized(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[_/]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function positiveQuantity(value: unknown): boolean {
  const quantity = Number(value);
  return Number.isFinite(quantity) && quantity > 1;
}

function structuredDetails(input: DisneyPinFormInput): Record<string, unknown> {
  if (input.itemDetails && typeof input.itemDetails === 'object' && !Array.isArray(input.itemDetails)) {
    return input.itemDetails as Record<string, unknown>;
  }
  if (typeof input.itemDetails === 'string') {
    try {
      const parsed = JSON.parse(input.itemDetails);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      // Malformed provider details are unknown, not implicit lot evidence.
    }
  }
  return {};
}

function isIndividualTarget(value: unknown): boolean {
  return /^(?:single|individual)[ _-]*pin$/i.test(normalized(value));
}

function explicitTitleLot(title: string): boolean {
  return /\b(?:mixed\s+)?(?:lot|bundle|multipack|multi[- ]?pack|assortment|group\s+of|set\s+of\s+\d+|collection\s+lot|collection\s+of\s+\d+|(?:[2-9]|[1-9]\d|[1-9]\d{2})\s+pins?)\b/i.test(title)
    || /#?\d+\s*(?:\+|,|\/)\s*#?\d+(?:\s*(?:\+|,|\/)\s*#?\d+)+/i.test(title);
}

/**
 * Classify a Disney Pins candidate or target form.
 *
 * “Collection” by itself is deliberately ambiguous for an individual pin:
 * it commonly belongs to the official series name or is an eBay provider label.
 * Only explicit multi-item evidence makes a candidate a lot.
 */
export function classifyDisneyPinForm(input: DisneyPinFormInput): DisneyPinForm {
  const details = structuredDetails(input);
  const title = normalized(input.title);
  const structuredTypes = [
    input.itemType,
    input.productType,
    input.form,
    input.saleForm,
    details.itemType,
    details.productType,
    details.form,
    details.saleForm,
  ].filter(value => value != null).map(normalized).filter(Boolean);
  const targetIsIndividual = isIndividualTarget(input.targetItemType);

  if ([
    input.lotQuantity,
    input.itemCount,
    input.numberOfItems,
    input.numberOfPins,
    input.quantity,
    details.lotQuantity,
    details.itemCount,
    details.numberOfItems,
    details.numberOfPins,
    details.quantity,
  ].some(positiveQuantity)) return 'lot';

  if (explicitTitleLot(title)) return 'lot';

  const explicitStructuredLot = structuredTypes.some(value =>
    /\b(?:bundle|mixed|assortment|group of|multipack|multi pack)\b/i.test(value)
      || (/\blot\b/i.test(value) && !/^collection(?:\s*lot)?$/i.test(value)),
  );
  if (explicitStructuredLot) return 'lot';

  if (structuredTypes.some(value => /\b(?:set|pair|duo|trio)\b/i.test(value))) return 'set';
  if (/\b(?:set|pair|duo|trio)\b/i.test(title)) return 'set';

  // A provider’s bare Collection or Collection/Lot label is advisory. For a
  // named individual Disney Pin, title and quantity evidence take precedence.
  if (targetIsIndividual && /\b(?:pin|pins)\b/i.test(title)) return 'single';

  if (structuredTypes.some(value => /^(?:single|individual)[ _-]*pin$/.test(value))) return 'single';
  if (structuredTypes.some(value => /\b(?:pin|pins)\s+set\b|^set$/.test(value))) return 'set';
  if (structuredTypes.some(value => /\b(?:collection|lot)\b/.test(value))) return targetIsIndividual ? 'unknown' : 'lot';

  if (/\b(?:single|individual)\s+pin\b/.test(title)) return 'single';
  if (/\bpin\b/.test(title)) return 'single';
  return 'unknown';
}

export function disneyPinFormsConflict(target: DisneyPinForm, candidate: DisneyPinForm): boolean {
  return target !== 'unknown' && candidate !== 'unknown' && target !== candidate;
}
