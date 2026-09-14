# USPS Browser Feasibility Test

## Scope

This is a **local, read-only feasibility probe**. It launches the system Chromium binary against the official USPS tracking URL, waits for the page DOM, classifies only visible response text, and prints a transient JSON result. It does not use stealth plugins, CAPTCHA solving, proxy rotation, cookie harvesting, retries intended to evade blocking, database writes, Trade Room mutations, storage uploads, or AI review.

Run it with:

```bash
node scripts/usps-browser-feasibility.mjs <tracking-number>
```

The probe is not a production carrier validator. A `normal_result` classification only means that recognizable USPS tracking text was returned; it does not prove that USPS accepted or possesses the package.

## Observed Run

The first run used the non-secret public-format value `9400111899560000000000` only to exercise the harness. USPS returned:

| Field | Result |
|---|---|
| Classification | `challenge_or_block` |
| Page title | `Access Denied` |
| Visible response | `You don't have permission to access ...` with an Akamai reference page |
| Persistence | `false` |
| Database changed | `false` |
| Bypass attempted | `false` |

This is a direct observation from the managed sandbox’s Chromium request, not an inference from the API response. It confirms that the browser method is blocked in this environment before a USPS tracking result can be read.

## Test Coverage

The pure classifier has three passing regression tests. They cover an access-denied page, explicit USPS tracking text including *Tracking Not Available*, and an empty/unrelated response. TypeScript validation and the production build also pass. The broader legacy suite currently has eight unrelated failures across the existing animated-logo and coming-soon containment tests; none references the new USPS files. This feasibility checkpoint does not alter those pre-existing failures.

## Decision

The test does **not** support adding Playwright/Chromium to Tradebilia’s production runtime. It supports the previous recommendation: keep the current manual official-link/evidence flow until Tradebilia has authorized USPS Tracking API/Webhook access or uses a permitted carrier-data provider. If the user supplies an actual tracking number for a repeat test, the same local probe can be run once against it without changing application or database state.
