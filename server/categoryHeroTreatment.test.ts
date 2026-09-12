import { describe, expect, it } from 'vitest';
import { getCategoryHeroTreatment } from '../client/src/lib/categoryHeroTreatment';

describe('shared category hero treatment', () => {
  it('uses the same treatment contract for category and item-detail consumers', () => {
    expect(getCategoryHeroTreatment('sports_cards')).toEqual({
      backgroundFilter: 'none',
      backgroundRepeat: 'repeat',
      backgroundPosition: 'center',
      overlayClassName: 'bg-black/30',
    });
    expect(getCategoryHeroTreatment('movies')).toEqual({
      backgroundFilter: 'contrast(1.2) saturate(1.1)',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center top',
      overlayClassName: 'bg-black/10',
    });
  });

  it('applies the contrast treatment to categories that use it', () => {
    for (const category of ['video_games', 'coins', 'stamps', 'vintage_toys', 'autographs', 'comics', 'pokemon', 'disney_pins']) {
      expect(getCategoryHeroTreatment(category).backgroundFilter).toBe('contrast(1.2) saturate(1.1)');
    }
  });
});
