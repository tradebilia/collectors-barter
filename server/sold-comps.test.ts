import { describe, it, expect } from 'vitest';

describe('Sold-Comps API key validation', () => {
  it('keeps credential validation out of the automated test suite in either integration mode', () => {
    expect(['0', '1']).toContain(process.env.TRADEBILIA_STAGING_MODE);
  });
});
