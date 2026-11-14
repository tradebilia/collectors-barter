import type { ComparableTarget, MarketSale } from './testAiComparableEngine';
import { isCollectionLotItemType } from '../shared/testAiItemType';
import { meaningfulMetadataText } from '../shared/testAiMetadataValues';

function key(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') : '';
}

/** A provider record reference, never a display occurrence or price fingerprint. */
function recordId(value: unknown, facts?: Pick<MarketSale, 'title' | 'price'>): string | null {
  // Inspect original scalar types at the source boundary, before the legacy
  // signer's String(value) coercion. Positive safe integer provider IDs retain
  // their established scalar meaning; objects, arrays and booleans never do.
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
  if (typeof value !== 'string') return null;
  const text = meaningfulMetadataText(value);
  if (/^server-row:[a-f0-9]{32}$/i.test(text)) return text.toLowerCase();
  if (!text || !/[a-z0-9]/i.test(text)
    || /^(?:true|false|0|nan|infinity)$/i.test(text)
    || /^(?:[\[{"']|(?:final|source|request|display|occurrence|occ|probable|possible):|fingerprint[:_-])/i.test(text)
    || /(?:^|:)occ(?:urrence)?[:_-]/i.test(text)
    || /,/.test(text)
    || /^\d+\.\d+$/.test(text)
    || (/\s/.test(text) && /[|;]|[:_]\s*\$?\d+(?:\.\d+)?$/.test(text))
    // URLs in saleId (including the ordinary route's URL fallback) are not an
    // independent provider ID. Only the actual URL channel can prove a listing.
    || /^(?:[a-z][a-z\d+.-]*:\/\/|https?:|ftp:|file:|javascript:|data:|mailto:|\/\/|www\.)/i.test(text)
    || /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#]|$)/i.test(text)
    // A dated display/price fingerprint is not an observed transaction ID.
    // Do not reject opaque delimiters in genuine IDs, e.g. eBay v1|item|0.
    || /(?:^|[|;:_\s])\d{4}[-/]\d{2}[-/]\d{2}(?:T|[|;:_\s]|$)/i.test(text)) return null;
  const titleKey = key(facts?.title);
  const textKey = key(text);
  if (titleKey && (textKey === titleKey || textKey.startsWith(`${titleKey}_`) && /\d/.test(textKey.slice(titleKey.length)))) return null;
  return text;
}

/** Validate visible URL facts; legacy canonical URLs cannot reveal lost schemes. */
function listingUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim() || /\s/.test(value)) return null;
  const text = value.trim();
  if (/\\/.test(text) || text.startsWith('//') || /^https?:\/{3,}/i.test(text)) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(text) && !/^https?:\/\//i.test(text)) return null;
  try {
    const parsed = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password
      || !/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(parsed.hostname)) return null;
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    parsed.hash = '';
    parsed.pathname = parsed.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
    if (parsed.pathname === '/' || /^\/(?:sch|search|browse|category|categories)(?:\/|$)/i.test(parsed.pathname)) return null;
    if (/^ebay\.[a-z.]+$/i.test(parsed.hostname) && !/^\/itm\/(?:[^/?]+\/)?\d+$/i.test(parsed.pathname)) return null;
    if (/^ebay\.[a-z.]+$/i.test(parsed.hostname)) {
      // Local identity only: slug/no-slug/query mirrors identify the embedded
      // item, not separate sales. Origin and known sale day remain in urlKey.
      const itemId = parsed.pathname.match(/\/(\d+)$/)![1];
      return `${parsed.hostname}/itm/${itemId}`;
    }
    for (const name of [...parsed.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|mkcid$|mkrid$|campid$|tooldomain$|customid$|hash$)/i.test(name)) parsed.searchParams.delete(name);
    }
    parsed.searchParams.sort();
    const query = parsed.searchParams.toString();
    return `${parsed.hostname}${parsed.pathname}${query ? `?${query}` : ''}`;
  } catch {
    return null;
  }
}

/**
 * Source wrapper check BEFORE the existing lossy canonical signer. This does
 * not change its payload domain/algorithm or create approval authority. Invalid
 * facts are removed only from the signed identity channels; callers may retain
 * the original row for display. A genuine ID survives an unrelated invalid URL.
 */
export function prepareSourceTransactionIdentity<T extends MarketSale>(sale: T): T {
  const providerRecordId = recordId(sale.saleId, sale);
  const usableUrl = listingUrl(sale.url);
  const missingIdentity = !providerRecordId && !usableUrl;
  const alreadyRestrictive = sale.evidenceDisposition && sale.evidenceDisposition !== 'valuation_eligible';
  const safeSaleId = providerRecordId ?? null;
  const safeUrl = usableUrl ? sale.url : null;
  if (!missingIdentity && safeSaleId === sale.saleId && safeUrl === sale.url) return sale;
  return { ...sale, saleId: safeSaleId, url: safeUrl,
    ...(missingIdentity ? {
      evidenceDisposition: alreadyRestrictive ? sale.evidenceDisposition : 'context_only' as const,
      evidenceReasons: [...(sale.evidenceReasons ?? []),
        'TRANSACTION_IDENTITY_MISSING: original source facts have neither a meaningful provider record ID nor a usable HTTP(S) listing URL; sealed restrictively before URL canonicalization.'],
    } : {}),
  };
}

export type TransactionIdentity = {
  providerRecordId: string | null;
  listingUrl: string | null;
  origin: string;
  adapter: string;
  date: string | null;
  recordKey: string | null;
  urlKey: string | null;
};

