# High-Value Listing Background and Foreground Audit

## Purpose and design rule

This audit reviewed the complete High-Value Listing visual system against the established **Trade Alert** standard. The required selection hierarchy is now explicit: a reviewed **subject reference** is the strongest semantic cue and may apply across any category or item type; when no subject reference matches, **category** establishes the collector world and palette, **item type** selects the physical environment, and only a relevant, public, structured **secondary field** may add a restrained visual cue. The listing photo remains the only featured collectible. Subject matching is whitelist-based rather than arbitrary free-form styling.

The audit found that the prior implementation reversed this order. Secondary details such as Sport, Publisher, Platform, Brand, or Format could replace the item-type environment. It also found that large transparent foreground PNGs were drawn behind the opaque listing-media frame, which made them appear clipped, faded, or absent. The implementation now corrects the shared foundation instead of hiding individual examples.

## Corrected rendering behavior

| Rule | Current behavior |
|---|---|
| Category | Establishes a category-specific Trade Alert-quality collector context and provides the fallback for unsupported or missing item types. |
| Item type | Always selects the base high-value environment before any secondary cue. Canonical aliases such as `other_music_format`, `individual_pin`, `paper_money_banknotes`, and Vintage Toys display names now resolve correctly. |
| Secondary fields | Never bypass the item-type decision. The first safe implementation is Sports Cards: exact controlled Sport selects a reviewed, visible sport-specific variant only after the Single Card, Set, Collection Lot, or Unopened Product base is established. |
| Reviewed subject references | May select a dedicated semantic scene across any category and item type. Matching is restricted to explicitly reviewed subject aliases; unrelated or unrecognized titles retain the category/item-type fallback. |
| Foreground cutouts | Temporarily suppressed in High-Value posts. The previous placement hid them under the real item image; the actual listing media is now the only foreground object until a dedicated unobstructed collector-surface lane is designed. |
| Image composition | Backgrounds use aspect-preserving cover cropping on Facebook, Instagram, Pinterest, X, LinkedIn, and YouTube instead of being horizontally compressed on tall formats. |

## Category audit matrix

| Category | Correct base selector | Approved structured secondary fields | Audit result and action |
|---|---|---|---|
| Sports Cards | Single Card, Set, Collection Lot, or Unopened Product | Exact Sport; Custom Sport only when explicitly provided | Corrected. The item type is resolved first, then Baseball, Basketball, Football, Hockey, Soccer, Golf, Tennis, Wrestling, MMA, and Multi-Sport may select a reviewed visible variant of that exact item-type world. The Baseball high-value variant now reuses the approved Trade Alert Baseball stage so the glove and ball remain unmistakable in the finished export. Racing and Other remain neutral because their legacy scenes were visually defective. |
| Comics | Single Comic, Original Art, or Collection Lot | Publisher only as a future subtle refinement; Artist and Art Type only for Original Art | Corrected hierarchy. A new neutral Collection Lot archive removes the misleading Marvel-specific background material. Publisher and artist scenes cannot override the actual comic format. |
| Music | Vinyl, Cassette, Compact Disc, Eight-Track, or Other Music Format | Artist/Performer, Genre, and Record Label only as future compatible accents | Corrected hierarchy and added the missing `other_music_format` alias. Vinyl imagery no longer replaces cassette, CD, or eight-track scenes merely because an artist field exists. |
| Video Games | Game, Console, Accessory, or Collection Lot | Explicit Platform; Console Name only when it unambiguously maps to a supported family | Corrected hierarchy. A platform cannot replace the physical item-type scene. Generic retro props remain suppressed for unrecognized or modern platforms. |
| Pokémon | Single Card, Set, Unopened Product, or Collection Lot | Controlled Edition/Era, then canonical Set Name only when unambiguous | Corrected hierarchy. A new neutral Single Card scene removes the fabricated competing card. Era cannot replace a sealed-product, set, or collection-lot environment. |
| Movies | Individual Movie, Box Set, or Collection Lot | Exact Format; `Formats Included` only if one unambiguous value | Corrected hierarchy. Format is not allowed to replace an item-type scene. LaserDisc remains neutral rather than incorrectly using a 4K environment. |
| Autographs | Signed Item or Collection Lot | Autograph Category; Signed Item Type; Sport only within a structured Sports Autograph branch | Corrected hierarchy and replaced both unsafe bases with neutral archival scenes. Sports imagery cannot appear for historical, music, entertainment, or mixed autograph lots. |
| Vintage Toys | Action Figure/Doll, Board Game/Puzzle, LEGO, Vehicle, Playset, Plush/Stuffed Toy, Electronic Toy, Model Kit, or Collection Lot | Exact curated Brand, Publisher, Character, or Franchise only after type compatibility is proven | Corrected hierarchy. The broad brand-first scenes and visibly streaked detached props are not used in high-value rendering. |
| Coins | Single Coin, Coin Set, Collection Lot, or Paper Money/Banknotes | Set Type only for Coin Set | Corrected hierarchy and added the Paper Money/Banknotes alias. Native audit caught a competing staged coin in the first replacement; v2 is a no-coin curator desk. |
| Stamps | Single Stamp, Stamp Set/Sheet, or Collection Lot | Controlled Country or curated Set only in a future whitelisted implementation | Already safe in practice because no secondary override existed; now protected by the common item-type-first rule. |
| Disney Pins | Single/Individual Pin, Pin Set, or Collection Lot | Structured Character, Series, or Set only as future restrained accents | Corrected alias coverage. Native audit rejected a generic library scene; v2 is an unmistakable empty pin-collector display without a fabricated character or pin. |

