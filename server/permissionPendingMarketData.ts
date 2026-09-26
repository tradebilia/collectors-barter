import {
  getPermissionPendingMarketSource,
  isPermissionPendingMarketSourceApplicable,
  type PermissionPendingMarketSourceId,
} from '../shared/permissionPendingMarketSources';

export type PermissionPendingLookupInput = {
  title: string;
  category: string;
  grade?: string | null;
  certificationCompany?: string | null;
  itemDetails?: string | null;
};

export type PendingSourceRecord = {
  title?: unknown;
  description?: unknown;
  lotId?: unknown;
  auctionName?: unknown;
  url?: unknown;
  imageUrl?: unknown;
  sold?: unknown;
  status?: unknown;
  saleStatus?: unknown;
  realizedPrice?: unknown;
  price?: unknown;
  hammerPrice?: unknown;
  currency?: unknown;
  soldDate?: unknown;
  date?: unknown;
  grade?: unknown;
  certificationCompany?: unknown;
  groupedLot?: unknown;
  buyerPremiumIncluded?: unknown;
  catalogNumber?: unknown;
};

export type NormalizedPendingSale = {
  sourceId: PermissionPendingMarketSourceId;
  provider: string;
  title: string;
  lotId: string | null;
  auctionName: string | null;
  url: string | null;
  imageUrl: string | null;
  catalogNumber: string | null;
  saleStatus: 'completed' | 'unknown';
  completed: boolean;
  price: number | null;
  currency: string | null;
  date: string | null;
  grade: string | null;
  certificationCompany: string | null;
  groupedLot: boolean;
  priceBasis: 'hammer' | 'including_buyers_premium' | 'unknown';
  buyerPremiumIncluded: boolean | null;
  identityMatched: boolean;
  matchedTokens: string[];
  eligibleWhenAuthorized: boolean;
  valuationEligible: false;
  activationBlock: string;
};

const STOP_WORDS = new Set([
  'the', 'and', 'with', 'for', 'from', 'card', 'cards', 'coin', 'coins', 'comic', 'comics', 'game', 'games', 'lot', 'auction', 'graded', 'grade', 'vintage', 'collectible', 'collectibles',
]);

