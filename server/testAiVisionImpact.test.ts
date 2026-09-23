import { describe, expect, it } from 'vitest';
import { evaluateVisionImpact, VISUAL_IDENTITY_RESPONSE_FORMAT } from './testAiVisionImpact';

const target = {
  title: '1989 Upper Deck Ken Griffey Jr. #1 PSA 10',
  category: 'Sports Cards',
  grade: '10',
  certificationCompany: 'PSA',
  itemDetails: JSON.stringify({ year: '1989', manufacturer: 'Upper Deck', cardNumber: '1', player: 'Ken Griffey Jr.' }),
  imageUrl: 'https://media.example.test/griffey.jpg',
};

describe('Test AI image-review impact scoring', () => {
  it('labels a metadata-only run as not run without inventing a visual conclusion', () => {
    const result = evaluateVisionImpact({ ...target, imageUrl: undefined });
    expect(result.status).toBe('not_run');
    expect(result.visibleIdentifierCount).toBe(0);
    expect(result.valuationTreatment).toContain('No valuation treatment changes');
  });

  it('recognizes independent identity confirmation without changing valuation treatment', () => {
    const result = evaluateVisionImpact(target, {
      label: 'ITEM A',
      visibleIdentifiers: ['1989', 'Upper Deck', '#1', 'PSA 10'],
      metadataMatches: ['Player: Ken Griffey Jr.', 'Year: 1989', 'Card #: 1', 'Grade: PSA 10'],
      potentialConflicts: [],
      conditionObservations: ['Graded slab visible'],
      confidence: 'high',
    });
    expect(result.status).toBe('identity_confirmed');
    expect(result.confirmedMatchCount).toBe(4);
    expect(result.conflictCount).toBe(0);
    expect(result.valuationTreatment).toContain('No automatic price adjustment');
  });

  it('requires manual review when the image conflicts with identity metadata', () => {
    const result = evaluateVisionImpact(target, {
      label: 'ITEM A',
      visibleIdentifiers: ['PSA 9'],
      metadataMatches: ['Player: Ken Griffey Jr.'],
      potentialConflicts: ['Visible grade appears PSA 9, but listing metadata says PSA 10'],
      conditionObservations: [],
      confidence: 'medium',
    });
    expect(result.status).toBe('manual_review_required');
    expect(result.recommendedAction).toContain('Pause identity-sensitive comparable matching');
    expect(result.valuationTreatment).toContain('Downgrade identity confidence');
  });

  it('does not turn explicit no-conflict wording into a review flag', () => {
    const result = evaluateVisionImpact(target, {
      label: 'ITEM B',
      visibleIdentifiers: ['1989', 'Upper Deck', '#1', 'PSA 10'],
      metadataMatches: ['Player: Ken Griffey Jr.', 'Year: 1989'],
      potentialConflicts: ['None observed'],
      conditionObservations: [],
      confidence: 'high',
    });
    expect(result.status).toBe('identity_confirmed');
    expect(result.conflictCount).toBe(0);
  });

  it('uses a strict provider schema with no extra fields', () => {
    expect(VISUAL_IDENTITY_RESPONSE_FORMAT.type).toBe('json_schema');
    expect(VISUAL_IDENTITY_RESPONSE_FORMAT.json_schema.strict).toBe(true);
    expect(VISUAL_IDENTITY_RESPONSE_FORMAT.json_schema.schema.additionalProperties).toBe(false);
  });
});
