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

type FeedDefinition = {
  source: string;
  sourceType: 'official' | 'specialist';
  category: MarketNewsCategory;
  url: string;
};

export const MARKET_NEWS_FEEDS: FeedDefinition[] = [
  { source: 'The Beat', sourceType: 'specialist', category: 'Comics', url: 'https://www.comicsbeat.com/feed/' },
  { source: 'Sports Collectors Daily', sourceType: 'specialist', category: 'Sports Cards', url: 'https://www.sportscollectorsdaily.com/feed/' },
  { source: 'Auction Report', sourceType: 'specialist', category: 'Sports Cards', url: 'https://www.auctionreport.com/feed/' },
  { source: 'Cardboard Connection', sourceType: 'specialist', category: 'Sports Cards', url: 'https://www.cardboardconnection.com/feed' },
  { source: 'Toy News International', sourceType: 'specialist', category: 'Vintage Toys', url: 'https://toynewsi.com/rss' },
  { source: 'The Toy Book', sourceType: 'specialist', category: 'Vintage Toys', url: 'https://toybook.com/feed/' },
  { source: 'GamesIndustry.biz', sourceType: 'specialist', category: 'Video Games', url: 'https://www.gamesindustry.biz/feeds' },
  { source: 'Video Games Chronicle', sourceType: 'specialist', category: 'Video Games', url: 'https://www.videogameschronicle.com/feed/' },
  { source: 'PokéBeach', sourceType: 'specialist', category: 'Pokemon / TCG', url: 'https://www.pokebeach.com/forums/forum/-/index.rss' },
  { source: 'Variety Film', sourceType: 'specialist', category: 'Movies', url: 'https://feeds.feedburner.com/variety/news/film' },
  { source: 'Auction Report', sourceType: 'specialist', category: 'Autographs', url: 'https://www.auctionreport.com/feed/' },
  { source: 'Autograph Magazine Live', sourceType: 'specialist', category: 'Autographs', url: 'https://live.autographmagazine.com/activity/log/list?fmt=rss' },
  { source: 'Disney Parks Blog', sourceType: 'official', category: 'Disney Pins', url: 'https://disneyparksblog.com/feed/' },
  { source: 'Disney Pins Blog', sourceType: 'specialist', category: 'Disney Pins', url: 'https://disneypinsblog.com/feed/' },
  { source: 'Music Business Worldwide', sourceType: 'specialist', category: 'Music', url: 'https://www.musicbusinessworldwide.com/feed/' },
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

export async function fetchMarketNewsForItems(items: Array<{ title: string; category: string; itemType?: string; itemDetails?: string }>): Promise<{ feedsChecked: number; feedErrors: string[]; itemA: MarketNewsItem[]; itemB: MarketNewsItem[]; fetchedAt: string }> {
  const feedErrors: string[] = [];
  const selectedCategories = new Set(items.map((item) => Object.keys(categoryAliases).find((key) => item.category.toLowerCase().includes(key.toLowerCase().split(' ')[0]))).filter(Boolean));
  const feeds = MARKET_NEWS_FEEDS.filter((feed) => selectedCategories.has(feed.category));
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
  return { feedsChecked: feeds.length, feedErrors, itemA: items[0] ? matchMarketNews(unique, items[0]) : [], itemB: items[1] ? matchMarketNews(unique, items[1]) : [], fetchedAt: new Date().toISOString() };
}

export function getMarketNewsFeedRegistry() {
  return MARKET_NEWS_FEEDS.map(({ source, sourceType, category, url }) => ({ source, sourceType, category, url }));
}
