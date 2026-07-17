# Tradebilia: Trade Flow V2 Wireframes (Conflict-Free)

**Version:** 2.1
**Date:** July 16, 2026
**Status:** Approved — All conflicts with TRADE_FLOW_DECISIONS.md and TRADE_FLOW_OPEN_QUESTIONS.md resolved.

---

## 1. The Trade Hub (The Dashboard)

The central command center for all trade activities. The page follows the same global layout as the main home page — top bar, hero section, and category bar — before the 3-column trade interface begins.

```text
__________________________________________________________________________________________
[ GLOBAL TOP BAR: [Logo] Search... [🔍] | My TRADEBILIA | [Bell 🔔] | [Messages ✉️]       ]
__________________________________________________________________________________________
[ HERO SECTION: "Trade Hub" banner (same style as homepage hero)                         ]
[ Tagline: "Manage all your active trades in one place"                                  ]
__________________________________________________________________________________________
[ CATEGORY BAR: Comics | Sports Cards | Vintage Toys | Video Games | Stamps | Pokemon... ]
__________________________________________________________________________________________
[ TRADE HUB TOOLBAR: Search by User or TR#... [🔍] | [Filter: All | Unread | High Value] | [Bulk Actions] ]
__________________________________________________________________________________________
[ SIDEBAR (20%)   ] [ CENTER: INBOX (40%)              ] [ RIGHT: PREVIEW (40%)          ]
[                 ] [                                  ] [                               ]
[ FOLDERS:        ] [ CARD: Amanda (TR-000042)         ] [      [ LARGE ITEM IMAGE ]     ]
[ - Negotiating(3)] [ Status: New Inquiry              ] [      [                  ]     ]
[ - Accepted      ] [ Last Active: 2h ago  [🔴 NEW]   ] [      [ (Your Item)      ]     ]
[ - Shipped       ] [ [ACTION NEEDED]                  ] [                               ]
[ - Declined      ] [                                  ] [ ITEM: Michael Jordan Rookie    ]
[ - Completed     ] [ CARD: David (TR-000043)          ] [ LISTED VALUE: $25,000         ]
[                 ] [ Status: Awaiting Counter         ] [ MKT VALUE (AI): $24,800       ]
[                 ] [ Last Active: 1d ago              ] [                               ]
[                 ] [                                  ] [ TRADER: David Tavani           ]
[                 ] [ CARD: Mary (TR-000044)            ] [ REPUTATION: 4.9 ★             ]
[                 ] [ Status: Negotiating              ] [ VERIFIED: [eBay] [FB] [LinkedIn]]
[                 ] [ Last Active: 25d ago [⚠️ STALE]  ] [ 🟢 Online                     ]
[                 ] [                                  ] [                               ]
[                 ] [                                  ] [ [ BUTTON: ENTER WAR ROOM ]    ]
__________________________________________________________________________________________
```

### Hub Design Notes:
- **Trade Ref Format**: `TR-000001` (simple sequential, per Decision 6).
- **Folders**: 5 folders — Negotiating, Accepted, Shipped, Declined, Completed.
- **"ACTION NEEDED" Tag**: Yellow left-border + tag on cards requiring user response.
- **Online Status**: 🟢 Green = Online, 🔴 Red = Offline (shown in preview panel).
- **Right Panel**: Empty by default until a card is clicked.
- **Empty State** (new users): Same layout, but center shows "No trades yet" message.

---

## 2. The War Room — Negotiation Stage

The active workspace where deals are built, verified, and finalized. The Trade Table stays visible through ALL stages (never collapses automatically, but users can toggle it).

