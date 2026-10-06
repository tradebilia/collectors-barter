type PcgsEnv = Record<string, string | undefined>;

export type PcgsAuctionRecord = {
  service: string | null;
  date: string | null;
  auctioneer: string | null;
  lotNo: number | null;
  lotNumV2: string | null;
  saleName: string | null;
  certNo: string | null;
  price: number | null;
  isCAC: boolean | null;
  auctionLotUrl: string | null;
};

import { classifyApiFailure, recordApiFailure } from './apiHealth';

const PCGS_REQUEST_TIMEOUT_MS = 15_000;
const PCGS_MAX_AUCTION_RECORDS = 100;

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? value as Record<string, any> : {};
}

function numberOrNull(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function positiveNumberOrNull(value: unknown): number | null {
  const parsed = numberOrNull(value);
  return parsed != null && parsed > 0 ? parsed : null;
}

function pcgsErrorMessage(status: number): string {
  if (status === 401 || status === 403 || status >= 500) {
    return 'PCGS credentials are not authorized or the PCGS service is temporarily unavailable.';
  }
  if (status === 404) return 'No PCGS certification record was found for that number.';
  if (status === 429) return 'PCGS rate limit reached. Try again shortly.';
  return 'PCGS lookup is temporarily unavailable. Try again shortly.';
}

function mapAuctionRecords(value: unknown): PcgsAuctionRecord[] {
  const records = Array.isArray(value) ? value : [];
  return records.slice(0, PCGS_MAX_AUCTION_RECORDS).map((auction: unknown): PcgsAuctionRecord => {
    const entry = asObject(auction);
    return {
      service: entry.Service ?? null,
      date: entry.Date ?? null,
      auctioneer: entry.Auctioneer ?? null,
      lotNo: numberOrNull(entry.LotNo),
      lotNumV2: entry.LotNumV2 ?? null,
      saleName: entry.SaleName ?? null,
      certNo: entry.CertNo ?? null,
      price: positiveNumberOrNull(entry.Price),
      isCAC: entry.IsCAC == null ? null : Boolean(entry.IsCAC),
      auctionLotUrl: entry.AuctionLotUrl ?? null,
    };
  });
}

function parseGradeNumber(grade: unknown): { gradeNo: number; plusGrade: boolean } | null {
  const text = String(grade ?? '').trim();
  const match = text.match(/(\d{1,2})(?:\.0)?\s*(\+)?$/);
  if (!match) return null;
  const gradeNo = Number(match[1]);
  return Number.isInteger(gradeNo) ? { gradeNo, plusGrade: Boolean(match[2]) } : null;
}

async function fetchPcgsJson(url: string, token: string): Promise<{ response: Response; payload: Record<string, any> }> {
  const response = await fetch(url, {
    headers: { Authorization: `bearer ${token}` },
    signal: AbortSignal.timeout(PCGS_REQUEST_TIMEOUT_MS),
  });
  const payload = asObject(await response.json().catch(() => null));
  return { response, payload };
}

function providerPayloadError(payload: Record<string, any>): 'invalid' | 'not_found' | null {
  if (payload.IsValidRequest === false) return 'invalid';
  if (String(payload.ServerMessage ?? '').toLowerCase().includes('no data')) return 'not_found';
  return null;
}

function normalizedNotFound(certNumber: string, message: string) {
  return { certNumber, status: 'not_found' as const, message, data: null };
}

export async function lookupPcgsCertification(certNumber: string, env: PcgsEnv = process.env) {
  const normalizedCertNumber = certNumber.trim();
  const token = env.PCGS_API_TOKEN;
  if (!token) {
    return { certNumber: normalizedCertNumber, status: 'error' as const, message: 'PCGS API token not configured', data: null };
  }

  try {
    const url = `https://api.pcgs.com/publicapi/coindetail/GetCoinFactsByCertNo/${encodeURIComponent(normalizedCertNumber)}?retrieveAllData=true`;
    const { response, payload: record } = await fetchPcgsJson(url, token);
    if (!response.ok) {
      await recordApiFailure({ provider: 'PCGS', operation: 'certification_lookup', failureClass: classifyApiFailure({ statusCode: response.status }), statusCode: response.status, safeMessage: 'PCGS certification lookup was rejected by the provider.' });
      return { certNumber: normalizedCertNumber, status: 'error' as const, message: pcgsErrorMessage(response.status), data: null };
    }
    const payloadError = providerPayloadError(record);
    if (payloadError === 'invalid') return { certNumber: normalizedCertNumber, status: 'error' as const, message: 'PCGS rejected that certification number format.', data: null };
    if (payloadError === 'not_found') return normalizedNotFound(normalizedCertNumber, 'No PCGS certification record was found for that number.');

    const images = Array.isArray(record.Images) ? record.Images.map((image: unknown) => {
      const entry = asObject(image);
      return { label: entry.Label ?? entry.Description ?? null, thumbnailUrl: entry.ThumbnailUrl ?? entry.Url ?? null, popupUrl: entry.PopupUrl ?? entry.Url ?? null };
    }).filter((image: { thumbnailUrl: string | null; popupUrl: string | null }) => image.thumbnailUrl || image.popupUrl) : [];

    return {
      certNumber: normalizedCertNumber,
      status: 'success' as const,
      data: {
        pcgsNo: record.PCGSNo ?? null,
        certNo: record.CertNo ?? normalizedCertNumber,
        name: record.Name ?? record.CoinName ?? null,
        year: record.Year ?? null,
        denomination: record.Denomination ?? null,
        variety: record.Variety ?? record.MajorVariety ?? record.MinorVariety ?? null,
        grade: record.Grade ?? record.GradeDescription ?? null,
        mintage: record.Mintage ?? null,
        population: record.Population ?? record.PopulationAtGrade ?? null,
        popHigher: record.PopHigher ?? record.PopulationHigher ?? null,
        priceGuideValue: positiveNumberOrNull(record.PriceGuideValue ?? record.CurrentPriceGuideValue),
        auctionValue: positiveNumberOrNull(record.AuctionPrice ?? record.AuctionValue),
        images,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PCGS request failed';
    await recordApiFailure({ provider: 'PCGS', operation: 'certification_lookup', failureClass: classifyApiFailure({ message }), safeMessage: 'PCGS certification lookup is temporarily unavailable.' });
    return { certNumber: normalizedCertNumber, status: 'error' as const, message: 'PCGS lookup could not be reached. Try again shortly.', data: null };
  }
}

export async function lookupPcgsAuctionResults(certNumber: string, env: PcgsEnv = process.env) {
  const normalizedCertNumber = certNumber.trim();
  const token = env.PCGS_API_TOKEN;
  if (!token) return { certNumber: normalizedCertNumber, status: 'error' as const, message: 'PCGS API token not configured', data: null };

  try {
    const certUrl = `https://api.pcgs.com/publicapi/coindetail/GetAPRByCertNo/${encodeURIComponent(normalizedCertNumber)}`;
    const certApr = await fetchPcgsJson(certUrl, token);
    if (!certApr.response.ok) {
      await recordApiFailure({ provider: 'PCGS', operation: 'auction_prices_realized_lookup', failureClass: classifyApiFailure({ statusCode: certApr.response.status }), statusCode: certApr.response.status, safeMessage: 'PCGS auction prices realized lookup was rejected by the provider.' });
      return { certNumber: normalizedCertNumber, status: 'error' as const, message: pcgsErrorMessage(certApr.response.status), data: null };
    }
    const certPayloadError = providerPayloadError(certApr.payload);
    if (certPayloadError === 'invalid') return { certNumber: normalizedCertNumber, status: 'error' as const, message: 'PCGS rejected that certification number format.', data: null };

    let record = certApr.payload;
    let auctions = mapAuctionRecords(record.Auctions);
    let historyScope: 'certificate' | 'pcgs_number_grade' = 'certificate';

    // PCGS cert pages expose a View All link that switches from the individual
    // cert to the item’s PCGS number. Use the same broader item/grade history
    // when the individual certification has no sales.
    if (!auctions.length && certPayloadError !== 'not_found') {
      const factsUrl = `https://api.pcgs.com/publicapi/coindetail/GetCoinFactsByCertNo/${encodeURIComponent(normalizedCertNumber)}?retrieveAllData=true`;
      const facts = await fetchPcgsJson(factsUrl, token);
      if (facts.response.ok && !providerPayloadError(facts.payload)) {
        const pcgsNo = facts.payload.PCGSNo;
        const grade = parseGradeNumber(facts.payload.Grade);
        if (pcgsNo && grade) {
          const gradeUrl = `https://api.pcgs.com/publicapi/coindetail/GetAPRByGrade?PCGSNo=${encodeURIComponent(String(pcgsNo))}&GradeNo=${grade.gradeNo}&PlusGrade=${grade.plusGrade ? 'true' : 'false'}&NumberOfRecords=${PCGS_MAX_AUCTION_RECORDS}`;
          const itemApr = await fetchPcgsJson(gradeUrl, token);
          if (itemApr.response.ok && !providerPayloadError(itemApr.payload)) {
            record = itemApr.payload;
            auctions = mapAuctionRecords(record.Auctions);
            historyScope = 'pcgs_number_grade';
          }
        }
      }
    }

    if (certPayloadError === 'not_found' && !auctions.length) return normalizedNotFound(normalizedCertNumber, 'No PCGS auction results were found for this certification or its PCGS item history.');

    return {
      certNumber: normalizedCertNumber,
      status: 'success' as const,
      message: auctions.length
        ? `PCGS returned ${auctions.length} item-level auction result${auctions.length === 1 ? '' : 's'}${historyScope === 'pcgs_number_grade' ? ' from the PCGS View All history' : ''}.`
        : 'No PCGS auction results were found for this certification or its PCGS item history.',
      data: {
        pcgsNo: record.PCGSNo ?? null,
        certNo: record.CertNo ?? normalizedCertNumber,
        name: record.Name ?? null,
        grade: record.Grade ?? null,
        year: record.Year ?? null,
        denomination: record.Denomination ?? null,
        historyScope,
        viewAllUrl: record.PCGSNo ? `https://www.pcgs.com/auctionprices/search/${encodeURIComponent(String(record.PCGSNo))}/true` : null,
        auctions,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PCGS auction request failed';
    await recordApiFailure({ provider: 'PCGS', operation: 'auction_prices_realized_lookup', failureClass: classifyApiFailure({ message }), safeMessage: 'PCGS auction prices realized lookup is temporarily unavailable.' });
    return { certNumber: normalizedCertNumber, status: 'error' as const, message: 'PCGS auction results could not be reached. Try again shortly.', data: null };
  }
}
