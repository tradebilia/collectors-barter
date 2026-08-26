# Future Tradebilia Membership, Billing, and Verification Plan

**Author:** Manus AI
**Date:** 2026-08-26
**Status:** Planning document only. No Stripe integration, database schema change, access-control enforcement, or live-site behavior change has been implemented from this document.

**Status update (2026-08-26):** The verified custom TiDB connection has since been restored through its intended Tradebilia schema using read-only checks. This removes the prior connection incident as a planning blocker, but it does not authorize billing implementation, migrations, or paid-access enforcement without a separate explicit approval.

## 1. Executive Summary

Tradebilia will launch as a **free collectibles trading community** and remain free for an initial membership-building period. If the platform succeeds in attracting meaningful usage, Tradebilia may later transition to a low-cost paid membership model named **Tradebilia Membership**. The agreed future pricing is **$10 per year** or **$1 per month**, with the same features for annual and monthly members. Annual membership is simply the lower-cost option.

The fee model should remain disabled until three conditions are satisfied: the production database is stable, the Stripe implementation is built and tested in test mode, and the Terms of Service/payment disclosures have been reviewed. Stripe should be used for subscriptions first, and the later item-handling option should be framed as **Tradebilia Verification & Forwarding Service**, not as legal or financial escrow.

> **Important implementation constraint:** Stripe coding and paid-access enforcement should not begin until the now-restored production database remains stable, Stripe is tested in test mode, and a separate explicit implementation approval is given.

## 2. Confirmed Business Decisions

The table below records the agreed decisions from the planning discussion. These decisions should be treated as the authoritative starting point when implementation begins.

| Area | Decision |
|---|---|
| Launch model | Tradebilia launches **100% free**, with no payment prompts at launch. |
| Future activation | Paid access will be activated later by a **manual admin switch**, not automatically by date. |
| Membership name | **Tradebilia Membership**. |
| Membership pricing | **$10 annually** or **$1 monthly**. |
| Feature difference | Annual and monthly members receive the **same features**. |
| Plan switching | Members may switch from monthly to annual. |
| Initial fee-launch grace period | When paid access is first turned on, a communicated **7-day grace period** applies to everyone. |
| New members after paid launch | New members must pay before using member-only features. |
| Payment-failure grace period | Failed or expired payments receive a **3-day grace period** before restrictions. |
| Admin override | Admins may manually mark members as paid, comped, free, or exempt. |
| Comped access | Comped/free accounts remain free until manually removed. |
| Refund policy | **No refunds** for membership and Verification & Forwarding fees, subject to final legal review. |
| Cancellation behavior | Members retain access through the paid billing period after cancellation. |
| Taxes | Pricing should be presented as tax-inclusive if taxes apply; Stripe Tax will be evaluated closer to launch. |

Stripe’s hosted customer portal is recommended because it lets customers manage billing information, payment methods, invoices, and subscription status through Stripe-hosted pages rather than Tradebilia storing or managing sensitive card details directly.[1] Stripe’s automatic receipts are also recommended because Stripe can email receipts for successful payments and refunds.[2]

## 3. Paid Access Rules

When paid access is eventually enabled, the public site should still remain browseable enough to attract new members, but core trading and detail-level access should require an active membership.

| User type | Homepage | Category pages/listing cards | Item detail page | Messages/inquiries | Trades | Inventory/account/billing |
|---|---:|---:|---:|---:|---:|---:|
| Visitor / not signed in | Yes | Yes | No | No | No | No |
| Signed-in unpaid member | Yes | Yes | No | No | No | Yes |
| Paid member | Yes | Yes | Yes | Yes | Yes | Yes |
| Comped/free member | Yes | Yes | Yes | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes | Yes | Yes | Yes |

Unpaid members should see a simple **Membership Required** page when trying to open a blocked item detail page. That page should show the $10/year and $1/month pricing, explain what access includes, and link to the billing checkout flow once Stripe is implemented.

Existing unpaid members should still be able to log in, manage account settings, manage billing, and view their inventory page. They may add items while unpaid, but those items should not be visible on category pages, global search, public profile inventory, or other public discovery surfaces until paid access is restored. Unpaid members should be able to edit or delete their own profile/listings for account-control reasons, but they should not be able to view item detail pages, send inquiries, send messages, propose trades, accept trades, or complete trades.

