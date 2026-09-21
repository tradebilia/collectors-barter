# High-Value Listing Background and Foreground Audit

## Purpose and design rule

This audit reviewed the complete High-Value Listing visual system against the established **Trade Alert** standard. The required selection hierarchy is now explicit: **category** establishes the collector world and palette; **item type** selects the physical environment; and only a relevant, public, structured **secondary field** may add a restrained visual cue. The listing photo remains the only featured collectible. Free-form title words are not primary visual selectors.

The audit found that the prior implementation reversed this order. Secondary details such as Sport, Publisher, Platform, Brand, or Format could replace the item-type environment. It also found that large transparent foreground PNGs were drawn behind the opaque listing-media frame, which made them appear clipped, faded, or absent. The implementation now corrects the shared foundation instead of hiding individual examples.

## Corrected rendering behavior

| Rule | Current behavior |
|---|---|
| Category | Establishes a category-specific Trade Alert-quality collector context and provides the fallback for unsupported or missing item types. |
| Item type | Always selects the base high-value environment before any secondary cue. Canonical aliases such as `other_music_format`, `individual_pin`, `paper_money_banknotes`, and Vintage Toys display names now resolve correctly. |
| Secondary fields | Never replace the base. The first safe implementation is Sports Cards: exact controlled Sport adds a low-opacity background accent over the Single Card, Set, Collection Lot, or Unopened Product base. |
| Titles and broad keywords | Do not select the environment. They remain display content unless a future curated structured field explicitly supports a narrow refinement. |
| Foreground cutouts | Temporarily suppressed in High-Value posts. The previous placement hid them under the real item image; the actual listing media is now the only foreground object until a dedicated unobstructed collector-surface lane is designed. |
| Image composition | Backgrounds use aspect-preserving cover cropping on Facebook, Instagram, Pinterest, X, LinkedIn, and YouTube instead of being horizontally compressed on tall formats. |

## Category audit matrix

| Category | Correct base selector | Approved structured secondary fields | Audit result and action |
|---|---|---|---|
| Sports Cards | Single Card, Set, Collection Lot, or Unopened Product | Exact Sport; Custom Sport only when explicitly provided | Corrected. The base is item-type first. Baseball, Basketball, Football, Hockey, Soccer, Golf, Tennis, Wrestling, MMA, and Multi-Sport can add an approved Sport accent. Racing and Other remain neutral because their legacy scenes were visually defective. |
| Comics | Single Comic, Original Art, or Collection Lot | Publisher only as a future subtle refinement; Artist and Art Type only for Original Art | Corrected hierarchy. A new neutral Collection Lot archive removes the misleading Marvel-specific background material. Publisher and artist scenes cannot override the actual comic format. |
| Music | Vinyl, Cassette, Compact Disc, Eight-Track, or Other Music Format | Artist/Performer, Genre, and Record Label only as future compatible accents | Corrected hierarchy and added the missing `other_music_format` alias. Vinyl imagery no longer replaces cassette, CD, or eight-track scenes merely because an artist field exists. |
| Video Games | Game, Console, Accessory, or Collection Lot | Explicit Platform; Console Name only when it unambiguously maps to a supported family | Corrected hierarchy. A platform cannot replace the physical item-type scene. Generic retro props remain suppressed for unrecognized or modern platforms. |
| Pokémon | Single Card, Set, Unopened Product, or Collection Lot | Controlled Edition/Era, then canonical Set Name only when unambiguous | Corrected hierarchy. A new neutral Single Card scene removes the fabricated competing card. Era cannot replace a sealed-product, set, or collection-lot environment. |
| Movies | Individual Movie, Box Set, or Collection Lot | Exact Format; `Formats Included` only if one unambiguous value | Corrected hierarchy. Format is not allowed to replace an item-type scene. LaserDisc remains neutral rather than incorrectly using a 4K environment. |
| Autographs | Signed Item or Collection Lot | Autograph Category; Signed Item Type; Sport only within a structured Sports Autograph branch | Corrected hierarchy and replaced both unsafe bases with neutral archival scenes. Sports imagery cannot appear for historical, music, entertainment, or mixed autograph lots. |
| Vintage Toys | Action Figure/Doll, Board Game/Puzzle, LEGO, Vehicle, Playset, Plush/Stuffed Toy, Electronic Toy, Model Kit, or Collection Lot | Exact curated Brand, Publisher, Character, or Franchise only after type compatibility is proven | Corrected hierarchy. The broad brand-first scenes and visibly streaked detached props are not used in high-value rendering. |
| Coins | Single Coin, Coin Set, Collection Lot, or Paper Money/Banknotes | Set Type only for Coin Set | Corrected hierarchy and added the Paper Money/Banknotes alias. A new neutral Single Coin scene removes the competing staged coin. |
| Stamps | Single Stamp, Stamp Set/Sheet, or Collection Lot | Controlled Country or curated Set only in a future whitelisted implementation | Already safe in practice because no secondary override existed; now protected by the common item-type-first rule. |
| Disney Pins | Single/Individual Pin, Pin Set, or Collection Lot | Structured Character, Series, or Set only as future restrained accents | Corrected alias coverage and replaced the competing fabricated hero pin with an empty-easel collector scene. |

## Reviewed background replacements

Eight approved backgrounds were visually inspected before upload and registered only where a live base scene was misleading, too literal, or competed with the listing photograph. They provide quiet physical context, clean right-side title/fact space, and no invented featured collectible.

| Item-type environment | Replacement intent |
|---|---|
| Sports Cards — Single Card | Neutral card-collector tabletop with an empty display stand; Sport is layered only after the item type is known. |
| Sports Cards — Unopened Product | Sealed, unbranded product context with no loose cards, packs, ball, or athlete bias. |
| Pokémon — Single Card | Neutral binder and empty display context with no fabricated card or character. |
| Comics — Collection Lot | Neutral archival boxes and bagged boards with no Marvel/DC cover implication. |
| Autographs — Signed Item | Neutral archival desk with an unsigned empty frame; no signature, athlete, portrait, or sports item. |
| Autographs — Collection Lot | Neutral mixed-archive study with no baseballs, helmet, or sports album. |
| Disney Pins — Single/Individual Pin | Empty brass easel and velvet display; no competing character or castle pin. |
| Coins — Single Coin | Empty coin stand and curator materials; no staged secondary coin. |

## Visual verification

A fresh native **1200 × 630 Facebook** export and **1080 × 1080 Instagram** export were inspected for Rickey Henderson Rookie. Both retained the neutral Sports Cards Single Card base, applied the controlled Baseball layer only as a supporting environment, showed an unmistakable stitched-leather baseball collector surface, kept the real card dominant, preserved title and fact contrast, and kept the Trade Value plaque clear of all other content. No detached foreground prop was visible, clipped, repeated, or faded.

## Guardrails for future additions

Future secondary visuals must be added only after the category and item-type base are resolved. A secondary asset must be reviewed at every output aspect ratio, be category-relevant, be structured-data-driven, and must not introduce a competing featured object. If a prop cannot be fully visible on a shared collector surface outside the real media frame, it must not render. This maintains the high-quality Trade Alert approach while keeping High-Value Listings specific, credible, and readable.

## Validation

Focused social-rendering, draft-reconciliation, promotion-opportunity tests, TypeScript checking, production build, whitespace validation, and browser-native Facebook/Instagram visual inspection were run after the audit changes.
