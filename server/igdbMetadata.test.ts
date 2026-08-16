import { describe, expect, it, vi } from 'vitest';
import { lookupIgdbGameMetadata } from './igdbMetadata';

const testEnv = { TWITCH_CLIENT_ID: 'test-client', TWITCH_CLIENT_SECRET: 'test-secret' };
const releaseIn1990 = Math.floor(Date.UTC(1990, 0, 1) / 1_000);

describe('IGDB factual metadata adapter', () => {
  it('uses a server-side Twitch app token and prioritizes title, release year, and platform without returning valuation fields', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { id: 100, name: 'Super Mario Bros. 3', first_release_date: releaseIn1990, platforms: [{ name: 'Nintendo Entertainment System' }], genres: [{ name: 'Platform' }], game_modes: [{ name: 'Single player' }], themes: [{ name: 'Fantasy' }], involved_companies: [{ developer: true, company: { name: 'Nintendo EAD' } }, { publisher: true, company: { name: 'Nintendo' } }], age_ratings: [{ organization: { name: 'ESRB' }, rating_category: { rating: 'E' } }] },
        { id: 200, name: 'Super Mario Bros. 3', first_release_date: 1546300800, platforms: [{ name: 'Nintendo Switch' }] },
      ]), { status: 200 }));

    const result = await lookupIgdbGameMetadata('Super Mario Bros 3 Graded', { releaseYear: 1990, platform: 'NES' }, fetchMock as typeof fetch, testEnv);

    expect(result.status).toBe('success');
    expect(result.data?.id).toBe(100);
    expect(result.data?.title).toBe('Super Mario Bros. 3');
    expect(result.data?.matchNote).toContain('release year');
    expect(result.data?.matchNote).toContain('platform');
    expect(result.data?.facts).toEqual(expect.arrayContaining([{ label: 'Platforms', value: 'Nintendo Entertainment System' }, { label: 'Developers', value: 'Nintendo EAD' }]));
    expect(JSON.stringify(result.data)).not.toMatch(/price|valuation|condition|grade/i);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://api.igdb.com/v4/games');
  });

  it('reports not found when IGDB returns no matching game', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), { status: 200 }))
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
    expect(fetchMock.mock.calls[2]?.[1]?.body).not.toContain('where category');
  });

  it('does not return a same-title game when the provided release year or platform conflicts', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 400, name: 'Super Mario Bros. 3', first_release_date: Math.floor(Date.UTC(1993, 0, 1) / 1_000), platforms: [{ name: 'Super Nintendo Entertainment System' }] }]), { status: 200 }));
    const result = await lookupIgdbGameMetadata('Super Mario Bros. 3', { releaseYear: 1990, platform: 'NES' }, fetchMock as typeof fetch, { TWITCH_CLIENT_ID: 'constraint-client', TWITCH_CLIENT_SECRET: 'test-secret' });
    expect(result).toEqual({ status: 'not_found', message: 'No IGDB record matched the title with the specified release year 1990 and platform NES.' });
  });
});