/** Local dedup keys only. Never replaces or changes a canonical HMAC-v1 ID. */
export function transactionIdentity(sale: MarketSale): TransactionIdentity {
  const providerRecordId = recordId(sale.saleId, sale);
  const url = listingUrl(sale.url);
  const origin = key(sale.originMarketplace || sale.marketplace) || key(sale.sourceAdapter || sale.sourceId) || 'unattributed';
  const adapter = key(sale.sourceAdapter || sale.sourceId) || 'unattributed';
  const timestamp = typeof sale.date === 'string' ? Date.parse(sale.date) : NaN;
  const date = Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : null;
  // Listing/record references can be reused in a relisting. Different known
  // sale dates are not proven identical events; retain them with a warning.
  return { providerRecordId, listingUrl: url, origin, adapter, date,
    recordKey: providerRecordId && date ? `record:${adapter}:${origin}:${encodeURIComponent(providerRecordId)}:${date}` : null,
    urlKey: url && date ? `listing:${origin}:${url}:${date}` : null };
}

export function hasMeaningfulTransactionIdentity(sale: MarketSale): boolean {
  const identity = transactionIdentity(sale);
  return Boolean(identity.providerRecordId || identity.listingUrl);
}

/** Only signed transaction fields: never stock, generic quantity or title counts. */
export function signedTransactionLotConflict(target: Pick<ComparableTarget, 'itemType'> | undefined, sale: Pick<MarketSale, 'lotQuantity' | 'saleForm'>): boolean {
  if (isCollectionLotItemType(target?.itemType)) return true;
  if (typeof sale.lotQuantity === 'number' && Number.isInteger(sale.lotQuantity) && sale.lotQuantity > 1) return true;
  const form = meaningfulMetadataText(sale.saleForm).toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  // An auction's "lot" noun alone identifies an archive record, not item count.
  // Product collection/series/set names and factory box-set contents are not lots.
  return /^(?:bundle|collection lot|multi ?pack|pair|multi ?item(?: lot| bundle| transaction)?|mixed lot|mixed bundle|assortment|components? only)$/.test(form)
    || /\b(?:transaction|sale) (?:lot|bundle)\b/.test(form)
    || /\b(?:group|lot|bundle|collection) of (?:[2-9]|[1-9]\d+)\b/.test(form);
}

export type AdapterEconomicPolicy = {
  eligible: boolean;
  blocker: 'PREMIUM_NOT_INCLUDED' | 'AUCTION_AMOUNT_UNRESOLVED' | null;
  warning: 'PCGS_PREMIUM_AS_REPORTED' | null;
  reason: string | null;
};

/** Price convention from verified adapter + origin, never a wrapper sold label. */
export function evaluateAdapterEconomicPolicy(sale: Pick<MarketSale, 'sourceAdapter' | 'sourceId' | 'originMarketplace' | 'marketplace' | 'priceBasis' | 'buyerPremium' | 'recency'>): AdapterEconomicPolicy {
  const adapter = key(sale.sourceAdapter || sale.sourceId);
  const origin = key(sale.originMarketplace || sale.marketplace);
  const allow = (): AdapterEconomicPolicy => ({ eligible: true, blocker: null, warning: null, reason: null });
  const hold = (blocker: NonNullable<AdapterEconomicPolicy['blocker']>, reason: string): AdapterEconomicPolicy => ({ eligible: false, blocker, warning: null, reason });
  if (adapter === 'pcgs_auction_results' && sale.priceBasis === 'realized'
    && ['recent', 'extended', 'historical'].includes(sale.recency ?? '')) {
    return { eligible: true, blocker: null,
      warning: sale.buyerPremium === 'included' ? null : 'PCGS_PREMIUM_AS_REPORTED',
      reason: sale.buyerPremium === 'included' ? null : 'PCGS reports this auction amount as realized; buyer-premium treatment is not disclosed and the amount is used as reported. Older sales are historical context, not current value.' };
  }
  if (adapter === 'cardsight_ai') return hold('AUCTION_AMOUNT_UNRESOLVED', 'Cardsight bid-side or ask-side amount is not an established completed buyer total; retained as context only');
  if (adapter === 'weiss' || adapter === 'collect_auction' || adapter === 'the_card_api' && origin === 'goldin') {
    return hold('AUCTION_AMOUNT_UNRESOLVED', 'selected adapter/origin reports hammer or unresolved auction amount; no buyer premium is invented and the amount remains context only');
  }
  if (adapter === 'the_card_api') {
    return origin === 'ebay' && sale.priceBasis === 'sold' ? allow()
      : hold('AUCTION_AMOUNT_UNRESOLVED', 'The Card API origin has no established retail final-price convention; retained as context only');
  }
  // Preserve the named reported retail conventions. This does not imply that
  // shipping/tax are included, and never adds or converts an amount.
  if (sale.priceBasis === 'sold' && ((adapter === 'sold_comps' || adapter === '130point' || adapter === 'pcgs_auction_results') && origin === 'ebay'
    || adapter === 'mercari_sold_comps' && origin === 'mercari'
    || adapter === 'comicconnect' && origin === 'comicconnect'
    || adapter === 'tcgplayer_reef' && origin === 'tcgplayer')) return allow();
  // Every other auction-origin amount requires the selected amount's explicit
  // inclusion fact even when its completion basis was labeled sold or closed.
  return sale.buyerPremium === 'included' ? allow()
    : hold('PREMIUM_NOT_INCLUDED', 'auction buyer premium is not confirmed included in the selected reported price; retained as context only');
}
