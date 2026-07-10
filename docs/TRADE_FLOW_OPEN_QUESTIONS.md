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
