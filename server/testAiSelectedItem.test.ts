import { describe, expect, it } from 'vitest';
import { extractTestAiTitleYear, normalizeTestAiSelectedItem } from '../shared/testAiSelectedItem';

describe('Test AI selected item year normalization', () => {
  it('extracts a valid year from the current listing title', () => {
    expect(extractTestAiTitleYear('1986 OPC Hockey Box BBCE')).toBe('1986');
  });

  it('overrides stale serialized year data with the current title year', () => {
    const normalized = normalizeTestAiSelectedItem({
      id: 42,
      title: '1986 OPC Hockey Box BBCE',
      itemDetails: JSON.stringify({ year: '1987', sport: 'Hockey', productFormat: 'Box' }),
    });

    expect(normalized.year).toBe('1986');
    expect(JSON.parse(normalized.itemDetails).year).toBe('1986');
    expect(JSON.parse(normalized.itemDetails).sport).toBe('Hockey');
  });

  it('uses a valid stored year when the title has no year', () => {
    const normalized = normalizeTestAiSelectedItem({
      title: 'OPC Hockey Box BBCE',
      itemDetails: JSON.stringify({ year: '1987' }),
    });

    expect(normalized.year).toBe('1987');
    expect(JSON.parse(normalized.itemDetails).year).toBe('1987');
  });

  it('does not promote an invalid year into query data', () => {
    const normalized = normalizeTestAiSelectedItem({
      title: 'OPC Hockey Box BBCE',
      itemDetails: JSON.stringify({ year: '0' }),
    });

    expect(normalized.year).toBeUndefined();
    expect(JSON.parse(normalized.itemDetails).year).toBe('0');
  });
});
