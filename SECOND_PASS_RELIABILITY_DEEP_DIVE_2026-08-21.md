# Tradebilia Second-Pass Reliability Deep Dive

**Prepared by:** Manus AI  
**Scope:** A second independent review of route reachability, permissions, private data exposure, messaging and trade actions, account setup, email and notification paths, external integrations, and operational resilience.  
**Baseline:** The current suite completed with **351 passing tests and 4 intentionally skipped tests**. The production build completed successfully. Recent runtime logs did not show unhandled application exceptions.

> This report lists only issues independently confirmed in the current source after the first audit. It deliberately separates **working features**, **confirmed flaws**, and **product-policy decisions** so that a useful safety improvement is not confused with a preference.

## Plain-Language Summary

The second review found **three high-priority permission or privacy defects**, **three medium-priority broken or misleading user actions**, and several lower-priority resilience improvements. The most important findings are that a public profile endpoint returns private contact fields, any signed-in member can dispute another member’s trade by guessing its ID, and any signed-in member can request replies from an inquiry they do not own.

The automated test and build baseline is healthy, but these flaws are not fully covered by the current tests because they are primarily **authorization and data-projection gaps**, rather than ordinary happy-path failures.

| Priority | Verified finding | Simple consequence | Recommended response |
|---|---|---|---|
| **P0** | Public profile contact-data exposure | A visitor can receive account email and linked social-email fields from a public profile request. | Restrict the public SQL projection to explicit public fields. |
| **P0** | Unauthorized trade complaint filing | A signed-in user can mark a trade they do not participate in as disputed. | Verify that the caller is the requester or recipient before writing a complaint. |
| **P0** | Unauthorized inquiry reply retrieval | A signed-in user can request replies for an inquiry they do not participate in. | Verify inquiry participation before returning any replies. |
| **P1** | Four navigation links target routes that do not exist | Users can land on a Not Found page from Settings, location, or password-recovery actions. | Redirect all four callers to registered routes. |
| **P1** | Legacy Account Setup verification modal bypass | A reachable duplicate modal can locally mark an email verified with any four characters. | Remove the duplicate modal or route it through the existing server verification mutation. |
| **P1** | “Clear cache” is not admin-only and does not clear a cache | Any signed-in user can receive a misleading success response. | Gate it to admins and implement it, or remove/hide the action. |

## Confirmed High-Priority Findings

### 1. Public profiles return private contact and account fields

The public `market.getUserProfile` procedure is available without authentication but selects `u.email`, `u.facebookEmail`, `u.linkedinEmail`, activity timestamps, and a broad `SELECT *` profile record. The Public Profile page can therefore receive fields that should not be available to ordinary visitors.

**Why this matters:** A member’s personal email and linked-account contact data should not be exposed merely because someone knows or can enumerate a profile ID. This is the most direct privacy finding in the review.

**Safe correction:** Replace the broad public query with an explicit allow-list of display name, public avatar, public bio, public social links chosen for display, ratings, and listings. Do not return account email, linked account email, access-token-adjacent fields, or internal activity timestamps.

**Evidence:** `server/routers.ts`, `market.getUserProfile`, particularly the projection at lines 623–668 and the unrestricted profile fetch at lines 678–680.

### 2. A non-participant can file a complaint on another member’s trade

`fileComplaint` inserts a complaint and changes a trade proposal to `disputed` using only the supplied proposal ID. Unlike the adjacent review code, it does not load the proposal or confirm that the caller is one of its two participants.

**Why this matters:** A signed-in user could disrupt an unrelated trade if they know or guess its numeric proposal ID.

**Safe correction:** Load the proposal first; return Not Found for a nonexistent proposal and Forbidden unless the caller is the requester or recipient. Then insert the complaint and change status within the same transaction.

**Evidence:** `server/tradeFlowRouter.ts`, lines 853–868. The immediately following review handler shows the intended participant-check pattern.

### 3. A non-participant can retrieve private inquiry replies

`inquiries.getReplies` is protected only by sign-in, then calls `getRepliesByInquiry(inquiryId)` without passing the current user. The database helper filters by inquiry ID only.

**Why this matters:** Inquiry messages are private negotiations. A signed-in user could request another inquiry’s replies by supplying its ID.

**Safe correction:** Verify that the caller is the inquiry sender or recipient before selecting replies. The database helper can receive `userId`, or the router can perform the ownership check first.

**Evidence:** `server/routers.ts`, lines 1682–1686; `server/db.ts`, lines 3791–3821.

## Confirmed Medium-Priority Findings

### 4. Multiple live links target routes that are not registered

Four active controls target routes absent from `App.tsx`:

| Where the member clicks | Current target | Registered destination that should be used |
|---|---|---|
| Own Public Profile | `/settings` | `/account-settings` |
| Homepage convention location prompt | `/account` | `/account-settings` or a dedicated profile/location route |
| Forgot Password “Back to Sign In” | `/signin` | The actual authentication entry route |
| Reset Password “Sign In” | `/signin` | The actual authentication entry route |

