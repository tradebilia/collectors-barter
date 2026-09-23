import { describe, expect, it } from 'vitest';
import { buildFieldCompletionPrompt, getFieldTableForItem, normalizeFieldCompletion, parseFieldCompletionJson } from './testAiFieldCompletion';

describe('Test AI field completion', () => {
  it('uses the category and item type field table', () => {
    const fields = getFieldTableForItem('Sports Cards', 'unopened_product').map(([name]) => name);
    expect(fields).toEqual(expect.arrayContaining(['sport', 'manufacturer', 'sealedStatus', 'productType']));
  });

  it('drops unsupported fields and flags inferred/conflicting values for review', () => {
    const result = normalizeFieldCompletion({
      fields: [
        { field: 'player', value: 'Ken Griffey Jr.', status: 'ocr_read', confidence: 'high', evidence: 'Visible name on card' },
        { field: 'marketValue', value: '$500', status: 'inferred', confidence: 'high', evidence: 'Visual impression' },
        { field: 'sport', value: 'Baseball', status: 'conflict', confidence: 'medium', evidence: 'Image differs from listing metadata' },
      ],
      missingImageRequests: ['Back of card'],
    }, { title: 'Ken Griffey Jr. card', category: 'Sports Cards', itemType: 'single_card' });
    expect(result.fields.map((field) => field.field)).toEqual(['player', 'sport']);
    expect(result.fields[0].needsVerification).toBe(false);
    expect(result.fields[1].needsVerification).toBe(true);
    expect(result.conflicts).toHaveLength(1);
    expect(result.missingImageRequests).toEqual(['Back of card']);
  });

  it('instructs the model not to infer hidden facts or market value', () => {
    const prompt = buildFieldCompletionPrompt({ title: 'Abbey Road', category: 'Music', itemType: 'vinyl_record' }, getFieldTableForItem('Music', 'vinyl_record'));
    expect(prompt).toContain('Do not guess hidden');
    expect(prompt).toContain('market value');
    expect(prompt).toContain('additional-photo requests');
  });

  it('accepts fenced JSON with a provider-added trailing comma', () => {
    expect(parseFieldCompletionJson('```json\n{"fields": [], "missingImageRequests": [],}\n```')).toEqual({ fields: [], missingImageRequests: [] });
  });

  it('salvages complete field candidates from a truncated response', () => {
    const result = parseFieldCompletionJson('{"fields":[{"field":"player","value":"Wayne Gretzky","status":"ocr_read","confidence":"high","evidence":"Visible name"},{"field":"sport","value":"Hockey","status":"inferred","confidence":"medium","evidence":"Truncated');
    expect(result).toMatchObject({ fields: [{ field: 'player', value: 'Wayne Gretzky' }] });
  });
});
