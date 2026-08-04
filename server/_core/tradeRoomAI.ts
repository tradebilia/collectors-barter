/**
 * Trade Room AI Module
 * 
 * Integrates market data with LLM to provide intelligent trade analysis.
 * Evaluates trade fairness, item valuations, and market insights.
 */

import { MarketDataPackage, MarketStatistics } from './marketDataTypes';
import { invokeLLM } from './llm';

/**
 * Trade Analysis Request
 */
export interface TradeAnalysisRequest {
  requestedItem: {
    title: string;
    category: string;
    condition?: string;
    grade?: string;
    estimatedValue?: number;
    marketData?: MarketDataPackage;
  };
  offeredItems: Array<{
    title: string;
    category: string;
    condition?: string;
    grade?: string;
    estimatedValue?: number;
    marketData?: MarketDataPackage;
  }>;
  includeMarketInsights?: boolean;
}

/**
 * Trade Analysis Result
 */
export interface TradeAnalysisResult {
  fairnessScore: number; // 0-100, 50 is perfectly fair
  recommendation: 'steal' | 'fair' | 'pass';
  reasoning: string;
  requestedItemValue: {
    estimated: number;
    marketAverage: number;
    marketRange: { min: number; max: number };
    confidence: 'high' | 'medium' | 'low';
  };
  offeredItemsValue: {
    estimated: number;
    marketAverage: number;
    marketRange: { min: number; max: number };
    confidence: 'high' | 'medium' | 'low';
  };
  valueDifference: number; // Positive means offered items worth more
  valueDifferencePercentage: number;
  marketInsights: string[];
  risks: string[];
  opportunities: string[];
}

/**
 * Analyze a trade proposal using market data and AI
 */
