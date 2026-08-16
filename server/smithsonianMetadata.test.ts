import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupSmithsonianStampMetadata } from './smithsonianMetadata';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe('Smithsonian stamp metadata adapter', () => {
  it('maps a read-only Postal Museum record without returning valuation data', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        response: {
          rows: [{
            id: 'edanmdm:npm_1980.0015.0001',
            title: '24c Curtiss Jenny invert single',
            content: {
              descriptiveNonRepeating: {
                record_link: 'https://www.si.edu/object/24c-curtiss-jenny-invert-single:npm_1980.0015.0001',
                online_media: { media: [{ content: 'https://ids.si.edu/example.jpg' }] },
              },
              freetext: { dataSource: [{ content: 'National Postal Museum' }] },
              indexedStructured: { date: ['1918'], place: ['United States of America'] },
            },
          }],
        },
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    const result = await lookupSmithsonianStampMetadata('Curtiss Jenny', 'test-key');

    expect(result.status).toBe('success');
    expect(result.data?.title).toBe('24c Curtiss Jenny invert single');
    expect(result.data?.facts).toEqual(expect.arrayContaining([
      { label: 'Collection', value: 'National Postal Museum' },
      { label: 'Date', value: '1918' },
    ]));
    expect(result.data?.sourceUrl).toContain('si.edu/object');
    expect(result.data).not.toHaveProperty('price');
    expect(fetchMock.mock.calls[0]?.[0]).toContain('api_key=test-key');
  });

  it('returns a clear result when no stamp reference is found', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ response: { rows: [] } }) });
    global.fetch = fetchMock as typeof fetch;

    const result = await lookupSmithsonianStampMetadata('No Such Stamp', 'test-key');

    expect(result.status).toBe('not_found');
    expect(result.message).toContain('No Smithsonian');
  });

  it('does not return an unrelated non-postal Smithsonian record', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ response: { rows: [{ id: 'edanmdm:silib_304106', title: 'McNally cool preparation manual 572' }] } }),
    });
    global.fetch = fetchMock as typeof fetch;

    const result = await lookupSmithsonianStampMetadata('572', 'test-key');

    expect(result.status).toBe('not_found');
    expect(result.message).toContain('National Postal Museum');
  });
});
