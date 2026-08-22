# Admin Dashboard Tab Audit — 2026-08-22

## Scope and verification method

This was a **read-only audit** of the Admin Dashboard. The review inventoried all sixteen visible tabs, traced their tRPC queries and mutations into the current server procedures, reviewed loading, empty, error, authorization, and destructive-action paths, and attempted to open the live Admin route without performing any mutation. The browser session was signed out and the Admin route redirected before tab controls could be exercised, so the findings below are source-verified; the marked browser checks still require an authenticated administrator session.

| Result | Count | Meaning |
|---|---:|---|
| Confirmed defects | 8 | Current source behavior can mislead an administrator, hide data, or permit an unsafe action. |
| Verified working or intentional controls | 13 | Source behavior is implemented and protected as expected. |
| Browser or live-data verification remaining | 5 | Cannot be proven through source inspection alone. |

## Confirmed defects

| Priority | Tab | Finding | Plain-language impact | Evidence |
|---:|---|---|---|---|
| P1 | Trades | Recipient usernames are never selected by `admin.getAllTrades`, but the table renders `recipientUsername`. | Every trade recipient appears as `-`, so the trade audit list is incomplete. | `server/routers.ts`, `getAllTrades`; `client/src/pages/AdminDashboard.tsx`, Trades table. |
| P1 | Settings | The tab is an explicit “coming soon” placeholder and has no query, setting controls, save action, or persistence. | The Settings tab does not currently function as a management tab. | `client/src/pages/AdminDashboard.tsx`, Settings tab. |
| P1 | Conventions | Pending submissions are rendered as “No pending convention submissions” while the query is still loading. | The administrator can be told the queue is empty before data arrives. | `ConventionsAdminTab`, `pendingQuery.data ?? []` and empty-state branch. |
| P1 | Support Tickets | The Delete button immediately runs the destructive delete mutation with no confirmation dialog. | A support ticket and all of its replies can be permanently removed with one accidental click. | `SupportTicketsTab`, Delete button; `admin.deleteTicket` removes replies and parent ticket. |
| P2 | Conventions | Scraper errors use browser `alert()` while the rest of the platform uses visible in-app toast feedback. | Error feedback is inconsistent and can be blocked or missed in browser contexts. | `ConventionsAdminTab`, scraper mutation `onError`. |
| P2 | Referrals | Bulk referral email is deliberately sequential. | Larger selected batches can run long enough to hit a request timeout, leaving only part of the selection sent. | `admin.sendBulkEmailToReferrals`, sequential `for...of` loop. |
| P2 | Moderation, Tickets, Flagged, Approvals, API Health | Several primary queries show loading and empty states but no `isError` state. | A failed request can look like an empty result or leave the administrator without a recovery message. | `AdminDashboard.tsx` and embedded tab components. |
| P3 | Statistics | The four statistic cards work, but the “Platform Overview” section is a text placeholder rather than actual analytics. | The tab is only partly implemented; administrators do not receive the charts/details promised by the panel. | `AdminDashboard.tsx`, Statistics tab. |

## Verified working or intentionally scoped controls

| Tab or concern | Verification result |
|---|---|
| Admin access | The route has a client-side denial screen, queries are enabled only for an admin role, and reviewed server procedures independently reject non-admin callers. |
| Users | Search, status and merchant filters, sorting, User ID, item count, online status, account actions, and merchant verification are wired to the relevant data and mutations. |
| Listings | Search, sorting, individual deletion, bulk selection, bulk deletion confirmation, and empty/loading states are present. |
| Trades | Loading, empty, status, dates, requester, listing title, and confirmed-delete flow are implemented; only recipient display is incomplete. |
| Deleted | The query and display of deleted-account records are present. |
| Reports | Evidence parsing supports current JSON and legacy text; report updates refetch. The missing “return to pending” action is a workflow policy choice, not a defect. |
| Referrals | Single and bulk deletion controls exist, matching the intended admin workflow. |
| Pre-Launch Email | Recipient count, loading and empty states, send action, and error toast are implemented. |
| Media Storage | Migration and storage-health components exist and contain query/mutation error handling. |
| Conventions authorization | The active procedures apply manual admin checks. Using `publicProcedure` is inconsistent architecture but does not bypass the actual role check. |
| Moderation Log | It has a loading state and displays the available log actions. Missing colors for a few action names are presentation polish rather than a functional defect. |
| Flagged Content | Status filtering, loading/empty states, review actions, and success/error feedback are implemented. |
| Approvals and API Health | Both are role-gated, refetch-aware, and display the intended IPQS/API-health data without provider secrets. |

## Browser and live-data checks still needed

| Area | Required check |
|---|---|
| Each tab | Sign in as an administrator and open each tab once to confirm real data renders, rather than only its source wiring. |
| Trades | Confirm recipient names appear after the server query repair. |
| Referrals | Exercise a controlled, non-production recipient batch to observe duration and partial-send recovery. |
| R2 media controls | Verify migration and health actions against safe, non-destructive data. |
| API Health and approvals | Confirm refetch behavior after a real provider-failure event and review decision. |

## Recommended repair order

1. Select and display the trade recipient username.
2. Add a confirmation dialog before deleting a support ticket.
3. Add real loading and error treatment to Conventions and all affected administrative data panels.
4. Replace sequential referral sending with bounded concurrency and a precise delivered/failed summary.
5. Replace the Settings placeholder with either implemented scoped controls or hide the tab until its first supported setting exists.
6. Decide whether the Statistics tab should contain actual analytics now or have its unfinished overview section removed.

## Audit limitation

The Admin browser audit is incomplete because the available browser session is not authenticated as an administrator. No mutation, deletion, scraper run, email send, media migration, or approval action was executed during this audit.
