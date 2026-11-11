import { normalizeMarketplaceCandidate, type MarketplaceCandidate } from '../shared/testAiMarketplaceCandidate';

export type EbayCandidateDefaults = {
  sourceId?: string;
  sourceLabel?: string;
  retrievalQuery?: string | null;
  saleStatus?: 'active' | 'completed' | 'closed' | 'unknown';
  priceBasis?: 'asking' | 'sold' | 'realized' | 'closed' | 'unknown';
};

function text(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const result = String(value).trim();
  return result || null;
}

function valueOf(value: unknown): unknown {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return record.value ?? record.amount ?? record.price;
  }
  return value;
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    const result = text(value);
    if (result) return result;
  }
  return null;
}

function imageUrl(value: unknown): unknown {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return record.imageUrl ?? record.thumbnailUrl ?? record.image_url ?? record.thumbnail_url ?? record.url ?? record.src ?? record.href;
  }
  return null;
}

function ebayImageValues(item: Record<string, unknown>): unknown[] {
  return [
    item.imageUrl,
    item.thumbnailUrl,
    item.image,
    ...(Array.isArray(item.thumbnailImages) ? item.thumbnailImages : []),
    ...(Array.isArray(item.additionalImages) ? item.additionalImages : []),
    ...(Array.isArray(item.galleryImages) ? item.galleryImages : []),
    ...(Array.isArray(item.imageUrls) ? item.imageUrls : []),
    ...(Array.isArray(item.images) ? item.images : []),
  ].map(imageUrl);
}

function normalizedAspectKey(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function ebayLocalizedAspectFields(value: unknown): Record<string, unknown> {
  if (!Array.isArray(value)) return {};
  const aliases: Record<string, string> = {
    autographauthentication: 'authenticationCompany',
    authenticationcompany: 'authenticationCompany',
    authentication: 'authenticationCompany',
    signeditemtype: 'signedItemType',
    autographcategory: 'autographCategory',
    autographincluded: 'authenticationIncluded',
    autographed: 'authenticationIncluded',
  };
  return value.reduce<Record<string, unknown>>((fields, aspect) => {
    if (!aspect || typeof aspect !== 'object') return fields;
    const record = aspect as Record<string, unknown>;
    const name = record.name ?? record.label ?? record.propertyName;
    const field = aliases[normalizedAspectKey(name)];
    if (!field || fields[field] !== undefined) return fields;
    const aspectValue = record.value ?? record.values ?? record.propertyValue;
    if (aspectValue !== undefined && aspectValue !== null && String(aspectValue).trim()) fields[field] = aspectValue;
    return fields;
  }, {});
}

export function normalizeEbayMarketplaceCandidate(
  item: Record<string, unknown>,
  defaults: EbayCandidateDefaults = {},
): MarketplaceCandidate {
  const saleStatus = defaults.saleStatus ?? (item.saleStatus === 'active' ? 'active' : 'completed');
  const priceBasis = defaults.priceBasis ?? (saleStatus === 'active' ? 'asking' : 'sold');
  const sourceId = defaults.sourceId ?? text(item.sourceId) ?? 'ebay_active';
  const sourceLabel = defaults.sourceLabel ?? text(item.sourceLabel) ?? (saleStatus === 'active' ? 'eBay active listings' : 'eBay Sold-Comps');
  const currency = firstText(item.soldCurrency, item.currency, (item.price as Record<string, unknown> | undefined)?.currency, (item.currentBidPrice as Record<string, unknown> | undefined)?.currency) ?? 'USD';
  const price = valueOf(item.soldPrice ?? item.price ?? item.currentBidPrice);
  const imageUrls = Array.isArray(item.imageUrls) ? item.imageUrls : ebayImageValues(item);
  const title = firstText(item.title, item.itemTitle, item.listingTitle, item.name) ?? 'Untitled eBay listing';
  const url = firstText(item.itemWebUrl, item.itemUrl, item.url);
  const date = firstText(item.endedAt, item.soldAt, item.itemEndDate, item.date);
  const condition = firstText(item.marketplaceCondition, item.condition);
  const seller = firstText(item.sellerUsername, (item.seller as Record<string, unknown> | undefined)?.username);
  const localizedAspectFields = ebayLocalizedAspectFields(item.localizedAspects);
  const structuredMetadata = {
    ...(Object.keys(localizedAspectFields).length > 0 || item.itemSpecifics && typeof item.itemSpecifics === 'object'
      ? { itemSpecifics: { ...localizedAspectFields, ...(item.itemSpecifics as Record<string, unknown> | undefined) } } : {}),
    ...(Array.isArray(item.localizedAspects) ? { localizedAspects: item.localizedAspects } : {}),
    ...(item.aspects && typeof item.aspects === 'object' ? { aspects: item.aspects } : {}),
    ...(item.specifics && typeof item.specifics === 'object' ? { specifics: item.specifics } : {}),
    ...(item.itemDetails && typeof item.itemDetails === 'object' ? { itemDetails: item.itemDetails } : {}),
  };

  return normalizeMarketplaceCandidate({
    ...item,
    sourceId,
    sourceLabel,
    retrievalQuery: defaults.retrievalQuery ?? item.retrievalQuery,
    title,
    itemTitle: item.itemTitle,
    listingTitle: item.listingTitle,
    url,
    imageUrls,
    price,
    currency,
    date,
    saleStatus,
    priceBasis,
    marketplace: 'eBay',
    originMarketplace: 'eBay',
    seller,
    condition,
    marketplaceCondition: condition,
    providerRecordId: item.itemId ?? item.saleId ?? item.id,
  }, {
    sourceId,
    sourceLabel,
    marketplace: 'eBay',
    originMarketplace: 'eBay',
    retrievalQuery: defaults.retrievalQuery ?? (typeof item.retrievalQuery === 'string' ? item.retrievalQuery : null),
    saleStatus,
    priceBasis,
    structuredMetadata,
  });
}

export function ebayCandidateImageUrls(item: Record<string, unknown>): string[] {
  const candidate = normalizeEbayMarketplaceCandidate(item);
  return candidate.imageUrls;
}
