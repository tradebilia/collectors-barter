import { describe, expect, it, vi } from 'vitest';
import { lookupSmithsonianStampReference } from './smithsonianMetadata';

describe('Smithsonian stamp reference adapter', () => {
  it('maps a National Postal Museum record and rejects unrelated museum results', async () => {
    const previous = process.env.SMITHSONIAN_API_KEY;
    process.env.SMITHSONIAN_API_KEY = 'test-key';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        response: {
          rows: [
            { id: 'unrelated', unitCode: 'NMAH', title: 'Unrelated object' },
            {
              id: '2005.2001.257',
              unitCode: 'NPM',
              content: {
                descriptiveNonRepeating: {
                  title: { content: 'Stamp, 1925' },
                  record_link: 'https://www.si.edu/object/2005.2001.257',
                  data_source: 'National Postal Museum',
                },
                freetext: {
                  date: [{ content: '1925' }],
                  place: [{ content: 'United States' }],
                  name: [{ content: 'Bureau of Engraving and Printing' }],
                  objectType: [{ content: 'Postage Stamps' }],
                  topic: [{ content: 'U.S. Stamps' }],
                  notes: [{ content: 'Scott Catalogue USA 572' }],
                },
              },
            },
          ],
        },
      }),
    });
    const result = await lookupSmithsonianStampReference('Scott 572', fetchMock as typeof fetch);
    expect(result.status).toBe('success');
    expect(result.data?.id).toBe('2005.2001.257');
    expect(result.data?.facts).toEqual(expect.arrayContaining([{ label: 'Catalog reference', value: 'Scott Catalogue USA 572' }, { label: 'Collection', value: 'National Postal Museum' }]));
    if (previous === undefined) delete process.env.SMITHSONIAN_API_KEY; else process.env.SMITHSONIAN_API_KEY = previous;
  });
});
