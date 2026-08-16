import { describe, expect, it } from 'vitest';
import { buildVideoGameTestAiCriteria, filterTestAiListingsByYear, resolveTestAiYear } from '../shared/testAiCriteria';

describe('video-game Test AI year criteria', () => {
  it('uses a reliable listing year before title and platform', () => {
    const details = { releaseYear: '1990', gameTitle: 'Super Mario Bros 3', platform: 'NES' };
    expect(resolveTestAiYear(details)).toBe('1990');
    expect(buildVideoGameTestAiCriteria(details, 'fallback')).toBe('1990 Super Mario Bros 3 NES');
  });

  it('removes listings with a conflicting stated year while retaining yearless results', () => {
    const listings = [
      { title: 'Super Mario Bros 3 WATA 9.0 Nintendo NES 1990' },
      { title: '2011 MARIO Super Mario Bros. PSA 9 Nintendo 3DS' },
      { title: 'Super Mario Bros 3 graded sealed Nintendo NES' },
    ];

    expect(filterTestAiListingsByYear(listings, '1990')).toEqual([
      listings[0],
      listings[2],
    ]);
  });
});
