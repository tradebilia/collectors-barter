
## Pokémon ranking and cap validation — October 30, 2026
Confirmed the approved 100-point Pokémon ranking models are active for Single Card, Set, and Unopened Product across the shared marketplace/eBay visual-filter path. Confirmed cap bands: scores 90–100 allow 8 visual reviews, 80–89 allow 6, 70–79 allow 4, 60–69 allow 2, and below 60 allows none. Candidates outside the cap retain ranking metadata as context-only; Collection/Lot receives no ranking or visual-review allowance.

Added explicit cap-band regressions. Focused visual-filter tests passed 173/173, TypeScript passed, and diff checks passed. No database, migration, credential, provider, deployment, or publishing changes.

## Stamps / Single Stamp field update — October 30, 2026
Updated the inventory form so Gum Type and Hinge Status are required fields in the Required section. Gum Type now uses Original Gum (OG), Partial Original Gum (POG), Disturbed Gum (DG), Regummed (RG), No Gum (NG), Issued Without Gum (N/A), and Unknown. Hinge Status now uses Never Hinged (NH), Lightly Hinged (LH), Hinged (H), Heavily Hinged (HH), Hinge Remnant (HR), Unknown, and Not Applicable (N/A). Existing analyzer aliases remain compatible with the full stored labels. Focused tests passed 185/185, TypeScript passed, production build passed, and diff/layout checks passed. No database, migration, credential, provider, deployment, or publishing changes.
