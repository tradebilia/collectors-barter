# Tradebilia Administrator Dashboard Audit

**Date:** 2026-08-28
**Scope:** Read-only review of the administrator dashboard’s 20 visible tabs, their client wiring, supporting administrator procedures, and existing focused regressions.
**Out of scope:** No database records, payment settings, external providers, emails, schedules, secrets, or administrator actions were invoked or changed.

## Executive assessment

The administrator dashboard has a sound core structure: the visible dashboard is gated to administrators, most supporting procedures repeat an administrator role check, destructive areas are generally separated from monitoring views, and the recent **Admin Guide**, **Operations**, **API Health**, Fee Mode, and account-closure controls improve clarity. The focused administrator regression suite passed **6 files / 13 tests**, and TypeScript, production build, and whitespace checks passed.

The main concern is not a general access-control failure. It is that several older administrator actions can permanently delete records with inconsistent confirmation, retention, and audit handling. The most important next improvement is a single approved **safe-deletion and retention policy** for user, trade, ticket, listing, convention, and referral deletion paths. The next highest operational gap is that **Closure Requests is not surfaced in Operations**, so a time-sensitive privacy/account request can be missed during a normal daily queue review.

> **Bottom line:** The dashboard is usable and its principal monitoring/work-queue functions are working as designed by their current source contracts. Before broader member growth, prioritize the safe-deletion policy and add Closure Requests to Operations. Do not enable future billing-plan controls merely because a dormant backend procedure exists.

## Validation and limits

| Review area | Evidence | Result |
|---|---|---|
| Administrator route boundary | Dashboard checks for the administrator role before rendering its workspace; administrator procedures enforce role checks. [1] [2] | **Confirmed by source and existing tests** |
| Administrator UI/control contracts | Audit trail, billing UI, Admin Guide, Operations, trade participant, and recovered-control tests. | **6 files / 13 tests passed** |
| Type and production build | `pnpm check`; `pnpm build`. | **Passed** |
| Data, provider, payment, and scheduled actions | No live mutation or external-provider operation was run. | **Intentionally not exercised** |
| Live signed-in visual confirmation | This audit did not reuse an administrator’s credentials. | **Requires an optional administrator acceptance review** |

The audit can verify code paths, current UI wiring, authorization contracts, and static workflow behavior. It cannot prove that a live email delivers, a third-party provider responds, a stored record contains expected production data, or a signed-in administrator sees a particular queue without deliberately exercising those systems. Those actions were intentionally excluded from this audit.

## Tab-by-tab assessment

