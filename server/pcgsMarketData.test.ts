import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupPcgsCertification } from './pcgsMarketData';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe('PCGS certification adapter', () => {
  it('uses the documented CoinFacts-by-cert endpoint with a bearer token and maps safe certification fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        IsValidRequest: true,
        ServerMessage: 'Request successful',
        PCGSNo: '98836',
        CertNo: '25651776',
        Name: '1921 Peace Dollar',
        Year: 1921,
        Denomination: '$1',
        Grade: 'MS65',
        Population: 432,
        PopHigher: 18,
        PriceGuideValue: 1500,
        Images: [{ Label: 'Obverse', ThumbnailUrl: 'https://example.com/obverse.jpg' }],
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    const result = await lookupPcgsCertification('25651776', { PCGS_API_TOKEN: 'configured-token' });

    expect(result.status).toBe('success');
    expect(result.data?.name).toBe('1921 Peace Dollar');
    expect(result.data?.population).toBe(432);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/coindetail/GetCoinFactsByCertNo/25651776?retrieveAllData=true'),
      expect.objectContaining({ headers: { Authorization: 'bearer configured-token' } }),
    );
  });

  it('does not make a request when the secure PCGS token is absent', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    const result = await lookupPcgsCertification('25651776', {});

    expect(result.status).toBe('error');
    expect(result.message).toContain('not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
