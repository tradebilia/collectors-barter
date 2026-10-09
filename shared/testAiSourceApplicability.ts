import { isSandboxSiteBlockedSource } from './sandboxBlockedSources';

export type TestAiSourceId = 'ebay_active' | 'sold_comps' | 'hipstamp' | 'hipstamp_sold' | 'pokemon_price_tracker' | 'the_card_api' | 'cardsight_ai' | 'lelands' | 'pristine_auction' | 'collect_auction' | 'sirius_sports_auctions' | 'comc_parse' | 'cgc' | 'psa' | 'bgs' | 'sgc' | 'pcgs' | 'numista' | 'pricecharting' | 'one_thirty_point' | 'pwcc' | 'wikidata' | 'smithsonian' | 'tcgdex' | 'igdb' | 'rawg' | 'discogs' | 'ngc' | 'coin_archives' | 'cng' | 'rumsey' | 'cherrystone' | 'raritan' | 'omega_auctions' | 'bertoia' | 'morphy' | 'theriaults' | 'propstore' | 'poster_auctions' | 'bonhams' | 'comicconnect' | 'comic_book_realm' | 'university_archives' | 'swann' | 'rr_auction' | 'alexander_historical' | 'goldin' | 'weiss' | 'hakes' | 'lcg' | 'nate_sanders' | 'tcgplayer_reef';

export type SourceEligibilityContext = { category: string; gradingCompany?: string | null; hasTitle?: boolean };

export type SourceApplicability = {
  sourceId: TestAiSourceId;
  categories: '*' | string[];
  requires?: 'title' | 'CGC certificate' | 'PSA certificate' | 'BGS certificate' | 'SGC certificate' | 'PCGS certificate' | 'NGC certificate';
  purpose: string;
  historicalLimit?: string;
};

