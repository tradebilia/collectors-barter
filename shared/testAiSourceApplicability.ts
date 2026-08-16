export const TRADEBILIA_CATEGORIES = [
  'comics',
  'sports_cards',
  'vintage_toys',
  'video_games',
  'stamps',
  'coins',
  'pokemon',
  'movies',
  'autographs',
  'disney_pins',
] as const;

export type TradebiliaCategory = typeof TRADEBILIA_CATEGORIES[number];

export type TestAiSourceId =
  | 'ebay_active'
  | 'ebay_sold'
  | 'sold_comps'
  | 'cgc'
  | 'psa'
  | 'bgs'
  | 'sgc'
  | 'pcgs'
  | 'ngc'
  | 'cbcs'
  | 'comic_book_realm'
  | 'pwcc'
  | 'heritage'
  | 'gocollect'
  | 'pricecharting'
  | 'one_thirty_point'
  | 'wikidata'
  | 'smithsonian';

export interface SourceApplicabilityRule {
  categories: readonly TradebiliaCategory[];
  requires?: readonly ('title' | 'certificate' | 'exact_match_review')[];
  note: string;
}

const ALL_CATEGORIES: readonly TradebiliaCategory[] = TRADEBILIA_CATEGORIES;
const GRADED_CARD_CATEGORIES = ['sports_cards', 'pokemon'] as const;

/**
 * Internal policy map for future automated Trade Room lookup recommendations.
 * Test AI deliberately keeps source selection manual: callers should consult this
 * map for eligibility and explanation, not use it to silently enable sources.
 */
export const TEST_AI_SOURCE_APPLICABILITY: Readonly<Record<TestAiSourceId, SourceApplicabilityRule>> = {
  ebay_active: { categories: ALL_CATEGORIES, requires: ['title', 'exact_match_review'], note: 'General current eBay listings; manual exact-item review remains required.' },
  ebay_sold: { categories: ALL_CATEGORIES, requires: ['title', 'exact_match_review'], note: 'General eBay completed-sale source when activated; manual exact-item review remains required.' },
  sold_comps: { categories: ALL_CATEGORIES, requires: ['title', 'exact_match_review'], note: 'eBay-derived completed-sale evidence across all Tradebilia categories; individual matches are not a valuation.' },
  cgc: { categories: ['comics', 'sports_cards', 'pokemon', 'video_games', 'movies'], requires: ['certificate'], note: 'Use only for a supported CGC-certified item after approved data access is available.' },
  psa: { categories: GRADED_CARD_CATEGORIES, requires: ['certificate'], note: 'Use only for a PSA-graded sports card or Pokémon card certificate.' },
  bgs: { categories: GRADED_CARD_CATEGORIES, requires: ['certificate'], note: 'Use only for a Beckett/BGS-graded sports card or Pokémon card certificate.' },
  sgc: { categories: GRADED_CARD_CATEGORIES, requires: ['certificate'], note: 'Use only for an SGC-graded sports card or Pokémon card certificate.' },
  pcgs: { categories: ['coins'], requires: ['certificate'], note: 'Use only for a PCGS-certified coin.' },
  ngc: { categories: ['coins'], requires: ['certificate'], note: 'Use only for an NGC-certified coin after approved data access is available.' },
  cbcs: { categories: ['comics'], requires: ['certificate'], note: 'Use only for a CBCS-certified comic after an approved integration exists.' },
  comic_book_realm: { categories: ['comics'], requires: ['title', 'exact_match_review'], note: 'Comic-specific reference and market context only.' },
  pwcc: { categories: GRADED_CARD_CATEGORIES, requires: ['title', 'exact_match_review'], note: 'PWCC/Fanatics Collect sold listings for premium sports-card and Pokémon context; historical records are not current values.' },
  heritage: { categories: ALL_CATEGORIES, requires: ['title', 'exact_match_review'], note: 'Broad auction context when activated; confirm the exact collectible and grade.' },
  gocollect: { categories: ['comics'], requires: ['title', 'exact_match_review'], note: 'Comic-focused market analytics when activated.' },
  pricecharting: { categories: ['pokemon'], requires: ['title', 'exact_match_review'], note: 'Current implementation is limited to Pokémon card market reference data.' },
  one_thirty_point: { categories: ALL_CATEGORIES, requires: ['title', 'exact_match_review'], note: 'Historical completed-sale context only; use dated records qualitatively, never as an automatic current value.' },
  wikidata: { categories: ['movies', 'autographs'], requires: ['title'], note: 'Public factual reference metadata only; not pricing, certification, or authentication.' },
  smithsonian: { categories: ['stamps'], requires: ['title', 'exact_match_review'], note: 'National Postal Museum reference metadata only; not pricing, certification, or authentication.' },
};

export function getSourceApplicability(source: TestAiSourceId, category: string) {
  const rule = TEST_AI_SOURCE_APPLICABILITY[source];
  const normalizedCategory = category.trim().toLowerCase() as TradebiliaCategory;
  return {
    ...rule,
    isApplicable: rule.categories.includes(normalizedCategory),
  };
}
