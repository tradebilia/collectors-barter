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
  return Boolean(receipt?.sourceAdmission.verification === 'verified'
    && receipt.sourceAdmission.historicMarketContextEligible === true
    && receipt.sourceAdmission.verifiedSourceDisposition === 'valuation_eligible'
    && receipt.auditRef.verifiedObservationId);
}
