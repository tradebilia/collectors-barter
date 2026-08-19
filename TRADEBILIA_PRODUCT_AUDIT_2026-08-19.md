# Tradebilia Product, UX, and Implementation Audit

**Audit date:** 2026-08-19
**Scope:** Public sign-up, account setup, homepage and Recently Added carousel, category discovery, standalone search, Member Directory, and active onboarding routes.
**Method:** Read-only source review plus representative desktop and mobile visual checks. No application behavior, data, API setting, or media was changed.

## Executive Assessment

Tradebilia has a strong differentiated visual identity, category-specific discovery, an unusually capable Member Directory, and a growing set of well-defined trade controls. The recently completed Trade Hub, avatar, R2, and Test AI work is a solid foundation. However, the audit identified several **launch-blocking account-creation defects** and **misleading or nonfunctional discovery controls** that should be resolved before expanding lower-priority features.

The clearest priority is to consolidate account creation and account setup into one reliable, server-enforced flow. The second priority is to make Category Pages truthful and functional at mobile widths: pagination, per-page controls, nearest-location sort, and filter activation must all match what the UI promises.

## Prioritized Findings

| Priority | Area | Verified finding | Why it matters | Recommended resolution |
|---|---|---|---|---|
| P0 | Account creation | `/signup` creates and authenticates an account, then routes to `/account-setup?new=true`. Because the session exists, Account Setup takes its authenticated branch; its final submit attempts `auth.signup` again with the same username. | A legitimate new member can be blocked by a duplicate-username error after the initial account was already created. | Make sign-up the single account-creation event. Account Setup should only save the authenticated member’s profile and never call `auth.signup`. |
| P0 | Account setup enforcement | Step buttons permit direct navigation, while final submission does not re-enforce phone verification, accepted terms, or security-question completion. Required controls from earlier steps are unmounted by the final review step. | A member can bypass intended onboarding checks; client-only checks are not a reliable policy boundary. | Remove direct step jumps in production, validate required setup state on final submit, and enforce identity/terms/phone policy server-side. |
| P1 | Account setup trust | The account-connection checkboxes state that members will be redirected to authorize eBay, PayPal, Facebook, LinkedIn, and WhatNot, but they do not initiate OAuth and selected choices are not saved. | The interface makes a promise that the product does not perform. | Replace these with active connection buttons and status, or label the section “Choose services to connect later” until every supported flow is real. |
| P1 | Merchant onboarding | The self-selected merchant checkbox displays a **Verified Merchant** badge immediately. Required-marked business fields have no corresponding final validation in the setup handler. | Members may believe that self-identification grants verification; incomplete merchant submissions may be stored or accepted. | Label this as “Request merchant verification,” validate the required business data, and show the verified badge only after administrator approval. |
| P1 | Category discovery | Pagination state and per-page controls are displayed but `listings.map(...)` renders the full result set without slicing. | The interface shows pages that do not actually page results. | Implement server- or client-side pagination, total result count, page bounds, and URL-backed page state. |
| P1 | Category discovery | “Location: Nearest First” is offered but the implementation explicitly falls through to Best Match. | Members can select a sort that does not occur. | Hide the option until distance/location data is available, or implement authenticated location-based sorting with privacy-safe disclosure. |
| P1 | Mobile category pages | The desktop sidebar and six-column grid overflow on a 375-pixel viewport, leaving a large blank area and clipping content/controls. | Mobile browsing of category listings is materially impaired. | Use a responsive filter drawer or sheet, a two-column then one-column listing grid, and a horizontally scrollable or collapsed category navigation pattern. |
| P1 | Duplicate onboarding route | `/profile-completion` is live but its mutation is commented out; it displays a success state and redirects without saving the bio, location, or payment choice. | A member can believe profile data was saved when it was not. | Remove or redirect this route until it performs real persistence; do not expose an unfinished duplicate onboarding path. |
| P1 | Standalone search | `/search` is much thinner than Category discovery: no visible query input, no pagination, basic cards without navigation actions, and it renders `listing.photos[0]` directly. | Search gives a weaker, inconsistent discovery experience and risks missing-photo presentation issues. | Consolidate search and category discovery on one shared results surface and reuse the resilient listing-image helper, cards, filters, pagination, and actions. |
| P2 | Filter behavior | Category filters require Search, but the Verified Merchants chip applies immediately. Applied-filter summary was removed, so members cannot easily distinguish entered from active criteria. | The interaction model is inconsistent and results are harder to interpret. | Keep explicit Search/Enter for all category criteria, make the merchant chip part of the submitted filter set, and restore concise applied-filter chips with one-click removal. |
| P2 | Homepage metrics | “Member Growth +15%” is hard-coded, unlike the other query-backed statistics. | A public growth claim should be derived from a documented calculation or omitted. | Replace it with a verified period-over-period metric, label the period, or remove it until analytical data exists. |
| P2 | Homepage focus | The homepage mixes marketing, subscriber tools, recently added listings, rankings, conventions, and multiple member workflows in one large component. Shipping Supplies remains visibly marked “Coming soon.” | First-time visitors have several competing paths; placeholders reduce launch polish. | Keep the homepage focused on Browse, List, and Trade; move member utilities to account navigation and hide unfinished features. |
| P2 | Carousel accessibility | The Recently Added shelf continuously scrolls as requested, but has no reduced-motion alternative, pause/skip control, keyboard-equivalent card activation, or semantic handling for duplicated marquee cards. | Keyboard and motion-sensitive visitors have a weaker browsing experience. | Preserve continuous hover behavior, add a reduced-motion static shelf, make item cards real links, and hide duplicate marquee copies from assistive technology. |
| P2 | Account recovery | Account Setup asks predictable security questions such as a mother’s maiden name and childhood details. | These answers are guessable or publicly discoverable and are weaker than modern recovery mechanisms. | Prefer verified email/phone recovery, short-lived recovery tokens, and recovery-factor management; do not rely on knowledge questions. |
| P3 | Account setup clarity | `/signup` labels email optional while Account Setup requires an email. An email-verification modal exists but is never opened by the active flow. Browser console statements also log account/profile setup details. | The journey is confusing and includes unnecessary production diagnostic output. | Make email policy consistent, either implement real email verification or remove the unused state, and remove client-side setup logging. |

