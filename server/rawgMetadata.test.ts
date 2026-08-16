import { afterEach, describe, expect, it } from 'vitest';
import { getRawgProviderStatus } from './rawgMetadata';

const originalRawgKey = process.env.RAWG_API_KEY;

afterEach(() => {
  if (originalRawgKey === undefined) delete process.env.RAWG_API_KEY;
  else process.env.RAWG_API_KEY = originalRawgKey;
});

describe('RAWG provider readiness', () => {
  it('never activates the provider merely because a key exists', () => {
    process.env.RAWG_API_KEY = 'test-key';
    expect(getRawgProviderStatus()).toEqual({
      status: 'setup_required',
      keyConfigured: true,
      message: expect.stringContaining('commercial-use terms'),
    });
  });
});
