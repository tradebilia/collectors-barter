# Trade Flow — Open Questions & Answers

**Version:** 2.0  
**Date:** July 10, 2026  
**Status:** ✅ All Questions Answered — Ready for Implementation

---

## Q1: What happens to the existing Messages page trade threads?
**Answer:** ✅ **Clean break.** Remove trade proposal logic from Messages entirely from day one. The new `/trade-alerts` page handles all trade activity. Messages is for direct human communication only.

---

## Q2: Can a user have multiple active trade proposals for the same item?
**Answer:** ✅ **Yes — multiple proposals are allowed.** When one proposal is accepted, all other pending proposals for the same item are automatically declined with a system message: *"This item has been accepted for trade with another collector."*

---

## Q3: What happens to an item's listing status during an active trade?
**Answer:** ✅ **Item remains visible in the marketplace** while a trade is in `negotiating` status. The item is only removed from the marketplace (status changes to `traded`) when **both users have formally agreed** (trade moves to `accepted` status). An "In Trade" badge should be displayed on the listing card while in `negotiating` status so other collectors are aware.

---

## Q4: Cash-Only Trade Handling
**Answer:** ✅ **Cash trades are allowed.** Tradebilia does not act as a middleman — both users are responsible for arranging how cash is sent and received (Venmo, Zelle, PayPal, etc.).

**Required Disclosure (must appear on every trade):**
> *"Tradebilia is a marketplace that brings collectors together. We are not liable for any trades, items, or cash transactions that go wrong. All trades are conducted at the sole risk of the participating collectors."*

This disclosure must appear:
- On the trade proposal confirmation screen
- On the Trade Alerts page (trade detail view)
- In the trade thread at the top of every conversation

---

## Q5: Who pays for shipping?
**Answer:** ✅ **Each trader pays their own shipping costs.** This is a platform rule, not a negotiable field. Display clearly in the shipping stage: *"Each collector is responsible for their own shipping costs."*

---

## Q6: What if only one person submits a tracking number?
**Answer:** ✅ **Auto-escalate to disputed after 15 days.** If only one user submits a tracking number and 15 days pass with no tracking from the other user, the trade is automatically moved to `disputed` status and an admin alert is generated.

**Exception:** If **both** users have clicked "I received my item" (receipt confirmation), the trade completes normally regardless of tracking status.

---

## Q7: International Shipping
**Answer:** ✅ **Add an "Other" carrier option** with a free-text field for carrier name. This covers international carriers (Canada Post, Royal Mail, etc.) without needing to enumerate every carrier upfront. The carrier list can be expanded later.

**Carrier options:**
- USPS
- UPS
- FedEx
- DHL
- Other (free text)

---

## Q8: Can a user edit their review after submitting?
**Answer:** ✅ **No edits to written review text after submission.** Reviews are permanent to maintain integrity.

**Exception — Photos only:**
- Reviewers can **add** photos to their review after submission (e.g., evidence of item condition)
- Only an **admin** can add OR remove photos from a review
- No other fields can be modified after submission

---

## Q9: Should reviews be public?
**Answer:** ✅ **Yes — reviews are public** and visible on the reviewee's public profile page. This is the core trust-building mechanism of the platform.

---

## Q10: Minimum trade count before ratings appear publicly?
**Answer:** ✅ **Minimum of 2 completed trade reviews** before a star rating is shown publicly. Before that threshold, the profile shows *"No ratings yet."*

---

## Summary Table

