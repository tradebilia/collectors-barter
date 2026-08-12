import { describe, it, expect } from 'vitest';

describe('Sold-Comps API key validation', () => {
  it('SOLD_COMPS_API_KEY is set in environment', () => {
    const key = process.env.SOLD_COMPS_API_KEY;
    expect(key).toBeTruthy();
    expect(typeof key).toBe('string');
    expect((key as string).length).toBeGreaterThan(10);
  });

  it('Sold-Comps API key authenticates successfully', async () => {
    const key = process.env.SOLD_COMPS_API_KEY;
    if (!key) throw new Error('SOLD_COMPS_API_KEY not set');

    const response = await fetch(
      'https://api.sold-comps.com/v1/scrape?keyword=test&count=1',
      { headers: { Authorization: `Bearer ${key}` } }
    );

    expect(response.status).toBe(200);
    const data = await response.json() as { keyword?: string; items?: unknown[] };
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBe(true);
  }, 30000);
});
