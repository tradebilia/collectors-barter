import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupPcgsAuctionResults, lookupPcgsCertification } from './pcgsMarketData';
import { isValidGradeForCompany } from '../shared/gradingCompanyConfig';

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

  it('uses the documented Auction Prices Realized-by-cert endpoint and maps auction fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        IsValidRequest: true,
        ServerMessage: 'Request successful',
        PCGSNo: '98836',
        CertNo: '25651776',
        Name: '1921 Peace Dollar',
        Grade: 'MS65',
        Auctions: [{ Service: 'Heritage', Date: '2024-02-01', Auctioneer: 'Heritage Auctions', LotNo: 1234, SaleName: 'Long Beach', Price: 1800, IsCAC: true, AuctionLotUrl: 'https://example.com/lot/1234' }],
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    const result = await lookupPcgsAuctionResults('25651776', { PCGS_API_TOKEN: 'configured-token' });

    expect(result.status).toBe('success');
    expect(result.data?.auctions[0]).toMatchObject({ auctioneer: 'Heritage Auctions', price: 1800, isCAC: true });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/coindetail/GetAPRByCertNo/25651776'),
      expect.objectContaining({ headers: { Authorization: 'bearer configured-token' } }),
    );
  });

  it('accepts alphanumeric PCGS coin grades such as MS65', () => {
    expect(isValidGradeForCompany('PCGS', 'MS65')).toBe(true);
    expect(isValidGradeForCompany('PCGS', 'MS65+')).toBe(true);
    expect(isValidGradeForCompany('PCGS', 'not-a-grade')).toBe(false);
  });
});
