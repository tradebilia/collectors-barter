import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('manual Test AI selector boundary', () => {
  const source = fs.readFileSync(path.resolve(import.meta.dirname, '../client/src/pages/TestAI.tsx'), 'utf8');
  const outcomeSource = fs.readFileSync(path.resolve(import.meta.dirname, '../client/src/components/test-ai/SourceRunOutcomeSummary.tsx'), 'utf8');
  const routerSource = fs.readFileSync(path.resolve(import.meta.dirname, './testAIRouter.ts'), 'utf8');
  const rankingDisplaySource = fs.readFileSync(path.resolve(import.meta.dirname, '../shared/testAiRankingDisplay.ts'), 'utf8');
  const candidateLedgerSource = fs.readFileSync(path.resolve(import.meta.dirname, '../shared/testAiCandidateLedger.ts'), 'utf8');
  const candidateStatusSource = fs.readFileSync(path.resolve(import.meta.dirname, '../shared/testAiCandidateStatus.ts'), 'utf8');
  const masterListSource = fs.readFileSync(path.resolve(import.meta.dirname, '../client/src/components/TestAiCandidateMasterList.tsx'), 'utf8');
  const statusComponentSource = fs.readFileSync(path.resolve(import.meta.dirname, '../client/src/components/TestAiCandidateStatus.tsx'), 'utf8');
  const metadataTableSource = fs.readFileSync(path.resolve(import.meta.dirname, '../client/src/components/TestAiMetadataComparisonTable.tsx'), 'utf8');
  const sourceDisplaySource = fs.readFileSync(path.resolve(import.meta.dirname, '../shared/testAiSourceDisplay.ts'), 'utf8');
  const retrievalLadderSource = fs.readFileSync(path.resolve(import.meta.dirname, '../client/src/components/TestAiRetrievalLadder.tsx'), 'utf8');

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
    expect(source).toContain('Source-eligible candidates');
    expect(source).toContain('Completed sales that passed the Sold-Comps evidence gate. Final analyzer comparable-selection rules still apply.');
    expect(source).toContain('Source eligible — final use assessed separately');
    expect(source).toContain('Source context / review — not proof of final submission');
    expect(source).toContain('<TestAiCandidateStatus listing={listing} />');
    expect(statusComponentSource).toContain("['Execution', candidateExecutionFact(row, scope)], ['Identity result', candidateIdentityFact(row)], ['Pricing use', candidatePricingFact(row)]");
    expect(candidateStatusSource).toContain("label: 'Source eligible — final analysis not run'");
    expect(candidateStatusSource).toContain('const use = row.valuationUse?.use;');
    expect(candidateStatusSource).toContain('finalPricingUseLabels[use.code]');
    expect(source).not.toContain('Accepted for valuation candidates');
  });

  it('keeps Goldin valuation sales on the shared evidence disposition gate', () => {
    expect(routerSource).toContain("record.completed && record.evidenceDisposition === 'valuation_eligible'");
    expect(routerSource).toContain('Do not rebuild Goldin');
    expect(routerSource).not.toContain("sales: allReviewed.filter((record: any) => record.completed && record.identityMatched)");
    expect(source).toMatch(/import \{[^}]*\bsourceReviewedGoldinSales\b[^}]*\} from '@shared\/testAiSourceDisplay';/);
    expect(source).toContain(`  const authoritativeSales = useMemo(() => {
    if (source.id !== 'goldin') return data?.sales ?? [];
    return sourceReviewedGoldinSales(data);
  }, [data, source.id]);`);
    expect(sourceDisplaySource).toContain(`export function sourceReviewedGoldinSales(data: any): any[] {
  const sales = Array.isArray(data?.sales) ? data.sales : [];
  const context = Array.isArray(data?.context) ? data.context : [];
  const mapped = [...sales, ...context];
  const hasMapping = mapped.some((row) => row?.sourceEconomics?.policy === 'stage6-named-source-mapping-v1');
  const reviewed = hasMapping ? mapped : [
    ...(Array.isArray(data?.visualFilter?.listings) ? data.visualFilter.listings : []),
    ...(Array.isArray(data?.visualFilter?.contextListings) ? data.visualFilter.contextListings : []),
  ];
  return reviewed.filter((record) => record.completed === true && record.evidenceDisposition === 'valuation_eligible');
}`);
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

  it('keeps completed-sale and source-eligible classifications separate from actual final submission and use', () => {
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
    expect(source).toContain('Source-stage treatment of selected sources');
    expect(source).toContain('These overlapping source classifications are not final request or pricing-use counts.');
    expect(source).toContain('sourceDecisions');
    expect(source).toContain('<strong>{decision.accepted}</strong> source eligible');
    expect(source).toContain('Sale candidates eligible at source; actual final intake and use are assessed separately.');
    expect(source).toContain('Source-stage price observations (currency unspecified; not final prices):');
    expect(source).toContain('Historical trend');
    expect(source).toContain('Context only');
  });

  it('shows source-stage records for every source decision without claiming actual final request receipts', () => {
    expect(source).toContain('function AnalyzerRecordPanel');
    expect(source).toContain('Source-stage eligible / contextual records ({recordCount})');
    expect(source).toContain('adapter did not return display-level record details');
    expect(source).toContain('classified at source stage (not actual request receipts)');
    expect(source).toContain('No {sourceLabel} source-stage records are available under this run’s current treatment.');
    expect(source).toContain('<AnalyzerRecordPanel records={decision.analyzerRecords} acceptedCount={decision.accepted} sourceLabel={decision.label} sourceKind={decision.kind} />');
    expect(source).toContain('function AnalyzerRecordPanel({ records, acceptedCount, sourceLabel, sourceKind }: { records: AnalyzerRecordDetail[]; acceptedCount: number; sourceLabel: string; sourceKind?: string })');
    expect(source).toContain('sourceRecordBucketLabel(record.bucket, sourceKind)');
    expect(source).toMatch(/import \{[^}]*\bsourceRecordBucketLabel\b[^}]*\} from '@shared\/testAiSourceDisplay';/);
    expect(source).toMatch(/import \{[^}]*\bsourceMetricDisplay\b[^}]*\} from '@shared\/testAiSourceDisplay';/);
    expect(sourceDisplaySource).toContain(`export function sourceRecordBucketLabel(bucket: string, kind?: string): string {
  return bucket === 'current_value' ? (kind === 'market_current' ? 'Source-stage asking context' : 'Source-stage current window')
    : bucket === 'historical_trend' ? 'Historical source context' : bucket.replace(/_/g, ' ');
}`);
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
    expect(source).toContain("currency: record?.currency ?? record?.soldCurrency ?? null");
    expect(source).toContain('record.price != null ? formatCandidateDisplayPrice(record)');
    expect(source).toContain("<TestAiCandidateDisplayProvider side={side === 'left' ? 'item_a' : 'item_b'} outcome={finalDisplayOutcome}>");
    expect(source).toContain('for (let index = 0; balanced.length < 120; index += 1)');
    expect(source).toContain('for (const group of groups)');
    expect(source).toContain('if (candidate && balanced.length < 120)');
    expect(source).toContain('Actual submitted final intake only, not every retrieved source row.');
    expect(source).toContain('<TestAiFinalLedgerRow key={comparable.valuationUse?.auditRef?.intakeRef');
    expect(statusComponentSource).toContain("Final use code: {use?.code ?? 'Legacy / final use unavailable'}");
    expect(statusComponentSource).toContain('Legacy pre-selection admission diagnostic');
    expect(source).not.toContain('Items sent to analyzer');
  });

  it('uses one shared Sold-Comps response for Evidence Review and the provider panel', () => {
    expect(source).toContain('function SoldCompsSection({ item, side, data, isLoading }');
    expect(source).toContain('data={soldCompsData} isLoading={soldCompsLoading}');
    expect(source).toContain('statedTradeValue: leftItem?.estimatedValue ?? undefined');
    expect(source).toContain('statedTradeValue: rightItem?.estimatedValue ?? undefined');
    expect(source).not.toContain('function SoldCompsSection({ item, side }: { item: SelectedItem; side: \'left\' | \'right\' })');
    expect(source).not.toContain('trpc.testAI.getSoldCompsData.useQuery(\n    { title: item.title');
  });

  it('reports terminal source coverage only when marketplace results are ready, retaining partial results honestly', () => {
    expect(source).toMatch(/import \{[^}]*\bTestAiProcessCompleteNotice as ProcessCompleteNotice\b[^}]*\} from '@\/components\/TestAiCandidateStatus';/);
    expect(statusComponentSource).toMatch(/export function TestAiProcessCompleteNotice\(\{ data \}: \{ data\?: any \}\) \{\s+if \(!data\) return <p\b[^>]*>No returned source response — request execution and result coverage are unknown\. This is not a zero-match result\.<\/p>;\s+const retrieval = sourceRetrievalCoverage\(data\);/);
    expect(statusComponentSource).toContain("import { sourceCurrentWindowLabel, sourceMetricDisplay, sourceRetrievalCoverage } from '../../../shared/testAiSourceDisplay';");
    expect(sourceDisplaySource).toContain("const partialRetrieval = Boolean(query?.hasIssues || (failedQueryCount ?? 0) > 0 || audit.some((row: any) => row.status === 'error' || (measuredCount(row.rejected) ?? 0) > 0 || (measuredCount(row.normalizationRejected) ?? 0) > 0 || (measuredCount(row.rejectionCounts?.normalization_failure) ?? 0) > 0) || data?.partialRetrieval || data?.partial || data?.status === 'error' || data?.error);");
    expect(sourceDisplaySource).toContain(`  const partial = partialRetrieval || data?.displayCoverage === 'partial'
    || ['provider_unavailable', 'completed_with_timeout'].includes(data?.visualFilter?.status);`);
    expect(statusComponentSource).toContain("aria-label=\"Source request end coverage\">{retrieval.partial ? 'Source request ended with partial/error coverage — known returned rows retained below.' : 'Source request ended — returned source results are displayed below.'}");
    expect(statusComponentSource).toContain('Selected but undispatched rows are not background jobs.');
    expect(source).not.toContain('function ProcessCompleteNotice(');
    expect(source).toContain('const resultsReady = !isLoading;');
    expect(source).toContain('const resultsReady = !isLoading && !(reviewBaseEnabled && visualReviewLoading);');
    expect(source.match(/<ProcessCompleteNotice data=\{data\} \/>/g)?.length).toBe(3);
    expect(source.match(/<TestAiSourcePopulationSummary packet=\{data\?\.sourcePopulation\} \/>/g)?.length).toBe(3);
    expect(source).not.toContain('✓ Process complete — final source results are displayed below.');
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
    expect(source).toContain('const reviewedListings = rankedListings.filter((listing: any) => hasActualVisualResponse(listing));');
    expect(source).toMatch(/import \{[^}]*\bsourceVisualDisplayGroups\b[^}]*\} from '@shared\/testAiSourceDisplay';/);
    expect(source).toContain('const displayData = data?.candidateDisplayBatch ?? data;');
    expect(source).toContain('const rows = selectTestAiVisualDisplayRows(sourceVisualDisplayGroups(displayData));');
    expect(sourceDisplaySource).toContain(`export function sourceVisualDisplayGroups(data: any): any[][] {
  const array = (value: unknown): any[] => Array.isArray(value) ? value : [];
  const legacy = [array(data?.visualReviewListings), array(data?.listings), array(data?.sales),
    array(data?.visualFilter?.contextListings), array(data?.data?.items)];
  const mapped = [array(data?.sales), array(data?.context)];
  return mapped.some((group) => group.some((row) => row?.sourceEconomics?.policy === 'stage6-named-source-mapping-v1'))
    ? [...mapped, ...legacy] : legacy;
}`);
    expect(statusComponentSource).toContain('return mergeCandidateDisplayGroups(groups, scope).filter(hasActualVisualDispatch);');
    expect(source).toContain('Source-stage eligibility and context');
    expect(source).toContain('These are source-stage classifications, not actual request receipts or final pricing-use counts. Current and historical buckets overlap source eligibility.');
    expect(source).toContain('<strong>{acceptedListings.length}</strong><br />source eligible');
    expect(source).toContain('<strong>{currentValueListings.length}</strong><br />current-window source eligible');
    expect(source).toContain('<strong>{historicalTrendListings.length}</strong><br />historical source eligible');
    expect(source).toContain('<strong>{preVisionExcludedListings.length}</strong><br />held out');
    expect(source).toContain("<AnalyzerUseLine eligible={listing.evidenceDisposition === 'valuation_eligible'}");
    expect(source).toContain('Source eligible for final review ({acceptedListings.length})');
    expect(source).toContain('<TestAiCandidateStatus listing={listing} />');
    expect(source).toContain("{open ? 'Hide image checks' : 'View image checks'}");
    expect(source).toContain('<TestAiVisualReviewRow key={candidateDisplayKey(listing, {}, String(index))} listing={listing} targetImageUrl={targetImageUrl} />');
    expect(statusComponentSource).toContain('View full explanation');
    expect(source).toContain('const searchMetrics = data?.searchMetrics ?? data?.metrics;');
    expect(source).toMatch(/import \{[^}]*\bTestAiRetrievalLadder\b[^}]*\} from '\.\.\/components\/TestAiRetrievalLadder';/);
    expect(source).toContain('{data && <TestAiRetrievalLadder data={data} sourceLabel="eBay Sold History" marketplace="eBay" />}');
    expect(source).toContain('{data && <TestAiRetrievalLadder data={data} sourceLabel={sourceLabel} marketplace={marketplace} />}');
    expect(retrievalLadderSource).toMatch(/import \{[^}]*\bsourceRetrievalRows\b[^}]*\} from '\.\.\/\.\.\/\.\.\/shared\/testAiSourceDisplay';/);
    expect(retrievalLadderSource).toContain('const attempts = sourceRetrievalRows(data);');
    expect(retrievalLadderSource).toContain('const rows = attempts.length ? attempts : queries.map((query: string) => ({ query, received: null, status: \'unknown\' }));');
    expect(retrievalLadderSource).toContain('Search attempts and outcomes');
    expect(retrievalLadderSource).toContain('An unreadable or failed response is not a zero-match result.');
    expect(retrievalLadderSource).toContain('Legacy query names are listed, but execution and outcomes are unconfirmed.');
    expect(retrievalLadderSource).toContain('Mercari stops at the first minimally valid provider result, before metadata ranking, image review or pricing eligibility.');
    expect(retrievalLadderSource).toContain("const count = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? String(value) : 'unmeasured';");
    expect(retrievalLadderSource).toContain('returned count: {count(tier.received)}');
  });

  it('keeps Mercari pre-visual context records visible with image transport and a no-image fallback', () => {
    expect(routerSource).toContain('visualReviewListings: [...annotatedListings, ...visualContextListings]');
    expect(routerSource).toContain('preVisionExcludedListings: visualContextListings');
    expect(routerSource).toContain('searchMetrics: result.metrics');
    expect(routerSource).toContain('imageUrl: listing.imageUrl ?? listing.thumbnailUrl ?? listing.imageUrls?.[0] ?? listing.images?.[0] ?? null');
    expect(source).toContain('const preVisionExcludedListings = sortAnalysisCandidates(data?.preVisionExcludedListings ?? []);');
    expect(source).toContain("from '@shared/testAiRankingDisplay'");
    expect(source).toContain(`function sortRankedCandidates<T extends Record<string, any>>(listings: T[]): T[] {
  return sortMetadataRankedCandidates(listings);
}`);
    expect(source).toContain(`function sortAnalysisCandidates<T extends Record<string, any>>(listings: T[]): T[] {
  return sortRankedCandidates(listings);
}`);
    expect(rankingDisplaySource).toContain(`      const rankA = validDisplayRank(a.listing.metadataMatchRank) ?? Number.POSITIVE_INFINITY;
      const rankB = validDisplayRank(b.listing.metadataMatchRank) ?? Number.POSITIVE_INFINITY;
      if (rankA !== rankB) return rankA - rankB;`);
    expect(source).toMatch(/import \{[^}]*\bsourceRetainedDisplayGroups\b[^}]*\} from '@shared\/testAiSourceDisplay';/);
    expect(source).toContain('const retainedMaster = mergeCandidateDisplayGroups(sourceRetainedDisplayGroups(data));');
    expect(sourceDisplaySource).toContain(`export function sourceRetainedDisplayGroups(data: any): any[][] {
  return [data?.audit?.ledger, data?.listings, data?.preVisionExcludedListings,
    data?.visualFilter?.contextListings, data?.context].map((group) => Array.isArray(group) ? group : []);
}`);
    expect(source).toContain('<CandidateMasterList listings={retainedMaster} sourceLabel={`${marketplace} completed sales`} targetImageUrl={item.primaryPhotoUrl} />');
    expect(source).toContain("import { TestAiCandidateMasterList as CandidateMasterList } from '@/components/TestAiCandidateMasterList';");
    expect(masterListSource).toContain('export function TestAiCandidateMasterList({ listings, sourceLabel, targetImageUrl, scope: suppliedScope }');
    expect(masterListSource).toContain('const candidates = reconcileCandidateFinalUse(mergeCandidateDisplayGroups([listings], scope), context.outcome, scope);');
    expect(masterListSource).toContain('All candidates — ranked master list');
    expect(masterListSource).toContain('<TestAiCandidateStatus listing={listing} scope={scope} reconciled />');
    expect(statusComponentSource).toContain('isHardCandidateDisplayException(row)');
    expect(statusComponentSource).toContain('<strong>Hard exclusion:</strong>');
    expect(candidateStatusSource).toContain("return candidateExecutionReceipt(row)?.hardExclusion === true || row.evidenceDisposition === 'rejected_objective_conflict';");
    expect(masterListSource).toContain('<TestAiCandidateImagePair listing={listing} targetImageUrl={targetImageUrl} />');
    expect(statusComponentSource).toContain('const image = listing.imageUrl || listing.thumbnailUrl || listing.imageUrls?.[0] || listing.images?.[0];');
    expect(statusComponentSource).toContain('<div className="grid w-24 shrink-0 grid-cols-2 gap-1">');
    expect(statusComponentSource).toContain("[[targetImageUrl, 'Target', 'border-cyan-700/50', 'text-cyan-200'], [image, 'Candidate', 'border-emerald-700/50', 'text-emerald-200']]");
    expect(statusComponentSource).toContain("alt={label === 'Target' ? 'Target item' : 'Marketplace candidate'} loading=\"lazy\" referrerPolicy=\"no-referrer\"");
    expect(statusComponentSource).toContain('className="flex h-12 items-center justify-center rounded border border-gray-700 bg-gray-950 text-center text-[7px] text-gray-500">{label} unavailable</div>');
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
    expect(source).toContain('Identity-matched active asking price; not a completed sale.');
    expect(source).toContain('Identity-matched active asking listings; useful market context, not completed sales.');
    expect(source).toContain('Source eligible — final use assessed separately');
    expect(source).toContain('<TestAiCandidateStatus listing={listing} />');
    expect(candidateStatusSource).toContain("CURRENT_SALES_PRIMARY: 'Used to support primary sales valuation'");
    expect(candidateStatusSource).toContain("CURRENT_SALES_DIAGNOSTIC_ONLY: 'Current-sales diagnostics only'");
    expect(candidateStatusSource).toContain("if (row.evidenceDisposition === 'valuation_eligible') return { label: 'Source eligible — final analysis not run'");
    expect(candidateLedgerSource).toContain("candidatePricingLink: matches.length > 1 || !origin ? 'unresolved' : 'not_submitted'");
    expect(source).not.toContain(['Context / review only; the visual match did not receive a valuation-', 'eligible disposition.'].join(''));
    expect(candidateStatusSource).toContain("NOT_SUBMITTED_NOT_ASSESSED: 'Not submitted / not assessed'");
  });
  it('requires actual response receipts for reviewed display counts while preserving the legacy operational verdict predicate', () => {
    expect(source).toContain('function hasCompletedVisualReview(listing: any): boolean');
    expect(source).toContain("['match', 'rough_match', 'mismatch', 'unreadable'].includes(status)");
    expect(source).toContain('filter(({ listing }: { listing: any }) => hasActualVisualResponse(listing))');
    expect(candidateStatusSource).toContain("return hasActualVisualDispatch(row) && Boolean(candidateExecutionReceipt(row)?.attempts.some((attempt) => attempt.outcome === 'usable_review'));");
    expect(statusComponentSource).toContain('const dispatched = rows.filter(hasActualVisualDispatch), responses = rows.filter(hasActualVisualResponse);');
    expect(source).toContain('No actual dispatch receipts are available. Legacy verdicts are not proof of image execution.');
    expect(source).toContain('<CandidateMasterList listings={activeMasterListings} sourceLabel="eBay Active Listings" targetImageUrl={item.primaryPhotoUrl} />');
    expect(source).not.toContain('held out before AI image analysis');
  });
  it('renders ranking score and rank through the shared candidate-row component', () => {
    expect(source).toContain('function MetadataMatchLine');
    expect(source).toContain("{listing.metadataMatchLabel ?? 'Ranking'} rank #{listing.metadataMatchRank ?? '—'} · {listing.metadataMatchScore}/100");
    expect(source).toContain('<MetadataMatchLine listing={listing} />');
    expect(source).toContain('<MetadataMatchLine listing={l} />');
    expect(masterListSource).toContain("{listing.metadataMatchLabel ?? 'Metadata ranking'}");
    expect(masterListSource).toContain('<MetadataComparisonTable listing={listing} />');
    expect(metadataTableSource.match(/<th className="p-1">/g)?.length).toBe(6);
    expect(metadataTableSource).toContain('Highlighted field names contributed to the ranking score.');
    expect(metadataTableSource).toContain('Title-derived scored field');
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

  it('shows Numista catalogue estimates as a verified-guide fallback while preserving sale classification', () => {
    expect(source).toContain("id: 'numista', label: 'Numista Coin Catalog', kind: 'reference', role: numistaQuery.data?.data?.guideValue ? 'valuation_guide' : 'reference_context'");
    expect(source).toContain('guideRecordedSales: 0, guideTotalRecordedSales: 0, ...guideAnchorFields(numistaQuery.data?.guideAnchor)');
    expect(source).toContain('A server-verified applicable estimate may be used alone as a guide fallback when current market evidence is insufficient; sufficient comparable sales are used alone, with no blend or added sale counts.');
    expect(source).toContain('Guide fallback not verified: {data?.guideWarnings?.join(\' \')}');
    expect(source).toContain('<p className="font-semibold uppercase text-sky-300">Catalogue reference · verified-guide fallback candidate</p>');
    expect(source).toContain('This is a documented coarse-grade association, not an exact certified-grade value.');
    expect(source).toContain('It is not a sale and does not count toward completed-sale totals. If no accepted market baseline exists, Tradebilia labels the result provisional and not market-supported.');
    expect(source).not.toContain('enters the analyzer as a secondary guide anchor at a maximum 25% weight');
    expect(source).not.toContain('Catalogue estimate · analyzer guide · max 25%');
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
