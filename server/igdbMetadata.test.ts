import { describe, expect, it, vi } from 'vitest';
import { lookupIgdbGameMetadata } from './igdbMetadata';

const testEnv = { TWITCH_CLIENT_ID: 'test-client', TWITCH_CLIENT_SECRET: 'test-secret' };
const releaseIn1990 = Math.floor(Date.UTC(1990, 0, 1) / 1_000);

describe('IGDB factual metadata adapter', () => {
  it('uses title and platform as criteria while keeping release year as non-blocking context', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 18, name: 'Nintendo Entertainment System' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { id: 100, name: 'Super Mario Bros. 3', first_release_date: releaseIn1990, platforms: [{ name: 'Nintendo Entertainment System' }], genres: [{ name: 'Platform' }], game_modes: [{ name: 'Single player' }], themes: [{ name: 'Fantasy' }], involved_companies: [{ developer: true, company: { name: 'Nintendo EAD' } }, { publisher: true, company: { name: 'Nintendo' } }], age_ratings: [{ organization: { name: 'ESRB' }, rating_category: { rating: 'E' } }] },
        { id: 200, name: 'Super Mario Bros. 3', first_release_date: 1546300800, platforms: [{ name: 'Nintendo Switch' }] },
      ]), { status: 200 }));

    const result = await lookupIgdbGameMetadata('Super Mario Bros 3 Graded', { releaseYear: 1990, platform: 'NES' }, fetchMock as typeof fetch, testEnv);

    expect(result.status).toBe('success');
    expect(result.data?.id).toBe(100);
    expect(result.data?.title).toBe('Super Mario Bros. 3');
    expect(result.data?.matchNote).toContain('platform');
    expect(result.data?.facts).toEqual(expect.arrayContaining([{ label: 'Platforms', value: 'Nintendo Entertainment System' }, { label: 'Developers', value: 'Nintendo EAD' }]));
    expect(JSON.stringify(result.data)).not.toMatch(/price|valuation|condition|grade/i);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://api.igdb.com/v4/platforms');
    expect(fetchMock.mock.calls[2]?.[0]).toBe('https://api.igdb.com/v4/games');
    expect(fetchMock.mock.calls[2]?.[1]?.body).toContain('platforms = (18)');
  });

  it('reports not found when IGDB returns no matching game', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    const result = await lookupIgdbGameMetadata('Unmatched Game', {}, fetchMock as typeof fetch, { TWITCH_CLIENT_ID: 'unique-client', TWITCH_CLIENT_SECRET: 'test-secret' });
    expect(result).toEqual({ status: 'not_found', message: 'No matching IGDB game record was found.' });
  });

  it('retries a recognized abbreviated word with official punctuation when the normalized title has no results', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 300, name: 'Super Mario Bros. 3' }]), { status: 200 }));
    const result = await lookupIgdbGameMetadata('Super Mario Bros 3 Graded', {}, fetchMock as typeof fetch, { TWITCH_CLIENT_ID: 'fallback-client', TWITCH_CLIENT_SECRET: 'test-secret' });
    expect(result.data?.id).toBe(300);
    expect(fetchMock.mock.calls[2]?.[1]?.body).toContain('Super Mario Bros. 3');
    expect(fetchMock.mock.calls[2]?.[1]?.body).not.toContain('platforms =');
  });

  it('accepts a title/platform match when only the regional release year differs', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 18, name: 'Nintendo Entertainment System' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 400, name: 'The Legend of Zelda', first_release_date: Math.floor(Date.UTC(1986, 0, 1) / 1_000), platforms: [{ name: 'Nintendo Entertainment System' }] }]), { status: 200 }));
    const result = await lookupIgdbGameMetadata('The Legend of Zelda', { releaseYear: 1987, platform: 'NES' }, fetchMock as typeof fetch, { TWITCH_CLIENT_ID: 'constraint-client', TWITCH_CLIENT_SECRET: 'test-secret' });
    expect(result.status).toBe('success');
    expect(result.data?.matchNote).toContain('regional release timing');
  });

  it('rejects a wrong platform even when the title matches', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 130, name: 'Nintendo Switch' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 400, name: 'The Legend of Zelda', platforms: [{ name: 'Nintendo Entertainment System' }] }]), { status: 200 }));
    const result = await lookupIgdbGameMetadata('The Legend of Zelda', { platform: 'Switch' }, fetchMock as typeof fetch, { TWITCH_CLIENT_ID: 'constraint-client-2', TWITCH_CLIENT_SECRET: 'test-secret' });
    expect(result).toEqual({ status: 'not_found', message: 'No IGDB record matched the title with the specified platform Switch.' });
  });
});
