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
      const cert = (input.certificationCompany || details.certificationCompany || details.customGradingCompany || '').replace(/\s*(Comics|Cards|Grading)$/i, '').trim();
      const grade = input.grade ? String(parseFloat(input.grade)) : null;
      let query = input.title;
      if (cert && grade) query = `${input.title} ${cert} ${grade}`;
      else if (grade) query = `${input.title} ${grade}`;

      try {
        const summaries = await fetchEbayListings(query, token, 25);
        const metrics = computeMetrics(summaries);
        return {
          query,
          listings: summaries.slice(0, 20).map((s: any) => ({
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
