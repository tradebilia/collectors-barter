export type TestAiSourceId = 'ebay_active' | 'sold_comps' | 'psa' | 'bgs' | 'sgc' | 'pcgs' | 'pricecharting' | 'one_thirty_point' | 'pwcc' | 'wikidata' | 'smithsonian';

export type SourceEligibilityContext = { category: string; gradingCompany?: string | null; hasTitle?: boolean };

export type SourceApplicability = {
  sourceId: TestAiSourceId;
  categories: '*' | string[];
  requires?: 'title' | 'PSA certificate' | 'BGS certificate' | 'SGC certificate' | 'PCGS certificate';
  purpose: string;
  historicalLimit?: string;
};

export const TEST_AI_SOURCE_APPLICABILITY: readonly SourceApplicability[] = [
  { sourceId: 'ebay_active', categories: '*', requires: 'title', purpose: 'Current asking-price research across all Tradebilia categories.' },
  { sourceId: 'sold_comps', categories: '*', requires: 'title', purpose: 'Completed eBay-sale research across all Tradebilia categories.' },
  { sourceId: 'psa', categories: ['sports cards', 'pokemon'], requires: 'PSA certificate', purpose: 'PSA card certification, population, and certification sales.' },
  { sourceId: 'bgs', categories: ['sports cards', 'pokemon'], requires: 'BGS certificate', purpose: 'BGS card certification, subgrades, and population.' },
  { sourceId: 'sgc', categories: ['sports cards', 'pokemon'], requires: 'SGC certificate', purpose: 'SGC card certification data.' },
  { sourceId: 'pcgs', categories: ['coins'], requires: 'PCGS certificate', purpose: 'Official PCGS CoinFacts certification and reference data.' },
  { sourceId: 'pricecharting', categories: ['pokemon'], requires: 'title', purpose: 'Pokémon card price-guide reference.' },
  { sourceId: 'one_thirty_point', categories: ['sports cards', 'pokemon'], requires: 'title', purpose: 'Multi-marketplace completed-sale trend research.', historicalLimit: 'Use individually dated records as trend context; do not treat older results as current-value comparables.' },
  { sourceId: 'pwcc', categories: ['sports cards', 'pokemon'], requires: 'title', purpose: 'PWCC / Fanatics Collect sold graded-card research.', historicalLimit: 'Use only Sold listings and retain date context; do not calculate an unqualified current average.' },
  { sourceId: 'wikidata', categories: ['movies', 'autographs'], requires: 'title', purpose: 'Public factual reference metadata only; never valuation, authentication, or certification.' },
  { sourceId: 'smithsonian', categories: ['stamps'], requires: 'title', purpose: 'National Postal Museum reference metadata only; never valuation, authentication, or certification.' },
];

function normalizeCategory(category: string): string { return category.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' '); }
function certificateRequirementMet(requirement: SourceApplicability['requires'], company: string | null | undefined): boolean {
  if (!requirement || requirement === 'title') return true;
  return requirement.replace(' certificate', '').toUpperCase() === (company ?? '').trim().toUpperCase();
}

export function getEligibleTestAiSources(context: SourceEligibilityContext): SourceApplicability[] {
  const category = normalizeCategory(context.category);
  return TEST_AI_SOURCE_APPLICABILITY.filter((source) => {
    const categoryMatches = source.categories === '*' || source.categories.includes(category);
    const titleMatches = source.requires !== 'title' || context.hasTitle !== false;
    return categoryMatches && titleMatches && certificateRequirementMet(source.requires, context.gradingCompany);
  });
}
