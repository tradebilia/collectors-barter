import { describe, expect, it } from 'vitest';
import { isSandboxSiteBlockedSource } from '../shared/sandboxBlockedSources';
import {
  getPermissionPendingLookupStatus,
  normalizePermissionPendingSale,
} from './permissionPendingMarketData';
import { PERMISSION_PENDING_MARKET_SOURCES } from '../shared/permissionPendingMarketSources';
import { getEligibleTestAiSources } from '../shared/testAiSourceApplicability';

const coin = {
  title: '1945 Walking Liberty Silver Half Dollar PCGS MS65',
  category: 'coins',
  grade: 'MS65',
  certificationCompany: 'PCGS',
  itemDetails: JSON.stringify({ year: '1945', denomination: '50c', composition: 'Silver', mintMark: 'S' }),
};

describe('permission-pending market-source adapters', () => {
  it('normalizes a source-shaped completed sale but blocks it from valuation while permission is pending', () => {
    const sale = normalizePermissionPendingSale('ngc', coin, {
      title: '1945-S Walking Liberty Half Dollar PCGS MS65',
      lotId: 'NGC-1001',
      auctionName: 'Sample Certified Coin Auction',
      sold: true,
      realizedPrice: '$4,200.00',
      currency: 'USD',
      soldDate: '2026-06-18',
      grade: 'MS65',
      certificationCompany: 'PCGS',
    });

    expect(sale.completed).toBe(true);
    expect(sale.identityMatched).toBe(true);
    expect(sale.eligibleWhenAuthorized).toBe(true);
    expect(sale.price).toBe(4200);
    expect(sale.valuationEligible).toBe(false);
    expect(sale.activationBlock).toMatch(/Pending written source permission/i);
  });

  it('rejects a material mismatch before a future activation could admit it', () => {
    const sale = normalizePermissionPendingSale('ngc', coin, {
      title: '2016-W [GOLD] Walking Liberty Half Dollar PCGS MS65',
      sold: true,
      realizedPrice: '9800',
      currency: 'USD',
      soldDate: '2026-05-01',
      grade: 'MS65',
      certificationCompany: 'PCGS',
    });

    expect(sale.completed).toBe(true);
    expect(sale.identityMatched).toBe(false);
    expect(sale.eligibleWhenAuthorized).toBe(false);
    expect(sale.valuationEligible).toBe(false);
  });

  it('blocks grouped lots even when the source-shaped record says it sold', () => {
    const sale = normalizePermissionPendingSale('hakes', {
      title: 'Disney LE 500 Mickey Mouse Pin',
      category: 'disney_pins',
      itemDetails: JSON.stringify({ character: 'Mickey Mouse', pinName: 'Mickey Mouse', editionSize: '500' }),
    }, {
      title: 'Disney Mickey Mouse LE 500 Pin and 3 additional Disney pins',
      sold: true,
      price: '$1,250',
      currency: 'USD',
      date: '2026-04-01',
      groupedLot: true,
    });

    expect(sale.completed).toBe(true);
    expect(sale.groupedLot).toBe(true);
    expect(sale.eligibleWhenAuthorized).toBe(false);
    expect(sale.valuationEligible).toBe(false);
  });

  it('returns only a disabled status response and never remote market records while pending', () => {
    const status = getPermissionPendingLookupStatus('rumsey', {
      title: '1923 United States Stamp Scott 572',
      category: 'stamps',
      itemDetails: JSON.stringify({ catalogNumber: '572', issueYear: '1923' }),
    });

    expect(status.status).toBe('permission_pending');
    expect(status.applicable).toBe(true);
    expect(status.sales).toEqual([]);
    expect(status.context).toEqual([]);
    expect(status.message).toMatch(/Remote lookup is disabled/i);
    expect(status.activationRequirements).toHaveLength(4);
  });

  it('does not offer a pending source outside its researched category', () => {
    const status = getPermissionPendingLookupStatus('rumsey', {
      title: '1945 Walking Liberty Half Dollar',
      category: 'coins',
    });

    expect(status.applicable).toBe(false);
    expect(status.sales).toEqual([]);
    expect(status.message).toMatch(/not applicable/i);
  });

  it('keeps every registered pending source mapped to each of its researched categories', () => {
    for (const source of PERMISSION_PENDING_MARKET_SOURCES.filter((candidate) => candidate.status === 'pending_permission' && candidate.id !== 'propstore' && !isSandboxSiteBlockedSource(candidate.id))) {
      const sourceId = source.id;
      for (const category of source.categories) {
        const eligibleIds = getEligibleTestAiSources({
          category: category.replace(/_/g, ' '),
          hasTitle: true,
        }).map((candidate) => candidate.sourceId);
        expect(eligibleIds, `${source.label} should be eligible for ${category}`).toContain(sourceId);
      }
    }
  });

  it('excludes owner-deferred sources from active Test AI applicability', () => {
    for (const source of PERMISSION_PENDING_MARKET_SOURCES.filter((candidate) => candidate.status === 'deferred')) {
      const sourceId = source.id;
      for (const category of source.categories) {
        const eligibleIds = getEligibleTestAiSources({
          category: category.replace(/_/g, ' '),
          hasTitle: true,
        }).map((candidate) => candidate.sourceId);
        expect(eligibleIds, `${source.label} should be deferred for ${category}`).not.toContain(sourceId);
      }
    }
  });

  it('retains Omega Auctions as deferred audit evidence but removes it from Music sandbox applicability', () => {
    const omega = PERMISSION_PENDING_MARKET_SOURCES.find((source) => source.id === 'omega_auctions');
    expect(omega).toMatchObject({ status: 'deferred', liveTestStatus: 'deferred' });
    const musicSourceIds = getEligibleTestAiSources({ category: 'music', hasTitle: true }).map((source) => source.sourceId);
    expect(musicSourceIds).not.toContain('omega_auctions');
  });

  it('returns a deferred, non-activatable response for an owner-deferred provider', () => {
    const status = getPermissionPendingLookupStatus('heritage', {
      title: 'Adventure Comics #78',
      category: 'comics',
    });
    const sale = normalizePermissionPendingSale('heritage', {
      title: 'Adventure Comics #78',
      category: 'comics',
    }, {
      title: 'Adventure Comics #78',
      sold: true,
      realizedPrice: '$500',
      currency: 'USD',
      soldDate: '2021-08-08',
    });

    expect(status.status).toBe('deferred');
    expect(status.applicable).toBe(false);
    expect(status.message).toMatch(/deferred by owner/i);
    expect(sale.eligibleWhenAuthorized).toBe(false);
    expect(sale.activationBlock).toMatch(/deferred by owner/i);
  });

  it('records a transparent bounded public-item result for every pending source', () => {
    const statusCounts = PERMISSION_PENDING_MARKET_SOURCES.reduce<Record<string, number>>((counts, source) => {
      expect(source.liveTestSummary.length).toBeGreaterThan(20);
      counts[source.liveTestStatus] = (counts[source.liveTestStatus] ?? 0) + 1;
      return counts;
    }, {});

    expect(statusCounts).toEqual({
      verified: 16,
      partial: 3,
      no_completed_item: 1,
      deferred: 3,
    });
  });
});