```text
__________________________________________________________________________________________
[ HEADER: TR-000043 | [PROPOSED] ➔ (NEGOTIATING) ➔ [ACCEPTED] ➔ [SHIPPED] ➔ [COMPLETED] ]
[ Back to Trade Hub | 🟢 David is Online                                                  ]
__________________________________________________________________________________________
[ TOP SECTION: THE TRADE TABLE (Collapsible — Expand/Collapse toggle)                     ]
[                                                                                        ]
[   YOUR SIDE (User B)              |               THEIR SIDE (User A)                  ]
[   [ Item Image ][X]               |               [ Item Image ][X] [ Item Image ][X]  ]
[   1986 Fleer Jordan               |               1999 Charizard  |  1980 Henderson    ]
[   Listed: $25,000                 |               Listed: $12,000 |  Listed: $12,500   ]
[   Mkt (AI): $24,800               |               Mkt (AI): $11,800 | Mkt (AI): $12,200]
[                                   |                                                    ]
[   CASH YOU RECEIVE: [ $300  ]     |               CASH YOU PAY:    [ $0    ]           ]
[                                                                                        ]
[   [==== FAIRNESS METER ====]  [✨ AI Analyze]                                           ]
[   [|---------|---------|] GAP: $200 in your favor                                      ]
__________________________________________________________________________________________
[ MIDDLE SECTION: SERVICE & TRUST                                                         ]
[                                                                                        ]
[ [ ] Request Middle Man Service ($) | [X] LinkedIn Verified | [📹 Start Video Call]      ]
[ (Both parties must agree)          | [X] eBay Verified     |                            ]
__________________________________________________________________________________________
[ BOTTOM SECTION: INTERACTION & COMMUNICATION                                             ]
[                                   |                                                    ]
[   [ VIEW INVENTORY (Slide-Out) ]  |               [ FLOATING VIDEO WINDOW ]            ]
[   (Opens side panel to browse     |               [   (Draggable)           ]          ]
[    other user's items)            |               [   [📷 Snapshot] [🔇] [🎥]]          ]
[                                   |                                                    ]
[   [ CHAT & TIMELINE ]             |               [ 📝 PRIVATE NOTES (Slide-Out) ]     ]
[   - System: David added Charizard |               [                                ]   ]
[   - David: "How does this look?"  |               [                                ]   ]
[   - System: Video snapshot saved  |               [                                ]   ]
[   - AI: "Trade Score: 87/100..."  |               [                                ]   ]
[   [ Type message...         ] [📩]|               [                                ]   ]
__________________________________________________________________________________________
[ FOOTER: [📢 GET OPINION]                     [❌ DECLINE] [💾 UPDATE] [✅ ACCEPT TRADE] ]
[ (Only active when both sides have items)                                                ]
__________________________________________________________________________________________
```

### War Room — Negotiation Design Notes:
- **Trade Ref Format**: `TR-000043` (sequential).
- **Auto-Cancel Timer**: Only appears when close to 30-day limit (e.g., after 20 days).
- **Fairness Meter + AI Analyze**: Grayed out until items are on BOTH sides.
- **"Get Opinion" Button**: Only active when items are on both sides.
- **Item Removal**: Small [X] on each item card (instant, no confirmation needed).
- **Inventory Browser**: Opens as a slide-out panel from the side.
- **Video Call**: Either user can initiate; other must accept. Shows online status.
- **Middle Man**: Checkbox available at any time; both must agree before it takes effect.
- **Cash Disclaimer**: Shown when cash is added: "Tradebilia is not liable for cash transactions."
- **Values**: Listed Price shown large; AI Market Value shown smaller below it.
- **Collapsible Table**: Users can toggle between expanded (all items) and collapsed (totals only).

---

## 3. The War Room — Shipping Stage

After both users accept and confirm the Trade Contract, the War Room transforms to show shipping information while keeping the Trade Table visible at the top.

```text
__________________________________________________________________________________________
[ HEADER: TR-000043 | [PROPOSED] ➔ [NEGOTIATING] ➔ [ACCEPTED] ➔ (SHIPPED) ➔ [COMPLETED] ]
[ Back to Trade Hub | 🔴 David is Offline                                                 ]
__________________________________________________________________________________________
[ TOP SECTION: THE TRADE TABLE (Read-Only — Items Locked)                                 ]
[   (Same as negotiation view but no [X] buttons — items are locked in)                  ]
__________________________________________________________________________________________
[ SHIPPING INFORMATION                                                                    ]
[                                                                                        ]
[   YOUR INFO (Auto-populated):     |    THEIR INFO:                                     ]
[   Name: Rich Tavani               |    Name: David Smith                               ]
[   Address: 123 Main St...         |    Address: 456 Oak Ave...                         ]
[   Email: rich@email.com           |    Email: david@email.com                          ]
[   Phone: (555) 123-4567           |    Phone: (555) 987-6543                           ]
[                                                                                        ]
[ TRACKING:                                                                               ]
[   Your Shipment:                  |    Their Shipment:                                 ]
[   Carrier: [USPS ▼] [UPS] [FedEx] [DHL] [Other: ___]                                  ]
[   Tracking #: [________________]  |    USPS: 9400111899223... [🔗 Track]               ]
[   [Submit Tracking]               |    Submitted: July 18, 2026                        ]
__________________________________________________________________________________________
[ FOOTER:                                                                                 ]
[ [ ✅ ITEMS RECEIVED ]    [ ⚠️ RECEIVED BUT DAMAGED ]                                    ]
[                     [ File Complaint (link) ]                                           ]
__________________________________________________________________________________________
```

### War Room — Shipping Design Notes:
- **Trade Table**: Stays visible (read-only, no removal).
- **Carrier Options**: USPS, UPS, FedEx, DHL, **Other** (free-text field per Q7).
- **"Received but Damaged"**: Separate, always-visible button (triggers complaint).
- **"File Complaint"**: Smaller link below the main buttons for other issues.
- **15-Day Timer**: Auto-escalates to disputed if receipt not confirmed (per Q6).
- **Admin Flag**: System flags for admin review if 15 days pass without confirmation.

---

## 4. The Trade Contract (Confirmation Modal)

Appears after clicking "Accept Trade" for final verification. Both users must confirm.