export const TEST_AI_SOURCE_APPLICABILITY: readonly SourceApplicability[] = [
  { sourceId: 'ebay_active', categories: '*', requires: 'title', purpose: 'Current asking-price research across all Tradebilia categories.' },
  { sourceId: 'sold_comps', categories: '*', requires: 'title', purpose: 'Completed eBay-sale research across all Tradebilia categories.' },
  { sourceId: 'hipstamp', categories: ['stamps'], requires: 'title', purpose: 'HIPStamp current asking-price and supply context for Stamps items; not completed-sale evidence.' },
  { sourceId: 'hipstamp_sold', categories: ['stamps'], requires: 'title', purpose: 'HIPStamp store-scoped closed listings marked sold; historical context, not marketplace-wide sales evidence.' },
  { sourceId: 'pokemon_price_tracker', categories: ['pokemon'], requires: 'title', purpose: 'Pokémon Price Tracker catalog, guide-price, history, eBay, Cardmarket, and plan-gated population context. Source-attributed sandbox context only; it never changes Tradebilia valuation or verdicts.' },
  { sourceId: 'the_card_api', categories: ['sports cards', 'pokemon'], requires: 'title', purpose: 'The Card API completed-sale records and plan-gated catalog identity. Confirmed, dated sales must still pass Tradebilia identity, grading, recency, duplicate, and currency safeguards before valuation.' },
  { sourceId: 'cardsight_ai', categories: ['sports cards', 'pokemon'], requires: 'title', purpose: 'Cardsight.ai catalog, parallel-aware pricing, active marketplace, and population context. Only exact identity-and-parallel matched, dated auction records that also pass Tradebilia evidence gates may support sandbox valuation.' },
  { sourceId: 'comc_parse', categories: ['sports cards', 'pokemon'], requires: 'title', purpose: 'COMC active marketplace inventory through Parse.bot. Structured listing prices, seller availability, grading, and variants are context only; COMC sales history is not exposed by this API.' },
  { sourceId: 'lelands', categories: ['sports cards', 'autographs'], requires: 'title', purpose: 'Lelands past-auction archive for sports cards, memorabilia, and autographs. Only explicit sold records with dated, identity-matched detail may support sandbox valuation; buyer-premium-inclusive prices remain source-attributed.' },
  { sourceId: 'pristine_auction', categories: ['sports cards'], requires: 'title', purpose: 'Pristine Auction completed sports-card lots. Only get_lot records with sold=true, a dated close, normalized price, and identity/visual checks may support sandbox valuation.' },
  { sourceId: 'collect_auction', categories: ['sports cards'], requires: 'title', purpose: 'Collect Auctions completed sports-card lots through Parse.bot. Only explicit sold records with a dated sale, hammer price, and identity/grade/visual checks may support sandbox valuation.' },
  { sourceId: 'sirius_sports_auctions', categories: ['sports cards'], requires: 'title', purpose: 'Sirius Sports Auctions public prices-realized archive. Only explicit closed lots with a dated close, final price including buyer premium, and identity/grade/visual checks may support sandbox valuation.' },
  { sourceId: 'cgc', categories: ['comics'], requires: 'CGC certificate', purpose: 'CGC Comics certification, grade, label details, and population context.' },
  { sourceId: 'psa', categories: ['sports cards', 'pokemon'], requires: 'PSA certificate', purpose: 'PSA card certification, population, and certification sales.' },
  { sourceId: 'bgs', categories: ['sports cards', 'pokemon'], requires: 'BGS certificate', purpose: 'BGS card certification, subgrades, and population.' },
  { sourceId: 'sgc', categories: ['sports cards', 'pokemon'], requires: 'SGC certificate', purpose: 'SGC card certification data.' },
  { sourceId: 'pcgs', categories: ['coins'], requires: 'PCGS certificate', purpose: 'Official PCGS CoinFacts certification, population/reference data, and certification-matched Auction Prices Realized. Dated auction records remain subject to the comparable evidence gates.' },
  { sourceId: 'numista', categories: ['coins'], requires: 'title', purpose: 'Numista structured coin-catalog identification plus exact-grade catalogue guide values. Guide values are secondary evidence only; no catalogue record becomes a completed sale.' },
  { sourceId: 'pricecharting', categories: ['pokemon', 'coins', 'video games'], requires: 'title', purpose: 'PriceCharting current price-guide context: Pokémon and compatible TCG detail records, US coin pricing, and video-game UPC lookup. Results remain source-attributed context and do not become completed-sale evidence.' },
  { sourceId: 'one_thirty_point', categories: ['sports cards', 'pokemon'], requires: 'title', purpose: 'Multi-marketplace completed-sale trend research.', historicalLimit: 'Use individually dated records as trend context; do not treat older results as current-value comparables.' },
  { sourceId: 'pwcc', categories: ['sports cards', 'pokemon'], requires: 'title', purpose: 'PWCC / Fanatics Collect sold graded-card research.', historicalLimit: 'Use only Sold listings and retain date context; do not calculate an unqualified current average.' },
  { sourceId: 'wikidata', categories: ['movies', 'autographs'], requires: 'title', purpose: 'Public factual reference metadata only; never valuation, authentication, or certification.' },
  { sourceId: 'smithsonian', categories: ['stamps'], requires: 'title', purpose: 'National Postal Museum reference metadata only; never valuation, authentication, or certification.' },
  { sourceId: 'tcgdex', categories: ['pokemon'], requires: 'title', purpose: 'Pokémon card catalog identification metadata only; never valuation, authentication, certification, or ownership evidence.' },
  { sourceId: 'igdb', categories: ['video games'], requires: 'title', purpose: 'Commercially approved IGDB factual video-game catalog metadata only; never valuation, authentication, grading, certification, or ownership evidence.' },
  { sourceId: 'rawg', categories: ['video games'], requires: 'title', purpose: 'User-approved RAWG factual video-game catalog metadata only; never valuation, authentication, grading, certification, or ownership evidence.' },
  { sourceId: 'discogs', categories: ['music'], requires: 'title', purpose: 'Discogs release and catalog metadata only; never valuation, authentication, grading, certification, or ownership evidence.' },
  { sourceId: 'ngc', categories: ['coins'], requires: 'NGC certificate', purpose: 'Official NGC public certification lookup using certificate number plus numeric grade. Provider security blocks are reported transparently; no valuation admission.' },
  { sourceId: 'coin_archives', categories: ['coins'], requires: 'title', purpose: 'Permission-pending CoinArchives adapter for ancient/world coin auction research. Remote lookup is disabled until source authorization is recorded.' },
  { sourceId: 'cng', categories: ['coins'], requires: 'title', purpose: 'Permission-pending CNG Past Auctions adapter for ancient/world coin research. Remote lookup is disabled until source authorization is recorded.' },
  { sourceId: 'rumsey', categories: ['stamps'], requires: 'title', purpose: 'Permission-pending Rumsey adapter for philatelic auction research. Remote lookup is disabled until source authorization is recorded.' },
  { sourceId: 'cherrystone', categories: ['stamps'], requires: 'title', purpose: 'Permission-pending Cherrystone adapter for philatelic auction research. Remote lookup is disabled until source authorization is recorded.' },
  { sourceId: 'raritan', categories: ['stamps'], requires: 'title', purpose: 'Permission-pending Raritan adapter for philatelic result/catalog research. Remote lookup is disabled until source authorization is recorded.' },
  { sourceId: 'bertoia', categories: ['vintage toys'], requires: 'title', purpose: 'Permission-pending Bertoia adapter for antique-toy auction research. Remote lookup is disabled until source authorization is recorded.' },
  { sourceId: 'morphy', categories: ['vintage toys'], requires: 'title', purpose: 'Permission-pending Morphy adapter for toy auction research. Remote lookup is disabled until source authorization is recorded.' },
  { sourceId: 'theriaults', categories: ['vintage toys'], requires: 'title', purpose: 'Permission-pending Theriault’s adapter for antique-doll and plaything research. Remote lookup is disabled until source authorization is recorded.' },
  { sourceId: 'poster_auctions', categories: ['movies'], requires: 'title', purpose: 'Permission-pending Poster Auctions International adapter for poster-result research. Remote lookup is disabled until source authorization is recorded.' },
  { sourceId: 'bonhams', categories: ['movies'], requires: 'title', purpose: 'Permission-pending Bonhams adapter for high-end popular-culture research. Remote lookup is disabled until source authorization is recorded.' },
  { sourceId: 'comicconnect', categories: ['comics'], requires: 'title', purpose: 'Bounded ComicConnect sold-archive context lookup for comic research. Records remain outside valuation until source economics and signed-admission validation are complete.' },
  { sourceId: 'comic_book_realm', categories: ['comics'], requires: 'title', purpose: 'Comic Book Realm CGC Analyzer grade-specific guide estimates and recorded-sale context only; never an individual sold comparable or valuation input.' },
  { sourceId: 'rr_auction', categories: ['autographs', 'music'], requires: 'title', purpose: 'Permission-pending RR Auction adapter for signed memorabilia and music research. Remote lookup is disabled until source authorization is recorded.' },
  { sourceId: 'goldin', categories: ['comics', 'sports cards', 'vintage toys', 'video games', 'stamps', 'coins', 'pokemon', 'movies', 'music', 'autographs', 'disney pins'], requires: 'title', purpose: 'Bounded Goldin completed-lot context for every Tradebilia category. One anonymous public sold-lot title search returns at most 12 candidates, each identity-filtered and retained outside valuation.' },
  { sourceId: 'weiss', categories: ['comics', 'sports cards', 'vintage toys', 'video games', 'stamps', 'coins', 'pokemon', 'movies', 'music', 'autographs', 'disney pins'], requires: 'title', purpose: 'Bounded Weiss Auctions completed-lot research across all Tradebilia categories. Identity-matched, dated, explicit-USD completed lots with positive final hammer bids can support valuation; incomplete or mismatched rows remain context-only.' },
  { sourceId: 'nate_sanders', categories: ['sports cards', 'movies', 'music', 'autographs'], requires: 'title', purpose: 'Bounded Nate D. Sanders closed-lot context. Final prices include buyer premium and remain identity-filtered and outside valuation.' },
  { sourceId: 'tcgplayer_reef', categories: ['pokemon'], requires: 'title', purpose: 'Bounded TCGplayer recent-sale context through the authorized ReefAPI. Only provider-confirmed dated sales with positive USD prices are retained; active listings and guide prices remain outside valuation.' },
  { sourceId: 'hakes', categories: ['comics', 'sports cards', 'vintage toys', 'video games', 'movies', 'music', 'autographs', 'disney pins', 'pokemon'], requires: 'title', purpose: 'Full Hake’s public catalog adapter for pop-culture collectible-auction research. Closed-lot records remain context-only until source activation and buyer-premium review are complete.' },
  { sourceId: 'lcg', categories: ['vintage toys'], requires: 'title', purpose: 'Bounded LCG public-gallery context for Vintage Toys. Preliminary sold rows remain context-only until date, premium, permission, and source-activation review are complete.' },
];

function normalizeCategory(category: string): string { return category.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' '); }
function certificateRequirementMet(requirement: SourceApplicability['requires'], company: string | null | undefined): boolean {
  if (!requirement || requirement === 'title') return true;
  const normalizedCompany = (company ?? '').trim().toUpperCase().replace(/\s+(COMICS|CARDS)$/, '');
  return requirement.replace(' certificate', '').toUpperCase() === normalizedCompany;
}

export function getEligibleTestAiSources(context: SourceEligibilityContext): SourceApplicability[] {
  const category = normalizeCategory(context.category);
  return TEST_AI_SOURCE_APPLICABILITY.filter((source) => {
    if (isSandboxSiteBlockedSource(source.sourceId)) return false;
    const categoryMatches = source.categories === '*' || source.categories.includes(category);
    const titleMatches = source.requires !== 'title' || context.hasTitle !== false;
    return categoryMatches && titleMatches && certificateRequirementMet(source.requires, context.gradingCompany);
  });
}
