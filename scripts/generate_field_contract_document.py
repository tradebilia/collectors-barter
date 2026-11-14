from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.style import WD_STYLE_TYPE

OUT_DIR = Path('/home/ubuntu/projects/tradebilia-website-edca9ae3')
MD_PATH = OUT_DIR / 'Tradebilia_AI_Field_Contract_Audit_and_ChatGPT_Prompt.md'
DOCX_PATH = OUT_DIR / 'Tradebilia_AI_Field_Contract_Audit_and_ChatGPT_Prompt.docx'

categories = [
    {
        'name': 'Sports Cards',
        'item_types': 'Single Card; Card Set; Unopened Product; Collection/Lot',
        'fields': [
            ('Player / Athlete', 'player; athlete; subject'),
            ('Year', 'year; manufactureYear'),
            ('Manufacturer / Brand', 'manufacturer; brand; maker'),
            ('Set Name / Series', 'setName; set; cardSet; series'),
            ('Card Number', 'cardNumber; cardNo; number; catalogNumber'),
            ('Parallel / Variation', 'parallelVariation; parallel; variation; variant; finish; printing'),
            ('Sport', 'sport'), ('Team', 'team'), ('League', 'league'),
            ('Rookie Status', 'rookieStatus; rookieCard'),
            ('Autograph Status', 'autograph; autographStatus; isAutographed'),
            ('Relic / Memorabilia', 'relic; relicMemorabilia; memorabilia'),
            ('Serial / Print Run', 'serialNumber; serial; printRun; serialNumbered'),
            ('Grading Company', 'gradingCompany; certificationCompany; grader'),
            ('Grade', 'grade; numericGrade; finalGrade; professionalGrade'),
            ('Grade Qualifier', 'gradeQualifier; qualifier; gradeDesignation; labelDesignation'),
            ('Raw / Graded State', 'isGraded; graded; gradingStatus; gradingState; rawOrGraded'),
            ('Product Name / Format / Type', 'productName; productFormat; productType'),
            ('Factory Sealed / FASC', 'factorySealed; sealedStatus; sealed; fromASealedCase; FASC'),
            ('Set Completeness', 'setType; missingCards; complete; completeness'),
            ('Authentication', 'authenticationCompany; authenticated'),
            ('Sale Form / Lot Quantity', 'saleForm; form; lotQuantity; quantity'),
        ],
        'actions': 'Bind every material field used by scoring or exclusion into a single Sports Cards approval contract, or explicitly classify it as visual-only/context-only. Resolve manufacturer/maker, set/series, card-number namespaces, parallel/variant/finish/printing, year exception, and rookie/autograph/relic/serial/team/league handling. Add positive alias, explicit conflict, missing-field, title-versus-structured, approval-fingerprint, and final-valuation tests.'
    },
    {
        'name': 'Coins',
        'item_types': 'Single Coin; Coin Set; Collection/Lot; Paper Money/Banknotes where supported',
        'fields': [
            ('Country / Issuing Authority', 'country; issuingCountry; issuer; issuingAuthority'),
            ('Denomination / Face Value', 'denomination; faceValue; value; coinDenomination'),
            ('Year', 'year; issueYear; mintYear; date'),
            ('Mint Mark', 'mintMark; mint; mintmark'),
            ('Variety / Attribution', 'variety; varietyName; coinType; series; coinSeries; attribution; design'),
            ('Metal / Composition', 'metal; composition'),
            ('Strike / Finish / Designation', 'strike; finish; designation; coinDesignation'),
            ('Grading Company', 'gradingCompany; certificationCompany; grader'),
            ('Grade', 'grade; numericGrade; finalGrade; professionalGrade'),
            ('Grade Qualifier', 'gradeQualifier; qualifier; gradeDesignation; labelDesignation'),
            ('Raw / Graded State', 'isGraded; graded; gradingStatus; rawOrGraded'),
            ('Coin Form', 'itemType; productType; form; saleForm; single_coin; coin_set'),
            ('Set Name / Type / Count', 'setName; setType; coinCount; numberOfCoins; quantity'),
            ('Holder / Certificate', 'certificateNumber; certificationNumber; certId; holder; slab; serial'),
            ('Title-Derived Evidence', 'title; listingTitle; normalizedListingTitle'),
        ],
        'actions': 'Unify country, year, denomination, mint, variety, designation, metal, strike, grader, and grade normalization. Make direct coin identity requirements explicit, especially country plus denomination plus year. Replace broad substring compatibility with field-specific equivalence where appropriate. Prove duplicate URL normalization is identical between observation verification and comparable deduplication.'
    },
    {
        'name': 'Comics',
        'item_types': 'Single Comic; Original Art; Collection/Lot',
        'fields': [
            ('Comic Title / Series', 'comicTitle; series; title; comicSeries'),
            ('Issue Number', 'issueNumber; issueNo; issue; number; coverSketchIssueNumber'),
            ('Publisher', 'publisher'),
            ('Volume', 'volume'),
            ('Variant Description', 'variantDescription; variant; variantCover; variation'),
            ('Edition / Printing', 'edition; printing'),
            ('Distribution', 'distributionType; distribution; direct; newsstand'),
            ('Language', 'language'),
            ('Publication Year', 'publicationYear; year; releaseYear; originalReleaseYear'),
            ('Label / Restoration', 'labelNotation; labelNote; restorationDetail'),
            ('Facsimile / Reprint', 'facsimile; reprint; reproduction'),
            ('Signed Status', 'signed; autograph; signature'),
            ('Grading Company', 'gradingCompany; certificationCompany; grader'),
            ('Grade', 'grade; numericGrade; professionalGrade'),
            ('Raw / Graded State', 'isGraded; graded; gradingStatus; rawOrGraded'),
            ('Original Art Identity', 'artistName; artType; artworkTitleCharacter; issueNumber; publisher'),
        ],
        'actions': 'Create one Comics field map for comicTitle/series, issueNo/issue/number, publisher, year, variant, printing, distribution, facsimile, signed, language, and label/restoration. Ensure category hard exclusions are carried into final comparable admission, not only the visual gate. Reconcile score-award keys with comparison rows and canonical approval fields.'
    },
    {
        'name': 'Stamps',
        'item_types': 'Single Stamp; Stamp Set/Sheet; Collection/Lot',
        'fields': [
            ('Country / Issuer', 'country; issuingCountry'),
            ('Scott / Catalog Number', 'scottNumber; catalogNumber; catalogNo; catalog; number'),
            ('Year', 'year; issueYear; date'),
            ('Denomination / Face Value', 'denomination; faceValue'),
            ('Format', 'format; stampFormat; itemFormat; stampType; type'),
            ('Mint / Used Status', 'mintOrUsed; status; condition; stampCondition'),
            ('Hinge Status / Gum', 'hinged; hingeStatus; hinge; gumCondition; gum; gumType'),
            ('Perforation', 'perforation; perf'),
            ('Watermark', 'watermark; watermarkType'),
            ('Overprint / Surcharge', 'overprintSurcharge; overprint; surcharge'),
            ('Variety', 'variety; varietyName'),
            ('Set Name / Sheet Type', 'setNameDescription; setName; series; sheetType; format'),
            ('Stamp Count', 'numberOfStamps; stampCount; quantity'),
            ('Grading Company', 'gradingCompany; certificationCompany; grader'),
            ('Grade', 'grade; numericGrade; professionalGrade'),
        ],
        'actions': 'Unify Scott-number/catalog-number naming, year aliases, hinge/gum/mint state semantics, and set aliases. Decide which year, variety, perforation, watermark, overprint, cancellation, and alteration fields are final hard conflicts versus visual-only evidence. Preserve the current source-role restrictions and one-sale policy until a separate policy decision is documented.'
    },
    {
        'name': 'Video Games',
        'item_types': 'Game; Console; Accessory; Collection/Lot',
        'fields': [
            ('Game Title', 'gameTitle; title; itemTitle; listingTitle; name; productName'),
            ('Platform / System', 'platform; consoleName; console; system; compatiblePlatform; compatibleSystem'),
            ('Release Year', 'releaseYear; year'),
            ('Region', 'region'),
            ('Edition / Release Type', 'edition; releaseType; variant; pressing; language'),
            ('UPC / EAN', 'upc; ean; barcode'),
            ('Product Form', 'itemType; productType; form; saleForm; objectType'),
            ('Sealed / Packaging', 'sealed; factorySealed; sealedStatus; packageStatus; packaging'),
            ('Complete in Box', 'completeInBox; complete; isComplete; completeness; CIB'),
            ('Console Model / SKU', 'modelNumber; model; sku'),
            ('Accessory Name / Type', 'accessoryName; name; accessoryType; type; accessory_type'),
            ('Manufacturer / Brand', 'manufacturer; brand; maker'),
            ('Working Condition', 'workingCondition; functionality; tested; working_status'),
            ('Original Box / Cables / Controllers', 'originalBoxIncluded; originalBox; boxIncluded; cablesIncluded; cables; controllersIncluded; controllers'),
            ('Grading Company', 'gradingCompany; certificationCompany; grader'),
            ('Grade', 'grade; numericGrade; finalGrade; gameGrade'),
            ('Raw / Graded State', 'isGraded; graded; gradingStatus; rawOrGraded'),
        ],
        'actions': 'Centralize platform, region, edition, release-year, product-form, sealed/CIB/loose, UPC/EAN, console, and accessory aliases. Resolve year versus releaseYear precedence and contradiction matrices for sealed/no, CIB, loose, boxed-only, and parts-only. Add final approval tests for every material field, not only game title/platform/grade.'
    },
    {
        'name': 'Movies',
        'item_types': 'Individual Movie; Box Set; Collection/Lot',
        'fields': [
            ('Movie Title', 'title; movieTitle; filmTitle; listingTitle; name'),
            ('Format', 'format; mediaFormat; customFormat'),
            ('Release Year', 'releaseYear; year'),
            ('Edition', 'edition; version; releaseType'),
            ('Region', 'region'),
            ('Packaging / Sealed', 'sealed; factorySealed; packageCondition; packaging'),
            ('Collectible Form', 'collectibleType; objectType; movieItemType; itemType'),
            ('Box Set Name', 'boxSetName; series; collectionName'),
            ('Number of Movies / Discs / Seasons', 'numberOfMovies; movieCount; numberOfDiscs; seasons'),
            ('Poster Format / Size', 'posterFormat; posterType; posterSize; dimensions; size'),
            ('Prop Type', 'propType; memorabiliaType'),
            ('Screen-Use State', 'screenUsed; screenWorn; provenance; propProvenance'),
            ('Grading Company', 'gradingCompany; certificationCompany; grader'),
            ('Grade', 'grade; numericGrade; finalGrade; professionalGrade'),
            ('Raw / Graded State', 'isGraded; graded; gradingStatus; rawOrGraded'),
            ('Collection/Lot Fields', 'formatsIncluded; notableTitles; sealedItemsIncluded; approximateQuantity; quantity'),
        ],
        'actions': 'Expand Movie readiness beyond title-only behavior where the item type requires format, form, edition, or box-set identity. Unify format synonyms, releaseYear/year, edition, region, packaging, poster/prop, screen-use, and box-set count fields. Decide and test collection_lot behavior separately from individual_movie and box_set. Include Is Graded, Grading Company, and Grade for movie item types where grading is supported.'
    },
    {
        'name': 'Vintage Toys',
        'item_types': 'Action Figure/Doll; Board Game/Puzzle; Electronic Toy; LEGO; Model Kit; Playset; Plush; Vehicle; Collection/Lot',
        'fields': [
            ('Toy / Character / Model Name', 'toyName; toyNameCharacter; characterName; vehicleName; playsetName; gamePuzzleName; modelKitName; name'),
            ('Brand / Manufacturer', 'brand; manufacturer; maker; publisherBrand; publisher'),
            ('Franchise / Theme / Line', 'franchise; line; toyLine; series; theme'),
            ('Product Type / Toy Form', 'productType; objectType; toyType; toyForm'),
            ('Set / Model / Catalog Number', 'setNumber; setNo; number; modelNumber; catalogNumber; productCode'),
            ('Piece Count', 'pieceCount; pieces; numberOfPieces'),
            ('Year', 'year; manufactureYear; releaseYear'),
            ('Version / Variant / Colorway', 'version; releaseVersion; releaseType; variant; colorway; cardVariant'),
            ('Packaging Type / Sealed', 'packagingType; packageType; packageStatus; sealedStatus; sealed; factorySealed'),
            ('Completeness / Box', 'complete; isComplete; completeness; completeInBox; cib; boxIncluded; originalBoxIncluded'),
            ('Scale / Vehicle Type', 'scale; vehicleType'),
            ('Built / Unbuilt', 'builtOrUnbuilt; buildStatus'),
            ('Working / Tested', 'workingCondition; workingFeatures; functionality; tested; soundWorks; lightsWork'),
            ('Missing Pieces / Accessories', 'missingPieces; accessoriesIncluded; instructionsIncluded; minifiguresIncluded'),
            ('Grading Company', 'gradingCompany; certificationCompany; grader'),
            ('Grade', 'grade; numericGrade; professionalGrade; finalGrade'),
            ('Raw / Graded State', 'isGraded; graded; gradingStatus; gradingState; rawOrGraded'),
            ('Lot / Quantity', 'saleForm; form; lotQuantity; quantity; itemCount; numberOfItems'),
        ],
        'actions': 'Extend final approval to include proven identity-bearing fields such as piece count, model-kit name, theme, vehicle type, scale, set-number aliases, packaging/sealed state, and accepted year/brand aliases. Keep numeric ambiguity fail-closed. Reconcile sealed, boxed, complete, CIB, incomplete, and packaging into one state machine. Add Is Graded, Grading Company, and Grade for all graded-capable Vintage Toy item types.'
    },
    {
        'name': 'Autographs',
        'item_types': 'Signed Item; Collection/Lot',
        'fields': [
            ('Signer', 'signer; athlete; celebrity; subject; autographSigner'),
            ('Signed Item Type', 'signedItemType; itemType; autographItemType; productType; form'),
            ('Autograph Category', 'autographCategory; signatureCategory; sport; entertainmentType'),
            ('Authentication Included', 'authenticationIncluded; authenticated; authenticationStatus; isAuthenticated'),
            ('Authentication Company', 'authenticationCompany; customAuthenticationCompany; authCompany; authenticator; certificationCompany; gradingCompany'),
            ('Authentication Type', 'authenticationType; COA; LOA'),
            ('Certificate Number', 'certificateNumber; certificationNumber; certNumber; authenticationNumber; certId'),
            ('Inscription / Personalization', 'inscription; inscriptionText; inscriptionPresent; personalization'),
            ('Multi-Signature Count', 'signerCount; numberOfSigners; multiSignature'),
            ('Replica / Facsimile / Autopen', 'replica; facsimile; reproduction; printed; stamped; autopen; mechanicallySigned; preprint'),
            ('Year / Edition / Variant', 'year; edition; variant; version'),
            ('Lot / Quantity', 'saleForm; form; lotQuantity; quantity; numberOfItems'),
            ('Grading Company', 'gradingCompany; certificationCompany; grader'),
            ('Grade', 'grade; numericGrade; finalGrade; professionalGrade'),
        ],
        'actions': 'Create and document an explicit Autographs canonical field contract even though exact visual review is intentionally bypassed. Centralize signer, signed-object, authentication state/company/type, certificate, inscription, and lot aliases. Ensure score, conflict, comparable identity, server normalization, and final-use logic use the same registry and precedence. Preserve the no-visual policy and never let title-only or browser-carried scores authorize valuation.'
    },
    {
        'name': 'Pokémon',
        'item_types': 'Single Card; Set; Unopened Product; Collection/Lot',
        'fields': [
            ('Card Name', 'cardName; pokemonName; name'),
            ('Set Name', 'setName; set; cardSet; series'),
            ('Card Number', 'cardNumber; cardNo; number'),
            ('Finish', 'finish; finishVariant'),
            ('Card Type / Mechanic', 'cardType; mechanic; variant; variation; holoType; printing'),
            ('Language', 'language'),
            ('Rarity', 'rarity'),
            ('Edition / Era', 'editionEra; edition; era; releaseType'),
            ('Year', 'year; releaseYear; manufactureYear'),
            ('Grading Company', 'gradingCompany; certificationCompany; grader'),
            ('Grade', 'grade; numericGrade; professionalGrade'),
            ('Grade Qualifier', 'gradeQualifier; qualifier; gradeDesignation; labelDesignation'),
            ('Product Form', 'itemType; productType; form; saleForm'),
            ('Set Type / Completeness', 'setType; complete; setStatus; numberOfCardsInSet; cardCount'),
            ('Packaging / Factory Sealed', 'packaging; originalPackaging; factorySealed; sealStatus; sealedStatus'),
            ('Authentication / FASC', 'authenticationCompany; authenticator; authenticated; authenticationStatus; fromASealedCase; fromSealedCase'),
        ],
        'actions': 'Make Pokémon card-number parsing authoritative at canonical approval, including formatted equivalence such as 004/0102 versus 4/102 while preserving prefix, suffix, namespace, and denominator. Unify set/series, mechanic/variant, finish, edition/era, and title-fallback rules. Add end-to-end approval and valuation tests for positive aliases, partial numbers, ambiguity, contradictions, and unsupported fields.'
    },
    {
        'name': 'Disney Pins',
        'item_types': 'Individual Pin; Pin Set; Collection/Lot',
        'fields': [
            ('Pin Name', 'pinName; name'),
            ('Character', 'character'),
            ('Series / Set', 'series; seriesName; setName'),
            ('Year', 'year; releaseYear'),
            ('Trading Event', 'pinTradingEvent; event; eventName; releaseEvent'),
            ('Limited Edition', 'limitedEdition; limitedEditionStatus; edition'),
            ('Open Edition', 'openEdition; openEditionStatus'),
            ('Edition Size', 'editionSize'),
            ('Pin Number', 'pinNumber; catalogNumber; number'),
            ('Backstamp Information', 'backstampInformation; backstamp; backstampInfo'),
            ('Artist Proof', 'artistProof; artistProofStatus'),
            ('Pre-Production', 'preProduction; preProductionStatus'),
            ('Backer Card Included', 'backerCardIncluded; backerCard; backerCardStatus'),
            ('Number of Pins / Complete Set', 'numberOfPins; pinCount; completeSet; complete; completeness'),
            ('Form / Lot Quantity', 'itemType; productType; form; saleForm; lotQuantity; itemCount; quantity'),
            ('Grading Fields', 'isGraded; gradingCompany; certificationCompany; grader; grade'),
        ],
        'actions': 'Unify releaseEvent, pinTradingEvent, event, and eventName. Expand shared conflict coverage for pin number, edition size, open/limited edition, backstamp, AP, PP, backer card, quantity, and completeness. Preserve the rule that condition and backing-card differences are not hard exclusions unless an explicit material identity rule says otherwise. Include Is Graded and grading fields only where the item type supports them.'
    },
    {
        'name': 'Music',
        'item_types': 'Vinyl Record; Cassette Tape; Compact Disc; Eight Track Tape; Other Music Format; Collection/Lot',
        'fields': [
            ('Artist / Performer', 'artist; performer; artistName'),
            ('Album / Release Title', 'releaseTitle; albumTitle; album; title'),
            ('Format', 'format; mediaFormat; itemType'),
            ('Record Label', 'recordLabel; label'),
            ('Catalog Number', 'catalogNumber; catalogNo; catNo'),
            ('Country', 'country; countryOfRelease; pressingCountry'),
            ('Release Year', 'releaseYear; year'),
            ('Edition / Pressing', 'edition; version; variant; pressing; pressingDetails'),
            ('Record Size', 'recordSize; size'),
            ('Matrix / Runout', 'matrixRunout; runout'),
            ('Packaging Included', 'packagingIncluded; originalPackaging; packaging'),
            ('Condition / Media Condition', 'condition; mediaCondition'),
            ('Grading Company', 'gradingCompany; certificationCompany; grader'),
            ('Grade', 'grade; numericGrade; finalGrade; professionalGrade'),
            ('Raw / Graded State', 'isGraded; graded; gradingStatus; rawOrGraded'),
            ('Lot / Collection', 'saleForm; form; lotQuantity; quantity; collection'),
        ],
        'actions': 'Centralize artistName, format synonyms, releaseYear/year, label, catalog number, edition/pressing/pressingDetails, record size, and matrix/runout semantics. Keep subjective condition out of hard exclusion, while preserving sealed/for-parts material-state conflicts. Extend ranking-award aliases so every Music score field reconciles to the comparison table. Add final source/provenance/valuation tests proving alias conflicts cannot reach valuation.'
    },
]

