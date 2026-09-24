import { describe, expect, it } from 'vitest';
import { normalizeCgcComicsResponse } from './testAIRouter';
import { getEligibleTestAiSources } from '../shared/testAiSourceApplicability';

describe('CGC Comics sandbox integration', () => {
  it('normalizes certificate and population payloads from Parse.bot', () => {
    const result = normalizeCgcComicsResponse('1234567890', {
      data: {
        title: 'Daredevil', issue_number: '168', year: 1981, publisher: 'Marvel',
        grade: '9.8', page_quality: 'White', label_category: 'Universal', master_id: 'm-1',
      },
    }, {
      data: { total: 1200, label_categories: [{ label: 'Universal', grades: [{ grade: '9.8', count: 42 }] }] },
    });
    expect(result.title).toBe('Daredevil');
    expect(result.issueNumber).toBe('168');
    expect(result.grade).toBe('9.8');
    expect(result.population.total).toBe(1200);
    expect(result.population.gradeCounts).toHaveLength(1);
  });

  it('only exposes CGC source for Comics with a CGC certificate', () => {
    expect(getEligibleTestAiSources({ category: 'Comics', gradingCompany: 'CGC', hasTitle: true }).some((source) => source.sourceId === 'cgc')).toBe(true);
    expect(getEligibleTestAiSources({ category: 'Sports Cards', gradingCompany: 'CGC', hasTitle: true }).some((source) => source.sourceId === 'cgc')).toBe(false);
    expect(getEligibleTestAiSources({ category: 'Comics', gradingCompany: 'PSA', hasTitle: true }).some((source) => source.sourceId === 'cgc')).toBe(false);
  });
});

