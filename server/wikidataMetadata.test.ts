import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupWikidataMetadata } from './wikidataMetadata';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe('Wikidata metadata adapter', () => {
  it('maps a read-only movie title to selected public metadata without returning a valuation', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ search: [{ id: 'Q132689' }] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({
        entities: {
          Q132689: {
            labels: { en: { value: 'Casablanca' } },
            descriptions: { en: { value: '1942 film by Michael Curtiz' } },
            claims: {
              P577: [{ mainsnak: { datavalue: { value: { time: '+1942-11-26T00:00:00Z' } } } }],
              P57: [{ mainsnak: { datavalue: { value: { id: 'Q51537' } } } }],
              P136: [{ mainsnak: { datavalue: { value: { id: 'Q130232' } } } }],
              P161: [{ mainsnak: { datavalue: { value: { id: 'Q392' } } } }],
              P2047: [{ mainsnak: { datavalue: { value: { amount: '+102' } } } }],
              P18: [{ mainsnak: { datavalue: { value: 'CasablancaPoster-Gold.jpg' } } }],
            },
          },
        },
      }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({
        entities: {
          Q51537: { labels: { en: { value: 'Michael Curtiz' } } },
          Q130232: { labels: { en: { value: 'drama film' } } },
          Q392: { labels: { en: { value: 'Humphrey Bogart' } } },
        },
      }) });
    global.fetch = fetchMock as typeof fetch;

    const result = await lookupWikidataMetadata('Casablanca', 'movies');

    expect(result.status).toBe('success');
    expect(result.data?.facts).toEqual(expect.arrayContaining([
      { label: 'Release', value: '1942-11-26' },
      { label: 'Director', value: 'Michael Curtiz' },
      { label: 'Principal cast', value: 'Humphrey Bogart' },
      { label: 'Running time', value: '102 minutes' },
    ]));
    expect(result.data?.sourceUrl).toBe('https://www.wikidata.org/wiki/Q132689');
    expect(result.data).not.toHaveProperty('price');
  });

  it('returns a clear not-found result when Wikidata search has no matching entity', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ search: [] }) });
    global.fetch = fetchMock as typeof fetch;

    const result = await lookupWikidataMetadata('No Such Item', 'autographs');

    expect(result.status).toBe('not_found');
    expect(result.message).toContain('No matching');
  });
});
