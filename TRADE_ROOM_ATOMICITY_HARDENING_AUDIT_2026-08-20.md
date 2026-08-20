# Trade Room Atomicity Hardening Audit

## Scope

This repair hardens two sensitive Trade Room actions without changing the member-facing trade terms, stages, reminder policy, contact-disclosure rules, or mobile layout:

1. Counteroffer item replacement now validates and changes the active offer as one database transaction.
2. Final trade acceptance now serializes concurrent confirmation requests on the proposal row and treats a safe retry as an already-completed action rather than repeating state changes or notifications.

## Counteroffer Safeguards

`sendTradeProposal` now limits offered items to 50, rejects duplicate item IDs, rejects the requested item being offered back into the same trade, and verifies every offered listing is active and owned by the submitting member. The proposal row and offered listings are locked before existing offer items are deleted and the replacement set is inserted. Cash fields, proposal turn state, optional counteroffer message, alert, and activity-log events are committed in the same transaction.

This also closes a verified authorization gap: prior code checked that the caller participated in the proposal but did not explicitly verify that each `offeredListingId` belonged to the caller before insertion.

## Acceptance Safeguards

`acceptTradeProposal` now locks the proposal row before reading confirmation state. A repeat request after the trade has entered shipping returns a safe completed result; a repeat first acceptance returns a safe waiting result. The mutual-acceptance transition, item locking, competing-proposal cancellation, acceptance-record cleanup, alert, and activity log remain inside the same transaction. Notification email evaluation and dispatch run only after a successful commit, so a rolled-back trade change cannot produce a false acceptance email.

The existing 72-hour one-sided-acceptance expiry remains in the scheduled lifecycle process and was not altered.

## Validation

The new `tradeAtomicity.test.ts` locks the transactional counteroffer, bounded input, active-owner validation, proposal-row lock, duplicate-safe retry, and post-commit notification contracts. Focused Trade Room coverage passed **8 tests across 3 files**, and TypeScript passed. The complete regression suite passed **97 files / 307 tests** with **4 expected skips**; the production build passed.

Standard-domain verification completed after deployment propagation: the public Tradebilia application loaded normally at `https://tradebilia.manus.space/`. This release is server-side and requires an authenticated, state-changing trade action to exercise manually; no live proposal was created, altered, accepted, or shipped for release verification. The exact hardening behavior is therefore verified by transactional source contracts, focused regression coverage, the full suite, TypeScript, and the production build. Canonical GitHub `main` is synchronized at commit `f0880475`.
