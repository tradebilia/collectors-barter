import { describe, expect, it } from 'vitest';
import { applyVisualSoldReviews, isSafeVisualSoldRemoval, normalizeVisualSoldReviews } from './testAiVisualSoldFilter';

describe('visual sold-comparable filter', () => {
  it('retains a high-confidence visual mismatch as an auditable review flag', () => {
    const listings = [{ title: 'NES System VGA 80' }, { title: 'Excitebike cartridge' }, { title: 'NES system bundle' }];
    const reviews = normalizeVisualSoldReviews({ reviews: [
      { candidateIndex: 0, verdict: 'match', confidence: 'high', rationale: 'Console form factor matches.' },
      { candidateIndex: 1, verdict: 'mismatch', confidence: 'high', rationale: 'Game cartridge, not a console.' },
      { candidateIndex: 2, verdict: 'rough_match', confidence: 'medium', rationale: 'Console bundle appears plausible.' },
    ] }, listings.length);
    const result = applyVisualSoldReviews(listings, reviews, 3);
    expect(result.listings.map((item) => item.title)).toEqual(['NES System VGA 80', 'Excitebike cartridge', 'NES system bundle']);
    expect(result.removedCount).toBe(0);
    expect(result.note).toContain('warning/review evidence');
    expect(isSafeVisualSoldRemoval(reviews[1])).toBe(true);
  });

  it('retains rough, unreadable, and unreviewed candidates', () => {
    const listings = [{ title: 'A' }, { title: 'B' }, { title: 'C' }, { title: 'D' }];
    const reviews = normalizeVisualSoldReviews({ reviews: [
      { candidateIndex: 0, verdict: 'mismatch', confidence: 'medium', rationale: 'Possible mismatch.' },
      { candidateIndex: 1, verdict: 'unreadable', confidence: 'high', rationale: 'Image too small.' },
      { candidateIndex: 2, verdict: 'rough_match', confidence: 'low', rationale: 'Same object type is plausible.' },
    ] }, listings.length);
    const result = applyVisualSoldReviews(listings, reviews, 3);
    expect(result.listings).toHaveLength(4);
    expect(result.retainedUnreviewedCount).toBe(0);
  });

  it('ignores malformed or out-of-range provider reviews', () => {
    const reviews = normalizeVisualSoldReviews({ reviews: [
      { candidateIndex: 99, verdict: 'mismatch', confidence: 'high', rationale: 'bad index' },
      { candidateIndex: 0, verdict: 'maybe', confidence: 'high', rationale: 'bad verdict' },
      { candidateIndex: 1, verdict: 'mismatch', confidence: 'high', rationale: 'valid' },
    ] }, 2);
    expect(reviews).toHaveLength(1);
    expect(reviews[0].candidateIndex).toBe(1);
  });

  it('can preserve high-confidence visual flags when text identity is authoritative', () => {
    const listings = [{ title: 'Edge Of Spider-Verse #2 CGC 9.8' }];
    const reviews = normalizeVisualSoldReviews({ reviews: [
      { candidateIndex: 0, verdict: 'mismatch', confidence: 'high', rationale: 'Different slab crop.' },
    ] }, listings.length);
    const result = applyVisualSoldReviews(listings, reviews, 1, { preserveHighConfidenceMismatches: true });
    expect(result.listings).toEqual(listings);
    expect(result.removedCount).toBe(0);
    expect(result.note).toContain('Preserved 1 high-confidence visual flag');
  });
});
