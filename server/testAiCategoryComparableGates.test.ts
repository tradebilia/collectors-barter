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

  it('requires Stamp issuer, Scott number, denomination, form, and stated hinged or mint condition before direct valuation', () => {
    const target: ComparableTarget = {
      title: 'United States Scott C1 24c Mint Hinged Stamp Block',
      category: 'stamps',
      itemType: 'stamp_block',
      condition: 'Mint Hinged',
      itemDetails: JSON.stringify({
        country: 'United States',
        scottNumber: 'C1',
        denomination: '24c',
        format: 'stamp block',
        hinged: 'Yes',
        mintOrUsed: 'Mint',
      }),
    };
    const exact = scoreComparable(target, completed('United States Scott C1 24c Mint Hinged Stamp Block'));
    const conflict = scoreComparable(target, completed('Canada Scott C2 6c Used Stamp Block'));
    const sparse = scoreComparable(target, completed('United States Scott C1'));

    expect(exact.accepted).toBe(true);
    expect(exact.categoryIdentity).toMatchObject({
      status: 'direct_confirmed',
      confirmedFields: expect.arrayContaining(['Hinge state']),
    });
    expect(conflict.accepted).toBe(false);
    expect(conflict.categoryIdentity).toMatchObject({
      status: 'objective_conflict',
      conflicts: expect.arrayContaining(['Country differs (canada)', 'Scott / catalog # differs (C2)', 'Denomination differs (6c)']),
    });
    expect(sparse.accepted).toBe(false);
    expect(sparse.categoryIdentity.status).toBe('needs_review');
  });

  it('requires Video Game title and platform, while blocking an explicit wrong platform or object form', () => {
    const target: ComparableTarget = {
      title: 'The Legend of Zelda NES Factory Sealed',
      category: 'video_games',
      itemType: 'game',
      condition: 'Factory Sealed',
      itemDetails: JSON.stringify({
        gameTitle: 'The Legend of Zelda',
        platform: 'NES',
        objectType: 'Game',
        region: 'United States',
        edition: 'Original Release',
        sealed: 'Yes',
        upc: '045496630025',
      }),
    };
    const exact = scoreComparable(target, completed('The Legend of Zelda NES United States Original Release Factory Sealed UPC 045496630025 Game'));
    const wrongPlatform = scoreComparable(target, completed('The Legend of Zelda SNES United States Original Release Factory Sealed UPC 045496630025 Game'));
    const wrongForm = scoreComparable(target, completed('The Legend of Zelda NES United States Original Release Factory Sealed UPC 045496630025 Console'));

    expect(exact.accepted).toBe(true);
    expect(exact.categoryIdentity.status).toBe('direct_confirmed');
    expect(wrongPlatform.accepted).toBe(false);
    expect(wrongPlatform.categoryIdentity.conflicts).toContain('Platform differs (snes)');
    expect(wrongForm.accepted).toBe(false);
    expect(wrongForm.categoryIdentity.conflicts).toContain('Object form differs (console)');
  });

  it('requires Music artist and release alignment, and blocks an explicit artist or catalog conflict', () => {
    const target: ComparableTarget = {
      title: 'Miles Davis - Kind of Blue First Pressing Vinyl',
      category: 'music',
      itemDetails: JSON.stringify({
        artist: 'Miles Davis',
        releaseTitle: 'Kind of Blue',
        catalogNumber: 'CL 1355',
        recordLabel: 'Columbia',
        country: 'United States',
        format: 'Vinyl',
        pressing: 'First Pressing',
      }),
    };
    const exact = scoreComparable(target, completed('Miles Davis - Kind of Blue First Pressing Vinyl CL 1355 Columbia United States'));
    const wrongArtist = scoreComparable(target, completed('John Coltrane - Kind of Blue First Pressing Vinyl CL 1355 Columbia United States'));
    const wrongCatalog = scoreComparable(target, completed('Miles Davis - Kind of Blue First Pressing Vinyl CL 1356 Columbia United States'));

    expect(exact.accepted).toBe(true);
    expect(exact.categoryIdentity.status).toBe('direct_confirmed');
    expect(wrongArtist.accepted).toBe(false);
    expect(wrongArtist.categoryIdentity.conflicts).toContain('Artist differs (John Coltrane)');
    expect(wrongCatalog.accepted).toBe(false);
    expect(wrongCatalog.categoryIdentity.conflicts).toContain('Catalog # differs (CL1356)');
  });

  it('requires Disney Pin number, event, edition, and single-versus-lot form when they are supplied', () => {
    const target: ComparableTarget = {
      title: 'Disney Mickey Mouse D23 Pin #123 LE 500',
      category: 'disney_pins',
      itemType: 'single_pin',
      itemDetails: JSON.stringify({
        pinName: 'Mickey Mouse',
        character: 'Mickey Mouse',
        pinNumber: '123',
        pinTradingEvent: 'D23',
        limitedEdition: 'LE 500',
        editionSize: '500',
        itemForm: 'single pin',
      }),
    };
    const exact = scoreComparable(target, completed('Disney Mickey Mouse D23 Pin #123 LE 500'));
    const wrongNumber = scoreComparable(target, completed('Disney Mickey Mouse D23 Pin #124 LE 500'));
    const lot = scoreComparable(target, completed('Disney Mickey Mouse D23 Pin #123 LE 500 Lot of 4 Pins'));

    expect(exact.accepted).toBe(true);
    expect(exact.categoryIdentity.status).toBe('direct_confirmed');
    expect(wrongNumber.accepted).toBe(false);
    expect(wrongNumber.categoryIdentity.conflicts).toContain('Pin # differs (124)');
    expect(lot.accepted).toBe(false);
    expect(lot.categoryIdentity.conflicts).toContain('Pin form differs (lot)');
  });
});
