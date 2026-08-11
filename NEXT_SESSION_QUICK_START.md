# Tradebilia: Next Session Quick Start

> **Stop condition:** This is a handoff-validation session first. Do not start new feature work until Rich explicitly confirms the handoff is complete.

## 1. Establish the Correct Codebase

Clone the repository and verify that the checkout is clean before changing anything.

```bash
git clone https://github.com/tradebilia/collectors-barter.git
cd collectors-barter
pnpm install --frozen-lockfile
git status --short
```

The last command must show no uncommitted files. Then read `SESSION_HANDOFF_GUIDE.md`, `IMAGE_ASSET_INVENTORY.md`, and the **Session Transition Gate** at the top of `todo.md`.

## 2. Restore Secrets Securely

Use the project’s secure Secrets interface to restore configuration. Never place a raw value in Markdown, source code, `.env` committed files, a ticket, or chat.

| Priority | Environment variables |
|---|---|
| Required to access live data | `CUSTOM_DATABASE_URL` |
| Required for account setup SMS | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` |
| Required for Test AI data currently in use | `EBAY_PROD_CLIENT_ID`, `EBAY_PROD_CLIENT_SECRET`, `SOLD_COMPS_API_KEY`, `PARSE_BOT_API_KEY`, `TRADEBILIA_OPENAI_API_KEY` |
| Required before email/OAuth/payment testing | `RESEND_API_KEY`, Facebook/LinkedIn OAuth values, PayPal values, `ENCRYPTION_KEY`, `JWT_SECRET` |

Do not assume any current value is correct. Confirm the external database host and database name with Rich before connecting.

## 3. Verify Before Working

```bash
npx tsc --noEmit
pnpm test
pnpm dev
```

Inspect the dev server and browser logs. The test count can evolve; the acceptance requirement is that every test passes, TypeScript is clean, and the app uses the intended external database without connection errors.

## 4. Validate the Critical User Flows

Use the preview and authenticated test accounts as appropriate.

- [ ] Home page renders its animated Tradebilia hero and live listing cards.
- [ ] `/category/sports_cards` shows listings and filters without an endless spinner.
- [ ] `/verified-merchants` renders its hero and directory state.
- [ ] `/messages` renders for an authenticated user.
- [ ] `/admin/users` loads for an administrator.
- [ ] `/test-ai` is reachable only through the intended admin path and remains test-only.
- [ ] No fresh console or server errors appear.

## 5. Verify Asset Recovery Readiness

The runtime retains static assets and user media in project object storage. The GitHub recovery release is a backup for **static design assets only**:

```text
Release: tradebilia-static-assets-2026-08-11
Archive SHA-256: 182292f179319e64610d25c273018df8d3665c225b34870335d0c0651a78528c
```

Do not move listing photos or avatars into GitHub. If a static image fails, use the asset inventory and recovery release to restore that one asset through project storage, then update its source reference and re-test.

## 6. Get Rich’s Approval Before Resuming Work

Present the completed validation checklist to Rich. Only after Rich says the handoff is correct may you mark the two blocking entries in `todo.md` complete and begin the next approved task. The first known open defect is the Messages inquiry-reply alert incorrectly notifying the replier; it must remain paused until then.

For the complete architecture, credential registry, database safeguards, and recovery procedures, use `SESSION_HANDOFF_GUIDE.md`.
