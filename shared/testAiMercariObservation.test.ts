import { describe, expect, it, vi } from 'vitest';
import { captureMercariObservation, captureMercariResponseScrapedAt, classifyMercariListingStatus,
  encodeMercariRequestedMode, mercariObservedCurrency, mercariOriginalMetadata, MERCARI_OBSERVATION_LIMITS } from './testAiMercariObservation';

const ROW = { itemId: 'm-observed', title: 'Observed collectible', url: 'https://www.mercari.com/us/item/m-observed/',
  marketplace: 'mercari', price: '12.50', currency: 'USD', status: 'sold' };

describe('Mercari diagnostic-only exact status classifier', () => {
  it.each(['sold', 'active', 'unknown', 'Sold', 'SOLD', ' sold ', 'completed', '', null, false, 0, ['sold'], { value: 'sold' }])(
    'uses only exact own direct status %j', (status) => {
      const report = captureMercariObservation({ ...ROW, status, saleStatus: 'completed', completed: true, confirmed: true });
      const expected = status === 'sold' ? 'sold' : status === 'active' ? 'active' : 'unknown';
      expect(report.observedStatus).toBe(expected);
      expect(report.listingStatus).toBe(expected);
      expect(report.version).toBe(1);
      expect(report.economicIssues).toContain('final_price_basis_unverified');
      expect(report.economicIssues).toContain('sale_date_unknown');
    });

  it('missing, inherited and nested assertions cannot establish a direct sold label', () => {
    const { status: _status, ...missing } = ROW;
    const inherited = Object.assign(Object.create({ status: 'sold' }), missing);
    for (const row of [missing, inherited, { ...missing, sold: true, completed: true, confirmed: true,
      providerMetadata: { status: 'sold', listingStatus: 'sold', verified: true },
      mercariObservation: { version: 1, observedStatus: 'sold', listingStatus: 'sold' } }]) {
      expect(classifyMercariListingStatus(row).listingStatus).toBe('unknown');
      expect(captureMercariObservation(row).fields.status.present).toBe(false);
    }
  });

  it.each([
    { saleStatus: 'active' }, { listingStatus: 'active' }, { saleStatus: 'cancelled' }, { priceBasis: 'asking' },
    { sold: false }, { completed: false }, { confirmed: false }, { isSold: false }, { isCompleted: false }, { isConfirmed: false },
    { active: true }, { isActive: true }, { cancelled: true }, { canceled: true }, { isCancelled: true }, { isCanceled: true },
    { cancellationStatus: 'canceled' },
  ])('holds an exact sold row with opposing own assertion %j', (assertion) => {
    const report = captureMercariObservation({ ...ROW, ...assertion });
    expect(report.observedStatus).toBe('sold');
    expect(report.listingStatus).toBe('unknown');
    expect(report.priceContext).toBe('unknown');
    expect(report.statusIssues.some((issue) => issue.startsWith('status_conflict:'))).toBe(true);
  });

  it.each([{ completed: 'true' }, { sold: 1 }, { confirmed: null }, { active: [] }, { cancelled: {} },
    { saleStatus: 'Completed' }, { listingStatus: null }, { priceBasis: false }, { cancellationStatus: 'maybe' }])(
    'does not coerce malformed status assertions %j', (assertion) => {
      const report = captureMercariObservation({ ...ROW, ...assertion });
      expect(report.observedStatus).toBe('sold');
      expect(report.listingStatus).toBe('unknown');
      expect(report.statusIssues.some((issue) => issue.startsWith('status_assertion_malformed:'))).toBe(true);
    });

  it('direct active stays active despite mixed completed assertions and is a sold-mode mismatch', () => {
    const report = captureMercariObservation({ ...ROW, status: 'active', saleStatus: 'completed', sold: true,
      completed: true, confirmed: true, isActive: false, cancelled: false });
    expect(report.observedStatus).toBe('active');
    expect(report.listingStatus).toBe('active');
    expect(report.priceContext).toBe('active_asking');
    expect(report.statusIssues).toContain('requested_mode_row_mismatch');
    expect(report.statusIssues).toContain('status_conflict:completed');
    expect(report.statusIssues).not.toContain('status_conflict:cancelled');
  });

  it('agreeing flags, non-cancellation, aliases and verified claims do not establish economics', () => {
    const report = captureMercariObservation({ ...ROW, saleStatus: 'completed', priceBasis: 'sold', completed: true,
      confirmed: true, sold: true, active: false, cancelled: false, verified: true, originalPrice: '20.00' });
    expect(report.listingStatus).toBe('sold');
    expect(report.priceContext).toBe('sold_listing_reported');
    expect(report.statusIssues).toEqual([]);
    expect(report.economicIssues).toEqual(expect.arrayContaining(['final_price_basis_unverified', 'sale_date_unknown']));
    expect(report.economicIssues.some((issue) => issue.includes('originalPrice'))).toBe(false);
  });
});

