export type RawgProviderStatus = {
  status: 'setup_required';
  keyConfigured: boolean;
  message: string;
};

/**
 * RAWG stays deliberately inactive until the user supplies a server-side key and
 * confirms that the provider's current commercial terms permit Tradebilia's use.
 * This readiness function never makes a RAWG request.
 */
export function getRawgProviderStatus(): RawgProviderStatus {
  const keyConfigured = Boolean(process.env.RAWG_API_KEY?.trim());
  return {
    status: 'setup_required',
    keyConfigured,
    message: keyConfigured
      ? 'RAWG is still inactive. Confirm the current commercial-use terms in writing before enabling any lookup.'
      : 'RAWG is inactive. Add a server-side RAWG API key, then confirm the current commercial-use terms in writing before enabling any lookup.',
  };
}
