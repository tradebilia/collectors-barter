# USPS Official Website Fallback

**Date:** August 16, 2026

Tradebilia’s direct USPS Tracking API path is intentionally **not used** because the required service is paid and the user declined that cost. Tradebilia will not scrape USPS public tracking pages.

## Implemented behavior

| Entry point | Behavior |
|---|---|
| Test AI carrier section | When USPS is selected, an entered tracking number builds an official USPS.com tracking link and opens it in a new tab. The direct `lookupUspsTracking` mutation is not invoked. |
| Trade Room shipping display | USPS tracking numbers use the same shared official-link helper. The number is URL-encoded before it is appended to the official USPS tracking URL. |

The shared helper targets `https://tools.usps.com/go/TrackConfirmAction?tLabels=` and uses `encodeURIComponent` after trimming the tracking number.

## Validation

| Check | Result |
|---|---|
| Helper unit test | Passed; verifies official URL construction, trimming, and URL encoding. |
| Carrier UI regression test | Passed; verifies USPS shows the official-link action and that the paid USPS mutation is absent from the Test AI UI. |
| TypeScript | Passed with `pnpm check`. |
| Browser verification | Passed in the development Test AI view. Input `9400 1000 1234` rendered `https://tools.usps.com/go/TrackConfirmAction?tLabels=9400%201000%201234`. |
