import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('manual Test AI selector boundary', () => {
  const source = fs.readFileSync(path.resolve(import.meta.dirname, '../client/src/pages/TestAI.tsx'), 'utf8');

  it('retains manual source state while highlighting sources applicable to the loaded item', () => {
    expect(source).toContain('const [leftSources, setLeftSources] = useState<Set<SourceId>>');
    expect(source).toContain('function SourceSelector');
    expect(source).toContain('getEligibleTestAiSources');
    expect(source).toContain('applicableSourceIds');
    expect(source).toContain('border-yellow-400');
    expect(source).toContain('Yellow border = applicable and not yet test-confirmed');
    expect(source).toContain("'comics:ebay_active': 'match'");
    expect(source).toContain("'sports cards:ebay_active': 'match'");
    expect(source).toContain("'sports cards:the_card_api': 'match'");
    expect(source).toContain("id: 'comc_parse'");
    expect(source).toContain('Active COMC asking-price inventory only');
    expect(source).toContain('Analyzer: NO — active asking-price context only.');
    expect(source).toContain("'comics:comic_book_realm': 'match'");
    expect(source).toContain("'comics:comicconnect': 'match'");
    expect(source).toContain("'comics:goldin': 'match'");
    expect(source).toContain("'coins:sold_comps': 'match'");
    expect(source).toContain("'coins:ebay_active': 'match'");
    expect(source).toContain("'coins:goldin': 'match'");
    expect(source).toContain("'coins:weiss': 'match'");
    expect(source).toContain("'sports cards:goldin': 'match'");
    expect(source).toContain("'sports cards:sirius_sports_auctions': 'match'");
    expect(source).toContain('border-green-400');
    expect(source).toContain('border-red-400');
    expect(source).toContain("source.id === 'lcg'");
    expect(source).toContain('403 error');
  });

  it('omits NGC Auction Central from the pending coverage tracker without removing the source registry', () => {
    expect(source).toContain("const SOURCE_COVERAGE_EXCLUDED_PENDING_SOURCE_IDS = new Set(['ngc'])");
    expect(source).toContain('!SOURCE_COVERAGE_EXCLUDED_PENDING_SOURCE_IDS.has(source.id)');
    expect(source).toContain('SANDBOX_SPECIALIST_SOURCES');
    expect(source).toContain("source.id !== 'ngc' && !isSandboxSiteBlockedSource(source.id)");
  });

  it('shows TCGdex, IGDB, and user-approved RAWG as factual specialist reference sources', () => {
    expect(source).toContain("label: 'TCGdex Pokémon Catalog'");
    expect(source).toContain("status: 'live' as const");
    expect(source).toContain('Not a price, certification, authenticity, condition, or ownership source');
    expect(source).toContain("label: 'IGDB Video Game Catalog'");
    expect(source).toContain('Commercially approved read-only game identification metadata');
    expect(source).toContain('getIgdbGameMetadata.useQuery');
    expect(source).toContain("label: 'RAWG Video Game Catalog'");
    expect(source).toContain("description: 'User-approved read-only Video Game catalog metadata");
    expect(source).toContain('getRawgGameMetadata.useQuery');
    expect(source).toContain('function RawgSection');
    expect(source).not.toContain('RawgSetupSection');
    expect(source).toContain("label: 'Discogs Music Catalog'");
    expect(source).toContain('getDiscogsReleases.useQuery');
    expect(source).toContain('function DiscogsSection');
    expect(source).toContain('not affiliated with, sponsored or endorsed by Discogs');
  });

  it('uses the structured Music release title rather than the listing title for Discogs requests', () => {
    expect(source).toContain('releaseTitle?: string;');
    expect(source).toContain('const releaseTitle = (item.releaseTitle ??');
    expect(source).toContain('releaseTitle,\n    category: item.category');
    expect(source).toContain('enabled: isMusic && releaseTitle.length >= 2');
    expect(source).toContain('The listing title is not used for this lookup.');
    expect(source).toContain('Artist / Performer:</span> {release.artist');
  });

  it('shows the exact Discogs Music search criteria in the Evidence Review', () => {
    expect(source).toContain('const discogsSearchCriteria = useMemo');
    expect(source).toContain('Discogs search criteria');
    expect(source).toContain('Album / Release Title:');
    expect(source).toContain('Artist / Performer:');
    expect(source).toContain('Release Year:');
    expect(source).toContain('If the year returns no candidate, Discogs retries without it.');
    expect(source).toContain('Listing title, format, label, catalog number, and country are not used as filters.');
  });

  it('shows conditional Sports Cards Unopened Product search criteria in Evidence Review', () => {
    expect(source).toContain('sportsUnopenedSearchCriteria');
    expect(source).toContain('Sport:');
    expect(source).toContain('Product Format:');
    expect(source).toContain('Authentication Company:');
    expect(source).toContain('From a Sealed Case:');
    expect(source).toContain('Authentication Company is included only when Authenticated is Yes');
    expect(source).toContain('exact token FASC is included only when From a Sealed Case is Yes');
  });

  it('keeps selected-item metadata bubbles readable on dark cards', () => {
    expect(source).toContain('text-slate-100 border-slate-500/70');
    expect(source).toContain('bg-slate-900/70 text-[10px] text-slate-100 border-slate-400/80');
  });

  it('passes each loaded item into both source selectors so applicability is evaluated per side', () => {
    expect(source).toContain('side="left" item={leftItem}');
    expect(source).toContain('side="right" item={rightItem}');
    expect(source).toContain('Applicable to the loaded item.');
  });

  it('shows bounded specialist lookup contracts without treating unresolved sources as live valuation inputs', () => {
    expect(source).toContain('getSpecialistMarketplaceData.useQuery');
    expect(source).toContain('Bounded automatic public lookup');
    expect(source).toContain('Bounded public locator lookup');
    expect(source).toContain('Public contract not sufficient for automated lookup');
    expect(source).toContain('No request is sent. This source stays visible for audit');
    expect(source).toContain('No specialist record from this panel affects valuation');
    expect(source).toContain("source.id !== 'comicconnect'");
    expect(source).toContain('buyer premium = all-in context');
  });

  it('renders a deterministic evidence review beside the existing provider panels without changing manual source selection', () => {
    expect(source).toContain("from '@shared/testAiEvidenceNormalization'");
    expect(source).toContain('function EvidenceNormalizationSummary');
    expect(source).toContain('Deterministic identity and evidence check. It preserves source facts and does not calculate a value.');
    expect(source).toContain('Evidence Review flag legend');
    expect(source).toContain('a selected source differs on a key identity field. Review before comparing.');
    expect(source).toContain('both facts may be valid, such as global versus regional release dates.');
    expect(source).toContain('no result or service issue; it is not negative proof about the item.');
    expect(source).toContain('<EvidenceNormalizationSummary item={item}');
    expect(source).toContain('getEligibleTestAiSources');
    expect(source).toContain('setLeftEvidenceSummary(null)');
    expect(source).toContain('setRightEvidenceSummary(null)');
  });

  it('shows The Card API sales request in the visible query banner', () => {
    expect(source).toContain('function TheCardApiSection');
    expect(source).toContain('query={data?.request?.salesPath || data?.query}');
  });

  it('explains whether each The Card API sale can enter analyzer valuation', () => {
    expect(source).toContain('Analyzer: YES — submitted as a completed-sale candidate');
    expect(source).toContain('NOT direct valuation — grade mismatch');
    expect(source).toContain('sale has no compatible grade evidence');
    expect(source).toContain('target is raw/ungraded while sale is graded');
    expect(source).toContain('final identity, date, currency, duplicate, and comparable gates still apply');
  });

  it('shows analyzer-use status for every completed-sale panel family', () => {
    expect(source).toContain('function AnalyzerUseLine');
    expect(source).toContain('explicit sold status and price passed the archive gate');
    expect(source).toContain('active or fixed-price data cannot establish completed-sale valuation');
    expect(source).toContain('historical or undated data is retained for context');
    expect(source).toContain('identity mismatch prevents direct valuation');
    expect(source).toContain('Exclusion reason:');
  });

  it('shows completed-sale totals alongside analyzer-submitted totals in market evidence classification', () => {
    expect(source).toContain('analyzerSubmittedSaleCount');
    expect(source).toContain('market: { completedSaleCount: confirmedRecent, analyzerSubmittedSaleCount: analyzerSubmittedSales.length');
    expect(source).toContain('cardApiAnalyzerSubmittedSales');
    expect(source).toContain('completedCandidates');
    expect(source).toContain('analyzerSubmittedPrices: submittedPrices');
    expect(source).toContain('analyzerSubmittedSaleCount: analyzerSubmitted.length');
    expect(source).toContain('Number(soldCompsData?.audit?.valuationEligible ?? accepted.length)');
    expect(source).toContain('How the analyzer uses the selected sources');
    expect(source).toContain('sourceDecisions');
    expect(source).toContain('Accepted for valuation');
    expect(source).toContain('Historical trend');
    expect(source).toContain('Context only');
  });

  it('makes PCGS historical rows visible without loosening conservative valuation rules', () => {
    expect(source).toContain('historicalRowsLabel');
    expect(source).toContain('Jump to loaded rows');
    expect(source).toContain('Valuation candidates');
    expect(source).toContain('The rows are loaded and shown below. Context-only rows are not lost');
    expect(source).toContain('id={`pcgs-history-rows-${side}`}');
  });

  it('keeps Numista catalogue estimates as reference-only evidence', () => {
    expect(source).toContain("id: 'numista', label: 'Numista Coin Catalog', kind: 'reference', role: 'reference_context'");
    expect(source).toContain('Catalogue estimate · reference only');
    expect(source).toContain('does not enter analyzer valuation or completed-sale counts');
    expect(source).not.toContain("role: numistaQuery.data?.data?.guideValue ? 'valuation_candidate'");
  });

  it('exposes full Cardsight pricing, population, marketplace, and time-series details for review', () => {
    expect(source).toContain('Full pricing details');
    expect(source).toContain('Pricing time series');
    expect(source).toContain('Full population details');
    expect(source).toContain('Full marketplace details');
    expect(source).toContain('data?.pricingDetails');
    expect(source).toContain('data?.pricingTimeseriesDetails');
    expect(source).toContain('data?.populationDetails');
    expect(source).toContain('data?.marketplaceDetails');
  });
});
