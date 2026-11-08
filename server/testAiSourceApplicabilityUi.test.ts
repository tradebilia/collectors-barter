import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('manual Test AI selector boundary', () => {
  const source = fs.readFileSync(path.resolve(import.meta.dirname, '../client/src/pages/TestAI.tsx'), 'utf8');
  const outcomeSource = fs.readFileSync(path.resolve(import.meta.dirname, '../client/src/components/test-ai/SourceRunOutcomeSummary.tsx'), 'utf8');
  const routerSource = fs.readFileSync(path.resolve(import.meta.dirname, './testAIRouter.ts'), 'utf8');

  it('retains manual source state while highlighting sources applicable to the loaded item', () => {
    expect(source).toContain('const [leftSources, setLeftSources] = useState<Set<SourceId>>');
    expect(source).toContain('function SourceSelector');
    expect(source).toContain('getEligibleTestAiSources');
    expect(source).toContain('applicableSourceIds');
    expect(source).toContain('border-yellow-400');
    expect(source).toContain('Yellow border = applicable and not yet test-confirmed');
    expect(source).toContain("'comics:ebay_active': 'match'");
    expect(source).toContain("'sports cards:ebay_active': 'match'");
    expect(source).toContain("'vintage toys:ebay_active': 'match'");
    expect(source).toContain("'vintage toys:sold_comps': 'match'");
    expect(source).toContain("'vintage toys:goldin': 'match'");
    expect(source).toContain("'video games:ebay_active': 'match'");
    expect(source).toContain("'video games:sold_comps': 'match'");
    expect(source).toContain("'video games:mercari_sold_comps': 'match'");
    expect(source).toContain("'video games:goldin': 'match'");
    expect(source).toContain("'sports cards:the_card_api': 'match'");
    expect(source).toContain("id: 'comc_parse'");
    expect(source).toContain('Active COMC asking-price inventory only');
    expect(source).toContain('Analyzer: NO — active asking-price context only.');
    expect(source).toContain("'comics:comic_book_realm': 'match'");
    expect(source).toContain("'comics:comicconnect': 'match'");
    expect(source).toContain("'comics:goldin': 'match'");
    expect(source).toContain("'comics:sold_comps': 'match'");
    expect(source).toContain("'coins:sold_comps': 'match'");
    expect(source).toContain("'coins:ebay_active': 'match'");
    expect(source).toContain("'coins:goldin': 'match'");
    expect(source).toContain("'coins:weiss': 'match'");
    expect(source).toContain("'coins:numista': 'match'");
    expect(source).toContain("'sports cards:goldin': 'match'");
    expect(source).toContain("'sports cards:sirius_sports_auctions': 'match'");
    expect(source).toContain('border-green-400');
    expect(source).toContain('border-red-400');
    expect(source).toContain("source.id === 'lcg'");
    expect(source).toContain('403 error');
  });

  it('labels received fields separately from the actual provider search', () => {
    expect(source).toContain('Structured fields received:');
    expect(source).toContain('Actual search sent:');
    expect(source).not.toContain('<span className="font-semibold">Structured fields:</span>');
  });

  it('omits NGC Auction Central from the pending coverage tracker without removing the source registry', () => {
    expect(source).toContain("const SOURCE_COVERAGE_EXCLUDED_PENDING_SOURCE_IDS = new Set(['ngc'])");
    expect(source).toContain('!SOURCE_COVERAGE_EXCLUDED_PENDING_SOURCE_IDS.has(source.id)');
    expect(source).toContain('SANDBOX_SPECIALIST_SOURCES');
    expect(source).toContain("source.id !== 'ngc' && !isSandboxSiteBlockedSource(source.id)");
  });

  it('counts pending category/source items separately when the same API serves multiple categories', () => {
    expect(source).toContain('categories.reduce((total, entry) => total + entry.pendingSourceIds.length, 0)');
    expect(source).not.toContain('new Set(categories.flatMap((entry) => entry.pendingSourceIds)).size');
  });

  it('never duplicates a confirmed category/source match in the pending tracker', () => {
    expect(source).toContain("'vintage toys:goldin': 'match'");
    expect(source).toContain("'movies:ebay_active': 'match'");
    expect(source).toContain("'movies:sold_comps': 'match'");
    expect(source).toContain("'movies:mercari_sold_comps': 'match'");
    expect(source).toContain("'autographs:ebay_active': 'match'");
    expect(source).toContain("'autographs:sold_comps': 'match'");
    expect(source).toContain("'autographs:goldin': 'match'");
    expect(source).toContain('const SOURCE_COVERAGE_CONFIRMED_MATCHES = new Set([');
    expect(source).toContain('SOURCE_COVERAGE_CONFIRMED_MATCHES.has(key)');
    expect(source).toContain('!SOURCE_COVERAGE_CONFIRMED_MATCHES.has(`${category}:${source.sourceId}`)');
    expect(source).toContain('const categories = SOURCE_COVERAGE_CATEGORY_ORDER.map((category) => {');
  });

  it('keeps the clean-start policy limited to the explicitly approved category/source paths', () => {
    expect(source).not.toContain('SOURCE_COVERAGE_RESET_TO_PENDING');
    expect(source).toContain('historical match results remain above for');
    expect(source).toContain('auditability, but only explicitly approved category/source paths');
    expect(source).toContain('category/source pairs remain Pending');
    expect(source).toContain("return SOURCE_TEST_RESULTS[key] === 'match' && SOURCE_COVERAGE_CONFIRMED_MATCHES.has(key);");
  });

  it('places the three approved Disney Pins source tests in Matching', () => {
    expect(source).toContain("'disney pins:ebay_active': 'match'");
    expect(source).toContain("'disney pins:sold_comps': 'match'");
    expect(source).toContain("'disney pins:mercari_sold_comps': 'match'");
    expect(source).toContain("'disney pins:ebay_active'");
    expect(source).toContain("'disney pins:sold_comps'");
    expect(source).toContain("'disney pins:mercari_sold_comps'");
  });

  it('places the three approved Music source tests in Matching', () => {
    expect(source).toContain("'music:ebay_active': 'match'");
    expect(source).toContain("'music:sold_comps': 'match'");
    expect(source).toContain("'music:mercari_sold_comps': 'match'");
    expect(source).toContain("'music:ebay_active'");
    expect(source).toContain("'music:sold_comps'");
    expect(source).toContain("'music:mercari_sold_comps'");
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
    expect(source).toContain('Show all returned RAWG metadata');
    expect(source).toContain('Show all returned IGDB metadata');
    expect(source).toContain('JSON.stringify(data.data.metadata, null, 2)');
    expect(source).toContain('function CatalogExtendedFacts');
    expect(source).toContain('Extended catalog facts');
    expect(source).not.toContain("add('Cover & media'");
    expect(source).not.toContain("add('Links & stores'");
    expect(source).not.toContain("add('Tags / keywords'");
    expect(source).toContain("'video games:igdb': 'match'");
    expect(source).toContain("'video games:rawg': 'match'");
    expect(source).toContain('Regional releases');
    expect(source).toContain('Related games');
    expect(source).toContain('Full linked objects are included below');
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

  it('keeps Goldin video-game search criteria grader-free and refreshes stale specialist responses', () => {
    expect(source).toContain('omitGradingCriteria');
    expect(source).toContain("source.id === 'goldin'");
    expect(source).toContain("refetchOnMount: 'always'");
    expect(source).toContain('function buildGoldinVideoGameDisplayQuery');
    expect(source).toContain("firstText('releaseYear', 'year')");
    expect(source).toContain('const visibleQuery = omitGradingCriteria ? gradeFreeGoldinQuery : data?.query');
    expect(source).toContain('const visibleMessages = data?.messages?.map');
  });

  it('routes Goldin through the shared visual review and displays metadata ranking fields', () => {
    expect(source).toContain('imageUrl: item.primaryPhotoUrl ?? undefined');
    expect(source).toContain('itemType: item.itemType ?? undefined');
    expect(source).toContain("source.id === 'goldin' && (data as any)?.visualFilter");
    expect(source).toContain('sourceLabel="Goldin specialist records"');
    expect(source).toContain('<MetadataMatchLine listing={record} />');
  });

  it('stabilizes specialist observations before passing them into the summary effect', () => {
    expect(source).toContain('const specialistObservationList = useMemo(() => Object.values(specialistObservations), [specialistObservations]);');
    expect(source).toContain('specialistObservations={specialistObservationList}');
    expect(source).not.toContain('specialistObservations={Object.values(specialistObservations)}');
  });

  it('uses brand, line, and toy name for Goldin Vintage Toys criteria', () => {
    expect(source).toContain('function buildGoldinVintageToyDisplayQuery');
    expect(source).toContain("firstText('brand', 'brandName', 'manufacturer')");
    expect(source).toContain("firstText('line', 'franchise')");
    expect(source).toContain("firstText('toyName', 'toyNameCharacter', 'vehicleName', 'playsetName', 'gamePuzzleName', 'modelKitName')");
    expect(source).toContain("const goldinVintageToy = sourceId === 'goldin' && normalizedCategory === 'vintage toys'");
    expect(source).toContain('sourceId={source.id}');
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
    expect(source).toContain("const acceptedValuationListings = rankedListings.filter((listing: any) => listing.evidenceDisposition === 'valuation_eligible' && Number(listing.price) > 0);");
    expect(source).toContain('Accepted for valuation candidates');
    expect(source).toContain('Completed sales that passed the Sold-Comps evidence gate. Final analyzer comparable-selection rules still apply.');
  });

  it('keeps Goldin valuation sales on the shared evidence disposition gate', () => {
    expect(routerSource).toContain("record.completed && record.evidenceDisposition === 'valuation_eligible'");
    expect(routerSource).toContain('Do not rebuild Goldin');
    expect(routerSource).not.toContain("sales: allReviewed.filter((record: any) => record.completed && record.identityMatched)");
    expect(source).toContain('const authoritativeSales = useMemo');
    expect(source).toContain('visualFilter?.contextListings');
    expect(source).toContain('visualFilter?.listings');
    expect(source).toContain('onSales?.(authoritativeSales)');
    expect(source).toContain('source.id === \'goldin\'\n      ? authoritativeSales.filter');
    expect(source).toContain("const goldinAutographMarket = source.id === 'goldin' && normalizedCategory === 'autographs'");
    expect(source).toContain('shared Autographs signer/object/score gate');
  });

  it('discloses the high-value Sold-Comps price safety gate and its exclusion treatment', () => {
    expect(source).toContain("HIGH_VALUE_SOLD_COMP_TRADE_VALUE_THRESHOLD");
    expect(source).toContain('High-value price safety check');
    expect(source).toContain('formatWholeDollar(HIGH_VALUE_SOLD_COMP_TRADE_VALUE_THRESHOLD)');
    expect(source).toContain('below {formatWholeDollar(priceSafetyMinimum!)} or above {formatWholeDollar(priceSafetyMaximum!)} are excluded from valuation and retained as context only');
    expect(source).toContain('only sold comps from 25% to 250% of the stated trade value can enter valuation');
    expect(source).toContain('high-value price safety gate:');
  });

  it('shows completed-sale totals alongside analyzer-submitted totals in market evidence classification', () => {
    expect(source).toContain('analyzerSubmittedSaleCount');
    expect(source).toContain('market: { returnedRecordCount: sales.length, completedSaleCount: confirmedRecent, analyzerSubmittedSaleCount: analyzerSubmittedSales.length');
    expect(source).toContain('returnedRecordCount: listings.length');
    expect(source).toContain('cardApiAnalyzerSubmittedSales');
    expect(source).toContain('completedCandidates');
    expect(source).toContain('analyzerSubmittedPrices: submittedPrices');
    expect(source).toContain('analyzerSubmittedSaleCount: analyzerSubmitted.length');
    expect(source).toContain('analyzerSubmittedSaleCount: accepted.length');
    expect(source).toContain('Do not trust a separately carried audit counter here; it can be');
    expect(source).not.toContain('Number(soldCompsData?.audit?.valuationEligible ?? accepted.length)');
    expect(source).toContain('How the analyzer uses the selected sources');
    expect(source).toContain('sourceDecisions');
    expect(source).toContain('Accepted for valuation');
    expect(source).toContain('Historical trend');
    expect(source).toContain('Context only');
  });

  it('shows the exact records sent to the analyzer for every source decision', () => {
    expect(source).toContain('function AnalyzerRecordPanel');
    expect(source).toContain('Items sent to analyzer');
    expect(source).toContain('adapter did not return display-level record details');
    expect(source).toContain('No {sourceLabel} records are being sent to the analyzer');
    expect(source).toContain('<AnalyzerRecordPanel records={decision.analyzerRecords} acceptedCount={decision.accepted} sourceLabel={decision.label} />');
    expect(source).toContain('analyzerRecords: accepted.map');
    expect(source).toContain('analyzerRecords: currentValue.map');
    expect(source).toContain('function visualReviewAcceptedRecords');
    expect(source).toContain('cardApiAnalyzerSubmittedSales(visualReviewAcceptedRecords(sales, theCardApiData))');
    expect(source).toContain('sales.filter((sale: any) => sale.completed && Number(sale.price) > 0),\n        cardsightAiData');
    expect(source).toContain('visualReviewAcceptedRecords(\n        sales.filter');
    expect(source).toContain("const accepted = listings.filter((listing: any) => listing.evidenceDisposition === 'valuation_eligible' && Number(listing.price) > 0);");
    expect(source).toContain('server has already applied the shared evidence gate and the final');
    expect(source).toContain('visualReviewAcceptedRecords(\n        sales.filter((sale: any) => Number(sale.price ?? sale.finalPrice) > 0),\n        oneThirtyPointData');
    expect(source).toContain('visualReviewAcceptedRecords(\n        sales.filter((sale: any) => Number(sale.price ?? sale.finalPrice) > 0),\n        pwccQuery.data');
    expect(source).toContain('Identity-matched active asking price; not a completed sale.');
    expect(source).toContain('AI image checks are required before visually supported eBay Active listings can enter current-value evidence');
    expect(source).toContain('const recordCount = records.length > 0 ? records.length : acceptedCount;');
  });

  it('uses one shared Sold-Comps response for Evidence Review and the provider panel', () => {
    expect(source).toContain('function SoldCompsSection({ item, side, data, isLoading }');
    expect(source).toContain('data={soldCompsData} isLoading={soldCompsLoading}');
    expect(source).toContain('statedTradeValue: leftItem?.estimatedValue ?? undefined');
    expect(source).toContain('statedTradeValue: rightItem?.estimatedValue ?? undefined');
    expect(source).not.toContain('function SoldCompsSection({ item, side }: { item: SelectedItem; side: \'left\' | \'right\' })');
    expect(source).not.toContain('trpc.testAI.getSoldCompsData.useQuery(\n    { title: item.title');
  });

  it('shows process complete only after final marketplace results are ready', () => {
    expect(source).toContain('function ProcessCompleteNotice()');
    expect(source).toContain('✓ Process complete — final source results are displayed below.');
    expect(source).toContain('const resultsReady = !isLoading;');
    expect(source).toContain('const resultsReady = !isLoading && !(reviewBaseEnabled && visualReviewLoading);');
    expect(source.match(/<ProcessCompleteNotice \/>/g)?.length).toBe(3);
  });

  it('keeps the redundant current-run source-outcome panel out of the primary result', () => {
    expect(source).not.toContain("import { SourceRunOutcomeSummary }");
    expect(source).not.toContain('<SourceRunOutcomeSummary sourceDecisions={sourceDecisions} />');
    expect(outcomeSource).toContain('summarizeTestAiSourceRunOutcomes');
    expect(outcomeSource).toContain('Where the pricing evidence is going');
    expect(outcomeSource).toContain('Sent to valuation');
    expect(outcomeSource).toContain('Current-value');
    expect(outcomeSource).toContain('Historical trend');
    expect(outcomeSource).toContain('Context only');
    expect(outcomeSource).toContain('Held out');
    expect(outcomeSource).toContain('<strong>{outcome.accepted}</strong> sent to valuation');
    expect(outcomeSource).toContain('Completed sales found: {outcome.completed}. Sent to valuation is the final accepted comparable count.');
    expect(outcomeSource).toContain('timed out');
  });

  it('keeps market-context evidence out of the visual-analyzer submission count', () => {
    expect(outcomeSource).not.toContain('sentToAnalyzer');
    expect(source).toContain('visualAnalysisRequired: !autographMarketContext');
    expect(source).toContain("listing.evidenceDisposition === 'valuation_eligible'");
  });

  it('requires eBay Active visual review before current-value evidence when images exist', () => {
    expect(source).toContain('useState(Boolean(item.primaryPhotoUrl))');
    expect(source).toContain('setReviewRequested(Boolean(item.primaryPhotoUrl))');
    expect(source).toContain('AI image checks are required before visually supported eBay Active listings can enter current-value evidence');
    expect(source).toContain('No target image is available, so eBay Active listings remain asking-price context only and cannot enter current-value analyzer evidence.');
    expect(source).not.toContain('Optional AI image checks');
  });

  it('uses the shared collapsible image checks for additional Sold-Comps sources', () => {
    expect(source).toContain('<MarketplaceVisualReview data={data} targetImageUrl={item.primaryPhotoUrl} sourceLabel={sourceLabel} />');
    expect(source).toContain("{reviewedListings.length} candidate image{reviewedListings.length === 1 ? '' : 's'} reviewed · {acceptedListings.length} valuation-eligible");
    expect(source).toContain("listing.visualReviewStatus !== 'not_reviewed'");
    expect(source).toContain('Where this pricing evidence is going');
    expect(source).toContain('same server-approved records shown below');
    expect(source).toContain('<strong>{acceptedListings.length}</strong><br />sent to valuation');
    expect(source).toContain('<strong>{currentValueListings.length}</strong><br />current-value');
    expect(source).toContain('<strong>{historicalTrendListings.length}</strong><br />historical trend');
    expect(source).toContain('<strong>{preVisionExcludedListings.length}</strong><br />held out');
    expect(source).toContain("<AnalyzerUseLine eligible={valuationEligible}");
    expect(source).toContain('Accepted for valuation; current-value versus historical-trend classification is shown in the source outcome summary.');
    expect(source).toContain("{open ? 'Hide image checks' : 'View image checks'}");
    expect(source).toContain('View full explanation');
    expect(source).toContain('const searchMetrics = data?.searchMetrics ?? data?.metrics;');
    expect(source).toContain('Executed search ladder');
    expect(source).toContain('Only the primary query ran because it returned provider records; no fallback search was needed.');
    expect(source).toContain('count unavailable');
  });

  it('keeps Mercari pre-visual context records visible with image transport and a no-image fallback', () => {
    expect(routerSource).toContain('visualReviewListings: [...annotatedListings, ...visualContextListings]');
    expect(routerSource).toContain('preVisionExcludedListings: visualContextListings');
    expect(routerSource).toContain('searchMetrics: result.metrics');
    expect(routerSource).toContain('imageUrl: listing.imageUrl ?? listing.thumbnailUrl ?? listing.imageUrls?.[0] ?? listing.images?.[0] ?? null');
    expect(source).toContain('const preVisionExcludedListings = sortAnalysisCandidates(data?.preVisionExcludedListings ?? []);');
    expect(source).toContain('Excluded or held-out candidates');
    expect(source).toContain('No retrieved candidates were excluded or held out before visual review.');
    expect(source).toContain('listing.imageUrl || listing.thumbnailUrl || listing.imageUrls?.[0] || listing.images?.[0] || null');
    expect(source).toContain('>No Image</span>');
    expect(source).toContain('className="h-full w-full object-contain"');
  });

  it('keeps the full metadata breakdown on Mercari candidates excluded before visual review', () => {
    const mercariStart = routerSource.indexOf('getMercariSoldCompsData: protectedProcedure');
    const mercariEnd = routerSource.indexOf('// SoldComps TCGplayer coverage', mercariStart);
    const mercariSection = routerSource.slice(mercariStart, mercariEnd);
    expect(mercariSection).toContain('metadataFieldComparisons: buildMetadataFieldComparisons(targetMetadata, item)');
    expect(mercariSection).toContain('metadataFieldComparisons: listing.metadataFieldComparisons ?? buildMetadataFieldComparisons(targetMetadata, listing)');
    expect(source).toContain('<MetadataComparisonTable listing={listing} />');
  });

  it('distinguishes direct comparables from current-value evidence in visual-match wording', () => {
    expect(source).toContain("statusLabel={currentValueEvidence ? 'Current-value evidence: INCLUDED' : undefined}");
    expect(source).toContain('The visual match is retained in current-value market evidence; it is not a completed-sale comparable.');
    expect(source).not.toContain(['Context / review only; the visual match did not receive a valuation-', 'eligible disposition.'].join(''));
    expect(source).toContain('Direct comparable: NO — not submitted as a direct valuation comparable');
  });
  it('keeps an explicit visual verdict in the reviewed count even if an adapter omits the requirement marker', () => {
    expect(source).toContain('function hasCompletedVisualReview(listing: any): boolean');
    expect(source).toContain("['match', 'rough_match', 'mismatch', 'unreadable'].includes(status)");
    expect(source).toContain('filter(({ listing }: { listing: any }) => hasCompletedVisualReview(listing))');
    expect(source).toContain("!hasCompletedVisualReview(listing) && listing.visualRequirement !== 'required'");
  });
  it('renders ranking score and rank through the shared candidate-row component', () => {
    expect(source).toContain('function MetadataMatchLine');
    expect(source).toContain('Metadata rank #');
    expect(source).toContain('<MetadataMatchLine listing={listing} />');
    expect(source).toContain('<MetadataMatchLine listing={l} />');
  });

  it('separates PCGS current-value candidates from historical trend rows', () => {
    expect(source).toContain('historicalRowsLabel');
    expect(source).toContain('Jump to loaded rows');
    expect(source).toContain('Current-value candidates');
    expect(source).toContain('Historical trend');
    expect(source).toContain('older approved rows are historical trend only');
    expect(source).toContain('server-approved PCGS bucket');
    expect(source).toContain("import { bucketPcgsAuctionRows } from '@shared/testAiPcgsAuctionBuckets'");
    expect(source).toContain('bucketPcgsAuctionRows(auctions)');
    expect(source).toContain('historyQueryVersion: 5');
    expect(source).toContain('id={`pcgs-history-rows-${side}`');
  });

  it('shows Numista catalogue estimates as a weighted guide input while preserving sale classification', () => {
    expect(source).toContain("id: 'numista', label: 'Numista Coin Catalog', kind: 'reference', role: numistaQuery.data?.data?.guideValue ? 'valuation_guide' : 'reference_context'");
    expect(source).toContain('enters the analyzer as a secondary guide anchor at a maximum 25% weight');
    expect(source).toContain('Catalogue estimate · analyzer guide · max 25%');
    expect(source).toContain('does not count toward completed-sale totals');
    expect(source).toContain('configured guide weight');
    expect(source).toContain('treatmentReason');
    expect(source).toContain('Visual identity fallback');
    expect(source).toContain('Image evidence never creates a value, changes the saved listing, or bypasses Numista confirmation.');
    expect(source).toContain('imageUrl: item.primaryPhotoUrl ?? undefined');
    expect(source).toContain('condition: item.condition ?? undefined');
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
