import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRawgProviderStatus, lookupRawgGameMetadata } from './rawgMetadata';

const originalRawgKey = process.env.RAWG_API_KEY;

afterEach(() => {
  if (originalRawgKey === undefined) delete process.env.RAWG_API_KEY;
  else process.env.RAWG_API_KEY = originalRawgKey;
});

const rawgFixture = {
  results: [{
    id: 42,
    slug: 'super-mario-bros-3',
    name: 'Super Mario Bros. 3',
    released: '1990-02-12',
    platforms: [{ platform: { name: 'Nintendo Entertainment System' } }],
    genres: [{ name: 'Platformer' }],
    developers: [{ name: 'Nintendo EAD' }],
    publishers: [{ name: 'Nintendo' }],
    esrb_rating: { name: 'Everyone' },
  }],
};

describe('RAWG game metadata', () => {
  it('reports active only when the server-side key is present', () => {
    expect(getRawgProviderStatus({ RAWG_API_KEY: 'test-key' })).toEqual({
      status: 'active',
      keyConfigured: true,
      message: expect.stringContaining('active'),
    });
  });

  it('returns factual metadata for a title/year/platform match without exposing the key', async () => {
    const urls: string[] = [];
    const result = await lookupRawgGameMetadata('Super Mario Bros. 3', { releaseYear: 1990, platform: 'NES' }, async (url) => {
      urls.push(String(url));
      return new Response(JSON.stringify(rawgFixture), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }, { RAWG_API_KEY: 'secret-test-key' });

    expect(result).toMatchObject({ status: 'success', data: { id: 42, title: 'Super Mario Bros. 3', sourceUrl: 'https://rawg.io/games/super-mario-bros-3' } });
    expect(result.data?.facts).toContainEqual({ label: 'Platforms', value: 'Nintendo Entertainment System' });
    expect(result.data?.metadata).toMatchObject({ id: 42, name: 'Super Mario Bros. 3' });
    expect(urls[0]).toContain('search=Super+Mario+Bros.+3');
    expect(JSON.stringify(result)).not.toContain('secret-test-key');
  });

  it('fetches and retains the selected game detail payload', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(rawgFixture), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...rawgFixture.results[0], description_raw: 'Full detail description', tags: [{ name: 'classic' }] }), { status: 200 }));

    const result = await lookupRawgGameMetadata('Super Mario Bros. 3', {}, fetchMock, { RAWG_API_KEY: 'detail-test-key' });

    expect(result.status).toBe('success');
    expect(result.data?.metadata).toMatchObject({ id: 42, description_raw: 'Full detail description', tags: [{ name: 'classic' }] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/api/games/42?');
  });

  it('reports a global first-release year discrepancy but rejects a same-title platform conflict', async () => {
    const fetchFixture = async () => new Response(JSON.stringify(rawgFixture), { status: 200, headers: { 'Content-Type': 'application/json' } });
    await expect(lookupRawgGameMetadata('Super Mario Bros. 3', { releaseYear: 1993 }, fetchFixture, { RAWG_API_KEY: 'test-key' })).resolves.toMatchObject({
      status: 'success',
      data: { matchNote: expect.stringContaining('differs from the supplied 1993') },
    });
    await expect(lookupRawgGameMetadata('Super Mario Bros. 3', { platform: 'SNES' }, fetchFixture, { RAWG_API_KEY: 'test-key' })).resolves.toMatchObject({ status: 'not_found' });
  });
});
