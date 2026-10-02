import { describe, expect, it } from 'vitest';
import { buildSportsCardTestAiCriteria, buildStructuredItemQuery, resolveTestAiGradingCompany, resolveTestAiManufacturer } from '../shared/testAiCriteria';

describe('Test AI manufacturer criteria', () => {
  it('uses Custom Manufacturer rather than the Other placeholder', () => {
    expect(resolveTestAiManufacturer({ manufacturer: 'Other', customManufacturer: 'O-Pee-Chee' })).toBe('O-Pee-Chee');
  });

  it('retains the standard manufacturer and safely handles an empty custom value', () => {
    expect(resolveTestAiManufacturer({ manufacturer: 'Topps', customManufacturer: 'Ignored' })).toBe('Topps');
    expect(resolveTestAiManufacturer({ manufacturer: 'Other', customManufacturer: '   ' })).toBe('');
  });

  it('matches the stored Wayne Gretzky listing detail shape', () => {
    expect(resolveTestAiManufacturer({ manufacturer: 'Other', customManufacturer: 'O-Pee-Chee', player: 'Wayne Gretzky' })).toBe('O-Pee-Chee');
  });

  it('builds a sports-card source query with Custom Manufacturer rather than Other', () => {
    expect(buildSportsCardTestAiCriteria({
      year: '1979', manufacturer: 'Other', customManufacturer: 'O-Pee-Chee', player: 'Wayne Gretzky', cardNumber: '18',
    })).toBe('1979 O-Pee-Chee Wayne Gretzky 18');
  });

  it('builds a title-independent structured query from stored fields', () => {
    expect(buildStructuredItemQuery('sports_cards', JSON.stringify({
      year: '1989', manufacturer: 'Upper Deck', player: 'Ken Griffey Jr.', cardNumber: '1', setName: 'Base',
    }), ['PSA', '10.00'])).toBe('1989 Upper Deck Ken Griffey Jr. 1 Base PSA 10.0');
    expect(buildStructuredItemQuery('sports_cards', JSON.stringify({ year: '1989' }))).toBe('1989');
  });

  it('replaces Other with the custom grading-company field', () => {
    const details = { gradingCompany: 'Other', customGradingCompany: 'KSA' };
    expect(resolveTestAiGradingCompany(details, 'Other')).toBe('KSA');
    expect(buildStructuredItemQuery('sports_cards', details, ['Other'])).toContain('KSA');
    expect(buildStructuredItemQuery('sports_cards', details, ['Other'])).not.toContain('Other');
  });

  it('normalizes a two-decimal grade to one decimal in the structured query', () => {
    expect(buildStructuredItemQuery('sports_cards', { year: '1979' }, ['9.00'])).toBe('1979 9.0');
  });

  it('does not append condition when a grading company and grade are present', () => {
    const query = buildStructuredItemQuery('sports_cards', { year: '1979', manufacturer: 'Other', customManufacturer: 'O-Pee-Chee', player: 'Wayne Gretzky', cardNumber: '18' }, ['9.00', 'PSA']);
    expect(query).toBe('1979 O-Pee-Chee Wayne Gretzky 18 9.0 PSA');
    expect(query).not.toContain('mint');
  });
});
