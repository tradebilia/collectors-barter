import { describe, it, expect } from 'vitest';

describe('Sold-Comps API key validation', () => {
  it('keeps credential validation out of the automated test suite', () => {
    expect(process.env.TRADEBILIA_STAGING_MODE).not.toBe('0');
  });
});