| # | Question | Decision |
|---|---|---|
| Q1 | Messages clean break? | ✅ Yes — clean break |
| Q2 | Multiple proposals per item? | ✅ Yes — auto-decline others on acceptance |
| Q3 | Item visibility during trade? | ✅ Visible with "In Trade" badge; removed only on acceptance |
| Q4 | Cash trades allowed? | ✅ Yes — with mandatory platform disclaimer |
| Q5 | Who pays shipping? | ✅ Each trader pays their own |
| Q6 | One-sided tracking after 15 days? | ✅ Auto-escalate to disputed (unless both confirmed receipt) |
| Q7 | International carriers? | ✅ Add "Other" free-text option |
| Q8 | Review edits? | ✅ No edits; photos can be added by reviewer, removed by admin only |
| Q9 | Reviews public? | ✅ Yes |
| Q10 | Minimum trades for rating? | ✅ 2 completed reviews |
| Q11 | Either party cancel while negotiating? | ✅ Yes — either party can cancel at any time during negotiation |
| Q12 | Auto-cancel clock starts when? | ✅ From last message or action in the thread |
| Q13 | Counter-proposal limit? | ✅ Indefinite — until one side cancels |
| Q14 | Offer items already in another trade? | ✅ Yes — first acceptance wins; others auto-cancel when item is traded |
| Q15 | Damaged item on receipt? | ✅ Option B — "Received but damaged" triggers complaint; Tradebilia can only suspend if user doesn't make it right |
| Q16 | Receipt confirmation window? | ✅ 15 days after tracking submitted before auto-complete |
| Q17 | Feedback mandatory? | ✅ Yes — required to fully close a trade |
| Q18 | Blind review? | ✅ Yes — both reviews hidden until both submit or 7 days pass |

---

## Q11: Can a user cancel a trade they initiated?
**Answer:** ✅ **Either party can cancel at any time while the trade is in `negotiating` status.** Once a trade moves to `accepted` (both sides agreed), cancellation requires a different flow (complaint/dispute).

---

## Q12: What is the "no activity" auto-cancel window?
**Answer:** ✅ **The 30-day auto-cancel clock resets on every message or action** (counter-proposal, message sent, status change). If 30 days pass with zero activity from either party, the trade is automatically cancelled and both users are notified.

---

## Q13: Counter-proposal limit
**Answer:** ✅ **No limit — counter-proposals can go back and forth indefinitely.** The trade only ends when one party accepts, cancels, or the 30-day inactivity auto-cancel triggers.

---

## Q14: Can User B offer items already in another active trade?
**Answer:** ✅ **Yes — items can be offered in multiple simultaneous trade negotiations.** When an item is formally traded (status becomes `traded`), all other active trade negotiations that included that item are automatically cancelled, with a system message: *"One or more items in this trade are no longer available."*

---

## Q15: What if an item arrives damaged?
**Answer:** ✅ **Option B — "Received but damaged" button.** When confirming receipt, the user has two options:
- "I received my item" — normal completion
- "I received my item — but it arrived damaged" — triggers a complaint record tied to the trade

**Important:** Tradebilia cannot intervene in the physical dispute. The platform's only enforcement tool is user suspension if the responsible party refuses to make it right. This must be communicated clearly in the complaint UI.

---

## Q16: Receipt confirmation window
**Answer:** ✅ **15 days after a tracking number is submitted.** If the recipient has not clicked "I received my item" within 15 days of the other party submitting tracking, the system auto-completes the trade on their behalf. A reminder alert is sent at 10 days and 13 days.

**Exception:** If both users have already clicked receipt confirmation, the trade completes immediately regardless of the 15-day window.

---

## Q17: Is feedback mandatory?
**Answer:** ✅ **Yes — feedback is required to fully close a trade.** After both parties confirm receipt, the trade enters a `feedback_pending` sub-state. The trade is not marked `completed` until both reviews are submitted (or the 7-day blind review window expires — see Q18).

**Implementation note:** If the 7-day window expires and a user has not submitted their review, their review slot is marked as "skipped" and the trade completes. The other party's review (if submitted) is published. A user who repeatedly skips reviews may receive a warning.

---

## Q18: Blind review system
**Answer:** ✅ **Blind review — both reviews are hidden until both are submitted, or 7 days pass (whichever comes first).** This prevents retaliation and "I'll give you 5 stars if you give me 5 stars" gaming.

**Rules:**
- After receipt confirmation, both users have 7 days to submit their review
- Neither review is visible to anyone (including the reviewer) until both are submitted OR the 7-day window closes
- Once both are submitted (or window expires), both reviews are published simultaneously
- If only one user submits within 7 days, their review is published; the other slot shows "No review submitted"

---

