import { describe, it, expect } from 'vitest';
import { annotateSoldComparableCandidate, buildEbayBrowseQuery, buildSoldCompsQueryCandidates, filterListingsByCertificationCompany, filterListingsByGrade, filterListingsByNumber, getSoldCompsApiKey, hasSingleSportsCardForm, normalizeSearchGrade } from './testAIRouter';
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

  it('rejects an explicit wrong grading company while retaining an unstated provider for review', () => {
    const listings = [
      { title: 'Edge of the Spider-Verse #2 CGC 9.8' },
      { title: 'Edge of the Spider-Verse #2 CBCS 9.8' },
      { title: 'Edge of the Spider-Verse #2 9.8' },
    ];

    expect(filterListingsByCertificationCompany(listings, 'CGC')).toEqual([listings[0], listings[2]]);
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

  it('does not activate the high-value price gate at or below a $2,000 stated trade value', () => {
    expect(evaluateSoldCompPriceSafety(2_000, 1)).toMatchObject({ applies: false, status: 'inactive' });
    expect(evaluateSoldCompPriceSafety(1_000, 10_000)).toMatchObject({ applies: false, status: 'inactive' });

    const annotated = annotateSoldComparableCandidate(
      { title: 'High-value collectible', soldPrice: '1' },
      { category: 'coins', targetItemType: '', certificationCompany: '', targetGrade: null, targetNumber: null, targetPlayer: null, statedTradeValue: 2_000 },
    );
    expect(annotated.evidenceDisposition).toBe('valuation_eligible');
    expect(annotated.evidenceReasons).toEqual([]);
  });

  it('accepts sold comps exactly at 25% and 250% when the stated value is above $2,000', () => {
    expect(evaluateSoldCompPriceSafety(3_000, 750)).toMatchObject({ applies: true, status: 'accepted', minimumAcceptedPrice: 750, maximumAcceptedPrice: 7_500 });
    expect(evaluateSoldCompPriceSafety(3_000, 7_500)).toMatchObject({ applies: true, status: 'accepted', minimumAcceptedPrice: 750, maximumAcceptedPrice: 7_500 });
  });

  it('keeps high-value Sold-Comps outliers as context only with a precise reason', () => {
    const baseContext = { category: 'coins', targetItemType: '', certificationCompany: '', targetGrade: null, targetNumber: null, targetPlayer: null, statedTradeValue: 3_000 };
    const tooLow = annotateSoldComparableCandidate({ title: 'High-value collectible', soldPrice: '749' }, baseContext);
    const tooHigh = annotateSoldComparableCandidate({ title: 'High-value collectible', soldPrice: '7501' }, baseContext);

    expect(tooLow.evidenceDisposition).toBe('warning_review');
    expect(tooLow.evidenceReasons).toContain('high-value price safety gate: sold comp $749 is below 25% of the stated trade value $3,000 ($750 minimum); retained as context only');
    expect(tooHigh.evidenceDisposition).toBe('warning_review');
    expect(tooHigh.evidenceReasons).toContain('high-value price safety gate: sold comp $7,501 is above 250% of the stated trade value $3,000 ($7,500 maximum); retained as context only');
  });
});