**Why this matters:** Each action can send a member to Not Found instead of the promised page. The password-flow links are especially confusing immediately after a successful reset.

**Safe correction:** Standardize route constants and replace the outdated strings. The exact sign-in destination should reuse the application’s existing login entry mechanism rather than adding a redundant route.

**Evidence:** `client/src/App.tsx`; `client/src/pages/PublicProfile.tsx`; `client/src/pages/Home.tsx`; `client/src/pages/ForgotPassword.tsx`; `client/src/pages/ResetPassword.tsx`.

### 5. The duplicate Account Setup email modal has a local verification bypass

The active Account Setup page already includes a correct inline email-code flow that calls a server mutation. However, the same `showEmailVerification` state also renders a legacy modal whose Verify button marks the address verified when the typed code has four or more characters, without calling the server. Its Resend action only displays a toast.

**Why this matters:** The page contains two competing verification experiences. One is real; the other can create a false verified state and confuse the account-setup process.

**Safe correction:** Remove the legacy modal entirely, or replace its handlers with the existing `handleVerifyEmail` and `handleSendEmailCode` functions. Keep only one verification UI.

**Evidence:** `client/src/pages/AccountSetup.tsx`, active server-backed handler at lines 314–340; legacy modal at lines 1153–1217.

### 6. The market-data “Clear cache” operation is misleading and not admin-restricted

The source labels `clearCache` as “admin only,” but it uses an ordinary protected procedure, does not inspect the member role, and returns a success message without clearing a cache.

**Why this matters:** Any signed-in member can invoke an admin-labeled operation and be told something happened when it did not.

**Safe correction:** If cache clearing is needed, enforce `admin` role and connect it to the actual cache. If no runtime cache exists, remove the mutation and its UI rather than returning a false success state.

**Evidence:** `server/_core/marketDataRouter.ts`, lines 204–223.

## Verified Resilience Improvements, Not Current User-Facing Failures

The following items are real technical risks, but the review did **not** find evidence that they are currently breaking a member flow. They should be planned after the permission and route fixes above.

| Item | Plain explanation | Suggested future work |
|---|---|---|
| API Health coverage | Only Parse and IPQS currently record structured provider failures; carriers, PayPal, and some metadata services do not appear in the Admin API Health list. | Add a shared failure wrapper around each external adapter. |
| Pre-Launch broadcast enrollment | Contacts are enrolled in the Resend segment one at a time before a broadcast. This works for a small list but can become slow as the list grows. | Use bounded concurrency and retain per-contact failure reporting. |
| Owner notification fallback | The owner notification helper returns `false` if the managed notification provider is unavailable. | Add a fallback destination or a persistent retry queue once an owner-alert policy is chosen. |
| Transactional email result handling | The email helper can return `false`; some callers intentionally continue instead of retrying. | Decide which business events must retry, fail visibly, or simply log delivery failure. |

## Items Rechecked and Excluded From the Defect List

The following should not be treated as new live flaws.

| Item | Result of re-check |
|---|---|
| Inventory bulk delete/Undo | Repaired in the first audit. Listings are deactivated and can be restored. |
| Member photo removal and draft-photo preservation | Repaired in the first audit. Omitted photos are removed on save and draft photos persist. |
| Standalone `/verify-account` component | It is not registered in the active route map, so it is dead legacy code rather than a live verification bypass. It should be removed or aliased in a cleanup task. |
| Account connection service choices | Current copy frames external service choices as placeholders rather than pretending they are connected OAuth integrations. |
| Watchlist and category/global search basics | The reviewed ownership and filtering contracts were consistent with their current user-interface behavior. |

## Decisions That Need Product Direction

Some findings should not be “fixed” automatically because the correct behavior is a product policy decision.

1. **Delete Direct Message / Delete Inquiry:** The current shared deletion behavior can remove a thread from both people. Tradebilia should decide whether deletion means “hide for me” or “erase for both.” I recommend **hide for me** with per-user deletion timestamps.
2. **Account deletion:** The current UI now honestly requests review rather than promising an unsafe self-service deletion. Before implementing deletion, decide whether closed accounts are deactivated, anonymized, or removed and how completed trades, reports, payments, and legal retention are handled.
3. **Rich inventory drafts:** Draft photos persist, but descriptions and extended item fields need a deliberate data-model expansion before promising full multi-step draft recovery.

## Recommended Fix Order

1. **Immediately:** Fix public profile data projection, trade complaint participant checks, and inquiry-reply participant checks. These are privacy or authorization issues.
2. **Next:** Repair route strings, remove the legacy Account Setup modal, and correct or remove the cache-clear action. These are visible member-facing reliability issues.
3. **Then:** Add shared API Health instrumentation and bounded pre-launch enrollment. These improve operational reliability as the platform grows.
4. **After a product decision:** Implement per-user message/inquiry deletion, account closure policy, and full rich-draft persistence.

## Verification Record

The second-pass review combined independent static review across nine functional areas, direct source verification of high-severity candidates, a fresh test run, a production build, and recent runtime-log review. No production database migrations, destructive database scripts, or test subscriber records were created.
