# Items to Address When Starting a New Session

This document is the operational handoff for a future Tradebilia session. Read it **before** code, database, asset, secret, or deployment work. It captures the issues discovered when the project was moved into this managed development workspace, the safeguards that prevented repeat failures, and the unresolved risks that require deliberate approval.

> **Core lesson:** a new sandbox, a new WebDev project, GitHub, project object storage, and the external database are different persistence boundaries. Treating any two of them as interchangeable causes broken media, mismatched schemas, missing configuration, or accidental live-data changes.

## 1. Required startup order

| Order | Required action | Why it matters |
|---:|---|---|
| 1 | Confirm the active project, its managed path, live domain, and GitHub repository before editing anything. | A new project has a different storage namespace and can lose static asset references. |
| 2 | Read this document, `todo.md`, `VALIDATION_NOTES.md`, `SCHEMA_COMPATIBILITY_AUDIT.md`, and the current project handoff materials. | These files explain the current safeguards, migration history, and known legacy-schema gaps. |
| 3 | Verify secret **names and presence** only through secure project settings. Never open, print, copy, or commit `.project-config.json`, database URLs, API keys, encryption keys, or OAuth secrets. | Secrets are runtime configuration, not source code or handoff data. |
| 4 | Confirm that `CUSTOM_DATABASE_URL` targets the intended external Tradebilia database. Perform read-only checks before any feature action that could write. | This database contains real users, listings, photos, messages, inquiries, and trades. |
| 5 | Run `pnpm check` and the full Vitest suite, inspect server/browser logs, and confirm the live site’s active deployment has propagated. | Deployment and browser bundle propagation can lag behind a successful checkpoint. |
| 6 | Test representative public, authenticated, sender-side, and recipient-side flows before changing a feature. | The same UI can behave differently by account role, message direction, and cached data. |
| 7 | Add a targeted regression test, verify visually, update `todo.md`, checkpoint, then push the matching credential-safe code to GitHub. | It prevents reintroducing migration defects and keeps the project/GitHub records aligned. |

## 2. Project, storage, and asset continuity

| Area | What failed during the move | Rule for the next session |
|---|---|---|
| Static hero and title artwork | A separate project/storage namespace left original image paths broken. | Store static images in `/home/ubuntu/webdev-static-assets/`, publish them through managed web storage, and use the returned durable URL exactly. |
| Homepage, category, and page-title images | Category backgrounds, title graphics, and page headers required restoration. | Do not replace a missing image with a random substitute. Match the supplied asset to its documented page/category destination. |
| Animated navigation logo | The top-left mark was accidentally reduced to a static/icon-sized treatment. | Preserve `AnimatedLogoSmall70.tsx` exactly: full inline SVG, `viewBox="0 0 1300 216"`, `preserveAspectRatio="xMinYMid meet"`, full-width/height styling, and the 650px TopBar container placement. |
| Email header logo | The direct-message email used an obsolete image path that Outlook could not load. | Every notification email must use the durable Tradebilia logo URL from the current shared email template; verify the URL returns `200`. |
| Listing and avatar media | These paths are database-backed user media, not Git assets. | Never copy customer photos or avatars into GitHub. Repair only the affected database reference after verifying the correct replacement and obtaining approval. |
| Barry Sanders listing | One legacy photo reference failed while a durable replacement already existed. | Listing `#1110009` now has a repaired reference. If it breaks again, update only the inaccessible row; do not delete unrelated photo records. |

## 3. Database safeguards and legacy-schema compatibility

The external database is intentionally not assumed to match every current Drizzle definition. A live schema audit identified compatibility gaps. Do not run migrations, seeders, bulk updates, or destructive scripts without Rich’s explicit approval.

| Area | Current state | Required next-session behavior |
|---|---|---|
| Direct-message threads | The live table lacks `itemId` and database timestamp defaults expected by the newer schema. | The application now uses an explicit legacy-compatible insert naming only participant IDs and timestamps. Do not revert this to a generic ORM insert unless the live schema is migrated deliberately. |
| New direct-message creation | The initial migration error was caused first by an `itemId` lookup, then by ORM insertion of `itemId DEFAULT`, then by missing timestamp defaults. | Preserve the direct-message persistence adapter and its router-level regression tests. Test both first-message thread creation and subsequent thread reuse after any messaging change. |
| PayPal verification | `tradePayments` is missing fields used by the payment verification route. | Do not operate or test PayPal verification until an approved migration or a legacy-compatible payment persistence path is implemented. |
| eBay OAuth/profile refresh | The `users` table lacks extended eBay feedback fields expected by current code. | Do not complete an eBay account connection or profile refresh until an approved migration or fallback is implemented. |
| Read-only baseline | The original validation baseline was 3 users, 4 profiles, 15 listings, 25 photos, 1 inquiry, and 1 trade proposal. | Treat counts as a sanity check only; stop and report unexplained changes rather than assuming a fixed production dataset. |

## 4. Messaging behavior that must remain intact

