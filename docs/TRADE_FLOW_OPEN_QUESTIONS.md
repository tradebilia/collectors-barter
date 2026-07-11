# Trade Flow — Open Questions & Answers

**Version:** 3.0  
**Date:** July 11, 2026  
**Status:** ✅ All Questions Answered — Finalized for Implementation

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
| Q10 | Minimum trades for rating? | ✅ 1 completed review (Revised from 2) |
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
| Q24 | Suspension mid-trade? | ✅ Trades frozen; resume when suspension lifted |
| Q25 | Auto-cancel timer? | ✅ 30 days of no activity |
| Q26 | 3-day acceptance window? | ✅ Yes — still correct |
| Q27 | Blind review vs immediate? | ✅ Blind review (overrides original spec) |
| Q28 | Profile before reviews? | ✅ Show "No ratings yet" if 0 trades; show rating after 1+ |
| Q29 | Can users hide their profile? | ✅ No — all profiles are always public |
| Q30 | Reviews after post-completion complaint? | ✅ Reviews stay published; removed only if admin cancels trade |

---

## Detailed Decisions

### Stage 1 — Initiation & Alerts

**Q1: What happens to the existing Messages page trade threads?**  
✅ **Clean break.** Remove trade proposal logic from Messages entirely. The new `/trade-alerts` page handles all trade activity. Messages is for direct human communication only.

**Q2: Can a user have multiple active trade proposals for the same item?**  
✅ **Yes — multiple proposals are allowed.** When one proposal is accepted, all other pending proposals for the same item are automatically declined.

**Q3: What happens to an item's listing status during an active trade?**  
✅ **Item remains visible in the marketplace** while in `negotiating`. It is only removed (status `traded`) when both users have formally agreed (`accepted`). An "In Trade" badge is displayed during negotiation.

**Q4: Cash-Only Trade Handling**  
✅ **Cash trades are allowed.** Tradebilia does not act as a middleman.
**Required Disclosure:** *"Tradebilia is a marketplace that brings collectors together. We are not liable for any trades, items, or cash transactions that go wrong. All trades are conducted at the sole risk of the participating collectors."*

**Q11: Can a user cancel a trade they initiated?**  
✅ **Either party can cancel at any time while the trade is in `negotiating` status.**

**Q19: Trade proposal message character limit**  
✅ **Unlimited.**

**Q25: Auto-cancel timer?**  
✅ **30 days of no activity.** The clock resets on every message or action.

**Q26: 3-day acceptance window?**  
✅ **Yes — still correct.** When User A accepts, User B has 3 days to confirm before auto-cancel.

---

### Stage 2 — Negotiation

**Q13: Counter-proposal limit**  
✅ **No limit — counter-proposals can go back and forth indefinitely.**

**Q14: Can User B offer items already in another active trade?**  
✅ **Yes — items can be offered in multiple simultaneous trade negotiations.** Once an item is traded, other active negotiations involving that item are automatically cancelled.

---

### Stage 3 — Shipping & Verification

**Q5: Who pays for shipping?**  
✅ **Each trader pays their own shipping costs.**

**Q6: One-sided tracking after 15 days?**  
✅ **Auto-escalate to disputed.** Unless both have already confirmed receipt.

**Q7: International Shipping**  
✅ **Add an "Other" carrier option** with a free-text field for carrier name.

**Q15: What if an item arrives damaged?**  
✅ **"Received but damaged" button.** Triggers a complaint record. Tradebilia can only suspend if the user doesn't make it right.

**Q16: Receipt confirmation window**  
✅ **15 days after a tracking number is submitted.** Auto-completes if recipient doesn't click.

---

### Stage 4 — Feedback & Ratings

**Q8: Can a user edit their review after submitting?**  
✅ **No edits to review text.** Reviewers can **add** photos later; only an **admin** can remove photos.

**Q9: Should reviews be public?**  
✅ **Yes.** Visible on user profiles.

**Q10: Minimum trade count before ratings appear publicly?**  
✅ **1 completed review.** (Revised from 2).

**Q17: Is feedback mandatory?**  
✅ **Yes — required to fully close a trade.**

**Q18: Blind review system**  
✅ **Blind review.** Both reviews hidden until both submit or 7 days pass. (Overrides original spec).

**Q27: Blind review vs immediate?**  
✅ **Blind review.** (Confirms Q18).

**Q28: Profile before reviews?**  
✅ **Show "No ratings yet" if 0 trades; show rating after 1+ completed review.**

**Q30: Reviews after post-completion complaint?**  
✅ **Reviews stay published.** Removed only if the admin decides to cancel/void the trade.

---

