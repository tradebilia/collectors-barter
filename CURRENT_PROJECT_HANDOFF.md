
## Pokémon ranking and cap validation — October 30, 2026
Confirmed the approved 100-point Pokémon ranking models are active for Single Card, Set, and Unopened Product across the shared marketplace/eBay visual-filter path. Confirmed cap bands: scores 90–100 allow 8 visual reviews, 80–89 allow 6, 70–79 allow 4, 60–69 allow 2, and below 60 allows none. Candidates outside the cap retain ranking metadata as context-only; Collection/Lot receives no ranking or visual-review allowance.

Added explicit cap-band regressions. Focused visual-filter tests passed 173/173, TypeScript passed, and diff checks passed. No database, migration, credential, provider, deployment, or publishing changes.

## Stamps / Single Stamp field update — October 30, 2026
Updated the inventory form so Gum Type and Hinge Status are required fields in the Required section. Gum Type now uses Original Gum (OG), Partial Original Gum (POG), Disturbed Gum (DG), Regummed (RG), No Gum (NG), Issued Without Gum (N/A), and Unknown. Hinge Status now uses Never Hinged (NH), Lightly Hinged (LH), Hinged (H), Heavily Hinged (HH), Hinge Remnant (HR), Unknown, and Not Applicable (N/A). Existing analyzer aliases remain compatible with the full stored labels. Focused tests passed 185/185, TypeScript passed, production build passed, and diff/layout checks passed. No database, migration, credential, provider, deployment, or publishing changes.

## Preserved project safeguards
P0 remediation completed. This development project uses the existing custom database and the read-only database baseline remains authoritative. Do not apply migrations, seed scripts, or destructive scripts as part of this work. P1 performance and maintainability work remains separate from the approved feature changes.

## Stamps / Single Stamp analyzer refinement — October 30, 2026
The marketplace/eBay filter now evaluates Hinge Status and Gum Type independently instead of using one combined hinge/gum signal. It normalizes the approved full names and abbreviations, preserves unknown values as unknown, returns separate mismatch reasons, and keeps the Single Stamp ranking at 100 points: Hinge Status 3 points and Gum Type 2 points. Focused Stamps regressions passed 186/186, TypeScript passed, production build passed, score-total and diff checks passed, and the handoff contract passed 13/13. The complete suite reached 1,877 passing / 7 skipped; the remaining Hake’s network timeout is unrelated and pre-existing. No database, migration, credential, provider, deployment, or publishing changes.

## Autographs search designation — October 30, 2026
Added the default marketplace search term `autograph` to every Autographs / Signed Item structured query. It now appears before signer, signed item type, autograph category, authentication company, and inscription in the shared query builder and in both active eBay and Sold-Comps router branches. Other categories are unchanged. Focused query/router tests passed 210/210, TypeScript passed, production build passed, and diff checks passed. No database, migration, credential, provider, deployment, or publishing changes.

## Autographs replica exclusion — October 30, 2026
The Autographs / Signed Item market-range workflow now excludes candidates that explicitly declare replica, reproduction, facsimile, reprint, copy, or counterfeit status in structured fields or listing titles. Candidates without an explicit authenticity declaration remain eligible. The rule applies to active eBay context results and Sold-Comps market-range results; it does not send anything to visual analysis and does not change Collection/Lot blocking. Focused Autographs/filter tests passed 211/211, TypeScript passed, production build passed, and diff checks passed. No database, migration, credential, provider, deployment, or publishing changes.
