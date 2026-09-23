import { describe, expect, it } from 'vitest';
import { buildVisualComparableContext, buildVisualComparableQuery } from './testAiVisualComparable';

describe('visual comparable refinement', () => {
  it('builds a bounded query from high-confidence identity fields', () => {
    const query = buildVisualComparableQuery(
      { title: 'Pokemon Charizard', category: 'pokemon', grade: '9', certificationCompany: 'PSA' },
      [
        { field: 'series', label: 'Series / Set', value: 'Shadowless', status: 'ocr_read', confidence: 'high', evidence: 'Label text' },
        { field: 'edition', label: 'Edition / Variant', value: 'Holo', status: 'ocr_read', confidence: 'high', evidence: 'Card title' },
        { field: 'rarity', label: 'Rarity', value: 'Holo Rare', status: 'inferred', confidence: 'medium', evidence: 'Visual clue' },
      ],
    );
    expect(query?.query).toBe('Pokemon Charizard Shadowless Holo PSA 9');
    expect(query?.fieldsUsed.map((field) => field.field)).toEqual(['series', 'edition']);
  });

  it('does not produce a refined query when no identity field is eligible', () => {
    expect(buildVisualComparableQuery(
      { title: 'Disney Chip Pin', category: 'disney_pins' },
      [{ field: 'condition', label: 'Condition', value: 'New', status: 'observed', confidence: 'high', evidence: 'Front image' }],
    )).toBeNull();
  });

  it('labels supplemental results as asking-price context', () => {
    const query = buildVisualComparableQuery(
      { title: 'Pokemon Charizard', category: 'pokemon' },
      [{ field: 'series', label: 'Series / Set', value: 'Shadowless', status: 'ocr_read', confidence: 'high', evidence: 'Label text' }],
    );
    const context = buildVisualComparableContext('ITEM A', query, { count: 4, median: 1200, min: 800, max: 1800, confidence: 'medium' });
    expect(context).toContain('refined query "Pokemon Charizard Shadowless"');
    expect(context).toContain('asking-price context only');
  });
});
