export type MarketNewsCategory =
  | 'Comics'
  | 'Sports Cards'
  | 'Vintage Toys'
  | 'Video Games'
  | 'Stamps'
  | 'Coins'
  | 'Pokemon / TCG'
  | 'Movies'
  | 'Music'
  | 'Autographs'
  | 'Disney Pins';

export type MarketNewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceType: 'official' | 'specialist';
  category: MarketNewsCategory;
  publishedAt: string | null;
  excerpt: string;
  relevance: 'high' | 'medium';
  matchScore: number;
  evidenceType: 'industry_news' | 'official_announcement' | 'auction_event' | 'risk_alert' | 'specialist_context';
  valuationImpact: 'context_only';
  matchedTerms: string[];
  significance: string;
};

export type CategoryMarketSummary = {
  category: MarketNewsCategory;
  articleCount: number;
  sourceCount: number;
  positiveSignals: number;
  negativeSignals: number;
  signal: 'improving' | 'softening' | 'mixed' | 'insufficient';
  confidence: 'low' | 'medium' | 'high';
  rationale: string;
};

type FeedDefinition = {
  source: string;
  sourceType: 'official' | 'specialist';
  category: MarketNewsCategory;
  url: string;
};

export const MARKET_NEWS_FEEDS: FeedDefinition[] = [
  { source: 'The Beat', sourceType: 'specialist', category: 'Comics', url: 'https://www.comicsbeat.com/feed/' },
  { source: 'Bleeding Cool', sourceType: 'specialist', category: 'Comics', url: 'https://bleedingcool.com/feed/' },
  { source: 'CBR', sourceType: 'specialist', category: 'Comics', url: 'https://www.cbr.com/feed/' },
  { source: 'ICv2', sourceType: 'specialist', category: 'Comics', url: 'https://icv2.com/rss' },
  { source: 'CBCS Blog', sourceType: 'official', category: 'Comics', url: 'https://www.cbcscomics.com/blog/feed/' },
  { source: 'Sports Collectors Daily', sourceType: 'specialist', category: 'Sports Cards', url: 'https://www.sportscollectorsdaily.com/feed/' },
  { source: 'Auction Report', sourceType: 'specialist', category: 'Sports Cards', url: 'https://www.auctionreport.com/feed/' },
  { source: 'Cardboard Connection', sourceType: 'specialist', category: 'Sports Cards', url: 'https://www.cardboardconnection.com/feed' },
  { source: 'Beckett News', sourceType: 'specialist', category: 'Sports Cards', url: 'https://www.beckett.com/news/feed/' },
  { source: 'PSA Blog', sourceType: 'official', category: 'Sports Cards', url: 'https://www.psacard.com/articles/feed' },
  { source: 'Goldin News', sourceType: 'specialist', category: 'Sports Cards', url: 'https://goldin.co/blogs/news.atom' },
  { source: 'Toy News International', sourceType: 'specialist', category: 'Vintage Toys', url: 'https://toynewsi.com/rss' },
  { source: 'The Toy Book', sourceType: 'specialist', category: 'Vintage Toys', url: 'https://toybook.com/feed/' },
  { source: 'Action Figure 411', sourceType: 'specialist', category: 'Vintage Toys', url: 'https://www.actionfigure411.com/feed/' },
  { source: 'Jays Brick Blog', sourceType: 'specialist', category: 'Vintage Toys', url: 'https://www.jaysbrickblog.com/feed/' },
  { source: 'Action Figure Insider', sourceType: 'specialist', category: 'Vintage Toys', url: 'https://www.actionfigureinsider.com/feed/' },
  { source: 'GamesIndustry.biz', sourceType: 'specialist', category: 'Video Games', url: 'https://www.gamesindustry.biz/feeds' },
  { source: 'Video Games Chronicle', sourceType: 'specialist', category: 'Video Games', url: 'https://www.videogameschronicle.com/feed/' },
  { source: 'Gematsu', sourceType: 'specialist', category: 'Video Games', url: 'https://www.gematsu.com/feed' },
  { source: 'Nintendo Life', sourceType: 'specialist', category: 'Video Games', url: 'https://www.nintendolife.com/feeds/latest' },
  { source: 'IGN', sourceType: 'specialist', category: 'Video Games', url: 'https://feeds.ign.com/ignfeeds' },
  { source: 'Eurogamer', sourceType: 'specialist', category: 'Video Games', url: 'https://www.eurogamer.net/feed' },
  { source: 'Nintendo World Report', sourceType: 'specialist', category: 'Video Games', url: 'https://www.nintendoworldreport.com/rss' },
  { source: 'Polygon', sourceType: 'specialist', category: 'Video Games', url: 'https://www.polygon.com/rss/index.xml' },
  { source: 'PokéBeach', sourceType: 'specialist', category: 'Pokemon / TCG', url: 'https://www.pokebeach.com/forums/forum/-/index.rss' },
  { source: 'Pokémon Official News', sourceType: 'official', category: 'Pokemon / TCG', url: 'https://www.pokemon.com/us/pokemon-news/rss' },
  { source: 'TCGplayer Blog', sourceType: 'specialist', category: 'Pokemon / TCG', url: 'https://infinite.tcgplayer.com/rss' },
  { source: 'Variety Film', sourceType: 'specialist', category: 'Movies', url: 'https://feeds.feedburner.com/variety/news/film' },
  { source: 'Deadline', sourceType: 'specialist', category: 'Movies', url: 'https://deadline.com/feed/' },
  { source: 'The Hollywood Reporter', sourceType: 'specialist', category: 'Movies', url: 'https://www.hollywoodreporter.com/feed/' },
  { source: 'Autograph Magazine Live', sourceType: 'specialist', category: 'Autographs', url: 'https://live.autographmagazine.com/activity/log/list?fmt=rss' },
  { source: 'Disney Parks Blog', sourceType: 'official', category: 'Disney Pins', url: 'https://disneyparksblog.com/feed/' },
  { source: 'Disney Pins Blog', sourceType: 'specialist', category: 'Disney Pins', url: 'https://disneypinsblog.com/feed/' },
  { source: 'WDW News Today', sourceType: 'specialist', category: 'Disney Pins', url: 'https://wdwnt.com/feed/' },
  { source: 'Music Business Worldwide', sourceType: 'specialist', category: 'Music', url: 'https://www.musicbusinessworldwide.com/feed/' },
  { source: 'Billboard', sourceType: 'specialist', category: 'Music', url: 'https://www.billboard.com/feed/' },
  { source: 'Music Week', sourceType: 'specialist', category: 'Music', url: 'https://www.musicweek.com/rss' },
  { source: 'Linns Stamp News', sourceType: 'specialist', category: 'Stamps', url: 'https://www.linns.com/feed' },
  { source: 'American Philatelic Society', sourceType: 'official', category: 'Stamps', url: 'https://stamps.org/news/news-archives/feed' },
  { source: 'USPS News', sourceType: 'official', category: 'Stamps', url: 'https://about.usps.com/news/rss/welcome.htm' },
  { source: 'CoinNews', sourceType: 'specialist', category: 'Coins', url: 'https://www.coinnews.net/feed/' },
  { source: 'American Numismatic Association', sourceType: 'official', category: 'Coins', url: 'https://www.money.org/feed/' },
  { source: 'Numismatic News', sourceType: 'specialist', category: 'Coins', url: 'https://www.numismaticnews.net/feed' },
  // Deep-audit additions: verified, current, and materially useful sources.
  { source: 'Overstreet Access Auctions & Prices', sourceType: 'specialist', category: 'Comics', url: 'https://www.overstreetaccess.com/category/auctions-and-prices/feed/' },
  { source: 'CBSI Comics', sourceType: 'specialist', category: 'Comics', url: 'https://comicbookinvest.com/feed/' },
  { source: 'The Beat Business News', sourceType: 'specialist', category: 'Comics', url: 'https://www.comicsbeat.com/category/news/business-news/feed/' },
  { source: 'Image Comics', sourceType: 'official', category: 'Comics', url: 'https://imagecomics.com/rss.xml' },
  { source: 'Dark Horse Upcoming Releases', sourceType: 'official', category: 'Comics', url: 'https://www.darkhorse.com/feed/upcoming/rss' },
  { source: 'ComicBookRealm Forums', sourceType: 'specialist', category: 'Comics', url: 'https://comicbookrealm.com/rss/forums' },
  { source: 'r/ComicBookSpeculation', sourceType: 'specialist', category: 'Comics', url: 'https://www.reddit.com/r/ComicBookSpeculation/.rss' },
  { source: 'Sports Collectors Digest', sourceType: 'specialist', category: 'Sports Cards', url: 'https://sportscollectorsdigest.com/feed' },
  { source: 'COMC Blog', sourceType: 'specialist', category: 'Sports Cards', url: 'https://blog.comc.com/feed/' },
  { source: 'Baseball Card Exchange', sourceType: 'specialist', category: 'Sports Cards', url: 'https://bbcexchange.com/blogs/news.atom' },
  { source: 'Just Collect', sourceType: 'specialist', category: 'Sports Cards', url: 'https://blog.justcollect.com/rss.xml' },
  { source: 'Net54Baseball', sourceType: 'specialist', category: 'Sports Cards', url: 'https://www.net54baseball.com/external.php?type=RSS2' },
  { source: 'Cherry Collectables', sourceType: 'specialist', category: 'Sports Cards', url: 'https://feeds.feedburner.com/CherryCollectables' },
  { source: 'Upper Deck', sourceType: 'official', category: 'Sports Cards', url: 'https://upperdeck.com/feed/' },
  { source: 'LUDEX', sourceType: 'specialist', category: 'Sports Cards', url: 'https://www.ludex.com/feed/' },
  { source: 'CardLines', sourceType: 'specialist', category: 'Sports Cards', url: 'https://cardlines.com/feed/' },
  { source: 'All Vintage Cards', sourceType: 'specialist', category: 'Sports Cards', url: 'https://allvintagecards.com/feed/' },
  { source: 'Hasbro Releases', sourceType: 'official', category: 'Vintage Toys', url: 'https://investor.hasbro.com/rss/news-releases.xml' },
  { source: 'Hasbro SEC Filings', sourceType: 'official', category: 'Vintage Toys', url: 'https://investor.hasbro.com/rss/sec-filings.xml' },
  { source: 'Global Toy News', sourceType: 'specialist', category: 'Vintage Toys', url: 'https://globaltoynews.com/feed/' },
  { source: 'Antique Toy Collectors of America', sourceType: 'specialist', category: 'Vintage Toys', url: 'https://atca-club.org/feed/' },
  { source: 'The Strong Museum of Play', sourceType: 'official', category: 'Vintage Toys', url: 'https://www.museumofplay.org/feed/' },
  { source: 'CPSC Children Product Recalls', sourceType: 'official', category: 'Vintage Toys', url: 'https://www.cpsc.gov/Newsroom/CPSC-RSS-Feed/Recalls-RSS/children' },
  { source: 'The Toy Collectors Guide', sourceType: 'specialist', category: 'Vintage Toys', url: 'https://thetoycollectorsguide.com/feed/' },
  { source: 'Doll Reference', sourceType: 'specialist', category: 'Vintage Toys', url: 'https://www.dollreference.com/feed/' },
  { source: 'PlaidStallions', sourceType: 'specialist', category: 'Vintage Toys', url: 'https://plaidstallions.com/reboot/feed/' },
  { source: 'TFW2005', sourceType: 'specialist', category: 'Vintage Toys', url: 'https://news.tfw2005.com/feed' },
  { source: 'HissTank', sourceType: 'specialist', category: 'Vintage Toys', url: 'https://news.hisstank.com/feed' },
  { source: 'Jedi Temple Archives', sourceType: 'specialist', category: 'Vintage Toys', url: 'https://www.jeditemplearchives.com/content/backend.php' },
  { source: 'Limited Run Games', sourceType: 'official', category: 'Video Games', url: 'https://limitedrungames.com/blogs/news.atom' },
  { source: 'Super Rare Games', sourceType: 'official', category: 'Video Games', url: 'https://superraregames.com/blogs/news.atom' },
  { source: 'Video Game History Foundation', sourceType: 'official', category: 'Video Games', url: 'https://gamehistory.org/feed/' },
  { source: 'Gaming Alexandria', sourceType: 'specialist', category: 'Video Games', url: 'https://www.gamingalexandria.com/wp/feed/' },
  { source: 'Time Extension', sourceType: 'specialist', category: 'Video Games', url: 'https://www.timeextension.com/feeds/latest' },
  { source: 'r/gamecollecting', sourceType: 'specialist', category: 'Video Games', url: 'https://www.reddit.com/r/gamecollecting/.rss' },
  { source: 'Tabletop Sentinel', sourceType: 'specialist', category: 'Pokemon / TCG', url: 'https://feeds.tabletopsentinel.com/news.xml' },
  { source: 'PriceCharting Blog', sourceType: 'specialist', category: 'Pokemon / TCG', url: 'https://blog.pricecharting.com/feeds/posts/default?alt=rss' },
  { source: 'Elite Fourum', sourceType: 'specialist', category: 'Pokemon / TCG', url: 'https://www.elitefourum.com/latest.rss' },
  { source: 'r/PokeInvesting', sourceType: 'specialist', category: 'Pokemon / TCG', url: 'https://www.reddit.com/r/PokeInvesting/.rss?raw_json=1' },
  { source: 'Original Prop Blog', sourceType: 'specialist', category: 'Movies', url: 'https://www.originalprop.com/blog/feed/' },
  { source: 'Hollywood Movie Costumes and Props', sourceType: 'specialist', category: 'Movies', url: 'https://hollywoodmoviecostumesandprops.blogspot.com/feeds/posts/default' },
  { source: 'The Stuff Dreams Are Made Of', sourceType: 'specialist', category: 'Movies', url: 'https://feeds.simplecast.com/aKSgZuQv' },
  { source: 'Vintage Movie Posters Forum', sourceType: 'specialist', category: 'Movies', url: 'https://vintagemoviepostersforum.com/discussions.rss' },
  { source: 'Film Art Gallery', sourceType: 'specialist', category: 'Movies', url: 'https://filmartgallery.com/blogs/news.atom' },
  { source: 'Jedi Temple Archives Movies', sourceType: 'specialist', category: 'Movies', url: 'https://www.jeditemplearchives.com/feed/' },
  { source: 'Marvel Toy News', sourceType: 'specialist', category: 'Movies', url: 'https://marveltoynews.com/feed/' },
  { source: 'Regal Robot', sourceType: 'official', category: 'Movies', url: 'https://regalrobot.com/blog/feed/' },
  { source: 'Iron Studios', sourceType: 'official', category: 'Movies', url: 'https://ironstudios.com/blogs/news.atom' },
  { source: 'Super7', sourceType: 'official', category: 'Movies', url: 'https://super7.com/blogs/news.atom' },
  { source: 'Sports Collectors Digest Autographs', sourceType: 'specialist', category: 'Autographs', url: 'https://sportscollectorsdigest.com/autographs/feed' },
  { source: 'SWAU', sourceType: 'official', category: 'Autographs', url: 'https://swau.com/blogs/blog.atom' },
  { source: 'Autograph University', sourceType: 'specialist', category: 'Autographs', url: 'https://www.autographu.com/feed/' },
  { source: 'Collectors Universe Autographs', sourceType: 'specialist', category: 'Autographs', url: 'https://forums.collectors.com/categories/autographs-forum/feed.rss' },
  { source: 'r/Autographs', sourceType: 'specialist', category: 'Autographs', url: 'https://www.reddit.com/r/Autographs/.rss' },
  { source: 'The Manuscript Society', sourceType: 'specialist', category: 'Autographs', url: 'https://manuscript.org/feed/' },
  { source: 'Fine Books & Collections', sourceType: 'specialist', category: 'Autographs', url: 'https://www.finebooksmagazine.com/rss.xml' },
  { source: 'Swann Galleries', sourceType: 'specialist', category: 'Autographs', url: 'https://www.swanngalleries.com/feed/' },
  { source: 'WDWNT Pin Trading', sourceType: 'specialist', category: 'Disney Pins', url: 'https://wdwnt.com/tag/pin-trading/feed/' },
  { source: 'MickeyBlog Parks Pins', sourceType: 'specialist', category: 'Disney Pins', url: 'https://mickeyblog.com/tag/disney-parks-pins/feed/' },
  { source: 'Disney Consumer Products', sourceType: 'official', category: 'Disney Pins', url: 'https://disneyparksblog.com/products/feed/' },
  { source: 'Disney Pin Forum Comparison', sourceType: 'specialist', category: 'Disney Pins', url: 'https://www.disneypinforum.com/forums/pin-comparison.32/index.rss' },
  { source: 'Disney Pin Forum Discussion', sourceType: 'specialist', category: 'Disney Pins', url: 'https://www.disneypinforum.com/forums/disney-pin-discussion.3/index.rss' },
  { source: 'r/DisneyPins', sourceType: 'specialist', category: 'Disney Pins', url: 'https://www.reddit.com/r/DisneyPins/.rss' },
  { source: 'GoPinPro', sourceType: 'specialist', category: 'Disney Pins', url: 'https://gopinpro.com/blogs/news.atom' },
  { source: 'Van Eaton Galleries', sourceType: 'specialist', category: 'Disney Pins', url: 'https://vegalleries.com/rss.xml' },
  { source: 'Goldmine Magazine', sourceType: 'specialist', category: 'Music', url: 'https://www.goldminemag.com/feed/' },
  { source: 'Record Collector Magazine', sourceType: 'specialist', category: 'Music', url: 'https://www.recordcollectormag.com/feed/' },
  { source: 'The Second Disc', sourceType: 'specialist', category: 'Music', url: 'https://theseconddisc.com/feed/' },
  { source: 'SuperDeluxeEdition', sourceType: 'specialist', category: 'Music', url: 'https://superdeluxeedition.com/feed/' },
  { source: 'Tracking Angle', sourceType: 'specialist', category: 'Music', url: 'https://trackingangle.com/feed/' },
  { source: 'EIL.COM', sourceType: 'specialist', category: 'Music', url: 'https://eil.com/rss/index.asp?from=RSS&email=&bis=0' },
  { source: 'RIAA', sourceType: 'official', category: 'Music', url: 'https://www.riaa.com/feed/' },
  { source: 'Steve Hoffman Music Forums', sourceType: 'specialist', category: 'Music', url: 'https://forums.stevehoffman.tv/forums/music-corner.2/index.rss' },
  { source: 'r/VinylCollectors', sourceType: 'specialist', category: 'Music', url: 'https://www.reddit.com/r/VinylCollectors/new/.rss' },
  { source: 'Craft Recordings', sourceType: 'official', category: 'Music', url: 'https://craftrecordings.com/blogs/news.atom' },
  { source: 'Light in the Attic', sourceType: 'official', category: 'Music', url: 'https://lightintheattic.net/blogs/news.atom' },
  { source: 'Intervention Records', sourceType: 'official', category: 'Music', url: 'https://interventionrecords.com/blogs/news.atom' },
  { source: 'Impex Records', sourceType: 'official', category: 'Music', url: 'https://imprec.com/blogs/news.atom' },
  { source: 'MetaBrainz Blog', sourceType: 'specialist', category: 'Music', url: 'https://blog.metabrainz.org/feed/' },
  { source: 'Canadian Stamp News', sourceType: 'specialist', category: 'Stamps', url: 'https://canadianstampnews.com/feed/' },
  { source: 'David Feldman', sourceType: 'specialist', category: 'Stamps', url: 'https://www.davidfeldman.com/feed/' },
  { source: 'Norvic Philatelics', sourceType: 'specialist', category: 'Stamps', url: 'https://feeds.feedburner.com/blogspot/GFYMB' },
  { source: 'FreestampMagazine', sourceType: 'specialist', category: 'Stamps', url: 'https://www.freestampmagazine.com/feed/' },
  { source: 'The Stamp Forum', sourceType: 'specialist', category: 'Stamps', url: 'https://thestampforum.boards.net/rss/public' },
  { source: 'r/philately', sourceType: 'specialist', category: 'Stamps', url: 'https://www.reddit.com/r/philately/.rss' },
  { source: 'Stamp Show Here Today', sourceType: 'specialist', category: 'Stamps', url: 'https://stampshowheretoday1.podbean.com/feed.xml' },
  { source: 'Greysheet', sourceType: 'specialist', category: 'Coins', url: 'https://www.greysheet.com/feed' },
  { source: 'David Lawrence Rare Coins', sourceType: 'specialist', category: 'Coins', url: 'https://blog.davidlawrence.com/rss/' },
  { source: 'Douglas Winter Numismatics', sourceType: 'specialist', category: 'Coins', url: 'https://raregoldcoins.com/blog?format=RSS' },
  { source: 'The Coin Show Podcast', sourceType: 'specialist', category: 'Coins', url: 'https://www.spreaker.com/show/1080503/episodes/feed' },
  { source: 'Sedwick Coins', sourceType: 'specialist', category: 'Coins', url: 'https://sedwickcoins.blog/feed/' },
  { source: 'John Reich Collectors Society', sourceType: 'specialist', category: 'Coins', url: 'https://jr-newsletter.blogspot.com/feeds/posts/default?alt=rss' },
  { source: 'Colonial Coin Collectors Club', sourceType: 'specialist', category: 'Coins', url: 'https://colonialcoins.org/feed/' },
  { source: 'American Numismatic Society', sourceType: 'official', category: 'Coins', url: 'https://numismatics.org/pocketchange-type/pocket-change/feed/' },
  { source: 'CoinTalk', sourceType: 'specialist', category: 'Coins', url: 'https://www.cointalk.com/forums/-/index.rss' },
  { source: 'Change Checker', sourceType: 'specialist', category: 'Coins', url: 'https://blog.changechecker.org/feed/' },
  { source: 'Coin Publications', sourceType: 'specialist', category: 'Coins', url: 'https://coinpublications.com/feed/' },
  // Verified RSS expansion: specialist context only; never valuation evidence.
  { source: 'PokéJungle', sourceType: 'specialist', category: 'Pokemon / TCG', url: 'https://pokejungle.net/feed/' },
  { source: 'Japan2UK Upcoming Products', sourceType: 'specialist', category: 'Pokemon / TCG', url: 'https://www.japan2uk.com/blogs/upcoming-products.atom' },
  { source: 'SuperDuperTCG Blog', sourceType: 'specialist', category: 'Pokemon / TCG', url: 'https://www.superdupertcg.com/blog-feed.xml' },
  { source: 'r/pkmntcgcollections', sourceType: 'specialist', category: 'Pokemon / TCG', url: 'https://www.reddit.com/r/pkmntcgcollections/.rss' },
  { source: 'eBay Newsroom', sourceType: 'official', category: 'Pokemon / TCG', url: 'https://www.ebayinc.com/stories/news/rss/' },
  { source: 'Lion Heart Autographs', sourceType: 'specialist', category: 'Autographs', url: 'https://lionheartautographs.com/feed/' },
  { source: 'Nate D. Sanders Auctions', sourceType: 'specialist', category: 'Autographs', url: 'https://natedsandersauctionblog.com/feed/' },
  { source: 'Collectors Weekly Articles', sourceType: 'specialist', category: 'Autographs', url: 'https://www.collectorsweekly.com/articles/feed/' },
  { source: 'Royal Philatelic Society London', sourceType: 'official', category: 'Stamps', url: 'https://home.rpsl.org.uk/feed/' },
  { source: 'U.S. Philatelic Classics Society', sourceType: 'official', category: 'Stamps', url: 'https://www.uspcs.org/feed/' },
  { source: 'Postal History Society', sourceType: 'official', category: 'Stamps', url: 'https://www.postalhistory.org.uk/feed/' },
  { source: 'Military Postal History Society', sourceType: 'official', category: 'Stamps', url: 'https://militaryphs.org/blog/feed/' },
  { source: 'United States Stamp Society', sourceType: 'official', category: 'Stamps', url: 'https://www.usstamps.org/feed/' },
  { source: 'Barbados Stamps', sourceType: 'specialist', category: 'Stamps', url: 'https://www.barbadosstamps.co.uk/blog/feed/' },
  { source: 'ALES STAMPS', sourceType: 'specialist', category: 'Stamps', url: 'https://alesstamps.blogspot.com/feeds/posts/default' },
  { source: 'D23', sourceType: 'official', category: 'Disney Pins', url: 'https://d23.com/feed/' },
  { source: 'Disneyland Paris News', sourceType: 'official', category: 'Disney Pins', url: 'https://news.disneylandparis.com/en/feed/' },
  // 2026-09-25 deep-dive additions: verified context-only feeds; never valuation evidence.
  { source: 'SKTCHD', sourceType: 'specialist', category: 'Comics', url: 'https://sktchd.com/feed/' },
  { source: 'The Comics Journal', sourceType: 'specialist', category: 'Comics', url: 'https://www.tcj.com/feed/' },
  { source: 'AIPT Comics', sourceType: 'specialist', category: 'Comics', url: 'https://aiptcomics.com/feed/' },
  { source: 'Penguin Random House Comics', sourceType: 'official', category: 'Comics', url: 'https://prhcomics.com/feed/' },
  { source: 'Archie Comics', sourceType: 'official', category: 'Comics', url: 'https://archiecomics.com/feed/' },
  { source: 'Comic-Con International — Toucan', sourceType: 'official', category: 'Comics', url: 'https://www.comic-con.org/toucan/feed/' },
  { source: 'Panini News — The Knight’s Lance', sourceType: 'official', category: 'Sports Cards', url: 'https://blog.paniniamerica.net/feed/' },
  { source: 'Topps Ripped', sourceType: 'official', category: 'Sports Cards', url: 'https://ripped.topps.com/feed/' },
  { source: 'Go GTS', sourceType: 'specialist', category: 'Sports Cards', url: 'https://gogts.net/feed/' },
  { source: 'National Baseball Hall of Fame and Museum', sourceType: 'official', category: 'Sports Cards', url: 'https://baseballhall.org/rss.xml' },
  { source: 'Old Sports Cards', sourceType: 'specialist', category: 'Sports Cards', url: 'https://www.oldsportscards.com/feed/' },
  { source: 'Morphy Auctions Toys & Pop Culture', sourceType: 'specialist', category: 'Vintage Toys', url: 'https://morphyauctions.com/auctions/divisions/toys-pop-culture/feed/' },
  { source: 'Antique Trader Toys Archives', sourceType: 'specialist', category: 'Vintage Toys', url: 'https://www.antiquetrader.com/collectibles/toys-collectibles/feed' },
  { source: 'Toy World Magazine', sourceType: 'specialist', category: 'Vintage Toys', url: 'https://toyworldmag.co.uk/feed/' },
  { source: 'Brickset', sourceType: 'specialist', category: 'Vintage Toys', url: 'https://brickset.com/feed/' },
  { source: 'The Brothers Brick', sourceType: 'specialist', category: 'Vintage Toys', url: 'https://feeds.feedburner.com/TheBrothersBrick' },
  { source: 'AntiqueToys.com', sourceType: 'specialist', category: 'Vintage Toys', url: 'https://www.antiquetoys.com/feed/' },
  { source: 'Evercade News', sourceType: 'official', category: 'Video Games', url: 'https://evercade.co.uk/feed/' },
  { source: 'Fangamer News', sourceType: 'official', category: 'Video Games', url: 'https://www.fangamer.com/blogs/news.atom' },
  { source: 'Arcade Heroes', sourceType: 'specialist', category: 'Video Games', url: 'https://arcadeheroes.com/feed/' },
  { source: 'The Arcade Blogger', sourceType: 'specialist', category: 'Video Games', url: 'https://arcadeblogger.com/feed/' },
  { source: 'Old School Gamer Magazine', sourceType: 'specialist', category: 'Video Games', url: 'https://www.oldschoolgamermagazine.com/feed/' },
  { source: 'RetroRGB', sourceType: 'specialist', category: 'Video Games', url: 'https://retrorgb.com/feed' },
  { source: 'GameDiscoverCo Newsletter', sourceType: 'specialist', category: 'Video Games', url: 'https://newsletter.gamediscover.co/feed' },
  { source: 'PlayStation.Blog', sourceType: 'official', category: 'Video Games', url: 'https://blog.playstation.com/feed/' },
  { source: 'Pokémon Card Channel (Japan)', sourceType: 'official', category: 'Pokemon / TCG', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCysOBNRW0rEmLtFptj1TN7A' },
  { source: 'PocketMonsters.net News', sourceType: 'specialist', category: 'Pokemon / TCG', url: 'https://pocketmonsters.net/rss' },
  { source: 'The PokeGym', sourceType: 'specialist', category: 'Pokemon / TCG', url: 'https://pokegym.net/feed/' },
  { source: 'PokecaBook', sourceType: 'specialist', category: 'Pokemon / TCG', url: 'https://pokecabook.com/feed/' },
  { source: 'PokéCard Lab', sourceType: 'specialist', category: 'Pokemon / TCG', url: 'https://pokecardlab.com/feed/' },
  { source: 'PokéCa Hack', sourceType: 'specialist', category: 'Pokemon / TCG', url: 'https://pokecahack.com/feed/' },
  { source: 'r/PokemonTCG', sourceType: 'specialist', category: 'Pokemon / TCG', url: 'https://www.reddit.com/r/PokemonTCG/.rss' },
  { source: 'Blu-ray.com New Releases', sourceType: 'specialist', category: 'Movies', url: 'https://www.blu-ray.com/rss/newreleasesfeed.xml' },
  { source: 'Media Play News', sourceType: 'specialist', category: 'Movies', url: 'https://www.mediaplaynews.com/feed/' },
  { source: 'Severin Films', sourceType: 'official', category: 'Movies', url: 'https://severinfilms.com/blogs/news.atom' },
  { source: 'Bad Film Restoration', sourceType: 'specialist', category: 'Movies', url: 'https://badfilmrestoration.com/feed/' },
  { source: 'Library of Congress — Now See Hear!', sourceType: 'official', category: 'Movies', url: 'https://blogs.loc.gov/now-see-hear/feed/' },
  { source: 'Museum of the Moving Image', sourceType: 'official', category: 'Movies', url: 'https://movingimage.org/feed/' },
  { source: 'American Film Institute', sourceType: 'official', category: 'Movies', url: 'https://www.afi.com/feed/' },
  { source: 'John Reznikoff — News & History', sourceType: 'specialist', category: 'Autographs', url: 'https://johnreznikoff.com/feed/' },
  { source: 'Bonhams Press Releases', sourceType: 'official', category: 'Autographs', url: 'https://www.bonhams.com/press_release/rss/' },
  { source: 'Antiques And The Arts Weekly', sourceType: 'specialist', category: 'Autographs', url: 'https://www.antiquesandthearts.com/feed/' },
  { source: 'Rare Book Buyer', sourceType: 'specialist', category: 'Autographs', url: 'https://www.rarebookbuyer.com/feed/' },
  { source: 'Laughing Place Disney Pins', sourceType: 'specialist', category: 'Disney Pins', url: 'https://www.laughingplace.com/w/tag/disney-pins/feed/' },
  { source: 'Daps Magic Pin Trading', sourceType: 'specialist', category: 'Disney Pins', url: 'https://www.dapsmagic.com/tag/pin-trading/feed/' },
  { source: 'Chip and Company Disney Pins', sourceType: 'specialist', category: 'Disney Pins', url: 'https://chipandco.com/tag/disney-pins/feed/' },
  { source: 'The Walt Disney Company', sourceType: 'official', category: 'Disney Pins', url: 'https://thewaltdisneycompany.com/feed/' },
  { source: 'Third Man Records Vault News', sourceType: 'official', category: 'Music', url: 'https://thirdmanrecords.com/blogs/vault-news.atom' },
  { source: 'The Vinyl Press', sourceType: 'specialist', category: 'Music', url: 'https://thevinylpress.com/feed/' },
  { source: 'The Vinyl District', sourceType: 'specialist', category: 'Music', url: 'https://feeds.feedburner.com/TheVinylDistrict' },
  { source: 'Library of Congress Music Division', sourceType: 'official', category: 'Music', url: 'https://blogs.loc.gov/music/feed/' },
  { source: 'Blue Note Records', sourceType: 'official', category: 'Music', url: 'https://www.bluenote.com/feed/' },
  { source: 'uDiscover Music', sourceType: 'specialist', category: 'Music', url: 'https://www.udiscovermusic.com/feed/' },
  { source: 'The Collectors Club', sourceType: 'official', category: 'Stamps', url: 'https://www.collectorsclub.org/feed/' },
  { source: 'Grosvenor Philatelic Auctions', sourceType: 'specialist', category: 'Stamps', url: 'https://www.grosvenorauctions.com/feed/' },
  { source: 'Classic Latin America', sourceType: 'specialist', category: 'Stamps', url: 'https://classiclatinamerica.com/feed/' },
  { source: 'Commonwealth Stamps Opinion', sourceType: 'specialist', category: 'Stamps', url: 'https://commonwealthstampsopinion.blogspot.com/feeds/posts/default?alt=rss' },
  { source: 'Europa Stamps', sourceType: 'specialist', category: 'Stamps', url: 'https://europa-stamps.blogspot.com/feeds/posts/default?alt=rss' },
  { source: 'MB’s Stamps of India', sourceType: 'specialist', category: 'Stamps', url: 'https://mbstamps.blogspot.com/feeds/posts/default?alt=rss' },
  { source: 'CoinWeek Auction News', sourceType: 'specialist', category: 'Coins', url: 'https://coinweek.com/auction-news/feed/' },
  { source: 'CoinsWeekly', sourceType: 'specialist', category: 'Coins', url: 'https://new.coinsweekly.com/feed/' },
  { source: 'COINage Magazine', sourceType: 'specialist', category: 'Coins', url: 'https://www.coinagemag.com/feed/' },
  { source: 'Anti-Counterfeiting Educational Foundation', sourceType: 'official', category: 'Coins', url: 'https://acefonline.org/feed/' },
];

const categoryAliases: Record<string, string[]> = {
  'Comics': ['comic', 'comics', 'graphic novel', 'marvel', 'dc', 'cgc', 'cbc'],
  'Sports Cards': ['sports card', 'baseball card', 'basketball card', 'football card', 'hockey card', 'trading card', 'psa', 'topps', 'panini'],
  'Vintage Toys': ['toy', 'action figure', 'transformers', 'gi joe', 'star wars', 'kenner', 'hasbro', 'mattel'],
  'Video Games': ['video game', 'gaming', 'playstation', 'nintendo', 'xbox', 'steam', 'game boy', 'nes', 'snes'],
  'Stamps': ['stamp', 'philatel', 'postage', 'postal'],
  'Coins': ['coin', 'numis', 'mint', 'bullion', 'pcgs', 'ngc'],
  'Pokemon / TCG': ['pokemon', 'pokémon', 'tcg', 'trading card game'],
  'Movies': ['movie', 'film', 'cinema', 'poster', 'prop', 'blu-ray', 'actor'],
  'Music': ['music', 'vinyl', 'record', 'album', 'artist', 'concert'],
  'Autographs': ['autograph', 'signed', 'signature', 'memorabilia'],
  'Disney Pins': ['disney', 'pin trading', 'disney pin', 'parks blog'],
};

function decodeXml(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}

function field(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return match ? decodeXml(match[1]) : '';
}

function parseFeed(xml: string, feed: FeedDefinition): MarketNewsItem[] {
  const blocks = [...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(item|entry)>/gi)].map((match) => match[0]);
  return blocks.slice(0, 25).map((block, index) => {
    const title = field(block, 'title') || 'Untitled article';
    const linkMatch = block.match(/<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i) || block.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?\s*>/i);
    const url = decodeXml(linkMatch?.[1] ?? '');
    const publishedAt = field(block, 'pubDate') || field(block, 'published') || field(block, 'updated') || null;
    const excerpt = field(block, 'description') || field(block, 'summary') || '';
    const id = `${feed.source}:${url || title}:${index}`.toLowerCase();
    const lower = `${title} ${excerpt}`.toLowerCase();
    const evidenceType: MarketNewsItem['evidenceType'] = /recall|counterfeit|forgery|stolen|ban|safety|fraud/i.test(lower)
      ? 'risk_alert'
      : /auction|sold|sale|bidding|results|prices realized/i.test(lower)
        ? 'auction_event'
        : feed.sourceType === 'official'
          ? 'official_announcement'
          : 'specialist_context';
    const relevance: MarketNewsItem['relevance'] = 'medium';
    const valuationImpact: MarketNewsItem['valuationImpact'] = 'context_only';
    return { id, title, url, source: feed.source, sourceType: feed.sourceType, category: feed.category, publishedAt, excerpt: excerpt.slice(0, 320), relevance, matchScore: 0, evidenceType, valuationImpact, matchedTerms: [], significance: '' };
  }).filter((item) => item.url && item.title !== 'Untitled article');
}

