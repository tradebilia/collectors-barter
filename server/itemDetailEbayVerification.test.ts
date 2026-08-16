import { describe, expect, it } from 'vitest';
import { hasEbayPlatformVerification } from '../shared/ebayVerification';

describe('item-detail eBay platform verification', () => {
  it('shows the eBay platform badge when an owner has a connected eBay account', () => {
    expect(hasEbayPlatformVerification('administrator-ebay', 0)).toBe(true);
  });

  it('retains identity-verification support for an account without a username payload', () => {
    expect(hasEbayPlatformVerification(null, 1)).toBe(true);
  });

  it('does not show an eBay badge for an owner with no connection or verification', () => {
    expect(hasEbayPlatformVerification(null, 0)).toBe(false);
  });
});
