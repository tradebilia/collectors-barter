# Account Recovery Upgrade

**Implemented:** 2026-08-19
**Scope:** Security questions were retired from active setup and account settings. Recovery now depends on the account email and phone that are verified during the existing four-step Account Setup flow. No database migration, seed script, live recovery message, or user-record modification was performed during validation.

## Recovery Methods

| Method | Member path | Server-side safeguard |
|---|---|---|
| Verified email | `/forgot-password` → Verified Email → password-reset link → `/reset-password` | A 32-byte opaque token is generated, only its SHA-256 hash is stored, the link expires after 30 minutes, and completing recovery deletes every reset token for that member. |
| Verified phone | `/forgot-password` → Verified Phone → provider verification code → choose new password | The server looks up only a profile with a persisted approved phone, checks the provider’s approved result, then updates the password and invalidates email reset tokens. |
| Account setup | Email code and phone code in the existing first setup step | Completion requires terms acceptance, a verified account email matching the original account email, and a matching persisted verified phone. Browser verification flags are not trusted. |

## Privacy and Abuse Controls

Public recovery requests always return the same generic success response, whether or not a matching verified account exists. This prevents callers from using the screen to discover account membership. Recovery request attempts are bounded to three per identifier within a 15-minute in-process window. Email reset tokens are opaque, hashed before database storage, single-use, and expire after 30 minutes. Email OTP attempts are capped and expired OTPs are removed.

The in-process rate limiter is intentionally a first application-layer control. Provider-level mail/SMS rate limits remain active. A future multi-instance scale-up should move rate-limit state to shared durable infrastructure, but that is not required for the current deployed architecture.

## Retired Security Questions

Account Setup no longer displays or submits security questions. Account Settings no longer offers a save-question control and instead directs members to verified contact recovery. The deployed legacy profile columns remain untouched because no migration was approved; existing historical values are ignored and never rendered or used for recovery.

## Setup and Recovery Screens

The recovery screen now offers **Verified Email** and **Verified Phone** tabs. The reset-link destination is a dedicated route that accepts an opaque token and never displays the token. Account Setup’s email field is the read-only account email, with a send/verify code control and an explicit explanation that verified email and phone are the recovery methods.

Existing authenticated members can open **Account Settings → Security → Verify Recovery Contacts** to enroll their existing Tradebilia email and persisted phone for the same recovery methods. This permits a safe transition away from historical security questions without exposing prior answers or relying on a data migration. If a member does not have a usable persisted phone, support remains the appropriate route to correct protected identity information before phone recovery can be enabled.

## Validation

Focused tests cover normalized verified contacts, untrusted browser-flag rejection, merchant-request requirements, opaque token hashing, expiry, timing-safe text equality, recovery-request limits, the sign-in recovery entry point, and retired security-question source removal. The full suite passed with **88 test files passed, 1 skipped; 282 tests passed, 4 skipped**. TypeScript and the production build passed. Public development views of Forgot Password, Reset Password, and unauthenticated Account Setup rendered correctly; no recovery request or setup submission was sent during testing.
