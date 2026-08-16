export const USPS_TRACKING_BASE_URL = "https://tools.usps.com/go/TrackConfirmAction?tLabels=";

/**
 * Builds the official USPS tracking URL for a member-supplied tracking number.
 * Tradebilia does not fetch or scrape USPS tracking events through this helper.
 */
export function buildUspsTrackingUrl(trackingNumber: string): string {
  return `${USPS_TRACKING_BASE_URL}${encodeURIComponent(trackingNumber.trim())}`;
}
