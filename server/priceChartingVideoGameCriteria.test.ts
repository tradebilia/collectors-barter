import { describe, expect, it } from 'vitest';
import { buildPriceChartingVideoGameSearchInput } from '../shared/testAiCriteria';

describe('PriceCharting Video Game search criteria', () => {
  it('uses structured game title and platform only', () => {
    expect(buildPriceChartingVideoGameSearchInput({
      gameTitle: 'Call of Duty: World at War',
      platform: 'Xbox 360',
      releaseYear: '2008',
      edition: 'First Print',
      gradingCompany: 'PSA',
      grade: '9.8',
    }, 'Call of Duty: World at War-Xbox 360 First Print PSA 9.8')).toEqual({
      query: 'Call of Duty: World at War',
      platform: 'Xbox 360',
    });
  });

  it('derives the platform and removes collectible qualifiers from a listing title fallback', () => {
    expect(buildPriceChartingVideoGameSearchInput({}, 'Call of Duty: World at War-Xbox 360 First Print PSA 9.8')).toEqual({
      query: 'Call of Duty: World at War',
      platform: 'Xbox 360',
    });
  });

  it('does not add year, grade, edition, or condition when only structured title and platform are available', () => {
    const result = buildPriceChartingVideoGameSearchInput({
      gameTitle: 'The Legend of Zelda',
      platform: 'NES',
      releaseYear: '1987',
      grade: '7.5',
      sealed: 'Yes',
      completeInBox: 'Yes',
    }, 'The Legend of Zelda NES WATA 7.5 Sealed A++');
    expect(result.query).toBe('The Legend of Zelda');
    expect(result.query).not.toMatch(/1987|7\.5|WATA|sealed|CIB/i);
  });
});
