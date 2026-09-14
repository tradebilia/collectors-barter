# Server-Side USPS Shipment Verification: Feasibility Review

## Decision

**Do not implement the proposed Playwright/Chromium scraper in Tradebilia.** The desired experience—server-side verification of a USPS tracking number, possession-event classification, persisted evidence, and cached rechecks—is a sound product objective. The requested retrieval mechanism is not viable for production because it would automate a public USPS webpage that actively presents CAPTCHA and blocks server-side access, while USPS’s published terms prohibit data scraping and circumventing protections.[1][2]

The current public USPS route can render real package data for a human browser, but our server-side probe and browser automation encountered HTTP 401/CAPTCHA behavior. A design that simply fails when challenged would still be unreliable for normal users; adding retries, stealth settings, session cookies, or challenge handling would cross the line into prohibited automation.

## Existing Tradebilia Architecture

| Concern | Existing capability | Gap for the proposed system |
|---|---|---|
| Tracking submission | `tradeTrackingNumbers` stores proposal, sender, listing, carrier, number, URL, and submitted timestamp. | No carrier-possession state, event history, verification timestamp, or cache policy. |
| Shared Step 4 state | `tradeFlowRouter.getTradeDetails` returns submitted tracking and reads validation events from `tradeActivityLog`. | Activity-log payloads are appropriate for an audit trail, not a durable shipment-verification cache. |
| Official API | `server/uspsTracking.ts` already uses OAuth and USPS Tracking v3r2. | USPS returns `403` because the account is not authorized for the entered tracking number/MID. |
| Evidence storage | Low-level object storage exists. | Its normal URL output is public; shipment evidence requires a private access-control model and signed retrieval, not public object URLs. |
| Background work | Existing idempotent scheduled handlers cover internal trade reminders. | No carrier polling exists; scheduled checking must be bounded, idempotent, and authorized. |
| Server browser | The current Node deployment has no Playwright/Puppeteer/Chromium runtime. | Adding Chromium requires a custom runtime and still does not solve USPS’s challenge and terms restrictions. |

## Why the Proposed Browser Flow Does Not Work as a Production Verifier

The proposal correctly says not to bypass CAPTCHA or bot protection. Without bypassing it, an automated browser has only two outcomes:

1. It receives a normal USPS result and could parse it; or
2. It receives a challenge, HTTP block, changed page layout, timeout, or unavailable result.

USPS has already presented the second outcome in Tradebilia testing. That makes the system non-deterministic. The screenshot does not fix this: it would merely preserve a challenge page or a potentially stale rendered result. It would not establish that USPS verified possession.

> USPS states that users may not use its websites or services for “datamining or datascraping purposes” or “circumvent any technology used by the USPS…to protect content.”[2]

## Supported Paths

| Approach | Possession verification | Reliability | Tradebilia fit | Cost / access boundary |
|---|---|---|---|---|
| **Authorized USPS Tracking API** | Yes; classify explicit events such as *USPS in Possession of Item*, *Accepted*, *In Transit*, and *Delivered*. | High, subject to API availability. | Best production design. | Direct shippers receive no-cost access for their own MID after terms; service providers need paid, MID-authorized access.[1] |
| **USPS Tracking Webhook** | Yes; USPS pushes qualifying tracking updates after authorization. | High and avoids polling. | Preferred when USPS makes webhook access available. | Same authorization boundary as Tracking API.[1] |
| **Authorized multi-carrier provider** | Yes, if its agreement covers the tracking numbers. | High, provider-dependent. | Good alternative for USPS/UPS/FedEx/DHL in one system. | Contract, pricing, and data-authorization review required. |
| **Current official-link/manual-evidence flow** | No automatic carrier verification. | Honest but user-assisted. | Safe interim path. | No server-side USPS data acquisition. |
| **Public-page Playwright scraper** | Not dependable; must treat challenges as unavailable. | Low. | Not recommended. | Conflicts with USPS terms and anti-automation controls.[2] |

## Recommended Authorized Implementation Once Access Exists

When Tradebilia has a valid authorization route, build the requested product flow using the sanctioned API or webhook—not browser automation.

1. When a sender submits a USPS number, perform one explicit authorized lookup. Do not interpret a formatted number or a label-created event as proof of shipment.
2. Store a dedicated shipment-verification record linked to `tradeTrackingNumbers`, including provider, normalized status, possession boolean, latest event, verified timestamp, source response reference, and next eligible refresh timestamp. Add an audit event to `tradeActivityLog` separately.
3. Treat *USPS in Possession of Item*, *Accepted*, *In Transit*, *Arrived at USPS Facility*, *Out for Delivery*, and *Delivered* as possession established. Treat *Label Created*, *Pre-Shipment*, and *Shipping Label Created* as not yet accepted. Preserve exact source wording for review.
4. Cache non-possession responses briefly and stop routine refresh after possession is established. Prefer USPS webhook updates; only use a bounded background fallback when authorized and necessary.
5. Store any screenshot only when an authorized source or user evidence requires it. Use private storage plus participant-specific signed retrieval; do not publish shipment evidence by a public URL.
6. Display a clear marketplace disclosure: Tradebilia reports available carrier evidence but does not take possession of, insure, or guarantee either shipment.

## Conclusion

The **product requirement is implementable**, but the **Playwright-scraping method is not an acceptable production solution**. The next technical step is not additional browser automation. It is either USPS Tracking API/Webhook authorization for the relevant MIDs or a permitted multi-carrier provider. Until then, keep USPS in the clearly labeled manual-evidence/official-link flow and do not turn it into a green carrier-verified status.

## References

[1]: https://www.usps.com/business/api-access.htm "USPS API Access — Tracking API Access Control Changes"
[2]: https://developers.usps.com/terms-and-conditions "USPS API Terms and Conditions"
