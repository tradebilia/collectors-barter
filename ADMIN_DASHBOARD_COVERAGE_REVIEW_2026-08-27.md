# Tradebilia Administrator Coverage Review

**Date:** August 27, 2026
**Scope:** Read-only review of the current administrator dashboard, related protected data contracts, the active reminder schedule, and the public health endpoint. No application behavior, records, membership settings, storage plans, subscriptions, or scheduled jobs were changed.

## Current Coverage

Tradebilia already has substantial administrator coverage. The dashboard currently provides user and merchant review, account moderation, listing management, participant-labeled trade management, membership visibility, reports, flagged-content workflows, referrals, pre-launch email operations, media-storage reporting, conventions, support tickets, account-approval review, moderation auditing, and sanitized external API failure records.

| Operational area | Current administrator coverage | Assessment |
| --- | --- | --- |
| Members | Search, status and merchant filters, suspension, banning, deletion, profile editing, merchant verification, pending IPQS approval queue | Strong foundation |
| Listings | Search, sorting, individual deletion, bulk deletion, owner display names | Strong foundation |
| Trades | Requestor and recipient display names, requested listing, status, created/completed dates, permanent deletion | Basic; needs active-lifecycle visibility |
| Trust and safety | User reports, flagged content, moderation log, member restrictions, merchant verification | Strong workflows; no consolidated priority queue |
| Support | Ticket status filtering, priority, replies, resolution, deletion | Strong for a small team |
| Membership | Current Member, Plan, Status, and Term data with sorting | Appropriate while Free Launch remains active |
| Storage | Read-only aggregate R2 usage, allowance context, migration-health visibility | Appropriate |
| Integration reliability | Sanitized API failure log and public database health check | Strong start; no scheduled-job status panel |
| Marketing and launch | Pre-launch contacts and composer; referrals; conventions | Useful launch foundation |

The combination of onboarding review, moderation, and manual workflows is consistent with common marketplace operating patterns such as account approval, account restriction, and listing review.[1] Trust-and-safety guidance also emphasizes deliberate review queues and measurable mitigation rather than relying on a single automated control.[2]

## Verified Operational Concern

The active daily shipment-reminder schedule has recent failed runs returning **HTTP 404**. The public `/health` endpoint currently responds successfully and the source registers the expected scheduled route, so this is not evidence of a database outage. It is nevertheless a real operational gap: reminder automation should be repaired and its last-run status should be visible to the administrator before there are active shipping trades.

## Prioritized Recommendations

| Priority | Recommended addition | Why it matters | Suggested scope |
| --- | --- | --- | --- |
| **P0** | **Operations Health card** | The current scheduler has recent 404 failures. An administrator needs to see the last run, next run, outcome, and a concise failure reason without opening platform tooling. | Repair the existing schedule target first. Then add read-only status for the shipment-reminder job, database health, and recent API failures. Do not add new schedules. |
| **P1** | **Admin Action Queue** | Important work is spread across approvals, merchant verification, reports, flags, tickets, and trade issues. A small team benefits from one ordered list of what needs attention now. | Aggregate counts and deep links for pending account approvals, unverified merchants, pending reports/flags, open or urgent tickets, disputed trades, and overdue shipment/receipt actions. No new enforcement rules. |
| **P1** | **Active Trade Lifecycle Monitor** | The current Trades tab is good for audit and deletion, but not for managing trades in progress. Shipping deadlines, missing tracking, receipt confirmations, disputes, and inactive negotiations are more important than completed trades for daily operations. | Add safe filters and summary counts for negotiating, accepted, shipping, disputed, and completed trades; show each side's tracking/receipt state and deadline; link to the authorized Trade Room. |
| **P2** | **Launch Health metrics** | The Statistics tab contains current totals, but its detailed overview is still a placeholder. Trend and funnel data would show whether the marketplace is gaining supply and completing trades. | Show time-bounded counts for new members, active listings, trade starts, completed trades, open support cases, and moderation workload. Avoid misleading forecasts or fabricated estimates. |
| **P2** | **Membership readiness summary** | The Billing monitor is correct for Free Launch, but future fee activation will require more operational visibility than one row per member. Subscription-health dashboards commonly distinguish new, voluntary, and involuntary churn.[3] | When fees are explicitly enabled later, add counts by plan/status, pending grace periods, payment failures, cancellations, and webhook reconciliation state. Do not add payment enforcement now. |
| **P2** | **Unified administrator audit trail** | The Moderation Log captures moderation actions, but sensitive workflow changes are distributed across several features. | Record authorized administrator actions for report disposition, account approval, merchant verification, billing administration, schedule repair, and trade intervention. Keep customer payment data and raw provider payloads out of the log. |
| **P3** | **Exportable operational reports** | Periodic internal summaries can simplify bookkeeping and review once activity grows. Marketplace systems commonly offer administrative reporting and data export.[1] | Add explicitly scoped CSV exports for listings, trades, member status, and support volumes only after defining access, date range, and private-data handling. |

## Recommendation

The best next implementation is the **P0 Operations Health card**, paired with repair of the existing shipment-reminder schedule. It solves a verified issue rather than adding a speculative feature and gives the dashboard a concise operational warning surface. The next most useful feature is an **Admin Action Queue**, followed by an **Active Trade Lifecycle Monitor** when the marketplace has more in-progress trades.

Free Launch should remain active. Stripe test activity should remain sandbox-only, and no billing enforcement, fee switch, storage-plan change, customer notification, subscription modification, or data cleanup should occur as part of these future dashboard additions.

## References

[1]: https://spreecommerce.org/docs/use-case/marketplace/admin-dashboard "Spree Commerce — Marketplace Admin Panel"
[2]: https://withpersona.com/blog/trust-and-safety-create-better-online-marketplace/ "Persona — Trust and safety: How it helps create a better online marketplace"
[3]: https://churnkey.co/churn-metrics "Churnkey — Churn metrics dashboard"
