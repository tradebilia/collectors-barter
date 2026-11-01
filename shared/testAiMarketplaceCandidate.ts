export type MarketplaceCandidateStatus = 'active' | 'completed' | 'closed' | 'unknown';
export type MarketplaceCandidatePriceBasis = 'asking' | 'sold' | 'realized' | 'closed' | 'unknown';
export type MarketplaceCandidateEvidenceSource = 'structured' | 'title' | 'description' | 'image' | 'unknown';
export type MarketplaceCandidateTitleSource = 'title' | 'itemTitle' | 'listingTitle' | 'productName' | 'name' | 'structured' | 'unknown';
export type MarketplaceCandidateDisposition = 'valuation_eligible' | 'context_only' | 'rejected' | 'not_evaluated';
export type MarketplaceCandidateFilterState = 'passed' | 'blocked' | 'unknown';

export type MarketplaceCandidateDecision = {
  state: MarketplaceCandidateFilterState;
  reasons: string[];
};

export type MarketplaceCandidateRanking = {
  state: 'assigned' | 'not_assigned';
  score: number | null;
  rank: number | null;
  label: string | null;
  reasons: string[];
  matchedFields: string[];
};

export type MarketplaceCandidateVisual = {
  requirement: 'required' | 'not_required' | 'unknown';
  status: 'match' | 'rough_match' | 'mismatch' | 'unreadable' | 'not_reviewed' | 'unknown';
  rationale: string | null;
  audit: unknown;
};

export type MarketplaceCandidateValuation = {
  disposition: MarketplaceCandidateDisposition;
  reasons: string[];
};

export type MarketplaceCandidate = {
  candidateId: string;
  sourceId: string;
  sourceLabel: string;
  providerRecordId: string | null;
  retrievalQuery: string | null;
  title: string;
  titleSource: MarketplaceCandidateTitleSource;
  titleCandidates: string[];
  normalizedTitle: string;
  url: string | null;
  imageUrl: string | null;
  imageUrls: string[];
  imageAvailability: 'available' | 'missing' | 'invalid';
  rawMetadata: Record<string, unknown>;
  structuredMetadata: Record<string, unknown>;
  titleEvidence: Record<string, unknown>;
  titleEvidenceSources: Record<string, MarketplaceCandidateEvidenceSource>;
  price: number | null;
  currency: string | null;
  date: string | null;
  saleStatus: MarketplaceCandidateStatus;
  priceBasis: MarketplaceCandidatePriceBasis;
  marketplace: string | null;
  originMarketplace: string | null;
  seller: string | null;
  lotQuantity: number | null;
  buyerPremium: 'included' | 'excluded' | 'unknown' | null;
  shipping: 'included' | 'excluded' | 'unknown' | null;
  tax: 'included' | 'excluded' | 'unknown' | null;
  universalFilter: MarketplaceCandidateDecision;
  itemTypeFilter: MarketplaceCandidateDecision;
  ranking: MarketplaceCandidateRanking;
  visual: MarketplaceCandidateVisual;
  valuation: MarketplaceCandidateValuation;
};

type CandidateInput = Record<string, unknown> & {
  title?: unknown;
  itemTitle?: unknown;
  listingTitle?: unknown;
  productName?: unknown;
  name?: unknown;
  canonicalTitle?: unknown;
  canonicalTitleSource?: unknown;
  sourceId?: unknown;
  sourceLabel?: unknown;
  id?: unknown;
  saleId?: unknown;
  itemId?: unknown;
  url?: unknown;
  itemUrl?: unknown;
  itemWebUrl?: unknown;
  imageUrl?: unknown;
  thumbnailUrl?: unknown;
  imageUrls?: unknown;
  images?: unknown;
  price?: unknown;
  soldPrice?: unknown;
  currency?: unknown;
  soldCurrency?: unknown;
  date?: unknown;
  endedAt?: unknown;
  saleStatus?: unknown;
  priceBasis?: unknown;
  marketplace?: unknown;
  originMarketplace?: unknown;
  seller?: unknown;
  sellerUsername?: unknown;
  lotQuantity?: unknown;
  buyerPremium?: unknown;
  shipping?: unknown;
  tax?: unknown;
  retrievalQuery?: unknown;
  metadataMatchScore?: unknown;
  metadataMatchRank?: unknown;
  metadataMatchLabel?: unknown;
  metadataMatchReasons?: unknown;
  visualRequirement?: unknown;
  visualReviewStatus?: unknown;
  visualReviewRationale?: unknown;
  visualAudit?: unknown;
  evidenceDisposition?: unknown;
  evidenceReasons?: unknown;
};

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function nullableText(value: unknown): string | null {
  const result = text(value);
  return result || null;
}