When a paid membership expires or payment fails, the member receives a **3-day grace period**. After that period, their listings become hidden rather than deleted. If the member later pays again, hidden listings should automatically become visible again unless another moderation or listing-status rule blocks them.

## 4. Stripe Implementation Direction

Stripe should be used first for simple recurring membership billing. Marketplace seller payouts or money movement between members should not be part of the first paid-membership phase.

| Stripe area | Decision or recommendation |
|---|---|
| Initial Stripe use | Membership subscriptions only. |
| Subscription plans | One annual plan at $10/year and one monthly plan at $1/month. |
| Customer billing management | Use Stripe’s hosted customer portal. |
| Receipts/invoices | Enable Stripe automatic receipts and invoice/receipt emails. |
| Tax handling | Evaluate Stripe Tax closer to paid launch; plan for tax-inclusive displayed pricing if required. |
| Webhooks | Required later for subscription status updates, failed payments, cancellations, renewals, and one-time Verification & Forwarding payments. |
| Stripe Connect | Not needed for the first membership phase unless Tradebilia later moves money between members or sellers. |

Stripe Connect is designed for platforms and marketplaces that manage payments and move money between multiple parties.[3] Because Tradebilia’s near-term plan is to charge membership fees directly to Tradebilia, the first implementation should avoid Stripe Connect unless the product later requires seller payouts, split payments, or direct member-to-member payment flows. Stripe Tax can calculate and manage sales tax, VAT, and GST compliance, but the decision to enable it should be made closer to paid launch after business, jurisdiction, and tax-advisor review.[4]

## 5. Admin Billing Dashboard Requirements

When billing is implemented, the Admin Dashboard should include a dedicated **Billing** tab. This tab must let administrators monitor paid access and troubleshoot member billing without exposing sensitive card data.

| Admin field | Purpose |
|---|---|
| Member display name | Human-readable user identification. |
| Email | Billing/support lookup. |
| Plan | Monthly, annual, comped, free/exempt, canceled, expired. |
| Paid/unpaid status | Determines access eligibility. |
| Renewal date | Shows when the next billing event occurs. |
| Grace-period end date | Shows when restrictions will begin. |
| Failed-payment status | Flags accounts needing support. |
| Stripe customer ID | Support/reference identifier; not a card credential. |
| Stripe subscription ID | Subscription troubleshooting/reference identifier. |
| Last payment date | Confirms recent payment activity. |
| Admin override status | Shows whether the user is manually comped or exempt. |

The admin page should support filtering by paid, unpaid, expired, failed payment, annual, monthly, comped, canceled, and grace-period status. Admins should be able to manually extend access for goodwill/support reasons and should receive alerts when payment failures occur or when many members are unpaid.

## 6. Verification & Forwarding Service

The later physical item-handling feature should be named **Tradebilia Verification & Forwarding Service**. The plan should avoid calling it “escrow” unless formal legal review concludes that the term is appropriate. The service is intended to verify that shipped items match the listing and then forward the items to the other trade partner.

| Rule | Decision |
|---|---|
| Service availability | Available for all categories. |
| Participation | Optional, but both trade partners must agree before the trade is accepted. |
| Price | **$20 per member**, per trade. |
| Payment timing | Both $20 payments must be completed before either member sees the final confirmation page containing shipping details. |
| If one member never pays | Cancel the trade. |
| Shipping to Tradebilia | Each member pays to ship their own item to Tradebilia. |
| Shipping from Tradebilia to receiving member | Tradebilia pays; the $20 fee helps cover this cost. |
| Verification scope | Tradebilia checks whether the received item matches the listing. |
| Authenticity/value guarantee | Tradebilia does not guarantee market value and should not represent the service as a full authentication guarantee. |
| If item does not match listing | Return to sender and cancel the trade. |
| Refunds | No refund, subject to final legal/payment-policy review. |
| Tracking | Members must upload tracking numbers when shipping to Tradebilia. |
| Arrival photos | Tradebilia photographs items on receipt for private admin/trade evidence only. |
| Insurance/signature confirmation | Not required initially. |

