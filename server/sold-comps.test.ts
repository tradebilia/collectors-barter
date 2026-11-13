import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { annotateSoldComparableCandidate, applyAutographPriceTailGate, applyIsolatedMarketPriceTailGate, assessSoldCompsPreVisionCandidates, buildEbayBrowseQuery, buildSoldCompsQueryCandidates, extractGradeFromQuery, extractGradeFromTitle, extractSoldCompLotQuantity, filterListingsByCertificationCompany, filterListingsByGrade, filterListingsByNumber, getSoldCompsApiKey, hasExplicitSoldCompLot, hasSingleSportsCardForm, normalizeSearchGrade, normalizeSoldCompsMetadata, resolveEbaySoldSourceIdentity } from './testAIRouter';
import { evaluateSoldCompPriceSafety } from '../shared/testAiSoldCompSafety';
import { isExplicitMultiItemListing } from '../shared/testAiMarketplaceCandidate';
import { applyVisualSourceReviews, conservativeGradedVisualReviews } from './testAiVisualSourceFilter';

const confirmedGradedEvidence = { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, artworkMatches: true };

describe('Sold-Comps API key validation', () => {
  it('accepts the configured SOLID_COMPS_API_KEY name without exposing its value', () => {
    expect(getSoldCompsApiKey({ SOLID_COMPS_API_KEY: 'configured-key' })).toBe('configured-key');
  });

  it('prefers SOLD_COMPS_API_KEY when the standardized name is configured', () => {
    expect(getSoldCompsApiKey({ SOLD_COMPS_API_KEY: 'standard-key', SOLID_COMPS_API_KEY: 'legacy-key' })).toBe('standard-key');
  });

  it('reports no credential only when neither supported variable is configured', () => {
    expect(getSoldCompsApiKey({})).toBeNull();
  });

  it('preserves eBay Sold-Comps provider IDs and URL aliases without stringifying missing IDs', () => {
    expect(resolveEbaySoldSourceIdentity({ itemId: 'ebay-item', itemWebUrl: 'https://www.ebay.com/itm/123' }))
      .toEqual({ saleId: 'ebay-item', url: 'https://www.ebay.com/itm/123' });
    expect(resolveEbaySoldSourceIdentity({ sourceRecordId: 'sold-record', link: 'https://www.ebay.com/itm/456' }))
      .toEqual({ saleId: 'sold-record', url: 'https://www.ebay.com/itm/456' });
    expect(resolveEbaySoldSourceIdentity({ itemUrl: 'https://www.ebay.com/itm/789' }))
      .toEqual({ saleId: null, url: 'https://www.ebay.com/itm/789' });
    expect(resolveEbaySoldSourceIdentity({ title: 'Nirvana Nevermind Cassette' }))
      .toEqual({ saleId: null, url: null });
  });

  it('preserves ranking metadata in the eBay Sold-Comps transport payload', () => {
    const routerSource = readFileSync(resolve(process.cwd(), 'server/testAIRouter.ts'), 'utf8');
    const soldCompsSection = routerSource.slice(routerSource.indexOf("sourceLabel: 'eBay Sold-Comps'"));
    expect(soldCompsSection).toContain('metadataMatchScore: i.metadataMatchScore');
    expect(soldCompsSection).toContain('metadataMatchRank: i.metadataMatchRank');
    expect(soldCompsSection).toContain('metadataMatchReasons: i.metadataMatchReasons');
    expect(soldCompsSection).toContain('ignoreSubjectiveConditionDifferences: true');
  });

  it('retains the precise sports-card grade for completed-sale retrieval', () => {
    const query = '1989 Upper Deck Ken Griffey Jr 1 PSA 10';

    expect(buildEbayBrowseQuery(query, { preserveGrade: true })).toBe(query);
  });

  it('preserves PSA half-point grades for video games only', () => {
    expect(normalizeSearchGrade('7.5', 'video_games', 'PSA')).toBe('7.5');
    expect(normalizeSearchGrade('7.50', 'video_games', 'PSA')).toBe('7.5');
    expect(normalizeSearchGrade('7.5', 'sports_cards', 'PSA')).toBe('8');
  });

  it('parses consecutive equivalent graders as the numeric video-game grade', () => {
    const title = 'The Legend of Zelda Nintendo 1987 NES CIB Graded WATA PSA 7.5';
    const listing = { title };

    expect(extractGradeFromTitle(title)).toBe(7.5);
    expect(filterListingsByGrade([listing], 7.5, 'video_games', 'PSA')).toEqual([listing]);
  });

  it('preserves qualified coin grades when the token is not another grader', () => {
    expect(extractGradeFromTitle('1881-S Morgan Dollar PCGS MS65')).toBe('MS65');
  });

  it('creates bounded targeted and broader fallback queries', () => {
    expect(buildSoldCompsQueryCandidates('Edge of the Spider-Verse #2 CGC 9.8')).toEqual([
      'Edge of the Spider-Verse #2 CGC',
      'Edge of the Spider-Verse #2',
      'Edge of the Spider-Verse #2 CGC 9.8',
      'Edge of Spider-Verse #2 CGC',
      'Edge of Spider-Verse #2',
      'Edge of Spider-Verse #2 CGC 9.8',
    ]);
  });

  it('builds broader fallback tiers when a movie query includes only a condition phrase', () => {
    const candidates = buildSoldCompsQueryCandidates('Moonlighting Season 1&2 DVD excellent', {
      preserveGrade: true,
      fallbackQueries: ['Moonlighting Season 1&2 DVD', 'Moonlighting Season 1&2'],
    });

    expect(candidates[0]).toBe('Moonlighting Season 1&2 DVD excellent');
    expect(candidates).toContain('Moonlighting Season 1&2 DVD');
    expect(candidates).toContain('Moonlighting Season 1&2');
    expect(candidates.length).toBeGreaterThan(1);
  });

  it('puts the precise query first when active retrieval preserves the grade', () => {
    expect(buildSoldCompsQueryCandidates('Transformers Megatron G1 AFA 60.0', { preserveGrade: true })[0])
      .toBe('Transformers Megatron G1 AFA 60.0');
  });

  it('uses the shared three-query Autographs sequence as the authoritative order', () => {
    expect(buildSoldCompsQueryCandidates('autograph Marlon Brando Paper Entertainment East Coast Authenticators', {
      preserveGrade: true,
      prioritizeFallbackQueries: true,
      fallbackQueries: [
        'autograph Marlon Brando Paper East Coast Authenticators',
        'autograph Marlon Brando Paper',
      ],
    })).toEqual([
      'autograph Marlon Brando Paper Entertainment East Coast Authenticators',
      'autograph Marlon Brando Paper East Coast Authenticators',
      'autograph Marlon Brando Paper',
    ]);
  });

  it('adds an article-omission alias for marketplace titles that omit words such as the', () => {
    const queries = buildSoldCompsQueryCandidates('Edge of the Spider-Verse #2 CGC 9.8');

    expect(queries).toContain('Edge of Spider-Verse #2 CGC');
    expect(queries).toContain('Edge of Spider-Verse #2');
    expect(new Set(queries).size).toBe(queries.length);
    expect(queries.length).toBeLessThanOrEqual(6);
  });

  it('normalizes Sold-Comps item specifics from common provider shapes', () => {
    expect(normalizeSoldCompsMetadata({
      itemSpecifics: [
        { name: 'Platform', value: 'PlayStation 4' },
        { name: 'Edition', value: 'Greatest Hits' },
        { name: 'Region', value: 'NTSC-U/C' },
      ],
    })).toMatchObject({ platform: 'PlayStation 4', edition: 'Greatest Hits', region: 'NTSC-U/C' });
    expect(normalizeSoldCompsMetadata({ aspects: { Platform: 'NES', Completeness: 'CIB' } }))
      .toMatchObject({ platform: 'NES', packaging: 'CIB' });
  });

  it('excludes explicit platform conflicts, lots, and high-value outliers before visual review', () => {
    const targetMetadata = 'title=Resident Evil 2; category=video_games; itemType=single_item; grade=unknown; certificationCompany=unknown; fullItemDetails={"platform":"PS1","edition":"Standard"}';
    const result = assessSoldCompsPreVisionCandidates({
      category: 'video_games',
      targetMetadata,
      targetPlatform: 'PS1',
      statedTradeValue: 20_000,
      listings: [
        { title: 'Resident Evil 2 PS4 Greatest Hits', soldPrice: 2_000, itemSpecifics: [{ name: 'Platform', value: 'PlayStation 4' }] },
        { title: 'Resident Evil 2 PS1 Lot of 2', soldPrice: 5_000 },
        { title: 'Resident Evil 2 PS1', soldPrice: 1_000 },
        { title: 'Resident Evil 2 PS1', soldPrice: 6_000 },
      ],
    });

    expect(result.eligible).toHaveLength(1);
    expect(result.eligible[0].soldPrice).toBe(6_000);
    expect(result.excluded).toHaveLength(3);
    expect(result.excluded.map((entry) => entry.reasons.join(' ')).join(' ')).toMatch(/platform|lot|25%|250%/i);
  });

  it('Mercari Video Game title gate excludes unrelated and manual-only records before vision', () => {
    const result = assessSoldCompsPreVisionCandidates({
      category: 'video_games',
      targetMetadata: 'title=Metroid; category=video_games; itemType=single_item; grade=unknown; fullItemDetails={"gameTitle":"Metroid","platform":"NES"}',
      targetPlatform: 'NES',
      enforceVideoGameTitleMatch: true,
      targetGameTitle: 'Metroid',
      listings: [
        { title: 'Met Rosie #40B', price: 3 },
        { title: "(Manual) Whomp 'Em for Nintendo NES", price: 35 },
        { title: 'Metroid NES cartridge', price: 40 },
      ],
    });

    expect(result.eligible.map((item) => item.title)).toEqual(['Metroid NES cartridge']);
    expect(result.excluded).toHaveLength(2);
    expect(result.excluded.flatMap((entry) => entry.reasons).join(' ')).toMatch(/title mismatch|manual\/accessory-only/i);
  });

  it('keeps a graded Zelda listing with generic Pre-Owned condition eligible', () => {
    const result = assessSoldCompsPreVisionCandidates({
      category: 'video_games',
      targetMetadata: 'title=The Legend of Zelda; category=video_games; itemType=single_item; grade=7.5; certificationCompany=PSA; fullItemDetails={"platform":"NES"}',
      targetPlatform: 'NES',
      targetIsGraded: true,
      listings: [{
        title: 'The Legend Of Zelda Nintendo 1987 NES CIB Graded WATA PSA 7.5',
        condition: 'Pre-Owned',
        soldPrice: '449.99',
        saleId: '147394273143',
      }],
    });
    expect(result.eligible).toHaveLength(1);
    expect(result.excluded).toHaveLength(0);
  });

  it('sends candidates with omitted grade metadata to visual review while keeping explicit raw evidence out', () => {
    const result = assessSoldCompsPreVisionCandidates({
      category: 'video_games',
      targetMetadata: 'title=The Legend of Zelda; category=video_games; grade=7.5; certificationCompany=PSA; fullItemDetails={"platform":"NES"}',
      targetPlatform: 'NES',
      targetIsGraded: true,
      listings: [
        { title: 'The Legend of Zelda NES Complete Mint Condition', condition: 'Mint', soldPrice: 100 },
        { title: 'The Legend of Zelda NES Tested Authentic', condition: 'Pre-Owned', soldPrice: 110 },
        { title: 'The Legend of Zelda NES', condition: 'Pre-Owned', soldPrice: 120 },
        { title: 'The Legend of Zelda NES Raw', condition: 'Pre-Owned', soldPrice: 125 },
        { title: 'The Legend of Zelda NES WATA PSA 7.5 CIB', condition: 'Pre-Owned', soldPrice: 450 },
      ],
    });
    expect(result.eligible.map((item) => item.title)).toEqual([
      'The Legend of Zelda NES Complete Mint Condition',
      'The Legend of Zelda NES Tested Authentic',
      'The Legend of Zelda NES',
      'The Legend of Zelda NES WATA PSA 7.5 CIB',
    ]);
    expect(result.excluded).toHaveLength(1);
    expect(result.excluded[0].item.title).toContain('Raw');
    expect(result.excluded[0].reasons.join(' ')).toMatch(/raw\/ungraded/i);
  });

  it('does not exclude a candidate when provider metadata is missing', () => {
    const result = assessSoldCompsPreVisionCandidates({
      category: 'video_games',
      targetMetadata: 'title=Resident Evil 2; category=video_games; itemType=single_item; fullItemDetails={"platform":"PS1"}',
      targetPlatform: 'PS1',
      listings: [{ title: 'Resident Evil 2', soldPrice: 90 }],
    });
    expect(result.eligible).toHaveLength(1);
    expect(result.excluded).toHaveLength(0);
  });

  it('allows Movie Box Set bundles through the shared pre-vision gate while keeping individual movies protected', () => {
    const boxSetTarget = 'title=Moonlighting Season 1&2; category=movies; itemType=box_set; fullItemDetails={"boxSetName":"Moonlighting Season 1&2","format":"DVD"}';
    const bundle = { title: 'Moonlighting Seasons 1 & 2 DVD Collection', soldPrice: 13 };
    const boxSetResult = assessSoldCompsPreVisionCandidates({
      category: 'movies',
      targetMetadata: boxSetTarget,
      listings: [bundle],
    });
    expect(boxSetResult.eligible[0]).toMatchObject(bundle);
    expect(boxSetResult.excluded).toHaveLength(0);

    const individualResult = assessSoldCompsPreVisionCandidates({
      category: 'movies',
      targetMetadata: 'title=Moonlighting Season 1; category=movies; itemType=individual_movie; fullItemDetails={"title":"Moonlighting Season 1","format":"DVD"}',
      listings: [bundle],
    });
    expect(individualResult.eligible).toHaveLength(0);
    expect(individualResult.excluded[0]?.reasons.join(' ')).toMatch(/lot, bundle|collection/i);

    const annotated = annotateSoldComparableCandidate(bundle, {
      category: 'movies',
      targetItemType: 'box_set',
      certificationCompany: '',
      targetGrade: null,
      targetNumber: null,
      targetPlayer: null,
      visualReviewRequired: true,
      visualReview: { verdict: 'match', confidence: 'high', rationale: 'same box set', candidateIndex: 0 },
    });
    expect(annotated.evidenceDisposition).toBe('valuation_eligible');
    expect(annotated.evidenceReasons ?? []).not.toContain(expect.stringMatching(/multi-item lot or bundle/i));
  });

  it('accepts the UI-style spaced Box Set item type in the live Sold-Comps gate', () => {
    const result = assessSoldCompsPreVisionCandidates({
      category: 'movies',
      targetMetadata: 'title=Moonlighting Season 1&2; category=movies; itemType=Box Set; fullItemDetails={"boxSetName":"Moonlighting Season 1&2","format":"DVD"}',
      listings: [{ title: 'Moonlighting Seasons 1 & 2 DVD Collection', soldPrice: 13 }],
    });
    expect(result.eligible).toHaveLength(1);
    expect(result.excluded).toHaveLength(0);
  });

  it('retains grading-company variants until the shared universal filter can classify them with a visible reason', () => {
    const listings = [
      { title: 'Edge of the Spider-Verse #2 CGC 9.8' },
      { title: 'Edge of the Spider-Verse #2 CBCS 9.8' },
      { title: 'Edge of the Spider-Verse #2 9.8' },
    ];

    expect(filterListingsByCertificationCompany(listings, 'CGC')).toEqual(listings);
  });

  it('does not delete grader variants before the shared Video Game PSA/WATA equivalence rule runs', () => {
    const listings = [
      { title: 'The Legend of Zelda NES WATA PSA 7.5' },
      { title: 'The Legend of Zelda NES WATA 7.5' },
      { title: 'The Legend of Zelda NES VGA 7.5' },
      { title: 'The Legend of Zelda NES CGC 7.5 Graded 3 Screw Cart Not WATA, VGA, PSA' },
    ];

    expect(filterListingsByCertificationCompany(listings, 'PSA', 'video_games')).toEqual(listings);
    expect(filterListingsByCertificationCompany(listings, 'WATA', 'video_games')).toEqual(listings);
    expect(filterListingsByCertificationCompany(listings, 'PSA', 'comics')).toEqual(listings);
  });

  it('retains a negated grader phrase until the shared universal filter evaluates positive grader evidence', () => {
    const listing = { title: 'The Legend of Zelda NES CGC 7.5 Not WATA, VGA, PSA' };
    expect(filterListingsByCertificationCompany([listing], 'PSA', 'video_games')).toEqual([listing]);
  });

  it('accepts a comic title that writes the issue as a bare number before CGC', () => {
    const listing = { title: 'Edge Of The Spider-verse 2 Cgc 9.8 1st spider-Gwen white pages' };

    expect(filterListingsByNumber([listing], '2')).toEqual([listing]);
  });

  it('retains missing structured evidence but removes an explicit card-number contradiction', () => {
    const listings = [
      { title: '1989 Upper Deck Ken Griffey Jr Rookie PSA 10' },
      { title: '1989 Upper Deck Ken Griffey Jr #2 PSA 10' },
    ];

    expect(filterListingsByNumber(listings, '1', { allowMissingNumber: true })).toEqual([listings[0]]);
  });

  it('retains a missing marketplace grade for review while removing a stated wrong grade', () => {
    const listings = [
      { title: 'Edge of the Spider-Verse #2 CGC' },
      { title: 'Edge of the Spider-Verse #2 CGC 9.6' },
      { title: 'Edge of the Spider-Verse #2 CGC 9.8' },
    ];

    expect(filterListingsByGrade(listings, 9.8)).toEqual([listings[0], listings[2]]);
  });

  it('normalizes parenthesized VHS grading labels such as CGC Graded (9.8-A++)', () => {
    expect(extractGradeFromTitle('Rambo: First Blood Part 2 VHS CGC Graded (9.8-A++) RARE! MINT!')).toBe(9.8);
    expect(extractGradeFromQuery('Rambo: First Blood Part 2 VHS CGC Graded (9.8-A++)')).toBe(9.8);
  });

  it('identifies explicit single-card forms in graded marketplace titles', () => {
    expect(hasSingleSportsCardForm('1985 Topps Mark McGwire 401 PSA 10')).toBe(true);
    expect(hasSingleSportsCardForm('Kirby Puckett Rookie 1985 Topps #536 RC Card HOF GEM MINT 10')).toBe(true);
    expect(hasSingleSportsCardForm('1985 Topps Kirby Puckett Rookie Baseball Card RC #536 PSA 9.5')).toBe(true);
    expect(hasSingleSportsCardForm('Dolph Lundgren Autographed Rocky IV Ivan Drago AUTO PSA GEM MINT 10')).toBe(true);
    expect(hasSingleSportsCardForm('1985 Topps Baseball Complete Set PSA 10')).toBe(false);
    expect(hasSingleSportsCardForm('1985 Topps Baseball Factory Set')).toBe(false);
  });

  it('keeps an individual card out of valuation when the target is a card set', () => {
    const annotated = annotateSoldComparableCandidate(
      { title: '1985 Topps Mark McGwire 401 PSA 10', soldPrice: '5300' },
      {
        category: 'sports_cards',
        targetItemType: 'card_set',
        certificationCompany: 'PSA',
        targetGrade: 10,
        targetNumber: null,
        targetPlayer: null,
      },
    );

    expect(annotated.evidenceDisposition).toBe('warning_review');
    expect(annotated.evidenceReasons).toContain('candidate is an individual graded card, but the target is a sports-card set');

    const genericSet = annotateSoldComparableCandidate(
      { title: '1985 Topps Mark McGwire #401 RC PSA 10', soldPrice: '5300' },
      { category: 'sports_cards', targetItemType: 'set', certificationCompany: 'PSA', targetGrade: 10, targetNumber: null, targetPlayer: null },
    );
    expect(genericSet.evidenceDisposition).toBe('warning_review');
  });

  it('admits an exact Disney Pin visual match and keeps a mismatch out of valuation', () => {
    const context = { category: 'disney_pins', targetItemType: 'single_pin', certificationCompany: '', targetGrade: null, targetNumber: null, targetPlayer: null, visualReviewRequired: true };
    const exact = annotateSoldComparableCandidate({ title: 'Eeyore Around the World Eeyore Disney Pin', soldPrice: '18', visualReviewStatus: 'match', visualReviewRationale: 'All required Disney Pin identity details match.', visualAudit: { adjudicationStatus: 'confirmed', finalPass: 'high_resolution_retry' } }, context);
    const mismatch = annotateSoldComparableCandidate({ title: 'Eeyore Around the World Eeyore Disney Pin', soldPrice: '18', visualReviewStatus: 'mismatch', visualReviewRationale: 'The backing card and artwork differ.' }, context);

    expect(exact.evidenceDisposition).toBe('valuation_eligible');
    expect(mismatch.evidenceDisposition).toBe('warning_review');
    expect(mismatch.evidenceReasons?.[0]).toContain('visual comparison flag');
  });

  it('evaluates Disney Sold-Comps candidates independently when one match sits beside a mismatch and timeout', () => {
    const context = { category: 'disney_pins', targetItemType: 'single_pin', certificationCompany: '', targetGrade: null, targetNumber: null, targetPlayer: null, visualReviewRequired: true };
    const confirmedMatch = annotateSoldComparableCandidate({
      title: 'Disney Pin Trading Around the World Eeyore Limited Edition',
      soldPrice: '6',
      evidenceDisposition: 'context_only',
      evidenceReasons: [],
      visualReviewStatus: 'match',
      visualAudit: {
        retryStatus: 'performed',
        finalPass: 'high_resolution_retry',
        adjudicationStatus: 'confirmed',
      },
    }, context);
    const mismatch = annotateSoldComparableCandidate({
      title: 'Disney Pin Trading Around the World Eeyore Variant',
      soldPrice: '38',
      visualReviewStatus: 'mismatch',
      visualReviewRationale: 'The artwork and silhouette differ.',
    }, context);
    const timeout = annotateSoldComparableCandidate({
      title: 'Disney Pin Trading Around the World Eeyore Limited Edition',
      soldPrice: '25',
      evidenceDisposition: 'warning_review',
      visualReviewStatus: 'match',
      visualAdmissionReason: 'The independent Disney Pin image comparison did not complete; the initial AI result is retained for context only and cannot enter valuation.',
    }, context);

    expect(confirmedMatch.evidenceDisposition).toBe('valuation_eligible');
    expect(confirmedMatch.evidenceReasons).toEqual([]);
    expect(mismatch.evidenceDisposition).toBe('warning_review');
    expect(timeout.evidenceDisposition).toBe('valuation_eligible');
  });

  it('promotes a completed Disney visual adjudication even when a provisional unavailable warning survived transport', () => {
    const completed = annotateSoldComparableCandidate({
      title: 'Disney Pin Trading Around the World Eeyore Limited Edition',
      soldPrice: '6',
      evidenceDisposition: 'warning_review',
      evidenceReasons: [],
      visualReviewStatus: 'match',
      visualAdmissionReason: 'The independent Disney Pin image comparison did not complete; the initial AI result is retained for context only and cannot enter valuation.',
      visualAudit: {
        retryStatus: 'performed',
        finalPass: 'high_resolution_retry',
        adjudicationStatus: 'confirmed',
        finalEvidence: { characterMatches: true, artworkMatches: true, silhouetteMatches: true, backingCardMatches: true, setDesignMatches: true },
      },
    }, {
      category: 'disney_pins', targetItemType: 'single_pin', certificationCompany: '', targetGrade: null,
      targetNumber: null, targetPlayer: null, visualReviewRequired: true,
    });

    expect(completed.evidenceDisposition).toBe('valuation_eligible');
    expect(completed.evidenceReasons).toEqual([]);
    expect(completed).not.toHaveProperty('visualAdmissionReason');
  });

  it('promotes a Disney visual match even when retry metadata is unavailable', () => {
    const ambiguous = annotateSoldComparableCandidate({
      title: 'Disney Pin Trading Around the World Eeyore Limited Edition',
      soldPrice: '6',
      evidenceDisposition: 'warning_review',
      evidenceReasons: [],
      visualReviewStatus: 'match',
      visualAdmissionReason: 'The independent Disney Pin image comparison did not complete; the initial AI result is retained for context only and cannot enter valuation.',
      visualAudit: {
        retryStatus: 'performed',
        finalPass: 'high_resolution_retry',
        adjudicationStatus: 'unavailable',
        finalEvidence: { characterMatches: true, artworkMatches: true, silhouetteMatches: true, backingCardMatches: true, setDesignMatches: true },
      },
    }, {
      category: 'disney_pins', targetItemType: 'single_pin', certificationCompany: '', targetGrade: null,
      targetNumber: null, targetPlayer: null, visualReviewRequired: true,
    });

    expect(ambiguous.evidenceDisposition).toBe('valuation_eligible');
    expect(ambiguous).not.toHaveProperty('visualAdmissionReason');
  });

  it('promotes the exact Rambo CGC 9.8 completed sale after confirmed visual matching', () => {
    const candidate = annotateSoldComparableCandidate(
      {
        title: 'Rambo: First Blood Part 2 VHS CGC 9.8',
        soldPrice: '380',
        evidenceDisposition: 'context_only',
        evidenceReasons: [],
        visualReviewStatus: 'match',
        visualEvidence: confirmedGradedEvidence,
      },
      {
        category: 'movies',
        targetItemType: 'single_movie',
        certificationCompany: 'CGC',
        targetGrade: 9.8,
        targetNumber: null,
        targetPlayer: null,
        visualReviewRequired: true,
      },
    );
    expect(candidate.evidenceDisposition).toBe('valuation_eligible');
    expect(candidate.evidenceReasons).toEqual([]);
  });

  it('lets a confirmed visual identity match clear missing title metadata without clearing objective safeguards', () => {
    const candidate = annotateSoldComparableCandidate(
      {
        title: 'Rambo: First Blood Part 2 VHS CGC Graded (9.8-A++) RARE! MINT!',
        soldPrice: '380',
        evidenceDisposition: 'context_only',
        evidenceReasons: [],
        visualReviewStatus: 'match',
        visualEvidence: confirmedGradedEvidence,
        visualReviewRationale: 'The target and candidate are the same CGC graded VHS and the visible 9.8 grade matches.',
      },
      {
        category: 'movies',
        targetItemType: 'single_movie',
        certificationCompany: 'CGC',
        targetGrade: 9.8,
        targetNumber: null,
        targetPlayer: null,
        visualReviewRequired: true,
      },
    );

    expect(candidate.evidenceDisposition).toBe('valuation_eligible');
    expect(candidate.evidenceReasons).toEqual([]);

    const lot = annotateSoldComparableCandidate(
      { title: 'Rambo: First Blood Part 2 VHS CGC Graded (9.8-A++) Lot of 2', soldPrice: '380', visualReviewStatus: 'match' },
      {
        category: 'movies', targetItemType: 'single_movie', certificationCompany: 'CGC', targetGrade: 9.8,
        targetNumber: null, targetPlayer: null, visualReviewRequired: true,
      },
    );
    expect(lot.evidenceDisposition).toBe('warning_review');
    expect(lot.evidenceReasons?.[0]).toMatch(/multi-item lot/);
  });

  it.each(['sports_cards', 'coins', 'comics', 'stamps', 'video_games', 'movies', 'vintage_toys', 'pokemon', 'disney_pins', 'music'])('promotes a clean confirmed visual match through the shared Sold-Comps path for %s', (category) => {
    const candidate = annotateSoldComparableCandidate(
      { title: 'Exact completed sale candidate', soldPrice: '100', evidenceDisposition: 'context_only', evidenceReasons: [], visualReviewStatus: 'match' },
      { category, targetItemType: 'single_item', certificationCompany: '', targetGrade: null, targetNumber: null, targetPlayer: null, visualReviewRequired: true },
    );
    expect(candidate.evidenceDisposition).toBe('valuation_eligible');
  });

  it('does not promote a rough match or a carried context row with existing evidence reasons', () => {
    const roughMatch = annotateSoldComparableCandidate(
      { title: 'Exact completed sale candidate', soldPrice: '100', evidenceDisposition: 'context_only', evidenceReasons: [], visualReviewStatus: 'rough_match' },
      { category: 'comics', targetItemType: 'single_item', certificationCompany: '', targetGrade: null, targetNumber: null, targetPlayer: null, visualReviewRequired: true },
    );
    const flaggedMatch = annotateSoldComparableCandidate(
      { title: 'Exact completed sale candidate', soldPrice: '100', evidenceDisposition: 'context_only', evidenceReasons: ['candidate was held for an objective conflict'], visualReviewStatus: 'match' },
      { category: 'comics', targetItemType: 'single_item', certificationCompany: '', targetGrade: null, targetNumber: null, targetPlayer: null, visualReviewRequired: true },
    );
    expect(roughMatch.evidenceDisposition).toBe('context_only');
    expect(flaggedMatch.evidenceDisposition).toBe('context_only');
  });

  it('keeps explicit multi-item lots out of source-level valuation acceptance', () => {
    expect(extractSoldCompLotQuantity('Hot Wheels 70 Plymouth AAR Cuda (Lot of 2 Short Card & Long Card)')).toBe(2);
    expect(extractSoldCompLotQuantity('Hot Wheels 70 Plymouth AAR Cuda 2026 P Case Lot of 3')).toBe(3);
    expect(hasExplicitSoldCompLot('Hot Wheels 70 Plymouth AAR Cuda (Lot of 2 Short Card & Long Card)')).toBe(true);

    const context = { category: 'vintage_toys', targetItemType: 'single_item', certificationCompany: '', targetGrade: null, targetNumber: null, targetPlayer: null };
    const lotOfTwo = annotateSoldComparableCandidate({ title: 'Hot Wheels 70 Plymouth AAR Cuda (Lot of 2 Short Card & Long Card)', soldPrice: '11' }, context);
    const lotOfThree = annotateSoldComparableCandidate({ title: 'Hot Wheels 70 Plymouth AAR Cuda 2026 P Case Lot of 3', soldPrice: '19' }, context);
    const single = annotateSoldComparableCandidate({ title: '2026 Hot Wheels 70 Plymouth AAR Cuda 2026 P Case', soldPrice: '6' }, context);

    expect(lotOfTwo).toMatchObject({ evidenceDisposition: 'warning_review', lotQuantity: 2 });
    expect(lotOfTwo.evidenceReasons).toContain('candidate is a multi-item lot of 2; total lot price is not directly comparable to one target item and is retained as context only');
    expect(lotOfThree).toMatchObject({ evidenceDisposition: 'warning_review', lotQuantity: 3 });
    expect(lotOfThree.evidenceReasons).toContain('candidate is a multi-item lot of 3; total lot price is not directly comparable to one target item and is retained as context only');
    expect(single.evidenceDisposition).toBe('valuation_eligible');
  });

  it('does not treat a Disney pin release year as a lot quantity in the eBay pre-vision path', () => {
    expect(extractSoldCompLotQuantity('Disney Sitting Eeyore Pooh 2008 Pin C4')).toBeNull();
    expect(hasExplicitSoldCompLot('Disney Sitting Eeyore Pooh 2008 Pin C4')).toBe(false);
    expect(extractSoldCompLotQuantity('Disney Eeyore Pooh Set of 2 Pins')).toBe(2);
    expect(extractSoldCompLotQuantity('Disney Eeyore Pooh Collection Lot of 3')).toBe(3);

    const targetMetadata = 'title=Around the World Eeyore Pin; category=disney_pins; itemType=single_pin; itemDetails={"pinName":"Around the World Eeyore","character":"Eeyore","series":"Around the World"}';
    const assessment = assessSoldCompsPreVisionCandidates({
      category: 'disney_pins',
      targetMetadata,
      listings: [{ title: 'Disney Sitting Eeyore Pooh 2008 Pin C4', soldPrice: '25' }],
      ignoreSubjectiveConditionDifferences: true,
    });
    expect(assessment.eligible.map((listing) => listing.title)).toEqual(['Disney Sitting Eeyore Pooh 2008 Pin C4']);
    expect(assessment.excluded).toHaveLength(0);
  });

  it('treats Disney Designer Ultimate Princess Collection as a series, not a multi-item lot', () => {
    const targetMetadata = 'title=Disney Designer Ultimate Princess Collection; category=disney_pins; itemType=single_pin; itemDetails={"pinName":"Disney Designer Ultimate Princess Collection Aurora","character":"Aurora","series":"Disney Designer Ultimate Princess Collection"}';
    const candidate = {
      title: 'Disney Designer Ultimate Princess Collection Aurora Hinged Pin Limited Edition',
      itemType: 'Collection/Lot',
      soldPrice: '125',
    };
    expect(isExplicitMultiItemListing(candidate, targetMetadata)).toBe(false);
    const assessment = assessSoldCompsPreVisionCandidates({
      category: 'disney_pins',
      targetMetadata,
      listings: [candidate],
      ignoreSubjectiveConditionDifferences: true,
    });
    expect(assessment.eligible.map((listing) => listing.title)).toEqual([candidate.title]);
    expect(assessment.excluded).toHaveLength(0);
  });

  it('still excludes explicit Disney pin quantities and collection lots', () => {
    const targetMetadata = 'title=Disney Designer Ultimate Princess Collection; category=disney_pins; itemType=single_pin; itemDetails={"character":"Aurora","series":"Disney Designer Ultimate Princess Collection"}';
    expect(isExplicitMultiItemListing({ title: 'Disney Designer Ultimate Princess Collection Aurora Collection Lot of 3' }, targetMetadata)).toBe(true);
    expect(isExplicitMultiItemListing({ title: 'Disney Designer Ultimate Princess Collection Aurora Set of 2 Pins' }, targetMetadata)).toBe(true);
    expect(isExplicitMultiItemListing({ title: 'Disney Designer Ultimate Princess Collection Aurora Hinged Pin', itemType: 'Collection/Lot' }, targetMetadata)).toBe(false);
  });

  it('keeps generic bundles and counted multi-item titles out of valuation without inventing a quantity', () => {
    const context = { category: 'vintage_toys', targetItemType: 'single_item', certificationCompany: '', targetGrade: null, targetNumber: null, targetPlayer: null };
    const bundle = annotateSoldComparableCandidate({ title: 'Hot Wheels AAR Cuda Multipack', soldPrice: '20' }, context);
    const counted = annotateSoldComparableCandidate({ title: 'Hot Wheels AAR Cuda 3 Cars Set', soldPrice: '20' }, context);

    expect(bundle).toMatchObject({ evidenceDisposition: 'warning_review', lotQuantity: null });
    expect(bundle.evidenceReasons?.[0]).toContain('multi-item lot or bundle');
    expect(counted).toMatchObject({ evidenceDisposition: 'warning_review', lotQuantity: 3 });
  });

  it('fails closed when an image-bearing Sold-Comps candidate has no completed visual review', () => {
    const candidate = annotateSoldComparableCandidate(
      { title: 'The Legend of Zelda NES PSA 7.5', soldPrice: '240', visualReviewStatus: 'not_reviewed' },
      {
        category: 'video_games',
        targetItemType: 'single_item',
        certificationCompany: 'PSA',
        targetGrade: 7.5,
        targetNumber: null,
        targetPlayer: null,
        visualReviewRequired: true,
      },
    );
    expect(candidate.evidenceDisposition).toBe('warning_review');
    expect(candidate.evidenceReasons).toContain('visual identity review was required but no completed candidate review was returned; retained for manual review');
  });

  it('preserves visual audit provenance from the review into the Sold-Comps listing', () => {
    const visualAudit = {
      imageCount: 1,
      initialVerdict: 'mismatch' as const,
      initialConfidence: 'high' as const,
      retryStatus: 'performed' as const,
      retryReason: 'The title declared a grade while the first pass read the image as raw.',
      finalPass: 'high_resolution_retry' as const,
      initialEvidence: {
        slabVisible: false,
        gradingLabelVisible: false,
        graderVisible: false,
        numericGradeVisible: false,
        gradeMatches: false,
        rawOrLooseVisible: true,
      },
      finalEvidence: {
        slabVisible: true,
        gradingLabelVisible: true,
        graderVisible: true,
        numericGradeVisible: true,
        gradeMatches: true,
        rawOrLooseVisible: false,
      },
    };
    const candidate = annotateSoldComparableCandidate(
      { title: 'Super Mario Bros. 3 NES PSA Graded 9.0', soldPrice: '950' },
      {
        category: 'video_games',
        targetItemType: 'single_item',
        certificationCompany: 'PSA',
        targetGrade: 9,
        targetNumber: null,
        targetPlayer: null,
        visualReviewRequired: true,
        visualReview: {
          candidateIndex: 0,
          verdict: 'match',
          confidence: 'high',
          rationale: 'The promoted image clearly shows the matching PSA slab and grade.',
          visualAudit,
        },
      },
    );

    expect(candidate.visualAudit).toEqual(visualAudit);
    expect(candidate.visualReviewStatus).toBe('match');
  });

  it('keeps a visually raw candidate out of valuation when the target is graded', () => {
    const candidate = annotateSoldComparableCandidate(
      {
        title: 'The Legend of Zelda Gold Cartridge NES 1987',
        soldPrice: '20',
        evidenceDisposition: 'context_only',
        visualReviewStatus: 'match',
        visualReviewRationale: 'The candidate is exposed and loose with no visible grading holder or label, while the target is PSA graded.',
        visualEvidence: {
          slabVisible: false,
          gradingLabelVisible: false,
          graderVisible: false,
          numericGradeVisible: false,
          gradeMatches: false,
          rawOrLooseVisible: true,
        },
      },
      {
        category: 'video_games',
        targetItemType: 'single_item',
        certificationCompany: 'PSA',
        targetGrade: 7.5,
        targetNumber: null,
        targetPlayer: null,
        visualReviewRequired: true,
      },
    );

    expect(candidate.evidenceDisposition).not.toBe('valuation_eligible');
    expect(candidate.evidenceReasons).toContain('candidate is visually raw/ungraded while the target is graded; this is a hard identity conflict');
  });

  it('does not clear missing title grade and grader warnings without verified visual grading evidence', () => {
    const candidate = annotateSoldComparableCandidate(
      {
        title: 'The Legend of Zelda Gold Cartridge NES 1987',
        soldPrice: '20',
        evidenceDisposition: 'context_only',
        visualReviewStatus: 'match',
        visualReviewRationale: 'The item identity and artwork look similar, but the grading holder and numeric grade are not readable.',
      },
      {
        category: 'video_games',
        targetItemType: 'single_item',
        certificationCompany: 'PSA',
        targetGrade: 7.5,
        targetNumber: null,
        targetPlayer: null,
        visualReviewRequired: true,
      },
    );

    expect(candidate.evidenceDisposition).not.toBe('valuation_eligible');
    expect(candidate.evidenceReasons).toEqual(expect.arrayContaining([
      'grading or authentication company is not stated in the marketplace title',
      'grade is not stated or cannot be normalized from the marketplace title',
    ]));
  });

  it('keeps a visual decision bound to its provider record after declared conflicts compact the visible list', () => {
    const recordBoundAudit = {
      imageCount: 1,
      initialVerdict: 'mismatch' as const,
      initialConfidence: 'high' as const,
      retryStatus: 'performed' as const,
      finalPass: 'high_resolution_retry' as const,
    };
    const candidate = annotateSoldComparableCandidate(
      {
        title: 'Super Mario Bros. 3 NES PSA Graded 9.0 CIB',
        soldPrice: '950',
        // This is the decision already attached by the shared visual filter
        // to the original provider listing before unrelated conflict rows are
        // removed from the visible result set.
        visualReviewStatus: 'mismatch',
        visualReviewRationale: 'Both PSA labels are visible, but the candidate label says CIB while the target label says Sealed A.',
        visualAudit: recordBoundAudit,
      },
      {
        category: 'video_games',
        targetItemType: 'single_item',
        certificationCompany: 'PSA',
        targetGrade: 9,
        targetNumber: null,
        targetPlayer: null,
        visualReviewRequired: true,
        // Simulates a neighbouring record's result if a caller incorrectly
        // reuses a post-filter display index. The listing-bound decision must
        // win and cannot be overwritten by this fallback.
        visualReview: {
          candidateIndex: 0,
          verdict: 'match',
          confidence: 'high',
          rationale: 'Unrelated neighbouring listing.',
        },
      },
    );

    expect(candidate).toMatchObject({
      visualReviewStatus: 'mismatch',
      visualReviewRationale: 'Both PSA labels are visible, but the candidate label says CIB while the target label says Sealed A.',
      visualAudit: recordBoundAudit,
    });
    expect(candidate.evidenceReasons).toContain('visual comparison flag: Both PSA labels are visible, but the candidate label says CIB while the target label says Sealed A.');

    const routerSource = readFileSync(resolve(import.meta.dirname, './testAIRouter.ts'), 'utf8');
    expect(routerSource).not.toContain('visualReview: reviewByIndex.get(index)');
  });

  it('does not activate the high-value price gate at or below a $10,000 stated trade value', () => {
    expect(evaluateSoldCompPriceSafety(10_000, 1)).toMatchObject({ applies: false, status: 'inactive' });
    expect(evaluateSoldCompPriceSafety(1_000, 10_000)).toMatchObject({ applies: false, status: 'inactive' });

    const annotated = annotateSoldComparableCandidate(
      { title: 'High-value collectible', soldPrice: '1' },
      { category: 'coins', targetItemType: '', certificationCompany: '', targetGrade: null, targetNumber: null, targetPlayer: null, statedTradeValue: 10_000 },
    );
    expect(annotated.evidenceDisposition).toBe('valuation_eligible');
    expect(annotated.evidenceReasons).toEqual([]);
  });

  it('documents that graded-target condition handling is universal rather than eBay-route-specific', () => {
    const metadataSource = readFileSync(resolve(import.meta.dirname, '../shared/testAiMetadataConflict.ts'), 'utf8');
    expect(metadataSource).toContain('|| targetIsGraded');
    expect(metadataSource).toContain("['condition', 'mediaCondition']");
  });

  it('accepts sold comps exactly at 25% and 250% when the stated value is above $10,000', () => {
    expect(evaluateSoldCompPriceSafety(20_000, 5_000)).toMatchObject({ applies: true, status: 'accepted', minimumAcceptedPrice: 5_000, maximumAcceptedPrice: 50_000 });
    expect(evaluateSoldCompPriceSafety(20_000, 50_000)).toMatchObject({ applies: true, status: 'accepted', minimumAcceptedPrice: 5_000, maximumAcceptedPrice: 50_000 });
  });

  it.each(['coins', 'sports_cards', 'comics', 'video_games', 'stamps'])('keeps %s high-value Sold-Comps outliers as context only with a precise reason', (category) => {
    const baseContext = { category, targetItemType: '', certificationCompany: '', targetGrade: null, targetNumber: null, targetPlayer: null, statedTradeValue: 20_000 };
    const tooLow = annotateSoldComparableCandidate({ title: 'High-value collectible', soldPrice: '4999' }, baseContext);
    const tooHigh = annotateSoldComparableCandidate({ title: 'High-value collectible', soldPrice: '50001' }, baseContext);

    expect(tooLow.evidenceDisposition).toBe('warning_review');
    expect(tooLow.evidenceReasons).toContain('high-value price safety gate: sold comp $4,999 is below 25% of the stated trade value $20,000 ($5,000 minimum); retained as context only');
    expect(tooHigh.evidenceDisposition).toBe('warning_review');
    expect(tooHigh.evidenceReasons).toContain('high-value price safety gate: sold comp $50,001 is above 250% of the stated trade value $20,000 ($50,000 maximum); retained as context only');
  });
});

