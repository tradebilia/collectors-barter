import { describe, expect, it } from 'vitest';
import { lookupNgcCensus } from './apifyCoinSources';

describe('Apify NGC Census adapter', () => {
  it('rejects non-NGC coins without calling Apify', async () => {
    await expect(lookupNgcCensus('2025 American Eagle S$1 MS', 'PCGS')).resolves.toEqual({
      status: 'error',
      items: [],
      message: 'NGC Census is only available for coins graded by NGC.',
    });
  });
});
