export type SandboxSpecialistSourceId =
  | 'ngc'
  | 'cng'
  | 'rumsey'
  | 'cherrystone'
  | 'raritan'
  | 'morphy'
  | 'theriaults'
  | 'poster_auctions'
  | 'bonhams'
  | 'comicconnect'
  | 'university_archives'
  | 'swann'
  | 'rr_auction'
  | 'alexander_historical'
  | 'goldin'
  | 'coin_archives'
  | 'bertoia'
  | 'heritage'
  | 'hakes';

export type SpecialistSourceSearchContract =
  | 'automatic_title_search'
  | 'public_locator_required'
  | 'price_table_locator_required'
  | 'public_contract_unverified';

export type SandboxSpecialistSource = {
  id: SandboxSpecialistSourceId;
  label: string;
  categories: readonly string[];
  sourceUrl: string;
  currencyPolicy: 'usd_explicit' | 'usd_inferred_us_route' | 'usd_symbol_context' | 'currency_unresolved';
  priceBasis: 'hammer' | 'including_buyers_premium' | 'unknown';
  evidenceMode: 'context_only_until_adapter';
  /** The only public, bounded search/retrieval behavior that source testing verified. */
  searchContract: SpecialistSourceSearchContract;
  /** Plain-language reason shown in the Test AI sandbox. */
  searchInstruction: string;
  activationNote: string;
};

/**
 * Sources approved for bounded sandbox testing on 2026-09-29.
 *
 * Registration does not make a source valuation-eligible. A source becomes
 * eligible only after its source-specific parser, completed-sale contract,
 * currency/price-basis policy, identity gates, and signed-admission tests pass.
 */
