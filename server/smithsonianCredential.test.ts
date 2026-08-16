import { describe, expect, it } from 'vitest';
import { lookupSmithsonianStampMetadata } from './smithsonianMetadata';

describe('Smithsonian Open Access credential', () => {
  it('authorizes a read-only National Postal Museum metadata search', async () => {
    const apiKey = process.env.SMITHSONIAN_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch(
      `https://api.si.edu/openaccess/api/v1.0/search?q=${encodeURIComponent('National Postal Museum stamp')}&api_key=${encodeURIComponent(apiKey!)}`,
    );

    expect(response.status).toBe(200);
    const body = await response.json() as { response?: { rows?: unknown[] } };
    expect(Array.isArray(body.response?.rows)).toBe(true);
  }, 20_000);

  it('returns an actual National Postal Museum stamp reference through the Tradebilia adapter', async () => {
    const result = await lookupSmithsonianStampMetadata('24c Curtiss Jenny invert single');

    expect(result.status).toBe('success');
    expect(result.data?.title).toMatch(/Curtiss Jenny/i);
    expect(result.data?.facts).toContainEqual(expect.objectContaining({ label: 'Collection', value: expect.stringMatching(/National Postal Museum/i) }));
  }, 20_000);
});
