import { describe, expect, it } from 'vitest';
import { lookupNgcCertification, normalizeNgcGrade } from './ngcCertification';

describe('NGC certification adapter', () => {
  it.each([
    ['MS69', '69'],
    ['PR70', '70'],
    ['AU58', '58'],
    ['69', '69'],
    ['MS 69 RD', '69'],
  ])('normalizes %s to the NGC numeric grade %s', (input, expected) => {
    expect(normalizeNgcGrade(input)).toBe(expected);
  });

  it('returns a safe validation message without making a provider request', async () => {
    const result = await lookupNgcCertification('', 'MS69');
    expect(result.status).toBe('error');
    expect(result.message).toContain('certification number');
    expect(result.numericGrade).toBe('69');
  });
});
