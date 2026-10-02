import { describe, expect, it } from 'vitest';
import { formatProviderError, formatProviderNetworkError } from './providerError';

describe('structured non-Parse provider errors', () => {
  it('identifies authorization, rate-limit, not-found, timeout, and service failures', () => {
    expect(formatProviderError('IGDB', 401, { message: 'invalid client' })).toBe('IGDB credentials are not authorized (HTTP 401). Check the secure server-side credential configuration.');
    expect(formatProviderError('RAWG', 429, { detail: 'too many requests' })).toBe('RAWG rate limit reached (HTTP 429). Try again shortly.');
    expect(formatProviderError('Smithsonian', 404, {})).toBe('Smithsonian returned HTTP 404: no matching record or endpoint was found.');
    expect(formatProviderError('TCGdex', 408, {})).toBe('TCGdex request timed out (HTTP 408). Try again shortly.');
    expect(formatProviderError('Discogs', 503, { error: { message: 'upstream unavailable' } })).toBe('Discogs service error (HTTP 503): upstream unavailable');
  });

  it('uses a provider-supplied message for other HTTP failures and a safe network fallback', () => {
    expect(formatProviderError('IGDB', 400, { errors: [{ title: 'Malformed Apicalypse query' }] })).toBe('IGDB returned HTTP 400: Malformed Apicalypse query');
    expect(formatProviderNetworkError('RAWG')).toBe('RAWG could not be reached or the request timed out. Try again shortly.');
  });
});
