import type { MarketSale } from './testAiComparableEngine';

/** Mapping policy only. This version is diagnostic, not a new signing domain. */
export const NAMED_SOURCE_MAPPING_POLICY = 'stage6-named-source-mapping-v1' as const;
export type NamedSourceAdapter = 'sold_comps' | 'the_card_api' | 'cardsight_ai' | 'lelands'
  | 'pristine_auction' | 'comicconnect' | 'weiss' | 'goldin';
export type NamedSourceRole = 'signed_item_relevance' | 'original_art_relevance' | 'source_observation';
export type NamedSourceMappingOptions = {
  partition?: 'sales' | 'context';
  role?: NamedSourceRole;
};
export type NamedSourceEconomicsDiagnostic = {
  policy: typeof NAMED_SOURCE_MAPPING_POLICY;
  convention: 'reported_retail_sale' | 'hammer_excluded' | 'bid_side_unresolved'
    | 'active_ask' | 'reported_included_total' | 'premium_unresolved' | 'origin_unresolved';
  finalContextOnly: boolean;
  caveats: string[];
};
export type NamedSourceRelevanceDiagnostic = {
  role: NamedSourceRole;
  disposition: MarketSale['evidenceDisposition'];
  reasons: string[];
  valuationEligible: boolean | null;
  identityMatched: boolean | null;
  exclusionReason: string | null;
};
export type MappedNamedSourceRow<T> = T & MarketSale & {
  sourceEconomics: NamedSourceEconomicsDiagnostic;
  sourceRelevance: NamedSourceRelevanceDiagnostic;
};

type SourceRow = Record<string, any>;
const restrictive = new Set(['warning_review', 'context_only', 'rejected_objective_conflict',
  'omitted_by_cap', 'not_visually_reviewed_window']);
