# Tradebilia Phase B1 Staging Isolation Matrix

**Purpose:** Define the fail-closed configuration that must be applied to the independent Phase B1 project before any user creates test data. It supplements—not replaces—the requirement for an isolated writable staging database and complete media snapshot.

> **Scope boundary:** This file prepares the migration. It does **not** authorize creating the replacement project, copying secrets into a new project, attaching either production hostname, or changing any production setting.

## 1. Required Fail-Closed Safety Control

The current source includes a default-off server-side control, `TRADEBILIA_STAGING_MODE`. It is **inactive** in production unless expressly set to `1` or `true`. In a future copied project, set it securely to `1` **before** exercising any authenticated route.

| Integration class | Behavior while `TRADEBILIA_STAGING_MODE=1` | Additional Phase B1 setting |
|---|---|---|
| Transactional email | Resend delivery is skipped without an outbound request. | Keep delivery disabled; do not send to customer addresses. |
| Twilio Verify | Code sends and code checks return a safe disabled result. | Do not send SMS to real users. |
| PayPal verification | PayPal verification returns a safe disabled result. | Do not query or validate real transactions. |
| eBay/Facebook/LinkedIn OAuth callbacks | Callback routes stop before token exchange or account writes. | Do not register the production hostnames as staging callbacks. |
| Scheduled writers | Draft cleanup, referral digest, and trade reminders return `skipped: "staging-safety"` before database work. | Do not create/enable Heartbeat jobs in staging. |

The guard was validated with focused behavioral tests for email, SMS, PayPal, OAuth callback protection, and all three scheduled writers. Production behavior remains unchanged unless the new variable is explicitly enabled.

## 2. Per-Integration Staging Configuration

| Boundary | Phase B1 configuration | Verification evidence | Prohibited action |
|---|---|---|---|
| `CUSTOM_DATABASE_URL` | Securely set **only** to the provider-created isolated staging clone. | Clone identity, snapshot timestamp, row counts, integrity report, and a write-isolation proof. | Connecting the replacement project to the live external database. |
| Manus-managed database | Treat as an empty template database only. | New-project database remains distinct from the external staging clone. | Treating it as Tradebilia’s real data. |
| Static assets | Restore all 46 design assets from the verified recovery archive. | Target-object `200` checks and source-to-target mapping. | Reusing assumed old-project `/manus-storage` paths. |
| Customer media | Upload each checksummed source binary to the new project namespace; preserve an old-to-new mapping. | Destination URL, SHA-256 match, and item/avatar rendering check for every record. | Updating production database paths or accepting the current 403 avatar exception without an approved remedy. |
| Email/SMS/PayPal | Keep `TRADEBILIA_STAGING_MODE=1`; remove or sandbox provider secrets if the provider supports independent test credentials. | Guard test, secure-settings review, and no provider delivery/activity evidence. | Contacting production recipients or validating production transactions. |
| OAuth providers | Keep callback operations blocked; configure a temporary non-production callback only after a provider-specific approval. | Provider-console screenshot/record and staging callback smoke test. | Changing `tradebilia.manus.space` or `tradebilia-vauewtpb.manus.space` callbacks in Phase B1. |
| Read-only market data | eBay Browse, Sold-Comps, and Parse.bot may be exercised only as read-only test data after secret-presence review. | Request logs contain no writes and results are visibly labelled staging/test. | Treating third-party data results as a production write path. |
| Analytics | Disable analytics or use a dedicated staging property/website ID. | Secure-settings evidence shows blank or non-production identifier. | Sending staging telemetry to production reporting. |
| Platform authentication | Keep the platform’s ordinary project authentication available for staging testers. | Auth smoke test against the unpublished staging URL. | Relying on copied production browser sessions. |

## 3. Recommended Bootstrap Decisions for Rich’s Approval

The documented Make a Copy route creates a new independent project, starts it unpublished, leaves domain settings behind, and does not transfer GitHub linkage. It does transfer source and documented secret values, so every copied secret must be reviewed in secure settings. [1]

| Decision | Recommended Phase B1 choice | Reason |
|---|---|---|
| New project name | **Tradebilia Exact Snapshot Staging — August 2026** | Clearly distinguishes the writable test environment from production. |
| Source baseline | Create/copy from GitHub `main` commit `49a60d7` or the later approved migration-baseline commit. | Produces a reviewable, reproducible code starting point. |
| GitHub linkage | Create a distinct private repository, proposed name `tradebilia/collectors-barter-staging`, from the new project’s GitHub export. | The project integration establishes a two-way main-branch sync and official guidance says it exports to a new private repository; avoid two projects auto-syncing the same repository/branch. [2] |
| Publication and domains | Keep the copied project unpublished. Do not attach `tradebilia.manus.space` or `tradebilia-vauewtpb.manus.space`. | The copy is independent and does not inherit domain settings; production domains remain Phase B2-only. [1] |
| Rollback owner | **Rich** owns explicit Phase B2 authorization; retain the current live project, current external database recovery point, and media mapping throughout the observation window. | A failed staging test must never require production restoration. |

## 4. External Actions Required Before Project Creation

| Order | Owner | Required evidence | Status |
|---:|---|---|---|
| 1 | Database provider / Rich | Provider-supported writable isolated clone from a named production snapshot, with backup/PITR evidence and no production write path. | Blocked—provider action required. |
| 2 | Rich / storage support path | Recover or explicitly authorize handling of the one legacy avatar that currently returns `403`; then complete its checksum and target mapping. | Blocked—source object unavailable. |
| 3 | Rich | Approve the separate staging repository approach and the proposed project name, or provide an alternate approved naming/linking method. | Pending written decision. |
| 4 | Rich / provider consoles | Identify sandbox credentials or confirm secure disabling for email, SMS, PayPal, OAuth, and analytics. | Pending provider settings. |
| 5 | Rich | Give a separate written **“create Phase B1 staging project”** approval after rows 1–4 are complete. | Not yet requested. |

## References

[1] [Manus Website Builder — Make a Copy](https://manus.im/docs/website-builder/make-a-copy)

[2] [Manus Website Builder — GitHub Integration](https://manus.im/docs/website-builder/github-integration)
