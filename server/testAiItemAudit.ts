import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type { NormalizedEvidenceSummary } from '../shared/testAiEvidenceNormalization';
import { isCollectionLotItemType, COLLECTION_LOT_NOT_COMPARABLE_MESSAGE } from '../shared/testAiItemType';
import type { ComparableTarget, MarketSale } from './testAiComparableEngine';
import { normalizeAnalysisMarketSales } from './testAiMarketEvidence';
import { buildAnalysisSnapshot } from './testAiAnalysisSnapshot';

export const itemAuditTargetSchema = z.object({
  title: z.string().min(1).max(600), category: z.string().min(1).max(80),
  itemType: z.string().max(120).optional(), grade: z.string().max(80).optional(),
  condition: z.string().max(240).optional(), certificationCompany: z.string().max(120).nullish(),
  itemDetails: z.string().max(40_000).optional(), estimatedValue: z.number().finite().nonnegative().optional(),
  approvalTargetImageReference: z.string().max(2_000).optional(),
}).strict();

/** No lookup, image/model call, trade comparison, database access or persistence.
 * Normalized objects go straight into the snapshot: copying loses private approval receipts.
 */
export function auditItemValuation(input: {
  item: z.infer<typeof itemAuditTargetSchema>;
  sales: MarketSale[];
  evidenceSummary?: NormalizedEvidenceSummary;
}, options?: { now?: Date; analysisRunId?: string; signingKey?: string }) {
  if (isCollectionLotItemType(input.item.itemType)) throw new TRPCError({ code: 'BAD_REQUEST', message: COLLECTION_LOT_NOT_COMPARABLE_MESSAGE });
  if (input.sales.some(sale => sale.displayCorrelation?.side && sale.displayCorrelation.side !== 'item_a')) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Item A audit cannot accept Item B occurrence receipts.' });
  }
  const now = options?.now ?? new Date();
  const analysisRunId = options?.analysisRunId ?? randomUUID();
  const target: ComparableTarget = { ...input.item, certificationCompany: input.item.certificationCompany ?? undefined, statedTradeValue: input.item.estimatedValue };
  const materialFlags = (input.evidenceSummary?.reviewFlags ?? []).filter(flag => flag.kind === 'material').map(flag => flag.message);
  const sales = normalizeAnalysisMarketSales(input.sales, now, { target, category: target.category, side: 'item_a', analysisRunId, signingKey: options?.signingKey });
  const snapshot = buildAnalysisSnapshot({ target, sales, now, analysisRunId, side: 'item_a',
    evidenceSummary: input.evidenceSummary,
    identityGate: { materialReviewRequired: materialFlags.length > 0, materialFlags,
      sourceAlignmentStatus: materialFlags.length ? 'conflicted' : input.evidenceSummary?.alignedSources.length ? 'aligned' : 'unavailable' },
    historicalPromptSales: [],
  });
  return { side: 'item_a' as const, analysisRunId, snapshot };
}
