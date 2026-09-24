export type StampFormatKey =
  | 'single'
  | 'single_hinged'
  | 'single_unhinged'
  | 'hinged_block'
  | 'unhinged_block'
  | 'block'
  | 'lot'
  | 'set'
  | 'unknown';

export type StampFormatProfile = {
  key: StampFormatKey;
  label: string;
  queryTerms: string[];
};

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

function normalized(value: unknown): string {
  return text(value).toLowerCase().replace(/[_-]+/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function detailsFromJson(itemDetails?: string): Record<string, unknown> {
  if (!itemDetails) return {};
  try {
    const parsed = JSON.parse(itemDetails);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function first(details: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = text(details[key]);
    if (value) return value;
  }
  return '';
}

export function classifyStampFormat(input: { title?: string; itemType?: string; itemDetails?: string; condition?: string }): StampFormatProfile {
  const details = detailsFromJson(input.itemDetails);
  const itemType = normalized(input.itemType);
  const format = normalized(first(details, ['format', 'stampFormat', 'itemFormat', 'stampType', 'type']));
  const hinge = normalized(first(details, ['hingeStatus', 'hinged', 'hinge', 'gumCondition']));
  const condition = normalized(input.condition || first(details, ['condition', 'stampCondition']));
  const searchable = [normalized(input.title), itemType, format, hinge, condition].filter(Boolean).join(' ');
  const isBlock = /\bblock\b|\bplate block\b|\bse[- ]?tenant\b|\bse tenant\b/.test(searchable);
  const isLot = /\blot\b|\bcollection\b|\baccumulation\b|\bmultiple stamps\b/.test(searchable) || itemType === 'collection lot';
  const isSet = /\bset\b|\bcomplete set\b/.test(searchable) || itemType === 'stamp set';
  const isUnhinged = /\bunhinge(d)?\b|\bmnh\b|\bnever hinged\b|\bmint never hinged\b/.test(searchable);
  const isHinged = !isUnhinged && /\bhinge(d)?\b|\bmint hinged\b|\bpreviously hinged\b|\bmh\b/.test(searchable);

  if (isBlock && isHinged) return { key: 'hinged_block', label: 'Raw hinged block', queryTerms: ['raw hinged block'] };
  if (isBlock && isUnhinged) return { key: 'unhinged_block', label: 'Raw unhinged block', queryTerms: ['unhinged block'] };
  if (isBlock) return { key: 'block', label: 'Stamp block', queryTerms: ['stamp block'] };
  if (isLot) return { key: 'lot', label: 'Raw stamp lot / collection', queryTerms: ['stamp lot'] };
  if (isSet) return { key: 'set', label: 'Stamp set', queryTerms: ['stamp set'] };
  if (isHinged) return { key: 'single_hinged', label: 'Single stamp · hinged', queryTerms: ['single stamp', 'hinged'] };
  if (isUnhinged) return { key: 'single_unhinged', label: 'Single stamp · unhinged / MNH', queryTerms: ['single stamp', 'MNH'] };
  if (itemType === 'single stamp' || itemType === 'single' || /\bsingle stamp\b/.test(searchable)) return { key: 'single', label: 'Single stamp', queryTerms: ['single stamp'] };
  return { key: 'unknown', label: 'Format not specified', queryTerms: [] };
}

export function classifyStampListing(listing: { title?: string; format?: string; condition?: string; description?: string; quantity?: number }): StampFormatProfile {
  return classifyStampFormat({ title: [listing.title, listing.format, listing.description].filter(Boolean).join(' '), condition: listing.condition, itemType: listing.quantity && listing.quantity > 1 ? 'collection lot' : '' });
}

export function stampFormatsCompatible(target: StampFormatProfile, candidate: StampFormatProfile): boolean {
  if (target.key === 'unknown' || candidate.key === 'unknown') return true;
  if (target.key === candidate.key) return true;
  const targetBlock = target.key.includes('block') || target.key === 'block';
  const candidateBlock = candidate.key.includes('block') || candidate.key === 'block';
  const targetBundle = targetBlock || target.key === 'lot' || target.key === 'set';
  const candidateBundle = candidateBlock || candidate.key === 'lot' || candidate.key === 'set';
  if (targetBundle !== candidateBundle) return false;
  if (target.key === 'hinged_block') return candidate.key === 'hinged_block';
  if (target.key === 'unhinged_block') return candidate.key === 'unhinged_block';
  if (target.key === 'single_hinged') return candidate.key !== 'single_unhinged';
  if (target.key === 'single_unhinged') return candidate.key !== 'single_hinged';
  return true;
}
