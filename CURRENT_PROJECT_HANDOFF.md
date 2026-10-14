

## Cross-source analyzer-record transparency (2026-10-13)

The Test AI Evidence Review now gives every selected source an **Items sent to analyzer** panel. The panel is driven by the same normalized source decision used for analyzer counts, not a second provider query. Record-bearing adapters expose bounded, source-attributed details (title, price, date, URL, and current-value or historical-trend bucket) for the records classified for analyzer submission. Sources with zero accepted records explicitly say that no records are being sent under the current treatment; if an adapter reports an accepted count without display-level details, the UI says so rather than inventing rows. Catalog, certification, asking-price, guide, and unavailable sources remain visibly classified as non-sale/context or guide evidence.

This is a transparency-only phase. It does not change provider search criteria, valuation weights, identity gates, lot gates, price-safety thresholds, or database behavior. Added coverage for shared record preservation and the all-source UI panel.
