import { JSDOM } from "jsdom";
import { numericGradesEquivalent } from "../shared/publicGradeValues";

export type SiriusSportsAuctionLookupInput = {
  title: string;
  category: string;
  grade?: string | null;
  condition?: string | null;
  certificationCompany?: string | null;
  itemDetails?: string | null;
  itemType?: string | null;
  imageUrl?: string | null;
};

type JsonRecord = Record<string, unknown>;

export const SIRIUS_AUCTION_RESULTS_URL =
  "https://siriussportsauctions.com/auctionresults.aspx";
export const SIRIUS_MAX_CANDIDATES = 8;
export const SIRIUS_TIMEOUT_MS = 90_000;

type SiriusSummary = {
  auctionName: string;
  lotId: string;
  title: string;
  minBid: number | null;
  finalPrice: number | null;
  status: string;
  url: string | null;
  auctionUrl: string | null;
};

function text(value: unknown): string {
  return value == null ? "" : String(value).trim();
}
function normalize(value: unknown): string {
  return text(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}
function parseDetails(itemDetails?: string | null): JsonRecord {
  if (!itemDetails?.trim()) return {};
  try {
    return record(JSON.parse(itemDetails));
  } catch {
    return {};
  }
}
function categoryIsSportsCards(category: string): boolean {
  return normalize(category).replace(/ /g, "_") === "sports_cards";
}
function parseMoney(value: unknown): number | null {
  const raw = text(value).replace(/[$,]/g, "");
  const number = Number(raw);
  return Number.isFinite(number) && number > 0 ? number : null;
}
function absoluteUrl(href: string): string | null {
  try {
    return new URL(href, SIRIUS_AUCTION_RESULTS_URL).toString();
  } catch {
    return null;
  }
}
function significantTokens(value: string): string[] {
  const stop = new Set([
    "the",
    "and",
    "card",
    "cards",
    "trading",
    "graded",
    "grade",
    "sports",
    "auction",
    "lot",
    "rookie",
    "rc",
  ]);
  return [
    ...new Set(
      normalize(value)
        .split(" ")
        .filter(token => token.length >= 3 && !stop.has(token))
    ),
  ];
}
function identityMatch(
  target: SiriusSportsAuctionLookupInput,
  candidateTitle: string,
  description = ""
): { matched: boolean; score: number; matchedTokens: string[] } {
  const details = parseDetails(target.itemDetails);
  const targetIdentity = [
    target.title,
    details.player,
    details.athlete,
    details.subject,
    details.setName,
    details.cardSet,
    details.year,
    details.cardNumber,
  ]
    .filter(Boolean)
    .join(" ");
  const targetTokens = significantTokens(targetIdentity);
  const candidate = normalize(`${candidateTitle} ${description}`);
  const matchedTokens = targetTokens.filter(token => candidate.includes(token));
  const score = targetTokens.length
    ? matchedTokens.length / targetTokens.length
    : 0;
  return {
    matched:
      matchedTokens.length >= 2 ||
      matchedTokens.some(token => token.length >= 7),
    score,
    matchedTokens,
  };
}
function gradeMatches(
  target: SiriusSportsAuctionLookupInput,
  candidateText: string
): boolean {
  if (!target.grade) return true;
  const candidate = text(candidateText);
  const numericValues = [...candidate.matchAll(/\b\d+(?:\.\d+)?\b/g)].map(match => match[0]);
  if (numericValues.some(numeric => numericGradesEquivalent(target.grade, numeric))) return true;
  const expected = normalize(
    `${target.certificationCompany ?? ""} ${target.grade}`
  ).replace(/ /g, "");
  const actual = normalize(candidate).replace(/ /g, "");
  return Boolean(
    !expected ||
      actual.includes(expected) ||
      actual.includes(normalize(target.grade).replace(/ /g, ""))
  );
}

export function buildSiriusSearchRequest(
  input: SiriusSportsAuctionLookupInput
): { query: string; url: string; form: Record<string, string> } {
  const details = parseDetails(input.itemDetails);
  const values = [
    details.player,
    details.athlete,
    details.subject,
    details.cardName,
    details.setName,
    details.cardSet,
    details.year,
    details.cardNumber,
    input.title,
  ]
    .map(text)
    .filter(Boolean);
  const query =
    [...new Set(values)].join(" ").slice(0, 180).trim() || input.title.trim();
  return {
    query,
    url: SIRIUS_AUCTION_RESULTS_URL,
    form: {
      auctionId: "-1",
      searchBy: "3",
      query,
      recordCap: String(SIRIUS_MAX_CANDIDATES),
    },
  };
}

export function parseSiriusAuctionResultsHtml(
  html: string,
  baseUrl = SIRIUS_AUCTION_RESULTS_URL
): SiriusSummary[] {
  const document = new JSDOM(html).window.document;
  const grid = document.querySelector("#SearchGrid");
  if (!grid) return [];
  return [...grid.querySelectorAll("tr")]
    .slice(1)
    .map((row): SiriusSummary | null => {
      const cells = [...row.querySelectorAll("th, td")].map(cell =>
        text(cell.textContent)
      );
      if (cells.length < 6) return null;
      const links = [...row.querySelectorAll("a[href]")];
      const lotLink = links.find(link =>
        /lotdetail\.aspx\?inventoryid=/i.test(link.getAttribute("href") ?? "")
      );
      const auctionLink = links.find(link =>
        /auctionresults\.aspx\?auctionid=/i.test(
          link.getAttribute("href") ?? ""
        )
      );
      return {
        auctionName: cells[0],
        lotId: cells[1],
        title: cells[2],
        minBid: parseMoney(cells[3]),
        finalPrice: parseMoney(cells[4]),
        status: cells[5].toLowerCase(),
        url: lotLink
          ? new URL(lotLink.getAttribute("href")!, baseUrl).toString()
          : null,
        auctionUrl: auctionLink
          ? new URL(auctionLink.getAttribute("href")!, baseUrl).toString()
          : null,
      };
    })
    .filter((row): row is SiriusSummary => Boolean(row?.title));
}

export function parseSiriusLotHtml(html: string): JsonRecord {
  const document = new JSDOM(html).window.document;
  const page =
    document.querySelector("#LotDetailContent, #PageBase, #MainPanel") ??
    document.body;
  const pageText = text(page.textContent).replace(/\s+/g, " ");
  const title = text(
    document.querySelector("#LotInfo h1, #LotInfo, h1")?.textContent
  )
    .replace(/^Lot\s*#?\d+\s*:\s*/i, "")
    .trim();
  const description =
    text(document.querySelector("#Description")?.textContent) || title;
  const lotId = pageText.match(/Lot\s*#\s*([A-Za-z0-9-]+)/i)?.[1] ?? null;
  const finalPriceText =
    pageText.match(
      /Final prices? include buyers premium\.?\s*:\s*\$?([\d,]+(?:\.\d{1,2})?)/i
    )?.[1] ??
    pageText.match(/Final Price\s*:?\s*\$?([\d,]+(?:\.\d{1,2})?)/i)?.[1];
  const endedText =
    pageText.match(/Bidding ended on\s+([^.;]+?\d{4})/i)?.[1] ??
    pageText.match(/Auction closed on\s+([^.;]+?\d{4})/i)?.[1] ??
    null;
  const closed =
    /lot is closed for bidding|bidding ended on|auction closed on/i.test(
      pageText
    );
  const auctionName =
    text(document.querySelector("#AuctionName")?.textContent) ||
    pageText.match(
      /(Sirius Sports Cards Auction\s*#\s*\d+[^.]*?Ends\s+[^.]+?\d{2})/i
    )?.[1] ||
    null;
  const imageUrl = document
    .querySelector('#ImagesSection img, #ThumbPanel img, img[id*="Image"]')
    ?.getAttribute("src");
  return {
    title,
    description,
    lotId,
    finalPrice: parseMoney(finalPriceText),
    date: endedText,
    closed,
    auctionName,
    imageUrl: imageUrl ? absoluteUrl(imageUrl) : null,
    rawText: pageText.slice(0, 5000),
  };
}

export function normalizeSiriusSale(
  summary: SiriusSummary,
  detail: JsonRecord,
  target: SiriusSportsAuctionLookupInput
): JsonRecord {
  const title = text(detail.title || summary.title);
  const description = text(detail.description || title);
  const identity = identityMatch(target, title, description);
  const price = parseMoney(detail.finalPrice ?? summary.finalPrice);
  const date = text(detail.date);
  const closed =
    detail.closed === true ||
    /over|closed|sold|complete/i.test(`${summary.status} ${detail.rawText}`);
  const sold =
    closed &&
    price !== null &&
    Boolean(date) &&
    Number.isFinite(Date.parse(date));
  const gradeCompatible = gradeMatches(target, `${title} ${description}`);
  const identityMatched = identity.matched && gradeCompatible;
  const exclusionReason = sold && identityMatched
    ? null
    : !sold
      ? "Missing explicit closed status, final price, or valid close date."
      : !identity.matched
        ? `Identity token gate failed: matched ${identity.matchedTokens.length} of the target identity tokens (${identity.matchedTokens.join(", ") || "none"}).`
        : !gradeCompatible
          ? `Grader/grade gate failed: target ${target.certificationCompany ?? "grader unavailable"} ${target.grade ?? "grade unavailable"} was not found as a compatible value in the Sirius lot text.`
          : "Identity or grade compatibility failed.";
  return {
    sourceId: "sirius_sports_auctions",
    provider: "Sirius Sports Auctions",
    title,
    description: description || null,
    lotId: text(detail.lotId || summary.lotId) || null,
    auctionName: text(detail.auctionName || summary.auctionName) || null,
    url: summary.url,
    auctionUrl: summary.auctionUrl,
    imageUrl: text(detail.imageUrl) || null,
    status: summary.status || (closed ? "closed" : "unknown"),
    sold,
    completed: sold,
    price: sold ? price : null,
    finalPrice: price,
    currency: "USD",
    priceBasis: "realized",
    buyerPremiumIncluded: true,
    date: date || null,
    datePrecision: date ? "auction_closed" : "unknown",
    grade: target.grade ?? null,
    identityMatched,
    identityScore: identity.score,
    matchedTokens: identity.matchedTokens,
    saleStatus: sold ? "completed" : summary.status || "unknown",
    valuationEligible: Boolean(sold && identityMatched && date && price != null),
    priceSemantics: sold
      ? "Sirius final price including buyers premium; candidate only after identity, date, duplicate, and visual gates."
      : "Not an explicit dated closed sale; context only.",
    exclusionReason,
    raw: { summary, detail },
  };
}

async function getHtml(
  response: Response
): Promise<{ status: number; html: string; error: string | null }> {
  const html = await response.text();
  return {
    status: response.status,
    html,
    error: response.ok
      ? null
      : `Sirius Sports Auctions returned HTTP ${response.status}: ${html.replace(/\s+/g, " ").slice(0, 240)}`,
  };
}

export async function lookupSiriusSportsAuctions(
  input: SiriusSportsAuctionLookupInput
) {
  const request = buildSiriusSearchRequest(input);
  const empty = {
    source: "sirius_sports_auctions",
    label: "Sirius Sports Auctions",
    status: "error" as const,
    query: request.query,
    sales: [] as JsonRecord[],
    context: [] as JsonRecord[],
    messages: [] as string[],
    requestUrl: request.url,
    recordCap: SIRIUS_MAX_CANDIDATES,
    raw: { search: null, details: [] as JsonRecord[] },
  };
  if (!categoryIsSportsCards(input.category))
    return {
      ...empty,
      status: "not_applicable" as const,
      messages: ["Sirius Sports Auctions is enabled for Sports Cards only."],
    };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SIRIUS_TIMEOUT_MS);
  try {
    const initial = await fetch(SIRIUS_AUCTION_RESULTS_URL, {
      headers: {
        Accept: "text/html",
        "User-Agent": "Tradebilia read-only marketplace adapter",
      },
      signal: controller.signal,
    });
    const initialResult = await getHtml(initial);
    if (initialResult.error)
      return { ...empty, messages: [initialResult.error] };
    const initialDocument = new JSDOM(initialResult.html).window.document;
    const hidden: Record<string, string> = {};
    initialDocument
      .querySelectorAll('form input[type="hidden"][name]')
      .forEach(node => {
        hidden[node.getAttribute("name")!] = node.getAttribute("value") ?? "";
      });
    const form = new URLSearchParams({
      ...hidden,
      group1: "Auction",
      ctl00$ContentPlaceHolder$AuctionSelector$AuctionDDL:
        request.form.auctionId,
      ctl00$ContentPlaceHolder$SearchTB: request.query,
      ctl00$ContentPlaceHolder$SearchByDDL: request.form.searchBy,
      ctl00$ContentPlaceHolder$GoBtn: "Submit",
    });
    const search = await fetch(SIRIUS_AUCTION_RESULTS_URL, {
      method: "POST",
      headers: {
        Accept: "text/html",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Tradebilia read-only marketplace adapter",
        Referer: SIRIUS_AUCTION_RESULTS_URL,
      },
      body: form,
      signal: controller.signal,
    });
    const searchResult = await getHtml(search);
    if (searchResult.error)
      return {
        ...empty,
        messages: [searchResult.error],
        raw: { search: searchResult.html.slice(0, 5000), details: [] },
      };
    const summaries = parseSiriusAuctionResultsHtml(searchResult.html).slice(
      0,
      SIRIUS_MAX_CANDIDATES
    );
    const details: JsonRecord[] = [];
    const rows: JsonRecord[] = [];
    for (const summary of summaries) {
      if (!summary.url) {
        rows.push(normalizeSiriusSale(summary, {}, input));
        continue;
      }
      const response = await fetch(summary.url, {
        headers: {
          Accept: "text/html",
          "User-Agent": "Tradebilia read-only marketplace adapter",
          Referer: SIRIUS_AUCTION_RESULTS_URL,
        },
        signal: controller.signal,
      });
      const result = await getHtml(response);
      if (result.error) {
        rows.push(
          normalizeSiriusSale(summary, { rawText: result.error }, input)
        );
        continue;
      }
      const detail = parseSiriusLotHtml(result.html);
      details.push(detail);
      rows.push(normalizeSiriusSale(summary, detail, input));
    }
    const sales = rows.filter(row => row.completed && row.identityMatched);
    const context = rows.filter(row => !row.completed || !row.identityMatched);
    return {
      ...empty,
      status: "success" as const,
      sales,
      context,
      messages: [
        `Sirius returned ${summaries.length} archived candidates; only explicit closed, dated, final-price, identity/grade-matched detail records can support sandbox valuation.`,
      ],
      raw: {
        search: { status: search.status, resultCount: summaries.length },
        details,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? `Sirius Sports Auctions request timed out after ${SIRIUS_TIMEOUT_MS}ms.`
        : error instanceof Error
          ? error.message
          : "Sirius Sports Auctions request failed.";
    return { ...empty, messages: [message] };
  } finally {
    clearTimeout(timer);
  }
}
