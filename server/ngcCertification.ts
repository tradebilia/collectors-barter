import { classifyApiFailure, recordApiFailure } from './apiHealth';

export type NgcCertificationResult =
  | { certNumber: string; gradeInput: string; numericGrade: string; status: 'success'; message: string; data: { title: string | null; grade: string | null; certificationNumber: string; images: string[] } }
  | { certNumber: string; gradeInput: string; numericGrade: string; status: 'not_found' | 'error'; message: string; data: null };

type NgcEnv = Record<string, string | undefined>;
type NgcCertificationData = { title: string | null; grade: string | null; certificationNumber: string; images: string[] };

const NGC_URL = 'https://www.ngccoin.com/certlookup/';
const NGC_TIMEOUT_MS = 15_000;

/** NGC requires the numeric grade for ordinary 1–70 coins (MS69 -> 69). */
export function normalizeNgcGrade(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^(?:raw|ungraded|none|null|undefined)$/i.test(raw)) return '';
  const named = raw.match(/^(ngc\s+details|ngc\s+ancients|other)$/i);
  if (named) return named[1].replace(/\s+/g, ' ').trim();
  const match = raw.match(/(?:^|\s)(\d{1,2})(?:\.0)?(?:\s|$)/i) || raw.match(/(\d{1,2})(?:\.0)?$/i);
  return match ? String(Number(match[1])) : raw;
}

function cleanText(value: string | null | undefined): string | null {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || null;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function firstMatch(html: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return cleanText(decodeHtml(match[1]));
  }
  return null;
}

function parseNgcResult(html: string, certNumber: string): NgcCertificationData {
  const title = firstMatch(html, [
    /<h1[^>]*>([\s\S]*?)<\/h1>/i,
    /<h2[^>]*>([\s\S]*?)<\/h2>/i,
    /class=["'][^"']*(?:coin|description)[^"']*["'][^>]*>([\s\S]*?)<\//i,
  ]);
  const grade = firstMatch(html, [
    /(?:Grade|NGC Grade)\s*:?\s*<[^>]+>([^<]+)</i,
    /(?:Grade|NGC Grade)\s*:?\s*([^<\n]{1,30})/i,
  ]);
  const images = [...html.matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/gi)]
    .map((match) => decodeHtml(match[1]))
    .filter((url) => /^https?:\/\//i.test(url) && !/logo|captcha|advert/i.test(url))
    .slice(0, 5);
  return { title, grade, certificationNumber: certNumber, images };
}

export async function lookupNgcCertification(
  certNumber: string,
  grade: string,
  env: NgcEnv = process.env,
): Promise<NgcCertificationResult> {
  const normalizedCert = certNumber.trim().replace(/[^0-9-]/g, '');
  const numericGrade = normalizeNgcGrade(grade);
  if (!normalizedCert) return { certNumber: normalizedCert, gradeInput: grade, numericGrade, status: 'error', message: 'Enter an NGC certification number.', data: null };
  if (!numericGrade) return { certNumber: normalizedCert, gradeInput: grade, numericGrade, status: 'error', message: 'Enter the NGC grade; MS69 is sent to NGC as 69.', data: null };

  try {
    const body = new URLSearchParams({
      CertNumber: normalizedCert,
      Grade: numericGrade,
    });
    const response = await fetch(NGC_URL, {
      method: 'POST',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 Tradebilia read-only certification lookup',
        Referer: NGC_URL,
      },
      body,
      signal: AbortSignal.timeout(NGC_TIMEOUT_MS),
    });
    const html = await response.text();
    if (response.status === 403 || /captcha|security center|access denied/i.test(html) && response.status >= 400) {
      await recordApiFailure({ provider: 'NGC', operation: 'certification_lookup', failureClass: classifyApiFailure({ statusCode: response.status }), statusCode: response.status, safeMessage: 'NGC certification lookup is blocked by the provider security challenge.' });
      return { certNumber: normalizedCert, gradeInput: grade, numericGrade, status: 'error', message: 'NGC returned a CAPTCHA/403 security block. No bypass was attempted.', data: null };
    }
    if (!response.ok) {
      await recordApiFailure({ provider: 'NGC', operation: 'certification_lookup', failureClass: classifyApiFailure({ statusCode: response.status }), statusCode: response.status, safeMessage: 'NGC certification lookup was rejected by the provider.' });
      return { certNumber: normalizedCert, gradeInput: grade, numericGrade, status: 'error', message: `NGC lookup returned HTTP ${response.status}.`, data: null };
    }
    if (/invalid certification|not found|no results|could not be found/i.test(html)) {
      return { certNumber: normalizedCert, gradeInput: grade, numericGrade, status: 'not_found', message: 'NGC did not find a certification matching that number and grade.', data: null };
    }
    const data = parseNgcResult(html, normalizedCert);
    return { certNumber: normalizedCert, gradeInput: grade, numericGrade, status: 'success', message: 'NGC certification lookup completed.', data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'NGC request failed';
    await recordApiFailure({ provider: 'NGC', operation: 'certification_lookup', failureClass: classifyApiFailure({ message }), safeMessage: 'NGC certification lookup is temporarily unavailable.' });
    return { certNumber: normalizedCert, gradeInput: grade, numericGrade, status: 'error', message: 'NGC lookup could not be reached. Try again shortly.', data: null };
  }
}
