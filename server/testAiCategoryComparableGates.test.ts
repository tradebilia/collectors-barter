import { describe, expect, it } from 'vitest';
import { scoreComparable, type ComparableTarget, type MarketSale } from './testAiComparableEngine';

const completed = (title: string): MarketSale => ({
  title,
  price: 100,
  currency: 'USD',
  date: '2026-09-20T00:00:00.000Z',
  saleStatus: 'completed',
  priceBasis: 'sold',
  recency: 'recent',
});

describe('category-specific comparable identity gates', () => {
  it('requires sports-card player, year, manufacturer, and card number before direct valuation', () => {
    const target: ComparableTarget = {
      title: '1996 Topps Kobe Bryant #138 PSA 10',
      category: 'sports_cards',
      grade: '10',
      certificationCompany: 'PSA',
      itemDetails: JSON.stringify({ player: 'Kobe Bryant', year: '1996', manufacturer: 'Topps', cardNumber: '138' }),
    };
    const exact = scoreComparable(target, completed('1996 Topps Kobe Bryant #138 PSA 10'));
    const sparse = scoreComparable(target, completed('Kobe Bryant PSA 10'));

    expect(exact.accepted).toBe(true);
    expect(exact.categoryIdentity).toMatchObject({ status: 'direct_confirmed', confirmedFields: ['Player', 'Year', 'Manufacturer', 'Card #'] });
    expect(sparse.accepted).toBe(false);
    expect(sparse.categoryIdentity.status).toBe('needs_review');
    expect(sparse.exclusionReason).toContain('category-specific identity needs review');
  });

  it('blocks an explicit Pokémon card-number conflict without deleting it from the audit', () => {
    const target: ComparableTarget = {
      title: 'Pokemon Base Set Charizard #4 PSA 9',
      category: 'pokemon',
      grade: '9',
      certificationCompany: 'PSA',
      itemDetails: JSON.stringify({ cardName: 'Charizard', setName: 'Base Set', cardNumber: '4' }),
    };
    const conflict = scoreComparable(target, completed('Pokemon Base Set Charizard #3 PSA 9'));

    expect(conflict.accepted).toBe(false);
    expect(conflict.classification).toBe('rejected');
    expect(conflict.categoryIdentity).toMatchObject({ status: 'objective_conflict', conflicts: ['Card # differs (3)'] });
  });

  it('requires comic series, issue, and publisher confirmation for direct valuation', () => {
    const target: ComparableTarget = {
      title: 'Uncanny X-Men #137 CGC 9.8',
      category: 'comics',
      grade: '9.8',
      certificationCompany: 'CGC',
      itemDetails: JSON.stringify({ comicTitle: 'Uncanny X-Men', issueNumber: '137', publisher: 'Marvel' }),
    };
    const exact = scoreComparable(target, completed('Marvel Uncanny X-Men #137 CGC 9.8'));
    const wrongIssue = scoreComparable(target, completed('Marvel Uncanny X-Men #138 CGC 9.8'));

    expect(exact.accepted).toBe(true);
    expect(exact.categoryIdentity.status).toBe('direct_confirmed');
    expect(wrongIssue.accepted).toBe(false);
    expect(wrongIssue.categoryIdentity).toMatchObject({ status: 'objective_conflict', conflicts: ['Issue # differs (138)'] });
  });

  it('requires coin year and denomination but keeps a different stated year as review context', () => {
    const target: ComparableTarget = {
      title: '1921 Peace Dollar PCGS MS65',
      category: 'coins',
      grade: 'MS65',
      certificationCompany: 'PCGS',
      itemDetails: JSON.stringify({ country: 'United States', denomination: '$1', year: '1921' }),
    };
    const exact = scoreComparable(target, completed('1921 Peace Dollar PCGS MS65'));
    const differentYear = scoreComparable(target, completed('1922 Peace Dollar PCGS MS65'));

    expect(exact.accepted).toBe(true);
    expect(exact.categoryIdentity.status).toBe('direct_confirmed');
    expect(differentYear.accepted).toBe(false);
    expect(differentYear.classification).toBe('contextual');
    expect(differentYear.categoryIdentity.status).toBe('needs_review');
    expect(differentYear.categoryIdentity.unconfirmedFields).toContain('Year stated as 1922');
  });
});