describe('Mercari original observation safety and transport descriptors', () => {
  it('never invokes getters or coerces favorable objects into status/currency/price', () => {
    const getter = vi.fn(() => { throw new Error('No getter reads'); });
    const coerce = vi.fn(() => 'sold');
    const row = { ...ROW, currency: { toString: coerce }, price: { valueOf: coerce },
      metadata: { title: 'Original', nested: { get completed() { return getter(); } } } };
    Object.defineProperty(row, 'status', { get: getter, enumerable: true });
    Object.defineProperty(row, 'completed', { get: getter, enumerable: true });
    const report = captureMercariObservation(row);
    expect(report.listingStatus).toBe('unknown');
    expect(report.fields.status).toMatchObject({ present: true, type: 'accessor' });
    expect(report.fields.completed).toMatchObject({ present: true, type: 'accessor' });
    expect(mercariObservedCurrency(report)).toBeNull();
    expect(getter).not.toHaveBeenCalled();
    expect(coerce).not.toHaveBeenCalled();
    expect(JSON.stringify(report)).toContain('accessor');
  });

  it('preserves named presence, type, null, false, zero and undefined independently of mutable provider objects', () => {
    const images = [{ url: 'https://example.test/original.jpg' }];
    const row = { ...ROW, images, metadata: { count: 0, confirmed: false, nullField: null },
      originalPrice: null, soldPrice: 0, currency: false, soldAt: undefined, date: ['unverified'], completed: false };
    const report = captureMercariObservation(row);
    const original = mercariOriginalMetadata(report);
    expect(report.fields).toMatchObject({ originalPrice: { present: true, type: 'null', value: null },
      soldPrice: { present: true, type: 'number', value: 0 }, currency: { present: true, type: 'boolean', value: false },
      soldAt: { present: true, type: 'undefined', value: undefined }, soldDate: { present: false, type: 'undefined' },
      images: { present: true, type: 'array' }, metadata: { present: true, type: 'object' } });
    images[0].url = 'https://example.test/changed.jpg';
    row.metadata.count = 100;
    expect(original.images).toEqual([{ url: 'https://example.test/original.jpg' }]);
    expect(original.metadata).toEqual({ count: 0, confirmed: false, nullField: null });
    for (const value of [report, report.fields, report.fields.images, report.fields.images.value, original, original.metadata]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
    const wire = JSON.parse(JSON.stringify(report));
    expect(wire.fields.soldAt).toMatchObject({ present: true, type: 'undefined' });
    expect(wire.fields.soldDate).toMatchObject({ present: false, type: 'undefined' });
    expect(Object.hasOwn(original, 'soldAt')).toBe(true);
    expect(Object.hasOwn(original, 'soldDate')).toBe(false);
  });

  it('removes sensitive nested keys before descriptor reads and safely describes unsupported/cyclic data', () => {
    const credentialRead = vi.fn(() => { throw new Error('Secret getter forbidden'); });
    const nested: Record<string, unknown> = { keep: 'Original', apiKey: 'DO_NOT_EXPOSE', Authorization: 'DO_NOT_EXPOSE',
      nested: { access_token: 'DO_NOT_EXPOSE', password: 'DO_NOT_EXPOSE', condition: 'Original' },
      authenticationCompany: 'PSA/DNA', 'Authentication Company': 'JSA', authentication: 'DO_NOT_EXPOSE',
      callable: () => 'never', bigint: BigInt(1), symbol: Symbol('do not coerce'), when: new Date('2026-01-01') };
    Object.defineProperty(nested, 'clientSecret', { get: credentialRead, enumerable: true });
    nested.cycle = nested;
    const report = captureMercariObservation({ ...ROW, metadata: nested, providerMetadata: nested });
    const wire = JSON.stringify({ report, original: mercariOriginalMetadata(report) });
    expect(wire).not.toContain('DO_NOT_EXPOSE');
    expect(wire).not.toContain('Authorization');
    expect(wire).not.toContain('apiKey');
    expect(wire).not.toContain('clientSecret');
    expect(wire).toContain('PSA/DNA');
    expect(wire).toContain('Authentication Company');
    expect(wire).toContain('JSA');
    expect(wire).toContain('cyclic');
    expect(wire).toContain('non_plain_object');
    expect(wire).toContain('function');
    expect(credentialRead).not.toHaveBeenCalled();
  });

  it('bounds copied strings, nested depth, entries and issue counts', () => {
    const huge = Object.fromEntries(Array.from({ length: 2000 }, (_, index) => [`key${index}`, { title: 'x'.repeat(5000) }]));
    const deep = { child: { child: { child: { child: { child: { child: 'not copied' } } } } } };
    const report = captureMercariObservation({ ...ROW, metadata: huge, providerMetadata: deep,
      description: 'x'.repeat(5000) });
    const wire = JSON.stringify(report);
    expect(wire).toContain('string_limit');
    expect(wire).toMatch(/depth_limit|node_limit|entry_or_node_limit/);
    expect(wire).not.toContain('not copied');
    expect(Object.keys(report.fields.metadata.value as object).length).toBeLessThanOrEqual(MERCARI_OBSERVATION_LIMITS.maxEntries + 1);
    expect(report.statusIssues.length).toBeLessThanOrEqual(MERCARI_OBSERVATION_LIMITS.maxIssues);
  });

  it('keeps truncated arrays JSON-visible without expanding sparse provider indexes', () => {
    const gallery: unknown[] = [];
    gallery[1000000] = 'https://example.test/not-copied.jpg';
    const report = captureMercariObservation({ ...ROW, gallery });
    const copy = report.fields.gallery.value as unknown[];
    expect(copy.length).toBeLessThanOrEqual(MERCARI_OBSERVATION_LIMITS.maxEntries + 1);
    expect(JSON.stringify(copy)).toContain('array_entry_limit');
    expect(JSON.stringify(copy)).not.toContain('not-copied.jpg');
  });

  it('does not invoke response retrieval-context getters', () => {
    const read = vi.fn(() => { throw new Error('Do not read context getter'); });
    const response = { get scrapedAt() { return read(); } };
    const context = captureMercariResponseScrapedAt(response);
    expect(context.type).toBe('accessor');
    const report = captureMercariObservation(ROW, 'sold', { present: true, type: 'string', get value() { return read(); } });
    expect(report.responseScrapedAt?.type).toBe('unreadable');
    expect(read).not.toHaveBeenCalled();
  });

  it('original unexpected dates and response scrapedAt are separate unverified observations only', () => {
    const response = { scrapedAt: '2026-11-10T12:00:00Z' };
    const context = captureMercariResponseScrapedAt(response);
    const report = captureMercariObservation({ ...ROW, soldAt: '2026-09-01', endedAt: '2099-01-01', date: 0 }, 'sold', context);
    expect(report.responseScrapedAt).toEqual({ present: true, type: 'string', value: response.scrapedAt });
    expect(report.fields.soldAt.value).toBe('2026-09-01');
    expect(report.fields.endedAt.value).toBe('2099-01-01');
    expect(report.fields.date.value).toBe(0);
    expect(report.economicIssues).toContain('sale_date_unknown');
    expect(report.economicIssues).toContain('original_date_event_semantics_unverified');
    expect(report).not.toHaveProperty('endedAt');
    expect(report).not.toHaveProperty('date');
  });
});

describe('Mercari owned requested mode and nullable original currency', () => {
  it('has one exact wire encoder and does not accept provider mode echoes', () => {
    expect(encodeMercariRequestedMode('sold')).toBe('true');
    expect(encodeMercariRequestedMode('active')).toBe('false');
    expect(captureMercariObservation({ ...ROW, requestedMode: 'active' }).requestedMode).toBe('sold');
    const active = captureMercariObservation({ ...ROW, requestedMode: 'sold' }, 'active');
    expect(active.requestedMode).toBe('active');
    expect(active.listingStatus).toBe('sold');
    expect(active.statusIssues).toContain('requested_mode_row_mismatch');
  });

  it.each([undefined, null, false, 0, '', ' ', ' USD ', 'US', { code: 'USD' }, ['USD']])(
    'does not manufacture currency from %j or soldCurrency repair', (currency) => {
      const report = captureMercariObservation({ ...ROW, currency, soldCurrency: 'USD' });
      expect(mercariObservedCurrency(report)).toBeNull();
    });

  it.each(['USD', 'usd', 'EUR'])('preserves exact nonconflicting explicit %s without normalizing', (currency) => {
    const report = captureMercariObservation({ ...ROW, currency });
    expect(mercariObservedCurrency(report)).toBe(currency);
    if (currency !== 'USD') expect(report.economicIssues).toContain('documented_currency_not_usd');
  });

  it.each(['usd', 'EUR', false, null, 0, {}, []])('holds conflicting or malformed soldCurrency %j', (soldCurrency) => {
    const report = captureMercariObservation({ ...ROW, soldCurrency });
    expect(mercariObservedCurrency(report)).toBeNull();
    expect(report.economicIssues).toContain('currency_conflict:soldCurrency');
  });

  it('agreed currency and price aliases never verify final amounts, and originalPrice may differ', () => {
    const report = captureMercariObservation({ ...ROW, originalPrice: '20', soldPrice: '12.50', soldCurrency: 'USD',
      finalPrice: '11.00', transactionPrice: null, completed: true, confirmed: true });
    expect(mercariObservedCurrency(report)).toBe('USD');
    expect(report.fields.originalPrice.value).toBe('20');
    expect(report.economicIssues).toContain('price_conflict:finalPrice');
    expect(report.economicIssues).toContain('price_alias_invalid:transactionPrice');
    expect(report.economicIssues).toContain('final_price_basis_unverified');
    expect(report.economicIssues.some((issue) => issue.includes('originalPrice'))).toBe(false);
    expect(mercariObservedCurrency(null)).toBeNull();
    expect(mercariObservedCurrency(undefined)).toBeNull();
  });
});

describe('reviewed original Mercari metadata preservation', () => {
  it('keeps original direct identity fields and alternate metadata wrappers independently frozen', () => {
    const source = { ...ROW, platform: 'SNES', edition: 'Reprint', isGraded: true, grade: '9', gradingCompany: 'PSA',
      authenticationCompany: 'PSA/DNA', item_details: ' {"platform": "SNES", "customBrand": "Nintendo"} ' };
    const report = captureMercariObservation(source);
    expect(mercariOriginalMetadata(report)).toMatchObject(source);
    expect(report.originalMetadata).toMatchObject(source);
    expect(report.fields.item_details.type).toBe('string');
    expect(Object.isFrozen(report.originalMetadata)).toBe(true);
    source.platform = 'NES'; expect(report.originalMetadata?.platform).toBe('SNES');
  });

  it('removes credential keys recursively from JSON-encoded metadata while retaining authentication identity', () => {
    const source = { ...ROW, authenticationCompany: 'PSA/DNA', itemDetails: JSON.stringify({ authenticationCompany: 'PSA/DNA',
      apiKey: 'SYNTHETIC_REFLECTED_CREDENTIAL_SENTINEL', nested: { password: 'SYNTHETIC_REFLECTED_PASSWORD_SENTINEL', edition: 'Original' } }) };
    const report = captureMercariObservation(source);
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain('SYNTHETIC_REFLECTED_CREDENTIAL_SENTINEL');
    expect(serialized).not.toContain('SYNTHETIC_REFLECTED_PASSWORD_SENTINEL');
    expect(report.fields.itemDetails.type).toBe('string');
    expect(JSON.parse(report.originalMetadata?.itemDetails as string)).toEqual({ authenticationCompany: 'PSA/DNA', nested: { edition: 'Original' } });
    expect(report.originalMetadata?.authenticationCompany).toBe('PSA/DNA');
  });

  it('preserves accessor descriptors without invoking new direct metadata accessors', () => {
    let invoked = 0; const source = { ...ROW };
    Object.defineProperty(source, 'customBrand', { enumerable: true, get() { invoked += 1; throw new Error('not allowed'); } });
    const report = captureMercariObservation(source);
    expect(invoked).toBe(0); expect(report.fields.customBrand.type).toBe('accessor');
    expect(report.originalMetadata?.customBrand).toEqual({ $unsupported: 'accessor' });
  });
});
