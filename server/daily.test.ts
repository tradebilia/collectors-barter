import { describe, it, expect } from 'vitest';

describe('Daily.co API key validation', () => {
  it('DAILY_API_KEY is set in environment', () => {
    const key = process.env.DAILY_API_KEY;
    expect(key).toBeTruthy();
    expect(typeof key).toBe('string');
    expect((key as string).length).toBeGreaterThan(10);
  });

  it('Daily.co API key authenticates successfully', async () => {
    const key = process.env.DAILY_API_KEY;
    if (!key) throw new Error('DAILY_API_KEY not set');

    const response = await fetch('https://api.daily.co/v1/rooms?limit=1', {
      headers: { Authorization: `Bearer ${key}` },
    });

    expect(response.status).toBe(200);
    const data = await response.json() as { total_count?: number };
    expect(typeof data.total_count).toBe('number');
  });
});
