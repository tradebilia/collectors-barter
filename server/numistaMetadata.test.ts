import { describe, expect, it, vi } from 'vitest';
import { buildNumistaSearchCriteria, lookupNumistaCoin, mapNumistaGradeToCatalogueBand } from './numistaMetadata';

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
    expect(criteria.query).toContain('1 Dollar');
    expect(criteria.query).toContain('Peace Dollar');
    expect(criteria.query).not.toContain('PCGS');
    expect(criteria.year).toBe('1921');
  });

  it('canonicalizes United States numeric face values so $1 cannot be searched as a dime', () => {
    const dollar = buildNumistaSearchCriteria('coins', JSON.stringify({ country: 'United States', denomination: '1', year: '1890', coinName: 'Morgan Dollar' }));
    const dime = buildNumistaSearchCriteria('coins', JSON.stringify({ country: 'United States', denomination: '.10', year: '1890', coinName: 'Seated Liberty' }));

    expect(dollar.denomination).toBe('1 Dollar');
    expect(dollar.query).toContain('1 Dollar');
    expect(dime.denomination).toBe('1 Dime');
    expect(dime.query).toContain('1 Dime');
  });

  it('rejects a returned Numista dime when the United States listing face value is $1', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ access_token: 'token' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({
        types: [
          { id: 10, title: '1 Dime Seated Liberty Dime', issuer: { name: 'United States' }, min_year: 1875, max_year: 1891 },
          { id: 20, title: '1 Dollar Morgan Dollar', issuer: { name: 'United States' }, min_year: 1878, max_year: 1921 },
        ],
      }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 10, title: '1 Dime Seated Liberty Dime', value: { text: '1 Dime' }, issuer: { name: 'United States' }, min_year: 1875, max_year: 1891 }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 20, title: '1 Dollar Morgan Dollar', value: { text: '1 Dollar' }, issuer: { name: 'United States' }, min_year: 1878, max_year: 1921 }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ([{ id: 456, year: 1890 }]) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ currency: 'USD', prices: [{ grade: 'UNC', price: 110 }] }) });

    const result = await lookupNumistaCoin({
      category: 'coins',
      title: '1890 Carson City Morgan PCGS MS66',
      grade: 'MS66',
      itemDetails: JSON.stringify({ country: 'United States', denomination: '1', year: '1890', coinName: 'Morgan Dollar', mintMark: 'Carson City' }),
    }, fetchMock as typeof fetch, env);

    expect(result.status).toBe('success');
    expect(result.data?.title).toBe('1 Dollar Morgan Dollar');
    expect(result.data?.facts).toEqual(expect.arrayContaining([{ label: 'Value', value: '1 Dollar' }]));
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('1+Dollar');
    expect(String(fetchMock.mock.calls[1]?.[0])).not.toContain('1+Dime');
  });

  it.each([
    ['very_good', 'VG'], ['AG3', 'G'], ['G4', 'G'], ['G6', 'G'], ['VG8', 'VG'], ['VG10', 'VG'], ['F12', 'F'], ['F15', 'F'],
    ['VF20', 'VF'], ['VF25', 'VF'], ['VF30', 'VF'], ['VF35', 'VF'], ['XF40', 'XF'], ['XF45', 'XF'],
    ['AU50', 'AU'], ['AU53', 'AU'], ['AU55', 'AU'], ['AU58', 'AU'], ['MS60', 'UNC'], ['MS61', 'UNC'],
    ['MS62', 'UNC'], ['MS63', 'UNC'], ['MS64', 'UNC'], ['MS65', 'UNC'], ['MS66', 'UNC'], ['MS67', 'UNC'],
  ])('maps the owner-approved certified grade %s to the Numista %s band', (grade, expectedBand) => {
    expect(mapNumistaGradeToCatalogueBand(grade)).toBe(expectedBand);
  });

  it('uses the Carson City issue rather than the generic issue for a CC Morgan Dollar', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ access_token: 'token' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ types: [{ id: 1492, title: '1 Dollar Morgan Dollar', issuer: { name: 'United States' }, min_year: 1878, max_year: 1921 }] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 1492, title: '1 Dollar Morgan Dollar', value: { text: '1 Dollar' }, issuer: { name: 'United States' }, min_year: 1878, max_year: 1921 }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ([{ id: 48538, year: 1890 }, { id: 27247, year: 1890, mint_letter: 'CC' }]) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ currency: 'USD', prices: [{ grade: 'VG', price: 140 }] }) });

    const result = await lookupNumistaCoin({
      category: 'coins',
      title: '1890 CC Morgan Dollar',
      grade: 'very_good',
      itemDetails: JSON.stringify({ country: 'United States', denomination: '1', year: '1890', coinName: 'Morgan Dollar', mintMark: 'Carson City' }),
    }, fetchMock as typeof fetch, env);

    expect(result.status).toBe('success');
    expect(result.data).toMatchObject({ guideIssueId: 27247, guideGrade: 'VG', guideValue: 140, guideMatchType: 'mapped' });
    expect(String(fetchMock.mock.calls[4]?.[0])).toContain('/issues/27247/prices');
  });

  it('does not invent a Numista grade association outside the approved list', () => {
    expect(mapNumistaGradeToCatalogueBand('MS68')).toBeNull();
    expect(mapNumistaGradeToCatalogueBand('PR70')).toBeNull();
  });

  it('returns enriched factual metadata and an exact Numista catalogue grade', async () => {
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
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ currency: 'USD', prices: [{ grade: 'MS65', price: 250.129 }, { grade: 'MS63', price: 120 }] }) });
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
    expect(result.data?.guideValue).toBe(250.13);
    expect(result.data?.guideGrade).toBe('MS65');
    expect(result.data?.guideCurrency).toBe('USD');
    expect(result.data?.guideMatchType).toBe('exact');
    expect(result.data?.guideSelectedGrade).toBe('MS65');
    expect(result.data?.guideSource).toBe('Numista catalogue estimate');
    expect(result.data?.guidePrices).toHaveLength(2);
    expect(result.data?.matchNote).toContain('secondary guide evidence');
    expect(result.data?.matchNote).not.toContain('Greysheet');
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('q=');
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('year=1921');
    expect(String(fetchMock.mock.calls[1]?.[0])).not.toContain('PCGS');
    expect(String(fetchMock.mock.calls[4]?.[0])).toContain('currency=USD');
  });

  it('does not display a non-USD Numista estimate when the USD request is not honored', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ access_token: 'token' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ types: [{ id: 123, title: '1921 Peace Dollar', min_year: 1921, max_year: 1921 }] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 123, title: '1921 Peace Dollar', url: 'https://example.com/type', min_year: 1921, max_year: 1921 }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ([{ id: 456, year: 1921 }]) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ currency: 'EUR', prices: [{ grade: 'UNC', price: 105.99 }] }) });

    const result = await lookupNumistaCoin({ category: 'coins', title: '1921 Peace Dollar PCGS MS65', grade: 'MS65', itemDetails: JSON.stringify({ year: '1921' }) }, fetchMock as typeof fetch, env);

    expect(result.status).toBe('success');
    expect(result.data?.guideValue).toBeNull();
    expect(result.data?.guidePrices).toEqual([]);
    expect(result.data?.matchNote).toContain('did not return a USD catalogue estimate');
    expect(String(fetchMock.mock.calls[4]?.[0])).toContain('currency=USD');
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

  it('uses the approved MS65-to-UNC association only when Numista returns the UNC band', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ access_token: 'token' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ types: [{ id: 123, title: '1921 Peace Dollar', min_year: 1921, max_year: 1921 }] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 123, title: '1921 Peace Dollar', url: 'https://example.com/type', min_year: 1921, max_year: 1921 }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ([{ id: 456, year: 1921 }]) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ currency: 'USD', prices: [{ grade: 'UNC', price: 180 }] }) });
    const result = await lookupNumistaCoin({ category: 'coins', title: '1921 Peace Dollar PCGS MS65', grade: 'MS65', itemDetails: JSON.stringify({ year: '1921' }) }, fetchMock as typeof fetch, env);

    expect(result.status).toBe('success');
    expect(result.data).toMatchObject({
      guideValue: 180,
      guideCurrency: 'USD',
      guideGrade: 'UNC',
      guideSelectedGrade: 'MS65',
      guideMatchType: 'mapped',
      guideSource: 'Numista catalogue estimate',
    });
    expect(result.data?.matchNote).toContain('maps to Numista');
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
