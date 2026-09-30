import { describe, expect, it } from 'vitest';
import { buildMarketProfile, deterministicTradeComparison, scoreComparable } from './testAiComparableEngine';
import { extractIdentityState, identityStateConflicts } from './testAiIdentityState';

const date = '2026-09-20';
const sale = (title: string, price: number) => ({ title, price, currency: 'USD', date, saleStatus: 'completed' as const, priceBasis: 'sold' as const, sourceId: 'ebay', saleId: `${title}-${price}` });

describe('universal analyzer identity state', () => {
  it('distinguishes raw and graded listings', () => {
    expect(extractIdentityState({ title: '2018 Panini Luka Doncic #280 raw' }).state).toBe('raw');
    expect(extractIdentityState({ title: '2018 Panini Luka Doncic #280 PSA 10' }).state).toBe('graded');
  });

  it('treats equivalent numeric grade formatting as the same grade', () => {
    const target = extractIdentityState({ title: 'CGC comic', grade: '9.60', certificationCompany: 'CGC' });
    const sale = extractIdentityState({ title: 'CGC comic', grade: '9.6', certificationCompany: 'CGC' });
    expect(identityStateConflicts(target, sale)).not.toContain('grade differs (9.6 vs 9.60)');
  });

  it('rejects a graded candidate for a raw target and a raw candidate for a graded target', () => {
    const rawTarget = { title: '2018 Panini Prizm Luka Doncic #280', category: 'sports_cards', itemDetails: JSON.stringify({ cardNumber: '280' }) };
    const gradedTarget = { ...rawTarget, title: `${rawTarget.title} PSA 10`, grade: '10', certificationCompany: 'PSA' };
    expect(scoreComparable(rawTarget, sale('2018 Panini Prizm Luka Doncic #280 PSA 10', 100)).accepted).toBe(false);
    expect(scoreComparable(gradedTarget, sale('2018 Panini Prizm Luka Doncic #280 raw', 100)).accepted).toBe(false);
  });

  it('rejects lots and explicit negative listing signals', () => {
    const target = { title: '1996 Topps Kobe Bryant #138 PSA 10', category: 'sports_cards', grade: '10', certificationCompany: 'PSA', itemDetails: JSON.stringify({ cardNumber: '138' }) };
    const lot = scoreComparable(target, sale('1996 Topps Kobe Bryant #138 PSA 10 lot of 3', 300));
    const proxy = scoreComparable(target, sale('1996 Topps Kobe Bryant #138 custom reprint', 20));
    expect(lot.accepted).toBe(false);
    expect(proxy.accepted).toBe(false);
  });

  it('requires five clean accepted sales per side before a definitive verdict', () => {
    const target = { title: '1996 Topps Kobe Bryant #138 PSA 10', category: 'sports_cards', grade: '10', certificationCompany: 'PSA', itemDetails: JSON.stringify({ player: 'Kobe Bryant', year: '1996', manufacturer: 'Topps', cardNumber: '138' }) };
    const left = buildMarketProfile(target, [100, 105, 110].map((p) => sale(target.title, p)));
    const right = buildMarketProfile(target, [130, 135, 140].map((p) => sale(target.title, p)));
    expect(left.marketRange.supported).toBe(true);
    expect(deterministicTradeComparison(left, right).verdict).toBe('Insufficient Evidence');
  });
});