common_checklist = [
    'Map every human-facing master label to one canonical camelCase field name.',
    'List every accepted alias and identify whether it is structured-only, title-derived, or both.',
    'Define precedence when multiple aliases are present; collect all declarations and record contradictions instead of silently choosing first value.',
    'Define equivalent values and normalization rules, including spelling, punctuation, spacing, abbreviations, units, numeric formatting, and provider-expanded values.',
    'Define missing-value behavior: unknown, reviewable, hard conflict, or not applicable.',
    'Show where the field contributes points and prove earned points reconcile to actual scorer awards.',
    'Show the comparison-table key and ensure a displayed MATCH cannot create points by itself.',
    'Show whether the field is a pre-visual hard exclusion, a visual-review requirement, a soft difference, or informational only.',
    'Show whether the field is included in the canonical target fingerprint and candidate approval compatibility check.',
    'Trace the field through signed source normalization, provenance verification, duplicate handling, final identity admission, and final valuation use.',
    'Add positive alias, negative conflict, missing-field, title-versus-structured, contradictory-alias, serialization, and final-use regressions.',
]

prompt = r'''You are auditing Tradebilia’s AI valuation engine. Produce a complete, implementation-ready canonical field contract for every category and item type listed below.

Categories:
Sports Cards, Coins, Comics, Stamps, Video Games, Movies, Vintage Toys, Autographs, Pokémon, Disney Pins, and Music.

Your output must include:

1. A master field list for every category and item type.
2. A mapping from each human-facing master label to one canonical camelCase field name.
3. Every accepted alias, including provider aliases, structured aliases, title aliases, and legacy names.
4. The precedence rule when multiple aliases are present.
5. The semantic-equivalence rule for harmless variants such as abbreviations, spelling differences, units, punctuation, numeric formatting, and provider-expanded values.
6. The missing-value rule: unknown, reviewable, not applicable, soft difference, or hard conflict.
7. Whether each field is material identity, scoring-only, visual-only, source-only, economic-only, or informational.
8. The field’s score weight and the exact award key used for earned-point reconciliation.
9. The comparison-table field key and the rule preventing potential/title-only points from becoming earned points.
10. Whether the field can cause a pre-visual hard exclusion.
11. Whether the field requires visual review or visual confirmation.
12. Whether the field is included in the canonical target fingerprint and candidate approval compatibility check.
13. Whether the field is checked again during final source admission and final valuation-use admission.
14. Positive aliases, explicit conflicts, contradictory aliases, missing-field, title-versus-structured, serialization, and final-valuation regression tests.

Required boundary trace for every field:
P0/readiness → structured evidence normalization → title-derived evidence → shared metadata conflict gate → category-specific conflict gate → score calculation → earned-award reconciliation → comparison-table status → visual-review selection → visual adjudication → canonical target/candidate fingerprint → server-final identity approval → signed source normalization → provenance verification → duplicate/outlier/cap handling → final valuation-use admission.

Rules:
- Do not make title-derived evidence equivalent to trusted structured candidate identity unless the system explicitly approves that behavior.
- Preserve fail-closed provenance, source identity, transaction identity, target/image binding, lot and bundle safeguards, raw/graded safeguards, sealed/opened safeguards, currency/date/price-basis safeguards, duplicate/outlier rules, and final-use separation.
- Do not infer a unit price from a lot, collection, bundle, set, quantity, partial product, or incomplete product.
- Treat missing candidate fields as unknown/reviewable unless the category contract explicitly requires them.
- Treat explicit contradictions as conflicts; do not silently pick the first alias.
- Keep visual scores, ranks, comparison rows, browser flags, and source-stage valuation flags separate from final valuation authority.
- Include an “Is Graded” field and, when it can be Yes, include Grading Company, Grade, Grade Qualifier/Designation, Certification Number where applicable, and Raw/Graded State. Do this for categories or item types that currently lack these fields, except where the category policy intentionally excludes grading.
- Exclude shipping-only fields such as weight and dimensions unless dimensions are an identity field for a collectible format, such as poster size. Do not include shipping weight or shipping package dimensions.
- Explicitly identify fields that are intentionally not part of identity, such as specimen certificate/holder/tracking IDs where they identify an individual holder rather than the collectible type.

For each category, end with:
A. Confirmed current behavior.
B. Confirmed alias or field-contract mismatches.
C. Likely gaps requiring proof before code changes.
D. Safest repair order.
E. Exact regression-test matrix.
F. Fields that must not be changed without a separate policy decision.

Use plain English, but preserve exact camelCase names and function/file references where available. Do not propose broad fuzzy matching. Prefer bounded, explicit equivalence tables and tests.'''