function finiteNumber(value: unknown): number | null {
  const result = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(result) ? result : null;
}

function marketValue(value: unknown): number | null {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return finiteNumber(record.value ?? record.amount ?? record.price);
  }
  return finiteNumber(value);
}

function positiveInteger(value: unknown): number | null {
  const result = finiteNumber(value);
  return result !== null && Number.isInteger(result) && result > 0 ? result : null;
}

function normalizeTitle(title: string): string {
  return title
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[“”‘’]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeRemoteUrl(value: unknown): string | null {
  const candidate = text(value);
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? candidate : null;
  } catch {
    return null;
  }
}

function imageList(input: CandidateInput): { urls: string[]; invalid: boolean } {
  const values: unknown[] = [];
  if (Array.isArray(input.imageUrls)) values.push(...input.imageUrls);
  if (Array.isArray(input.images)) values.push(...input.images);
  values.push(input.imageUrl, input.thumbnailUrl);
  const urls: string[] = [];
  let invalid = false;
  for (const value of values) {
    const candidate = typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>).url ?? (value as Record<string, unknown>).src
      : value;
    if (value != null && safeRemoteUrl(candidate) === null) invalid = true;
    const url = safeRemoteUrl(candidate);
    if (url && !urls.includes(url)) urls.push(url);
  }
  return { urls, invalid };
}

function arrayOfText(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function titleCandidates(input: CandidateInput): Array<{ source: MarketplaceCandidateTitleSource; value: string }> {
  const aliases: Array<[MarketplaceCandidateTitleSource, unknown]> = [
    ['title', input.title],
    ['itemTitle', input.itemTitle],
    ['listingTitle', input.listingTitle],
    ['productName', input.productName],
    ['name', input.name],
    ['structured', input.canonicalTitle],
  ];
  const seen = new Set<string>();
  return aliases.flatMap(([source, value]) => {
    const candidate = text(value);
    const key = candidate.toLowerCase();
    if (!candidate || seen.has(key)) return [];
    seen.add(key);
    return [{ source, value: candidate }];
  });
}

function structuredMetadata(input: CandidateInput): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  for (const key of ['itemSpecifics', 'item_specifics', 'aspects', 'specifics', 'itemDetails', 'fullItemDetails']) {
    const value = input[key];
    if ((value && typeof value === 'object') || (typeof value === 'string' && value.trim())) metadata[key] = value;
  }
  return metadata;
}

function validTitleSource(value: unknown, fallback: MarketplaceCandidateTitleSource): MarketplaceCandidateTitleSource {
  const candidate = text(value);
  return ['title', 'itemTitle', 'listingTitle', 'productName', 'name', 'structured', 'unknown'].includes(candidate)
    ? candidate as MarketplaceCandidateTitleSource
    : fallback;
}

function candidateId(input: CandidateInput, title: string, url: string | null): string {
  const explicit = text(input.candidateId ?? input.id ?? input.saleId ?? input.itemId);
  if (explicit) return explicit;
  return `${text(input.sourceId) || 'unknown'}:${text(input.providerRecordId) || url || normalizeTitle(title)}`;
}

