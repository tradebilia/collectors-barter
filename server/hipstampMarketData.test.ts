import { describe, expect, it } from 'vitest';
import {
  buildHipstampQuery,
  computeHipstampMetrics,
  filterHipstampListings,
  normalizeHipstampResponse,
} from './hipstampMarketData';

describe('HIPStamp market adapter', () => {
  it('builds a stamp-specific query from catalog identity and grade', () => {
    expect(buildHipstampQuery({
      title: 'PSE graded stamp',
      category: 'stamps',
      grade: '95',
      certificationCompany: 'PSE',
      itemDetails: JSON.stringify({ country: 'United States', scottNumber: 'C1', denomination: '24c', issueYear: '1918' }),
    })).toBe('United States C1 24c 1918 PSE 95');
  });

  it('uses the custom grading company when the selected company is Other', () => {
    expect(buildHipstampQuery({
      title: 'Custom graded stamp', category: 'stamps', grade: '95', certificationCompany: 'Other',
      itemDetails: JSON.stringify({ country: 'United States', catalogNumber: 'C1', year: '1918', customGradingCompany: 'Custom Grade' }),
    })).toBe('United States C1 1918 Custom Grade 95');
  });

  it('uses a whole-number PSA grade in stamp queries', () => {
    expect(buildHipstampQuery({
      title: 'PSA graded stamp', category: 'stamps', grade: '9.0', certificationCompany: 'PSA',
      itemDetails: JSON.stringify({ country: 'United States', catalogNumber: 'C1', year: '1918' }),
    })).toBe('United States C1 1918 PSA 9');
  });

  it('normalizes live HIPStamp listing fields and response results', () => {
    const listings = normalizeHipstampResponse({ results: [{
      id: '123',
      name: 'US Scott C1 PSE 95',
      current_price: '125.00',
      currency: 'USD',
      username: 'seller',
      url: 'https://www.hipstamp.com/listing/example/123',
      images: ['https://img.hipstamp.com/example.jpg'],
      item_specifics_01_country: 'United States',
      item_specifics_02_catalog_number: 'C1',
      item_specifics_10_certificate_grade: '95',
      item_specifics_04_condition: 'mint-nh-',
    }] });

    expect(listings).toEqual([expect.objectContaining({
      id: '123', title: 'US Scott C1 PSE 95', price: 125, currency: 'USD', seller: 'seller',
      country: 'United States', catalogNumber: 'C1', certificateGrade: '95', imageUrl: 'https://img.hipstamp.com/example.jpg',
    })]);
  });

  it('preserves closed-listing sale fields needed for sold evidence', () => {
    const listings = normalizeHipstampResponse({ results: [{
      id: 'sold-1', name: 'US Scott C1 sold', current_price: 175.5, currency: 'USD', username: 'stamp-store', listing_type: 'auction',
      end_time: '2026-09-20T12:00:00Z', quantity: 1, bid_count: 4, original_price: 200,
      item_specifics_01_country: 'United States', item_specifics_02_catalog_number: 'C1',
    }] });
    expect(listings[0]).toEqual(expect.objectContaining({
      id: 'sold-1', price: 175.5, storeUsername: 'stamp-store', listingType: 'auction', closedAt: '2026-09-20T12:00:00Z',
      quantity: 1, bidCount: 4, originalPrice: 200,
    }));
  });

  it('rejects explicit country, catalog-number, and grade conflicts', () => {
    const listings = [
      { id: 'match', title: 'match', price: 100, currency: 'USD', country: 'United States', catalogNumber: 'C1', certificateGrade: '95' },
      { id: 'country', title: 'country mismatch', price: 100, currency: 'USD', country: 'Canada', catalogNumber: 'C1', certificateGrade: '95' },
      { id: 'catalog', title: 'catalog mismatch', price: 100, currency: 'USD', country: 'United States', catalogNumber: 'C2', certificateGrade: '95' },
      { id: 'grade', title: 'grade mismatch', price: 100, currency: 'USD', country: 'United States', catalogNumber: 'C1', certificateGrade: '90' },
      { id: 'unknown', title: 'unknown fields retained', price: 100, currency: 'USD' },
    ];
    const filtered = filterHipstampListings(listings, {
      title: 'stamp', category: 'stamps', grade: '95', itemDetails: JSON.stringify({ country: 'United States', scottNumber: 'C1' }),
    });
    expect(filtered.map((listing) => listing.id)).toEqual(['match', 'unknown']);
  });

  it('does not mix a single stamp with block or hinged-block candidates', () => {
    const filtered = filterHipstampListings([
      { id: 'single', title: 'US C1 single stamp MNH', price: 100, currency: 'USD', condition: 'MNH', format: 'single stamp' },
      { id: 'block', title: 'US C1 block of four', price: 900, currency: 'USD', format: 'block' },
      { id: 'hinged-block', title: 'US C1 raw hinged block', price: 500, currency: 'USD', format: 'raw hinged block' },
      { id: 'unknown', title: 'US C1', price: 120, currency: 'USD' },
    ], { title: 'US C1', category: 'stamps', itemType: 'single_stamp', itemDetails: JSON.stringify({ format: 'single stamp', condition: 'MNH' }) });
    expect(filtered.map((listing) => listing.id)).toEqual(['single', 'unknown']);
  });

  it('computes asking-price metrics from USD listings and excludes non-USD listings', () => {
    const metrics = computeHipstampMetrics([
      { id: '1', title: 'one', price: 100, currency: 'USD' },
      { id: '2', title: 'two', price: 200, currency: 'USD' },
      { id: '3', title: 'three', price: 300, currency: 'USD' },
      { id: '4', title: 'four', price: 400, currency: 'USD' },
      { id: '5', title: 'five', price: 500, currency: 'CAD' },
    ]);
    expect(metrics).toEqual(expect.objectContaining({ count: 4, avg: 250, median: 250, min: 100, max: 400 }));
  });
});
