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

## Complimentary Membership Grants

An administrator can grant **Complimentary Membership** to a selected Tradebilia member. The grant associates the member with the future Subscription Membership plan while recording the membership status as `complimentary`. During Free Launch, every member remains open to every current feature regardless of that status. If a later, separately approved subscription activation occurs, a complimentary member receives the enabled Subscription-plan features without a payment requirement.

| Control | Effect | Payment impact |
|---|---|---|
| Grant complimentary access | Assigns the selected member a `complimentary` membership status and the Subscription Membership plan. | Does not create a customer, collect a card, start Checkout, or charge the member. |
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
