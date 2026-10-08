import { describe, expect, it } from 'vitest';
import {
  isAlphanumericCoinGrade,
  isValidGradeForCompany,
} from '../shared/gradingCompanyConfig';

describe('graded coin alphanumeric validation', () => {
  it('accepts common alphanumeric coin labels', () => {
    expect(isAlphanumericCoinGrade('MS69')).toBe(true);
    expect(isAlphanumericCoinGrade('AU58')).toBe(true);
    expect(isAlphanumericCoinGrade('MS65+')).toBe(true);
    expect(isAlphanumericCoinGrade('MS69 RD')).toBe(true);
  });

  it('allows alphanumeric labels for every configured coin grading company', () => {
    expect(isValidGradeForCompany('PCGS', 'MS69')).toBe(true);
    expect(isValidGradeForCompany('NGC', 'MS69')).toBe(true);
    expect(isValidGradeForCompany('ANACS', 'AU58')).toBe(true);
  });

  it('does not broaden card grading validation', () => {
    expect(isValidGradeForCompany('PSA', 'MS69')).toBe(false);
    expect(isValidGradeForCompany('PSA', '10')).toBe(true);
  });
});
