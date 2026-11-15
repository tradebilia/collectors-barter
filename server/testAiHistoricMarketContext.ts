import type { MarketSale } from './testAiComparableEngine';
import { readServerNormalizationReport } from '../shared/testAiValuationUse';

/**
 * Historical classification is not inbound authority. The normalizer separately
 * verifies signed completed-sale facts, price, currency, transaction identity,
 * date and required image approval before writing its immutable private receipt.
 * Identity matching and duplicate exclusion still run in the comparable engine.
 */
export function hasVerifiedHistoricSaleEconomics(sale: MarketSale): boolean {
  const receipt = readServerNormalizationReport(sale);
  const disposition = receipt?.sourceAdmission.verifiedSourceDisposition;
  return Boolean(receipt?.sourceAdmission.verification === 'verified'
    && receipt.sourceAdmission.historicMarketContextEligible === true
    // A valid old sale may arrive with a source-stage context label because it
    // is outside the current valuation window. That label changes destination,
    // not authenticity. The private receipt and historic eligibility flag are
    // still mandatory; objective conflicts and cap omissions remain excluded.
    && ['valuation_eligible', 'context_only', 'warning_review', 'not_visually_reviewed_window'].includes(String(disposition))
    && receipt.auditRef.verifiedObservationId);
}