lines = []
lines += ['# Tradebilia AI Field Contract Audit and ChatGPT Prompt', '', '**Purpose:** Provide a complete, category-by-category field inventory and a copy-ready prompt for generating the canonical field contract before further analyzer repairs.', '', '**Scope:** Read-only audit synthesis based on the current Tradebilia code audit, the existing source-verification matrix, the high-value field workbook, and the project handoff. This document proposes an audit and repair framework; it does not claim that every likely gap is already a production defect.', '', '**Important:** Shipping-only fields such as weight and shipping package dimensions are excluded. Collectible identity dimensions, such as poster size, remain eligible when they identify the item.', '', '## Executive direction', '', 'The recurring defects are caused primarily by field-contract drift between readiness, parsing, normalization, scoring, comparison display, hard-exclusion logic, canonical approval, source verification, and final valuation use. The safe repair is to establish one explicit field contract per category and test it across every boundary before changing admission behavior.', '', '## Master audit checklist', '']
for c in common_checklist:
    lines.append(f'- {c}')
lines += ['', '## Category field inventory and repair prompts', '']
for c in categories:
    lines += [f"### {c['name']}", '', f"**Item types:** {c['item_types']}", '', '| Master field label | Canonical camelCase / accepted aliases |', '|---|---|']
    for label, aliases in c['fields']:
        lines.append(f'| {label} | `{aliases}` |')
    lines += ['', '**What the full audit/prompt must resolve:**', '', c['actions'], '', '**Required tests:** positive aliases; explicit conflicts; missing candidate fields; title-only evidence; structured-versus-title contradiction; multiple-alias contradiction; canonical fingerprint/approval replay; provenance and final valuation-use outcome.', '']
