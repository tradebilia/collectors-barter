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

## Rickey Henderson reference scene and protected information lane

The Rickey Henderson Rookie high-value graphic now resolves through a dedicated subject-reference scene rather than the generic Baseball fallback. The reviewed background preserves the full left-side item-media zone, uses a restrained center information lane for the title, facts, and Trade Value plaque, and concentrates the baseball collector context at the right edge. The detached glove-and-ball overlay was removed because it competed with listing information and looked pasted onto the scene.

During native verification, the preview initially showed an empty item frame. The actual listing image was valid; the failure came from bundling it into the same server-side preparation request as brand and hero assets fetched from the unreachable production-domain URL. Server preparation now applies only to external listing and trade media. The active project loads its managed brand and background assets directly, so an unavailable production domain cannot discard the prepared original item image. A fresh 1200 × 630 Rickey Henderson Facebook render confirmed the contained original card, correct right-side baseball context, legible facts/plaque/footer, and no detached foreground prop.

## Automatic per-listing subject scenes

Rich selected the automatic unique-scene workflow for all High-Value Listing social previews. When an administrator first previews a high-value draft, the system now sends only bounded public display metadata—title, category, item type, up to six visible facts, and public visual hints—to the managed image generator. It creates one cinematic 16:9 collector scene that is stored in managed WebDev storage and cached on the browser-local draft. Platform changes reuse that same scene instead of creating additional images. The generated scene is accepted only from `/manus-storage/`, and takes priority even when a future item lacks category or item-type metadata.

The prompt enforces the permanent layout hierarchy: the real media has an empty dark far-left zone, facts/value have an uncluttered center-right lane, and semantic reference props are restricted to the far-right edge. While the scene is generating, the preview displays an explicit loading panel and disables downloads; it never briefly renders a generic or placeholder finished graphic. Native live verification passed for both Rickey Henderson Rookie and Transformers Megatron G1. Rickey produced a baseball/Oakland-era cap, glove, and baseball context at the right; Megatron produced a vintage toy workbench with transform-inspired blueprint and mechanical-reference elements at the right. Both exports preserved the actual original media in the left-hand zone and had no element collision.

## Listing-image visual-reference extraction

The automatic scene workflow now explicitly reads the actual public listing photograph before generating the collector environment. A managed vision extraction first derives three to six bounded, non-sensitive visual motifs from the prepared image—such as object type, materials, palette, era, equipment, and composition—while excluding people, teams, brands, logos, readable text, serials, values, and private data. Those cues and the reference image are supplied to the scene generator, which keeps the original listing photo as the sole featured collectible in the protected left zone and uses the cues only for a far-right environmental context.

The Ken Griffey Jr Upper Deck Rookie listing was re-rendered through this version-four flow. The native 1200 × 630 output retains the authentic slabbed card at left and now visibly carries a deep navy/teal cap color cue taken from the listing photo alongside the baseball equipment at right. The banner, title, fact grid, value plaque, and footer remained unobstructed. This corrected the prior text-only and failed-extraction fallbacks; any older cached generated scene refreshes automatically on its next preview.

## Full-environment visibility and correct GPT completion budget

The previous high-value treatment made an important but overbroad legibility trade-off: a high-opacity left-to-center scrim plus a prompt requiring a dark empty left third caused much of the generated collector world to disappear behind a near-black field. The renderer now uses only a light full-canvas wash and two bounded local protections: a modest item-zone tint and a narrower information panel behind the title, facts, and value plaque. The automatic-scene prompt now explicitly requires a visibly detailed 16:9 collector environment across the left, center, and right while retaining a quiet, non-featured left placement zone and a low-contrast information lane. It explicitly rejects broad black voids, empty studio backdrops, and scenes visible only at the far right.

Live verification exposed an additional implementation problem: the GPT-5 visual-reference request was incorrectly receiving `max_tokens`, which can truncate its structured response. The managed LLM helper now supports and forwards `max_completion_tokens`; image-reference extraction uses a 500-token GPT completion budget. Generated-scene version six automatically refreshes any former fallback output. A fresh native 1200 × 630 Transformers Megatron G1 Facebook export completed with no extraction error. It visibly fills the whole post with a coherent purple-metal collector environment, left-side industrial cabinet and tabletop texture, central display context, and a large right-side Megatron reference, while the authentic boxed listing remains at left and the banner, title, facts, value plaque, and footer remain clear without collision.

## Supplied Trade Alert banner replacement

The active completed-trade banner now uses Rich's newly supplied `TradeAlert.webp`, uploaded as `TradeAlertRichV2_097ffc75.webp`. The renderer preserves the source's approximately 3:1 aspect ratio, caps the displayed width at 920 baseline pixels, and draws the full transparent source at the top of the canvas without adding duplicate `TRADE ALERT` text. The resulting native Facebook export was inspected: the banner is sharp, fully visible, and clear of both item images, item captions, the exchange mark, and the footer phrase. Tall Instagram/Pinterest exports now use a measured 310-baseline item start so the preserved banner height also clears the item lane at those platform scales. No database writes, publishing, social posting, or production-domain changes were made.