function itemTerms(item: { title: string; category: string; itemType?: string; itemDetails?: string }): string[] {
  let detailText = '';
  try { detailText = item.itemDetails ? JSON.stringify(JSON.parse(item.itemDetails)) : ''; } catch { detailText = item.itemDetails ?? ''; }
  const raw = `${item.title} ${item.itemType ?? ''} ${detailText}`;
  return [...new Set(raw.toLowerCase().replace(/[^a-z0-9À-ÿ]+/gi, ' ').split(/\s+/).filter((term) => term.length >= 4))].slice(0, 40);
}

function buildSignificanceSummary(article: MarketNewsItem, item: { title: string; category: string }): string {
  const subject = item.title.trim() || `this ${item.category} item`;
  const terms = article.matchedTerms.slice(0, 3).join(', ');
  const topic = terms ? `through the terms “${terms}”` : `through its ${item.category.toLowerCase()} coverage`;
  const implication = article.evidenceType === 'risk_alert'
    ? 'It may flag an authenticity, safety, or market-risk factor to review before relying on the listing.'
    : article.evidenceType === 'auction_event'
      ? 'It may provide timing or demand context, but it is not a completed sale for this specific item.'
      : article.evidenceType === 'official_announcement'
        ? 'It may affect collector interest or supply context, but it does not establish this item’s value.'
        : 'It provides industry or specialist context that may help interpret collector interest, not a valuation.';
  return `Relevant to ${subject} ${topic}. ${implication}`;
}

