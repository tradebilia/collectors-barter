import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';
import { captureMercariObservation, captureMercariResponseScrapedAt } from './testAiMercariObservation';
import { buildMercariAnalysisSales, mercariMeasuredPopulation, mercariPriceContextLabel, type MercariTransportListing } from './testAiMercariTransport';
import { formatCandidateDisplayPrice } from './testAiCandidateStatus';

// Pure fixtures only. No application/provider/DB/env modules are imported.
// These tests are authored, not executed, under the Step A editing authority.
const original = {
  itemId: 'synthetic-mercari-a', status: 'sold', title: 'Synthetic NES game',
  url: 'https://synthetic.invalid/mercari/a', marketplace: 'mercari',
  price: '45.00', originalPrice: null, currency: null,
  soldAt: '2026-11-01T00:00:00Z', condition: 'Used',
  images: ['https://synthetic.invalid/image-a.jpg'],
  metadata: { platform: 'NES', edition: 'Original', flags: [false, null, 0] },
};
function row(patch: Record<string, unknown> = {}): MercariTransportListing {
  const provider = { ...original, ...patch };
  return {
    ...provider,
    saleId: String(provider.itemId), itemUrl: String(provider.url),
    mercariObservation: captureMercariObservation(provider, 'sold', captureMercariResponseScrapedAt({ scrapedAt: '2026-11-09T00:00:00Z' })),
    metadataMatchRank: 4, metadataMatchScore: 80, metadataMatchReasons: ['Synthetic exact platform'],
    metadataRanking: { occurrenceKey: 'synthetic-occurrence-a', rank: 4, total: 80 },
    metadataFieldComparisons: [{ targetField: 'platform', candidateField: 'platform', targetValue: 'NES', candidateValue: 'NES', status: 'match' }],
    visualReviewStatus: 'match', visualExecution: { version: 1, attempts: [] },
    imageUrl: 'https://synthetic.invalid/image-a.jpg',
  };
}
const project = (listing: MercariTransportListing) => buildMercariAnalysisSales({ listings: [listing] }, true)[0];

function expectNoAuthority(projected: ReturnType<typeof project>) {
  expect(projected.priceBasis).toBe('unknown');
  expect(projected.completedStatusBasis).toBeNull();
  expect(projected.date).toBeNull();
  expect(projected.endedAt).toBeNull();
  expect(projected.recency).toBe('undated');
  expect(projected.completed).toBe(false);
  expect(projected.confirmed).toBe(false);
  expect(projected.verified).toBe(false);
  expect(projected.sourceId).toBe('mercari_sold_comps');
  expect(projected.sourceAdapter).toBeNull();
  expect(projected.originMarketplace).toBe('mercari');
  expect(projected.evidenceDisposition).not.toBe('valuation_eligible');
  for (const field of ['provenanceToken', 'provenance', 'identityApproval', 'trustedIdentityApproval', 'serverFinalIdentityApproval', 'canonicalCandidate', 'canonicalObservation', 'canonical', 'approval', 'serverFinalApproval', 'valuationUse', 'economicAdmission', 'sourceEconomics', 'economics', 'observationId', 'canonicalTransactionId']) expect(projected[field]).toBeNull();
}