| Concern | Current requirement |
|---|---|
| Unread alerts | Inquiry replies must alert only the recipient, never the person who sent the reply. Direct-thread and inquiry reads must invalidate unread counts. |
| Display names | Use profile display name first, then username/account identity, and use `Collector {id}` only as the final fallback. Apply this across direct messages, inquiries, replies, active/deleted folders, emails, and notifications. |
| Item inquiries | Keep the unified folder with **All / Received / Sent** subfilters. Cards use `To:` or `From:` first, then the inquiry context, direction badge, subject, and timestamp. |
| Direct messages | Keep the unified Direct Messages folder with **All / Received / Sent** subfilters based on the latest-message direction. Cards use `To:` or `From:` first, followed by **Direct Message**, **Sent/Received**, subject, preview, and timestamp. |
| Conversation detail | Outgoing threads say **Conversation to [name]**; incoming threads say **Conversation from [name]**. Do not hide direction in the body alone. |
| Initial list state | Do not pre-highlight a message merely because the Messages page loaded. Selection should follow a deliberate user action or an explicit deep link. |
| Email notifications | Direct-message emails need the durable Tradebilia logo header, sender display name, subject, body, and a working View Message & Reply link. |

## 5. Integration and live-mode configuration

Rich explicitly requested that staging mode be disabled. Do not silently change that decision in a future session.

| Configuration area | Current condition | Next-session rule |
|---|---|---|
| `TRADEBILIA_STAGING_MODE` | Disabled at Rich’s direction. | Confirm the desired operating mode with Rich before changing it. Live mode permits real external provider behavior. |
| Resend and Twilio | Controlled email and SMS validation was performed. | Obtain explicit test-recipient approval before sending future test messages. Never store recipients in project files or test fixtures. |
| Facebook and LinkedIn OAuth | Callback variables are configured; authorization starts reach the providers. | Third-party sign-in pages cannot be embedded in the WebDev preview. Use a visible connected browser for actual account consent. |
| eBay OAuth | Authorization starts correctly, but profile completion remains blocked by the legacy eBay user-column gap. | Do not complete consent until the schema/fallback issue is resolved. |
| PSA and OpenAI | Current tested keys did not authorize. | Rotate or replace them through secure settings; never paste or commit values. |
| GoCollect | No safe account-specific validation endpoint was available during the validation pass. | Obtain the provider’s supported read-only endpoint before declaring the credential functional. |

## 6. GitHub, checkpoints, and deployment

| Safeguard | Required behavior |
|---|---|
| Source repository | Use `tradebilia/collectors-barter` on `main`. Interact through the configured GitHub connection and keep credentials out of remote URLs and commits. |
| Commit scope | Include source, tests, and safe documentation only. Exclude secrets, `.project-config.json`, `node_modules`, logs, storage downloads, temporary scripts, migrations/seeders unless explicitly approved, and customer media. |
| Validation before commit | Run `pnpm check`, relevant tests, the full suite when practical, and a credential-pattern/whitespace review. Environment-dependent provider tests must be deterministic and must not make live network calls during normal test runs. |
| Checkpoints | Checkpoints auto-publish in this project. Create one only after reading `todo.md` and confirming the intended changes are validated. Expect a brief propagation delay before production bundles change. |
| Deployment verification | Use cache-busted URLs and inspect both the rendered UI and served bundle when a live page appears stale. Do not assume a successful checkpoint instantly updates every browser. |

## 7. Required tests and verification patterns

Every behavior change needs a focused Vitest test and TypeScript validation. Screenshots help with hierarchy and layout, but they do not replace tests.

| Change type | Minimum verification |
|---|---|
| Database compatibility | Read-only schema check, regression test against the legacy shape, and an approved end-to-end action if the operation writes real data. |
| Messaging | Sender and recipient direction, first-message creation, thread reuse, unread state, display-name fallback, list/detail copy, and email template content. |
| Assets | Durable asset URL `200` check plus desktop/mobile visual inspection. |
| OAuth/integrations | Provider authorization start, callback configuration, and explicit approval before live consent, payment, email, or SMS behavior. |
| Live UI | Development and production view, appropriate authenticated role, cache-busted reload after deployment, and browser/server-console check when data appears stale. |

## 8. First-session checklist

- [ ] Confirm the active Tradebilia project and managed checkout path.
- [ ] Read this document, `todo.md`, `VALIDATION_NOTES.md`, and `SCHEMA_COMPATIBILITY_AUDIT.md`.
- [ ] Verify secure secret **presence** and the intended external `CUSTOM_DATABASE_URL`; never reveal raw values.
- [ ] Decide with Rich whether live mode or staging safeguards should apply before any external action.
- [ ] Run TypeScript and the full test suite; inspect server and browser logs.
- [ ] Perform a read-only database sanity check before any write-capable flow.
- [ ] Confirm representative hero/title assets, a listing cover image, an avatar, and the animated top-bar logo load.
- [ ] Test Messages with sender and recipient perspectives before modifying messaging behavior.
- [ ] Consult the legacy-schema risk table before using direct messages, PayPal verification, or eBay OAuth completion.
- [ ] Obtain Rich’s explicit approval before migrations, database writes outside an approved flow, real notifications, payments, OAuth consent, or media replacement.
- [ ] Update `todo.md`, add tests, create a checkpoint, then make a credential-safe GitHub commit and push after each approved change.

## 9. Reference materials

| Resource | Purpose |
|---|---|
| [Tradebilia source repository](https://github.com/tradebilia/collectors-barter) | Source-control baseline and release history. |
| [Tradebilia live site](https://tradebilia.manus.space) | Current deployed behavior. |
| `CURRENT_PROJECT_HANDOFF.md` | Original separate-development transition direction. |
| `NEXT_SESSION_QUICK_START.md` | Existing-project restart and acceptance guidance. |
| `SESSION_HANDOFF_GUIDE.md` | Detailed persistence, storage, credential, and database background. |
| `SCHEMA_COMPATIBILITY_AUDIT.md` | Current legacy-schema risks and required compatibility posture. |
| `VALIDATION_NOTES.md` | Evidence from recent validation and deployment checks. |
