type PcgsEnv = Record<string, string | undefined>;

export type PcgsAuctionRecord = {
  service: string | null;
  /** Grade shown on the PCGS sale row; View All may contain multiple grades. */
  grade: string | null;
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

type PcgsAuctionData = {
  pcgsNo: string | number | null;
  certNo: string | number | null;
  name: string | null;
  grade: string | null;
  year: string | number | null;
  denomination: string | null;
  historyScope: 'certificate' | 'pcgs_number_grade' | 'pcgs_public_view_all';
  viewAllUrl: string | null;
  auctions: PcgsAuctionRecord[];
};

type PcgsAuctionLookupResult =
  | { certNumber: string; status: 'success'; message: string; data: PcgsAuctionData }
  | { certNumber: string; status: 'not_found'; message: string; data: null }
  | { certNumber: string; status: 'error'; message: string; data: null };

import { classifyApiFailure, recordApiFailure } from './apiHealth';

const PCGS_REQUEST_TIMEOUT_MS = 15_000;
const PCGS_MAX_AUCTION_RECORDS = 100;
const PCGS_AUCTION_CACHE_TTL_MS = 10 * 60 * 1000;

const pcgsAuctionCache = new Map<string, { expiresAt: number; result: PcgsAuctionLookupResult }>();
const pcgsAuctionInFlight = new Map<string, Promise<PcgsAuctionLookupResult>>();

// Live requests alternate their starting credential so normal traffic is
// distributed across both PCGS keys. Explicit env objects used by tests keep
// the primary-first order so those tests remain deterministic.
let nextLiveCredentialIndex = 0;

function pcgsCredentialOrder(env: PcgsEnv): string[] {
  const primaryToken = env.PCGS_API_TOKEN;
  const secondaryToken = env.PCGS_API_TOKEN_SECONDARY;
  if (!primaryToken) return [];
  if (!secondaryToken || secondaryToken === primaryToken) return [primaryToken];

  const tokens = [primaryToken, secondaryToken];
  const startIndex = env === process.env ? nextLiveCredentialIndex : 0;
  if (env === process.env) nextLiveCredentialIndex = (nextLiveCredentialIndex + 1) % tokens.length;
  return [tokens[startIndex], tokens[(startIndex + 1) % tokens.length]];
}

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
      grade: entry.Grade ?? entry.DisplayGrade ?? entry.GradeDescription ?? null,
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
  // PCGS labels may include a designation after the numeric grade, e.g.
  // PR70DCAM or MS70RD. The grade field is already provider-labelled, so
  // extract the first 1–2 digit numeric grade rather than requiring it at the
  // end of the string.
  const match = text.match(/(\d{1,2})(?:\.0)?\s*(\+)?/);
  if (!match) return null;
  const gradeNo = Number(match[1]);
  return Number.isInteger(gradeNo) ? { gradeNo, plusGrade: Boolean(match[2]) } : null;
}

async function requestPcgsPublicViewAllHistory(pcgsNo: string, token: string) {
  const body = new URLSearchParams({
    draw: '1',
    start: '0',
    length: String(PCGS_MAX_AUCTION_RECORDS),
    'searchModel.CACOnly': 'false',
    'searchModel.SuffixId': '',
    'searchModel.GradeStart': '',
    'searchModel.GradeEnd': '',
    'searchModel.PCGSOnly': 'false',
    'searchModel.YearFrom': '1900',
    'searchModel.MonthFrom': '1',
    'searchModel.YearTo': String(new Date().getUTCFullYear()),
    'searchModel.MonthTo': String(new Date().getUTCMonth() + 1),
    'searchModel.SpecNo': pcgsNo,
    'searchModel.ExcludeEbay': 'false',
  });
  const response = await fetch('https://www.pcgs.com/auctionprices/loaddetails', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': 'Mozilla/5.0 Tradebilia read-only market research',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: `https://www.pcgs.com/auctionprices/details/${encodeURIComponent(pcgsNo)}`,
      Authorization: `bearer ${token}`,
    },
    body,
    signal: AbortSignal.timeout(PCGS_REQUEST_TIMEOUT_MS),
  });
  const payload = asObject(await response.json().catch(() => null));
  if (!response.ok) return { status: response.status, auctions: [] as PcgsAuctionRecord[] };
  const rows = Array.isArray(payload.data) ? payload.data : [];
  const auctions = rows.map((row: unknown): PcgsAuctionRecord => {
    const entry = asObject(row);
    const itemUrl = entry.SEOLotTitle && entry.SpecNo && entry.ItemIDString
      ? `https://www.pcgs.com/auctionprices/item/${entry.SEOLotTitle}/${entry.SpecNo}/${entry.ItemIDString}`
      : null;
    return {
      service: entry.GradingServiceName ?? null,
      grade: entry.DisplayGrade ?? entry.Grade ?? entry.GradeDescription ?? null,
      date: entry.FormattedSaleDate ?? null,
      auctioneer: entry.AuctionFirmName ?? null,
      lotNo: entry.LotNumber == null || entry.LotNumber === '' ? null : Number(entry.LotNumber),
      lotNumV2: entry.LotNumber ?? null,
      saleName: entry.AuctionSaleName ?? entry.DisplayTitle ?? null,
      certNo: entry.CertNo ?? null,
      price: positiveNumberOrNull(entry.Price),
      isCAC: null,
      auctionLotUrl: itemUrl,
    };
  }).filter((auction: PcgsAuctionRecord) => auction.price != null);
  return { status: response.status, auctions };
}

