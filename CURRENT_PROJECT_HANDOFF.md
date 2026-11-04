

## Disney Pins single-pin scoring normalization — November 4, 2026

Fixed the shared Disney Pins metadata scorer so the stored `single_pin` item type is normalized to the same `individual_pin` scoring path already used by the visual-selection logic. Before this repair, valid Disney Pins targets were recognized for selection but the scorer rejected the raw alias and returned `0/100`, causing the visual cap to become zero and every candidate to be held out before image comparison. `pin_set` and `collection_lot` behavior remains unchanged.

Added regression coverage proving a `single_pin` target receives identity points. Validation passed: visual-filter and category-comparable tests **223/223**, TypeScript, production build, diff check, and forbidden-path audit. No database, migration, seed, destructive, credential, provider, deployment, publishing, or domain changes were made.
