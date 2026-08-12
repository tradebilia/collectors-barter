# Legacy Schema Compatibility Audit

## Scope

This read-only audit compared the deployed Custom Database columns with the project’s Drizzle table definitions. It reports only application-defined columns that are absent from a live table; it does not disclose database credentials or customer data.

## Results

| Live table | Missing columns expected by current code | Runtime impact | Status |
|---|---|---|---|
| `directMessageThreads` | `itemId` | Previously blocked new direct-message creation. | **Repaired in application code.** Threads now use a participant pair and explicit timestamps. |
| `tradePayments` | `payerId`, `payeeId`, `paypalEmail`, `verificationResult` | The PayPal payment-verification route can fail when it queries, creates, or updates a payment record. | **Unrepaired compatibility risk.** Requires a deliberately approved database migration or a legacy-compatible payment persistence path. |
| `users` | `ebayStar`, `ebayPositive12mo`, `ebayNeutral12mo`, `ebayNegative12mo`, `ebayIsStoreOwner` | An eBay OAuth completion or eBay-profile refresh can fail when it saves or reads extended eBay feedback metadata. | **Unrepaired compatibility risk.** Requires a deliberately approved database migration or an eBay compatibility fallback. |

All other deployed tables with matching Drizzle definitions had no missing application-defined columns in this audit.

## Immediate recommendation

The direct-message error is isolated and repaired in application code. Do not use the PayPal verification workflow or complete an eBay account connection until the two remaining legacy-schema gaps are addressed through an explicitly approved compatibility fix or migration.
