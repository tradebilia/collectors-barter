import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "./_core/trpc";
import { requireDb } from "./db";
import { listings, listingPhotos, userProfiles } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";

// ─── Shared eBay helpers (mirrors tradeFlowRouter logic) ────────────────────
async function getEbayAppToken(): Promise<string | null> {
  const clientId = process.env.EBAY_PROD_CLIENT_ID;
  const clientSecret = process.env.EBAY_PROD_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  try {
    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    });
    const data = await res.json() as any;
    return res.ok ? data.access_token : null;
  } catch { return null; }
}

async function fetchEbayListings(query: string, token: string, limit = 25) {
  const res = await fetch(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&limit=${limit}&filter=buyingOptions%3A%7BFIXED_PRICE%7D`,
    { headers: { 'Authorization': `Bearer ${token}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US' } }
  );
  const data = await res.json() as any;
  return data.itemSummaries ?? [];
}

// NOTE: eBay sold/completed history requires the eBay Finding API (separate from Browse API).
// This will be implemented in a future phase when the Finding API is set up.

// Extract grade from query string (e.g., "CGC 9.8" -> 9.8)
// Extract grade from query string — looks for grade AFTER a grading company name
// e.g., "DareDevil #168 CGC 9.8" -> 9.8 (not 168)
function extractGradeFromQuery(query: string): number | null {
  const match = query.match(/(CGC|PSA|BGS|PCGS|NGC|CBCS|SGC|HGA|CSG|ISA|GMA|WATA|VGA|IGS|AFA|CAS|UKG|PSE|ASG|PSAG)\s+[QC]?(\d+\.?\d*)/i);
  return match ? parseFloat(match[2]) : null;
}

// Extract grade from listing title (e.g., "Daredevil #168 CGC 9.8" -> 9.8)
function extractGradeFromTitle(title: string): number | null {
  const match = title.match(/(CGC|PSA|BGS|PCGS|NGC|CBCS|SGC|HGA|CSG|ISA|GMA|WATA|VGA|IGS|AFA|CAS|UKG|PSE|ASG|PSAG)\s+[QC]?(\d+\.?\d*)[\+]?/i);
  return match ? parseFloat(match[2]) : null;
}

// Filter listings to match the grade from the search query
function filterListingsByGrade(summaries: any[], targetGrade: number | null, gradeTolerance: number = 0): any[] {
  if (!targetGrade) return summaries; // If no grade in query, return all

  return summaries.filter((item: any) => {
    const itemGrade = extractGradeFromTitle(item.title);
    // When searching for a specific grade, MUST have both:
    // 1. A recognized grading company in the title (CGC, PSA, WATA, etc.)
    // 2. A grade that matches the target
    if (!itemGrade) return false;

    if (gradeTolerance > 0) {
      return Math.abs(itemGrade - targetGrade) <= gradeTolerance;
    }
    // Round to 1 decimal to avoid float precision issues (9.8 === 9.8)
    return Math.round(itemGrade * 10) === Math.round(targetGrade * 10);
  });
}

// Filter listings by year — for vintage toys where year is critical to value
function filterListingsByYear(summaries: any[], targetYear: string | null): any[] {
  if (!targetYear) return summaries;
  return summaries.filter((item: any) => {
    return item.title.includes(targetYear);
  });
}

// For graded stamps: exclude listings with condition abbreviations in the title
// (F-VF, VF, Fine, Used, etc. indicate ungraded stamps)
const STAMP_UNGRADED_PATTERNS = /\b(F-VF|VF|XF|VF-XF|F|VG|G|AG|FVF|XFSUP|Fine|Very Fine|Extremely Fine|Used|Unused|CTO|NH|OG|HR|NG|Hinged|Never Hinged)\b/i;
function filterStampGradeStatus(summaries: any[], isGraded: boolean): any[] {
  return summaries.filter((item: any) => {
    const hasGradingCompany = /(ASG|PSAG|PSE)\s+\d+/i.test(item.title);
    if (isGraded) {
      // Graded item: only keep listings that have a recognized grading company in the title
      return hasGradingCompany;
    } else {
      // Ungraded item: exclude listings that have a grading company in the title
      return !hasGradingCompany;
    }
  });
}