```text
__________________________________________________________________________
|                        THE TRADE CONTRACT                              |
|________________________________________________________________________|
|                                                                        |
| Please verify the final terms for Trade Reference: TR-000043           |
|                                                                        |
| YOU ARE GIVING:                                                        |
| - 1986 Fleer Michael Jordan #57 (PSA 10)                               |
|   Listed: $25,000 | Market: $24,800                                    |
|                                                                        |
| YOU ARE RECEIVING:                                                     |
| - 1999 Pokemon Base Set Charizard (Holo)                               |
| - 1980 Topps Rickey Henderson Rookie (PSA 9)                           |
| - $300.00 Cash                                                         |
|                                                                        |
| LOGISTICS:                                                             |
| - [X] Middle Man Service Selected (Ship to Tradebilia HQ)               |
| - Each trader pays their own shipping                                  |
|                                                                        |
| DISCLAIMER:                                                            |
| "Tradebilia is a marketplace that brings collectors together. We are   |
|  not liable for any trades, items, or cash transactions that go wrong. |
|  All trades are conducted at the sole risk of the participating        |
|  collectors."                                                          |
|                                                                        |
| [ ] I understand that by confirming, I am locking in this trade.       |
|                                                                        |
|      [ CANCEL ]                                [ CONFIRM & LOCK ]      |
|________________________________________________________________________|
```

### Contract Design Notes:
- **3-Day Window**: After User A confirms, User B has 72 hours to also confirm or trade auto-cancels (per Q26/Q36).
- **Locking**: Once confirmed, items are removed from marketplace and locked.
- **Cash Disclaimer**: Always shown when cash is part of the deal.

---

## 5. The Trade Voting Page (Community Opinion)

Anonymous page where logged-in users can evaluate a trade. Link expires after 3 days.

```text
__________________________________________________________________________
|                     COMMUNITY TRADE EVALUATION                         |
|________________________________________________________________________|
|                                                                        |
| TRADER A IS OFFERING:             | TRADER B IS OFFERING:              |
| - [Item Image] Item Name          | - [Item Image] Item Name           |
| - [Item Image] Item Name          | - [Item Image] Item Name           |
| - $300 Cash                       |                                    |
| Total Value: ~$25,100             | Total Value: ~$24,800              |
|                                                                        |
| YOUR VERDICT:                                                          |
| [ 🟢 STEAL (Great for A) ] [ 🟡 FAIR TRADE ] [ 🔴 PASS (Bad for A) ] |
|                                                                        |
| COMMUNITY RESULTS: 72% Fair | 18% Steal | 10% Pass (24 votes)         |
|                                                                        |
| COMMENTS:                                                              |
| - ExpertCollector99: "The centering on that Jordan is..."              |
| - PokeFan2024: "Charizard market is trending up..."                    |
| [ Add your comment... ] [Submit]                                       |
|                                                                        |
| ⏰ This evaluation expires in 2 days, 14 hours                         |
|________________________________________________________________________|
```

### Voting Page Design Notes:
- **Anonymous**: Shows "Trader A" and "Trader B" (no real usernames).
- **Login Required**: Must have a Tradebilia account to vote or comment.
- **3-Day Expiry**: Link expires after 3 days.
- **"Get Opinion" Button**: Only available in War Room when items are on both sides.

---

## 6. Feedback Stage (Blind Review System)

After both users confirm receipt, the War Room shows the feedback form. Reviews are hidden until both submit or 7 days pass (blind review per Q18/Q27).

```text
__________________________________________________________________________
|                        LEAVE YOUR FEEDBACK                             |
|________________________________________________________________________|
|                                                                        |
| Trade Experience:    ★ ★ ★ ★ ☆  (4/5)                                 |
| Item Condition:      ★ ★ ★ ★ ★  (5/5)                                 |
| Communication:       ★ ★ ★ ★ ☆  (4/5)                                 |
| Shipping Speed:      ★ ★ ★ ☆ ☆  (3/5)                                 |
|                                                                        |
| Written Review (optional):                                             |
| [ Great trader! Items exactly as described. Shipping was a bit slow   ]|
| [ but everything arrived safely.                                      ]|
|                                                                        |
| Photos (optional, up to 5):                                            |
| [ + Add Photos ]                                                       |
|                                                                        |
| [ SUBMIT REVIEW ]                                                      |
|                                                                        |
| ℹ️ Your review will be visible after both parties submit               |
|    (or after 7 days, whichever comes first).                           |
|________________________________________________________________________|
```

### Feedback Design Notes:
- **Blind Review**: Hidden until both submit or 7 days pass.
- **No Edits**: Once submitted, text cannot be changed. Photos can be added later.
- **Mandatory**: Required to fully close a trade. Daily reminders after 7 days.
- **4 Categories**: Trade Experience, Item Condition, Communication, Shipping Speed.
- **Overall Rating**: Calculated as average of the 4 categories.
