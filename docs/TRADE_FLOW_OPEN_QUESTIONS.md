# Trade Flow — Open Questions

**Version:** 1.0  
**Date:** July 10, 2026  
**Status:** Pending Rich's Decisions

These questions need to be answered before or during implementation. They are not blockers for starting Stage 1, but they must be resolved before Stage 2 and beyond.

---

## 🔴 High Priority (Needed for Stage 1 or 2)

### Q1: What happens to the existing Messages page trade threads?
The current `/messages` page shows trade proposals as threaded conversations. When we move trade alerts to the new `/trade-alerts` page, do we:
- (A) Leave existing trade threads in Messages as-is (legacy), and only new trades go to Trade Alerts?
- (B) Migrate all existing trade threads to the new Trade Alerts page?
- (C) Simply remove the trade folder from Messages and let the new page handle everything from day one?

**My recommendation:** Option C — clean break. Since there are no real completed trades yet, there's nothing to migrate.

---

### Q2: Can a user have multiple active trade proposals for the same item?
Example: User A has a Wayne Gretzky card listed. Can User B AND User C both send a trade proposal for it at the same time?

- If **yes**: The item owner (User A) sees multiple pending proposals and can choose which one to proceed with. The others are automatically declined when one is accepted.
- If **no**: Once a trade proposal is `initiated` for an item, the item is "locked" and no other proposals can be sent until that trade is resolved.

**My recommendation:** Allow multiple proposals (yes), but when one is accepted, automatically decline the rest with a system message: "This item has been accepted for trade with another collector."

---

### Q3: What happens to an item's listing status during an active trade?
When a trade is in `negotiating` or `accepted` status, should the item:
- (A) Stay visible in the marketplace (others can still see it and send proposals)
- (B) Be hidden from the marketplace (marked as "In Trade")
- (C) Show a badge/label "In Trade" but remain visible

**My recommendation:** Option C — show an "In Trade" badge but keep it visible. This is more transparent and lets other collectors know the item may become available again if the trade falls through.

---

### Q4: Cash-Only Trade Handling
The spec allows "Cash-Only" trades where User B proposes cash instead of items. Since Tradebilia has no payment processor, how should this be handled in the UI?

**My recommendation:** Allow cash amounts to be entered in the proposal form, but display a clear disclaimer: *"Tradebilia does not process payments. Cash arrangements must be made directly between traders (e.g., Venmo, Zelle, PayPal). Tradebilia is not responsible for cash transactions."*

Do you want to include this disclaimer, or do you want to disable cash-only trades entirely for now?

---

## 🟡 Medium Priority (Needed for Stage 3 — Shipping)

### Q5: Who pays for shipping?
The spec does not define who is responsible for shipping costs. Should the UI:
- (A) State a platform rule: "Each trader is responsible for their own shipping costs"
- (B) Allow shipping cost to be negotiated in the proposal (added to the cash fields)
- (C) Leave it entirely up to the traders to figure out

**My recommendation:** Option A — state a clear platform rule to avoid disputes.

---

### Q6: What if only one person submits a tracking number?
If User A ships their item and submits a tracking number, but User B never ships and never submits a tracking number — what happens?

**My recommendation:** The daily cron job sends reminders to User B at 5 days and 10 days. At 15 days with no tracking from User B, the trade is automatically moved to `disputed` status and an admin alert is generated.

---

### Q7: International Shipping
The spec only lists US carriers (USPS, UPS, FedEx, DHL). Should we support international carriers (Canada Post, Royal Mail, etc.)?

**My recommendation:** Add an "Other" option with a free-text carrier field for international trades. We can expand the carrier list later.

---

## 🟢 Low Priority (Needed for Stage 4 — Feedback)

### Q8: Can a user edit their review after submitting?
Once a trade review is submitted, can the reviewer edit it?

**My recommendation:** No edits after submission. Reviews are permanent to maintain integrity. If there's a dispute about a review, it goes through admin.

---

### Q9: Should reviews be public or private?
Should trade reviews be visible on the reviewer's public profile, or only visible to the person being reviewed?

**My recommendation:** Public — visible on the reviewee's public profile page. This is the core trust-building mechanism of the platform.

---

### Q10: Minimum trade count before ratings appear?
Should a user's star rating be shown publicly only after they have a minimum number of completed trades (e.g., at least 3)?

**My recommendation:** Yes — show "No ratings yet" until a user has at least 3 completed trade reviews. This prevents a single 5-star self-review from dominating.

---

## Notes

- Questions Q1–Q4 should be answered before we begin Stage 1 implementation.
- Questions Q5–Q7 should be answered before Stage 3.
- Questions Q8–Q10 should be answered before Stage 4.
