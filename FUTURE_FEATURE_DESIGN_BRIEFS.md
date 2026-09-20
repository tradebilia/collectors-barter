# Tradebilia Future Feature Design Briefs

**Status:** Design-only record. This document does not authorize implementation, database changes, notifications, or external integrations.

**Author:** Manus AI  
**Date:** September 19, 2026

## Purpose

This document turns two previously identified future ideas into practical discussion briefs: **member-to-member live chat** and a **Wanted List**. Both should strengthen collector discovery and communication without weakening the existing Trade Room’s formal proposal and dispute workflows. Each concept is deliberately scoped so the next decision can be made before engineering begins.

## 1. Member-to-member live chat on public profiles and item pages

### Recommended product shape

Tradebilia should treat live chat as a faster presentation layer for the existing member messaging relationship, not as an unmoderated replacement for formal trade negotiation. On a public profile or an item detail page, a signed-in visitor could see a **Chat now** control only when the other member is currently eligible and present. The same surface should retain a **Send message** fallback when the other member is unavailable. Neither path changes an offer, shipping obligation, payment decision, or dispute status.

The chat opening state should carry a narrow context card when started from an item page. The card should contain the public item image, title, reference number, and listing link. It should not copy the seller’s contact information, exact location, private account fields, payment data, or trade history. A member can dismiss the context card after the thread begins.

| Situation | Entry point and behavior | Safety boundary |
|---|---|---|
| Both members are eligible and recently active | **Chat now** opens an existing direct thread or starts a new one with the optional item-context card. | The thread is informal and cannot alter a Trade Room record. |
| Recipient is not recently active | **Send message** opens the current persistent-message composer. | Delivery is asynchronous; the interface must not promise a response time. |
| Visitor is signed out | **Sign in to message** preserves the item context and redirects through the normal sign-in flow. | No public presence information is revealed to guests. |
| Recipient has blocked the visitor, is suspended, or has closed messages | No live-chat affordance is shown. A neutral unavailable state appears only where appropriate. | Do not reveal whether a block caused the unavailability. |
| A Trade Room already exists between the members for the item | Offer a clear **Open Trade Room** route and keep that formal record separate from chat. | No negotiation terms from chat become binding. |

### Presence and availability rules

“Online” should mean only that a signed-in member has had an authenticated site session active within a short, disclosed window, such as 90 seconds. It should not show last-seen timestamps, device type, exact session duration, typing history, or a public presence directory. Presence is best evaluated server-side from a lightweight authenticated heartbeat and should be visible only to a potential conversation counterpart, never indexed on profiles or item pages.

The first release should avoid read receipts and typing indicators. These create social pressure and require more privacy and notification decisions than a collector-to-collector marketplace needs at launch. A later opt-in presence setting can be considered after abuse and support data are available.

### Eligibility, moderation, and abuse controls

Chat should use the same account-level blocks, report paths, sanctions, and audit boundaries as Messages. New-message initiation should be rate-limited by member and recipient, with stricter controls for new accounts. The system should reject malformed content, strip executable markup, and record a minimal moderation event when a member blocks or reports a thread. Moderation evidence should be protected and accessible only to authorized staff.

The planned controls align with the OWASP Application Security Verification Standard’s purpose of providing a basis for testing application security controls [1]. The chat interface should also preserve keyboard operation, visible focus, a meaningful reading sequence, accessible status updates, and readable contrast in line with the relevant WCAG 2.2 guidance [2].

### Proposed first release

The recommended first release is intentionally conservative. It reuses the existing Messages destination, adds a private presence gate, provides an item-context card, and makes the distinction between **Message** and **Trade Proposal** explicit. It does not add public online lists, group chat, file attachments, voice/video, automatic translation, search-engine-visible threads, read receipts, or transactional actions within a message.

### Decisions required before implementation

1. Confirm the member eligibility rule for initiating chat. A reasonable default is that both accounts must be active, signed in, and not mutually blocked; a stronger rule could additionally require a completed profile or account age threshold.
2. Confirm whether item-context messages should be retained after a listing is deleted or traded. The recommended default preserves the context as a historical, non-clickable reference while removing the image if the listing is no longer public.
3. Confirm the retention and staff-review policy for member messages and reports before any new real-time delivery mechanism is introduced.
4. Confirm whether an offline member should receive an existing in-app notification only, or whether email or push notifications are acceptable. The recommended first release uses the current in-app message notification only.

### Acceptance criteria for a later build

A later implementation is ready for release when a signed-in eligible visitor can start a contextual thread from an item or profile, a non-present recipient falls back to the normal composer, blocks and reports take effect immediately, and the Trade Room remains the sole place where a proposal can be changed or completed. The feature must also pass authorization, rate-limit, keyboard, focus, contrast, and responsive-layout tests.