## What Is Working Well

The Member Directory is the strongest discovery surface. It keeps the requested username-first public-profile path, shows rich transparent filter choices, uses active cards effectively, and separates distance filtering for signed-in members. This is the pattern to reuse when rebuilding Category Page filter interaction.

The category hero treatment is visually distinctive and each category carries its own identity. The Recently Added shelf preserves full listing images and continues to scroll on hover as specified. The completed Trade Hub direction mapping and Traders Showcase ownership presentation now use tested, explicit exchange logic.

## Account Sign-Up Recommendation

The current flow should be replaced with a simple two-stage model. First, **Create Account** accepts username, verified contact email, password, terms acceptance, and only the minimum necessary anti-abuse verification. It creates one authenticated account. Second, **Complete Your Tradebilia Profile** belongs to that authenticated account and collects optional profile information, avatar, collection interests, merchant-verification request, and external-service connections. It must save profile edits, but never create a second account.

The profile-completion route should be removed from public navigation or redirected to the real authenticated profile setup until it performs a genuine write. The separate development step-navigation controls should not be visible in the production flow.

## Carousel Recommendation

Do not replace the carousel. Its purpose—showing recently added items in a continuous exchange shelf—is appropriate. Improve its resilience and accessibility by keeping the requested continuous hover movement while providing a `prefers-reduced-motion` static layout, keyboard-accessible listing links, a concise “View all recently added” route, and semantic treatment of the duplicate loop. The visible price should be labeled **Estimated Trade Value** unless it is a verified transaction price.

## Category Filter Recommendation

Category filters deserve focused work before adding more categories or discovery features. The immediate repair list is: make pagination and Per Page real, remove or implement Nearest First, make all filters use one explicit Search/Enter commit, show applied chips, and rebuild mobile discovery around a filter drawer. After that, move category and keyword state to the URL so a filtered result set can be shared, returned to, and measured.

## Suggested Implementation Order

1. **Repair account creation and onboarding.** This is the only P0 launch blocker.
2. **Repair category pagination, sort truthfulness, and mobile layout.** These are the most visible discovery defects.
3. **Retire or redirect the fake Profile Completion route and consolidate Search.**
4. **Clarify merchant verification, account connections, email policy, and recovery.**
5. **Polish the homepage and carousel after functional work is complete.**

## Review Constraints

The audit reviewed real source behavior and public development renderings. Authenticated member-only actions were assessed by their code paths and tests; no account was created, no sign-up form was submitted, no phone code was sent, and no production data was written during the review.
