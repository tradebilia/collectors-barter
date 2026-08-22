# Tradebilia Whole-Site Reliability Audit

**Audit date:** August 21, 2026  
**Scope:** Public navigation and browsing, account flows, inventory, messaging and trades, member-facing workflows, Admin tools, email and notification paths, external integrations, runtime safety, and deployment behavior.

## Executive Summary

The application has a strong automated baseline: the complete suite passed with **351 tests passing and 4 intentionally skipped**, TypeScript completed without errors, and the production build completed successfully. The live runtime log sample did not contain unhandled error, timeout, email, or notification failures. The audit nevertheless found several **confirmed action-contract defects** where a user interface promise did not match the server behavior; the confirmed safe defects were corrected and covered by regression tests.

The most urgent issue is the inventory bulk-delete **Undo** control, which cannot restore rows after a hard deletion. The audit also found several medium-severity reliability issues that should be addressed before broad public launch.

## Confirmed Defects

| Priority | Area | Confirmed behavior | User impact | Evidence |
|---|---|---|---|---|
| Fixed | Inventory bulk delete | Bulk delete now makes listings inactive while retaining their attached photos; the existing Undo path can restore the listing IDs by reactivating them. | The visible Undo promise now matches the retained server data. | `server/db.ts` bulk-delete and restore paths; `server/reliabilityAuditRepairs.test.ts`. |
| Refuted as a live route | Standalone account verification | The component contains stale simulated handlers, but `/verify-account` is not registered in the current route map and rendered the application’s Not Found page during re-verification. Normal account setup uses the authenticated verification procedures instead. | No active customer flow currently reaches this component; it should be removed or deliberately registered only after a product-flow decision. | Current route screenshot and `client/src/pages/VerifyAccount.tsx`. |
| Fixed safely | Account deletion | The misleading dead self-service Delete Account control was replaced with an explicit reviewed account-closure request notice. A direct destructive deletion workflow remains intentionally deferred. | Members receive an honest next step without risking active trades, audit history, or account-safety records. | `client/src/pages/AccountSettings.tsx`; `server/reliabilityAuditRepairs.test.ts`. |
| Fixed | Communications preferences | The server contract now accepts and persists `messages` email/text preferences. | A member’s Messages notification preference is retained on save. | `server/routers.ts`; `server/reliabilityAuditRepairs.test.ts`. |
| Fixed | Item inquiry redirection | Compose now uses the returned inquiry record ID for the Messages query parameter. | A sent inquiry can resolve to the corresponding inquiry thread. | `client/src/components/ComposeMessageModal.tsx`; `server/reliabilityAuditRepairs.test.ts`. |
| Partially fixed | Draft inventory persistence | Existing draft photos are now preserved and removed intentionally rather than deleted and re-uploaded indiscriminately. The draft schema has no dedicated description field, so broader draft-content persistence needs a product/data-model decision. | Draft image updates no longer lose retained photos; richer draft fields remain a separate enhancement. | `server/db.ts` update-draft path. |
| Fixed | Listing photo removal | Members can now remove their own omitted listing photos; the update path removes only stored URLs excluded by the editor payload. | Removed photos no longer reappear after saving. | `client/src/pages/AddInventory.tsx`; `server/db.ts`; `server/reliabilityAuditRepairs.test.ts`. |

## Operational and Scale Risks

| Priority | Area | Finding | Recommended next step |
|---|---|---|---|
| Medium | Pre-Launch Email | Contact enrollment is sequential before a broadcast. This is reliable for a small list, but it may reach provider timeout limits as the list grows. | Use bounded concurrency and retry/backoff before large campaigns. |
| Low | Admin notifications | Owner notifications rely on the primary managed notification service. A failure currently has no secondary admin-email fallback. | Add a fallback email or persist a retryable admin alert. |
| Low | API Health coverage | `recordApiFailure` is actively used by IPQS and Parse integrations, but coverage is not yet uniform across all provider adapters. | Add provider-by-provider instrumentation as integrations are expanded. |

## Verified Working Areas

The audit did **not** find a confirmed broken route or dead-action contract in public browsing, category filtering, global search, public item detail, member directory, profiles, reports, referrals, ratings, Traders Showcase, Test AI, carrier adapters, or core trade transaction safeguards.

The public Coming Soon signup now writes to the **Tradebilia Pre-Launch Updates** Resend segment, and the Admin Pre-Launch Email workspace reads active recipients from that same segment. Signup does not send an immediate marketing email; an Admin broadcast remains an explicit separate action.

The account setup email verification path used during normal setup calls `auth.verifyEmailCode` before setting its verified state. This is distinct from the separate legacy `/verify-account` route noted above.

## Validation Evidence

| Check | Result |
|---|---|
| TypeScript | Passed (`pnpm check`) |
| Unit and integration suite | 351 passed, 4 skipped |
| Production build | Passed (`pnpm build`) |
| Production runtime log sample | No matching unhandled error, timeout, email, or notification failures in the reviewed sample |
| Whole-code audit | Eight independent functional areas reviewed, then high-confidence findings were directly verified against current source |

## Re-Verification Outcome

The audit findings were independently re-checked against the current source, test contracts, and route behavior before code changes were made. Bulk listing Undo, inquiry-thread routing, Messages preference persistence, member photo removal, draft-photo preservation, and the misleading Account Settings deletion control were **confirmed and repaired**. The standalone verification component was **refuted as an active route defect** because the current route map renders Not Found for `/verify-account`; it remains a legacy component rather than a live customer flow.

No direct destructive account deletion was added. The visible control now explains that account closure needs reviewed handling so active trades, audit history, and account-safety obligations are not removed unexpectedly. Rich draft-text persistence remains intentionally deferred because the current draft schema does not include a dedicated description field; that requires a separate product and data-model decision rather than a silent workaround.

## Limits of This Audit

This audit did not submit real marketplace transactions, delete real accounts/listings, send live marketing broadcasts, or send controlled user email/SMS messages. Those actions need explicit approval and a disposable test account or recipient. A passing automated test proves application behavior under covered conditions; it cannot independently prove every third-party provider’s real-time delivery status.

## Recommended Remediation Order

1. Decide whether to remove the unreachable legacy `/verify-account` component or explicitly register it as an alternative verification flow; it is not an active user-facing defect today.
2. Persist full draft item content with an approved data model for description and category-specific fields.
3. Design the Account Delete behavior deliberately: a destructive deletion flow, a reversible deactivation flow, or remove the control until either is approved.
4. Add the operational hardening items for pre-launch campaign scale, notification fallback, and provider-wide API Health instrumentation.
