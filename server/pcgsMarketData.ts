type PcgsEnv = Record<string, string | undefined>;

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? value as Record<string, any> : {};
}

function pcgsErrorMessage(status: number): string {
  if (status === 401 || status === 403 || status >= 500) {
    return 'PCGS credentials are not authorized or the PCGS service is temporarily unavailable.';
  }
  if (status === 404) return 'No PCGS certification record was found for that number.';
  if (status === 429) return 'PCGS rate limit reached. Try again shortly.';
  return 'PCGS lookup is temporarily unavailable. Try again shortly.';
}

export async function lookupPcgsCertification(certNumber: string, env: PcgsEnv = process.env) {
  const normalizedCertNumber = certNumber.trim();
  const token = env.PCGS_API_TOKEN;
  if (!token) {
    return {
      certNumber: normalizedCertNumber,
      status: 'error' as const,
      message: 'PCGS API token not configured',
      data: null,
    };
  }

  try {
    const url = `https://api.pcgs.com/publicapi/coindetail/GetCoinFactsByCertNo/${encodeURIComponent(normalizedCertNumber)}?retrieveAllData=true`;
    const response = await fetch(url, {
      headers: { Authorization: `bearer ${token}` },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return { certNumber: normalizedCertNumber, status: 'error' as const, message: pcgsErrorMessage(response.status), data: null };
    }

    const record = asObject(payload);
    const serverMessage = String(record.ServerMessage ?? '').toLowerCase();
    if (record.IsValidRequest === false) {
      return { certNumber: normalizedCertNumber, status: 'error' as const, message: 'PCGS rejected that certification number format.', data: null };
    }
    if (serverMessage.includes('no data')) {
      return { certNumber: normalizedCertNumber, status: 'not_found' as const, message: 'No PCGS certification record was found for that number.', data: null };
    }

    const images = Array.isArray(record.Images) ? record.Images.map((image: unknown) => {
      const entry = asObject(image);
      return {
        label: entry.Label ?? entry.Description ?? null,
        thumbnailUrl: entry.ThumbnailUrl ?? entry.Url ?? null,
        popupUrl: entry.PopupUrl ?? entry.Url ?? null,
      };
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
        variety: record.Variety ?? null,
        grade: record.Grade ?? record.GradeDescription ?? null,
        mintage: record.Mintage ?? null,
        population: record.Population ?? record.PopulationAtGrade ?? null,
        popHigher: record.PopHigher ?? record.PopulationHigher ?? null,
        priceGuideValue: record.PriceGuideValue ?? record.CurrentPriceGuideValue ?? null,
        auctionValue: record.AuctionPrice ?? record.AuctionValue ?? null,
        images,
      },
    };
  } catch {
    return { certNumber: normalizedCertNumber, status: 'error' as const, message: 'PCGS lookup could not be reached. Try again shortly.', data: null };
  }
}