## Original item emphasis

The high-value landscape composition now gives the original listing media greater visual priority: the media lane moved left, increased from 330 to 400 baseline pixels, and begins higher at 280 baseline pixels. The information lane was narrowed and shifted right to preserve a collision-free title, fact grid, Trade Value plaque, and footer. The previous heavy translucent media enclosure was reduced to a quiet glass boundary with a smaller inset, so the boundary separates the item from the scene without competing with the collectible. A fresh native 1200 × 630 Michael Jordan export was inspected and confirmed the original card is larger and visually dominant with no title, fact, plaque, or footer overlap. No database writes, publishing, production-domain changes, or social posts occurred.

## Version-ten item-specific supporting elements

The automatic per-listing scene prompt now requires more than a generated substitute for the collectible. It must create one generated hero subject in the protected lower-left zone plus two to four supporting environmental elements tied to the actual listing. For sports cards, the scene may use clearly supported public team or league context, sport equipment, venue or field cues, team colors, and era details; analogous public character, franchise, material, or display cues apply to non-sports items. The source listing image remains a visual reference only and is never reproduced as an exact collectible or duplicated on the right.

The version-ten prompt also preserves the strict upper 48% banner-safe band and lower-left placement target of approximately x=6%–34% and y=55%–94%. Structured image-reference parsing now tolerates fenced or wrapped JSON responses and uses a larger completion budget.

Focused renderer, preview, server-contract, TypeScript, production-build, and diff validation passed. Native version-eight inspection previously confirmed the single generated left-side subject and no right-side duplicate, but the version-ten live regeneration could not be visually approved because the configured image and vision providers returned an external `usage exhausted` error. No replacement image was accepted as version-ten, and no publishing or production-domain change was made.

## Guaranteed left-side item fallback after unavailable generation

A live Wayne Gretzky preview exposed that the previous version-ten transition could leave a high-value graphic with only a generic or stale background when image generation was unavailable. The renderer now accepts a generated background override only when it is explicitly marked as version ten. For stale, missing, or failed generated scenes, the high-value renderer uses the reviewed category/subject environment and draws the actual listing media as one large, contained left-side focal item. Version-ten generated scenes retain ownership of the left hero and therefore do not draw the original listing media a second time.

Focused renderer, preview, server-contract, TypeScript, production-build, and whitespace validation passed. Native admin recheck remained provider-blocked by the configured image/vision services returning `usage exhausted`; no generated Wayne scene was claimed as visually approved. No database, migration, publishing, production-domain, or social-posting change was made.

## Version-eleven complete exact-item hero

The Wayne Gretzky result exposed that version-ten generation could create an incomplete hero whose upper edge entered the banner area. Version eleven changes the scene contract: the actual listing image is used as a visual reference for one complete, faithful generated representation of the exact collectible; the full silhouette, orientation, proportions, slab or holder, and visible non-sensitive structure must be preserved. The complete hero must be entirely below the upper 50% banner-safe band, fully visible in the lower-left zone, with no crop, clipping, or overlap. Two to four secondary environmental elements may reinforce the item’s team, sport, franchise, era, materials, or venue context, while the right side may contain only contextual background detail and lighting.

Existing version-ten scenes are treated as stale and regenerate under the version-eleven contract. If generation is unavailable, the renderer falls back to the actual listing media once on the left rather than showing an incomplete or empty item. Focused renderer, preview, server-contract, TypeScript, production-build, and whitespace validation passed. Fresh provider generation remains unavailable because the configured image and vision services report usage exhausted; no new Wayne image is claimed as visually approved.

## Version-twelve exact-source item composition

Rich confirmed that the generated collectible should not be trusted to recreate or complete the item. The high-value renderer now always places the actual prepared listing image once as the left-side focal collectible. Generated scenes are version twelve contextual backgrounds only: they read the listing image for public associations such as team, sport, franchise, era, venue, materials, and display objects, but they are explicitly forbidden from redrawing the collectible, creating a card/slab/package/figure duplicate, or placing an item-like subject elsewhere. The lower-left zone is reserved for the exact source item, the center-right lane remains clear for listing copy, and the right side contains only contextual environment and lighting. The listing banner is measured from the rendered asset and the item begins at least 24 scaled pixels below its bottom edge.

Focused renderer, preview, server-contract, TypeScript, production-build, and whitespace validation passed. The image and vision providers remain usage-exhausted, so a fresh generated context scene was not claimed as visually approved during this correction. No database, migration, publishing, production-domain, or social-posting change was made.