function text(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

function normalized(value: unknown): string {
  return text(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function significantTokens(value: unknown): string[] {
  return Array.from(new Set(normalized(value).split(' ').filter((token) => token.length >= 3 && !STOP_WORDS.has(token))));
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  const candidate = text(value).replace(/[^0-9.\-]/g, '');
  const parsed = Number(candidate);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function hasCompletedStatus(record: PendingSourceRecord): boolean {
  if (record.sold === true) return true;
  return ['sold', 'completed', 'realized', 'closed_sold'].includes(normalized(record.saleStatus ?? record.status));
}

function gradeMatches(input: PermissionPendingLookupInput, record: PendingSourceRecord): boolean {
  const expected = normalized(`${input.certificationCompany ?? ''} ${input.grade ?? ''}`).replace(/ /g, '');
  if (!expected) return true;
  const observed = normalized(`${record.certificationCompany ?? ''} ${record.grade ?? ''} ${record.title ?? ''}`).replace(/ /g, '');
  return observed.includes(expected) || observed.includes(normalized(input.grade).replace(/ /g, ''));
}

function materialMatches(input: PermissionPendingLookupInput, record: PendingSourceRecord): boolean {
  const materials = ['gold', 'silver', 'platinum', 'palladium', 'copper', 'bronze', 'nickel'];
  const target = normalized(`${input.title} ${input.itemDetails ?? ''}`);
  const candidate = normalized(`${record.title ?? ''} ${record.description ?? ''}`);
  const expectedMaterials = materials.filter((material) => target.includes(material));
  if (!expectedMaterials.length) return true;
  const declaredCandidateMaterials = materials.filter((material) => candidate.includes(material));
  // A concise lot title may omit metal. It is not a mismatch unless it explicitly
  // declares a material that conflicts with the selected item's material.
  return !declaredCandidateMaterials.some((material) => !expectedMaterials.includes(material));
}

function yearMatches(input: PermissionPendingLookupInput, record: PendingSourceRecord): boolean {
  const expectedYears = Array.from(new Set((`${input.title} ${input.itemDetails ?? ''}`).match(/\b(?:1[0-9]{3}|20[0-9]{2})\b/g) ?? []));
  if (!expectedYears.length) return true;
  const candidateYears = new Set((`${record.title ?? ''} ${record.description ?? ''}`).match(/\b(?:1[0-9]{3}|20[0-9]{2})\b/g) ?? []);
  return expectedYears.some((year) => candidateYears.has(year));
}

function identityMatch(input: PermissionPendingLookupInput, record: PendingSourceRecord): { matched: boolean; matchedTokens: string[] } {
  const targetTokens = significantTokens(`${input.title} ${input.itemDetails ?? ''}`);
  const candidate = normalized(`${record.title ?? ''} ${record.description ?? ''} ${record.catalogNumber ?? ''}`);
  const matchedTokens = targetTokens.filter((token) => candidate.includes(token));
  const targetIsSpecific = targetTokens.some((token) => token.length >= 7);
  return {
    matched: (matchedTokens.length >= 2 || (targetIsSpecific && matchedTokens.some((token) => token.length >= 7)))
      && gradeMatches(input, record)
      && materialMatches(input, record)
      && yearMatches(input, record),
    matchedTokens,
  };
}

/**
 * Converts a source-shaped sold record to Tradebilia's comparable record contract.
 * This function has no fetch call by design. The caller cannot use it to retrieve a
 * remote page while the source remains pending permission.
 */
export function normalizePermissionPendingSale(
  sourceId: PermissionPendingMarketSourceId,
  input: PermissionPendingLookupInput,
  record: PendingSourceRecord,
): NormalizedPendingSale {
  const source = getPermissionPendingMarketSource(sourceId);
  const identity = identityMatch(input, record);
  const completed = hasCompletedStatus(record);
  const price = parseNumber(record.realizedPrice ?? record.price ?? record.hammerPrice);
  const date = text(record.soldDate ?? record.date) || null;
  const groupedLot = record.groupedLot === true;
  const eligibleWhenAuthorized = source.status === 'pending_permission' && Boolean(completed && price && date && identity.matched && !groupedLot);

  return {
    sourceId,
    provider: source.label,
    title: text(record.title) || input.title,
    lotId: text(record.lotId) || null,
    auctionName: text(record.auctionName) || null,
    url: text(record.url) || null,
    imageUrl: text(record.imageUrl) || null,
    catalogNumber: text(record.catalogNumber) || null,
    saleStatus: completed ? 'completed' : 'unknown',
    completed,
    price,
    currency: text(record.currency) || null,
    date,
    grade: text(record.grade) || null,
    certificationCompany: text(record.certificationCompany) || null,
    groupedLot,
    priceBasis: source.priceBasis,
    buyerPremiumIncluded: typeof record.buyerPremiumIncluded === 'boolean' ? record.buyerPremiumIncluded : source.priceBasis === 'including_buyers_premium' ? true : null,
    identityMatched: identity.matched,
    matchedTokens: identity.matchedTokens,
    eligibleWhenAuthorized,
    valuationEligible: false,
    activationBlock: source.status === 'deferred'
      ? 'Deferred by owner. This normalized fixture record is not fetched, retained, displayed as market data, or eligible for valuation.'
      : 'Pending written source permission. This normalized fixture record is not fetched, retained, displayed as market data, or eligible for valuation.',
  };
}

/**
 * The only lookup response exposed while permission is pending. It never makes a
 * network call and therefore cannot accidentally collect remote source data.
 */
export function getPermissionPendingLookupStatus(sourceId: PermissionPendingMarketSourceId, input: PermissionPendingLookupInput) {
  const source = getPermissionPendingMarketSource(sourceId);
  const applicable = isPermissionPendingMarketSourceApplicable(sourceId, input.category);
  return {
    sourceId,
    label: source.label,
    status: source.status === 'deferred' ? 'deferred' as const : 'permission_pending' as const,
    applicable,
    sales: [] as NormalizedPendingSale[],
    context: [] as NormalizedPendingSale[],
    message: source.status === 'deferred'
      ? `${source.label} is deferred by owner. Remote lookup and activation are disabled until the owner explicitly reactivates this source.`
      : applicable
      ? `${source.label} is configured as a permission-pending adapter. Remote lookup is disabled until written authorization and a source-specific activation review are recorded.`
      : `${source.label} is not applicable to this item category.`,
    permissionNote: source.permissionNote,
    activationRequirements: [
      'Written authorization or a documented data license from the source.',
      'A source-specific request contract, rate limit, and retention rule.',
      'A bounded read-only health check that does not use login, CAPTCHA, or access-workaround paths.',
      'Confirmation that only dated, explicit completed sales passing Tradebilia identity and evidence gates can influence valuation.',
    ],
  };
}
