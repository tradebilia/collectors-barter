export type PermissionPendingMarketSourceId =
  | 'ngc'
  | 'coin_archives'
  | 'cng'
  | 'greatcollections'
  | 'rumsey'
  | 'cherrystone'
  | 'raritan'
  | 'omega_auctions'
  | 'bertoia'
  | 'morphy'
  | 'theriaults'
  | 'propstore'
  | 'poster_auctions'
  | 'bonhams'
  | 'comicconnect'
  | 'heritage'
  | 'university_archives'
  | 'swann'
  | 'rr_auction'
  | 'alexander_historical'
  | 'goldin'
  | 'hakes';

export type PermissionPendingMarketSource = {
  id: PermissionPendingMarketSourceId;
  label: string;
  categories: readonly string[];
  sourceUrl: string;
  purpose: string;
  priceBasis: 'hammer' | 'including_buyers_premium' | 'unknown';
  status: 'pending_permission';
  liveTestStatus: 'verified' | 'partial' | 'no_completed_item';
  liveTestSummary: string;
  permissionNote: string;
};

/**
 * Specialist sources discovered during the market-data audit.
 * These are intentionally not network-enabled. A source needs written permission,
 * a documented request contract, and a bounded activation review before remote
 * collection can be introduced.
 */
export const PERMISSION_PENDING_MARKET_SOURCES: readonly PermissionPendingMarketSource[] = [
  {
    id: 'ngc',
    label: 'NGC Auction Central',
    categories: ['coins'],
    sourceUrl: 'https://www.ngccoin.com/auction-central/us/',
    purpose: 'Certified U.S. coin auction records with lot, date, grade, and price context.',
    priceBasis: 'unknown',
    status: 'pending_permission',
    liveTestStatus: 'verified',
    liveTestSummary: 'Public Prices Realized item returned identity, date, price, grade, and stated price basis.',
    permissionNote: 'Awaiting written permission for any automated or retained auction-record use.',
  },
  {
    id: 'coin_archives',
    label: 'CoinArchives',
    categories: ['coins'],
    sourceUrl: 'https://www.coinarchives.com/faq.php',
    purpose: 'Ancient and world-coin auction catalog and hammer-price context.',
    priceBasis: 'hammer',
    status: 'pending_permission',
    liveTestStatus: 'no_completed_item',
    liveTestSummary: 'Tested public record resolved to a future third-party schedule, not a stable completed lot.',
    permissionNote: 'Awaiting written permission for automated lookup or record retention.',
  },
  {
    id: 'cng',
    label: 'CNG Past Auctions',
    categories: ['coins'],
    sourceUrl: 'https://www.cngcoins.com/PastAuction.aspx?AUCTION_ID=238&BACK_URL=%2F',
    purpose: 'Ancient and world-coin primary auction records.',
    priceBasis: 'unknown',
    status: 'pending_permission',
    liveTestStatus: 'verified',
    liveTestSummary: 'Public Past Auction lot returned explicit Sold For status, identifiers, date, USD price, grade, and buyer-fee wording.',
    permissionNote: 'Awaiting a commercial data-use agreement before any remote retrieval.',
  },
  {
    id: 'greatcollections',
    label: 'GreatCollections Archive',
    categories: ['coins'],
    sourceUrl: 'https://www.greatcollections.com/Auction-Archive/top',
    purpose: 'Certified-coin auction archive research.',
    priceBasis: 'unknown',
    status: 'pending_permission',
    liveTestStatus: 'verified',
    liveTestSummary: 'Public archive card returned a sold amount; item page returned GC ID, ended time, grade, certification, and fee wording.',
    permissionNote: 'No remote lookup is permitted here until written authorization is received; do not use login, CAPTCHA, or access-workaround paths.',
  },
  {
    id: 'rumsey',
    label: 'Rumsey Auction Results',
    categories: ['stamps'],
    sourceUrl: 'https://www.rumseyauctions.com/auctions',
    purpose: 'Philatelic lots with catalog numbers, condition, certificates, sale IDs, and realized amounts.',
    priceBasis: 'hammer',
    status: 'pending_permission',
    liveTestStatus: 'partial',
    liveTestSummary: 'Prices Realized page returned sale status, lot ID, date, USD amount, and premium exclusion, but not individual title or stable lot URL.',
    permissionNote: 'Awaiting written permission for automated collection and retained auction data.',
  },
  {
    id: 'cherrystone',
    label: 'Cherrystone Realizations',
    categories: ['stamps'],
    sourceUrl: 'https://www.cherrystoneauctions.com/_auction/pr.asp',
    purpose: 'Philatelic auction, lot, catalog, condition, and realized-price records.',
    priceBasis: 'unknown',
    status: 'pending_permission',
    liveTestStatus: 'verified',
    liveTestSummary: 'Public result returned title, stable auction and lot URL, date, Price Realized amount, condition, and certificate details.',
    permissionNote: 'Awaiting written permission for automated collection and retained auction data.',
  },
  {
    id: 'raritan',
    label: 'Raritan Past Auctions',
    categories: ['stamps'],
    sourceUrl: 'https://www.raritanstamps.com/PastAuc/',
    purpose: 'Philatelic price-list and catalog-join research.',
    priceBasis: 'unknown',
    status: 'pending_permission',
    liveTestStatus: 'partial',
    liveTestSummary: 'Public result returned completed sale, lot ID, date, and amount, but no individual title or explicit currency.',
    permissionNote: 'Awaiting an authorized catalog/result contract before collection.',
  },
  {
    id: 'omega_auctions',
    label: 'Omega Auctions',
    categories: ['music'],
    sourceUrl: 'https://www.omegaauctions.co.uk/',
    purpose: 'Specialist vinyl and music-memorabilia auction results.',
    priceBasis: 'hammer',
    status: 'pending_permission',
    liveTestStatus: 'partial',
    liveTestSummary: 'Public results article returned title, lot ID, GBP Sold For amount, estimate, and authentication, but no canonical lot URL or sale date.',
    permissionNote: 'Awaiting written permission before automated collection or display beyond direct attribution.',
  },
  {
    id: 'bertoia',
    label: 'Bertoia Auctions',
    categories: ['vintage_toys'],
    sourceUrl: 'https://www.bertoiaauctions.com/toy-auctions/past-auctions/',
    purpose: 'Specialist antique-toy price-realized catalog/PDF records.',
    priceBasis: 'unknown',
    status: 'pending_permission',
    liveTestStatus: 'partial',
    liveTestSummary: 'Public results PDF returned auction, lot ID, date, amount, and premium basis, but no individual title or stable lot URL.',
    permissionNote: 'Awaiting written permission before converting public catalogs or PDFs into retained records.',
  },
  {
    id: 'morphy',
    label: 'Morphy Auctions',
    categories: ['vintage_toys'],
    sourceUrl: 'https://morphyauctions.com/auctions/past-auctions/',
    purpose: 'Toy and general-collectibles catalog/PDF realized-price records.',
    priceBasis: 'including_buyers_premium',
    status: 'pending_permission',
    liveTestStatus: 'verified',
    liveTestSummary: 'Public closed lot returned title, stable URL, catalogue and lot IDs, date, USD final price, premium basis, and condition.',
    permissionNote: 'Awaiting written permission before automated catalog/PDF collection.',
  },
  {
    id: 'theriaults',
    label: 'Theriault’s Archive',
    categories: ['vintage_toys'],
    sourceUrl: 'https://www.theriaults.com/events/archive',
    purpose: 'Antique-doll and plaything lot-result research.',
    priceBasis: 'unknown',
    status: 'pending_permission',
    liveTestStatus: 'verified',
    liveTestSummary: 'Public archived listing returned title, stable ID, lot number, explicit Ended and Sold status, date, dollar amount, and condition.',
    permissionNote: 'Awaiting written permission before automated lookup or retained data use.',
  },
  {
    id: 'propstore',
    label: 'Propstore Sold Archive',
    categories: ['movies'],
    sourceUrl: 'https://propstore.com/general-faqs-2/',
    purpose: 'Screen-used props, costumes, and production-auction records.',
    priceBasis: 'hammer',
    status: 'pending_permission',
    liveTestStatus: 'partial',
    liveTestSummary: 'Public Sold Archive item returned identity, date, catalogue lot ID, provenance, and estimate, but realized price is login-gated.',
    permissionNote: 'Awaiting a data-use agreement before automated archive collection.',
  },
  {
    id: 'poster_auctions',
    label: 'Poster Auctions International',
    categories: ['movies'],
    sourceUrl: 'https://auctions.posterauctions.com/poster-price-guide-usage',
    purpose: 'Poster identity and auction price-guide results.',
    priceBasis: 'including_buyers_premium',
    status: 'pending_permission',
    liveTestStatus: 'no_completed_item',
    liveTestSummary: 'Public results route exposed no individual completed movie-poster lot or item price in the capped test.',
    permissionNote: 'Awaiting written permission before any automated price-guide collection.',
  },
  {
    id: 'bonhams',
    label: 'Bonhams Popular Culture',
    categories: ['movies'],
    sourceUrl: 'https://www.bonhams.com/',
    purpose: 'High-end popular-culture lot descriptions, provenance, and results.',
    priceBasis: 'including_buyers_premium',
    status: 'pending_permission',
    liveTestStatus: 'verified',
    liveTestSummary: 'Public completed lot returned title, stable auction and lot URL, explicit Sold for amount in USD including premium, and sale date.',
    permissionNote: 'Awaiting written permission before automated record collection or reuse.',
  },
  {
    id: 'comicconnect',
    label: 'ComicConnect Sold Archive',
    categories: ['comics'],
    sourceUrl: 'https://www.comicconnect.com/browse?filtertype=Sold',
    purpose: 'Comic issue, variant, grade, service, date, and sold-price research.',
    priceBasis: 'unknown',
    status: 'pending_permission',
    liveTestStatus: 'verified',
    liveTestSummary: 'Public sold item returned title, stable item ID, explicit sold date and status, USD Sold For amount, grade, and premium wording.',
    permissionNote: 'Awaiting written automation/commercial-data permission.',
  },
  {
    id: 'heritage',
    label: 'Heritage Auction Archives',
    categories: ['comics', 'coins', 'stamps', 'video_games', 'movies', 'music', 'autographs', 'disney_pins', 'vintage_toys'],
    sourceUrl: 'https://www.ha.com/c/search.zx',
    purpose: 'Specialist auction archive for scarce, graded, high-end, and provenance-rich collectibles.',
    priceBasis: 'including_buyers_premium',
    status: 'pending_permission',
    liveTestStatus: 'partial',
    liveTestSummary: 'Public completed lot returned identifiers, sold date, grade, certification, and premium wording, but numeric price is sign-in gated.',
    permissionNote: 'Awaiting a data-use license; no automated archive collection is enabled.',
  },
  {
    id: 'university_archives',
    label: 'University Archives',
    categories: ['autographs'],
    sourceUrl: 'https://www.universityarchives.com/auctions/past-auctions/',
    purpose: 'Signed historical-material auction records with provenance/authentication context.',
    priceBasis: 'unknown',
    status: 'pending_permission',
    liveTestStatus: 'verified',
    liveTestSummary: 'Public sold lot returned title, stable URL, date, USD Sold amount, grading context, and provenance.',
    permissionNote: 'Awaiting written permission before automated collection or retained commercial use.',
  },
  {
    id: 'swann',
    label: 'Swann Galleries',
    categories: ['autographs'],
    sourceUrl: 'https://www.swanngalleries.com/auction-catalog/autographs_7E7HIRSESY',
    purpose: 'Autograph and manuscript auction results with all-in price semantics.',
    priceBasis: 'including_buyers_premium',
    status: 'pending_permission',
    liveTestStatus: 'verified',
    liveTestSummary: 'Public closed lot returned title, catalogue and lot IDs, explicit Sold amount in USD, date, and buyer-premium-included basis.',
    permissionNote: 'Awaiting written permission before automated collection or retained commercial use.',
  },
  {
    id: 'rr_auction',
    label: 'RR Auction',
    categories: ['autographs', 'music'],
    sourceUrl: 'https://www.rrauction.com/auctions/auction-calendar/cron/past',
    purpose: 'Signed memorabilia and music-auction records with inscription/authentication context.',
    priceBasis: 'including_buyers_premium',
    status: 'pending_permission',
    liveTestStatus: 'verified',
    liveTestSummary: 'Public closed lot returned title, auction and lot IDs, date, USD Sold For amount, premium wording, and PSA/DNA context.',
    permissionNote: 'Awaiting written permission before automated collection or retained commercial use.',
  },
  {
    id: 'alexander_historical',
    label: 'Alexander Historical Auctions',
    categories: ['autographs'],
    sourceUrl: 'https://www.alexautographs.com/past-auctions/',
    purpose: 'Historical signed-material auction research.',
    priceBasis: 'unknown',
    status: 'pending_permission',
    liveTestStatus: 'verified',
    liveTestSummary: 'Public historical lot returned title, lot ID, completed auction date, USD Sold amount, condition, and buyer-premium wording.',
    permissionNote: 'Awaiting written permission before automated collection or retained commercial use.',
  },
  {
    id: 'goldin',
    label: 'Goldin Video Game Auctions',
    categories: ['video_games'],
    sourceUrl: 'https://goldin.co/buy/?Category=Video%20Games&show_only=Sold%20Items',
    purpose: 'High-end sealed and graded video-game auction results.',
    priceBasis: 'unknown',
    status: 'pending_permission',
    liveTestStatus: 'verified',
    liveTestSummary: 'Public video-game lot returned title, stable lot ID, Lot Sold status, timestamp, displayed and winning-bid amounts, Wata grade, and USD context.',
    permissionNote: 'Awaiting written permission before any automatic or persistent sold-item collection.',
  },
  {
    id: 'hakes',
    label: 'Hake’s Auction Results',
    categories: ['disney_pins', 'video_games', 'vintage_toys'],
    sourceUrl: 'https://www.hakes.com/auctionresults.aspx',
    purpose: 'Provenance-rich realized-price records for specialist collectible lots.',
    priceBasis: 'including_buyers_premium',
    status: 'pending_permission',
    liveTestStatus: 'no_completed_item',
    liveTestSummary: 'Public results route did not expose a completed Disney-pin item, lot ID, price, or item-level result in the capped test.',
    permissionNote: 'Awaiting written permission before automated collection or retained commercial use.',
  },
] as const;

export function normalizePermissionPendingCategory(category: string): string {
  return category.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function getPermissionPendingMarketSource(sourceId: PermissionPendingMarketSourceId): PermissionPendingMarketSource {
  const source = PERMISSION_PENDING_MARKET_SOURCES.find((candidate) => candidate.id === sourceId);
  if (!source) throw new Error(`Unknown permission-pending market source: ${sourceId}`);
  return source;
}

export function isPermissionPendingMarketSourceApplicable(sourceId: PermissionPendingMarketSourceId, category: string): boolean {
  const normalizedCategory = normalizePermissionPendingCategory(category);
  return getPermissionPendingMarketSource(sourceId).categories.includes(normalizedCategory);
}