| Tab | Current purpose and status | Consolidation assessment | Audit note |
|---|---|---|---|
| **Stats** | Read-only marketplace totals and activity indicators. | Keep as the primary analytics landing view; show selected summary cards in Operations rather than merging the full tab. | Add date/category trends later; estimated values are member-entered, so present totals as estimates. |
| **Billing** | Membership monitoring, sorting, complimentary-access controls, and the guarded Fee Mode planning switch. | Keep billing decisions here; show only readiness summary in Operations. | Fee Mode remains intent-only and cannot charge, start Checkout, or enforce access. A dormant plan-feature procedure should stay hidden until a separately approved paid-launch plan exists. |
| **Users** | Searchable member review and available account/moderation controls. | Make this the main workspace of a future **Member Lifecycle** group. | The direct permanent-deletion path needs the safe-deletion policy described below. |
| **Listings** | Search, sort, review, and available listing moderation/deletion controls. | Keep as a marketplace workspace; deep-link flagged listings here from Flagged. | Add direct investigation links and more filters before high-volume use. |
| **Trades** | Reviews exchanges and both participants. | Keep as a marketplace workspace; Operations should remain a read-only lifecycle summary. | The permanent delete path needs retention/audit safeguards and better investigation tools. |
| **Settings** | Currently a visible placeholder, not a live general-settings workspace. | Do not keep a placeholder as a primary top-level destination. Hide it until settings exist, or turn it into a clearly labelled, read-only “Configuration status” page. | Existing live controls belong in Billing, Referrals, and Media Storage. |
| **Deleted** | Read-only record of direct permanently deleted accounts. | Place within the future **Member Lifecycle** group, near Closure Requests, rather than treating it as a daily-use queue. | Needs a retention/redaction policy, a search/filter, and a documented deletion reason. |
| **Closure Requests** | Controlled member-requested account closure with count-only safety review and decision notes. | Keep distinct from direct deletion; show it prominently in Operations and group it with Users/Deleted in navigation. | Strong safeguards are present. Operations currently omits this queue. |
| **Reports** | Reviews member-submitted concerns and records a resolution. | Group under a future **Safety & Support** navigation category, but retain separate report workflow. | Add filters, pagination, and safe links to the reported member/listing/trade. |
| **Referrals** | Manages referral template, requests, selected invitation sends, and deletion. | Group with Pre-Launch Email under **Communications**; share only common list/confirmation components. | Keep its dedicated workflow. Add event audit records and scalable delivery handling before larger campaigns. |
| **Pre-Launch Email** | Drafts, previews, and confirms a message to opted-in Coming Soon contacts. | Keep separate inside **Communications** because its recipient rules differ from referrals. | Existing preview, confirmation, opt-in filtering, and delivery-key safeguards are appropriate. Add a limited test-send and delivery-history view before broad use. |
| **Media Storage** | Read-only public-media storage health plus tightly guarded public-media migration/restore controls. | Keep as a dedicated **System Maintenance** page; mirror health summaries in Operations only. | Strong private-evidence boundary and rollback design. Add sanitized failure detail and alerting before scaling migrations. |
| **Conventions** | Reviews/approves/rejects convention content and provides an administrator-only scrape action. | Group with Listings/Trades under **Marketplace Content**. | Consolidate the manual role-check pattern into the standard administrator procedure; add confirmation/progress/audit coverage for scraper and delete actions. |
| **Mod Log** | Read-only record of moderation actions. | Keep distinct as an audit trail; link to it from Users, Reports, Flagged, and Closure Requests rather than merging its records into every workflow. | Add filters, full-reason view, pagination, and deep links to the relevant record. |
| **Tickets** | Supports case review, replies, priority/status handling, and deletion. | Group under **Safety & Support**, but do not merge it with Reports because tickets are conversations rather than allegations. | Add a delete confirmation, admin assignment, private resolution notes, and search. |
| **Flagged** | Separate community content-flag and low-feedback safety queues. | Group under **Safety & Support** and add deep links to the affected item/member/trade. | Keep feedback safety separate from content flags in the data/UI. Add centralized audit logging for content-flag reviews. |
| **Approvals** | Reviews account-risk approval decisions before marketplace access is enabled. | Group under **Member Lifecycle** and retain its own decision queue. | Add a required decline reason and optional “request information” state before higher-volume onboarding. |
| **API Health** | Shows sanitized provider failure records; lets an admin select and clear only reviewed records with an audit-log entry. | Keep as a detailed diagnostic page; summarize counts/health in Operations. | Add pagination, provider/failure filters, and sanitized detail/export before higher event volume. |
| **Operations** | Read-only daily command center: health, actionable counts, lifecycle view, timeline, readiness, and safe CSV exports. | Make this the default daily landing view, not the place to merge action workflows. | Add Closure Requests, deep links from timeline/lifecycle, export filters, and alert thresholds. |
| **Admin Guide** | Static, administrator-only plain-language explanation of the functional tabs and quick tools. | Keep as a help/reference page; it should not become a control or data screen. | Update it whenever an admin tab or action materially changes. |

## Confirmed priority findings

### P1 — Adopt a safe-deletion and retention policy before wider administrator use

Three distinct administrator procedures permanently delete valuable records: direct user deletion removes the user and broad related marketplace history; trade deletion removes the proposal and its child evidence/history; ticket deletion removes the ticket and replies. The ticket UI invokes deletion directly, and the ticket/trade procedures do not write a matching central administrator-activity entry. Direct user deletion also records the generic reason **“Admin deletion”**, rather than requiring the actual reason. [1] [2]

This is an administrator-only risk, not a public authorization bypass. It is nevertheless **P1** because an accidental or poorly documented action could irreversibly remove trade, support, or user evidence. This is also inconsistent with the newer member-requested closure workflow, which preserves required records while disabling access and hiding public presence.

**Recommended approved scope:** replace ordinary deletion buttons with archive/close/suspend outcomes where possible; require a reason and a typed confirmation for any permitted permanent deletion; audit every such decision; retain a controlled exception-only purge path with a defined retention schedule. This requires a separate, data-migration-aware approval and should not be done as a quick UI-only change.

### P1 — Add pending Closure Requests to the Operations action queue

Operations counts approvals, merchants, reports, content flags, feedback safety, urgent tickets, and trade follow-up, but it does not query or route pending account-closure requests. [2] The Closure Requests tab itself has strong count-only safeguards and required notes, but its absence from the daily command center can delay review of a member’s privacy/account request.

**Recommended narrow scope:** add a read-only pending-closure count and direct link to the existing Closure Requests tab. Do not alter closure decisions, records, or data-retention behavior.

### P2 — Remove or reframe the empty Settings tab

Settings is presented as a normal destination but currently only describes future controls. This makes the navigation look more complete than the available functionality and duplicates discoverability with Billing, Referrals, and Media Storage. [1]

**Recommended narrow scope:** either hide it until active controls are approved, or rename it **Configuration status** and list the live configuration locations without adding new settings.

### P2 — Improve safety/support case handling before multiple administrators work concurrently

Reports, Flagged, and Tickets are intentionally separate workflows, but they lack common investigation links and ownership features. Tickets lack administrator assignment and surfaced private notes; content-flag reviews do not currently create the same central activity-log record that feedback-safety decisions do; approvals lack a required visible decline reason. [1] [2]

