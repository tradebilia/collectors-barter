import { describe, expect, it } from 'vitest';
import {
  buildSportsCardTestAiCriteria,
  buildStructuredItemQuery,
  buildVideoGameTestAiCriteria,
  filterTestAiListingsByYear,
  parseTestAiDetails,
  resolveTestAiDetailValue,
  resolveTestAiGradingCompany,
  resolveTestAiYear,
} from '../shared/testAiCriteria';

describe('video-game Test AI year criteria', () => {
  it('uses a reliable listing year before title and platform', () => {
    const details = { releaseYear: '1990', gameTitle: 'Super Mario Bros 3', platform: 'NES' };
    expect(resolveTestAiYear(details)).toBe('1990');
    expect(buildVideoGameTestAiCriteria(details, 'fallback')).toBe('1990 Super Mario Bros 3 NES');
  });

  it('replaces Other with the matching custom field in every Test AI search builder', () => {
    const videoGame = { releaseYear: '2000', gameTitle: 'Pokemon Silver Version', platform: 'Other', customPlatform: 'Game Boy Color' };
    expect(buildVideoGameTestAiCriteria(videoGame, 'fallback')).toBe('2000 Pokemon Silver Version Game Boy Color');
    expect(buildStructuredItemQuery('video_games', videoGame, ['PSA', '8'])).toBe('Pokemon Silver Version 2000 Game Boy Color PSA 8');

    expect(buildSportsCardTestAiCriteria({
      year: '1993', manufacturer: 'Other', customManufacturer: 'Pinnacle', player: 'Example Player', cardNumber: '1',
    })).toBe('1993 Pinnacle Example Player 1');

    expect(resolveTestAiDetailValue({ format: 'Other', customFormat: 'Betamax' }, 'format')).toBe('Betamax');
    expect(parseTestAiDetails(JSON.stringify({
      platform: 'Other', customPlatform: 'Game Boy Color',
      format: 'Other', customFormat: 'Betamax',
    }))).toMatchObject({ platform: 'Game Boy Color', format: 'Betamax' });
    expect(resolveTestAiGradingCompany({ gradingCompany: 'Other', customGradingCompany: 'WATA' })).toBe('WATA');
  });

  it('omits Other instead of guessing when its custom value is absent', () => {
    const details = { releaseYear: '2000', gameTitle: 'Pokemon Silver Version', platform: 'Other' };
    expect(buildVideoGameTestAiCriteria(details, 'fallback')).toBe('2000 Pokemon Silver Version');
    expect(buildStructuredItemQuery('video_games', details)).not.toContain('Other');
    expect(parseTestAiDetails(details)).not.toHaveProperty('platform');
  });

  it('retains year-mismatched and yearless listings for downstream review', () => {
    const listings = [
      { title: 'Super Mario Bros 3 WATA 9.0 Nintendo NES 1990' },
      { title: '2011 MARIO Super Mario Bros. PSA 9 Nintendo 3DS' },
      { title: 'Super Mario Bros 3 graded sealed Nintendo NES' },
    ];

    expect(filterTestAiListingsByYear(listings, '1990')).toEqual(listings);
  });
});
