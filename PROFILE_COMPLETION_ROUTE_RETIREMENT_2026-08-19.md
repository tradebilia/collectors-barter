# Profile Completion Route Retirement

**Implemented:** 2026-08-19

## Decision

The prior `/profile-completion` workflow has been retired. Its final submit path presented a success message and redirected to inventory even though the intended profile mutation was commented out. Keeping that form available could therefore lead a member to believe that personal information had been saved when it had not.

## Compatibility Behavior

The legacy URL remains supported for bookmarks and old links. It now renders only a brief redirect state and makes no account or profile write.

| Visitor state | Redirect destination | Reason |
|---|---|---|
| Not signed in | `/account-setup` | The established Account Setup page provides the appropriate sign-in and account-creation entry point. |
| Signed in without a saved Tradebilia profile | `/account-setup` | Account Setup remains the single authoritative first-time setup workflow. |
| Signed in with a saved Tradebilia profile | `/account-settings?tab=profile` | The Profile settings tab is the authoritative maintenance workflow for established members. |

The obsolete `ProfileCompletion.tsx` component was removed. No database schema, migrations, seed data, account records, or profile data were changed.

## Validation

The account-flow regression suite verifies the legacy route resolves to the redirect component, that the redirect distinguishes the authoritative setup and Profile destinations, that it uses replacement navigation, and that it contains no profile mutation. Development-browser verification confirmed an unauthenticated visit to `/profile-completion` lands at `/account-setup` rather than rendering the prior unsaved form.

Standard-domain verification completed after deployment propagation at `https://tradebilia.manus.space/profile-completion`. The public route briefly displayed the neutral redirect state and then arrived at `/account-setup` for an unauthenticated visitor, with no legacy form fields visible. Canonical GitHub `main` is synchronized at commit `560b555f`.