export const SANDBOX_SPECIALIST_SOURCES: readonly SandboxSpecialistSource[] = [
  { id: 'ngc', label: 'NGC Auction Central', categories: ['coins'], sourceUrl: 'https://www.ngccoin.com/auction-central/us/', currencyPolicy: 'usd_inferred_us_route', priceBasis: 'including_buyers_premium', evidenceMode: 'context_only_until_adapter', searchContract: 'public_locator_required', searchInstruction: 'Paste a public NGC Auction Central coin-result URL (the verified route includes the NGC Universal ID).', activationNote: 'One bounded public result page is parsed; no generic keyword endpoint was verified.' },
  { id: 'cng', label: 'CNG Past Auctions', categories: ['coins'], sourceUrl: 'https://www.cngcoins.com/PastAuction.aspx?AUCTION_ID=238&BACK_URL=%2F', currencyPolicy: 'usd_inferred_us_route', priceBasis: 'hammer', evidenceMode: 'context_only_until_adapter', searchContract: 'public_locator_required', searchInstruction: 'Paste a public CNG PastAuction or Lot URL. Only explicit realized lots are retained.', activationNote: 'Auction/lot routes are public; no invented free-text query is used.' },
  { id: 'rumsey', label: 'Rumsey Auction Results', categories: ['stamps'], sourceUrl: 'https://www.rumseyauctions.com/auctions', currencyPolicy: 'usd_symbol_context', priceBasis: 'hammer', evidenceMode: 'context_only_until_adapter', searchContract: 'public_locator_required', searchInstruction: 'Paste a public Rumsey completed lot or allowlisted sale-results URL.', activationNote: 'Completed lot pages expose description, estimates, and realized price.' },
  { id: 'cherrystone', label: 'Cherrystone Realizations', categories: ['stamps'], sourceUrl: 'https://www.cherrystoneauctions.com/_auction/pr.asp', currencyPolicy: 'usd_symbol_context', priceBasis: 'unknown', evidenceMode: 'context_only_until_adapter', searchContract: 'public_locator_required', searchInstruction: 'Paste a public Cherrystone realization or lot URL with a known auction ID.', activationNote: 'Public realization and lot pages are bounded; price basis remains source-attributed.' },
  { id: 'raritan', label: 'Raritan Past Auctions', categories: ['stamps'], sourceUrl: 'https://www.raritanstamps.com/PastAuc/', currencyPolicy: 'currency_unresolved', priceBasis: 'hammer', evidenceMode: 'context_only_until_adapter', searchContract: 'price_table_locator_required', searchInstruction: 'A public PR{auction}.php result table can be read only with an exact lot locator; it does not contain enough title data for a general title search.', activationNote: 'No canonical per-lot route was verified, so title-only search remains unavailable.' },
  { id: 'morphy', label: 'Morphy Auctions', categories: ['vintage_toys'], sourceUrl: 'https://morphyauctions.com/auctions/past-auctions/', currencyPolicy: 'usd_symbol_context', priceBasis: 'including_buyers_premium', evidenceMode: 'context_only_until_adapter', searchContract: 'public_locator_required', searchInstruction: 'Paste a public closed Morphy LOT page or a public past-catalog page.', activationNote: 'Closed lot and all-in final price fields are parsed without submitting the visible search form.' },
  { id: 'theriaults', label: "Theriault's Archive", categories: ['vintage_toys'], sourceUrl: 'https://www.theriaults.com/events/archive', currencyPolicy: 'usd_symbol_context', priceBasis: 'unknown', evidenceMode: 'context_only_until_adapter', searchContract: 'public_locator_required', searchInstruction: 'Paste a public archived event or individual listing URL.', activationNote: 'Only visible Sold records with a price are retained; Passed records remain context.' },
  { id: 'poster_auctions', label: 'Poster Auctions International', categories: ['movies'], sourceUrl: 'https://auctions.posterauctions.com/poster-price-guide-usage', currencyPolicy: 'usd_symbol_context', priceBasis: 'including_buyers_premium', evidenceMode: 'context_only_until_adapter', searchContract: 'public_contract_unverified', searchInstruction: 'The public guide describes search fields, but no stable server-search result transport was verified.', activationNote: 'Remote lookup stays off until a public result contract is verified without browser workarounds.' },
  { id: 'bonhams', label: 'Bonhams Popular Culture', categories: ['movies'], sourceUrl: 'https://www.bonhams.com/', currencyPolicy: 'usd_symbol_context', priceBasis: 'including_buyers_premium', evidenceMode: 'context_only_until_adapter', searchContract: 'public_locator_required', searchInstruction: 'Paste a public ended Bonhams auction or individual lot URL.', activationNote: 'Only Ended/Sold rows with a concrete price are retained.' },
  { id: 'comicconnect', label: 'ComicConnect Sold Archive', categories: ['comics'], sourceUrl: 'https://www.comicconnect.com/browse?filtertype=Sold', currencyPolicy: 'usd_symbol_context', priceBasis: 'unknown', evidenceMode: 'context_only_until_adapter', searchContract: 'automatic_title_search', searchInstruction: 'ComicConnect uses its dedicated bounded query ladder.', activationNote: 'Sold/grade fields are parsed by the dedicated ComicConnect adapter; premium treatment remains context-only.' },
  { id: 'university_archives', label: 'University Archives', categories: ['autographs'], sourceUrl: 'https://www.universityarchives.com/auctions/past-auctions/', currencyPolicy: 'usd_symbol_context', priceBasis: 'unknown', evidenceMode: 'context_only_until_adapter', searchContract: 'public_locator_required', searchInstruction: 'Paste a public closed University Archives catalog or individual lot URL.', activationNote: 'The adapter reads only the supplied catalog/lot page with a strict record cap.' },
  { id: 'swann', label: 'Swann Galleries', categories: ['autographs'], sourceUrl: 'https://www.swanngalleries.com/auction-catalog/autographs_7E7HIRSESY', currencyPolicy: 'usd_symbol_context', priceBasis: 'including_buyers_premium', evidenceMode: 'context_only_until_adapter', searchContract: 'public_contract_unverified', searchInstruction: 'Server-style public GET returned HTTP 403 during verification.', activationNote: 'Remote lookup stays off; no bot-protection workaround is permitted.' },
  { id: 'rr_auction', label: 'RR Auction', categories: ['autographs', 'music'], sourceUrl: 'https://www.rrauction.com/auctions/auction-calendar/cron/past', currencyPolicy: 'usd_symbol_context', priceBasis: 'including_buyers_premium', evidenceMode: 'context_only_until_adapter', searchContract: 'public_contract_unverified', searchInstruction: 'A past calendar is public, but no completed-sale lot contract with a concrete realized price was verified.', activationNote: 'Remote lookup stays off until a normal public closed-lot route is confirmed.' },
  { id: 'alexander_historical', label: 'Alexander Historical Auctions', categories: ['autographs'], sourceUrl: 'https://www.alexautographs.com/past-auctions/', currencyPolicy: 'usd_symbol_context', priceBasis: 'unknown', evidenceMode: 'context_only_until_adapter', searchContract: 'public_locator_required', searchInstruction: 'Paste a public closed Alexander catalog or individual lot URL.', activationNote: 'The adapter reads only the supplied catalog/lot page with a strict record cap.' },
  { id: 'goldin', label: 'Goldin Auction Results', categories: ['comics', 'sports_cards', 'vintage_toys', 'video_games', 'stamps', 'coins', 'pokemon', 'movies', 'music', 'autographs', 'disney_pins'], sourceUrl: 'https://goldin.co/buy/?show_only=Sold%20Items', currencyPolicy: 'usd_symbol_context', priceBasis: 'including_buyers_premium', evidenceMode: 'context_only_until_adapter', searchContract: 'automatic_title_search', searchInstruction: 'Tradebilia sends one bounded public title search to Goldin’s sold-lot results service (maximum 12 candidates; no pagination or account access).', activationNote: 'Goldin’s own public browser search sends title, sold-only status, size, and offset to an anonymous results endpoint. Completed_Sold lots are identity-filtered; displayed all-in context is calculated from the returned bid plus buyer premium and remains outside valuation.' },
  { id: 'coin_archives', label: 'CoinArchives', categories: ['coins'], sourceUrl: 'https://www.coinarchives.com/faq.php', currencyPolicy: 'currency_unresolved', priceBasis: 'hammer', evidenceMode: 'context_only_until_adapter', searchContract: 'public_contract_unverified', searchInstruction: 'The public search route was verified, but did not return a completed record with a numeric realized price.', activationNote: 'Remote lookup stays off until an ordinary public search proves explicit completed-sale results.' },
  { id: 'bertoia', label: 'Bertoia Auctions', categories: ['vintage_toys'], sourceUrl: 'https://www.bertoiaauctions.com/toy-auctions/past-auctions/', currencyPolicy: 'currency_unresolved', priceBasis: 'unknown', evidenceMode: 'context_only_until_adapter', searchContract: 'price_table_locator_required', searchInstruction: 'A public Prices Realized PDF can be read only with an exact lot locator; it lacks title data for an arbitrary title search.', activationNote: 'No bid-platform or hidden API path is used.' },
  { id: 'heritage', label: 'Heritage Auction Archives', categories: ['comics', 'coins', 'stamps', 'video_games', 'movies', 'music', 'autographs', 'disney_pins', 'vintage_toys'], sourceUrl: 'https://www.ha.com/c/search.zx', currencyPolicy: 'usd_symbol_context', priceBasis: 'including_buyers_premium', evidenceMode: 'context_only_until_adapter', searchContract: 'public_contract_unverified', searchInstruction: 'Archive-shaped public requests returned active/live listings, not verified completed-sale records.', activationNote: 'Remote lookup stays off until a normal public individual realized-sale route is verified.' },
  { id: 'hakes', label: "Hake's Auction Results", categories: ['disney_pins', 'video_games', 'vintage_toys'], sourceUrl: 'https://www.hakes.com/auctionresults.aspx', currencyPolicy: 'usd_symbol_context', priceBasis: 'including_buyers_premium', evidenceMode: 'context_only_until_adapter', searchContract: 'public_contract_unverified', searchInstruction: 'The public result shell did not expose an individual completed-sale response contract.', activationNote: 'Remote lookup stays off until a public realized-lot route is verified.' },
] as const;

export function getSandboxSpecialistSource(id: string): SandboxSpecialistSource | null {
  return SANDBOX_SPECIALIST_SOURCES.find((source) => source.id === id) ?? null;
}

export function isSandboxSpecialistSourceApplicable(id: string, category: string): boolean {
  const source = getSandboxSpecialistSource(id);
  const normalizedCategory = category.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  return Boolean(source?.categories.some((candidate) => candidate.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ') === normalizedCategory));
}