## Reviewed background replacements

Ten approved backgrounds were visually inspected before upload and registered only where a live base scene was misleading, too literal, or competed with the listing photograph. A native rendered audit rejected the first Coins and Disney Pins scenes because they respectively showed a competing coin and an overly generic library; both have been replaced by inspected v2 scenes. The registered backgrounds provide quiet physical context, clean right-side title/fact space, and no invented featured collectible.

| Item-type environment | Replacement intent |
|---|---|
| Sports Cards — Single Card | Approved Baseball stage for Baseball cards, with a glove and ball in the left safe area and an empty tabletop/title lane on the right; other reviewed exact-Sport scenes follow the same item-type-first rule. |
| Sports Cards — Unopened Product | Sealed, unbranded product context with no loose cards, packs, ball, or athlete bias. |
| Pokémon — Single Card | Neutral binder and empty display context with no fabricated card or character. |
| Comics — Collection Lot | Neutral archival boxes and bagged boards with no Marvel/DC cover implication. |
| Autographs — Signed Item | Neutral archival desk with an unsigned empty frame; no signature, athlete, portrait, or sports item. |
| Autographs — Collection Lot | Neutral mixed-archive study with no baseballs, helmet, or sports album. |
| Disney Pins — Single/Individual Pin | Deep-navy velvet pin board, empty brass pin posts/easel, archival sleeves, and an empty organizer tray; no competing character, castle, or featured pin. |
| Coins — Single Coin | Numismatist drawer desk with caliper, loupe, archival catalog, and an empty black velvet tray; no coin, medal, currency, or circular metallic object. |

## Visual verification

A fresh native **1200 × 630 Facebook** export and **1080 × 1080 Instagram** export were inspected for Rickey Henderson Rookie. The first Baseball export was rejected during direct visual review because its card-display room and leather mats did not read clearly as baseball at social-post scale. The implementation was corrected to use the approved Trade Alert Baseball stage, then the native Facebook export was re-rendered and visibly showed a large glove and baseball in the left safe area with no collision with the listing card, title, facts, or Trade Value plaque. No detached foreground prop was visible, clipped, repeated, or faded. A subsequent native Facebook audit covered one live High-Value sample for each of the eleven categories. Sports Cards, Comics, Music, Vintage Toys, Video Games, Stamps, Pokémon, Movies, and Autographs passed on the first review. Coins and Disney Pins failed their first native review because of a competing staged coin and generic-library context respectively; both passed after the inspected v2 replacements were registered and re-rendered. The rendered category audit is closed, with the Baseball follow-up correction verified.

