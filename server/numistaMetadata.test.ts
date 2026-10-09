import { describe, expect, it, vi } from 'vitest';
import { buildNumistaSearchCriteria, lookupNumistaCoin } from './numistaMetadata';

describe('Numista coin metadata adapter', () => {
  const env = {
    NUMISTA_API_KEY: 'configured-key',
    NUMISTA_CLIENT_ID: 'client-id',
    NUMISTA_CLIENT_NAME: 'Tradebilia-Test',
  };

  it('builds the request from structured coin fields rather than the listing title', () => {
    const criteria = buildNumistaSearchCriteria('coins', JSON.stringify({
      country: 'United States',
      denomination: '$1',
      year: '1921',
      mintMark: 'S',
      variety: 'Peace Dollar',
      metal: 'Silver',
    }), '1921 S Peace Dollar PCGS MS65');
    expect(criteria.query).toContain('United States');
    expect(criteria.query).toContain('$1');
    expect(criteria.query).toContain('Peace Dollar');
    expect(criteria.query).not.toContain('PCGS');
    expect(criteria.year).toBe('1921');
  });

  it('returns enriched factual metadata and excludes pricing fields', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ access_token: 'token', expires_in: 3600 }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ count: 1, types: [{ id: 123, title: '1921 Peace Dollar', issuer: { name: 'United States' }, min_year: 1921, max_year: 1921, category: 'coin' }] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({
        id: 123,
        url: 'https://en.numista.com/catalogue/pieces123.html',
        title: '1921 Peace Dollar',
        object_type: { name: 'Coin' },
        issuer: { name: 'United States' },
        min_year: 1921,
        max_year: 1921,
        value: { text: '$1', numeric_value: 1, currency: 'USD' },
        composition: { text: 'Silver' },
        obverse: { description: 'Liberty facing left', thumbnail: 'https://example.com/obverse.jpg' },
        reverse: { description: 'Eagle at rest' },
        tags: [{ name: 'Peace Dollar' }],
        price: 999999,
      }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ([{ id: 456, year: 1921, gregorian_year: 1921 }]) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ currency: 'USD', prices: [{ grade: 'MS65', price: 250 }, { grade: 'MS63', price: 120 }] }) });
    const result = await lookupNumistaCoin({
      category: 'coins',
      title: '1921 Peace Dollar PCGS MS65',
      itemDetails: JSON.stringify({ country: 'United States', denomination: '$1', year: '1921', variety: 'Peace Dollar' }),
      grade: 'MS65',
    }, fetchMock as typeof fetch, env);
    expect(result.status).toBe('success');
    expect(result.data?.title).toBe('1921 Peace Dollar');
    expect(result.data?.sourceUrl).toContain('pieces123');
    expect(result.data?.imageUrl).toBe('https://example.com/obverse.jpg');
    expect(result.data?.facts).toEqual(expect.arrayContaining([
      { label: 'Issuer', value: 'United States' },
      { label: 'Year', value: '1921' },
      { label: 'Composition', value: 'Silver' },
    ]));
    expect(JSON.stringify(result.data)).not.toContain('999999');
    expect(result.data?.guideValue).toBe(250);
    expect(result.data?.guideGrade).toBe('MS65');
    expect(result.data?.guideCurrency).toBe('USD');
    expect(result.data?.guidePrices).toHaveLength(2);
    expect(result.data?.matchNote).toContain('secondary guide evidence');
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('q=');
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('year=1921');
    expect(String(fetchMock.mock.calls[1]?.[0])).not.toContain('PCGS');
  });

  it('does not use a different catalogue grade as a guide value', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ access_token: 'token' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ types: [{ id: 123, title: '1921 Peace Dollar', min_year: 1921, max_year: 1921 }] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 123, title: '1921 Peace Dollar', url: 'https://example.com/type', min_year: 1921, max_year: 1921 }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ([{ id: 456, year: 1921 }]) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ currency: 'USD', prices: [{ grade: 'MS63', price: 120 }] }) });
    const result = await lookupNumistaCoin({ category: 'coins', title: '1921 Peace Dollar', grade: 'MS65', itemDetails: JSON.stringify({ year: '1921' }) }, fetchMock as typeof fetch, env);
    expect(result.status).toBe('success');
    expect(result.data?.guideValue).toBeNull();
    expect(result.data?.guideGrade).toBeNull();
  });

  it('returns a clear configuration error without secure credentials', async () => {
    const result = await lookupNumistaCoin({ category: 'coins', title: 'Morgan Dollar', itemDetails: '{}' }, vi.fn() as typeof fetch, {});
    expect(result).toMatchObject({ status: 'error' });
    expect(result.message).toContain('secure API credentials');
  });

  it('does not run for unsupported categories', async () => {
    const result = await lookupNumistaCoin({ category: 'pokemon', title: 'Charizard', itemDetails: '{}' }, vi.fn() as typeof fetch, env);
    expect(result).toMatchObject({ status: 'error' });
    expect(result.message).toContain('Coins only');
  });
});
