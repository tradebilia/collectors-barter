import { describe, expect, it } from 'vitest';
import { scoreComparable } from './testAiComparableEngine';

const recent = { price: 100, currency: 'USD', date: '2026-09-15T00:00:00.000Z' };

describe('analyzer marketplace-title parser recall', () => {
  it('recognizes a bare comic issue number immediately before the grading company', () => {
    const match = scoreComparable({
      title: 'Edge of Spider-Verse #2',
      category: 'comics',
      grade: '9.8',
      certificationCompany: 'CGC',
      itemDetails: JSON.stringify({ comicTitle: 'Edge of Spider-Verse', issueNumber: '2', publisher: 'Marvel' }),
    }, {
      ...recent,
      title: 'Edge of Spider-Verse 2 Marvel CGC 9.8',
    });
    expect(match.categoryIdentity.status).toBe('direct_confirmed');
    expect(match.accepted).toBe(true);
  });

  it('recognizes the ordinary year-and-mint-word coin title form', () => {
    const match = scoreComparable({
      title: '1921-S Peace Dollar PCGS MS65',
      category: 'coins',
      grade: 'MS65',
      certificationCompany: 'PCGS',
      itemDetails: JSON.stringify({ country: 'United States', denomination: '$1', year: '1921', mintMark: 'S' }),
    }, {
      ...recent,
      title: '1921 S Mint Peace Dollar PCGS MS65',
    });
    expect(match.categoryIdentity.confirmedFields).toContain('Mint mark');
    expect(match.accepted).toBe(true);
  });

  it('does not mistake unhinged stamp wording for a hinged conflict', () => {
    const match = scoreComparable({
      title: 'US Scott 123 2c Stamp Never Hinged',
      category: 'stamps',
      itemDetails: JSON.stringify({ country: 'United States', scottNumber: '123', denomination: '2c', hinged: 'Never Hinged' }),
    }, {
      ...recent,
      title: 'United States Scott 123 2c Mint Never Hinged Stamp',
    });
    expect(match.categoryIdentity.confirmedFields).toContain('Hinge state');
    expect(match.categoryIdentity.conflicts).toEqual([]);
  });
});
