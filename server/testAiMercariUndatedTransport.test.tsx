import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildMercariAnalysisSales, hasMercariUndatedSoldAdmission, mercariPriceContextLabel, mercariTransportStatus, type MercariTransportListing } from '../shared/testAiMercariTransport';
import { captureMercariObservation } from '../shared/testAiMercariObservation';
import { TestAiCandidateMasterList } from '../client/src/components/TestAiCandidateMasterList';
import { TestAiCandidateDisplayProvider } from '../client/src/components/TestAiCandidateStatus';
import { candidateFinalDecision } from '../client/src/components/test-ai/candidateFinalDecision';
import { stampCandidateDisplayIntake, type CandidateDisplayRow, type CandidateFinalDisplayOutcome } from '../shared/testAiCandidateLedger';
import type { VisualExecution } from '../shared/testAiVisualExecution';

const receipt = (patch: Partial<VisualExecution> = {}): VisualExecution => ({
  version: 1, state: 'completed', reasonCode: 'review_returned', hardExclusion: false, selectedForReview: true,
  identity: { origin: 'visual', result: 'match', reviewVerdict: 'match' },
  attempts: [{ ordinal: 1, stage: 'initial', format: 'json_schema', outcome: 'usable_review' }], ...patch,
});
const raw = { title: 'Synthetic Mercari game', itemId: 'synthetic-mercari-1', price: 125, currency: 'USD', sold: true, status: 'active' };
// This is an intentionally non-authentic shape fixture, not a minted signature.
// Transport/UI do not verify signatures; server/core suites own verification.
function qualified(patch: MercariTransportListing = {}): MercariTransportListing {
  return {
    ...raw, saleId: raw.itemId, sourceRecordId: raw.itemId, url: 'https://example.test/mercari/1',
    sourceId: 'mercari_sold_comps', sourceAdapter: 'mercari_sold_comps', originMarketplace: 'mercari',
    requestedMode: 'sold', saleStatus: 'completed', priceBasis: 'sold',
    completedStatusBasis: 'Sold-Comps Mercari sold=true reported sold price',
    date: null, endedAt: null, recency: 'undated', saleDatePolicy: 'mercari_undated_sold_v1',
    visualRequirement: 'required', visualReviewStatus: 'match', visualExecution: receipt(),
    evidenceDisposition: 'valuation_eligible', evidenceReasons: ['Image identity confirmed; Mercari date exception'],
    provenanceToken: 'SYNTHETIC-TRANSPORT-ONLY.NOT-A-SIGNATURE',
    provenance: { adapterId: 'mercari_sold_comps', originMarketplace: 'mercari', payloadHash: 'synthetic-observation', canonicalTransactionId: 'synthetic-mercari-1' },
    identityApproval: { version: 'identity-approval-v1', status: 'approved', origin: 'server_final_visual', verdict: 'match', adapterId: 'mercari_sold_comps', originMarketplace: 'mercari', sourceRecordId: raw.itemId },
    observationId: 'synthetic-observation', canonicalTransactionId: 'synthetic-mercari-1',
    buyerPremium: 'excluded', shipping: 'unknown', tax: 'unknown', saleForm: 'single_item', lotQuantity: 1,
    metadataOriginOccurrenceKey: 'mercari_sold_comps:synthetic-run:occ:0', metadataMatchRank: 1, metadataMatchScore: 99,
    mercariObservation: captureMercariObservation(raw, 'sold'), ...patch,
  };
}
function cards(rows: CandidateDisplayRow[], side: 'item_a' | 'item_b' = 'item_a', outcome?: CandidateFinalDisplayOutcome) {
  return renderToStaticMarkup(createElement(TestAiCandidateDisplayProvider, { side, outcome,
    children: createElement(TestAiCandidateMasterList, { listings: rows, sourceLabel: 'Mercari sold comps' }),
  }));
}
function finalOutcome(submitted: CandidateDisplayRow[], code: string, side: 'item_a' | 'item_b' = 'item_a'): CandidateFinalDisplayOutcome {
  return { side, requestRunId: 'synthetic-request', analysisRunId: 'synthetic-server', submitted,
    finalRows: submitted.map((row, intakeOrdinal) => ({ valuationUse: {
      version: 'stage5-final-use-v1', sourceAdmission: { verification: 'verified' },
      auditRef: { side, analysisRunId: 'synthetic-server', intakeOrdinal, displayCorrelation: { ...row.displayCorrelation },
        verifiedObservationId: row.observationId, sourceCorrelation: { metadataOriginOccurrenceKey: row.metadataOriginOccurrenceKey } },
      identityAdmission: { accepted: true, serverFinalApprovalVerified: true },
      use: { code, primaryMarketSales: code === 'CURRENT_SALES_PRIMARY', reasonCodes: ['SYNTHETIC_FINAL_REASON'] },
    } })),
  };
}

