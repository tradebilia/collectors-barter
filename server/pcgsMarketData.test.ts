import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupPcgsAuctionResults, lookupPcgsCertification } from './pcgsMarketData';
import { isValidGradeForCompany } from '../shared/gradingCompanyConfig';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

function okJson(payload: unknown) {
  return { ok: true, status: 200, json: async () => payload };
}

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

  it('does not display a provider zero as a meaningful guide value', async () => {
    global.fetch = vi.fn().mockResolvedValue(okJson({
      IsValidRequest: true,
      ServerMessage: 'Request successful',
      PCGSNo: '973314',
      CertNo: '51095404',
      Name: '2025 $1 Silver Eagle First Strike 1 of 2025',
      Grade: 'MS70',
      PriceGuideValue: 0,
    })) as typeof fetch;

    const result = await lookupPcgsCertification('51095404', { PCGS_API_TOKEN: 'configured-token' });

    expect(result.status).toBe('success');
    expect(result.data?.priceGuideValue).toBeNull();
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
    expect(result.data?.viewAllUrl).toBe('https://www.pcgs.com/auctionprices/search/98836/true');
    expect(result.data?.auctions[0]).toMatchObject({ auctioneer: 'Heritage Auctions', price: 1800, isCAC: true });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/coindetail/GetAPRByCertNo/25651776'),
      expect.objectContaining({ headers: { Authorization: 'bearer configured-token' } }),
    );
  });

  it('follows the PCGS certificate page View All behavior when cert history is empty', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(okJson({ IsValidRequest: true, ServerMessage: 'Request successful', PCGSNo: '973314', CertNo: '51095404', Auctions: [] }))
      .mockResolvedValueOnce(okJson({ IsValidRequest: true, ServerMessage: 'Request successful', PCGSNo: '973314', CertNo: '51095404', Grade: 'MS70', Name: '2025 Silver Eagle' }))
      .mockResolvedValueOnce(okJson({
        IsValidRequest: true,
        ServerMessage: 'Request successful',
        PCGSNo: '973314',
        Grade: 'MS70',
        Auctions: [{ Service: 'PCGS', Date: '2025-02-09', Auctioneer: 'eBay', LotNo: 1, SaleName: '2025 Silver Eagle', Price: 330 }],
      }));
    global.fetch = fetchMock as typeof fetch;

    const result = await lookupPcgsAuctionResults('51095404', { PCGS_API_TOKEN: 'configured-token' });

    expect(result.status).toBe('success');
    expect(result.data?.historyScope).toBe('pcgs_number_grade');
    expect(result.data?.viewAllUrl).toBe('https://www.pcgs.com/auctionprices/search/973314/true');
    expect(result.data?.auctions).toHaveLength(1);
    expect(fetchMock.mock.calls[2][0]).toContain('/coindetail/GetAPRByGrade?PCGSNo=973314&GradeNo=70&PlusGrade=false&NumberOfRecords=100');
    expect(result.message).toContain('View All history');
  });

  it('uses the secondary key only after a certification request times out', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('The operation timed out'))
      .mockResolvedValueOnce(okJson({ IsValidRequest: true, ServerMessage: 'Request successful', PCGSNo: '98836', CertNo: '25651776', Name: '1921 Peace Dollar' }));
    global.fetch = fetchMock as typeof fetch;

    const result = await lookupPcgsCertification('25651776', {
      PCGS_API_TOKEN: 'primary-token',
      PCGS_API_TOKEN_SECONDARY: 'secondary-token',
    });

    expect(result.status).toBe('success');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ headers: { Authorization: 'bearer primary-token' } }));
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ headers: { Authorization: 'bearer secondary-token' } }));
  });

  it('uses the secondary key only after an Auction Prices Realized request times out', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('The operation timed out'))
      .mockResolvedValueOnce(okJson({ IsValidRequest: true, ServerMessage: 'Request successful', PCGSNo: '98836', CertNo: '25651776', Auctions: [{ Service: 'PCGS', Date: '2024-02-01', Auctioneer: 'Heritage Auctions', Price: 1800 }] }));
    global.fetch = fetchMock as typeof fetch;

    const result = await lookupPcgsAuctionResults('25651776', {
      PCGS_API_TOKEN: 'primary-token',
      PCGS_API_TOKEN_SECONDARY: 'secondary-token',
    });

    expect(result.status).toBe('success');
    expect(result.data?.auctions).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ headers: { Authorization: 'bearer primary-token' } }));
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ headers: { Authorization: 'bearer secondary-token' } }));
  });

  it('uses the secondary key after a certification HTTP 429 rate-limit response', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ ServerMessage: 'rate limit' }) })
      .mockResolvedValueOnce(okJson({ IsValidRequest: true, ServerMessage: 'Request successful', PCGSNo: '98836', CertNo: '25651776', Name: '1921 Peace Dollar' }));
    global.fetch = fetchMock as typeof fetch;

    const result = await lookupPcgsCertification('25651776', {
      PCGS_API_TOKEN: 'primary-token',
      PCGS_API_TOKEN_SECONDARY: 'secondary-token',
    });

    expect(result.status).toBe('success');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ headers: { Authorization: 'bearer primary-token' } }));
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ headers: { Authorization: 'bearer secondary-token' } }));
  });

  it.each([401, 403, 500])('does not use the secondary key for an HTTP %s response', async (status) => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({ ServerMessage: 'provider failure' }) });
    global.fetch = fetchMock as typeof fetch;

    const result = await lookupPcgsCertification('25651776', {
      PCGS_API_TOKEN: 'primary-token',
      PCGS_API_TOKEN_SECONDARY: 'secondary-token',
    });

    expect(result.status).toBe('error');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('accepts alphanumeric PCGS coin grades such as MS65', () => {
    expect(isValidGradeForCompany('PCGS', 'MS65')).toBe(true);
    expect(isValidGradeForCompany('PCGS', 'MS65+')).toBe(true);
    expect(isValidGradeForCompany('PCGS', 'not-a-grade')).toBe(false);
  });
});
