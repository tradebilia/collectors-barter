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
  | 'hakes'
  | 'weiss'
  | 'stephen_album'
  | 'nate_sanders'
  | 'tcgplayer_reef'
  | 'catawiki_reef'
  | 'auctionet'
  | 'comic_book_realm';

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
  { id: 'goldin', label: 'Goldin Auction Results', categories: ['comics', 'sports_cards', 'vintage_toys', 'video_games', 'stamps', 'coins', 'pokemon', 'movies', 'music', 'autographs', 'disney_pins'], sourceUrl: 'https://goldin.co/buy/?show_only=Sold%20Items', currencyPolicy: 'usd_symbol_context', priceBasis: 'including_buyers_premium', evidenceMode: 'context_only_until_adapter', searchContract: 'automatic_title_search', searchInstruction: 'Tradebilia sends one bounded public title search to Goldin’s sold-lot results service (maximum 12 candidates; no pagination or account access).', activationNote: 'Goldin’s own public browser search sends title, sold-only status, size, and offset to an anonymous results endpoint. Completed_Sold lots are identity-filtered; displayed all-in context is calculated from the returned bid plus buyer premium and remains outside valuation.' },
  { id: 'weiss', label: 'Weiss Auctions', categories: ['comics', 'sports_cards', 'vintage_toys', 'video_games', 'stamps', 'coins', 'pokemon', 'movies', 'music', 'autographs', 'disney_pins'], sourceUrl: 'https://weiss.auction/auctions/completed', currencyPolicy: 'usd_explicit', priceBasis: 'hammer', evidenceMode: 'context_only_until_adapter', searchContract: 'automatic_title_search', searchInstruction: 'Tradebilia sends one bounded public completed-lot title search to Weiss Auctions (maximum 12 candidates; no pagination, login, or account access).', activationNote: 'The public browser-visible NextLot search returns completed auction and lot flags, close time, USD currency, final leading bid in cents, lot/auction IDs, title, and image. The displayed amount is treated as the final hammer bid; buyer premium is not added. Identity-matched records remain context-only.' },
  { id: 'coin_archives', label: 'CoinArchives', categories: ['coins'], sourceUrl: 'https://www.coinarchives.com/faq.php', currencyPolicy: 'currency_unresolved', priceBasis: 'hammer', evidenceMode: 'context_only_until_adapter', searchContract: 'public_contract_unverified', searchInstruction: 'The public search route was verified, but did not return a completed record with a numeric realized price.', activationNote: 'Remote lookup stays off until an ordinary public search proves explicit completed-sale results.' },
  { id: 'bertoia', label: 'Bertoia Auctions', categories: ['vintage_toys'], sourceUrl: 'https://www.bertoiaauctions.com/toy-auctions/past-auctions/', currencyPolicy: 'currency_unresolved', priceBasis: 'unknown', evidenceMode: 'context_only_until_adapter', searchContract: 'price_table_locator_required', searchInstruction: 'A public Prices Realized PDF can be read only with an exact lot locator; it lacks title data for an arbitrary title search.', activationNote: 'No bid-platform or hidden API path is used.' },
  { id: 'hakes', label: "Hake's Auction Results", categories: ['disney_pins', 'video_games', 'vintage_toys'], sourceUrl: 'https://www.hakes.com/auctionresults.aspx', currencyPolicy: 'usd_symbol_context', priceBasis: 'including_buyers_premium', evidenceMode: 'context_only_until_adapter', searchContract: 'public_contract_unverified', searchInstruction: 'The public result shell did not expose an individual completed-sale response contract.', activationNote: 'Remote lookup stays off until a public realized-lot route is verified.' },
  { id: 'stephen_album', label: 'Stephen Album Rare Coins', categories: ['coins'], sourceUrl: 'https://www.sarc.auction/auctionlist.aspx?dv=2', currencyPolicy: 'usd_explicit', priceBasis: 'hammer', evidenceMode: 'context_only_until_adapter', searchContract: 'automatic_title_search', searchInstruction: 'Tradebilia searches a bounded set of Stephen Album completed auction pages for the selected coin title (maximum 12 candidates).', activationNote: 'Completed archive rows and lot pages expose SOLD status, USD hammer, buyer-premium text, stable lot URLs, dates, and public images. Results remain context-only.' },
  { id: 'nate_sanders', label: 'Nate D. Sanders Auctions', categories: ['comics', 'sports cards', 'movies', 'music', 'autographs'], sourceUrl: 'https://natedsanders.com/catalog.aspx', currencyPolicy: 'usd_explicit', priceBasis: 'including_buyers_premium', evidenceMode: 'context_only_until_adapter', searchContract: 'automatic_title_search', searchInstruction: 'Tradebilia sends one bounded public closed-lot title search to Nate D. Sanders (maximum 12 candidates).', activationNote: 'Closed catalog and lot pages expose final prices including buyer premium, ended dates, stable lot IDs, titles, and public images. Pass/non-sale records are excluded; results remain context-only.' },
  { id: 'tcgplayer_reef', label: 'TCGplayer via ReefAPI', categories: ['pokemon'], sourceUrl: 'https://www.tcgplayer.com/', currencyPolicy: 'usd_explicit', priceBasis: 'unknown', evidenceMode: 'context_only_until_adapter', searchContract: 'automatic_title_search', searchInstruction: 'Tradebilia sends one bounded TCGplayer product search and reads recent provider-confirmed sales through ReefAPI (maximum 12 products; five latest sales per product).', activationNote: 'Search identity, product detail, sale timestamp, price, condition, printing, language, and product URL are returned by the authorized read-only ReefAPI. Active listings and guide prices are not treated as completed sales; results remain context-only.' },
  { id: 'catawiki_reef', label: 'Catawiki via ReefAPI', categories: ['comics', 'sports cards', 'vintage toys', 'video_games', 'stamps', 'coins', 'pokemon', 'movies', 'music', 'autographs', 'disney_pins'], sourceUrl: 'https://www.catawiki.com/', currencyPolicy: 'usd_explicit', priceBasis: 'unknown', evidenceMode: 'context_only_until_adapter', searchContract: 'automatic_title_search', searchInstruction: 'Tradebilia sends one bounded Catawiki lot search and checks returned lot details for sold status and a positive USD sold price (maximum 12 lots).', activationNote: 'Open/current bids are retained only as context and never treated as completed sales. Only provider-confirmed sold_price records with explicit USD currency and deterministic identity matching are retained as completed-sale context.' },
  { id: 'auctionet', label: 'Auctionet via ReefAPI', categories: ['comics', 'sports cards', 'vintage toys', 'video_games', 'stamps', 'coins', 'pokemon', 'movies', 'music', 'autographs', 'disney_pins'], sourceUrl: 'https://auctionet.com/en/search?is=ended', currencyPolicy: 'usd_explicit', priceBasis: 'unknown', evidenceMode: 'context_only_until_adapter', searchContract: 'automatic_title_search', searchInstruction: 'Tradebilia sends one bounded ended-auction title search to ReefAPI’s Auctionet endpoint (maximum 12 records).', activationNote: 'ReefAPI provides the approved read-only Auctionet transport. Only explicit sold ended lots with positive USD final_bid values and deterministic identity matches are retained; ReefAPI does not convert currencies and buyer-premium treatment remains unresolved, so results are context-only.' },
  { id: 'comic_book_realm', label: 'Comic Book Realm CGC Analyzer', categories: ['comics'], sourceUrl: 'https://comicbookrealm.com/cgc-analyzer/', currencyPolicy: 'usd_symbol_context', priceBasis: 'unknown', evidenceMode: 'context_only_until_adapter', searchContract: 'public_locator_required', searchInstruction: 'Paste a public Comic Book Realm CGC Analyzer URL for the exact comic issue (for example, /cgc-analyzer/comic/id/535/marvel-comics-x-men-137).', activationNote: 'The public server-rendered CGC table provides grade-specific estimated values, last-sale dates, recorded-sale counts, and aggregate recorded sales. These are guide/market context only—not individual sold comparables and never valuation-eligible.' },
] as const;

export function getSandboxSpecialistSource(id: string): SandboxSpecialistSource | null {
  return SANDBOX_SPECIALIST_SOURCES.find((source) => source.id === id) ?? null;
}

export function isSandboxSpecialistSourceApplicable(id: string, category: string): boolean {
  const source = getSandboxSpecialistSource(id);
  const normalizedCategory = category.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  return Boolean(source?.categories.some((candidate) => candidate.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ') === normalizedCategory));
}