describe('Step A pure Mercari analysis transport', () => {
  it('is A/B symmetric, keeps the original report and nonfinancial occurrence facts, and never admits sold-labeled listings', () => {
    const listing = row();
    const itemA = buildMercariAnalysisSales({ listings: [listing] }, true);
    const itemB = buildMercariAnalysisSales({ listings: [listing] }, true);
    expect(itemA).toStrictEqual(itemB);
    expect(itemA[0]).not.toBe(listing);
    expect(itemA[0].mercariObservation).toBe(listing.mercariObservation);
    expect(itemA[0].mercariObservation?.fields.originalPrice).toMatchObject({ present: true, type: 'null', value: null });
    expect(itemA[0].mercariObservation?.fields.soldAt.value).toBe(original.soldAt);
    expect(itemA[0].mercariObservation?.responseScrapedAt?.value).toBe('2026-11-09T00:00:00Z');
    for (const field of ['title', 'itemId', 'saleId', 'url', 'itemUrl', 'condition', 'images', 'metadata', 'imageUrl', 'metadataMatchRank', 'metadataMatchScore', 'metadataMatchReasons', 'metadataRanking', 'metadataFieldComparisons', 'visualReviewStatus', 'visualExecution']) expect(itemA[0][field]).toStrictEqual(listing[field]);
    expect(itemA[0].listingStatus).toBe('sold');
    expect(itemA[0].saleStatus).toBe('unknown');
    expect(mercariPriceContextLabel(itemA[0])).toBe('Provider-labeled sold listing; reported price, final amount unverified');
    expectNoAuthority(itemA[0]);
    expect(listing.soldAt).toBe(original.soldAt);
    expect(listing).not.toHaveProperty('date');
  });

  it('preserves explicit null price/currency/identity aliases, without endpoint or favorable alias repair', () => {
    const listing = { ...row({ currency: 'USD' }), price: null, currency: null, url: null, saleId: null, itemUrl: 'https://synthetic.invalid/favorable', sourceLabel: null, marketplace: null, soldCurrency: 'USD', finalPrice: 999 };
    const projected = project(listing);
    expect(projected.price).toBeNull();
    expect(projected.currency).toBeNull();
    expect(projected.url).toBeNull();
    expect(projected.saleId).toBeNull();
    expect(projected.sourceLabel).toBeNull();
    expect(projected.marketplace).toBeNull();
    expect(projected.finalPrice).toBeNull();
    expect(projected.soldCurrency).toBeNull();
    expect(projected.mercariObservation).toBe(listing.mercariObservation);
    expectNoAuthority(projected);
  });

  it('leaves currency unknown for missing/null/malformed/conflicting observations and does not trust legacy USD', () => {
    for (const currency of [undefined, null, '', false, {}, 'US D']) expect(project(row({ currency })).currency).toBeNull();
    expect(project(row({ currency: 'USD', soldCurrency: 'CAD' })).currency).toBeNull();
    expect(project(row({ currency: 'USD', soldCurrency: null })).currency).toBeNull();
    expect(project({ ...row({ currency: 'USD' }), currency: 'CAD' }).currency).toBeNull();
    expect(project({ title: 'Legacy stale source', currency: 'USD', price: 50, soldCurrency: 'USD', saleStatus: 'completed', priceBasis: 'sold' }).currency).toBeNull();
    expect(project(row({ currency: 'CAD' })).currency).toBe('CAD');
    expect(project(row({ currency: 'usd' })).currency).toBe('usd');
    expect(project(row({ currency: 'USD' })).currency).toBe('USD');
    expect(project(row({ currency: null, soldCurrency: 'USD' })).currency).toBeNull();
    const unknownCurrency = project(row({ currency: null, soldCurrency: 'USD' }));
    expect(formatCandidateDisplayPrice(unknownCurrency)).toBe('Currency unknown 45');
    expect(formatCandidateDisplayPrice(unknownCurrency)).not.toContain('$');
  });

  it('keeps direct active asking context despite stale sold/completed/approval overlays', () => {
    const listing = row({ status: 'active', completed: true, sold: true, confirmed: true, saleStatus: 'completed', priceBasis: 'sold', currency: 'USD' });
    const projected = project({ ...listing, requestedMode: 'active', listingStatus: 'sold', saleStatus: 'completed', evidenceDisposition: 'valuation_eligible' });
    expect(projected.listingStatus).toBe('active');
    expect(projected.saleStatus).toBe('active');
    expect(mercariPriceContextLabel(projected)).toBe('Active asking-price context');
    expect(projected.mercariObservation?.priceContext).toBe('active_asking');
    expect(projected.mercariObservation?.statusIssues).toContain('requested_mode_row_mismatch');
    expectNoAuthority(projected);
  });

  it('keeps contradictory row statuses diagnostic in sold mode without granting unsigned sale authority', () => {
    for (const patch of [{ saleStatus: 'active' }, { sold: false }, { completed: false }, { confirmed: false }, { isActive: true }, { canceled: true }, { sold: null }]) {
      const listing = row(patch);
      const projected = project({ ...listing, listingStatus: 'sold', saleStatus: 'completed', completed: true, confirmed: true, priceBasis: 'sold' });
      expect(projected.mercariObservation?.observedStatus).toBe('sold');
      expect(projected.mercariObservation?.statusIssues.length).toBeGreaterThan(0);
      expect(projected.listingStatus).toBe('sold');
      expect(projected.saleStatus).toBe('unknown');
      expect(mercariPriceContextLabel(projected)).toBe('Provider-labeled sold listing; reported price, final amount unverified');
      expectNoAuthority(projected);
    }
    for (const status of [undefined, null, 'SOLD', ' sold ', 1]) {
      const projected = project(row({ status, saleStatus: 'completed', completed: true }));
      expect(projected.listingStatus).toBe('sold');
      expect(projected.saleStatus).toBe('unknown');
    }
    expect(project({ title: 'Nested forged label', providerMetadata: { status: 'sold', verified: true }, listingStatus: 'sold', saleStatus: 'completed' }).listingStatus).toBe('unknown');
  });

  it('removes fake eBay tokens/canonical economics/approval flags without losing images, metadata or original descriptors', () => {
    const listing = row({ currency: 'USD', price: '45.00', soldPrice: '999.00', soldAt: '2026-11-01', metadata: { declared: false } });
    const projected = project({
      ...listing, price: 999, date: '2026-11-09', endedAt: '2026-11-09',
      sourceId: 'sold_comps', sourceAdapter: 'sold_comps', originMarketplace: 'ebay',
      saleStatus: 'completed', priceBasis: 'sold', completedStatusBasis: 'eBay completed endpoint',
      completed: true, confirmed: true, verified: true, trusted: true,
      provenanceToken: 'SYNTHETIC-NOT-A-SIGNATURE', provenance: { adapterId: 'sold_comps' },
      identityApproval: { verified: true }, trustedIdentityApproval: { approved: true },
      canonicalCandidate: { price: 999, currency: 'USD', date: '2026-11-09', saleStatus: 'completed' },
      canonicalObservation: { facts: { saleStatus: 'completed' } },
      canonical: { approved: true }, approval: { approved: true }, serverFinalApproval: true,
      sourceEconomics: { eligible: true }, economics: { final: true },
      valuationUse: { use: { code: 'CURRENT_SALES_PRIMARY' } },
      observationId: 'borrowed', canonicalTransactionId: 'borrowed', evidenceDisposition: 'valuation_eligible',
    });
    expect(projected.price).toBe('45.00');
    expect(projected.soldPrice).toBeNull();
    expect(projected.soldAt).toBeNull();
    expect(projected.mercariObservation?.fields.soldPrice.value).toBe('999.00');
    expect(projected.mercariObservation?.fields.soldAt.value).toBe('2026-11-01');
    expect(projected.metadata).toStrictEqual({ declared: false });
    expect(projected.imageUrl).toBe(listing.imageUrl);
    const missingOriginalPrice = project({ ...row({ price: undefined }), price: 999, soldPrice: 999 });
    expect(missingOriginalPrice.price).toBeNull();
    expect(formatCandidateDisplayPrice(missingOriginalPrice)).toBe('Price unavailable');
    expectNoAuthority(projected);
  });

  it('preserves descriptor presence/type/null/false/zero and does not invoke accessor original observations or row accessors', () => {
    let invoked = 0;
    const provider = { ...original, completed: false, originalPrice: 0 };
    Object.defineProperty(provider, 'finalPrice', { enumerable: true, get: () => { invoked += 1; throw new Error('must not invoke'); } });
    const report = captureMercariObservation(provider, 'sold');
    const listing: MercariTransportListing = { title: original.title, price: '45.00', currency: null, mercariObservation: report };
    Object.defineProperty(listing, 'saleStatus', { enumerable: true, get: () => { invoked += 1; throw new Error('must not invoke'); } });
    const projected = project(listing);
    expect(invoked).toBe(0);
    expect(projected.mercariObservation).toBe(report);
    expect(report.fields.completed).toMatchObject({ present: true, type: 'boolean', value: false });
    expect(report.fields.originalPrice).toMatchObject({ present: true, type: 'number', value: 0 });
    expect(report.fields.currency).toMatchObject({ present: true, type: 'null', value: null });
    expect(report.fields.finalPrice).toMatchObject({ present: true, type: 'accessor' });
    expect(report.fields.saleDate).toMatchObject({ present: false, type: 'undefined' });
    expectNoAuthority(projected);
  });

  it('bounds transport reasons while retaining full original report and restrictive holds', () => {
    const reasons = Array.from({ length: 30 }, (_, index) => `Synthetic hold ${index}`);
    const listing = { ...row(), evidenceReasons: reasons, evidenceDisposition: 'rejected_objective_conflict' };
    const projected = project(listing);
    expect(projected.evidenceDisposition).toBe('rejected_objective_conflict');
    expect(projected.evidenceReasons).toStrictEqual(reasons.slice(0, 20));
    expect(listing.evidenceReasons).toHaveLength(30);
    expect(projected.mercariObservation).toBe(listing.mercariObservation);
  });

  it('uses only the intended listings subset, preserving order/duplicates/ranks and leaving the 120 round-robin ceiling to the page', () => {
    const rows = Array.from({ length: 125 }, (_, index) => ({ ...row(), saleId: `synthetic-${index}`, metadataMatchRank: 125 - index }));
    const data = { listings: rows, audit: { ledger: [...rows, row({ status: 'active' })] }, returnedPopulations: { activeListings: [row({ status: 'active' })], soldListings: rows, unknownListings: [row({ status: null })] } };
    const projected = buildMercariAnalysisSales(data, true);
    expect(projected).toHaveLength(125);
    expect(projected.map((sale) => sale.saleId)).toStrictEqual(rows.map((sale) => sale.saleId));
    expect(projected.map((sale) => sale.metadataMatchRank)).toStrictEqual(rows.map((sale) => sale.metadataMatchRank));
    expect(buildMercariAnalysisSales({ listings: [rows[0], rows[0]] }, true)).toHaveLength(2);
    expect(buildMercariAnalysisSales(data, false)).toStrictEqual([]);
    for (const empty of [undefined, null, {}, { listings: null }, { listings: [] }]) expect(buildMercariAnalysisSales(empty, true)).toStrictEqual([]);
    const ledgerOnly = { listings: undefined, audit: data.audit, returnedPopulations: data.returnedPopulations };
    expect(buildMercariAnalysisSales(ledgerOnly, true)).toStrictEqual([]);
  });
});