async function lookupPcgsPublicViewAllHistory(pcgsNo: string, env: PcgsEnv) {
  const tokens = pcgsCredentialOrder(env);
  if (!tokens.length) throw new Error('PCGS API token not configured');
  try {
    const firstResult = await requestPcgsPublicViewAllHistory(pcgsNo, tokens[0]);
    if (firstResult.status !== 429 || !tokens[1]) return firstResult;
    return requestPcgsPublicViewAllHistory(pcgsNo, tokens[1]);
  } catch (error) {
    if (!tokens[1] || !isPcgsTimeoutError(error)) throw error;
    return requestPcgsPublicViewAllHistory(pcgsNo, tokens[1]);
  }
}

async function fetchPcgsJson(url: string, token: string): Promise<{ response: Response; payload: Record<string, any> }> {
  const response = await fetch(url, {
    headers: { Authorization: `bearer ${token}` },
    signal: AbortSignal.timeout(PCGS_REQUEST_TIMEOUT_MS),
  });
  const payload = asObject(await response.json().catch(() => null));
  return { response, payload };
}

function isPcgsTimeoutError(error: unknown): boolean {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : String(error ?? '');
  return name === 'TimeoutError' || /(?:timed?\s*out|timeout)/i.test(message);
}

function isPcgsRateLimitResponse(response: Response): boolean {
  return response.status === 429;
}