lines += ['## Cross-category fields that must be standardized', '', '| Human-facing master label | Preferred canonical camelCase | Common aliases to inventory |', '|---|---|---|', '| Title / Name | `title` or category-specific canonical title | `name`, `listingTitle`, `itemTitle`, `productName`, `movieTitle`, `comicTitle`, `cardName`, `pinName`, `releaseTitle` |', '| Artist / Performer | `artist` | `performer`, `artistName` |', '| Year | `year` or category-specific `releaseYear` / `issueYear` | `manufactureYear`, `releaseYear`, `issueYear`, `mintYear`, `publicationYear` |', '| Format | `format` | `mediaFormat`, `customFormat`, `itemFormat`, `productFormat` |', '| Edition / Variant | `edition` or category-specific variant field | `version`, `releaseType`, `variant`, `variation`, `pressing`, `parallel` |', '| Country / Region | `country` or category-specific `region` | `issuingCountry`, `countryOfRelease`, `pressingCountry`, `region` |', '| Grading Company | `gradingCompany` | `certificationCompany`, `grader` |', '| Is Graded | `isGraded` | `graded`, `gradingStatus`, `gradingState`, `rawOrGraded` |', '| Grade | `grade` | `numericGrade`, `finalGrade`, `professionalGrade`, `gameGrade` |', '| Grade Qualifier | `gradeQualifier` | `qualifier`, `gradeDesignation`, `labelDesignation` |', '| Certification Number | `certificateNumber` | `certificationNumber`, `certNumber`, `authenticationNumber`, `certId` |', '| Condition | `condition` | `mediaCondition`, `packageCondition`, `stampCondition` |', '| Quantity / Lot Count | `quantity` or `lotQuantity` | `itemCount`, `numberOfItems`, `numberOfPins`, `coinCount`, `cardCount` |']
lines += ['', '## Grading-field requirement', '', 'For every category and item type that can be graded, the field contract must include:', '', '- **Is Graded** → `isGraded`', '- **Grading Company** → `gradingCompany` / `certificationCompany` / `grader`', '- **Grade** → `grade` / `numericGrade` / `finalGrade` / `professionalGrade`', '- **Grade Qualifier or Designation** → `gradeQualifier` / `qualifier` / `gradeDesignation` / `labelDesignation`, when supported', '- **Certification Number** → `certificateNumber` and aliases, when the certificate identifies the grading/authentication record', '- **Raw / Graded State** → `rawOrGraded` and related aliases', '', 'These fields must be conditional in the Add to Inventory UI, must be validated client-side and server-side, and must be traced through approval and valuation. A certificate, holder, tracking, barcode, or QR identifier must not automatically become collectible identity.', '', '## Copy-ready ChatGPT prompt', '', 'Copy the prompt below into ChatGPT to request the full canonical field list and repair plan:', '', '```text', prompt, '```', '', '## Deliverable expected from ChatGPT', '', 'The returned answer should be a field-contract specification, not a general discussion. It should contain:', '', '1. One canonical schema per category and item type.', '2. A master-label-to-camelCase mapping table.', '3. An alias and equivalence table.', '4. A precedence and contradiction policy.', '5. A field-by-field boundary trace.', '6. A scoring and award-reconciliation matrix.', '7. A hard-exclusion and visual-review matrix.', '8. A canonical approval and provenance matrix.', '9. A final valuation-use matrix.', '10. A regression-test plan with positive, negative, missing, contradictory, and replay cases.', '', '## Safe implementation sequence', '', '1. Freeze current runtime behavior and finalize the field matrix.', '2. Repair canonical approval compatibility for the highest-risk fields without broadening source admission.', '3. Add category contract tests across every boundary.', '4. Reconcile scoring and comparison-table award keys.', '5. Reconcile category conflict gates with final identity admission.', '6. Verify signed source normalization, duplicate handling, caps, historical/context use, and final valuation use.', '7. Only then make narrowly scoped behavior changes.', '', '## Do not change without a separate policy decision', '', '- Whether Sports Cards year mismatches are intentionally exempt at final approval.', '- Whether Coins country is mandatory for direct confirmation.', '- Whether Stamps may reach valuation with one sale from one marketplace.', '- Whether Movies collection lots can ever become direct valuation evidence.', '- Whether Autographs should remain outside the generic canonical approval schema because they use a signed-item market-relevance path.', '- Whether any source without a transaction ID or URL may be context-only, and never valuation-eligible.', '- Whether condition differences are hard identity conflicts or soft/informational differences by category and source.', '']

