import { describe, expect, it } from 'vitest';

const twitchClientId = process.env.TWITCH_CLIENT_ID;
const twitchClientSecret = process.env.TWITCH_CLIENT_SECRET;
const hasCredentials = Boolean(twitchClientId && twitchClientSecret);

describe.runIf(hasCredentials)('IGDB credentials', () => {
  it('obtains a Twitch app token and completes a read-only IGDB game lookup', async () => {
    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: twitchClientId!,
        client_secret: twitchClientSecret!,
        grant_type: 'client_credentials',
      }),
      signal: AbortSignal.timeout(15_000),
    });

    expect(tokenResponse.ok).toBe(true);
    const tokenPayload = await tokenResponse.json() as { access_token?: string };
    expect(tokenPayload.access_token).toEqual(expect.any(String));

    const gameResponse = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Client-ID': twitchClientId!,
        Authorization: `Bearer ${tokenPayload.access_token}`,
      },
      body: 'search "Super Mario Bros. 3"; fields id,name; limit 1;',
      signal: AbortSignal.timeout(15_000),
    });

    expect(gameResponse.ok).toBe(true);
    const games = await gameResponse.json() as Array<{ id?: number; name?: string }>;
    expect(Array.isArray(games)).toBe(true);
    expect(games[0]?.name).toEqual(expect.any(String));
  }, 35_000);
});

describe.skipIf(hasCredentials)('IGDB credentials', () => {
  it('requires secure Twitch credentials before live validation', () => {
    expect(hasCredentials).toBe(false);
  });
});