export async function analyzeTradeProposal(
  request: TradeAnalysisRequest
): Promise<TradeAnalysisResult> {
  try {
    // Build market context from available data
    const marketContext = buildMarketContext(request);

    // Create prompt for LLM
    const prompt = buildAnalysisPrompt(request, marketContext);

    // Call LLM for analysis
    const aiResult = await invokeLLM({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Extract text content from LLM response
    const aiResponse = typeof aiResult.choices?.[0]?.message?.content === 'string'
      ? aiResult.choices[0].message.content
      : '';

    // Parse AI response and calculate metrics
    const analysis = parseAIResponse(aiResponse, request, marketContext);

    return analysis;
  } catch (error) {
    console.error('Error analyzing trade proposal:', error);
    throw error;
  }
}

/**
 * Build market context from market data packages
 */
function buildMarketContext(request: TradeAnalysisRequest): string {
  const lines: string[] = [];

  // Requested item market data
  if (request.requestedItem.marketData) {
    const stats = request.requestedItem.marketData.statistics;
    lines.push(`REQUESTED ITEM MARKET DATA:`);
    lines.push(`- Average Price: $${stats.averagePrice}`);
    lines.push(`- Median Price: $${stats.medianPrice}`);
    lines.push(`- Price Range: $${stats.lowestPrice} - $${stats.highestPrice}`);
    lines.push(`- Recent Sales: ${stats.totalSales}`);
    lines.push(`- Data Confidence: ${stats.dataConfidence}`);
    lines.push(`- Data Recency: ${stats.dataRecency}`);
    lines.push('');
  }

  // Offered items market data
  lines.push(`OFFERED ITEMS MARKET DATA:`);
  for (let i = 0; i < request.offeredItems.length; i++) {
    const item = request.offeredItems[i];
    if (item.marketData) {
      const stats = item.marketData.statistics;
      lines.push(`Item ${i + 1}: ${item.title}`);
      lines.push(`- Average Price: $${stats.averagePrice}`);
      lines.push(`- Median Price: $${stats.medianPrice}`);
      lines.push(`- Price Range: $${stats.lowestPrice} - $${stats.highestPrice}`);
      lines.push(`- Recent Sales: ${stats.totalSales}`);
      lines.push(`- Data Confidence: ${stats.dataConfidence}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Build analysis prompt for LLM
 */
function buildAnalysisPrompt(request: TradeAnalysisRequest, marketContext: string): string {
  return `You are an expert collectibles appraiser analyzing a trade proposal between collectors.

REQUESTED ITEM:
Title: ${request.requestedItem.title}
Category: ${request.requestedItem.category}
Condition: ${request.requestedItem.condition || 'Unknown'}
Grade: ${request.requestedItem.grade || 'Ungraded'}
Estimated Value: $${request.requestedItem.estimatedValue || 'Unknown'}

OFFERED ITEMS:
${request.offeredItems
  .map(
    (item, i) => `
Item ${i + 1}:
Title: ${item.title}
Category: ${item.category}
Condition: ${item.condition || 'Unknown'}
Grade: ${item.grade || 'Ungraded'}
Estimated Value: $${item.estimatedValue || 'Unknown'}
`
  )
  .join('\n')}

MARKET DATA:
${marketContext}

Please analyze this trade and provide:
1. A fairness score (0-100, where 50 is perfectly fair)
2. Your recommendation (steal/fair/pass)
3. Clear reasoning for your assessment
4. Key market insights that influenced your analysis
5. Any risks or opportunities the collector should consider

Format your response as JSON with the following structure:
{
  "fairnessScore": <number>,
  "recommendation": "<steal|fair|pass>",
  "reasoning": "<string>",
  "marketInsights": ["<insight1>", "<insight2>", ...],
  "risks": ["<risk1>", "<risk2>", ...],
  "opportunities": ["<opportunity1>", "<opportunity2>", ...]
}`;
}

/**
 * Parse AI response and calculate trade metrics
 */
function parseAIResponse(
  aiResponse: string,
  request: TradeAnalysisRequest,
  marketContext: string
): TradeAnalysisResult {
  try {
    // Extract JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Calculate value metrics
    const requestedItemValue = calculateItemValue(request.requestedItem);
    const offeredItemsValue = calculateItemsValue(request.offeredItems);

    const valueDifference = offeredItemsValue.total - requestedItemValue.estimated;
    const valueDifferencePercentage =
      requestedItemValue.estimated > 0
        ? (valueDifference / requestedItemValue.estimated) * 100
        : 0;

    return {
      fairnessScore: Math.max(0, Math.min(100, parsed.fairnessScore || 50)),
      recommendation: parsed.recommendation || 'fair',
      reasoning: parsed.reasoning || 'Unable to determine',
      requestedItemValue,
      offeredItemsValue: {
        estimated: offeredItemsValue.total,
        marketAverage: offeredItemsValue.marketAverage,
        marketRange: offeredItemsValue.marketRange,
        confidence: offeredItemsValue.confidence,
      },
      valueDifference,
      valueDifferencePercentage,
      marketInsights: parsed.marketInsights || [],
      risks: parsed.risks || [],
      opportunities: parsed.opportunities || [],
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    // Return default analysis
    return getDefaultAnalysis(request);
  }
}

/**
 * Calculate value for a single item
 */
function calculateItemValue(item: any): {
  estimated: number;
  marketAverage: number;
  marketRange: { min: number; max: number };
  confidence: 'high' | 'medium' | 'low';
} {
  const estimated = item.estimatedValue || 0;
  const marketAverage = item.marketData?.statistics?.averagePrice || 0;
  const marketRange = {
    min: item.marketData?.statistics?.lowestPrice || 0,
    max: item.marketData?.statistics?.highestPrice || 0,
  };
  const confidence = item.marketData?.statistics?.dataConfidence || 'low';

  return {
    estimated,
    marketAverage,
    marketRange,
    confidence,
  };
}

/**
 * Calculate total value for multiple items
 */
function calculateItemsValue(items: any[]): {
  total: number;
  marketAverage: number;
  marketRange: { min: number; max: number };
  confidence: 'high' | 'medium' | 'low';
} {
  let total = 0;
  let marketAverage = 0;
  let minPrice = Infinity;
  let maxPrice = 0;
  let confidences: string[] = [];

  for (const item of items) {
    total += item.estimatedValue || 0;
    marketAverage += item.marketData?.statistics?.averagePrice || 0;
    minPrice = Math.min(minPrice, item.marketData?.statistics?.lowestPrice || 0);
    maxPrice = Math.max(maxPrice, item.marketData?.statistics?.highestPrice || 0);
    if (item.marketData?.statistics?.dataConfidence) {
      confidences.push(item.marketData.statistics.dataConfidence);
    }
  }

  // Determine overall confidence
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (confidences.includes('high')) {
    confidence = 'high';
  } else if (confidences.includes('medium')) {
    confidence = 'medium';
  }

  return {
    total,
    marketAverage,
    marketRange: {
      min: minPrice === Infinity ? 0 : minPrice,
      max: maxPrice,
    },
    confidence,
  };
}

/**
 * Get default analysis when AI fails
 */
function getDefaultAnalysis(request: TradeAnalysisRequest): TradeAnalysisResult {
  const requestedValue = calculateItemValue(request.requestedItem);
  const offeredValue = calculateItemsValue(request.offeredItems);

  const valueDifference = offeredValue.total - requestedValue.estimated;
  const valueDifferencePercentage =
    requestedValue.estimated > 0
      ? (valueDifference / requestedValue.estimated) * 100
      : 0;

  let recommendation: 'steal' | 'fair' | 'pass' = 'fair';
  if (valueDifferencePercentage > 10) {
    recommendation = 'steal';
  } else if (valueDifferencePercentage < -10) {
    recommendation = 'pass';
  }

  return {
    fairnessScore: 50 + Math.min(20, Math.max(-20, valueDifferencePercentage / 2)),
    recommendation,
    reasoning: `Based on estimated values, the offered items are worth ${Math.abs(valueDifferencePercentage).toFixed(1)}% ${valueDifference > 0 ? 'more' : 'less'} than the requested item.`,
    requestedItemValue: requestedValue,
    offeredItemsValue: {
      estimated: offeredValue.total,
      marketAverage: offeredValue.marketAverage,
      marketRange: offeredValue.marketRange,
      confidence: offeredValue.confidence,
    },
    valueDifference,
    valueDifferencePercentage,
    marketInsights: [],
    risks: [],
    opportunities: [],
  };
}