describe('Step A measured Mercari populations', () => {
  it('uses full-ledger measurements, not operational listings length, with missing legacy counts unmeasured', () => {
    const data = { requestedMode: 'sold', statusCounts: { retainedListingCount: 100, providerSoldListingCount: 5, activeListingCount: 94, unknownListingCount: 1 }, listings: [row()] };
    expect(mercariMeasuredPopulation(data)).toStrictEqual({ requestedMode: 'sold', returnedRecordCount: undefined, retainedListingCount: 100, providerSoldListingCount: 5, activeListingCount: 94, unknownListingCount: 1 });
    expect(mercariMeasuredPopulation({})).toStrictEqual({ requestedMode: undefined, returnedRecordCount: undefined, retainedListingCount: undefined, providerSoldListingCount: undefined, activeListingCount: undefined, unknownListingCount: undefined });
    expect(mercariMeasuredPopulation(undefined)).toStrictEqual(mercariMeasuredPopulation({}));
    expect(mercariMeasuredPopulation({ returnedPopulations: { soldListings: [] } })).toMatchObject({ providerSoldListingCount: 0, activeListingCount: undefined, unknownListingCount: undefined, retainedListingCount: undefined });
    expect(mercariMeasuredPopulation({ returnedPopulations: { soldListings: [1, 2], activeListings: [3], unknownListings: [] } })).toMatchObject({ providerSoldListingCount: 2, activeListingCount: 1, unknownListingCount: 0, retainedListingCount: 3 });
    expect(mercariMeasuredPopulation({ statusCounts: { activeListingCount: -1, unknownListingCount: Number.NaN } })).toMatchObject({ activeListingCount: undefined, unknownListingCount: undefined });
  });
});

