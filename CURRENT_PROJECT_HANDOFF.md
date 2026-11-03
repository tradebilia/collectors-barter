

## Movie visual match is final approval for soft edition differences — November 2, 2026
The Movies pipeline now treats marketplace edition labels such as `Special Edition` as a soft difference, not a deterministic mismatch. Movie edition wording is no longer allowed to block image review; true movie format, release-year, item-type, box-set size, and sealed-status conflicts remain protected. Movie title comparison also tolerates provider titles that omit a studio prefix or include release-year/format wording, while the visual result remains the final approval decision.

Added a Hercules regression proving a `Hercules (Blu-ray + DVD, 1997) Special Edition` candidate reaches image review and remains eligible when the visual result is `match`. Visual-source tests passed 203/203; sold-comps and UI regressions passed 95/95; TypeScript validation passed; production build passed. No database, migration, seed, destructive, credential, provider, deployment, or publishing changes were made.
