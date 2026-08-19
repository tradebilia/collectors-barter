# Account Creation and Setup Flow Repair

**Implemented:** 2026-08-19
**Scope:** The existing Create Account page and four-step Account Setup experience were preserved. No user account, profile, phone verification, or production database record was created or modified during validation.

## Corrected Member Journey

| Stage | Before repair | After repair |
|---|---|---|
| Create Account | Created an authenticated account. | Creates one authenticated account with required username, display name, email, and password. |
| Post-signup handoff | Invalidated the auth cache, then routed to Account Setup; the destination could briefly see an unauthenticated state. | Refetches the authenticated session before routing to Account Setup. |
| Account Setup completion | Attempted `auth.signup` again with the already-created username, then tried to save the profile. | Saves profile and setup data only to the already authenticated account. |
| Phone verification | Public procedure returned a browser-only success flag. | Authenticated procedure persists the approved normalized phone to the signed-in member’s first-time profile. |
| Completion safeguards | Earlier UI checks could be bypassed by jumping to the final review step; the server trusted client verification flags. | Final server save requires accepted terms, a matching persisted verified phone, security question/answer, and complete merchant-request fields when selected. |

## Preserved Experience

The established multi-step flow remains intact. The first setup step captures core identity and verified phone information; the optional second step describes future external-account connections truthfully; the third step retains avatar and collection choices; and the final step remains the review and completion action.

Password fields were removed from Account Setup because password creation belongs exclusively to Create Account. The setup username is now read-only, reinforcing that the authenticated account already exists. The previous clickable development step buttons were replaced with a passive step-progress indicator so required checks cannot be skipped by navigation.

## Verification and Merchant Safeguards

Phone verification is now tied to the authenticated new member. An approved verification result is persisted on the server, and Account Setup completion compares the submitted normalized phone to that persisted verified phone. Browser-supplied `phoneVerified` and `emailVerified` values are not trusted for completion.

Selecting the merchant option now creates a **merchant verification request**, not an immediate verified badge. Required business fields are validated at both the final setup UI and the server boundary. The administrator-controlled merchant-verification status is unchanged.

## Validation

Focused account-setup tests cover server-persisted verification, normalized phone matching, terms acceptance, recovery-question requirements, merchant-request requirements, one-time signup routing, no duplicate Account Setup signup call, non-bypassable progress navigation, and required Create Account email behavior.

TypeScript passed. The full suite passed with **87 test files passed, 1 skipped; 277 tests passed, 4 skipped**. The production build passed. A direct unauthenticated Account Setup visual check correctly presents a clear **Create Account to Continue** entry rather than the prior legacy creation form. The authenticated completion action remains intentionally unexercised in validation to avoid creating or changing a real member record.
