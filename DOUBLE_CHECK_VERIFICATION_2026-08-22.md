# Fresh Double-Check Verification — 2026-08-22

## Result

The fresh read-only verification rechecked the current project release across security, data integrity, workflows, integrations, frontend behavior, responsiveness, accessibility, tests, and release state. Recent privacy, trade-participant, report-evidence, payment, password-session, valuation, listing-photo, inquiry-recipient, and forum-lock repairs remain present in the current source. No new P0 issue was confirmed.

| Classification | Count | Result |
|---|---:|---|
| Confirmed current issues | 7 | Require a targeted next repair decision. |
| Refuted or already protected | 10+ | Do not rework without new evidence. |
| Policy or schema dependent | 2 | Require an explicit data-model or product decision. |
| Testing/operational gaps | 5 | Need controlled browser, load, or live-provider validation. |

## Confirmed items missed by earlier implementation batches

| Priority | Finding | Plain-language explanation | Evidence |
|---:|---|---|---|
| 1 | Inquiry empty-trash can violate reply foreign-key integrity | Emptying deleted inquiries removes parent inquiries without first removing related inquiry replies. On a database that enforces the declared foreign key, this can fail; if it does not, it can leave orphan replies. | `server/db.ts`, `emptyDeletedInquiries()`; `drizzle/schema.ts`, inquiry-reply relation. |
| 2 | Sign-in modal is mounted twice on desktop | Two copies of the same modal render for a signed-out desktop visitor. This can create duplicate portals and focus-state conflicts. | `client/src/components/TopBar.tsx`. |
| 3 | Sign-in/signup and public tRPC routes lack general throttling | Password recovery is throttled, but general sign-in, signup, and other public API entry points are not. This leaves credential-stuffing and automated signup pressure unmitigated. | `server/routers.ts`; `server/_core/index.ts`. |
| 4 | Payment transaction IDs are not globally unique | The same verified PayPal transaction ID is not prevented at database level from being recorded on more than one proposal. | `drizzle/schema.ts`, `tradePayments`; `server/routers.ts`, `payment.verifyPayment`. |
| 5 | Some providers are not fully visible in API Health and lack bounded request policies | FedEx now records sanitized failures, but PayPal, eBay, Facebook, LinkedIn, UPS, and USPS do not consistently do so. Several OAuth/payment calls also lack explicit timeouts. | Provider modules and `server/apiHealth.ts`. |
| 6 | Expired-draft cleanup is not atomic | Scheduled cleanup deletes draft photo rows and drafts in separate statements, so an interruption can leave partial cleanup. | `server/db.ts`, `deleteDraftsOlderThan()`. |
| 7 | Accessibility gaps remain in sign-in and country controls | The custom sign-in modal lacks full dialog/focus semantics; the custom country selector lacks full keyboard/listbox behavior. | `client/src/components/SignInModal.tsx`; `client/src/components/CountrySelect.tsx`. |

## Items confirmed as repaired or not current defects

| Candidate | Verification result |
|---|---|
| Private report evidence access | Protected by owner/admin checks at the storage-proxy boundary. |
| Public profile exposure | Public profile projection excludes private account fields. |
| Inquiry reply and trade workflow outsider access | Participant checks remain enforced. |
| Provider OAuth state | Server generates a high-entropy state and writes a provider-specific HttpOnly cookie before returning the authorization URL. Client-side weak state code is redundant and should be cleaned up, but it does not control callback validation. |
| Password changes leaving old sessions active | Password-version validation invalidates prior custom-auth tokens after a password change or recovery. |
| Listing owner photo deletion/reordering | Already implemented in the owner-scoped listing update transaction. |
| Forum lock bypass | Reply write path rejects locked posts. |
| Valuation mixed currencies and duplicates | Non-USD evidence is excluded and duplicate evidence is removed before metrics. |
| Mobile layout failures reviewed earlier | No new source-level responsive regression found. |

## Clarifications

Referral invitations are sent through the existing administrator-controlled referral action, not by a background queue. The absence of a scheduled sender is therefore a workflow choice, not a confirmed delivery failure.

Independent per-user inquiry deletion and review reveal deadlines remain product/data-model decisions. The correct fix for independent inquiry retention requires separate sender and recipient deletion state; it should not be improvised with the current shared `deletedAt` column.

## Required verification outside a read-only source pass

The following should be exercised in controlled tests before launch: cross-user storage-proxy responses; successful provider-linking callback paths; payment transaction reuse across proposals; two-account browser trade/inquiry flows; rate-limit behavior; external provider timeouts; and keyboard/screen-reader behavior for dialogs and the country selector.

## Recommended next repair order

1. Make inquiry empty-trash transactional and child-safe.
2. Remove duplicate sign-in modal mounting and add proper dialog semantics.
3. Add safe, route-aware throttling for public authentication and high-abuse endpoints.
4. Add application and database protection against PayPal transaction reuse, subject to a reviewed non-destructive migration.
5. Centralize provider timeout, retry, and sanitized API Health telemetry.
6. Make draft cleanup transactional.
7. Complete keyboard and focus accessibility improvements.
