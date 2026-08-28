# Paqq USPS Tracking Assessment for Tradebilia

**Date:** 2026-08-28
**Scope:** Read-only technical, operational, and policy assessment of [Paqq](https://github.com/doprdele/paqq) for a possible Tradebilia USPS package-tracking feature.
**Decision requested:** Whether Paqq should be used on Tradebilia to track USPS packages.

## Decision summary

> **Recommendation: Do not install, embed, fork, or use Paqq for Tradebilia’s USPS package-tracking feature.**

Paqq is a self-hosted package-tracking application, not a drop-in tracking library. Its USPS implementation runs a separate Playwright browser scraper, intentionally uses browser-stealth behavior, retries public USPS web pages, persists browser storage state, and expects a background scheduler plus Docker-managed services. That approach is a poor operational fit for the current Tradebilia architecture and conflicts with USPS’s published restrictions against data scraping and circumvention of protective technology. [1] [2] [3]

Tradebilia already has a smaller, safer official USPS OAuth/v3r2 tracking helper. It is currently administrator-only in the Test AI workspace because the configured credentials can authenticate but do not have authorization for the sample package’s sender MID. The appropriate next step is to preserve the official USPS website link as the no-fee member fallback and, only if a live in-site tracking feature remains a business requirement, pursue the documented USPS authorization path for the actual shipping model. [4] [5]

| Decision option | Recommendation | Why |
|---|---|---|
| Install Paqq beside Tradebilia | **No** | It introduces Docker, browser automation, stateful local storage, background polling, and scraping risk for one carrier capability already approached more safely in existing code. |
| Copy Paqq’s USPS scraper into Tradebilia | **No** | This would retain the policy, fragility, hosting, security, and MPL/AGPL-attribution concerns while increasing maintenance burden. |
| Use Paqq as a personal self-hosted tool outside Tradebilia | **Possible, but unrelated** | It may be useful for a private homelab experiment; it should not be connected to member trades or Tradebilia data. |
| Keep the official USPS website link | **Yes, now** | The member intentionally opens USPS’s own tracking page; Tradebilia does not fetch, copy, or store tracking events. |
| Expand Tradebilia’s official USPS API path | **Only after authorization design** | It can be compliant and integrated cleanly, but it needs USPS role/MID authorization, data-ownership rules, access controls, retention rules, and a separate approval. |

## What Paqq is

Paqq is a public fork of `Paylicier/Packt`, created on March 2, 2026. At review time it had **0 stars**, **2 forks**, **0 open issues**, and its latest repository push was March 5, 2026. It has recent release automation and CI, but its public adoption and issue-history signals are very limited. [1]

The repository describes support for USPS, UniUni, UPS, and Amazon import. Its documented architecture is a static frontend, a backend API and polling scheduler, and a separate `usps-scraper` service. The Docker Compose path builds all three services and persists application/scheduler/browser data in local volumes. [1]

| Paqq element | Verified implementation | Impact for Tradebilia |
|---|---|---|
| USPS retrieval | `USPSSource` posts tracking numbers to Paqq’s own scraper service, rather than USPS’s official API. [6] | It does not solve official USPS API authorization. |
| Scraper method | Uses Playwright Extra, a Puppeteer stealth plugin, `AutomationControlled` disabling, a browser-like user agent, and USPS public tracking pages. [2] | This is browser automation designed to evade automation detection, not an approved carrier integration. |
| Retry behavior | Defaults to up to 10 USPS scraping attempts, with increasing waits between attempts. [2] | A single member lookup can create repeated public-site requests and unpredictable latency. |
| Runtime model | Docker services, a scraper browser, local persistent state, and a scheduler that polls every four hours by default. [1] | This adds a separate operations burden and does not fit the current managed Autoscale application as a direct feature. |
| Session state | Carrier browser storage state is persisted by default in local JSON files. [3] | Requires strong isolation, at-rest protection, retention controls, and a non-ephemeral state design. |
| Scraper boundary | Token checks are optional: when a scraper-token environment variable is not set, the service accepts the request. [7] | It would require deployment hardening and must never be reachable from browsers. |

## Why it is not suitable for Tradebilia

### 1. It uses the wrong acquisition method for a public marketplace

Paqq does not call the sanctioned USPS Tracking API. It opens `usps.com` and `tools.usps.com` in an automated browser, hides the browser automation signal, extracts page elements, and retries when the page fails. [2] USPS’s current developer terms prohibit data scraping, data mining, and circumvention of technology that protects content. USPS also limits API/data use to USPS shipping or mailing transactions unless a specific license permits otherwise. [8]

For Tradebilia, the risk is not merely technical fragility. A public marketplace that lets members look up arbitrary seller tracking numbers most closely resembles the third-party/public-tracking use case that USPS now controls through sender MID authorization. A scraper does not grant that authorization and should not be used to bypass it. [4] [5]

### 2. It is a separate self-hosted system, not a small website feature

Tradebilia is a React/Express/tRPC application running in managed Autoscale hosting. Paqq expects separate Docker builds for the frontend, backend, and browser scraper; it also defaults to persistent background polling and local file-backed scheduler and browser state. [1]

The current Tradebilia deployment does not provide Paqq’s required Docker-based browser-scraper stack as a direct in-process feature. Paqq’s browser process, persistent session state, and local scheduler files are therefore an architectural mismatch. A production Paqq deployment would require a deliberately designed persistent service with operational ownership, browser updates, monitoring, encrypted state, token rotation, restricted networking, and incident handling. That still would not resolve the USPS scraping-policy problem.

### 3. It expands the security and privacy surface unnecessarily

Tracking numbers and detailed tracking events can reveal shipment timing, routing, location, and delivery status. Paqq adds a browser execution surface, a local persistence surface, a service-to-service authentication boundary, and background jobs. Its published scraper accepts a caller-supplied finite timeout and reads the request body before calling the carrier; it lacks the kind of Tradebilia-specific authenticated member/trade ownership check needed before a lookup. [7]

Tradebilia’s existing helper is far narrower: it normalizes the tracking number, keeps USPS OAuth credentials server-side, uses the official v3r2 endpoint, returns a limited formatted result, and records only sanitized failure information. [9]

### 4. License and redistribution review would still be required

Paqq’s repository metadata identifies **Mozilla Public License 2.0**. Its notice says that fork code is also distributed under AGPL-3.0-or-later where MPL secondary-license terms allow, and it requires preservation of its fork and upstream notices when redistributing source or binaries. [10]

This does not prohibit a review, but it is an unnecessary license/compliance burden for Tradebilia when the recommended solution is a small first-party official API integration or an official outbound link. Any future proposal to copy or modify Paqq code should receive legal review first.

## USPS and Tradebilia’s current position

USPS documents Tracking 3.2 as an OAuth-protected API that can return package status and detailed tracking data for one to 35 tracking numbers in a request. USPS also lists tracking notifications and proof-of-delivery capabilities. [11]

USPS’s onboarding documentation requires a Business Account, a created app, consumer key/secret retrieval, and an OAuth Bearer token. Tracking is listed as a default API product, but USPS separately applies resource authorization and MID-based access controls. [12] [4]

| Current Tradebilia capability | Status | Practical implication |
|---|---|---|
| Official USPS OAuth helper | Present in `server/uspsTracking.ts`. [9] | No need to adopt Paqq to begin a compliant design. |
| Current UI exposure | Protected administrator Test AI tool only. [13] | It is not currently a member-facing tracking product. |
| OAuth credentials | Valid token issuance was previously observed. [4] | Authentication alone does not authorize arbitrary package tracking. |
| Tracking endpoint authorization | A prior sanitized v3/v3r2 comparison received 403 for the sample package’s sender MID. [4] | The current app does not have blanket authorization to retrieve any member-entered USPS number. |
| Member fallback | Official USPS tracking URL helper exists. [14] | This is the safe no-fee option today. |

USPS’s access-control guidance says that a service provider tracking packages for other senders’ MIDs needs USPS authorization and the sender/MID owner’s delegation. For public arbitrary-package tracking, the documented relationship can include a service-provider agreement, Enterprise Payment Account, order form, IP agreement, and MID owner authorization; it is not a recipient-entered-number entitlement. [4]

## Recommended product path

### Now: keep the official USPS outbound link

Use the existing official USPS tracking link where the Trade Room needs a member to check delivery. The member opens USPS’s own result page, and Tradebilia does not query, store, or display tracking-event data. This is the lowest-risk option while Tradebilia is in Free Launch and continues broader marketplace validation. [14]

### Before any in-site tracking: decide the shipping model

The correct integration depends on a simple business question: **Will Tradebilia create shipping labels under its own authorized MID, or will members enter tracking numbers created by unrelated shippers?**

| Shipping model | Feasibility of official in-site tracking | Required next step |
|---|---|---|
| Tradebilia creates labels with its own MID | Potentially feasible under shipper/platform rules. | Confirm the USPS business/account configuration and label/MID model. |
| Tradebilia operates an approved label-provider/platform workflow | Potentially feasible with merchant authorization. | Design the merchant authorization, token, and label-creation scope. |
| Members enter arbitrary USPS numbers from unrelated shippers | Not currently authorized by the existing credentials. | Obtain the applicable service-provider relationship and sender/MID delegation, or do not retrieve events in Tradebilia. |

### If official authorization is approved later: build narrowly

The recommended future implementation is **not** Paqq. It should extend the existing server-side USPS adapter with the following limits:

1. Allow a lookup only to authenticated trade participants or an administrator, tied to an active trade shipment record.
2. Validate carrier-specific tracking-number shape and never expose USPS credentials to the browser.
3. Request only the lowest data detail necessary; do not display or retain location data unless the authorized feature requires it.
4. Store minimal current status/last-check time only if business value justifies it; define retention and deletion rules first.
5. Enforce per-user and per-trade rate limits, response caching, timeouts, and explicit 401/403/429/503 handling.
6. Keep an official USPS website link as the fallback when authorization is absent or the carrier is unavailable.
7. Treat tracking notifications/webhooks as a separate approval because they add recipient-contact and event-retention responsibilities.

## Alternatives

No free open-source project can legitimately grant universal access to USPS tracking data. Carrier aggregators can reduce multi-carrier integration work, but they do not remove USPS’s sender/MID authorization rule for USPS data. [4]

| Alternative | Fit for Tradebilia | Important limit |
|---|---|---|
| Official USPS API | **Best long-term USPS option** | Requires the correct USPS role/MID authorization; no public-arbitrary-number bypass. |
| Official USPS website link | **Best current option** | Member leaves Tradebilia to see USPS’s result; no in-site event display. |
| 17TRACK / other multi-carrier aggregators | Potentially useful later for UPS/FedEx/DHL comparison. | Their USPS coverage is also affected by the April 2026 USPS policy changes; commercial API terms/cost must be approved separately. [4] |
| Paqq | Useful only as an independent personal self-hosted experiment. | Not recommended for Tradebilia due to scraping, service complexity, persistence, licensing, and weak community signal. |

## What was not done

This assessment did **not** install or run Paqq, execute its containers, connect it to Tradebilia, call USPS, inspect live package data, change a secret, add a dependency, change a schedule, or modify any database record.

## References

[1]: [Paqq repository and README](https://github.com/doprdele/paqq)
[2]: [Paqq USPS scraper implementation](https://github.com/doprdele/paqq/blob/main/usps-scraper/src/scrape.ts)
[3]: [Paqq session-state implementation](https://github.com/doprdele/paqq/blob/main/usps-scraper/src/session-state.ts)
[4]: [Tradebilia USPS Tracking API Access-Control Review](./USPS_ACCESS_CONTROL_RESEARCH.md)
[5]: [USPS API Access — Tracking API Access Control Changes](https://www.usps.com/business/api-access.htm)
[6]: [Paqq USPS backend adapter](https://github.com/doprdele/paqq/blob/main/backend/src/sources/implementations/usps.ts)
[7]: [Paqq scraper server](https://github.com/doprdele/paqq/blob/main/usps-scraper/src/server-app.ts)
[8]: [USPS API Terms and Conditions](https://developers.usps.com/terms-and-conditions)
[9]: [Tradebilia official USPS helper](./server/uspsTracking.ts)
[10]: [Paqq notice](https://github.com/doprdele/paqq/blob/main/NOTICE.md) and [MPL-2.0 license](https://github.com/doprdele/paqq/blob/main/LICENSE)
[11]: [USPS Tracking 3.2 API](https://developers.usps.com/trackingv3r2)
[12]: [USPS API Getting Started](https://developers.usps.com/getting-started)
[13]: [Tradebilia Test AI USPS procedure](./server/testAIRouter.ts)
[14]: [Tradebilia official USPS tracking-link helper](./shared/uspsTrackingLink.ts)