md = '\n'.join(lines) + '\n'
MD_PATH.write_text(md, encoding='utf-8')

# DOCX generation

def shade(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = tcPr.find(qn('w:shd'))
    if shd is None:
        shd = OxmlElement('w:shd')
        tcPr.append(shd)
    shd.set(qn('w:fill'), fill)

def set_cell_text(cell, text, bold=False, color=None, size=9):
    cell.text = ''
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    run = p.add_run(text)
    run.bold = bold
    run.font.size = Pt(size)
    if color:
        run.font.color.rgb = RGBColor.from_string(color)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP

def add_heading(doc, text, level=1):
    p = doc.add_paragraph(style=f'Heading {level}')
    p.paragraph_format.space_before = Pt(12 if level == 1 else 8)
    p.paragraph_format.space_after = Pt(5)
    r = p.add_run(text)
    return p

def add_body(doc, text, bold_prefix=None):
    p = doc.add_paragraph(style='Normal')
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.08
    if bold_prefix and text.startswith(bold_prefix):
        p.add_run(bold_prefix).bold = True
        p.add_run(text[len(bold_prefix):])
    else:
        p.add_run(text)
    return p

def add_bullet(doc, text):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_after = Pt(2)
    p.add_run(text)
    return p

doc = Document()
sec = doc.sections[0]
sec.top_margin = Inches(0.7); sec.bottom_margin = Inches(0.7); sec.left_margin = Inches(0.7); sec.right_margin = Inches(0.7)
styles = doc.styles
styles['Normal'].font.name = 'Aptos'; styles['Normal'].font.size = Pt(10)
for sname, size, color in [('Title', 24, '1F4E79'), ('Heading 1', 17, '1F4E79'), ('Heading 2', 13, '2F5597'), ('Heading 3', 11, '2F5597')]:
    st = styles[sname]
    st.font.name = 'Aptos Display' if sname in ('Title','Heading 1') else 'Aptos'
    st.font.size = Pt(size); st.font.bold = True; st.font.color.rgb = RGBColor.from_string(color)

p = doc.add_paragraph(style='Title')
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.add_run('Tradebilia AI Field Contract Audit').bold = True
p2 = doc.add_paragraph()
p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p2.add_run('All categories, master-label mappings, camelCase aliases, and ChatGPT repair prompt')
r.italic = True; r.font.size = Pt(13); r.font.color.rgb = RGBColor.from_string('4F4F4F')
add_body(doc, 'Prepared for the Tradebilia development-only analyzer audit. This is a read-only audit synthesis and planning document; it does not itself change runtime behavior.')
add_body(doc, 'Scope note: shipping-only fields such as weight and shipping package dimensions are excluded. Collectible identity dimensions, such as poster size, remain eligible when they identify the item.')

add_heading(doc, 'Executive direction', 1)
add_body(doc, 'The recurring defects are caused primarily by field-contract drift between readiness, parsing, normalization, scoring, comparison display, hard-exclusion logic, canonical approval, source verification, and final valuation use. The safe repair is to establish one explicit field contract per category and test it across every boundary before changing admission behavior.')
add_heading(doc, 'Master audit checklist', 1)
for item in common_checklist: add_bullet(doc, item)

add_heading(doc, 'Category field inventory and repair prompts', 1)
for c in categories:
    add_heading(doc, c['name'], 2)
    add_body(doc, f"Item types: {c['item_types']}")
    table = doc.add_table(rows=1, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = 'Table Grid'
    hdr = table.rows[0].cells
    set_cell_text(hdr[0], 'Master field label', True, 'FFFFFF', 9); shade(hdr[0], '1F4E79')
    set_cell_text(hdr[1], 'Canonical camelCase / accepted aliases', True, 'FFFFFF', 9); shade(hdr[1], '1F4E79')
    for label, aliases in c['fields']:
        cells = table.add_row().cells
        set_cell_text(cells[0], label, True, None, 8.5)
        set_cell_text(cells[1], aliases, False, None, 8.5)
    add_body(doc, 'What the full audit/prompt must resolve: ' + c['actions'])
    add_body(doc, 'Required tests: positive aliases; explicit conflicts; missing candidate fields; title-only evidence; structured-versus-title contradiction; multiple-alias contradiction; canonical fingerprint/approval replay; provenance and final valuation-use outcome.')

add_heading(doc, 'Cross-category fields that must be standardized', 1)
table = doc.add_table(rows=1, cols=3); table.style='Table Grid'; table.alignment=WD_TABLE_ALIGNMENT.CENTER
for cell, txt in zip(table.rows[0].cells, ['Human-facing master label','Preferred canonical camelCase','Common aliases to inventory']):
    set_cell_text(cell, txt, True, 'FFFFFF', 8.5); shade(cell,'1F4E79')
for row in [
('Title / Name','title or category-specific canonical title','name; listingTitle; itemTitle; productName; movieTitle; comicTitle; cardName; pinName; releaseTitle'),
('Artist / Performer','artist','performer; artistName'),('Year','year or releaseYear / issueYear','manufactureYear; releaseYear; issueYear; mintYear; publicationYear'),('Format','format','mediaFormat; customFormat; itemFormat; productFormat'),('Edition / Variant','edition or category-specific variant','version; releaseType; variant; variation; pressing; parallel'),('Country / Region','country or region','issuingCountry; countryOfRelease; pressingCountry; region'),('Grading Company','gradingCompany','certificationCompany; grader'),('Is Graded','isGraded','graded; gradingStatus; gradingState; rawOrGraded'),('Grade','grade','numericGrade; finalGrade; professionalGrade; gameGrade'),('Grade Qualifier','gradeQualifier','qualifier; gradeDesignation; labelDesignation'),('Certification Number','certificateNumber','certificationNumber; certNumber; authenticationNumber; certId'),('Condition','condition','mediaCondition; packageCondition; stampCondition'),('Quantity / Lot Count','quantity or lotQuantity','itemCount; numberOfItems; numberOfPins; coinCount; cardCount')]:
    cells=table.add_row().cells
    for i,val in enumerate(row): set_cell_text(cells[i], val, i==0, None, 8)

add_heading(doc, 'Grading-field requirement', 1)
for text in ['Is Graded → isGraded','Grading Company → gradingCompany / certificationCompany / grader','Grade → grade / numericGrade / finalGrade / professionalGrade','Grade Qualifier or Designation → gradeQualifier / qualifier / gradeDesignation / labelDesignation, when supported','Certification Number → certificateNumber and aliases, when the certificate identifies the grading/authentication record','Raw / Graded State → rawOrGraded and related aliases']:
    add_bullet(doc, text)
add_body(doc, 'These fields must be conditional in the Add to Inventory UI, validated client-side and server-side, and traced through approval and valuation. A certificate, holder, tracking, barcode, or QR identifier must not automatically become collectible identity.')

add_heading(doc, 'Copy-ready ChatGPT prompt', 1)
add_body(doc, 'Copy the prompt below into ChatGPT to request the full canonical field list and repair plan:')
for para in prompt.split('\n\n'):
    p=doc.add_paragraph(); p.paragraph_format.left_indent=Inches(0.25); p.paragraph_format.right_indent=Inches(0.25); p.paragraph_format.space_after=Pt(4)
    r=p.add_run(para); r.font.name='Consolas'; r.font.size=Pt(8.5)

add_heading(doc, 'Deliverable expected from ChatGPT', 1)
for item in ['One canonical schema per category and item type.','A master-label-to-camelCase mapping table.','An alias and equivalence table.','A precedence and contradiction policy.','A field-by-field boundary trace.','A scoring and award-reconciliation matrix.','A hard-exclusion and visual-review matrix.','A canonical approval and provenance matrix.','A final valuation-use matrix.','A regression-test plan with positive, negative, missing, contradictory, and replay cases.']:
    add_bullet(doc, item)
add_heading(doc, 'Safe implementation sequence', 1)
for item in ['Freeze current runtime behavior and finalize the field matrix.','Repair canonical approval compatibility for the highest-risk fields without broadening source admission.','Add category contract tests across every boundary.','Reconcile scoring and comparison-table award keys.','Reconcile category conflict gates with final identity admission.','Verify signed source normalization, duplicate handling, caps, historical/context use, and final valuation use.','Only then make narrowly scoped behavior changes.']:
    add_bullet(doc, item)
add_heading(doc, 'Do not change without a separate policy decision', 1)
for item in ['Whether Sports Cards year mismatches are intentionally exempt at final approval.','Whether Coins country is mandatory for direct confirmation.','Whether Stamps may reach valuation with one sale from one marketplace.','Whether Movies collection lots can ever become direct valuation evidence.','Whether Autographs should remain outside the generic canonical approval schema because they use a signed-item market-relevance path.','Whether any source without a transaction ID or URL may be context-only, and never valuation-eligible.','Whether condition differences are hard identity conflicts or soft/informational differences by category and source.']:
    add_bullet(doc, item)

# Footer with PAGE field via python-docx XML
footer = sec.footer.paragraphs[0]
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
footer.add_run('Tradebilia AI Field Contract Audit  |  Page ')
fldChar1 = OxmlElement('w:fldChar'); fldChar1.set(qn('w:fldCharType'), 'begin')
instrText = OxmlElement('w:instrText'); instrText.set(qn('xml:space'), 'preserve'); instrText.text = ' PAGE '
fldChar2 = OxmlElement('w:fldChar'); fldChar2.set(qn('w:fldCharType'), 'end')
run = footer.add_run(); run._r.append(fldChar1); run._r.append(instrText); run._r.append(fldChar2)

doc.save(DOCX_PATH)
print(MD_PATH)
print(DOCX_PATH)
