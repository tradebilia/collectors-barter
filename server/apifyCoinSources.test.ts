import { describe, expect, it } from 'vitest';
import { lookupNgcCensus } from './apifyCoinSources';

describe('Apify NGC Census adapter', () => {
  it('rejects non-NGC coins without calling Apify', async () => {
    await expect(lookupNgcCensus({
      searchTerms: '2025 American Eagle S$1 MS', keywords: 'American Eagle', yearFrom: 2025, yearTo: 2025, designation: 'MS', denomination: '$1',
    }, 'PCGS')).resolves.toEqual({
      status: 'error',
      items: [],
      message: 'NGC Census is only available for coins graded by NGC.',
    });
  });
});
