import { describe, expect, it } from 'vitest';

describe('Numista API credentials', () => {
  it('accepts the configured credentials for a lightweight public coin-type request', async () => {
    const apiKey = process.env.NUMISTA_API_KEY;
    const clientId = process.env.NUMISTA_CLIENT_ID;
    const clientName = process.env.NUMISTA_CLIENT_NAME;
    expect(apiKey).toBeTruthy();
    expect(clientId).toBeTruthy();
    expect(clientName).toBeTruthy();

    const tokenResponse = await fetch('https://api.numista.com/api/v3/oauth_token?grant_type=client_credentials&scope=view_types', {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Numista-API-Key': apiKey!,
        'User-Agent': `${clientName}/1.0 (Tradebilia read-only integration; client ${clientId})`,
      },
      signal: AbortSignal.timeout(15_000),
    });

    expect(tokenResponse.status, `Numista token validation returned HTTP ${tokenResponse.status}`).toBe(200);
    const tokenBody = await tokenResponse.json() as Record<string, unknown>;
    expect(typeof tokenBody.access_token).toBe('string');

    const response = await fetch('https://api.numista.com/api/v3/types/1', {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Numista-API-Key': apiKey!,
        Authorization: `Bearer ${String(tokenBody.access_token)}`,
        'User-Agent': `${clientName}/1.0 (Tradebilia read-only integration; client ${clientId})`,
      },
      signal: AbortSignal.timeout(15_000),
    });

    expect(response.status, `Numista type lookup returned HTTP ${response.status}`).toBe(200);
    const body = await response.json() as Record<string, unknown>;
    expect(body).toBeTruthy();
    expect(typeof body).toBe('object');
  }, 20_000);
});