// Extract issue number from a listing title (e.g., "Daredevil #168 CGC 9.8" -> "168")
function extractIssueFromTitle(title: string): string | null {
  // Match #168, #168N (newsstand), #168A (variant), etc. — capture just the numeric part
  // Comics reliably use # prefix; sports cards do not, so this is comics-only
  const match = title.match(/#(\d+)/);
  return match ? match[1] : null;
}

// Filter listings to match the expected issue number (comics) or card number (sports cards)
function filterListingsByNumber(summaries: any[], targetNumber: string | null): any[] {
  if (!targetNumber) return summaries;
  return summaries.filter((item: any) => {
    const itemNumber = extractIssueFromTitle(item.title);
    if (!itemNumber) return false;
    return itemNumber === targetNumber;
  });
}

function computeMetrics(summaries: any[]) {
  const prices = summaries
    .map((i: any) => parseFloat(i.price?.value || '0'))
    .filter((p: number) => p > 0)
    .sort((a: number, b: number) => a - b);
  if (!prices.length) return null;
  // IQR outlier removal
  const q1 = prices[Math.floor(prices.length * 0.25)];
  const q3 = prices[Math.floor(prices.length * 0.75)];
  const iqr = q3 - q1;
  const filtered = prices.filter((p: number) => p >= q1 - 1.5 * iqr && p <= q3 + 1.5 * iqr);
  const final = filtered.length >= 3 ? filtered : prices;
  const count = final.length;
  const avg = Math.round(final.reduce((a: number, b: number) => a + b, 0) / count);
  const mid = Math.floor(count / 2);
  const median = count % 2 !== 0 ? final[mid] : Math.round((final[mid - 1] + final[mid]) / 2);
  const min = Math.round(final[0]);
  const max = Math.round(final[count - 1]);
  const spreadPct = avg > 0 ? Math.round(((max - min) / avg) * 100) : 0;
  const confidence: 'high' | 'medium' | 'low' = count >= 7 && spreadPct < 80 ? 'high' : count >= 4 ? 'medium' : 'low';
  return { avg, median, min, max, spreadPct, count, confidence };
}

// ─── Router ─────────────────────────────────────────────────────────────────
export const testAIRouter = router({
  // Get the logged-in user's active inventory for the item picker
  getMyInventory: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
    const db = await requireDb();
    const [rows] = await db.execute(
      sql`
        SELECT
          l.id, l.title, l.category, l.condition, l.grade, l.certificationCompany,
          l.estimatedValue, l.itemDetails, l.description,
          (SELECT lp.imageUrl FROM listingPhotos lp WHERE lp.listingId = l.id ORDER BY lp.sortOrder ASC LIMIT 1) as primaryPhotoUrl
        FROM listings l
        WHERE l.ownerId = ${ctx.user.id} AND l.status = 'active' AND l.isActive = 1
        ORDER BY l.createdAt DESC
        LIMIT 100
      `
    ) as any;
    const arr = Array.isArray(rows) ? rows : [];
    return arr.map((r: any) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      condition: r.condition,
      grade: r.grade ?? null,
      certificationCompany: r.certificationCompany ?? null,
      estimatedValue: r.estimatedValue ? Number(r.estimatedValue) : null,
      itemDetails: r.itemDetails ?? null,
      description: r.description ?? null,
      primaryPhotoUrl: r.primaryPhotoUrl ?? null,
    }));
  }),

  // Fetch eBay active listings + computed metrics for a single item
  getEbayData: protectedProcedure
    .input(z.object({
      title: z.string(),
      category: z.string(),
      grade: z.string().optional(),
      condition: z.string().optional(),
      certificationCompany: z.string().optional(),
      itemDetails: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const token = await getEbayAppToken();
      if (!token) return { query: input.title, listings: [], metrics: null, error: 'eBay credentials not configured' };

      // Build a smart query from item details
      const details = input.itemDetails ? (() => { try { return JSON.parse(input.itemDetails); } catch { return {}; } })() : {};
      // If grading company is "Other", use the custom grading company from itemDetails
      let cert = input.certificationCompany || details.certificationCompany || '';
      if (cert === 'Other' || !cert) {
        cert = details.customGradingCompany || cert;
      }
      cert = cert.replace(/\s*(Comics|Cards|Grading)$/i, '').trim();
      const grade = input.grade ? String(parseFloat(input.grade)) : null;
      
      let query = input.title;
      
      // For comics: use comicTitle + issueNumber + grading/condition
      if (input.category === 'comics') {
        const comicTitle = details.comicTitle || input.title;
        const issueNumber = details.issueNumber || '';
        const issueStr = issueNumber ? ` #${issueNumber}` : '';
        
        if (cert && grade) {
          query = `${comicTitle}${issueStr} ${cert} ${grade}`;
        } else if (grade) {
          query = `${comicTitle}${issueStr} ${grade}`;
        } else if (input.condition) {
          query = `${comicTitle}${issueStr} ${input.condition}`;
        } else {
          query = `${comicTitle}${issueStr}`;
        }
      }
      // For sports cards: use year + manufacturer + player + card number + grading/condition
      else if (input.category === 'sports_cards') {
        const year = details.year || '';
        // If manufacturer is "Other", use the custom manufacturer field
        let manufacturer = details.manufacturer || '';
        if (manufacturer === 'Other' || !manufacturer) {
          manufacturer = details.customManufacturer || manufacturer;
        }
        const player = details.player || '';
        const cardNumber = details.cardNumber || '';
        
        const parts = [year, manufacturer, player, cardNumber].filter((p: string) => p);
        const baseQuery = parts.join(' ');
        
        if (cert && grade) {
          query = `${baseQuery} ${cert} ${grade}`.trim();
        } else if (grade) {
          query = `${baseQuery} ${grade}`.trim();
        } else if (input.condition) {
          query = `${baseQuery} ${input.condition}`.trim();
        } else {
          query = baseQuery || input.title;
        }
      }
      // For other categories: use title + grading/condition
      // For video games: use gameTitle + platform + grading/condition
      else if (input.category === 'video_games') {
        const gameTitle = details.gameTitle || input.title;
        const platform = details.platform || '';
        const parts = [gameTitle, platform].filter((p: string) => p);
        const baseQuery = parts.join(' ');
        // cert already has custom grading company extracted if it was "Other"
        if (cert && grade) {
          query = `${baseQuery} ${cert} ${grade}`.trim();
        } else if (grade) {
          query = `${baseQuery} ${grade}`.trim();
        } else if (input.condition) {
          query = `${baseQuery} ${input.condition}`.trim();
        } else {
          query = baseQuery || input.title;
        }
      }
      // For other categories: use title + grading/condition
      // For vintage toys: year (if available) + toyName + brand/franchise + grading/condition
      else if (input.category === 'vintage_toys') {
        const year = details.year || '';
        const toyName = details.toyName || input.title;
        const brand = details.brand || '';
        const franchise = details.franchise || '';
        const parts = [year, toyName, brand || franchise].filter((p: string) => p);
        const baseQuery = parts.join(' ');
        if (cert && grade) {
          query = `${baseQuery} ${cert} ${grade}`.trim();
        } else if (grade) {
          query = `${baseQuery} ${grade}`.trim();
        } else if (input.condition) {
          query = `${baseQuery} ${input.condition}`.trim();
        } else {
          query = baseQuery || input.title;
        }
      }
      // For other categories: use title + grading/condition
      // For disney pins: Disney pin + pinName + character + series + LE (if limited edition)
      else if (input.category === 'disney_pins') {
        const pinName = details.pinName || input.title;
        const character = details.character || '';
        const parts = ['Disney Pins', character, pinName].filter((p: string) => p);
        query = parts.join(' ').trim();
      }
      // For other categories: use title + grading/condition
      else {
        if (cert && grade) query = `${input.title} ${cert} ${grade}`;
        else if (grade) query = `${input.title} ${grade}`;
      }

      try {
        // Build a broader query for eBay fetch (without grade) to get more results,
        // then filter by grade internally for accuracy
        const targetGrade = extractGradeFromQuery(query);
        const broadQuery = query.replace(/(CGC|PSA|BGS|PCGS|NGC|CBCS|SGC|HGA|CSG|ISA|GMA|WATA|VGA|IGS|AFA|CAS|UKG|PSE|ASG|PSAG)\s+[QC]?\d+\.?\d*\+?/gi, '$1').trim();
        const fetchQuery = broadQuery !== query ? broadQuery : query;
        const summaries = await fetchEbayListings(fetchQuery, token, 100);
        console.log(`[eBay Search] Fetch Query: "${fetchQuery}", Filter Grade: ${targetGrade}, Total Results: ${summaries.length}`);
        // For comics: also filter by issue number
        const issueNumber = input.category === 'comics' ? (details.issueNumber || null) : null;
        // Note: card number filter is NOT applied for sports cards because eBay titles
        // don't use # prefix for card numbers, making reliable matching impossible.
        // Year + manufacturer + player already uniquely identify the card.
        const targetNumber = issueNumber;
        const byNumber = filterListingsByNumber(summaries, targetNumber);
        console.log(`[eBay Search] After number filter: ${byNumber.length} results (target: ${targetNumber})`);
        // For vintage toys: also filter by year (critical to value — 1984 ≠ 2007)
        const targetYear = input.category === 'vintage_toys' ? (details.year || null) : null;
        const byYear = filterListingsByYear(byNumber, targetYear);
        // Stamps use ±5 tolerance (PSE/ASG grades are 1-100 scale); all others use exact match
        const gradeTolerance = input.category === 'stamps' ? 5 : 0;
        const byGrade = filterListingsByGrade(byYear, targetGrade, gradeTolerance);
        // For graded stamps: exclude ungraded listings (those with condition abbreviations instead of grading company)
        const isGradedStamp = input.category === 'stamps' && !!cert;
        const filteredSummaries = input.category === 'stamps'
          ? filterStampGradeStatus(byGrade, isGradedStamp)
          : byGrade;
        console.log(`[eBay Search] After grade filter: ${filteredSummaries.length} results (target grade: ${targetGrade})`);
        // Log first 5 filtered results for debugging
        filteredSummaries.slice(0, 5).forEach((s: any, i: number) => {
          console.log(`  [${i}] ${s.title} - Grade: ${extractGradeFromTitle(s.title)}`);
        });
        const metrics = computeMetrics(filteredSummaries);
        return {
          query,
          debug: {
            totalFetched: summaries.length,
            afterNumberFilter: byNumber.length,
            afterGradeFilter: filteredSummaries.length,
            targetGrade,
          },
          listings: filteredSummaries.slice(0, 20).map((s: any) => ({
            title: s.title,
            price: parseFloat(s.price?.value || '0'),
            currency: s.price?.currency || 'USD',
            condition: s.condition,
            seller: s.seller?.username,
            itemUrl: s.itemWebUrl,
            imageUrl: s.image?.imageUrl,
            listingType: s.buyingOptions?.[0],
          })),
          metrics,
          error: null,
        };
      } catch (err: any) {
        return { query, listings: [], metrics: null, error: err.message };
      }
    }),

  // Placeholder: population report lookup by cert ID + grading company
  // Will be replaced by real scraper when built
  getPopulationReport: protectedProcedure
    .input(z.object({
      certId: z.string(),
      gradingCompany: z.enum(['CGC', 'PSA', 'BGS', 'PCGS', 'NGC', 'CBCS', 'SGC', 'HGA', 'CSG', 'Other']),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      // PLACEHOLDER — scraper will populate this
      return {
        certId: input.certId,
        gradingCompany: input.gradingCompany,
        status: 'placeholder',
        message: `Population report scraper for ${input.gradingCompany} not yet built. Cert ID: ${input.certId}`,
        data: null,
      };
    }),

  // Run AI trade analysis between two items
  analyzeItems: protectedProcedure
    .input(z.object({
      leftItem: z.object({
        title: z.string(),
        category: z.string(),
        grade: z.string().optional(),
        condition: z.string().optional(),
        estimatedValue: z.number().optional(),
        certificationCompany: z.string().optional(),
        itemDetails: z.string().optional(),
      }),
      rightItem: z.object({
        title: z.string(),
        category: z.string(),
        grade: z.string().optional(),
        condition: z.string().optional(),
        estimatedValue: z.number().optional(),
        certificationCompany: z.string().optional(),
        itemDetails: z.string().optional(),
      }),
      leftEbayMetrics: z.any().optional(),
      rightEbayMetrics: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });

      const { leftItem, rightItem, leftEbayMetrics, rightEbayMetrics } = input;

      const formatItemLine = (item: typeof leftItem, metrics: any) => {
        let line = `- ${item.title}`;
        if (item.category) line += ` (${item.category.replace(/_/g, ' ')})`;
        if (item.grade) line += ` | Grade: ${item.grade}`;
        if (item.condition) line += ` | Condition: ${item.condition}`;
        if (item.certificationCompany) line += ` | Graded by: ${item.certificationCompany}`;
        if (item.estimatedValue) line += ` | Owner Estimated Value: $${item.estimatedValue.toLocaleString()} [UNVERIFIED]`;
        if (metrics) {
          line += ` | eBay Active Listings (${metrics.count} results, confidence: ${metrics.confidence}):`;
          line += ` Avg=$${metrics.avg} Median=$${metrics.median} Range=$${metrics.min}-$${metrics.max} Spread=${metrics.spreadPct}%`;
        } else {
          line += ` | eBay Data: UNAVAILABLE`;
        }
        return line;
      };

      const leftLine = formatItemLine(leftItem, leftEbayMetrics);
      const rightLine = formatItemLine(rightItem, rightEbayMetrics);

      const leftVal = leftEbayMetrics?.median ?? leftItem.estimatedValue ?? 0;
      const rightVal = rightEbayMetrics?.median ?? rightItem.estimatedValue ?? 0;
      const diff = rightVal - leftVal;
      const diffStr = diff > 0
        ? `+$${Math.abs(diff).toLocaleString()} — RIGHT ITEM is worth more`
        : diff < 0
        ? `-$${Math.abs(diff).toLocaleString()} — LEFT ITEM is worth more`
        : `$0 — roughly equal`;

      const prompt = `You are a professional collectibles trade analyst. Compare these two items and provide a detailed analysis.

=== ITEM A (LEFT) ===
${leftLine}

=== ITEM B (RIGHT) ===
${rightLine}

=== PRE-COMPUTED VALUE GAP ===
${diffStr}

=== INSTRUCTIONS ===
Respond with ONLY this JSON object:
{
  "verdict": <"Item A Worth More" | "Item B Worth More" | "Roughly Equal">,
  "valueSummary": <2-3 sentences comparing the two items' market values using eBay data where available>,
  "itemAInsights": <3-5 sentences about Item A: market position, grade significance, collector demand, any overvaluation/undervaluation vs eBay>,
  "itemBInsights": <3-5 sentences about Item B: same format>,
  "itemAFuturePotential": <"Bear: $X-Y | Base: $X-Y | Bull: $X-Y | Catalyst: [driver] | Rating: X/10">,
  "itemBFuturePotential": <same format as itemAFuturePotential>,
  "itemAStrengths": <array of 2-4 strength strings ranked by relevance>,
  "itemARisks": <array of 1-3 risk strings ranked by severity>,
  "itemBStrengths": <array of 2-4 strength strings ranked by relevance>,
  "itemBRisks": <array of 1-3 risk strings ranked by severity>,
  "tradeFairness": <"Fair trade" | "Slight advantage to A" | "Slight advantage to B" | "Strong advantage to A" | "Strong advantage to B">,
  "negotiationTip": <1 specific actionable tip with dollar amounts>,
  "dataQuality": <"High — eBay data available for both" | "Medium — eBay data for one item" | "Low — no eBay data, using estimates only">
}`;

      const llmResult = await invokeLLM({
        messages: [
          { role: 'system', content: 'You are a collectibles trade analyst. Always respond with valid JSON only. No markdown, no code blocks, no explanation — just the raw JSON object.' },
          { role: 'user', content: prompt },
        ],
        maxTokens: 3000,
      });

      const content = llmResult.choices[0]?.message?.content;
      if (!content) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI analysis failed' });

      const rawContent = typeof content === 'string' ? content : JSON.stringify(content);
      const cleanContent = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

      try {
        return JSON.parse(cleanContent);
      } catch {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI returned invalid JSON. Please try again.' });
      }
    }),
});