The Verification & Forwarding workflow should have explicit admin statuses, such as **Awaiting Payment → Awaiting Shipment → Received → Matched Listing → Forwarded → Completed**. If both members paid but one does not ship, the trade should go to admin review first and then be canceled if unresolved. Members should have **7 days** to ship items to Tradebilia after both verification payments are completed.

## 7. Legal, Trust, and User-Notice Requirements

Before paid access or the Verification & Forwarding Service goes live, Tradebilia should update its public terms, checkout disclosures, and user-facing explanations. The terms should state that Tradebilia is normally a marketplace that connects collectors and is not responsible for ordinary member-to-member trades. For the Verification & Forwarding Service, the terms should separately state that Tradebilia’s role is limited to item receipt, listing-match review, documentation, and forwarding, not a guarantee of value.

| Notice or policy | Required decision |
|---|---|
| Updated Terms of Service | Users must agree before paying. |
| No-refund disclosure | Show during checkout and in account settings. |
| Minor users | Paid membership and trade participation require parent/guardian consent. Final legal wording required. |
| Marketplace disclaimer | Tradebilia connects collectors and is not liable for ordinary trades gone wrong. |
| Verification-service disclaimer | Tradebilia checks item/listing match and forwards items; it does not guarantee value. |
| Private evidence handling | Verification photos remain private admin/trade evidence, not public listing images. |

## 8. Database and Implementation Dependencies

The future billing system requires a durable database because membership status, Stripe IDs, subscription lifecycle events, failed-payment grace periods, admin overrides, and verification orders must persist reliably. The verified custom TiDB connection is currently restored. If Tradebilia later elects to move to Rich’s user-owned TiDB Cloud database, that change must follow an explicit migration/rebuild decision.

| Dependency | Why it is required before coding |
|---|---|
| Stable production database | Stores membership, billing, access-control, and verification-order state. |
| Stripe account and keys | Required for checkout, portal, webhooks, and receipts. |
| Terms/refund/minor policy | Required before accepting payments. |
| Admin billing design | Required before enforcing paid access. |
| Test-mode validation | Required before any live payment flow. |

The implementation should include an admin-controlled feature flag so the billing system can be built and tested while enforcement remains disabled. No user should lose access because of billing logic until the manual paid-access switch is intentionally turned on.

## 9. Recommended Implementation Phases

| Phase | Implementation goal | Enforcement state |
|---:|---|---|
| 1 | Resolve database stability or intentionally select the new user-owned TiDB database. | No billing enforcement. |
| 2 | Create billing schema and admin-visible membership status fields. | Disabled. |
| 3 | Add Stripe test-mode checkout for annual/monthly Tradebilia Membership. | Disabled except test accounts. |
| 4 | Add Stripe webhook processing and Billing admin tab. | Disabled. |
| 5 | Add Membership Required page and access gates behind admin switch. | Toggle-controlled. |
| 6 | Launch free site and observe adoption. | Free mode. |
| 7 | If approved later, activate 7-day communicated paid-launch grace period. | Grace mode. |
| 8 | Enforce paid access after grace period. | Active. |
| 9 | Add Verification & Forwarding Service as separate one-time Stripe payment workflow. | Optional service. |

## 10. Remaining Pre-Implementation Questions

The core business plan is complete enough to preserve for future execution. The remaining items are not blockers for documentation, but they should be resolved before live billing begins.

| Topic | Remaining decision |
|---|---|
| Final legal terms | Attorney review of no-refund policy, parent/guardian consent language, marketplace disclaimer, and Verification & Forwarding terms. |
| Tax handling | Decide whether to enable Stripe Tax, and confirm whether pricing remains tax-inclusive in every required jurisdiction. |
| Shipping economics | Re-evaluate whether $20 per member still covers typical forwarding postage before live launch. |
| Verification evidence retention | Decide how long private arrival photos and admin verification records should be retained. |
| Launch messaging | Draft the member announcement explaining the 7-day grace period and why paid membership is being introduced. |

## References

[1]: https://docs.stripe.com/customer-management "Stripe Docs — Provide a customer portal to your customers"
[2]: https://docs.stripe.com/receipts "Stripe Docs — Receipts and paid invoices"
[3]: https://docs.stripe.com/connect "Stripe Docs — Platforms and marketplaces with Stripe Connect"
[4]: https://docs.stripe.com/tax "Stripe Docs — Stripe Tax"