## Q19: Trade proposal message character limit
**Answer:** ✅ **Unlimited.** No character limit on the optional message sent with a trade proposal.

---

## Q20: Who can file a complaint?
**Answer:** ✅ **One complaint per trade — filed by either party.** Both parties' grievances are handled within the same complaint thread so the admin sees the full picture in one place.

---

## Q21: What does "resolving" a complaint do to trade status?
**Answer:** ✅ **Option C — admin chooses the outcome.** When resolving a complaint, the admin selects either:
- Move trade to `completed` (dispute resolved, trade stands)
- Move trade to `cancelled` (trade voided — e.g., fraud confirmed)

The admin must select one of these outcomes before the complaint can be marked resolved.

---

## Q22: Can admins see the full trade message thread?
**Answer:** ✅ **Yes.** Admins have full read access to all messages in a trade thread when viewing a complaint. This is essential for fair dispute resolution.

---

## Q23: What if a user deletes their account mid-trade?
**Answer:** ✅ **Block account deletion if active trades exist.** If a user attempts to delete their account while they have any trade in `negotiating`, `accepted`, or `disputed` status, the deletion is blocked with the message: *"You cannot delete your account while you have active trades. Please resolve or cancel all active trades first."*

---

## Q24: What happens to trades when a user is suspended?
**Answer:** ✅ **Trades are frozen, not cancelled.**

**Rules:**
- All trades involving a suspended user are frozen — they cannot move forward (no messages, no counter-proposals, no status changes)
- Suspended users **cannot send messages** to other users in any trade thread
- The other party in a frozen trade may still cancel their side if they choose to trade their item elsewhere — if they do, that trade moves to `cancelled` because the item is no longer available
- When the suspension is lifted, all frozen trades resume from exactly where they left off
- Trades already in `accepted` status (items potentially in transit) are flagged for admin review rather than frozen, since cancelling them could harm an innocent party whose item is already shipped

---

## Summary Table (Updated)

| # | Question | Decision |
|---|---|---|
| Q1 | Messages clean break? | ✅ Yes — clean break |
| Q2 | Multiple proposals per item? | ✅ Yes — auto-decline others on acceptance |
| Q3 | Item visibility during trade? | ✅ Visible with "In Trade" badge; removed only on acceptance |
| Q4 | Cash trades allowed? | ✅ Yes — with mandatory platform disclaimer |
| Q5 | Who pays shipping? | ✅ Each trader pays their own |
| Q6 | One-sided tracking after 15 days? | ✅ Auto-escalate to disputed (unless both confirmed receipt) |
| Q7 | International carriers? | ✅ Add "Other" free-text option |
| Q8 | Review edits? | ✅ No edits; photos can be added by reviewer, removed by admin only |
| Q9 | Reviews public? | ✅ Yes |
| Q10 | Minimum trades for rating? | ✅ 2 completed reviews |
| Q11 | Either party cancel while negotiating? | ✅ Yes — either party can cancel at any time |
| Q12 | Auto-cancel clock starts when? | ✅ From last message or action |
| Q13 | Counter-proposal limit? | ✅ Indefinite — until one side cancels |
| Q14 | Offer items already in another trade? | ✅ Yes — first acceptance wins; others auto-cancel when item is traded |
| Q15 | Damaged item on receipt? | ✅ "Received but damaged" button triggers complaint |
| Q16 | Receipt confirmation window? | ✅ 15 days after tracking submitted |
| Q17 | Feedback mandatory? | ✅ Yes — required to fully close a trade |
| Q18 | Blind review? | ✅ Yes — hidden until both submit or 7 days pass |
| Q19 | Message character limit? | ✅ Unlimited |
| Q20 | Who files complaints? | ✅ One complaint per trade, either party |
| Q21 | Resolving complaint outcome? | ✅ Admin chooses: completed or cancelled |
| Q22 | Admin sees trade messages? | ✅ Yes — full read access |
| Q23 | Account deletion mid-trade? | ✅ Blocked until all active trades resolved |
| Q24 | Suspension mid-trade? | ✅ Trades frozen; resume when suspension lifted; accepted trades flagged for admin |
