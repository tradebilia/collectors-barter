# Cloudflare Secrets Store — UPS Tracking Handoff

**Verified:** October 24, 2026

## Purpose

Tradebilia’s sandbox now uses Cloudflare Secrets Store as the runtime owner of the UPS Client ID and UPS Client Secret. The sandbox does not contact UPS directly and does not receive the UPS credentials. It calls a protected Cloudflare Worker, and that Worker reads the UPS secrets, obtains the UPS OAuth token, calls the UPS Track API, and returns only the tracking response needed by Tradebilia.

## Runtime architecture

```text
Tradebilia sandbox
  -> Cloudflare Access service-token headers
  -> tradebilia-secret-connection-test.rtavani.workers.dev
  -> Cloudflare Secrets Store: UPS_CLIENT_ID + UPS_CLIENT_SECRET
  -> UPS OAuth client-credentials endpoint
  -> UPS Track API
```

The deployed Worker source is versioned at `cloudflare/tradebilia-ups-worker.js`. Its public root response is a non-secret readiness response containing `cloudflareConnection: "successful"` and `upsTrackingProxy: "ready"`. Tracking requests use `GET /ups/track/{trackingNumber}`. The Worker rejects malformed tracking numbers before contacting UPS, disables signature, milestone, and proof-of-delivery fields, and returns a generic error instead of secret or token contents when an upstream failure occurs.

The Cloudflare Worker is protected by Cloudflare Access. The sandbox authenticates with a Cloudflare Access service token. The service-token values are not documented, committed, or printed. The sandbox-side secret names are:

- `CLOUDFLARE_UPS_PROXY_URL`
- `CLOUDFLARE_UPS_PROXY_CLIENT_ID`
- `CLOUDFLARE_UPS_PROXY_CLIENT_SECRET`

The Cloudflare Secrets Store names bound to the Worker are:

- `UPS_CLIENT_ID`
- `UPS_CLIENT_SECRET`

The first two values belong in Cloudflare Secrets Store. The last three values are only the protected Worker URL and its machine-to-machine Access credentials. They are not UPS credentials. If the sandbox is moved away from Manus later, move those three proxy-connection values to the new runtime’s secure secret manager before removing them from the Manus project settings.

## Code boundaries

`server/upsTracking.ts` normalizes the tracking number, calls the protected Worker, preserves the existing privacy-safe result formatter, and never constructs a UPS OAuth request. `server/apiProviderHealth.ts` checks the protected Worker root instead of checking UPS credentials directly. `server/upsTracking.test.ts` proves the request goes to the Cloudflare proxy and not `onlinetools.ups.com`. The live proxy tests are in `server/cloudflareUpsProxyCredentials.test.ts` and `server/upsCredentials.test.ts`; they never print token or secret values.

The older direct UPS OAuth description in `UPS_TRACKING_INTEGRATION_NOTES.md` is historical provider documentation. The current runtime architecture in this file supersedes any statement that the Tradebilia server owns or reads the UPS credentials.

## Safe verification

Run the deterministic checks from the isolated project:

```bash
pnpm exec vitest run server/upsTracking.test.ts server/upsCredentials.test.ts server/cloudflareUpsProxyCredentials.test.ts server/apiProviderHealth.test.ts --reporter=verbose
pnpm check
pnpm build
git diff --check
node --check cloudflare/tradebilia-ups-worker.js
```

Run the live Cloudflare proxy checks only when the secure sandbox service-token values are available:

```bash
RUN_EXTERNAL_CREDENTIAL_TESTS=true pnpm exec vitest run server/cloudflareUpsProxyCredentials.test.ts server/upsCredentials.test.ts --reporter=verbose
```

The live checks verify the protected Worker readiness response and an invalid tracking-number route. They do not expose credential values. A real tracking-number lookup is an external provider request and should be performed only as a deliberate read-only test.

## Verified result

- Cloudflare service-token proxy tests: 2/2 passed.
- Focused UPS/provider tests: 17/17 passed in the non-live run, with 2 expected live-test skips.
- Full regression suite: 329 files passed; 1,653 tests passed; 4 files and 7 tests skipped.
- TypeScript, production build, JavaScript syntax validation, and `git diff --check`: passed.
- GitHub `main` and the local checkout: commit `09996531b`, synchronized.
- WebDev checkpoint: `09996531b`.
- No database writes, migrations, dependency upgrades, or raw credentials were used.

## Security and recovery rules

Never put the UPS Client ID, UPS Client Secret, Cloudflare Access client ID, Cloudflare Access client secret, database URL, or any other raw secret in this document, GitHub, an issue, or chat. If a secret is suspected to have been exposed, rotate it in the provider console and update the secure runtime configuration; do not attempt to repair exposure by editing history alone.

Do not delete the old Cloudflare Worker, its Access policy, or its secret bindings until the sandbox has completed a real controlled tracking smoke test and the replacement runtime has been approved. Do not alter the shared database while testing carrier tracking.

## New-session continuation

1. Read `CURRENT_PROJECT_HANDOFF.md`, `SESSION_HANDOFF_GUIDE.md`, and this document.
2. Fetch GitHub `main` and confirm the checkout is clean and equal to the current remote SHA.
3. Confirm the Cloudflare Worker remains deployed and Access-protected without opening or printing secret values.
4. Run the deterministic tests and then the live proxy checks if the secure service-token configuration is available.
5. Save a WebDev checkpoint and push the same commit to GitHub after any approved change.