async function fetchPcgsJsonWithTimeoutFallback(url: string, env: PcgsEnv): Promise<{ response: Response; payload: Record<string, any> }> {
  const tokens = pcgsCredentialOrder(env);
  if (!tokens.length) throw new Error('PCGS API token not configured');
  try {
    const firstResult = await fetchPcgsJson(url, tokens[0]);
    if (!isPcgsRateLimitResponse(firstResult.response) || !tokens[1]) return firstResult;
    return fetchPcgsJson(url, tokens[1]);
  } catch (error) {
    if (!tokens[1] || !isPcgsTimeoutError(error)) throw error;
    return fetchPcgsJson(url, tokens[1]);
  }
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
    const { response, payload: record } = await fetchPcgsJsonWithTimeoutFallback(url, env);
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

export async function lookupPcgsAuctionResults(certNumber: string, env: PcgsEnv = process.env): Promise<PcgsAuctionLookupResult> {
  const normalizedCertNumber = certNumber.trim();
  const token = env.PCGS_API_TOKEN;
  if (!token) return { certNumber: normalizedCertNumber, status: 'error' as const, message: 'PCGS API token not configured', data: null };

  // Cache only live server lookups. Tests pass an explicit env object and must
  // remain isolated; live browser remounts should reuse a successful result.
  const useCache = env === process.env;
  if (useCache) {
    const cached = pcgsAuctionCache.get(normalizedCertNumber);
    if (cached && cached.expiresAt > Date.now()) return cached.result;
    const existing = pcgsAuctionInFlight.get(normalizedCertNumber);
    if (existing) return existing;
  }

  const lookup = (async (): Promise<PcgsAuctionLookupResult> => {
   try {
    const certUrl = `https://api.pcgs.com/publicapi/coindetail/GetAPRByCertNo/${encodeURIComponent(normalizedCertNumber)}`;
    const certApr = await fetchPcgsJsonWithTimeoutFallback(certUrl, env);
    if (!certApr.response.ok) {
      await recordApiFailure({ provider: 'PCGS', operation: 'auction_prices_realized_lookup', failureClass: classifyApiFailure({ statusCode: certApr.response.status }), statusCode: certApr.response.status, safeMessage: 'PCGS auction prices realized lookup was rejected by the provider.' });
      return { certNumber: normalizedCertNumber, status: 'error' as const, message: pcgsErrorMessage(certApr.response.status), data: null };
    }
    const certPayloadError = providerPayloadError(certApr.payload);
    if (certPayloadError === 'invalid') return { certNumber: normalizedCertNumber, status: 'error' as const, message: 'PCGS rejected that certification number format.', data: null };

    let record = certApr.payload;
    let auctions = mapAuctionRecords(record.Auctions);
    let historyScope: 'certificate' | 'pcgs_number_grade' | 'pcgs_public_view_all' = 'certificate';

    // PCGS cert pages expose a View All link that switches from the individual
    // cert to the item’s PCGS number. Use the same broader item/grade history
    // when the individual certification has no sales.
    if (!auctions.length && certPayloadError !== 'not_found') {
      const factsUrl = `https://api.pcgs.com/publicapi/coindetail/GetCoinFactsByCertNo/${encodeURIComponent(normalizedCertNumber)}?retrieveAllData=true`;
      const facts = await fetchPcgsJsonWithTimeoutFallback(factsUrl, env);
      if (facts.response.ok && !providerPayloadError(facts.payload)) {
        // APR responses can omit the item identity fields that CoinFacts
        // supplies. Preserve those facts for the canonical row title and
        // public View All fallback rather than sending an anonymous price into
        // the analyzer.
        record = {
          ...record,
          PCGSNo: record.PCGSNo ?? facts.payload.PCGSNo,
          CertNo: record.CertNo ?? facts.payload.CertNo,
          Name: record.Name ?? facts.payload.Name ?? facts.payload.CoinName,
          Grade: record.Grade ?? facts.payload.Grade ?? facts.payload.GradeDescription,
          Year: record.Year ?? facts.payload.Year,
          Denomination: record.Denomination ?? facts.payload.Denomination,
        };
        const pcgsNo = facts.payload.PCGSNo;
        const grade = parseGradeNumber(facts.payload.Grade);
        if (pcgsNo && grade) {
          const gradeUrl = `https://api.pcgs.com/publicapi/coindetail/GetAPRByGrade?PCGSNo=${encodeURIComponent(String(pcgsNo))}&GradeNo=${grade.gradeNo}&PlusGrade=${grade.plusGrade ? 'true' : 'false'}&NumberOfRecords=${PCGS_MAX_AUCTION_RECORDS}`;
          const itemApr = await fetchPcgsJsonWithTimeoutFallback(gradeUrl, env);
          if (itemApr.response.ok && !providerPayloadError(itemApr.payload)) {
            // GetAPRByGrade responses do not always repeat the item identity.
            // Preserve CoinFacts identity so the final public View All fallback
            // cannot be skipped merely because this response omitted PCGSNo.
            record = {
              ...itemApr.payload,
              PCGSNo: itemApr.payload.PCGSNo ?? pcgsNo,
              CertNo: itemApr.payload.CertNo ?? facts.payload.CertNo ?? normalizedCertNumber,
              Name: itemApr.payload.Name ?? facts.payload.Name ?? facts.payload.CoinName,
              Grade: itemApr.payload.Grade ?? facts.payload.Grade ?? facts.payload.GradeDescription,
              Year: itemApr.payload.Year ?? facts.payload.Year,
              Denomination: itemApr.payload.Denomination ?? facts.payload.Denomination,
            };
            auctions = mapAuctionRecords(record.Auctions);
            historyScope = 'pcgs_number_grade';
          }
        }
      }
    }

    if (!auctions.length && certPayloadError !== 'not_found' && record.PCGSNo) {
      const publicHistory = await lookupPcgsPublicViewAllHistory(String(record.PCGSNo), env);
      if (publicHistory.auctions.length) {
        auctions = publicHistory.auctions;
        historyScope = 'pcgs_public_view_all';
      }
    }

    if (certPayloadError === 'not_found' && !auctions.length) return normalizedNotFound(normalizedCertNumber, 'No PCGS auction results were found for this certification or its PCGS item history.');

    return {
      certNumber: normalizedCertNumber,
      status: 'success' as const,
      message: auctions.length
        ? `PCGS returned ${auctions.length} item-level auction result${auctions.length === 1 ? '' : 's'}${historyScope !== 'certificate' ? ' from the PCGS View All history' : ''}.`
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
  })();
  if (!useCache) return lookup;
  pcgsAuctionInFlight.set(normalizedCertNumber, lookup);
  try {
    const result = await lookup;
    if (result.status === 'success' && result.data?.auctions?.length) {
      pcgsAuctionCache.set(normalizedCertNumber, { expiresAt: Date.now() + PCGS_AUCTION_CACHE_TTL_MS, result });
    }
    return result;
  } finally {
    pcgsAuctionInFlight.delete(normalizedCertNumber);
  }
}
