import { describe, expect, it } from 'vitest';
import { buildSportsCardTestAiCriteria, resolveTestAiManufacturer } from '../shared/testAiCriteria';

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
});
