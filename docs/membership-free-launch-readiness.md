# Tradebilia Membership Foundation — Free Launch Readiness

## Current Operating State

Tradebilia is configured for **Free Launch Access**. Existing and new members receive all currently available marketplace capabilities without a payment requirement. The member-facing **Profile → Membership & Billing** panel explains this clearly: no credit card is required, no payment method is being collected, and billing is not active.

> **Launch safeguard:** The membership matrix is retained for future planning only. While the `free_launch` override is active, an individual plan-feature setting cannot remove a member’s current access.

| Area | Current behavior | Deliberately unavailable |
|---|---|---|
| Member access | All seeded features are granted during free launch. | Paywalling or loss of access based on payment status. |
| Member Profile | Displays plan status and included features. | Card fields, saved cards, invoices, checkout, and self-service billing actions. |
| Admin Billing | Shows an explicit inactive-billing banner and future plan-feature matrix. | A control to activate live billing, create a Checkout session, or charge a member. |
| Server logic | Lazily records a member’s `free_launch` membership when the member first requests their status. | Stripe API calls, billing webhook handling, subscription changes, or card collection. |

## Durable Membership Data Model

The approved non-destructive migration added only the following membership-specific tables. It did not alter existing users, listings, trades, messages, or historical marketplace data.

| Table | Purpose | Free-launch use |
|---|---|---|
| `membershipPlans` | Stores the available plan definitions. | The application uses `free_launch` and one future `subscription` plan. Retired planning rows remain inactive and hidden rather than being destructively removed. |
| `membershipFeatures` | Defines feature keys and user-facing labels. | Contains the current Tradebilia capability catalog. |
| `membershipPlanFeatures` | Records per-plan feature availability and optional limits. | The visible Admin matrix uses the Free Launch and Subscription plans only. |
| `userMemberships` | Stores one membership record per member. | Created safely on first membership-status request using `free_launch`. |
| `billingSettings` | Holds the global billing mode. | Set to `free_launch`; Stripe billing is disabled. |

The non-destructive configuration retains the earlier planning records, seven feature definitions, their historical plan-feature mappings, one billing-settings row, and no bulk-created user-membership records. The application presents only the Free Launch and Subscription choices; retaining inactive historical placeholders avoids assumptions about legacy data.

## Future Membership Choices

| Plan code | Display name | Interval | Current state |
|---|---|---:|---|
| `free_launch` | Free Launch Access | Free | Active and assigned as the safe default. |
| `subscription` | Subscription Membership | Subscription | The single future paid option; inactive while billing remains off. |

The Admin Billing matrix may be used to prepare feature availability for the one future Subscription Membership. It must not be treated as permission to begin charging members; the application deliberately exposes **no** billing-mode activation action.

## Future Subscription Pricing — Planning Only

The current working direction is one Subscription Membership with two member-selected payment terms: **$10 per year** or **$1 per month**. These are planning values only. No price is configured with a payment provider, no member can currently select a term, and no member can be charged.

| Future option | Planning value | Current state |
|---|---:|---|
| Annual payment term | $10 per year | A future member-selected term for Subscription Membership; not configured or offered. |
| Monthly payment term | $1 per month | A future member-selected term for Subscription Membership; not configured or offered. |

The application treats both as member-selected payment terms for the **same single Subscription Membership**, not as separate membership tiers. Both terms will receive identical access. Provider price setup, checkout selection, and the exact subscription change/cancellation rules still require a separate billing-activation project.

## Future Free-Browsing Policy — Prepared, Not Active

When and only when a future billing-activation project intentionally switches Tradebilia from Free Launch to Subscription mode, a non-subscriber will be limited to the following public browsing content. The policy is implemented as a dormant route gate and an item-detail server check; **it does not change current Free Launch access**.

| Visitor access in future Subscription mode | Policy |
|---|---|
| Category pages | Available without a subscription. |
| Global Search (`/search`) | Available without a subscription. |
| Contact Us (`/contact`) | Available without a subscription. |
| Individual item-detail pages | Subscription access required; this is enforced both in the route gate and the listing-detail data procedure. |
| Other member-facing marketplace pages | Subscription access required unless separately designated as a necessary account, authentication, or legal route. |

The site home page and account, sign-in, password-reset, privacy, and terms routes remain technical entry points so a visitor can navigate, authenticate, or understand the service. They do not grant access to member marketplace functions. The future restriction screen deliberately contains no checkout, pricing form, card field, or payment action.

## Current Release Verification

After the future-access-policy checkpoint, the standard public Global Search page and an individual item-detail page were both verified while `billingMode` remains `free_launch`. Each continued to load normally, confirming that the future restriction is dormant and has not changed current browsing access. No billing setting, plan-feature entry, or complimentary membership grant was changed during verification.

After the member-selected payment-term checkpoint, the authenticated Admin browser initially displayed the preceding Billing bundle without the new payment-terms planning card. After deployment propagation and a refreshed Admin view, the public Billing panel displayed the **$1 per month** and **$10 per year** options, stated that both provide identical access, and retained the disabled Checkout, card collection, and Stripe billing indicators. No plan, membership, or billing setting was changed during verification.

## Complimentary Membership Grants

