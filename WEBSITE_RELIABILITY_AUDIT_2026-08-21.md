# Tradebilia Whole-Site Reliability Audit

**Audit date:** August 21, 2026  
**Scope:** Public navigation and browsing, account flows, inventory, messaging and trades, member-facing workflows, Admin tools, email and notification paths, external integrations, runtime safety, and deployment behavior.

## Executive Summary

The application has a strong automated baseline: the complete suite passed with **346 tests passing and 4 intentionally skipped**, TypeScript completed without errors, and the production build completed successfully. The live runtime log sample did not contain unhandled error, timeout, email, or notification failures. The audit nevertheless found several **confirmed action-contract defects** where a user interface promise does not match the server behavior.

The most urgent issues are the inventory bulk-delete **Undo** control, which cannot restore rows after a hard deletion, and the standalone account-verification route, whose verification and resend handlers are currently stubbed. Several medium-severity reliability issues should be addressed before broad public launch.

## Confirmed Defects

| Priority | Area | Confirmed behavior | User impact | Evidence |
|---|---|---|---|---|
| High | Inventory bulk delete | The delete operation permanently deletes listing and photo rows; the Undo action later updates those now-missing listing IDs, so it cannot restore them. | A member can believe a deleted item was restored when it was not. | `server/db.ts` lines 1779–1814; `client/src/pages/Inventory.tsx` undo flow. |
| High | Standalone account verification | The `/verify-account` page contains commented email and phone verification/resend calls; it advances local UI state without a server verification result. | A route user can see a completed verification state without an actual verified contact method. | `client/src/pages/VerifyAccount.tsx` lines 36–64. |
| Medium | Account deletion | The Account Settings **Delete Account** button has no handler, confirmation dialog, or server mutation. | A visible destructive control does nothing. | `client/src/pages/AccountSettings.tsx` lines 889–895. |
| Medium | Communications preferences | The client sends a `messages` email/text setting, but `market.saveCommunications` neither accepts nor stores it. | A member’s Messages notification preference is silently discarded on save. | `client/src/pages/AccountSettings.tsx` lines 1342–1356; `server/routers.ts` lines 1013–1043. |
| Medium | Item inquiry redirection | Compose success redirects with the recipient user ID, while Messages expects an inquiry record ID. | Sending an inquiry does not automatically open the new conversation as intended. | `client/src/components/ComposeMessageModal.tsx` lines 33–40; `client/src/pages/Messages.tsx` lines 251–262. |
| Medium | Draft inventory persistence | `saveDraft` accepts only core item fields and photos; it does not save the entered description, category-specific fields, or additional notes. | Draft content can be silently lost. | `server/db.ts` lines 1844–1884; Add Inventory draft inputs. |
| Medium | Listing photo removal | Non-admin updates retain database photo rows that the member has removed in the editor. | Removed listing photos can reappear after saving. | `server/db.ts` lines 2626–2707. |

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
| Unit and integration suite | 346 passed, 4 skipped |
| Production build | Passed (`pnpm build`) |
| Production runtime log sample | No matching unhandled error, timeout, email, or notification failures in the reviewed sample |
| Whole-code audit | Eight independent functional areas reviewed, then high-confidence findings were directly verified against current source |

## Limits of This Audit

This audit did not submit real marketplace transactions, delete real accounts/listings, send live marketing broadcasts, or send controlled user email/SMS messages. Those actions need explicit approval and a disposable test account or recipient. A passing automated test proves application behavior under covered conditions; it cannot independently prove every third-party provider’s real-time delivery status.

## Recommended Remediation Order

1. Repair inventory bulk-delete Undo by adopting a soft-delete/restore model, or remove the Undo promise.
2. Replace or fully wire the legacy `/verify-account` flow to server-side OTP verification and resend procedures.
3. Fix the Account Settings message-preference contract and the inquiry redirect ID contract.
4. Persist full draft item data and reconcile non-admin photo removals.
5. Design the Account Delete behavior deliberately: a destructive deletion flow, a reversible deactivation flow, or remove the control until either is approved.
6. Add the operational hardening items for pre-launch campaign scale, notification fallback, and provider-wide API Health instrumentation.