function descendants(node: ts.Node): ts.Node[] {
  const result: ts.Node[] = [];
  const visit = (child: ts.Node) => { result.push(child); ts.forEachChild(child, visit); };
  visit(node);
  return result;
}
function variable(ast: ts.SourceFile, name: string): ts.VariableDeclaration {
  const declaration = descendants(ast).find((node): node is ts.VariableDeclaration => ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name);
  if (!declaration) throw new Error(`Missing actual page variable: ${name}`);
  return declaration;
}

describe('Step A actual TestAI AST wiring (source-only, no application import)', () => {
  it('uses the same pure helper as the last existing round-robin source group in A and B, without ledger/partition intake expansion', () => {
    const page = readFileSync(new URL('../client/src/pages/TestAI.tsx', import.meta.url), 'utf8');
    const ast = ts.createSourceFile('TestAI.tsx', page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    expect(descendants(ast).filter((node) => ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === '@shared/testAiMercariTransport')).toHaveLength(1);
    for (const [name, data, enabled] of [['leftSales', 'leftMercariSoldCompsData', 'leftHasMercari'], ['rightSales', 'rightMercariSoldCompsData', 'rightHasMercari']]) {
      const initializer = variable(ast, name).initializer;
      expect(initializer && ts.isCallExpression(initializer)).toBe(true);
      if (!initializer || !ts.isCallExpression(initializer)) throw new Error('Missing balanced handoff');
      expect(initializer.expression.getText(ast)).toBe('balanceSaleGroups');
      const groups = initializer.arguments[0];
      if (!ts.isArrayLiteralExpression(groups)) throw new Error('Missing source groups');
      const last = groups.elements[groups.elements.length - 1];
      if (!ts.isCallExpression(last)) throw new Error('Missing Mercari group');
      expect(last.expression.getText(ast)).toBe('buildMercariAnalysisSales');
      expect(last.arguments.map((argument) => argument.getText(ast))).toStrictEqual([data, enabled]);
      expect(last.getText(ast)).not.toMatch(/ledger|returnedPopulations|normalizeComparableSale/);
    }
    const balance = variable(ast, 'balanceSaleGroups').getText(ast);
    expect(balance).toContain('balanced.length < 120');
    expect(balance).toContain('group[index]');
    expect(balance).not.toMatch(/\.filter\(|\.sort\(/);
    expect(page).not.toContain('Mercari completed-sale endpoint');
    expect(page).not.toContain('Data type: Completed Mercari sales');
  });

  it('invalidates both Mercari query keys identically and preserves source/metadata/image panel nesting', () => {
    const page = readFileSync(new URL('../client/src/pages/TestAI.tsx', import.meta.url), 'utf8');
    const ast = ts.createSourceFile('TestAI.tsx', page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    expect(variable(ast, 'mercariVisualReviewVersion').initializer?.getText(ast)).toBe("'mercari-undated-sold-v1'");
    for (const name of ['leftMercariSoldCompsQuery', 'rightMercariSoldCompsQuery']) {
      const query = variable(ast, name);
      const versions = descendants(query).filter((node): node is ts.PropertyAssignment => ts.isPropertyAssignment(node) && node.name.getText(ast) === 'visualReviewVersion');
      expect(versions).toHaveLength(2); // loaded target and existing blank fallback
      expect(versions.map((node) => node.initializer.getText(ast))).toStrictEqual(['mercariVisualReviewVersion', 'mercariVisualReviewVersion']);
      expect(query.getText(ast)).toContain('retry: false');
    }
    expect(page).toContain('hasMercariUndatedSoldAdmission(listing, data?.requestedMode)');
    expect(page).toContain('mercariMeasuredPopulation(mercariSoldCompsData)');
    expect(page).toContain('mercariSoldCompsData.audit.ledger');
    expect(page).toContain('completedSaleCount: eligible.length');
    expect(page).toContain('<MercariPopulationLine data={data} />');
    expect(page).toContain('<MercariRowContext listing={listing} />');
    expect(page).toContain('const displayListings = isMercari ? retainedMaster : rankedListings');
    expect(page).toContain('<CandidateMasterList listings={retainedMaster}');
    expect(page).toContain('<MetadataComparisonTable listing={listing} />');
    expect(page).toContain('<MarketplaceVisualReview data={data}');
  });

  it('renders missing returned/context measurements as unmeasured in the existing small outcome component', () => {
    const component = readFileSync(new URL('../client/src/components/test-ai/SourceRunOutcomeSummary.tsx', import.meta.url), 'utf8');
    expect(component).toContain("outcome.returned ?? 'unmeasured'");
    expect(component).toContain("outcome.context ?? 'unmeasured'");
    expect(component).toContain('Mercari source-eligible sales: ${outcome.accepted}. Sale date: Unknown.');
    expect(component).not.toContain('outcome.returned ?? 0');
    expect(component).not.toContain('outcome.context ?? 0');
    expect(component).toContain('aria-label="This-run source outcomes"');
  });
});

describe('reviewed route-to-handoff neutral economics', () => {
  it('does not erase a known original listing currency from generated null sale aliases', () => {
    const report = captureMercariObservation({ itemId: 'owned', title: 'Owned listing', status: 'sold', price: '42', currency: 'USD' });
    const input = { title: 'Owned listing', price: 42, currency: 'USD', soldCurrency: null, mercariObservation: report };
    const once = buildMercariAnalysisSales({ listings: [input] }, true)[0];
    expect(once.currency).toBe('USD'); expect(buildMercariAnalysisSales({ listings: [once] }, true)[0].currency).toBe('USD');
    const originalNull = captureMercariObservation({ itemId: 'owned', status: 'sold', price: '42', currency: 'USD', soldCurrency: null });
    expect(buildMercariAnalysisSales({ listings: [{ ...input, mercariObservation: originalNull }] }, true)[0].currency).toBeNull();
  });

  it('uses only complete measured query-return totals, not retained union size or partial known totals', () => {
    const base = { requestedMode: 'sold', statusCounts: { retainedListingCount: 3, providerSoldListingCount: 1, activeListingCount: 1, unknownListingCount: 1 } };
    expect(mercariMeasuredPopulation({ ...base, sourcePopulation: { queryReturnedObservationCount: 4 } })).toMatchObject({ returnedRecordCount: 4, retainedListingCount: 3 });
    for (const count of [undefined, null, -1, '4', Number.NaN]) expect(mercariMeasuredPopulation({ ...base, sourcePopulation: { queryReturnedObservationCount: count } }).returnedRecordCount).toBeUndefined();
    expect(mercariMeasuredPopulation({ ...base, sourcePopulation: { queryReturnedObservationCount: 0 } }).returnedRecordCount).toBe(0);
  });

  it('actual page source uses distinct raw provider returns and retained context detail', () => {
    const page = readFileSync(new URL('../client/src/pages/TestAI.tsx', import.meta.url), 'utf8');
    const start = page.indexOf("if (enabledSources.has('mercari_sold_comps'))");
    const block = page.slice(start, page.indexOf("if (enabledSources.has('one_thirty_point'))", start));
    expect(block).toContain('returnedRecordCount: counts.returnedRecordCount');
    expect(block).not.toContain('returnedRecordCount: counts.retainedListingCount');
    expect(block).toContain('analyzerRecords: contextRecords.map');
  });
});
