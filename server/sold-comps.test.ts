import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { annotateSoldComparableCandidate, assessSoldCompsPreVisionCandidates, buildEbayBrowseQuery, buildSoldCompsQueryCandidates, extractGradeFromTitle, extractSoldCompLotQuantity, filterListingsByCertificationCompany, filterListingsByGrade, filterListingsByNumber, getSoldCompsApiKey, hasExplicitSoldCompLot, hasSingleSportsCardForm, normalizeSearchGrade, normalizeSoldCompsMetadata } from './testAIRouter';
import { evaluateSoldCompPriceSafety } from '../shared/testAiSoldCompSafety';

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

  it('puts the precise query first when active retrieval preserves the grade', () => {
    expect(buildSoldCompsQueryCandidates('Transformers Megatron G1 AFA 60.0', { preserveGrade: true })[0])
      .toBe('Transformers Megatron G1 AFA 60.0');
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

  it('excludes condition-only candidates for graded targets but keeps explicit graded evidence', () => {
    const result = assessSoldCompsPreVisionCandidates({
      category: 'video_games',
      targetMetadata: 'title=The Legend of Zelda; category=video_games; grade=7.5; certificationCompany=PSA; fullItemDetails={"platform":"NES"}',
      targetPlatform: 'NES',
      targetIsGraded: true,
      listings: [
        { title: 'The Legend of Zelda NES Complete Mint Condition', condition: 'Mint', soldPrice: 100 },
        { title: 'The Legend of Zelda NES Tested Authentic', condition: 'Pre-Owned', soldPrice: 110 },
        { title: 'The Legend of Zelda NES WATA PSA 7.5 CIB', condition: 'Pre-Owned', soldPrice: 450 },
      ],
    });
    expect(result.eligible).toHaveLength(1);
    expect(result.eligible[0].title).toContain('WATA PSA 7.5');
    expect(result.excluded).toHaveLength(2);
    expect(result.excluded.map((entry) => entry.reasons.join(' ')).join(' ')).toMatch(/condition-only/i);
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

  it('rejects an explicit wrong grading company while retaining an unstated provider for review', () => {
    const listings = [
      { title: 'Edge of the Spider-Verse #2 CGC 9.8' },
      { title: 'Edge of the Spider-Verse #2 CBCS 9.8' },
      { title: 'Edge of the Spider-Verse #2 9.8' },
    ];

    expect(filterListingsByCertificationCompany(listings, 'CGC')).toEqual([listings[0], listings[2]]);
  });

  it('treats WATA and PSA as equivalent grader evidence for video games only', () => {
    const listings = [
      { title: 'The Legend of Zelda NES WATA PSA 7.5' },
      { title: 'The Legend of Zelda NES WATA 7.5' },
      { title: 'The Legend of Zelda NES VGA 7.5' },
      { title: 'The Legend of Zelda NES CGC 7.5 Graded 3 Screw Cart Not WATA, VGA, PSA' },
    ];

    expect(filterListingsByCertificationCompany(listings, 'PSA', 'video_games')).toEqual([listings[0], listings[1]]);
    expect(filterListingsByCertificationCompany(listings, 'WATA', 'video_games')).toEqual([listings[0], listings[1]]);
    expect(filterListingsByCertificationCompany(listings, 'PSA', 'comics')).toEqual([]);
  });

  it('does not allow a negated WATA/PSA phrase to override an explicit conflicting grader', () => {
    const listing = { title: 'The Legend of Zelda NES CGC 7.5 Not WATA, VGA, PSA' };
    expect(filterListingsByCertificationCompany([listing], 'PSA', 'video_games')).toEqual([]);
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
