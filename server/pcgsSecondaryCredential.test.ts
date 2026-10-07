import { describe, expect, it } from 'vitest';

describe('PCGS secondary credential safety', () => {
  it('accepts the secondary credential on a deliberately non-listing read-only request', async () => {
    const token = process.env.PCGS_API_TOKEN_SECONDARY;
    expect(token, 'PCGS_API_TOKEN_SECONDARY must be configured through secure project settings').toBeTruthy();

    const response = await fetch('https://api.pcgs.com/publicapi/coindetail/GetAPRByCertNo/00000000', {
      headers: { Authorization: `bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.text();

    expect([401, 403], `PCGS secondary credential was rejected with HTTP ${response.status}`).not.toContain(response.status);
    expect(response.status, `PCGS secondary credential reached a provider server error: HTTP ${response.status}`).toBeLessThan(500);
    expect(body).not.toContain(token as string);
  }, 20_000);
});
