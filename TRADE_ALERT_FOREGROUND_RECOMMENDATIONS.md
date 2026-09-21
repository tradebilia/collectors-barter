# Trade Alert Category and Item-Type Foreground Recommendations

## Recommendation

Trade Alert graphics should resolve visual treatment in three stages. **Category** should determine the overall collector environment, lighting, palette, and display surface. **Item type** should determine the primary foreground object placed near the traded item. A small number of reliable secondary fields should refine that foreground when the difference is visually meaningful. The real listing image must remain the dominant collectible; generated objects should support recognition without competing with it.

The matrix below covers every category/item-type combination currently represented in the social-promotion rules. It also identifies the additional metadata that should influence visual selection when available.

## Recommended selection rules

The renderer should first resolve the category and item type. It should then apply a secondary visual modifier only when the relevant field is explicit and trustworthy. For example, a sports-card scene should use baseball props when the sport is Baseball, but it should fall back to a general sports display when the sport is missing. The renderer should never infer a highly specific prop from an ambiguous title alone when doing so could produce the wrong collectible context.

For mixed-category trades, each side should use its own resolved environment and foreground treatment. A shared center exchange area may remain neutral, but it should not replace either side’s category/item-type context.

## Complete recommendation matrix

### Autographs

| Category | Item type | Recommended foreground object | Secondary visual distinction | Notes |
|---|---|---|---|---|
| Autographs | Collection / Lot (`collection_lot`) | A small archival display containing several signed photographs, cards, or memorabilia pieces with archival sleeves | `signedItemType`, `autographCategory`, and the number of signed items | Use a varied but orderly group display. Do not show legible private names or invented signatures. |
| Autographs | Signed Item (`signed_item`) | One archival presentation stand with a pen, certificate folder, and a single signed-item silhouette | `signedItemType`, `authentication`, `authenticationCompany`, and `signer` only as non-rendered selection metadata | Keep the certificate generic. Do not generate readable names, signatures, or certification numbers. |

### Coins

| Category | Item type | Recommended foreground object | Secondary visual distinction | Notes |
|---|---|---|---|---|
| Coins | Coin Set (`coin_set`) | Open velvet coin presentation case with several coin slots | `setType`, `country`, and denomination | Use multiple coin recesses rather than one oversized coin. |
| Coins | Collection / Lot (`collection_lot`) | Coin tray with capsules, flips, and several loose coins | `country` and approximate coin count | The foreground should communicate a group without showing specific invented coin designs. |
| Coins | Paper Money (`paper_money`) | Archival currency sleeve, currency tongs, and a partial banknote display | `country`, denomination, and year | Keep the banknote generic and avoid readable fictional text or faces. |
| Coins | Single Coin (`single_coin`) | One coin capsule on a velvet stand with a small collector loupe | `country`, denomination, composition, and year | This should be the cleanest, most premium single-object treatment in the coins family. |

### Comics

| Category | Item type | Recommended foreground object | Secondary visual distinction | Notes |
|---|---|---|---|---|
| Comics | Collection / Lot (`collection_lot`) | Short stack of bagged-and-boarded comics beside a comic storage box | `publishersIncluded`, major titles, and years included | Use multiple issue silhouettes and avoid readable invented covers. |
| Comics | Original Art (`original_art`) | Comic drawing board with ink pen, brush, ruler, and a partially visible art sheet | `artType`, publisher, and whether a certificate of authenticity is included | The art sheet should use abstract linework, not a recognizable copyrighted character. |
| Comics | Single Comic (`single_comic`) | Upright bagged-and-boarded comic issue with a small issue-stack backdrop | `publisher`, issue number, title, and graded status | For graded comics, add a slab-like display cue without inventing a certification label. |

### Disney Pins

| Category | Item type | Recommended foreground object | Secondary visual distinction | Notes |
|---|---|---|---|---|
| Disney Pins | Collection / Lot (`collection_lot`) | Multi-pin display board with several colorful pin silhouettes | `charactersIncluded`, series, approximate pin count, and limited-edition status | Use generic colorful silhouettes unless an approved brand-safe asset is available. |
| Disney Pins | Single Pin (`single_pin`) | One upright enamel-pin display on a velvet or cork board | `characterName`, `pinName`, series, and limited-edition status | The individual pin should receive the strongest spotlight in this category. |
| Disney Pins | Pin Set (`pin_set`) | Small themed pin-board section with several matching pin silhouettes | `setName`, complete-set status, and limited-edition status | Arrange the pins as a coherent set rather than as unrelated pieces. |

### Movies

| Category | Item type | Recommended foreground object | Secondary visual distinction | Notes |
|---|---|---|---|---|
| Movies | Box Set (`box_set`) | Stacked film cases or a boxed media collection on a display riser | `format`, box-set name, edition, and sealed status | Use case geometry that changes by format, such as DVD/Blu-ray-style cases. |
| Movies | Collection / Lot (`collection_lot`) | Several film cases beside a compact media shelf | `format`, notable titles, quantity, and sealed-items status | Keep title spines abstract unless approved artwork is available. |
| Movies | Individual Movie (`individual_movie`) | One upright film case with a small projector lens or film reel | `format`, edition, title, and graded status | Use a case, reel, or disc cue that matches the actual format. |