**Recommended staged scope:** add safe deep links first, then assignment/notes, then unified audit-log coverage. Do not merge data tables or treat reports, content flags, feedback signals, and support conversations as interchangeable.

### P2 — Make long-running/high-volume work manageable

Several tab lists are capped or unpaged, including API Health, Mod Log, lifecycle/timeline views, reports, referrals, and support tickets. Referrals sends invitations sequentially, while Pre-Launch Email has stronger delivery-key/confirmation protections. [1] [2]

**Recommended staged scope:** add pagination/filtering and saved safe views first. Before large email campaigns, add referral audit events, delivery progress, a small administrator test-send, and a bounded/batched delivery design.

## Recommended navigation consolidation — without changing workflows

The current flat grid contains **20** visible tab labels. The safest improvement is not to merge tables or actions; it is to organize navigation into five groups while keeping each specialized workflow separate.

| Navigation group | Tabs to place within the group | Rationale |
|---|---|---|
| **Daily overview** | Operations, Stats, API Health | Operations becomes the daily starting point; Stats and API Health remain detailed destinations. |
| **Member lifecycle** | Users, Approvals, Closure Requests, Deleted, Billing | These all concern account eligibility, access, status, or history, but should preserve distinct data rules. |
| **Safety & support** | Reports, Flagged, Tickets, Mod Log | These share investigation context; each should retain its own resolution process and audit trail. |
| **Marketplace content** | Listings, Trades, Conventions, Media Storage | These concern public items/exchanges/event content/system media, but retain specialized controls. |
| **Communications & reference** | Referrals, Pre-Launch Email, Admin Guide, Settings/Configuration status | These are periodic communications or reference/configuration surfaces, not daily action queues. |

This approach reduces cognitive load without exposing new controls, moving records, or weakening safeguards. It can be delivered as a navigation-only change after approval.

## Missing capabilities, ordered by practical value

| Priority | Capability | Why it matters | Safe first implementation |
|---|---|---|---|
| 1 | Closure Request count in Operations | Prevents a pending member closure request from being overlooked. | Read-only count and link only. |
| 2 | Safe-deletion policy | Prevents loss of support/trade/member evidence from direct deletion flows. | Design/approval first; no UI shortcut. |
| 3 | Case ownership and internal notes | Avoids duplicate support/moderation work as the admin team grows. | Add ticket assignment and private notes with audit logging. |
| 4 | Investigation deep links | Lets an admin move safely from a report/flag/timeline event to the right record. | Read-only links with existing authorization checks. |
| 5 | List filters/pagination | Keeps queues usable and complete as records grow. | Server-bounded pagination and filters per tab. |
| 6 | Central action audit coverage | Makes sensitive actions traceable across tickets, flags, referrals, listings, and trades. | Add append-only administrator activity events. |
| 7 | Health alert thresholds | Reduces reliance on manual inspection of API/storage/schedule status. | Read-only threshold badges in Operations before notifications. |
| 8 | Communication test-send/history | Reduces risk when using referral or launch-email tools. | Administrator-only test send and immutable delivery summary. |

## Items deliberately not recommended for immediate activation

The Billing router has future-facing plan-feature capability that is not shown in the dashboard. That should **not** be exposed simply to make the tab look more complete. Tradebilia remains in Free Launch, and any paid enforcement, Checkout, billing-plan matrix, taxes, refunds, grace periods, or access restrictions require the previously documented separate readiness/approval process.

Likewise, a general “impersonate member” capability is not recommended now because it can expose private content and complicate audit boundaries. Prefer read-only, authorized deep links and count-only safety summaries first.

## Recommended next decision

Approve **one** narrow next implementation scope rather than a broad dashboard redesign:

1. **Recommended first:** Add pending Closure Requests to Operations and link directly to the existing queue. This is read-only and addresses the clearest daily-work gap.
2. **Then:** Design the safe-deletion/retention policy for user, trade, and ticket actions. This needs separate approval because it may involve migrations and operational rules.
3. **After that:** Apply navigation grouping and safe deep links. This consolidates the interface without merging distinct workflows or data.

## References

[1]: ./client/src/pages/AdminDashboard.tsx "Administrator Dashboard implementation"
[2]: ./server/routers.ts "Administrator procedures and Operations snapshot"
[3]: ./server/membership.ts "Membership and Fee Mode procedures"
[4]: ./client/src/components/AdminOperationsTab.tsx "Operations workspace"
[5]: ./client/src/components/AccountClosureRequestsTab.tsx "Account closure review workspace"
[6]: ./client/src/components/ReferralsTab.tsx "Referral administration workspace"
[7]: ./client/src/components/PreLaunchEmailTab.tsx "Pre-Launch Email workspace"
[8]: ./client/src/components/R2StorageHealthTab.tsx "Storage health workspace"
[9]: ./client/src/components/R2MediaMigrationTab.tsx "Public-media migration workspace"