Only the configured **Tradebilia owner** can grant **Complimentary Membership** to a selected member. The grant associates the member with the future Subscription Membership plan while recording the membership status as `complimentary`. During Free Launch, every member remains open to every current feature regardless of that status. If a later, separately approved subscription activation occurs, a complimentary member receives the enabled Subscription-plan features without a payment requirement. Other administrators cannot decide, grant, revoke, or retrieve the complimentary-membership control.

| Control | Effect | Payment impact |
|---|---|---|
| Owner grants complimentary access | Assigns the selected member a `complimentary` membership status and the Subscription Membership plan. | Does not create a customer, collect a card, start Checkout, or charge the member. |
| Remove grant | Returns the selected member to the standard Free Launch membership record after explicit confirmation. | During Free Launch, it does not remove current feature access. |
| Subscription feature matrix | Defines the enabled features that paid and complimentary Subscription Memberships would share later. | Has no effect on current free access and cannot activate billing. |

## Explicit Stripe Boundary

Stripe is a future provider only. This foundation does not include a Stripe package, secret configuration, Checkout, Billing Portal, card fields, Payment Element, invoices, customer creation, subscription creation, payment collection, webhooks, retry logic, or charges.

The server’s current billing summary intentionally reports checkout, card collection, payment requirements, and Stripe billing as unavailable even if a database value were changed outside the approved application flow. This is a defensive guard against an accidental partial activation.

## Required Future Activation Project

Before Tradebilia offers paid subscriptions, a separately reviewed project must complete the following work in order.

| Activation area | Required work before enabling paid membership |
|---|---|
| Product policy | Approve the single subscription price, trial policy, cancellation terms, refunds, grandfathering, complimentary-access policy, and member communications. |
| Stripe configuration | Add production Stripe credentials securely, create one subscription product/price, and verify restricted-key permissions. |
| Payments | Implement authenticated Checkout creation, return/cancel handling, and a verified Billing Portal flow. |
| Webhooks | Verify signatures, process events idempotently, reconcile subscriptions, and prevent duplicate state transitions. |
| Entitlements | Apply paid-plan access only after a confirmed provider event; preserve administrator-granted complimentary access and define delinquency, cancellation, grace-period, and support override behavior. |
| Operations | Add invoice/receipt delivery, payment-failure messaging, support playbooks, audit logs, monitoring, and reconciliation. |
| Compliance | Review taxes, consumer disclosures, privacy terms, refund policy, and applicable subscription regulations. |
| Release safety | Test in Stripe test mode, conduct administrator and member acceptance testing, approve a rollback plan, and then perform an intentional launch. |

Until that project is complete and explicitly approved, **`billingMode` must remain `free_launch` and no payment capability should be introduced.**

## Validation Record

The foundation has focused automated coverage for Free Launch entitlement precedence, the single Subscription-plan rules, complimentary membership grants, unavailable payment capabilities, administrator-only matrix updates, the Profile panel, and the Admin Billing preview. The deterministic full suite passed with the known live UPS credential probe excluded; that isolated probe remains environment-dependent and is unrelated to the membership foundation.

Public-release verification began immediately after the checkpoint. The authenticated public Profile page was initially still serving the preceding build, which did not yet include the Membership tab; the release must be rechecked after deployment propagation before this record is treated as final.

After the deployment reported success, the authenticated Admin Dashboard displayed the new Billing tab. Its rendered content confirmed the Free Launch override, disabled checkout, disabled card collection, disabled Stripe billing, the future plan-feature matrix area, and the explicit no-Stripe-activation boundary. No administrative matrix setting was changed during this verification.

During release verification, the Admin matrix correctly surfaced that the application’s custom data connection did not yet contain the new tables. A read-only baseline confirmed three existing users and eighteen existing listings, with none of the five membership tables present. The same approved non-destructive DDL and idempotent seed were then applied through that verified application connection. Post-migration verification confirmed four plans, seven features, twenty-eight plan-feature rows, one free-launch billing-settings row, zero pre-provisioned user memberships, and all five tables visible to the live Drizzle connection. Existing user and listing counts were preserved.

The released authenticated Profile page was then rechecked successfully. It rendered the Membership & Billing tab, Free Launch Access plan, no-credit-card-required language, inactive billing status, no-payment-method notice, and all seven configured features.

The released authenticated Admin Billing tab was rechecked successfully after the custom-database migration. It rendered the full four-plan by seven-feature matrix, showed every entry as open at launch, and retained the disabled Checkout, Card collection, and Stripe billing indicators. The verification did not modify any plan-feature checkbox or billing setting.

After the simplified-model checkpoint, the standard public domain initially continued to serve the preceding four-plan Admin Billing build. The deployment later reported success. A direct public-bundle inspection confirmed the simplified Billing labels are present, while the authenticated browser still displayed its stale client bundle; the final browser check must reload after clearing that local cache.

After the authenticated browser cache was cleared, the standard public Admin Billing page was verified successfully. It displayed the two-column Free Launch and Subscription feature matrix, the complimentary-access explanation, the three current Tradebilia members, and confirmation-gated grant controls. Checkout, card collection, and Stripe billing remained disabled. No member grant or plan-feature setting was changed during verification.