describe('Mercari undated sold receipt transport (no authority minted)', () => {
  it.each(['item_a', 'item_b'] as const)('preserves the issued shape for enabled %s and returns no disabled handoff', () => {
    const sale = qualified(); const input = { listings: [sale], requestedMode: 'sold' };
    const transported = buildMercariAnalysisSales(input, true);
    expect(transported).toHaveLength(1);
    for (const key of ['price', 'currency', 'sourceId', 'sourceAdapter', 'originMarketplace', 'saleStatus', 'priceBasis', 'completedStatusBasis', 'date', 'endedAt', 'recency', 'saleDatePolicy', 'visualRequirement', 'visualReviewStatus', 'saleForm', 'lotQuantity', 'buyerPremium', 'shipping', 'tax', 'observationId', 'canonicalTransactionId']) {
      expect(transported[0][key]).toBe(sale[key]);
    }
    expect(transported[0].provenanceToken).toBe(sale.provenanceToken);
    expect(transported[0].provenance).toBe(sale.provenance);
    expect(transported[0].identityApproval).toBe(sale.identityApproval);
    expect(transported[0].mercariObservation).toBe(sale.mercariObservation);
    expect(transported[0].listingStatus).toBe('sold');
    expect(transported[0].date).toBeNull(); expect(transported[0].endedAt).toBeNull();
    expect(transported[0].recency).toBe('undated');
    expect(transported[0].serverFinalApprovalVerified).toBe(false);
    expect(transported[0].valuationUse).toBeNull();
    expect(buildMercariAnalysisSales(input, false)).toEqual([]);
    expect(buildMercariAnalysisSales({ listings: transported }, true)[0].identityApproval).toBe(sale.identityApproval);
  });

  it('never fills the undated sale from retrieval timestamps or favorable sale-date aliases', () => {
    const sale = qualified({ scrapedAt: '2026-11-10T12:00:00Z', saleDate: '2026-11-10', soldAt: '2026-11-10', completedAt: '2026-11-10' });
    const row = buildMercariAnalysisSales({ listings: [sale] }, true)[0];
    expect(row.scrapedAt).toBe(sale.scrapedAt); // diagnostic, not recency authority
    expect(row.saleDate).toBeNull(); expect(row.soldAt).toBeNull(); expect(row.completedAt).toBeNull();
    expect(row.date).toBeNull(); expect(row.endedAt).toBeNull(); expect(row.recency).toBe('undated');
    expect(row.provenanceToken).toBe(sale.provenanceToken); expect(row.identityApproval).toBe(sale.identityApproval);
  });

  it('cannot create a receipt or approval from provider sold and browser success flags', () => {
    const forged = { ...raw, requestedMode: 'sold', visualReviewStatus: 'match', verified: true, approved: true,
      trusted: true, serverFinalApprovalVerified: true, evidenceDisposition: 'valuation_eligible',
      mercariObservation: captureMercariObservation(raw, 'sold') };
    const row = buildMercariAnalysisSales({ listings: [forged] }, true)[0];
    expect(row.provenanceToken).toBeNull(); expect(row.provenance).toBeNull(); expect(row.identityApproval).toBeNull();
    expect(row.saleDatePolicy).toBeNull(); expect(row.serverFinalApprovalVerified).toBe(false); expect(row.approved).toBe(false);
    expect(row.evidenceDisposition).toBe('context_only'); expect(row.saleStatus).toBe('unknown');
  });

  it('maps only the operational subset without refill, union, reordering, filtering or its own cap', () => {
    const first = qualified(); const held = qualified({ saleId: 'held', evidenceDisposition: 'rejected_objective_conflict' });
    const second = qualified({ saleId: 'second', metadataMatchRank: 2 });
    const result = buildMercariAnalysisSales({ listings: [second, held, first], audit: { ledger: [qualified({ saleId: 'audit-only' })] }, returnedPopulations: { soldListings: [qualified({ saleId: 'partition-only' })] } } as any, true);
    expect(result.map(row => row.saleId)).toEqual(['second', 'held', raw.itemId]);
    expect(result[1].evidenceDisposition).toBe('rejected_objective_conflict');
    expect(result[1].provenanceToken).toBeNull();
    expect(buildMercariAnalysisSales({ listings: Array.from({ length: 125 }, (_, index) => qualified({ saleId: `row-${index}` })) }, true)).toHaveLength(125);
  });

  it.each(['provenanceToken', 'provenance', 'identityApproval', 'saleDatePolicy'] as const)('does not retrofit a legacy row missing %s, despite favorable flags', (missing) => {
    const sale = qualified({ verified: true, trusted: true, approved: true, serverFinalApprovalVerified: true });
    delete sale[missing];
    const row = buildMercariAnalysisSales({ listings: [sale] }, true)[0];
    expect(hasMercariUndatedSoldAdmission(row)).toBe(false);
    expect(row.provenanceToken).toBeNull(); expect(row.provenance).toBeNull(); expect(row.identityApproval).toBeNull();
    expect(row.saleDatePolicy).toBeNull(); expect(row.sourceAdapter).toBeNull();
    expect(row.saleStatus).toBe('unknown'); expect(row.priceBasis).toBe('unknown');
    expect(row.evidenceDisposition).toBe('context_only'); expect(row.serverFinalApprovalVerified).toBe(false);
    expect(row.date).toBeNull(); expect(row.endedAt).toBeNull(); expect(row.recency).toBe('undated');
  });

  it.each([{ price: 0 }, { price: -1 }, { price: '125' }, { currency: null }, { currency: 'CAD' }, { date: '2026-11-10' }, { visualReviewStatus: 'rough_match' }])('keeps an unqualified economic/identity shape fail-closed: %j', patch => {
    const row = buildMercariAnalysisSales({ listings: [qualified(patch)] }, true)[0];
    expect(hasMercariUndatedSoldAdmission(row)).toBe(false); expect(row.identityApproval).toBeNull(); expect(row.provenanceToken).toBeNull();
    expect(row.evidenceDisposition).toBe('context_only'); expect(row.date).toBeNull();
  });

  it('honors sold=true over contradictory provider status as diagnostics, never as an actual active request', () => {
    const sold = qualified();
    expect(mercariTransportStatus(sold)).toBe('sold');
    expect(mercariPriceContextLabel(sold)).toBe('Reported sold price · Sale date: Unknown · Mercari date exception');
    expect(mercariPriceContextLabel(qualified({ provenanceToken: null }))).not.toContain('Active asking-price');
    for (const input of [
      { listings: [sold], requestedMode: 'active' },
      { listings: [qualified({ requestedMode: 'active' })] },
      { listings: [qualified({ mercariObservation: captureMercariObservation(raw, 'active') })] },
    ]) {
      const row = buildMercariAnalysisSales(input, true)[0];
      expect(row.saleStatus).toBe('active'); expect(row.identityApproval).toBeNull(); expect(row.provenanceToken).toBeNull();
      expect(row.saleDatePolicy).toBeNull(); expect(row.evidenceDisposition).toBe('context_only');
      expect(mercariPriceContextLabel(row)).toBe('Active asking-price context');
      expect(candidateFinalDecision(row).reason).toContain('Active asking-price context only');
    }
  });
});

