# Tradebilia Administrator Record Retention Policy

**Effective date:** 2026-08-28  
**Scope:** Administrator removal actions for member accounts, trade records, and support tickets.

## Plain-language rule

> **Ordinary administrator controls do not permanently erase member, trade, or support records.** They use a retained archive or close outcome instead.

This policy protects marketplace, support, and safety history from accidental deletion while preserving the information administrators may need for later review.

## What each approved control does

| Administrator workspace | Approved retained outcome | Required safeguard | Records retained |
|---|---|---|---|
| **Users** | **Archive Member Account** closes sign-in access, hides the public profile, and deactivates active listings through the existing guarded closure workflow. | Administrator role, a reason of at least 10 characters, the exact phrase `ARCHIVE MEMBER ACCOUNT`, and a fresh blocker check. Administrator, suspended, banned, or unresolved accounts are refused. | The user row, listings, trade history, support history, reports, safety history, and prior membership history. |
| **Trades** | **Archive Trade Record** removes an eligible finished trade from the normal trade list while keeping it available through **Show archived records**. | Administrator role, a reason of at least 10 characters, the exact phrase `ARCHIVE TRADE RECORD`, terminal trade status only, and a duplicate-archive check. | The proposal, messages, alerts, items, reviews, tracking history, complaints, notes, and other linked trade evidence. |
| **Tickets** | **Close & Retain Ticket** closes a support ticket and removes it from the ordinary ticket list while keeping it available through **Show retained tickets**. | Administrator role, a reason of at least 10 characters, and the exact phrase `CLOSE AND RETAIN TICKET`. | The ticket, original request, all replies, and its normal status history. |

Each completed archive/close action writes a targeted record to the central administrator activity log with the administrator, action type, record reference, and stated reason.

## Permanent purge is intentionally unavailable

There is **no ordinary UI control or enabled API procedure** for permanently purging a member, trade, or ticket record. The legacy deletion procedures are disabled and return an explanatory error rather than performing a deletion.

An exception-only purge must not be added casually. It needs a separate written approval that specifies the lawful/operational basis, exact record types, minimum retention period, relationship to open trade/safety/support matters, audit evidence, migration plan where necessary, backup/rollback plan, and a high-friction administrator approval flow. Until that approval exists, retained archives are the only supported removal outcome.

## Daily review

Use **Operations** to start daily work. It now includes a read-only **Closure requests** count that links directly to the existing Closure Requests workspace. That workspace—not Operations—remains responsible for reviewing blockers and recording approval or decline decisions.

## Non-goals

This policy does not change Free Launch access, Fee Mode, Stripe behavior, provider credentials, schedules, existing member/trade/ticket records, or the older historical Deleted Accounts reference list.