export function normalizeMarketplaceCandidate(input: CandidateInput, defaults: Partial<MarketplaceCandidate> = {}): MarketplaceCandidate {
  const titles = titleCandidates(input);
  const title = titles[0]?.value || 'Untitled listing';
  const titleSource = validTitleSource(input.canonicalTitleSource, titles[0]?.source || 'unknown');
  const images = imageList(input);
  const url = safeRemoteUrl(input.url ?? input.itemUrl ?? input.itemWebUrl);
  const imageUrl = images.urls[0] ?? null;
  const score = finiteNumber(input.metadataMatchScore);
  const rank = positiveInteger(input.metadataMatchRank);
  const universalFilter = defaults.universalFilter ?? { state: 'unknown', reasons: [] };
  const itemTypeFilter = defaults.itemTypeFilter ?? { state: 'unknown', reasons: [] };
  const valuation = defaults.valuation ?? {
    disposition: input.evidenceDisposition === 'valuation_eligible' ? 'valuation_eligible' : input.evidenceDisposition === 'rejected_objective_conflict' ? 'rejected' : 'not_evaluated',
    reasons: arrayOfText(input.evidenceReasons),
  };

  return {
    candidateId: defaults.candidateId ?? candidateId(input, title, url),
    sourceId: defaults.sourceId ?? (text(input.sourceId) || 'unknown'),
    sourceLabel: defaults.sourceLabel ?? (text(input.sourceLabel) || 'Unknown source'),
    providerRecordId: defaults.providerRecordId ?? nullableText(input.providerRecordId ?? input.id ?? input.saleId ?? input.itemId),
    retrievalQuery: defaults.retrievalQuery ?? nullableText(input.retrievalQuery),
    title,
    titleSource,
    titleCandidates: defaults.titleCandidates ?? titles.map((candidate) => candidate.value),
    normalizedTitle: defaults.normalizedTitle ?? normalizeTitle(title),
    url,
    imageUrl: defaults.imageUrl ?? imageUrl,
    imageUrls: defaults.imageUrls ?? images.urls,
    imageAvailability: defaults.imageAvailability ?? (imageUrl ? 'available' : images.invalid ? 'invalid' : 'missing'),
    rawMetadata: defaults.rawMetadata ?? { ...input },
    structuredMetadata: defaults.structuredMetadata ?? structuredMetadata(input),
    titleEvidence: defaults.titleEvidence ?? {},
    titleEvidenceSources: defaults.titleEvidenceSources ?? {},
    price: defaults.price ?? marketValue(input.price ?? input.soldPrice),
    currency: defaults.currency ?? nullableText(input.currency ?? input.soldCurrency ?? (input.price && typeof input.price === 'object' ? (input.price as Record<string, unknown>).currency : null)),
    date: defaults.date ?? nullableText(input.date ?? input.endedAt),
    saleStatus: defaults.saleStatus ?? (['active', 'completed', 'closed', 'unknown'].includes(text(input.saleStatus)) ? text(input.saleStatus) as MarketplaceCandidateStatus : 'unknown'),
    priceBasis: defaults.priceBasis ?? (['asking', 'sold', 'realized', 'closed', 'unknown'].includes(text(input.priceBasis)) ? text(input.priceBasis) as MarketplaceCandidatePriceBasis : 'unknown'),
    marketplace: defaults.marketplace ?? nullableText(input.marketplace),
    originMarketplace: defaults.originMarketplace ?? nullableText(input.originMarketplace),
    seller: defaults.seller ?? nullableText(input.seller ?? input.sellerUsername),
    lotQuantity: defaults.lotQuantity ?? positiveInteger(input.lotQuantity),
    buyerPremium: defaults.buyerPremium ?? (['included', 'excluded', 'unknown'].includes(text(input.buyerPremium)) ? text(input.buyerPremium) as MarketplaceCandidate['buyerPremium'] : null),
    shipping: defaults.shipping ?? (['included', 'excluded', 'unknown'].includes(text(input.shipping)) ? text(input.shipping) as MarketplaceCandidate['shipping'] : null),
    tax: defaults.tax ?? (['included', 'excluded', 'unknown'].includes(text(input.tax)) ? text(input.tax) as MarketplaceCandidate['tax'] : null),
    universalFilter,
    itemTypeFilter,
    ranking: defaults.ranking ?? {
      state: score === null && rank === null ? 'not_assigned' : 'assigned',
      score,
      rank,
      label: nullableText(input.metadataMatchLabel),
      reasons: [],
      matchedFields: arrayOfText(input.metadataMatchReasons),
    },
    visual: defaults.visual ?? {
      requirement: ['required', 'not_required'].includes(text(input.visualRequirement)) ? text(input.visualRequirement) as MarketplaceCandidateVisual['requirement'] : 'unknown',
      status: ['match', 'rough_match', 'mismatch', 'unreadable', 'not_reviewed'].includes(text(input.visualReviewStatus)) ? text(input.visualReviewStatus) as MarketplaceCandidateVisual['status'] : 'unknown',
      rationale: nullableText(input.visualReviewRationale),
      audit: input.visualAudit ?? null,
    },
    valuation,
  };
}

export function withMarketplaceCandidateDecision(
  candidate: MarketplaceCandidate,
  update: Partial<Pick<MarketplaceCandidate, 'universalFilter' | 'itemTypeFilter' | 'ranking' | 'visual' | 'valuation'>>,
): MarketplaceCandidate {
  return { ...candidate, ...update };
}