describe('Mercari candidate decision UI (real ReactDOM components)', () => {
  it.each(['item_a', 'item_b'] as const)('shows eligible %s before analysis as NOT RUN with image-confirmed/date-exception reason', side => {
    const html = cards(buildMercariAnalysisSales({ listings: [qualified()] }, true), side);
    expect(html).toContain('VALUATION NOT RUN'); expect(html).toContain('Image-confirmed');
    expect(html).toContain('Mercari date exception'); expect(html).toContain('Sale date: Unknown'); expect(html).toContain('USD 125');
    expect(html).not.toContain('final transaction amount and sale-event date are unverified');
    expect(html).not.toContain('USED IN VALUATION'); expect(html).not.toContain('Active asking-price context only');
  });

  it.each(['item_a', 'item_b'] as const)('uses actual reconciled final-use code for %s, not eligibility', side => {
    const submitted = stampCandidateDisplayIntake(buildMercariAnalysisSales({ listings: [qualified()] }, true), side, 'synthetic-request');
    const used = cards(submitted, side, finalOutcome(submitted, 'CURRENT_SALES_PRIMARY', side));
    expect(used).toContain('USED IN VALUATION'); expect(used).toContain('Used to support primary sales valuation');
    expect(used).toContain('Sale date: Unknown'); expect(used).toContain('SYNTHETIC_FINAL_REASON'); expect(used).not.toContain('VALUATION NOT RUN');
    const notUsed = cards(submitted, side, finalOutcome(submitted, 'OUTLIER_EXCLUDED', side));
    expect(notUsed).toContain('NOT USED — OUTLIER'); expect(notUsed).not.toContain('USED IN VALUATION'); expect(notUsed).toContain('SYNTHETIC_FINAL_REASON');
  });

  it('leaves legacy context, provider failure, rough match and hard exclusion reasons intact', () => {
    const legacy = cards(buildMercariAnalysisSales({ listings: [qualified({ provenanceToken: null })] }, true));
    expect(legacy).toContain('VALUATION NOT RUN'); expect(legacy).toContain('No server-issued date-exception approval is attached');
    expect(legacy).not.toContain('final transaction amount and sale-event date are unverified');
    const failed = cards([qualified({ visualExecution: receipt({ state: 'dispatched_inconclusive', reasonCode: 'provider_error',
      identity: { origin: 'none', result: 'not_established' }, attempts: [{ ordinal: 1, stage: 'initial', format: 'json_schema', outcome: 'error', failureCode: 'provider_request_failed' }] }) })]);
    expect(failed).toContain('NOT USED — REVIEW UNRESOLVED'); expect(failed).toContain('Provider request failed'); expect(failed).not.toContain('Image-confirmed');
    const rough = cards([qualified({ visualExecution: receipt({ identity: { origin: 'visual', result: 'manual_unknown', reviewVerdict: 'rough_match' } }) })]);
    expect(rough).toContain('NOT USED — REVIEW UNRESOLVED'); expect(rough).toContain('Rough / unconfirmed match'); expect(rough).not.toContain('Image-confirmed');
    const hard = cards([qualified({ evidenceDisposition: 'rejected_objective_conflict', evidenceReasons: ['Wrong platform'],
      visualExecution: receipt({ hardExclusion: true, state: 'not_dispatched', attempts: [] }) })]);
    expect(hard).toContain('NOT USED — HARD EXCLUSION'); expect(hard).toContain('Wrong platform'); expect(hard).not.toContain('USED IN VALUATION');
  });

  it('keeps every retained occurrence visible without manufacturing final use', () => {
    const rows = [qualified(), qualified({ metadataOriginOccurrenceKey: 'mercari_sold_comps:synthetic-run:occ:1', provenanceToken: null }),
      qualified({ metadataOriginOccurrenceKey: 'mercari_sold_comps:synthetic-run:occ:2', evidenceDisposition: 'rejected_objective_conflict', evidenceReasons: ['Wrong platform'] })];
    const html = cards(buildMercariAnalysisSales({ listings: rows }, true));
    expect((html.match(/data-candidate-card="true"/g) ?? []).length).toBe(3); expect(html).not.toContain('USED IN VALUATION');
  });
});

