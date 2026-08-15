import { describe, it, expect } from 'vitest';
import { getSoldCompsApiKey } from './testAIRouter';

describe('Sold-Comps API key validation', () => {
  it('accepts the configured SOLID_COMPS_API_KEY name without exposing its value', () => {
    expect(getSoldCompsApiKey({ SOLID_COMPS_API_KEY: 'configured-key' })).toBe('configured-key');
  });

  it('prefers SOLD_COMPS_API_KEY when the standardized name is configured', () => {
    expect(getSoldCompsApiKey({ SOLD_COMPS_API_KEY: 'standard-key', SOLID_COMPS_API_KEY: 'legacy-key' })).toBe('standard-key');
  });

  it('reports no credential only when neither supported variable is configured', () => {
    expect(getSoldCompsApiKey({})).toBeNull();
  });
});