### Admin & Moderation

**Q20: Who can file a complaint?**  
✅ **One complaint per trade — filed by either party.**

**Q21: What does "resolving" a complaint do to trade status?**  
✅ **Admin chooses the outcome:** `completed` or `cancelled`.

**Q22: Can admins see the full trade message thread?**  
✅ **Yes.** Full read access during complaints.

**Q23: What if a user deletes their account mid-trade?**  
✅ **Block account deletion if active trades exist.**

**Q24: What happens to trades when a user is suspended?**  
✅ **Trades are frozen, not cancelled.** Suspended users cannot message. Trades resume when suspension is lifted.

**Q29: Can users hide their profile?**  
✅ **No — all profiles are always public.**

---

## Q31: Can an Admin "force-complete" or "force-cancel" a trade?
**Answer:** ✅ **Yes.** Admins have the power to manually override a trade's status (to `completed` or `cancelled`) from the Admin Dashboard at any time, even without a formal complaint.

---

## Q32: When a user is suspended, what happens to their public listings?
**Answer:** ✅ **Option B — Hide them entirely.** All listings belonging to a suspended user are hidden from the marketplace and search results until the suspension is lifted.

---

## Q33: Can a user delete a listing while it's in an active trade?
**Answer:** ✅ **It depends on the trade status:**
- **In Negotiation:** Yes. The user can delete the item, which will automatically cancel the trade with the system message: *"Trade cancelled: Item [Name] is no longer available."*
- **In Accepted Trade:** No. Deletion is blocked. The user must first cancel the trade (if allowed) before they can delete the item.

---

## Q34: What if a user edits an item's details mid-trade?
**Answer:** ✅ **Only photos and value can be edited.** All other item details (title, description, category, etc.) are locked once the item is listed. 
- If a user adds/removes photos or changes the value, the trade negotiation continues.
- The Trade Summary will reflect the **current** value of the item. If a user changes the value mid-negotiation, the other party will see the new value in the summary.

---

## Q35: "Trade Alerts" vs. "Messages" — can they still talk?
**Answer:** ✅ **Yes — but only within the trade thread.** The Trade Alerts page will have its own dedicated chat thread for each trade. These messages stay within that trade record and do not appear in the general "Messages" inbox.

---

## Q36: What if a user ignores the "3-day acceptance window"?
**Answer:** ✅ **Option A — Auto-cancel.** The trade is automatically cancelled after 72 hours of inactivity once one party has accepted. No formal penalty is applied to the non-responding user for now.

---

## Final Summary Table (All 36 Questions)

| # | Question | Decision |
|---|---|---|
| Q1 | Messages clean break? | ✅ Yes — clean break |
| Q2 | Multiple proposals per item? | ✅ Yes — auto-decline others on acceptance |
| Q3 | Item visibility during trade? | ✅ Visible with "In Trade" badge; removed only on acceptance |
| Q4 | Cash trades allowed? | ✅ Yes — with mandatory platform disclaimer |
| Q5 | Who pays shipping? | ✅ Each trader pays their own |
| Q6 | One-sided tracking after 15 days? | ✅ Auto-escalate to disputed |
| Q7 | International carriers? | ✅ Add "Other" free-text option |
| Q8 | Review edits? | ✅ No edits; photos can be added by reviewer, removed by admin only |
| Q9 | Reviews public? | ✅ Yes |
| Q10 | Minimum trades for rating? | ✅ 1 completed review |
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
| Q24 | Suspension mid-trade? | ✅ Trades frozen; resume when suspension lifted |
| Q25 | Auto-cancel timer? | ✅ 30 days of no activity |
| Q26 | 3-day acceptance window? | ✅ Yes — still correct |
| Q27 | Blind review vs immediate? | ✅ Blind review (overrides original spec) |
| Q28 | Profile before reviews? | ✅ Show "No ratings yet" if 0 trades; show rating after 1+ |
| Q29 | Can users hide their profile? | ✅ No — all profiles are always public |
| Q30 | Reviews after post-completion complaint? | ✅ Reviews stay published; removed only if admin cancels trade |
| Q31 | Admin manual status override? | ✅ Yes — can force complete/cancel |
| Q32 | Listings of suspended users? | ✅ Hidden from marketplace |
| Q33 | Delete item mid-trade? | ✅ Allowed in negotiation (cancels trade); blocked in accepted trade |
| Q34 | Editing item mid-trade? | ✅ Only photos and value can be edited; summary reflects current value |
| Q35 | Trade-specific chat? | ✅ Yes — stays in Trade Alerts section |
| Q36 | 3-day window timeout? | ✅ Auto-cancel; no penalty |
