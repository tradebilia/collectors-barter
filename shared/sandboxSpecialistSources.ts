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

export type SandboxSpecialistSource = {
  id: SandboxSpecialistSourceId;
  label: string;
  categories: readonly string[];
  sourceUrl: string;
  currencyPolicy: 'usd_explicit' | 'usd_inferred_us_route' | 'usd_symbol_context' | 'currency_unresolved';
  priceBasis: 'hammer' | 'including_buyers_premium' | 'unknown';
  evidenceMode: 'context_only_until_adapter';
  activationNote: string;
};

/**
 * Sources approved for bounded sandbox testing on 2026-09-29.
 *
 * This registry deliberately does not make a source valuation-eligible. A source
 * becomes eligible only after its source-specific parser, completed-sale contract,
 * currency/price-basis policy, identity gates, and signed-observation path pass
 * their own tests.
 */
export const SANDBOX_SPECIALIST_SOURCES: readonly SandboxSpecialistSource[] = [
  { id: 'ngc', label: 'NGC Auction Central', categories: ['coins'], sourceUrl: 'https://www.ngccoin.com/auction-central/us/', currencyPolicy: 'usd_inferred_us_route', priceBasis: 'including_buyers_premium', evidenceMode: 'context_only_until_adapter', activationNote: 'US route and Prices Realized context verified; per-row sold/currency semantics still require adapter tests.' },
  { id: 'cng', label: 'CNG Past Auctions', categories: ['coins'], sourceUrl: 'https://www.cngcoins.com/PastAuction.aspx?AUCTION_ID=238&BACK_URL=%2F', currencyPolicy: 'usd_inferred_us_route', priceBasis: 'hammer', evidenceMode: 'context_only_until_adapter', activationNote: 'Only individually explicit Sold For lots may be retained; auction-level caveats remain.' },
  { id: 'rumsey', label: 'Rumsey Auction Results', categories: ['stamps'], sourceUrl: 'https://www.rumseyauctions.com/auctions', currencyPolicy: 'usd_symbol_context', priceBasis: 'hammer', evidenceMode: 'context_only_until_adapter', activationNote: 'Prices Realized joins must preserve withdrawn/passed/combined exclusions.' },
  { id: 'cherrystone', label: 'Cherrystone Realizations', categories: ['stamps'], sourceUrl: 'https://www.cherrystoneauctions.com/_auction/pr.asp', currencyPolicy: 'usd_symbol_context', priceBasis: 'unknown', evidenceMode: 'context_only_until_adapter', activationNote: 'Price-basis treatment is unresolved; never mix with valuation until explicitly resolved.' },
  { id: 'raritan', label: 'Raritan Past Auctions', categories: ['stamps'], sourceUrl: 'https://www.raritanstamps.com/PastAuc/', currencyPolicy: 'currency_unresolved', priceBasis: 'hammer', evidenceMode: 'context_only_until_adapter', activationNote: 'No canonical per-lot URL and conflicting premium wording require review-only handling.' },
  { id: 'morphy', label: 'Morphy Auctions', categories: ['vintage_toys'], sourceUrl: 'https://morphyauctions.com/auctions/past-auctions/', currencyPolicy: 'usd_symbol_context', priceBasis: 'including_buyers_premium', evidenceMode: 'context_only_until_adapter', activationNote: 'Closed lot and all-in final price fields verified.' },
  { id: 'theriaults', label: "Theriault's Archive", categories: ['vintage_toys'], sourceUrl: 'https://www.theriaults.com/events/archive', currencyPolicy: 'usd_symbol_context', priceBasis: 'unknown', evidenceMode: 'context_only_until_adapter', activationNote: 'Displayed dollar amount and sale state verified; price semantics remain unresolved.' },
  { id: 'poster_auctions', label: 'Poster Auctions International', categories: ['movies'], sourceUrl: 'https://auctions.posterauctions.com/poster-price-guide-usage', currencyPolicy: 'usd_symbol_context', priceBasis: 'including_buyers_premium', evidenceMode: 'context_only_until_adapter', activationNote: 'Completed-poster result fields verified.' },
  { id: 'bonhams', label: 'Bonhams Popular Culture', categories: ['movies'], sourceUrl: 'https://www.bonhams.com/', currencyPolicy: 'usd_symbol_context', priceBasis: 'including_buyers_premium', evidenceMode: 'context_only_until_adapter', activationNote: 'Sold amount and all-in semantics verified on sampled lots.' },
  { id: 'comicconnect', label: 'ComicConnect Sold Archive', categories: ['comics'], sourceUrl: 'https://www.comicconnect.com/browse?filtertype=Sold', currencyPolicy: 'usd_symbol_context', priceBasis: 'unknown', evidenceMode: 'context_only_until_adapter', activationNote: 'Sold For and grade fields verified; premium treatment needs source-specific confirmation.' },
  { id: 'university_archives', label: 'University Archives', categories: ['autographs'], sourceUrl: 'https://www.universityarchives.com/auctions/past-auctions/', currencyPolicy: 'usd_symbol_context', priceBasis: 'unknown', evidenceMode: 'context_only_until_adapter', activationNote: 'Public sold records verified; price semantics remain source-attributed.' },
  { id: 'swann', label: 'Swann Galleries', categories: ['autographs'], sourceUrl: 'https://www.swanngalleries.com/auction-catalog/autographs_7E7HIRSESY', currencyPolicy: 'usd_symbol_context', priceBasis: 'including_buyers_premium', evidenceMode: 'context_only_until_adapter', activationNote: 'Closed-lot and all-in price wording verified.' },
  { id: 'rr_auction', label: 'RR Auction', categories: ['autographs', 'music'], sourceUrl: 'https://www.rrauction.com/auctions/auction-calendar/cron/past', currencyPolicy: 'usd_symbol_context', priceBasis: 'including_buyers_premium', evidenceMode: 'context_only_until_adapter', activationNote: 'Closed-lot, date, price, and authentication context verified.' },
  { id: 'alexander_historical', label: 'Alexander Historical Auctions', categories: ['autographs'], sourceUrl: 'https://www.alexautographs.com/past-auctions/', currencyPolicy: 'usd_symbol_context', priceBasis: 'unknown', evidenceMode: 'context_only_until_adapter', activationNote: 'Historical sold-lot fields verified; basis remains source-attributed.' },
  { id: 'goldin', label: 'Goldin Video Game Auctions', categories: ['video_games'], sourceUrl: 'https://goldin.co/buy/?Category=Video%20Games&show_only=Sold%20Items', currencyPolicy: 'usd_symbol_context', priceBasis: 'unknown', evidenceMode: 'context_only_until_adapter', activationNote: 'Sold state, lot identity, timestamp, price, and Wata grade verified.' },
  { id: 'coin_archives', label: 'CoinArchives', categories: ['coins'], sourceUrl: 'https://www.coinarchives.com/faq.php', currencyPolicy: 'currency_unresolved', priceBasis: 'hammer', evidenceMode: 'context_only_until_adapter', activationNote: 'Owner authorized testing. Public completed-lot access still needs to be verified through an approved route; no valuation use yet.' },
  { id: 'bertoia', label: 'Bertoia Auctions', categories: ['vintage_toys'], sourceUrl: 'https://www.bertoiaauctions.com/toy-auctions/past-auctions/', currencyPolicy: 'currency_unresolved', priceBasis: 'unknown', evidenceMode: 'context_only_until_adapter', activationNote: 'Owner authorized testing. PDF/catalog title-to-lot joins and explicit currency still need to be resolved.' },
  { id: 'heritage', label: 'Heritage Auction Archives', categories: ['comics', 'coins', 'stamps', 'video_games', 'movies', 'music', 'autographs', 'disney_pins', 'vintage_toys'], sourceUrl: 'https://www.ha.com/c/search.zx', currencyPolicy: 'usd_symbol_context', priceBasis: 'including_buyers_premium', evidenceMode: 'context_only_until_adapter', activationNote: 'Owner authorized testing. Access and realized-price visibility must be verified through the permitted route; no login workaround is used.' },
  { id: 'hakes', label: "Hake's Auction Results", categories: ['disney_pins', 'video_games', 'vintage_toys'], sourceUrl: 'https://www.hakes.com/auctionresults.aspx', currencyPolicy: 'usd_symbol_context', priceBasis: 'including_buyers_premium', evidenceMode: 'context_only_until_adapter', activationNote: 'Owner authorized testing. The legacy and current result-page contracts must be reconciled before valuation use.' },
] as const;

export function getSandboxSpecialistSource(id: string): SandboxSpecialistSource | null {
  return SANDBOX_SPECIALIST_SOURCES.find((source) => source.id === id) ?? null;
}

export function isSandboxSpecialistSourceApplicable(id: string, category: string): boolean {
  const source = getSandboxSpecialistSource(id);
  const normalizedCategory = category.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  return Boolean(source?.categories.some((candidate) => candidate.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ') === normalizedCategory));
}
