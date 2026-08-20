# Category Filter Expansion and Homepage Cleanup Audit

## Approved Filter Coverage

The Category Page interface now exposes the approved high-value item-entry criteria while retaining the existing **Search** or **Enter** submission rule. No filter was made auto-applying, and no mobile-layout redesign was made.

| Category | Added controls |
|---|---|
| Comics | Publisher; Year |
| Vintage Toys | Brand; Year; Grade |
| Video Games | Year; Grade |
| Stamps | Scott Number; Mint / Used; Stamp Grade |
| Coins | Country; Grade |
| Pokémon | Year; Edition / Era; Finish / Variant; Grade |
| Movies | Year; Region; Grade |
| Autographs | Signer |

The typed marketplace feed now validates and applies dedicated `publisher`, `brand`, `scottNumber`, `mintOrUsed`, `stampGrade`, `editionEra`, `finishVariant`, and `signer` channels. Existing year, region, country, and grade channels are reused where the listing form already captures the appropriate value. The Stamp Grade control targets the listing form’s dedicated `stampGrade` property; generic Grade controls accept text to support collectible formats beyond simple decimals, such as numeric card grades, toy scales, and coin designations.

## Homepage Cleanup

The unsupported **Member Growth +15%** claim is replaced by **Calculating**. The Shipping Supplies Coming soon placeholder was removed. The homepage wallpaper, hero dimensions, and statistic-bubble structure were not changed.

## Validation

Focused regression coverage passed **18 tests across 3 files**, including empty-value omission, approved filter query channels, typed server predicates, explicit Search/Enter submission, the Calculating growth placeholder, and Shipping Supplies removal. TypeScript passed. The complete suite passed with **96 test files / 304 tests** and **4 expected skips** under the established live-provider timeout allowance; the production build also passed.

Desktop verification showed the existing Comics and Stamps Category Page visual hierarchy, including the validated **Stamp Grade** control, and the homepage stat strip with **Calculating**. Mobile verification showed the expected current narrow Category Page rail for Pokémon and Autographs; it remains intentionally unchanged at the user’s direction. The homepage mobile view retains its original hero and statistic-bubble structure while showing **Calculating** and no Shipping Supplies block. Full regression, production build, public-domain verification, and canonical-GitHub synchronization remain pending.
