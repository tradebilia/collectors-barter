# Dropdown Filter Sync Audit — 2026-07-08

Comparison of hard-coded filter dropdown options in CategoryPage.tsx vs the actual
dropdown options in the inventory form field definitions (fieldDefinitionsGenerated.ts).

## Findings

| Filter (page) | Old filter options | Form field + actual options | Verdict |
|---|---|---|---|
| Rarity (pokemon) | common, uncommon, rare, holo_rare, secret_rare, full_art, ex, gx, v, vmax, vstar (snake_case values) | `rarity`: Common, Uncommon, Rare, Holo Rare, Ultra Rare, Secret Rare, Illustration Rare, Special Illustration Rare, Hyper Rare (Gold), ACE SPEC, Other | MISMATCH — values snake_case vs stored Title Case; missing new rarities, has non-existent ones (ex/gx/v/vmax/vstar) |
| System (video_games) | 30 snake_case console ids (nes, snes, ps1...) | `platform`: NES, SNES, N64, GameCube, Wii, Wii U, Switch, Switch 2, Sega Master System, Genesis, Saturn, Dreamcast, PS1–PS5, Xbox, Xbox 360, Xbox One, Xbox Series X/S, PC, Other | MISMATCH — snake_case values never match stored Title Case; filter had platforms the form doesn't (Game Boy, DS, PSP, Vita, Arcade, Atari) |
| Region (video_games) | ntsc, pal, japan, other | `region`: NTSC-U, NTSC-J, PAL, Region Free, Unknown, Other | MISMATCH — stored values are NTSC-U/NTSC-J, not ntsc/japan |
| Format (movies) | poster, prop, lobby_card, still, promotional_material, other | `format`: DVD, Blu-ray, 4K UHD, VHS, LaserDisc, Mixed, Other | COMPLETELY WRONG — the filter listed movie memorabilia formats, but the form sells movie media (DVD/Blu-ray/VHS) |
| Medium (autographs) | photo, comic, baseball, jersey, helmet, bat, memorabilia, other | `signedItemType`: Photo, Card, Baseball, Football, Basketball, Hockey Puck, Jersey, Helmet, Bat, Glove, Book, Poster, Program, Ticket, Document, Other | MISMATCH — missing many; wrong casing |
| Denomination (coins) | penny, nickel, dime, quarter, half_dollar, dollar, eagle, other (dropdown) | `denomination` is a FREE TEXT field in the form | WRONG TYPE — filter should be text input, not dropdown |
| Country (stamps) | 6 countries + other (dropdown) | `country` is a dropdown using COUNTRIES_LIST (full country list) | PARTIAL — filter had tiny subset with snake_case values vs stored country names |
| Genre (vintage_toys) | action_figure, doll, vehicle, playset, other (dropdown) | No matching form field (item type distinctions cover this; no "genre" field exists) | ORPHAN — filter has no data to filter on |
| Series (disney_pins) | character, attraction, movie, park, event, limited_edition (dropdown) | `series` is a FREE TEXT field in the form | WRONG TYPE — filter should be text input |
| Sport (sports_cards) | (uses shared sport options) | `sport`: Baseball, Basketball, Football, Hockey, Soccer, Racing, Wrestling, Golf, MMA, Tennis, Multi-Sport, Mixed, Other | Verify casing matches |
| Rookie/Autographed/Signed/Facsimile | yes/no | form stores 'yes'/'no' | OK (backend match already case-insensitive) |
| Condition (all) | tradebiliaConditionOptions | `condition`: mint, near_mint, ... same enum | OK |

## Fix applied

Created `client/src/lib/filterOptions.ts` as the single source of truth:
- Imports/replicates the exact dropdownOptions from fieldDefinitionsGenerated.ts
- Filter values now use the exact strings the form stores (Title Case where applicable)
- Movies Format now shows DVD/Blu-ray/4K UHD/VHS/LaserDisc/Mixed/Other
- Video game System/Region use the form's platform/region lists
- Pokemon Rarity uses the form's current rarity list
- Autographs Medium uses signedItemType options
- Coins Denomination + Disney Pins Series converted to free-text inputs (matching form field type)
- Stamps Country uses COUNTRIES_LIST (same as form)
- Vintage Toys Genre filter removed (no corresponding data field; item type covers it)

Backend: series/format/etc. filters use case-insensitive partial matching so Title Case
values match regardless of user casing.
