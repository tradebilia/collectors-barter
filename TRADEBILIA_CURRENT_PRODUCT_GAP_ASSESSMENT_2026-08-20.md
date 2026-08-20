# Tradebilia Current Product Gap Assessment

## Bottom Line

Tradebilia is no longer missing its core collector-exchange foundation. Members can create an account, complete a protected setup, recover access through verified contacts, create and search listings, browse all ten categories, identify verified merchants, exchange trade proposals, track trade fulfilment, message one another, report issues, and use a unified all-category search. The remaining work is primarily about **mobile usability, launch polish, operational process, and depth of discovery**—not rebuilding the marketplace.

Earlier account-creation, security-question, legacy Profile Completion, global-search, pagination, nearest-sort, and blank-search defects are resolved and must not be treated as current gaps.

## Priority View

| Priority | What is still lacking | Why it matters | Recommended next action |
|---|---|---|---|
| Before broader launch | Mobile Category Page filter experience | The permanent desktop-style sidebar remains cramped at phone widths, reducing browsing and filtering usability. | Replace the narrow fixed rail with a Filter button and drawer/sheet while retaining Search/Enter submission. |
| Before broader launch | Complete high-value Category Page filters | Several server-supported, meaningful listing attributes are not exposed in the interface. | Add Grade wherever grading is captured, then year/country/region and specialist filters in the approved order. |
| Before broader launch | Homepage launch polish | The public **Member Growth +15%** metric remains hard-coded, and the homepage still visibly labels Shipping Supplies as Coming soon. | Replace the metric with a documented calculation or remove it; hide or complete the placeholder. |
| Before broader launch | Merchant verification operating process | The code correctly creates verification requests and protects the badge, but the human review workflow needs a defined owner, checklist, service level, and escalation path. | Document the administrator review procedure before opening merchant applications widely. |
| Launch preparation | Production cutover runbook | This workspace remains the isolated development project; a separate approved production cutover still requires database/media, provider-callback, webhook, domain, and smoke-test confirmation. | Prepare a pre-launch checklist only when the product is declared complete. |
| Soon after launch | Accessible Recently Added carousel | The carousel is visually appropriate but lacks a reduced-motion alternative, keyboard controls, and semantic treatment of duplicated marquee cards. | Add accessible controls if you later approve a carousel change. |
| Soon after launch | Durable, shared recovery-rate limiting | Current in-process limits are safe for the deployed architecture but will not coordinate across multiple application instances. | Move recovery throttling to durable shared state when scaling beyond the current architecture. |
| Later | Retention features | No saved searches, listing-match alerts, or watchlist-driven digest experience has been approved. | Add one focused engagement feature after stable public usage establishes demand. |

## What Is Already Strong

The differentiated parts of the product are now in good shape: the all-category Search Results page is consistent with Category Pages; Category Pages have real pagination and privacy-safe local discovery; member profiles and trust signals are surfaced through the directory and listing cards; trade exchanges retain explicit participant safeguards; member reports accept controlled evidence; Cloudflare public-media and static assets are durable; and account recovery no longer depends on knowledge questions.

## Recommended Sequence

The best next product decision is **mobile Category Page filters**. It improves the most-used browsing flow without changing marketplace rules or adding speculative features. After that, complete the confirmed Category Page filter gaps, then address the homepage’s public metric and visible Coming soon placeholder. The carousel can remain unchanged, as directed, until accessibility work is separately approved.

## Evidence

This assessment reconciles `TRADEBILIA_PRODUCT_AUDIT_2026-08-19.md` against subsequent completed repair records, including `ACCOUNT_SETUP_FLOW_REPAIR_2026-08-19.md`, `ACCOUNT_RECOVERY_UPGRADE_2026-08-19.md`, `PROFILE_COMPLETION_ROUTE_RETIREMENT_2026-08-19.md`, `GLOBAL_SEARCH_REPAIR_AUDIT_2026-08-19.md`, `GLOBAL_SEARCH_BLANK_QUERY_REPAIR_AUDIT_2026-08-20.md`, `CATEGORY_PAGE_PAGINATION_REPAIR_AUDIT_2026-08-19.md`, `CATEGORY_LOCATION_DISCOVERY_AUDIT_2026-08-19.md`, and `CATEGORY_FILTER_COVERAGE_AUDIT_2026-08-20.md`. Current homepage source confirms the retained Member Growth and Shipping Supplies placeholder labels.
