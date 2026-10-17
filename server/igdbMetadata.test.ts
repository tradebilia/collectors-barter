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
    expect(result.data?.metadata).toMatchObject({ id: 100, name: 'Super Mario Bros. 3' });
    expect(JSON.stringify(result.data)).not.toMatch(/price|valuation|condition|grade/i);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://api.igdb.com/v4/platforms');
    expect(fetchMock.mock.calls[2]?.[0]).toBe('https://api.igdb.com/v4/games');
    expect(fetchMock.mock.calls[2]?.[1]?.body).toContain('fields *');
    expect(fetchMock.mock.calls[2]?.[1]?.body).toContain('platforms.*');
    expect(fetchMock.mock.calls[2]?.[1]?.body).toContain('cover.*');
    expect(fetchMock.mock.calls[2]?.[1]?.body).toContain('screenshots.*');
    expect(fetchMock.mock.calls[2]?.[1]?.body).toContain('release_dates.*');
    expect(fetchMock.mock.calls[2]?.[1]?.body).toContain('release_dates.platform.*');
    expect(fetchMock.mock.calls[2]?.[1]?.body).toContain('release_dates.release_region.*');
    expect(fetchMock.mock.calls[2]?.[1]?.body).toContain('dlcs.*');
    expect(fetchMock.mock.calls[2]?.[1]?.body).toContain('remakes.*');
    expect(fetchMock.mock.calls[2]?.[1]?.body).toContain('language_supports.language.*');
    expect(fetchMock.mock.calls[2]?.[1]?.body).toContain('platforms = (18)');
  });

  it('requests linked catalog records as useful objects rather than leaving them as IDs', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'expanded-token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        id: 500,
        name: 'Resident Evil 2',
        cover: { id: 10, image_id: 'cover-image', url: '//images.igdb.com/cover.jpg', width: 264, height: 374 },
        screenshots: [{ id: 11, image_id: 'screenshot-image', url: '//images.igdb.com/screenshot.jpg', width: 1920, height: 1080 }],
        release_dates: [{ id: 12, human: 'January 21, 1998', platform: { id: 19, name: 'PlayStation' }, release_region: { id: 20, region: 2 }, status: { id: 21, name: 'Released' } }],
        videos: [{ id: 13, name: 'Launch Trailer', video_id: 'trailer-id' }],
        websites: [{ id: 14, category: 1, url: 'https://example.com' }],
        language_supports: [{ id: 15, language: { id: 16, name: 'English' }, language_support_type: { id: 17, name: 'Audio' } }],
        franchises: [{ id: 18, name: 'Resident Evil' }],
        platforms: [{ id: 19, name: 'PlayStation' }],
        dlcs: [{ id: 22, name: 'Resident Evil 2: The Ghost Survivors' }],
        remakes: [{ id: 23, name: 'Resident Evil 2 (1998)' }],
      }]), { status: 200 }));

    const result = await lookupIgdbGameMetadata('Resident Evil 2', {}, fetchMock as typeof fetch, { TWITCH_CLIENT_ID: 'expanded-client', TWITCH_CLIENT_SECRET: 'test-secret' });

    expect(result.status).toBe('success');
    expect(result.data?.metadata).toMatchObject({
      cover: { image_id: 'cover-image' },
      screenshots: [{ image_id: 'screenshot-image' }],
      release_dates: [{ human: 'January 21, 1998', platform: { name: 'PlayStation' }, release_region: { region: 2 } }],
      language_supports: [{ language: { name: 'English' } }],
    });
    const query = String(fetchMock.mock.calls[1]?.[1]?.body);
    expect(query).toContain('artworks.*');
    expect(query).toContain('cover.*');
    expect(query).toContain('external_games.*');
    expect(query).toContain('dlcs.*');
    expect(query).toContain('expanded_games.*');
    expect(query).toContain('expansions.*');
    expect(query).toContain('forks.*');
    expect(query).toContain('ports.*');
    expect(query).toContain('release_dates.*');
    expect(query).toContain('release_dates.platform.*');
    expect(query).toContain('release_dates.release_region.*');
    expect(query).toContain('release_dates.status.*');
    expect(query).toContain('remakes.*');
    expect(query).toContain('remasters.*');
    expect(query).toContain('screenshots.*');
    expect(query).toContain('standalone_expansions.*');
    expect(query).toContain('videos.*');
    expect(query).toContain('websites.*');
    expect(query).toContain('language_supports.language.*');
    expect(query).toContain('similar_games.*');
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