describe('Autographs automatic price-tail protection', () => {
  it('keeps an isolated $60 result visible as context but excludes it from valuation metrics', () => {
    const prices = [12_500, 10_000, 7_499, 1_099, 60, 9_000, 4_500];
    const gated = applyAutographPriceTailGate(prices.map((price, index) => ({
      title: `Babe Ruth signed baseball ${index}`,
      price,
      saleId: `babe-ruth-${index}`,
      evidenceDisposition: 'valuation_eligible',
      evidenceReasons: [],
    })));

    expect(gated.find((listing) => listing.price === 60)).toMatchObject({ evidenceDisposition: 'context_only' });
    expect(gated.find((listing) => listing.price === 60)?.evidenceReasons?.join(' ')).toContain('isolated Autographs price-tail outlier');
    expect(gated.filter((listing) => listing.evidenceDisposition === 'valuation_eligible').map((listing) => listing.price)).toEqual([12_500, 10_000, 7_499, 1_099, 9_000, 4_500]);
  });

  it('does not trim a normal five-item spread merely because prices differ', () => {
    const gated = applyAutographPriceTailGate([100, 250, 500, 900, 1_800].map((price, index) => ({
      title: `signed item ${index}`,
      price,
      saleId: `normal-${index}`,
      evidenceDisposition: 'valuation_eligible',
    })));
    expect(gated.every((listing) => listing.evidenceDisposition === 'valuation_eligible')).toBe(true);
  });
});

