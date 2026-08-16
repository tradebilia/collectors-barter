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
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          entities: {
            Q132689: {
              labels: { en: { value: 'Casablanca' } },
              descriptions: { en: { value: '1942 film by Michael Curtiz' } },
              claims: {
                P577: [{ mainsnak: { datavalue: { value: { time: '+1942-11-26T00:00:00Z' } } } }],
                P57: [{ mainsnak: { datavalue: { value: { id: 'Q51537' } } } }],
                P136: [{ mainsnak: { datavalue: { value: { id: 'Q130232' } } } }],
                P170: [{ mainsnak: { datavalue: { value: { id: 'Q51537' } } } }],
                P179: [{ mainsnak: { datavalue: { value: { id: 'Q220168' } } } }],
                P364: [{ mainsnak: { datavalue: { value: { id: 'Q1860' } } } }],
                P18: [{ mainsnak: { datavalue: { value: 'CasablancaPoster-Gold.jpg' } } }],
              },
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ entities: {
          Q51537: { labels: { en: { value: 'Michael Curtiz' } } },
          Q130232: { labels: { en: { value: 'drama film' } } },
          Q220168: { labels: { en: { value: 'Casablanca franchise' } } },
          Q1860: { labels: { en: { value: 'English' } } },
        } }),
      });
    global.fetch = fetchMock as typeof fetch;

    const result = await lookupWikidataMetadata('Casablanca', 'movies');

    expect(result.status).toBe('success');
    expect(result.data?.title).toBe('Casablanca');
    expect(result.data?.facts).toEqual(expect.arrayContaining([
      { label: 'Release', value: '1942-11-26' },
      { label: 'Director', value: 'Michael Curtiz' },
      { label: 'Creator', value: 'Michael Curtiz' },
      { label: 'Franchise', value: 'Casablanca franchise' },
      { label: 'Original language', value: 'English' },
    ]));
    expect(result.data?.sourceUrl).toBe('https://www.wikidata.org/wiki/Q132689');
    expect(result.data).not.toHaveProperty('price');
    expect(fetchMock.mock.calls[0]?.[0]).toContain('wbsearchentities');
  });

  it('maps useful signer context without making authenticity or valuation claims', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ search: [{ id: 'Q999' }] }) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ entities: {
          Q999: {
            labels: { en: { value: 'Example Athlete' } },
            descriptions: { en: { value: 'example professional athlete' } },
            claims: {
              P569: [{ mainsnak: { datavalue: { value: { time: '+1980-01-02T00:00:00Z' } } } }],
              P19: [{ mainsnak: { datavalue: { value: { id: 'Q1' } } } }],
              P106: [{ mainsnak: { datavalue: { value: { id: 'Q2' } } } }],
              P27: [{ mainsnak: { datavalue: { value: { id: 'Q3' } } } }],
              P641: [{ mainsnak: { datavalue: { value: { id: 'Q4' } } } }],
              P413: [{ mainsnak: { datavalue: { value: { id: 'Q5' } } } }],
              P54: [{ mainsnak: { datavalue: { value: { id: 'Q6' } } } }],
              P800: [{ mainsnak: { datavalue: { value: { id: 'Q7' } } } }],
            },
          },
        } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ entities: {
          Q1: { labels: { en: { value: 'Example City' } } }, Q2: { labels: { en: { value: 'athlete' } } },
          Q3: { labels: { en: { value: 'Example Nation' } } }, Q4: { labels: { en: { value: 'baseball' } } },
          Q5: { labels: { en: { value: 'pitcher' } } }, Q6: { labels: { en: { value: 'Example Club' } } },
          Q7: { labels: { en: { value: 'Example Championship' } } },
        } }),
      });
    global.fetch = fetchMock as typeof fetch;

    const result = await lookupWikidataMetadata('Example Athlete', 'autographs');

    expect(result.status).toBe('success');
    expect(result.data?.facts).toEqual(expect.arrayContaining([
      { label: 'Birthplace', value: 'Example City' },
      { label: 'Sport', value: 'baseball' },
      { label: 'Position', value: 'pitcher' },
      { label: 'Team history', value: 'Example Club' },
      { label: 'Notable for', value: 'Example Championship' },
    ]));
    expect(result.data).not.toHaveProperty('authenticity');
    expect(result.data).not.toHaveProperty('price');
  });

  it('returns a clear not-found result when Wikidata search has no matching entity', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ search: [] }) });
    global.fetch = fetchMock as typeof fetch;

    const result = await lookupWikidataMetadata('No Such Item', 'autographs');

    expect(result.status).toBe('not_found');
    expect(result.message).toContain('No matching');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