describe('Mercari page integration source assertions (no routes invoked)', () => {
  const page = fs.readFileSync(path.resolve(import.meta.dirname, '../client/src/pages/TestAI.tsx'), 'utf8');
  it('removes unconditional empty acceptance and retains policy eligibility and undated semantics', () => {
    expect(page).not.toContain('const acceptedListings = isMercari ? []');
    expect(page).toContain("const acceptedListings = rankedListings.filter");
    expect(page).toContain('hasMercariUndatedSoldAdmission(listing, data?.requestedMode)');
    expect(page).toContain("'date-exception value eligible'");
    expect(page).toContain('Sale date: Unknown'); expect(page).not.toContain('No Mercari record affects valuation.');
  });
  it('submits only the existing mapped operational A/B subset and preserves the existing outer cap', () => {
    expect(page).toContain('buildMercariAnalysisSales(leftMercariSoldCompsData, leftHasMercari),');
    expect(page).toContain('buildMercariAnalysisSales(rightMercariSoldCompsData, rightHasMercari),');
    expect(page).toContain("const leftHasMercari = leftSources.has('mercari_sold_comps');");
    expect(page).toContain("const rightHasMercari = rightSources.has('mercari_sold_comps');");
    expect(page).toContain("stampCandidateDisplayIntake(leftSales, 'item_a', requestRunId)");
    expect(page).toContain("stampCandidateDisplayIntake(rightSales, 'item_b', requestRunId)");
    expect(page).toContain('leftHistoricalTrendSales: leftSubmitted'); expect(page).toContain('rightHistoricalTrendSales: rightSubmitted');
    expect(page).toContain('balanced.length < 120');
  });
  it('binds both existing Mercari lookups to the effective target and invalidates old cache semantics', () => {
    for (const side of ['left', 'right']) {
      const start = page.indexOf(`const ${side}MercariSoldCompsQuery =`);
      const input = page.slice(start, page.indexOf('\n  );', start));
      expect(input).toContain('buildSoldCompsApprovalInput(');
      expect(input).toContain(`effective${side === 'left' ? 'Left' : 'Right'}Item ?? ${side}SearchItem`);
      expect(input).toContain('visualReviewVersion: mercariVisualReviewVersion');
      expect(input).toContain("has('mercari_sold_comps')");
    }
    expect(page).toContain("const mercariVisualReviewVersion = 'mercari-undated-sold-v2-admission-reasons';");
  });
});
