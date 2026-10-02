# Signed Comic Source Policy — 2026-10-02

## Purpose

Ensure signed comic evidence is not treated as a match merely because the title, issue, grade, and grading company match.

## Target-field interpretation

For comics, a selected item with a signed/autograph field set to **Yes** is treated as an autograph-bearing item. The adapter extracts all available signer names from structured item details, including `signer`, `signers`, `signatureName`, `signatureNames`, `signedBy`, `signedByName`, `autographBy`, `autographNames`, and `artistSignature`. Array and comma/semicolon/ampersand/“and” separated values are supported.

Explicit title extraction is limited to wording such as **“Signed by Stan Lee”** or **“Autographed by Stan Lee”**. Generic words such as “Signed Comic” are not interpreted as a person’s name.

## Matching rules

- Unsigned target + signed candidate: hard mismatch.
- Signed target + unsigned candidate: hard mismatch or review according to the existing identity-state gate.
- Signed target with known signer names + candidate signed by a different person: hard mismatch; never valuation-eligible.
- Signed target with known signer names + candidate signed but no signer name stated: review-only; never accepted as a clean direct comparable.
- Signed target with a candidate signer set that is missing a target signer or contains an additional signer: hard mismatch; it cannot be a perfect identity match.
- Multiple target signers require exact set equality. Every target signer must be present and no additional candidate signer may be present. The order of names does not matter.

## Query behavior

Goldin’s strict comic query now includes the structured comic title, issue number, available publication year, all recorded signer names, certification company, and grade. If that query produces no lots, bounded signer-free and progressively vaguer fallback queries are attempted. The displayed query remains transparent and lists the attempted variants.

The final deterministic analyzer applies the signer gate to all marketplace records that reach comparable scoring, including eBay, ComicConnect, Goldin, Parse.bot sources, and specialist adapters. Existing non-comic autograph-category rules remain unchanged.

## Validation

- Focused signer/comic/autograph/specialist tests: **76 passed**
- Full repository suite: **1,269 passed, 6 skipped** across 308 files
- TypeScript: passed
- Production build: passed
- Build emitted only the existing large-chunk warning
- No database writes, migrations, publication, credentials, or external account changes