### Music

| Category | Item type | Recommended foreground object | Secondary visual distinction | Notes |
|---|---|---|---|---|
| Music | Cassette Tape (`cassette_tape`) | Compact cassette deck with one cassette and a small tape case | Artist, release title, release year, record label, and cassette condition | The tape deck should be clearly visible but remain behind the real listing image. |
| Music | Compact Disc (`compact_disc`) | Open CD jewel case, compact disc, and a small CD rack | Artist, release title, release year, record label, and edition | Use reflective disc surfaces and jewel-case geometry, not vinyl or cassette props. |
| Music | Eight-Track Tape (`eight_track_tape`) | Eight-track cartridge and period-style player | Artist, release title, release year, and record label | The cartridge shape must be visibly different from a cassette. |
| Music | Other Music Format (`other_music_format`) | Neutral listening-room display with a small speaker and adaptable media stand | Actual format, artist, release title, and genre | Use this only when no reliable specialized format is available. |
| Music | Vinyl Record (`vinyl_record`) | Turntable with a vinyl record, album sleeve, and record crate | Artist, release title, release year, record label, and pressing/edition when available | This is the canonical vinyl foreground and should never use CD or cassette props. |

### Pokémon

| Category | Item type | Recommended foreground object | Secondary visual distinction | Notes |
|---|---|---|---|---|
| Pokémon | Collection / Lot (`collection_lot`) | Trading-card binder, card sleeves, and a small stack of cards | Sets included, notable cards, approximate card count, and era | Use generic card backs or abstract card faces to avoid invented card details. |
| Pokémon | Set (`set`) | Sealed or displayed set box with a few matching card silhouettes | Set name, year, complete status, and product type | A complete set should use an organized binder or checklist-like arrangement. |
| Pokémon | Single Card (`single_card`) | One protected trading card on a display stand with a small binder backdrop | Card name, set name, card number, and graded status | The real card image remains primary; generated cards should be abstract. |
| Pokémon | Unopened Product (`unopened_product`) | Factory-sealed booster box, pack stack, or wrapped product display | Product type, set name, release year, factory-sealed status, and authenticated status | Select the prop by product type: booster box, tin, pack, or other sealed product. |

### Sports Cards

| Category | Item type | Recommended foreground object | Secondary visual distinction | Notes |
|---|---|---|---|---|
| Sports Cards | Card Set (`card_set`) | Organized card rows, card-storage box, and a display stand | Sport, set name, year, manufacturer, and league | Sport-specific objects may appear lightly at the edges. |
| Sports Cards | Collection / Lot (`collection_lot`) | Card-storage box, protective sleeves, and a small spread of cards | Sport, years, manufacturers, notable cards, and approximate card count | Use a collection treatment rather than a single-card pedestal. |
| Sports Cards | Single Card (`single_card`) | One slab or top-loader on a display stand | Sport, player role, year, manufacturer, grading company, and grade | Use the sport-specific prop family below. |
| Sports Cards | Unopened Product (`unopened_product`) | Sealed hobby box, wax pack, or factory product display | Sport, product type, year, manufacturer, authenticated status, and authenticated company | The object must read as unopened product, not a loose card. |

#### Sports-specific visual modifiers

| Sport or field value | Foreground modifier |
|---|---|
| Baseball / MLB | Baseball glove, baseball, and subtle bat or diamond stitching |
| Football / NFL | Football helmet, football, and subtle field marking |
| Basketball / NBA | Basketball, hoop fragment, and hardwood-floor cue |
| Hockey / NHL | Puck, stick blade, and ice-rink light cue |
| Other or unknown sport | Neutral card display with no sport-specific equipment |

### Stamps

| Category | Item type | Recommended foreground object | Secondary visual distinction | Notes |
|---|---|---|---|---|
| Stamps | Collection / Lot (`collection_lot`) | Open stamp album, hinge mounts, tongs, and several album pages | Countries included, years, quantity, and collection theme | Use album geometry and perforated edges as the primary recognition cues. |
| Stamps | Single Stamp (`single_stamp`) | Stamp tongs, magnifying loupe, and one mounted stamp display | Country, year, Scott number, and graded status | The foreground should be restrained so the real stamp image remains legible. |
| Stamps | Stamp Set / Sheet (`stamp_set___sheet`) | Full stamp sheet on an archival album page | Country, year, set name or description, and graded status | A sheet layout should be visibly different from an individual stamp. |

### Video Games