## 2. Wanted List for collectible targets

### Recommended product shape

A Wanted List should be a private, member-controlled set of collection targets. It should help collectors remember what they seek and surface compatible Tradebilia inventory without exposing a member’s desired items to the wider marketplace by default. The feature should not be a buy request, a price commitment, a public bounty, or a promise that Tradebilia will find the item.

A member can create a target from an item detail page through **Add to Wanted List**, or create one manually from their account area. The detail-page action should prefill the category, item type, title, and visible descriptive fields. The manual flow should allow the member to choose a category and item type, add a concise target name, select structured attributes where available, specify a condition preference, and optionally set a private note.

| Component | Recommended first-release behavior | Deferred behavior |
|---|---|---|
| Target record | Category, item type, target name, structured attribute filters, acceptable condition range, active/paused state, private note. | Complex Boolean rules, price ceilings, external catalog identifiers, or bulk import. |
| Privacy | Private by default. Only the member and authorized staff support tools may view it. | Public “wanted” boards or member-to-member demand visibility. |
| Matching | Match active Tradebilia listings first by category and item type, then score title tokens and exact structured-field matches. | External marketplace searches, automated valuation, or image recognition. |
| Discovery | “Potential matches” appears within the member’s Wanted List and may include an item-page match count for the owner only. | Marketplace-wide alerts, public badges, and outbound social posting. |
| Alerts | Optional in-app digest, capped and deduplicated per target. | Immediate email, SMS, or push alerts until consent, quiet hours, and delivery preferences are designed. |
| Trade action | A matching item links to the existing detail page, where the member can use the existing message or proposal flow. | Directly creating an offer from a Wanted List without reviewing the listing. |

### Matching logic and false-positive control

The minimum matching rule should require the same category. When both a target and listing have an item type, they should also share the item type. A match score can then combine normalized title-token overlap with exact matches on structured fields that are meaningful to that category, such as year, manufacturer, character name, player, set, issue number, grading company, or grade. A listing should be withheld when it only shares a generic word such as “rookie,” “vintage,” or a brand name.

The interface should describe results as **Potential matches**, not “matches found,” because collectible data is often incomplete and member-entered. Each result should explain the strongest shared attribute, for example, “Same category and item type; matching year and manufacturer.” This makes recommendations intelligible and gives the member a quick way to remove an irrelevant result without implying a valuation or authenticity judgment.

### Privacy and trust boundaries

Wanted List data can reveal collecting intent, target values, and personal interests. It must therefore remain private by default, must be removable by the member, and must not be used to market a member’s interests to other members without a separate, explicit product decision. The list should not import external watchlists, expose searches to sellers, or create automated outreach.

Any in-app alert should provide a direct way to pause a target or disable future alerts. A member’s private note must never appear to the owner of a matching listing. Matching should operate on public listing fields only, and a result should disappear if the listing becomes inactive, deleted, non-public, or unavailable.

### Proposed first release

The recommended first release includes a private account-area list, creation from item detail and manual entry, structured category-aware fields, simple explainable matching against active public inventory, and an optional capped in-app digest. It excludes public wanted posts, seller solicitation, bids, payment features, cross-platform imports, price tracking, and automated offers.

### Decisions required before implementation

1. Confirm whether the first release should use only in-app digests or no alerts at all. The recommended choice is opt-in in-app digesting after the base list and match quality are validated.
2. Confirm which structured fields are allowed to affect a match for each category. The existing category and item-type field registry can be the source of truth, but the exact field matrix should be approved before it affects recommendations.
3. Confirm whether a deleted or traded listing should remain in a member’s match history. The recommended first release removes unavailable matches and does not maintain a visible historical match log.
4. Confirm whether members may create targets for any collectible category or only categories with standardized item types. The recommended first release supports all existing categories, but allows free-text-only targets where structured fields are sparse.

### Acceptance criteria for a later build

A later implementation is ready when a member can create, edit, pause, and delete a private target; item-detail prefills are correct; results show only eligible active public listings; every shown result identifies at least one specific shared attribute; and irrelevant generic title overlap does not create a result. The implementation must pass authorization, privacy, deletion, accessibility, responsive-layout, and match-explanation tests.

## Recommended sequencing

The **Wanted List** is the lower-risk first project because it improves discovery without adding a new direct communication channel. The **live chat** design should follow after the team confirms message retention, abuse response, account eligibility, and notification policy. Both concepts should remain separate from Trade Room logic until a deliberate product decision changes that boundary.

## References

[1]: https://owasp.org/www-project-application-security-verification-standard/ "OWASP Application Security Verification Standard"
[2]: https://www.w3.org/WAI/WCAG22/Understanding/ "WCAG 2.2 Understanding Documents"