const positiveMarketTerms = ['demand', 'growth', 'record', 'surge', 'rising', 'strong', 'booming', 'hot', 'sellout', 'increased', 'premium'];
const negativeMarketTerms = ['pullback', 'decline', 'downturn', 'cooling', 'weak', 'slump', 'slow', 'falling', 'oversupply', 'concern', 'caution'];

export function summarizeCategoryMarketNews(items: MarketNewsItem[], categories: MarketNewsCategory[]): CategoryMarketSummary[] {
  return categories.map((category) => {
    const categoryItems = items.filter((item) => item.category === category);
    const corpus = categoryItems.map((item) => `${item.title} ${item.excerpt}`).join(' ').toLowerCase();
    const positiveSignals = positiveMarketTerms.reduce((count, term) => count + (corpus.includes(term) ? 1 : 0), 0);
    const negativeSignals = negativeMarketTerms.reduce((count, term) => count + (corpus.includes(term) ? 1 : 0), 0);
    const signal: CategoryMarketSummary['signal'] = categoryItems.length === 0
      ? 'insufficient'
      : positiveSignals >= negativeSignals + 2 ? 'improving'
        : negativeSignals >= positiveSignals + 2 ? 'softening'
          : 'mixed';
    const sourceCount = new Set(categoryItems.map((item) => item.source)).size;
    const confidence: CategoryMarketSummary['confidence'] = categoryItems.length >= 8 ? 'high' : categoryItems.length >= 3 ? 'medium' : 'low';
    const rationale = categoryItems.length === 0
      ? 'No usable articles were returned for this category.'
      : `${categoryItems.length} article${categoryItems.length === 1 ? '' : 's'} from ${sourceCount} source${sourceCount === 1 ? '' : 's'}; ${positiveSignals} positive and ${negativeSignals} cautionary market-language signals detected.`;
    return { category, articleCount: categoryItems.length, sourceCount, positiveSignals, negativeSignals, signal, confidence, rationale };
  });
}