describe('Original Art automatic price-tail protection', () => {
  it('keeps an isolated low-priced listing visible as context but excludes it from market-range metrics', () => {
    const prices = [12_500, 10_000, 7_499, 1_099, 60, 9_000, 4_500];
    const gated = applyIsolatedMarketPriceTailGate(prices.map((price, index) => ({
      title: `Original art listing ${index}`,
      price,
      saleId: `original-art-${index}`,
      evidenceDisposition: 'context_only',
      evidenceReasons: ['Original Art market-range context only.'],
    })), { label: 'Original Art', includeContextOnly: true });

    const isolated = gated.find((listing) => listing.price === 60);
    expect(isolated).toMatchObject({ evidenceDisposition: 'context_only', priceTailExcludedFromMetrics: true });
    expect(isolated?.evidenceReasons?.join(' ')).toContain('isolated Original Art price-tail outlier');
    expect(gated.filter((listing) => !listing.priceTailExcludedFromMetrics).map((listing) => listing.price)).toEqual([12_500, 10_000, 7_499, 1_099, 9_000, 4_500]);
  });
});


describe('Stage 1 composed grading admission', () => {
  const context = { category: 'video_games', targetItemType: 'game', certificationCompany: 'PSA', targetGrade: 7.5, targetNumber: null, targetPlayer: null, visualReviewRequired: true,
    targetMetadata: 'title=The Legend of Zelda; category=video_games; grade=7.50; certificationCompany=PSA' };
  const item = { title: 'The Legend of Zelda NES PSA 7.5', soldPrice: '100', visualReviewStatus: 'match', visualReviewRationale: 'The item identity matches.' };

  it.each([undefined, { ...confirmedGradedEvidence, gradeMatches: false }, { ...confirmedGradedEvidence, numericGradeVisible: false }, { ...confirmedGradedEvidence, identityMatches: false }])('does not admit title-matching graded records without valid deciding evidence %#', (visualEvidence) => {
    const result = annotateSoldComparableCandidate({ ...item, visualEvidence }, context);
    expect(result.evidenceDisposition).not.toBe('valuation_eligible');
    expect(result.evidenceReasons).toContain('graded visual confirmation is incomplete or contradictory; a matching title cannot replace the deciding image evidence');
  });

  it('uses confirmed final evidence rather than historical raw retry wording', () => {
    const result = annotateSoldComparableCandidate({ ...item, visualAudit: { finalPass: 'high_resolution_retry', retryStatus: 'performed', retryReason: 'The candidate appears raw in the preliminary pass.', initialEvidence: { ...confirmedGradedEvidence, rawOrLooseVisible: true }, finalEvidence: confirmedGradedEvidence } }, context);
    expect(result.evidenceDisposition).toBe('valuation_eligible');
  });

  it('does not borrow initial positive evidence when the actual final evidence is raw', () => {
    const result = annotateSoldComparableCandidate({ ...item, visualEvidence: { ...confirmedGradedEvidence, rawOrLooseVisible: true }, visualAudit: { finalPass: 'high_resolution_retry', initialEvidence: confirmedGradedEvidence } }, context);
    expect(result.evidenceDisposition).not.toBe('valuation_eligible');
    expect(result.evidenceReasons).toContain('candidate is visually raw/ungraded while the target is graded; this is a hard identity conflict');
  });

  it('does not call unknown grade readability a proven raw conflict', () => {
    const result = annotateSoldComparableCandidate({ ...item, visualReviewRationale: 'No visible grade can be read.', visualEvidence: { ...confirmedGradedEvidence, numericGradeVisible: false } }, context);
    expect(result.evidenceDisposition).not.toBe('valuation_eligible');
    expect(result.evidenceReasons).not.toContain('candidate is visually raw/ungraded while the target is graded; this is a hard identity conflict');
  });

  it('keeps confirmed evidence through attachment and repeated annotation', () => {
    const reviews = [{ candidateIndex: 0, verdict: 'match' as const, confidence: 'high' as const, rationale: 'The exact identity and grading are confirmed.', visualEvidence: confirmedGradedEvidence }];
    const attached = applyVisualSourceReviews([{ title: 'The Legend of Zelda NES', soldPrice: '100' }], reviews, 1).listings[0];
    const first = annotateSoldComparableCandidate(attached, context);
    const second = annotateSoldComparableCandidate(first, context);
    expect(first.evidenceDisposition).toBe('valuation_eligible');
    expect(second.evidenceDisposition).toBe('valuation_eligible');
    expect(second.visualEvidence).toEqual(confirmedGradedEvidence);
  });

  it('never hands a narrative-promoted grading contradiction to valuation', () => {
    const reviews = conservativeGradedVisualReviews([{ candidateIndex: 0, verdict: 'unreadable', confidence: 'low', rationale: 'The PSA grade 7.5 is clearly readable and matches; the game identity matches.', visualEvidence: { ...confirmedGradedEvidence, gradeMatches: false } }], [item], context.targetMetadata);
    const attached = applyVisualSourceReviews([item], reviews, 1).listings[0];
    expect(annotateSoldComparableCandidate(attached, context).evidenceDisposition).not.toBe('valuation_eligible');
  });

  it('keeps explicit lots and high-value safety blocking despite positive graded review', () => {
    const lot = annotateSoldComparableCandidate({ ...item, title: item.title + ' Lot of 2', visualEvidence: confirmedGradedEvidence }, context);
    expect(lot.evidenceDisposition).not.toBe('valuation_eligible');
    const unsafe = annotateSoldComparableCandidate({ ...item, soldPrice: '1', visualEvidence: confirmedGradedEvidence }, { ...context, statedTradeValue: 20000 });
    expect(unsafe.evidenceDisposition).not.toBe('valuation_eligible');
  });

  it('does not let a neighbouring fallback review supply missing bound grading evidence', () => {
    const result = annotateSoldComparableCandidate(item, { ...context, visualReview: { candidateIndex: 1, verdict: 'match', confidence: 'high', rationale: 'Different listing confirmed.', visualEvidence: confirmedGradedEvidence } });
    expect(result.evidenceDisposition).not.toBe('valuation_eligible');
  });

  it('respects an explicitly ungraded target instead of stale grade context', () => {
    const result = annotateSoldComparableCandidate({ ...item, visualEvidence: { rawOrLooseVisible: true }, visualReviewRationale: 'Both items are raw and match.' }, { ...context, targetMetadata: 'title=The Legend of Zelda; category=video_games; isGraded=No' });
    expect(result.evidenceDisposition).toBe('valuation_eligible');
  });
});