| Category | Item type | Recommended foreground object | Secondary visual distinction | Notes |
|---|---|---|---|---|
| Video Games | Accessory (`accessory`) | Controller, memory card, peripheral, or accessory stand | Platform, accessory name, and accessory type | Select the prop by accessory type when explicit; otherwise use a generic controller. |
| Video Games | Collection / Lot (`collection_lot`) | Game shelf, cartridge/disc cases, and a controller | Platforms, notable games/consoles, item count, and era | Use a mixed display only when the lot actually spans formats. |
| Video Games | Console (`console`) | Console hardware with matching controller and cable detail | Console name, platform, original-box status, working condition, and era | The foreground should use the correct hardware silhouette for the platform family. |
| Video Games | Game (`game`) | Game cartridge, disc case, or boxed game depending on format | Platform, release year, complete-in-box status, game format, and era | Cartridge and disc treatments must be visually distinct. |

#### Video-game modifiers

| Field value | Foreground modifier |
|---|---|
| NES, SNES, Atari, Sega, Game Boy, Nintendo 64, or other retro platform | Cartridge, CRT television cue, wired controller, and retro console shelf |
| PlayStation, Xbox, modern Nintendo, PC, or modern platform | Optical disc, modern controller, console hardware, and contemporary game shelf |
| Cartridge format | Cartridge case, cartridge slot, and cartridge storage tray |
| Disc format | Disc case, optical disc, and console tray |
| Accessory type is controller | Controller on a small stand with matching platform cue |
| Accessory type is handheld or portable | Handheld console or portable accessory display |

### Vintage Toys

| Category | Item type | Recommended foreground object | Secondary visual distinction | Notes |
|---|---|---|---|---|
| Vintage Toys | Action Figure (`action_figure`) | Action-figure display stand with a second figure silhouette and packaging card | Brand, franchise, character, year, packaging type, and graded status | Use a generic figure silhouette when the franchise is not approved for generated artwork. |
| Vintage Toys | Board Game (`board_game`) | Open board-game box with board surface, tokens, and dice | Game or puzzle name, publisher or brand, complete status, and year | The foreground should show a tabletop game rather than a figure shelf. |
| Vintage Toys | Collection / Lot (`collection_lot`) | Toy shelf with several categories of boxed or loose toys | Brands, franchises, item count, and eras | Use a broad display that communicates variety without implying specific unlisted items. |
| Vintage Toys | Electronic Toy (`electronic_toy`) | Vintage electronic toy with batteries, buttons, or a small tabletop display | Toy name, tested status, working condition, and power type | The prop should visibly communicate electronics rather than a static figure. |
| Vintage Toys | LEGO (`lego`) | Loose bricks, a brick tray, and a partially built model | Set number, theme, piece count, complete status, and built/unbuilt status | Use recognizable brick geometry without reproducing a protected set model. |
| Vintage Toys | Model Kit (`model_kit`) | Model-kit box, hobby knife, paint jars, and a partially assembled model | Model or kit name, brand, built/unbuilt status, and condition | The workbench should differ from the LEGO display. |
| Vintage Toys | Playset (`playset`) | Open playset structure with small accessories and a display base | Playset name, brand, franchise, year, and completeness | Use a wide scene because playsets are often larger than a single figure. |
| Vintage Toys | Plush Toy (`plush_toy`) | Plush display chair or basket with one generic plush silhouette | Toy name or character, brand, year, and franchise | Avoid making an unlicensed generated character the focal point. |
| Vintage Toys | Vehicle (`vehicle`) | Die-cast vehicle on a miniature road or garage display | Vehicle name, brand, year, scale, and franchise | This should be clearly different from the action-figure and playset scenes. |

## Priority order for asset creation

The first asset pass should cover the item types that are most visually distinct and most likely to be confused with one another. The recommended first group is Music, Video Games, Vintage Toys, Sports Cards, Comics, and Pokémon. These categories benefit most from item-type-specific props because a vinyl record, CD, cassette, console, cartridge, action figure, LEGO set, comic, and trading card have visibly different physical formats.

The second pass should cover Coins, Stamps, Movies, Disney Pins, and Autographs. These can share more of their category environment, but their foreground objects should still distinguish single items, sets, and collection lots.

The renderer should maintain a category fallback for every item type. A missing specialized asset must never cause a blank background, an unrelated object, or a duplicated prop. Each generated asset should be reviewed against the actual canvas at Facebook, Instagram, and Pinterest aspect ratios before it becomes the default for that item type.

## Fields that should remain selection metadata only

Signer names, character names, player names, comic titles, certification numbers, and other listing-specific values may help select a visual family, but they should not be rendered as invented text inside generated background art. Public listing titles and approved item facts remain in the normal graphic text areas. Generated foreground assets should use shapes, silhouettes, and recognizable physical formats rather than fake labels.

## References

[1]: /home/ubuntu/tradebilia-isolated-development/shared/socialPromotionFacts.ts "Tradebilia social promotion item-type rules"

[2]: /home/ubuntu/tradebilia-isolated-development/shared/tradeAlertThemes.ts "Tradebilia Trade Alert theme resolver"

[3]: /home/ubuntu/tradebilia-isolated-development/IMAGE_ASSET_INVENTORY.md "Tradebilia image asset inventory"