function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function recordId(...values: unknown[]): string | null {
  for (const value of values) {
    const candidate = typeof value === 'number' && Number.isFinite(value) ? String(value) : text(value);
    if (candidate && /[a-z0-9]/i.test(candidate) && !/^(unknown|none|null|undefined|n\/?a)$/i.test(candidate)) return candidate;
  }
  return null;
}
function positiveScalar(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}
function inclusion(value: unknown): NonNullable<MarketSale['buyerPremium']> {
  return value === true ? 'included' : value === false ? 'excluded' : 'unknown';
}
/** Explicit reported exclusions only; hammer_plus_premium is not hammer-only. */
function reportedHammerOrExcluded(row: SourceRow): boolean {
  const basis = text(row.priceBasis)?.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  return text(row.buyerPremium)?.toLowerCase() === 'excluded' || Boolean(basis && (
    /^(?:hammer(?: price| bid)?|winning bid|bid side)(?: only| excluded)?$/.test(basis)
    || /(?:excluding|excludes|without) (?:the )?(?:buyer'?s? )?premium\b/.test(basis)
    || /(?:buyer'?s? )?premium (?:excluded|not included)\b/.test(basis)
  ));
}
function actualRole(row: SourceRow, options?: NamedSourceMappingOptions): NamedSourceRole {
  if (options?.role) return options.role;
  const role = row.metadataRanking?.scorerRole;
  if (role === 'signed_item_relevance' || role === 'original_art_relevance') return role;
  if (String(row.visualRequirement ?? '').includes('autograph')) return 'signed_item_relevance';
  if (String(row.visualRequirement ?? '').includes('original_art')) return 'original_art_relevance';
  return 'source_observation';
}

/**
 * Called only on actual server source rows, AFTER existing review/tail partitions.
 * No retrieval, amount arithmetic, identity decision or final approval is performed.
 * Diagnostic fields are not consumed by the verified economic predicate.
 */
export function mapNamedSourceEconomics<T extends SourceRow>(
  adapterId: NamedSourceAdapter, row: T, options?: NamedSourceMappingOptions,
): MappedNamedSourceRow<T> {
  const role = actualRole(row, options);
  const originalReasons: string[] = Array.isArray(row.evidenceReasons) ? [...row.evidenceReasons] : [];
  const mapped: SourceRow = {
    ...row,
    saleId: recordId(row.saleId, row.lotId, row.id),
    date: row.date ?? row.endedAt ?? null,
    url: row.url ?? row.itemUrl ?? null,
    // Currency and selected price are deliberately untouched: never default USD,
    // convert a currency, select a different amount, or calculate a premium.
    sourceRelevance: {
      role, disposition: row.evidenceDisposition ?? null, reasons: originalReasons,
      valuationEligible: typeof row.valuationEligible === 'boolean' ? row.valuationEligible : null,
      identityMatched: typeof row.identityMatched === 'boolean' ? row.identityMatched : null,
      exclusionReason: text(row.exclusionReason),
    } satisfies NamedSourceRelevanceDiagnostic,
  };
  let convention: NamedSourceEconomicsDiagnostic['convention'] = 'premium_unresolved';
  const caveats: string[] = [];
  // No named mapping path is an approval issuer. Retain image verdict/audit and
  // raw provider metadata, but never advertise a copied final approval payload.
  delete mapped.identityApproval;
  let hold = options?.partition === 'context' || restrictive.has(row.evidenceDisposition)
    || row.valuationEligible === false || Boolean(text(row.exclusionReason));
  const observedCompleted = row.completed === true;
  switch (adapterId) {
    case 'sold_comps':
      // Scope is ONLY the existing special completed-endpoint early returns.
      mapped.originMarketplace = 'ebay';
      mapped.saleStatus = 'completed';
      mapped.completedStatusBasis = 'Sold-Comps completed-sale endpoint';
      mapped.priceBasis = 'sold';
      convention = 'reported_retail_sale';
      hold = true;
      caveats.push(role === 'original_art_relevance'
        ? 'Original Art is broad context; never a primary comparable.'
        : 'Signed-item source relevance is context, not exact image identity or primary pricing.');
      break;
    case 'the_card_api': {
      const origin = text(row.platform) ?? text(row.originMarketplace) ?? text(row.marketplace);
      mapped.originMarketplace = origin ?? 'unknown_marketplace';
      mapped.saleStatus = row.confirmed === true ? 'completed' : 'unknown';
      mapped.completedStatusBasis = row.confirmed === true ? 'The Card API provider-confirmed final sale' : null;
      if (origin?.toLowerCase() === 'goldin') {
        mapped.originMarketplace = 'goldin';
        mapped.priceBasis = 'realized'; mapped.buyerPremium = 'excluded';
        convention = 'hammer_excluded'; hold = true;
        caveats.push('The Card API Goldin amount is hammer only; buyer premium excluded.');
      } else if (origin?.toLowerCase() === 'ebay') {
        mapped.originMarketplace = 'ebay';
        mapped.priceBasis = 'sold'; mapped.buyerPremium = 'included';
        convention = 'reported_retail_sale';
      } else {
        mapped.priceBasis = 'unknown'; mapped.buyerPremium = 'unknown';
        convention = 'origin_unresolved'; hold = true;
        caveats.push('The Card API origin economics are unresolved; retained as context.');
      }
      if (row.confirmed !== true) hold = true;
      break;
    }
    case 'cardsight_ai':
      mapped.saleStatus = observedCompleted ? 'completed' : row.saleStatus === 'active' ? 'active' : 'unknown';
      mapped.completedStatusBasis = observedCompleted ? 'Cardsight.ai completed auction record (bid side)' : null;
      mapped.priceBasis = observedCompleted ? 'realized' : 'unknown';
      mapped.buyerPremium = 'unknown';
      convention = observedCompleted ? 'bid_side_unresolved' : 'active_ask'; hold = true;
      caveats.push(observedCompleted ? 'Cardsight auction amount is bid side; premium unresolved.' : 'Cardsight fixed/BIN ask is not a completed sale.');
      break;
    case 'lelands':
      mapped.saleStatus = observedCompleted ? 'completed' : row.saleStatus ?? 'unknown';
      mapped.completedStatusBasis = observedCompleted ? 'Lelands realized-auction archive' : null;
      mapped.priceBasis = 'realized'; mapped.buyerPremium = inclusion(row.buyersPremiumIncluded);
      convention = mapped.buyerPremium === 'included' ? 'reported_included_total' : 'premium_unresolved';
      if (mapped.buyerPremium !== 'included') { hold = true; caveats.push('Lelands actual inclusion flag does not confirm buyer premium included.'); }
      if (reportedHammerOrExcluded(row)) {
        mapped.buyerPremium = 'excluded'; convention = 'hammer_excluded'; hold = true;
        caveats.push('Lelands reported hammer/excluded basis cannot be overwritten by an inclusion flag; selected amount retained as context.');
      }
      break;
    case 'pristine_auction': {
      const total = positiveScalar(row.totalPrice), selected = positiveScalar(row.price);
      const selectedPositiveTotal = total !== null && selected !== null && total === selected;
      const winningBid = positiveScalar(row.winningBid), reportedPremium = positiveScalar(row.buyerPremium);
      // Equality selects the reported total, but cannot erase known hammer facts.
      // Missing/unknown optional bid or premium is not a contradiction. No fee math.
      const selectedHammer = selected !== null && winningBid === selected && reportedPremium !== null;
      const reportedExcluded = reportedHammerOrExcluded(row) || selectedHammer;
      mapped.saleStatus = observedCompleted ? 'completed' : row.saleStatus ?? 'unknown';
      mapped.completedStatusBasis = observedCompleted ? 'Pristine Auction realized-auction archive' : null;
      mapped.priceBasis = 'realized'; mapped.buyerPremium = reportedExcluded ? 'excluded' : selectedPositiveTotal ? 'included' : 'unknown';
      convention = reportedExcluded ? 'hammer_excluded' : selectedPositiveTotal ? 'reported_included_total' : 'premium_unresolved';
      if (!selectedPositiveTotal) { hold = true; caveats.push('Pristine selected amount is not a valid positive actual total including premium.'); }
      if (reportedExcluded) {
        hold = true;
        caveats.push('Pristine reported hammer/excluded basis or selected winning bid with a positive reported premium contradicts included-total use; selected amount retained as context.');
      }
      break;
    }
    case 'comicconnect':
      mapped.saleStatus = observedCompleted ? 'completed' : row.saleStatus ?? 'unknown';
      mapped.completedStatusBasis = 'ComicConnect sold archive record with explicit sold amount and date';
      mapped.priceBasis = row.priceBasis ?? 'unknown'; mapped.buyerPremium = inclusion(row.buyerPremiumIncluded);
      convention = 'reported_retail_sale';
      if (row.identityMatched === false) hold = true;
      if (row.completed === false) { mapped.saleStatus = 'unknown'; hold = true; }
      caveats.push('ComicConnect dates retain final 365-day / conditional 730-day policy; no 36-month current authorization.');
      break;
    case 'weiss':
    case 'goldin':
      mapped.originMarketplace = adapterId;
      mapped.saleStatus = observedCompleted ? 'completed' : row.saleStatus ?? 'unknown';
      mapped.completedStatusBasis = adapterId === 'weiss'
        ? 'Weiss completed-webcast final leading bid' : 'Goldin Lot Sold record';
      mapped.priceBasis = row.priceBasis ?? 'unknown';
      mapped.buyerPremium = inclusion(row.buyerPremiumIncluded);
      convention = adapterId === 'weiss' && mapped.buyerPremium === 'excluded'
        ? 'hammer_excluded' : mapped.buyerPremium === 'included' ? 'reported_included_total' : 'premium_unresolved';
      hold = true;
      caveats.push(adapterId === 'weiss' ? 'Weiss final hammer remains context; no premium added.'
        : 'Goldin source proof is context only; no approved final identity issuer migration.');
      break;
  }
  if (role !== 'source_observation') hold = true;
  if (adapterId !== 'sold_comps' && adapterId !== 'the_card_api' && row.completed === false) {
    hold = true;
    if (adapterId !== 'cardsight_ai') mapped.saleStatus = row.saleStatus === 'active' ? 'active' : 'unknown';
  }
  // Generic source signatures never supply required final image approval.
  if (row.visualRequirement === 'required') {
    hold = true;
    caveats.push('Required final image approval is not issued by this source mapping.');
  }
  if (hold) {
    mapped.evidenceDisposition = restrictive.has(row.evidenceDisposition) ? row.evidenceDisposition : 'context_only';
    mapped.valuationEligible = false;
    mapped.evidenceReasons = [...originalReasons, ...(text(row.exclusionReason) ? [text(row.exclusionReason)!] : []), ...caveats];
  }
  mapped.sourceEconomics = { policy: NAMED_SOURCE_MAPPING_POLICY, convention, finalContextOnly: hold, caveats } satisfies NamedSourceEconomicsDiagnostic;
  return mapped as MappedNamedSourceRow<T>;
}

/** Map both actual final review partitions once; never infer use from array name. */
export function mapNamedSourcePartitions<T extends SourceRow>(
  adapterId: NamedSourceAdapter, reviewed: { listings: T[]; contextListings?: T[] }, options?: Omit<NamedSourceMappingOptions, 'partition'>,
): { sales: MappedNamedSourceRow<T>[]; context: MappedNamedSourceRow<T>[] } {
  return {
    sales: reviewed.listings.map((row) => mapNamedSourceEconomics(adapterId, row, { ...options, partition: 'sales' })),
    context: (reviewed.contextListings ?? []).map((row) => mapNamedSourceEconomics(adapterId, row, { ...options, partition: 'context' })),
  };
}