## Guardrails for future additions

Future secondary visuals must be added only after the category and item-type base are resolved. A secondary asset must be reviewed at every output aspect ratio, be category-relevant, be structured-data-driven, and must not introduce a competing featured object. If a prop cannot be fully visible on a shared collector surface outside the real media frame, it must not render. This maintains the high-quality Trade Alert approach while keeping High-Value Listings specific, credible, and readable.

## Validation

Focused social-rendering, draft-reconciliation, promotion-opportunity tests, TypeScript checking, production build, whitespace validation, and browser-native Facebook/Instagram visual inspection were run after the audit changes.

## Targeted regeneration — Pokémon, Autographs, Disney Pins, Stamps, Hockey

On 2026-09-21, five backgrounds were regenerated because the previous scenes did not communicate their categories strongly enough. The approved replacements are now registered in the high-value resolver and uploaded to managed WebDev storage:

| Visual route | Registered replacement | Native verification |
|---|---|---|
| Pokémon — Single Card | `tradebilia-pokemon-single-card-category-v3` | Pass |
| Autographs — Signed Item | `tradebilia-autographs-signed-item-category-v3` | Pass |
| Disney Pins — Single/Individual Pin | `tradebilia-disney-single-pin-category-v3` | Pass |
| Stamps — Single Stamp | `tradebilia-stamps-single-stamp-category-v3` | Pass |
| Sports Cards — Sport: Hockey | `tradebilia-hockey-single-card-category-v3` | Pass |

Each route was checked in a native 1200×630 Social Content Manager preview. The scenes visibly communicate their category while preserving the title/facts lane and Trade Value plaque. The actual listing image remains the only featured collectible in the final graphic.

## Subject-reference refinement — Michael Jordan

The first Jordan Basketball scene was rejected during direct visual review because it communicated only a generic basketball arena. The subject-first resolver now uses a dedicated reference scene after category, item type, and Sport: Basketball are resolved. The replacement visibly includes Bulls red-and-black styling, a framed `BULLS 23` jersey, basketball hoop, championship-banner forms, hardwood court, and a basketball while preserving a dark uncluttered left zone for the actual graded card. The native 1200×630 export was re-rendered and visually checked; the scene now communicates the item’s Michael Jordan/Bulls/NBA semantic references rather than only the sport.

## Subject-reference expansion — Music, Vintage Toys, and Comics

The subject-reference layer now runs universally before the category/item-type fallback. It is intentionally whitelist-based: only reviewed public subject references can replace the base scene, so arbitrary title text cannot cause an unsafe or irrelevant background. The initial non-sports routes are:

| Category | Recognized subject | Registered scene | Hierarchy behavior |
|---|---|---|---|
| Music | The Beatles, Sgt. Pepper, or Sergeant Pepper | Beatles Sgt. Pepper reference scene | Applies to any category/item-type combination whose public subject facts match the reviewed aliases. |
| Vintage Toys | Megatron or Transformers | Transformers Megatron G1 reference scene | Applies to any category/item-type combination whose public subject facts match the reviewed aliases. |
| Comics | Daredevil, Elektra, or Electra | Daredevil/Elektra Marvel reference scene | Applies to any category/item-type combination whose public subject facts match the reviewed aliases. |

The existing curated sports subjects—Michael Jordan, Ken Griffey Jr., Wayne Gretzky, and Barry Sanders—now use the same universal helper. All other categories continue to use their reviewed item-type and structured-secondary routes until a dedicated subject scene is generated and inspected. This prevents a generic subject keyword from becoming an unreviewed visual selector while allowing a reviewed subject to work regardless of category or item type.

Focused regression coverage verifies the three new routes, confirms that item type remains authoritative, and checks that all current high-value opportunity samples resolve to a valid category, item-type, secondary, or subject environment.
