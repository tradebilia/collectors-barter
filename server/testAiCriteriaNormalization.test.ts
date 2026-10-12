import { describe, expect, it } from 'vitest';
import { buildStructuredItemQuery, normalizeTestAiGrade } from '../shared/testAiCriteria';

describe('Test AI category-scoped PSA grade normalization', () => {
  it('preserves one decimal place for PSA video games', () => {
    expect(normalizeTestAiGrade('7.50', 'PSA', 'video_games')).toBe('7.5');
    expect(buildStructuredItemQuery(
      'video_games',
      { year: '1987', gameTitle: 'The Legend of Zelda', platform: 'NES' },
      ['PSA', '7.5'],
    )).toContain('PSA 7.5');
  });

  it('retains whole-number PSA normalization for sports cards', () => {
    expect(normalizeTestAiGrade('7.5', 'PSA', 'sports_cards')).toBe('8');
    expect(buildStructuredItemQuery(
      'sports_cards',
      { year: '1990', player: 'Example', cardNumber: '1', setName: 'Example Set', gradingCompany: 'PSA' },
      ['PSA', '7.5'],
    )).toContain('PSA 8');
  });
});