export function matchMarketNews(items: MarketNewsItem[], item: { title: string; category: string; itemType?: string; itemDetails?: string }): MarketNewsItem[] {
  const category = Object.keys(categoryAliases).find((key) => item.category.toLowerCase().includes(key.toLowerCase().split(' ')[0])) as MarketNewsCategory | undefined;
  const aliases = category ? categoryAliases[category] : [item.category.toLowerCase()];
  const terms = itemTerms(item);
  return items.map((news) => {
    const haystack = `${news.title} ${news.excerpt}`.toLowerCase();
    const matchedTerms = [...new Set([...aliases, ...terms].filter((term) => haystack.includes(term)))].slice(0, 8);
    const score = matchedTerms.length + (haystack.includes(item.title.toLowerCase().trim()) ? 5 : 0);
    const relevance: MarketNewsItem['relevance'] = score >= 3 ? 'high' : 'medium';
    const matched = { ...news, matchScore: score, matchedTerms, relevance };
    return { ...matched, significance: buildSignificanceSummary(matched, item) };
  }).filter((news) => news.matchScore >= 2).sort((a, b) => b.matchScore - a.matchScore || String(b.publishedAt).localeCompare(String(a.publishedAt))).slice(0, 8);
}

export async function fetchMarketNewsForItems(items: Array<{ title: string; category: string; itemType?: string; itemDetails?: string }>): Promise<{ feedsChecked: number; feedErrors: string[]; itemA: MarketNewsItem[]; itemB: MarketNewsItem[]; categorySummaries: CategoryMarketSummary[]; fetchedAt: string }> {
  const feedErrors: string[] = [];
  const selectedCategoryKeys = new Set(items.map((item) => Object.keys(categoryAliases).find((key) => item.category.toLowerCase().includes(key.toLowerCase().split(' ')[0]))).filter(Boolean));
  const feeds = MARKET_NEWS_FEEDS.filter((feed) => selectedCategoryKeys.has(feed.category));
  const results = await Promise.all(feeds.map(async (feed) => {
    try {
      const response = await fetch(feed.url, { headers: { 'User-Agent': 'Tradebilia-TestAI/1.0 (+https://tradebilia.com)' }, signal: AbortSignal.timeout(7000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { items: parseFeed(await response.text(), feed), error: null };
    } catch (error) {
      return { items: [], error: `${feed.source} (${feed.category}): ${error instanceof Error ? error.message : 'unavailable'}` };
    }
  }));
  const all = results.flatMap((result) => result.items);
  feedErrors.push(...results.flatMap((result) => result.error ? [result.error] : []));
  const unique = [...new Map(all.map((item) => [`${item.url}|${item.title.toLowerCase()}`, item])).values()];
  const selectedCategories = [...new Set(items.map((item) => Object.keys(categoryAliases).find((key) => item.category.toLowerCase().includes(key.toLowerCase().split(' ')[0])) as MarketNewsCategory | undefined).filter(Boolean) as MarketNewsCategory[])];
  return { feedsChecked: feeds.length, feedErrors, itemA: items[0] ? matchMarketNews(unique, items[0]) : [], itemB: items[1] ? matchMarketNews(unique, items[1]) : [], categorySummaries: summarizeCategoryMarketNews(unique, selectedCategories), fetchedAt: new Date().toISOString() };
}

export function getMarketNewsFeedRegistry() {
  return MARKET_NEWS_FEEDS.map(({ source, sourceType, category, url }) => ({ source, sourceType, category, url }));
}
