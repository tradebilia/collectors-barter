# Tradebilia Marketplace Search Query Reference

**Prepared:** November 1, 2026  
**Purpose:** Detailed review of how Tradebilia builds search criteria for every category and item type across eBay, completed-sales/marketplace sources, specialist marketplaces, grading sources, and reference/catalog sources.

> **Important reading rule:** This is a code-based reference of the current sandbox implementation. It distinguishes fields available from the inventory form, fields selected for the standard search definition, provider-specific formatting, and fields that are used later for filtering/ranking rather than being sent as search text.

## 1. Executive summary

Tradebilia now has a shared category/item-type search-definition layer. The selected item is converted into a structured identity definition first; eBay Active and eBay Sold-Comps use that definition directly, and the marketplace adapters route their primary identity query through it when the provider supports the fields. Each provider may still format the same identity differently because APIs, web search endpoints, and catalog lookups accept different parameters.

The process is:

1. Read the category, item type, title, and structured inventory fields.
2. Normalize spelling, punctuation, casing, aliases, abbreviations, and selected synonyms.
3. Build a standard identity definition for the category/item type.
4. Build a provider query from that definition. eBay/Sold-Comps use the richest structured phrase and bounded fallback tiers; other providers retain provider-specific URL/API formatting.
5. Retrieve results, then apply universal safeguards and category/item-type filters.
6. Rank candidates. Candidates below the visual cap remain context-only; market-range types such as Original Art and Signed Item do not go to visual analysis.
7. Separate current-value evidence, historical evidence, and context-only results.

## 2. Universal fields and safeguards

| Layer | What it does |
|---|---|
| Category and item type | Determines the standard search definition and the applicable identity/filter/ranking model. |
| Listing title | Fallback identity text and provider query support; it does not override structured fields when structured identity is present. |
| Structured identity fields | Preferred query inputs: names, set/release/issue numbers, years, formats, platforms, denominations, grades, and other category-specific identifiers. |
| Universal raw/graded and grader/grade checks | Prevents obvious raw-vs-graded and incompatible grading comparisons before visual review. |
| Collection/Lot block | Any Collection/Lot is non-comparable: provider lookups, ranking, visual analysis, and trade analysis are blocked. |
| Marketplace/eBay boundary | Marketplace/eBay filters and ranking do not run on grading/reference/catalog sources. |
| Missing fields | Missing provider metadata is normally unknown, not an automatic mismatch; it receives no score credit unless the source explicitly contradicts the target. |
| Explicit contradictions | Clear wrong item types, replicas, wrong formats, wrong platforms, wrong set/issue, and similar contradictions are excluded or retained only as context according to the item-type contract. |

## 3. Source groups and how queries are used

| Source group | Current sources in the application | Query behavior |
|---|---|---|
| **Marketplace** | Sold-Comps (Mercari Sold) (`mercari_sold_comps`); Sold-Comps (TCGplayer Sold) (`tcgplayer_sold_comps`); HIPStamp Active Listings (`hipstamp`); HIPStamp Sold / Closed (`hipstamp_sold`); Pokémon Price Tracker (`pokemon_price_tracker`); The Card API Sales (`the_card_api`); COMC Listings (via Parse.bot) (`comc_parse`); Cardsight.ai Market Data (`cardsight_ai`); Parse.bot Lelands Auctions (`lelands`); Parse.bot Pristine Auction (`pristine_auction`); Parse.bot Collect Auctions (`collect_auction`); Sirius Sports Auctions (`sirius_sports_auctions`); Comic Book Realm (`comic_book_realm`); PWCC / Fanatics Collect (`pwcc`); Heritage Auctions (`heritage`); GoCollect (`gocollect`); Parse.bot (PriceCharting) (`pricecharting`); Parse.bot (130point Sales) (`one_thirty_point`) | Uses the standard identity definition where compatible, then applies marketplace/eBay universal and item-type filters, ranking, and visual-cap rules. Completed sales can contribute valuation evidence only after evidence and identity gates. |
| **Grading** | Parse.bot CGC Comics (`cgc`); Parse.bot (PSA Data) (`psa`); Parse.bot (Beckett Data) (`bgs`); Parse.bot (SGC Data) (`sgc`); PCGS CoinFacts (`pcgs`); NGC Cert Lookup (`ngc`); CBCS (`cbcs`) | Uses certification/company/grade/item identity fields for verification. Marketplace filters, marketplace ranking, and visual caps are not applied. |
| **Reference** | Numista Coin Catalog (`numista`); Wikidata Metadata (`wikidata`); Smithsonian Stamp Reference (`smithsonian`); TCGdex Pokémon Catalog (`tcgdex`); IGDB Video Game Catalog (`igdb`); RAWG Video Game Catalog (`rawg`); Discogs Music Catalog (`discogs`) | Uses catalog/reference identifiers and normalized identity fields. Results remain reference/context unless a specific source contract says otherwise. |

### 3.1 eBay Active and eBay Sold-Comps

These are the reference implementations for the shared structure. The router builds a standard definition, creates a primary exact-tier query, and may run bounded fallback tiers only when the primary tier does not produce enough usable results after retrieval and filtering. The fallback is not automatically three searches every time: the executed-query list shows exactly which tiers ran. Sold-Comps uses the same identity construction but restricts the data to completed eBay sales and applies sale/evidence rules.

The eBay/Sold-Comps query can include, depending on item type:

- category/item-type designation;
- normalized title or primary name;
- creator/artist/player/signer/brand/manufacturer;
- year/release/publication date;
- set, series, issue, card number, Scott number, catalog number, UPC/EAN, model number, or certificate/grade identifiers;
- format, platform, region, edition, finish, language, packaging, sealed/opened status, and authentication/grading terms;
- Autographs default designation plus signer, signed-object type, authentication evidence, and inscription when available. Autograph Category is not used in marketplace search construction.

### 3.2 Other marketplace and specialist sources

Specialist adapters receive the same standard identity fields where their contract permits. They may collapse the definition into a URL keyword, preserve provider-specific ordering, add source-specific terms, or omit unsupported fields. The current implementation intentionally preserves provider safeguards such as structured-only requirements and source-specific fallback rules. A provider receiving fewer fields does not mean the fields were lost globally; it means that provider cannot accept them in its query contract.

### 3.3 Grading sources

Grading sources are queried by certification number, grading company, grade, item identity, and provider-specific identifiers. They are not sent through marketplace/eBay item-type ranking or visual-cap logic. Their result is certification/reference evidence, not an automatic market comparable.

### 3.4 Reference/catalog sources

Reference/catalog sources are queried by the identifiers their catalog understands: title/name, series/set, issue/year, platform/product, country/denomination, or other catalog keys. They provide identification, guide, population, or catalog context. They are not interchangeable with completed marketplace sales.

## 4. Category and item-type field inventory

The following sections list every current item type. “Available inventory fields” means fields the user can enter and the system can potentially use. “Primary identity fields” means the fields intended to define the search identity; condition, quantity, photos, and trade value are normally used for filtering/ranking/evidence rather than keyword identity.

## 4.1 Autographs

### Autographs / Signed Item

**Pipeline status:** Market range; no visual review.  
**Standard search identity:** Signer, Signed Item Type, Authentication Included, Authentication Company, Authentication Type, Certificate Number. Autograph Category is not part of the marketplace search query.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — required.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Signer** (`signer`) — required.
- **Signed Item Type** (`signedItemType`) — required.
- **Autograph Category** (`autographCategory`) — recommended.
- **Authentication Included** (`authenticationIncluded`) — required.
- **Authentication Company** (`authenticationCompany`) — required.
- **Authentication Type** (`authenticationType`) — required.
- **Certificate Number** (`certificateNumber`) — required.
- **Inscription Present** (`inscriptionPresent`) — optional.
- **Inscription Text** (`inscriptionText`) — optional.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Autographs / Collection/Lot

**Pipeline status:** Blocked universally.  
**Standard search identity:** Number of Signed Items, Signers Included, Authentication Included, Notable Items, Item Types Included.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — required.
- **Number of Signed Items** (`numberOfSignedItems`) — required.
- **Photos** (`photos`) — required.
- **Signers Included** (`signersIncluded`) — recommended.
- **Authentication Included** (`authenticationIncluded`) — recommended.
- **Notable Items** (`notableItems`) — recommended.
- **Item Types Included** (`itemTypesIncluded`) — recommended.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

## 4.2 Coins

### Coins / Single Coin

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Country, Denomination, Year, Mint Mark, Variety, Composition, Weight (oz), Diameter, Strike / Designation (as printed on holder).

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Country** (`country`) — required.
- **Condition** (`condition`) — conditional.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Denomination** (`denomination`) — required.
- **Year** (`year`) — required.
- **Mint Mark** (`mintMark`) — recommended.
- **Variety** (`variety`) — recommended.
- **Composition** (`composition`) — recommended.
- **Weight (oz)** (`weight`) — recommended.
- **Diameter** (`diameter`) — recommended.
- **Strike / Designation (as printed on holder)** (`designation`) — recommended.
- **Is Graded** (`isGraded`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Coins / Coin Set

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Country, Set Name, Year, Set Type, Original Packaging Included, Number of Coins in Set.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Country** (`country`) — required.
- **Condition** (`condition`) — required.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Set Name** (`setName`) — required.
- **Year** (`year`) — required.
- **Set Type** (`setType`) — required.
- **Original Packaging Included** (`originalPackagingIncluded`) — recommended.
- **Number of Coins in Set** (`numberOfCoins`) — recommended.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Coins / Paper Money / Banknotes

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Country, Denomination, Year, Serial Number, Signature.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Country** (`country`) — required.
- **Condition** (`condition`) — conditional.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Denomination** (`denomination`) — required.
- **Year** (`year`) — required.
- **Serial Number** (`serialNumber`) — recommended.
- **Signature** (`signature`) — recommended.
- **Is Graded** (`isGraded`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Coins / Collection/Lot

**Pipeline status:** Blocked universally.  
**Standard search identity:** Country, Approximate Coin Count, Countries Included, Years Included, Notable Coins.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Country** (`country`) — required.
- **Condition** (`condition`) — required.
- **Photos** (`photos`) — required.
- **Approximate Coin Count** (`approximateCoinCount`) — required.
- **Countries Included** (`countriesIncluded`) — recommended.
- **Years Included** (`yearsIncluded`) — recommended.
- **Notable Coins** (`notableCoins`) — recommended.
- **Includes Graded Coins** (`includesGradedCoins`) — optional.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

## 4.6 Comics

### Comics / Single Comic

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Comic Title, Issue Number, Publisher, Distribution Type, Publication Year, Variant Cover, Variant Description, Key Issue, Signed, Facsimile, Certification Label Status, Label Notation / Restoration Detail, # of Signatures, Signatures.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — conditional.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Comic Title** (`comicTitle`) — required.
- **Issue Number** (`issueNumber`) — required.
- **Publisher** (`publisher`) — required.
- **Distribution Type** (`distributionType`) — required.
- **Volume** (`volume`) — optional.
- **Publication Year** (`publicationYear`) — recommended.
- **Variant Cover** (`variantCover`) — recommended.
- **Variant Description** (`variantDescription`) — recommended.
- **Key Issue** (`keyIssue`) — recommended.
- **First Appearance** (`firstAppearance`) — optional.
- **Character Name** (`characterName`) — optional.
- **Signed** (`signed`) — recommended.
- **Facsimile** (`facsimile`) — recommended.
- **Certification Label Status** (`certificationLabelStatus`) — recommended.
- **Label Notation / Restoration Detail** (`labelNotation`) — recommended.
- **Is Graded** (`isGraded`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.
- **# of Signatures** (`numberOfSignatures`) — recommended.
- **Signatures** (`signatures`) — recommended.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Comics / Original Art

**Pipeline status:** Market context; no visual review.  
**Standard search identity:** Artist Name, Artwork Title / Character, Publisher, Art Type, Comic Title, Issue Number, Medium, Year Created, Signed By Artist, COA Included, Dimensions, Original Published Page, Comic Series, Issue Number, Page Number.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — conditional.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Artist Name** (`artistName`) — required.
- **Artwork Title / Character** (`artworkTitle`) — recommended.
- **Publisher** (`publisher`) — recommended.
- **Art Type** (`artType`) — required.
- **Comic Title** (`coverSketchComicTitle`) — conditional.
- **Issue Number** (`coverSketchIssueNumber`) — conditional.
- **Medium** (`medium`) — recommended.
- **Year Created** (`yearCreated`) — recommended.
- **Signed By Artist** (`signedByArtist`) — recommended.
- **COA Included** (`coaIncluded`) — recommended.
- **Dimensions** (`dimensions`) — recommended.
- **Framed** (`framed`) — optional.
- **Original Published Page** (`originalPublishedPage`) — recommended.
- **Comic Series** (`comicSeries`) — recommended.
- **Issue Number** (`issueNumber`) — recommended.
- **Page Number** (`pageNumber`) — recommended.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Comics / Collection/Lot

**Pipeline status:** Blocked universally.  
**Standard search identity:** Number of Comics, Publishers Included, Major Titles Included, Years Included.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — conditional.
- **Photos** (`photos`) — required.
- **Number of Comics** (`numberOfComics`) — required.
- **Publishers Included** (`publishersIncluded`) — recommended.
- **Major Titles Included** (`majorTitlesIncluded`) — recommended.
- **Years Included** (`yearsIncluded`) — recommended.
- **Includes Graded Comics** (`includesGradedComics`) — optional.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

## 4.9 Disney Pins

### Disney Pins / Individual Pin

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Pin Name, Character, Series, Year, Pin Trading Event, Limited Edition, Open Edition, Artist Proof (AP), Pre-Production (PP), Backstamp Information.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — required.
- **Pin Name** (`pinName`) — required.
- **Quantity** (`quantity`) — recommended.
- **Character** (`character`) — recommended.
- **Series** (`series`) — recommended.
- **Year** (`year`) — recommended.
- **Pin Trading Event** (`pinTradingEvent`) — recommended.
- **Limited Edition** (`limitedEdition`) — recommended.
- **Open Edition** (`openEdition`) — recommended.
- **Artist Proof (AP)** (`artistProof`) — recommended.
- **Pre-Production (PP)** (`preProduction`) — recommended.
- **Backstamp Information** (`backstampInformation`) — recommended.
- **Backer Card Included** (`backerCardIncluded`) — optional.
- **Photos** (`photos`) — required.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Disney Pins / Pin Set

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Set Name, Complete Set, Missing Pins, Number of Pins in Set, Limited Edition, Series, Characters Included.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — required.
- **Photos** (`photos`) — required.
- **Set Name** (`setName`) — required.
- **Complete Set** (`completeSet`) — required.
- **Missing Pins** (`missingPins`) — required.
- **Quantity** (`quantity`) — recommended.
- **Number of Pins in Set** (`numberOfPins`) — recommended.
- **Limited Edition** (`limitedEdition`) — recommended.
- **Series** (`series`) — recommended.
- **Characters Included** (`charactersIncluded`) — recommended.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Disney Pins / Collection/Lot

**Pipeline status:** Blocked universally.  
**Standard search identity:** Approximate Pin Count, Characters Included, Series Included, Limited Edition Pins Included.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — required.
- **Photos** (`photos`) — required.
- **Approximate Pin Count** (`approximatePinCount`) — required.
- **Characters Included** (`charactersIncluded`) — recommended.
- **Series Included** (`seriesIncluded`) — recommended.
- **Limited Edition Pins Included** (`limitedEditionPinsIncluded`) — recommended.
- **AP / PP Pins Included** (`apPpPinsIncluded`) — optional.
- **Backer Cards Included** (`backerCardsIncluded`) — optional.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

## 4.12 Movies

### Movies / Individual Movie

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Title, Format, Release Year, Sealed.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — conditional.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Title** (`title`) — required.
- **Format** (`format`) — required.
- **Release Year** (`releaseYear`) — recommended.
- **Edition** (`edition`) — optional.
- **Region** (`region`) — optional.
- **Sealed** (`sealed`) — recommended.
- **Is Graded** (`isGraded`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Movies / Box Set

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Box Set Name, Format, Number of Movies in Set, Sealed.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — required.
- **Photos** (`photos`) — required.
- **Box Set Name** (`boxSetName`) — required.
- **Format** (`format`) — required.
- **Is Graded** (`isGraded`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.
- **Quantity** (`quantity`) — recommended.
- **Number of Movies in Set** (`numberOfMovies`) — recommended.
- **Edition** (`edition`) — optional.
- **Sealed** (`sealed`) — recommended.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Movies / Collection/Lot

**Pipeline status:** Blocked universally.  
**Standard search identity:** Formats Included, Approximate Quantity, Notable Titles.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — required.
- **Photos** (`photos`) — required.
- **Formats Included** (`formatsIncluded`) — recommended.
- **Approximate Quantity** (`approximateQuantity`) — required.
- **Notable Titles** (`notableTitles`) — recommended.
- **Sealed Items Included** (`sealedItemsIncluded`) — optional.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

## 4.15 Music

### Music / Vinyl Record

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** No keyword identity fields; blocked or provider-specific..

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Artist** (`artist`) — required.
- **Release Title** (`releaseTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Photos** (`photos`) — required.
- **Is Graded** (`isGraded`) — required.
- **Condition** (`condition`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.
- **Record Label** (`recordLabel`) — recommended.
- **Catalog Number** (`catalogNumber`) — recommended.
- **Release Year** (`releaseYear`) — recommended.
- **Country** (`country`) — recommended.
- **Edition** (`edition`) — recommended.
- **Playback Tested** (`playbackTested`) — recommended.
- **Packaging Included** (`packagingIncluded`) — recommended.
- **Genre** (`genre`) — optional.
- **Packaging Condition** (`packagingCondition`) — optional.
- **Playback Notes** (`playbackNotes`) — optional.
- **Record Size** (`recordSize`) — optional.
- **Playback Speed** (`playbackSpeed`) — optional.
- **Pressing Details** (`pressingDetails`) — optional.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Music / Cassette Tape

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** No keyword identity fields; blocked or provider-specific..

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Artist** (`artist`) — required.
- **Release Title** (`releaseTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Photos** (`photos`) — required.
- **Is Graded** (`isGraded`) — required.
- **Condition** (`condition`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.
- **Record Label** (`recordLabel`) — recommended.
- **Catalog Number** (`catalogNumber`) — recommended.
- **Release Year** (`releaseYear`) — recommended.
- **Country** (`country`) — recommended.
- **Edition** (`edition`) — recommended.
- **Playback Tested** (`playbackTested`) — recommended.
- **Packaging Included** (`packagingIncluded`) — recommended.
- **Genre** (`genre`) — optional.
- **Packaging Condition** (`packagingCondition`) — optional.
- **Playback Notes** (`playbackNotes`) — optional.
- **Inlay / Booklet Status** (`inlayBookletStatus`) — optional.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Music / Compact Disc

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** No keyword identity fields; blocked or provider-specific..

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Artist** (`artist`) — required.
- **Release Title** (`releaseTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Photos** (`photos`) — required.
- **Is Graded** (`isGraded`) — required.
- **Condition** (`condition`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.
- **Record Label** (`recordLabel`) — recommended.
- **Catalog Number** (`catalogNumber`) — recommended.
- **Release Year** (`releaseYear`) — recommended.
- **Country** (`country`) — recommended.
- **Edition** (`edition`) — recommended.
- **Playback Tested** (`playbackTested`) — recommended.
- **Packaging Included** (`packagingIncluded`) — recommended.
- **Genre** (`genre`) — optional.
- **Packaging Condition** (`packagingCondition`) — optional.
- **Playback Notes** (`playbackNotes`) — optional.
- **Booklet Status** (`bookletStatus`) — optional.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Music / 8-Track Tape

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** No keyword identity fields; blocked or provider-specific..

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Artist** (`artist`) — required.
- **Release Title** (`releaseTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Photos** (`photos`) — required.
- **Is Graded** (`isGraded`) — required.
- **Condition** (`condition`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.
- **Record Label** (`recordLabel`) — recommended.
- **Catalog Number** (`catalogNumber`) — recommended.
- **Release Year** (`releaseYear`) — recommended.
- **Country** (`country`) — recommended.
- **Edition** (`edition`) — recommended.
- **Playback Tested** (`playbackTested`) — recommended.
- **Packaging Included** (`packagingIncluded`) — recommended.
- **Genre** (`genre`) — optional.
- **Packaging Condition** (`packagingCondition`) — optional.
- **Playback Notes** (`playbackNotes`) — optional.
- **Cartridge Notes** (`cartridgeNotes`) — optional.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Music / Other Music Format

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** No keyword identity fields; blocked or provider-specific..

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Artist** (`artist`) — required.
- **Release Title** (`releaseTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Photos** (`photos`) — required.
- **Is Graded** (`isGraded`) — required.
- **Condition** (`condition`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.
- **Record Label** (`recordLabel`) — recommended.
- **Catalog Number** (`catalogNumber`) — recommended.
- **Release Year** (`releaseYear`) — recommended.
- **Country** (`country`) — recommended.
- **Edition** (`edition`) — recommended.
- **Playback Tested** (`playbackTested`) — recommended.
- **Packaging Included** (`packagingIncluded`) — recommended.
- **Genre** (`genre`) — optional.
- **Packaging Condition** (`packagingCondition`) — optional.
- **Playback Notes** (`playbackNotes`) — optional.
- **Format Details** (`formatDetails`) — optional.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.


## 4.21 Pokémon

### Pokémon / Single Card

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Card Name, Set Name, Card Number, Year, Rarity, Edition / Era, Finish, Card Type / Mechanic, Language, Grade Qualifier / Label Designation.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — required.
- **Quantity** (`quantity`) — recommended.
- **Card Name** (`cardName`) — required.
- **Set Name** (`setName`) — required.
- **Card Number** (`cardNumber`) — required.
- **Year** (`year`) — required.
- **Rarity** (`rarity`) — recommended.
- **Edition / Era** (`editionEra`) — required.
- **Finish** (`finish`) — required.
- **Card Type / Mechanic** (`cardType`) — required.
- **Special Attributes** (`specialAttributes`) — optional.
- **Language** (`language`) — required.
- **Is Graded** (`isGraded`) — required.
- **Grading Company** (`gradingCompany`) — conditional.
- **Grade** (`grade`) — conditional.
- **Certification Number** (`certificationNumber`) — conditional.
- **Grade Qualifier / Label Designation** (`gradeQualifier`) — recommended.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Pokémon / Set

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Set Name, Year, Complete.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — required.
- **Photos** (`photos`) — required.
- **Set Name** (`setName`) — required.
- **Year** (`year`) — required.
- **Complete** (`complete`) — required.
- **Quantity** (`quantity`) — recommended.
- **Notable Cards** (`notableCards`) — optional.
- **Includes Graded Cards** (`includesGradedCards`) — optional.
- **Number of Cards in Set** (`numberOfCardsInSet`) — optional.
- **Original Packaging** (`originalPackaging`) — optional.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Pokémon / Unopened Product

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Product Name, Set Name, Product Type, Year, Era, Factory Sealed, Authenticated, Authentication Company, From A Sealed Case.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — required.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Product Name** (`productName`) — required.
- **Set Name** (`setName`) — required.
- **Product Type** (`productType`) — required.
- **Year** (`releaseYear`) — required.
- **Era** (`era`) — required.
- **Factory Sealed** (`factorySealed`) — required.
- **Authenticated** (`authenticated`) — required.
- **Authentication Company** (`authenticationCompany`) — required.
- **From A Sealed Case** (`fromASealedCase`) — required.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Pokémon / Collection/Lot

**Pipeline status:** Blocked universally.  
**Standard search identity:** Approximate Card Count, Eras / Series Included, Notable Cards, Eras / Series Included.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — required.
- **Photos** (`photos`) — required.
- **Approximate Card Count** (`approximateCardCount`) — required.
- **Eras / Series Included** (`setsIncluded`) — recommended.
- **Notable Cards** (`notableCards`) — recommended.
- **Includes Graded Cards** (`includesGradedCards`) — optional.
- **Eras / Series Included** (`erasSeriesIncluded`) — recommended.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

## 4.25 Sports Cards

### Sports Cards / Single Card

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Sport, Player, Year, Manufacturer, Set Name, Card Number, Rookie Card, Autograph, Relic / Memorabilia, Serial Numbered, Serial Number / Print Run (example: 10/100), Grade Qualifier / Label Designation.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — conditional.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Sport** (`sport`) — required.
- **Player** (`player`) — required.
- **Year** (`year`) — required.
- **Manufacturer** (`manufacturer`) — required.
- **Set Name** (`setName`) — recommended.
- **Card Number** (`cardNumber`) — required.
- **Parallel / Variation** (`parallelVariation`) — optional.
- **Rookie Card** (`rookieCard`) — recommended.
- **Autograph** (`autograph`) — recommended.
- **Relic / Memorabilia** (`relicMemorabilia`) — recommended.
- **Serial Numbered** (`serialNumbered`) — recommended.
- **Serial Number / Print Run (example: 10/100)** (`serialNumber`) — recommended.
- **Is Graded** (`isGraded`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.
- **Grade Qualifier / Label Designation** (`gradeQualifier`) — recommended.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Sports Cards / Set

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Factory Sealed, Sport, Year, Manufacturer, Set Name, Set Type, Missing Cards, Missing Card Details.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — conditional.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Factory Sealed** (`factorySealed`) — recommended.
- **Sport** (`sport`) — required.
- **Year** (`year`) — required.
- **Manufacturer** (`manufacturer`) — required.
- **Set Name** (`setName`) — required.
- **Set Type** (`setType`) — required.
- **Missing Cards** (`missingCards`) — required.
- **Missing Card Details** (`missingCardDetails`) — required.
- **Number of Cards in Set** (`numberOfCardsInSet`) — optional.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Sports Cards / Unopened Product

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Sport, Year, Manufacturer, Product Name, Product Format, Product Type, Factory Sealed, Authenticated, Authentication Company, From A Sealed Case.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — conditional.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Sport** (`sport`) — required.
- **Year** (`year`) — required.
- **Manufacturer** (`manufacturer`) — required.
- **Product Name** (`productName`) — required.
- **Product Format** (`productFormat`) — required.
- **Product Type** (`productType`) — recommended.
- **Factory Sealed** (`factorySealed`) — required.
- **Authenticated** (`authenticated`) — required.
- **Authentication Company** (`authenticationCompany`) — required.
- **From A Sealed Case** (`fromASealedCase`) — required.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Sports Cards / Collection/Lot

**Pipeline status:** Blocked universally.  
**Standard search identity:** Sport, Approximate Card Count, Years Included, Manufacturers Included, Notable Players, Notable Cards.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — conditional.
- **Photos** (`photos`) — required.
- **Sport** (`sport`) — recommended.
- **Approximate Card Count** (`approximateCardCount`) — required.
- **Years Included** (`yearsIncluded`) — recommended.
- **Manufacturers Included** (`manufacturersIncluded`) — recommended.
- **Notable Players** (`notablePlayers`) — recommended.
- **Notable Cards** (`notableCards`) — recommended.
- **Includes Graded Cards** (`includesGradedCards`) — optional.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

## 4.29 Stamps

### Stamps / Single Stamp

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Country, Year, Scott Number, Grade, Denomination, Perforation, Watermark, Overprint / Surcharge, Mint or Used, Hinge Status, Gum Type, Centering.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Country** (`country`) — required.
- **Condition** (`condition`) — conditional.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Year** (`year`) — required.
- **Scott Number** (`scottNumber`) — required.
- **Grade** (`stampGrade`) — required.
- **Denomination** (`denomination`) — recommended.
- **Perforation** (`perforation`) — recommended.
- **Watermark** (`watermark`) — recommended.
- **Overprint / Surcharge** (`overprintSurcharge`) — recommended.
- **Mint or Used** (`mintOrUsed`) — required.
- **Hinge Status** (`hinged`) — required.
- **Is Graded** (`isGraded`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Numerical Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.
- **Gum Type** (`gum`) — required.
- **Centering** (`centering`) — required.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Stamps / Stamp Set / Sheet

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Country, Year, Set Name, Sheet Type, Number of Stamps in Set, Mint or Used.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Country** (`country`) — required.
- **Condition** (`condition`) — conditional.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Year** (`year`) — recommended.
- **Set Name** (`setNameDescription`) — required.
- **Sheet Type** (`sheetType`) — required.
- **Number of Stamps in Set** (`numberOfStamps`) — recommended.
- **Mint or Used** (`mintOrUsed`) — recommended.
- **Is Graded** (`isGraded`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Stamps / Collection/Lot

**Pipeline status:** Blocked universally.  
**Standard search identity:** Approximate Quantity, Countries Included, Years Included, Notable Stamps.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — required.
- **Photos** (`photos`) — required.
- **Approximate Quantity** (`approximateQuantity`) — required.
- **Countries Included** (`countriesIncluded`) — recommended.
- **Years Included** (`yearsIncluded`) — recommended.
- **Album Included** (`albumIncluded`) — optional.
- **Notable Stamps** (`notableStamps`) — recommended.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

## 4.32 Video Games

### Video Games / Game

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Game Title, Platform, Release Year, UPC / EAN (if printed on packaging), Region, Complete In Box, Original Case Included, Manual Included, Sealed.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — conditional.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Game Title** (`gameTitle`) — required.
- **Platform** (`platform`) — required.
- **Release Year** (`releaseYear`) — recommended.
- **UPC / EAN (if printed on packaging)** (`upc`) — recommended.
- **Region** (`region`) — recommended.
- **Complete In Box** (`completeInBox`) — recommended.
- **Original Case Included** (`originalCaseIncluded`) — recommended.
- **Manual Included** (`manualIncluded`) — recommended.
- **Sealed** (`sealed`) — recommended.
- **Is Graded** (`isGraded`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Video Games / Console

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Console Name, Model Number, Region, Working Condition, Original Box Included, Cables Included, Number of Controllers Included.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — conditional.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Console Name** (`consoleName`) — required.
- **Model Number** (`modelNumber`) — recommended.
- **Region** (`region`) — recommended.
- **Working Condition** (`workingCondition`) — required.
- **Original Box Included** (`originalBoxIncluded`) — recommended.
- **Cables Included** (`cablesIncluded`) — recommended.
- **Number of Controllers Included** (`controllersIncluded`) — recommended.
- **Is Graded** (`isGraded`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Video Games / Accessory

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Accessory Type, Accessory Name, Platform, Manufacturer, Working Condition, Original Packaging.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — conditional.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Accessory Type** (`accessoryType`) — required.
- **Accessory Name** (`accessoryName`) — required.
- **Platform** (`platform`) — required.
- **Manufacturer** (`manufacturer`) — recommended.
- **Working Condition** (`workingCondition`) — required.
- **Is Graded** (`isGraded`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.
- **Original Packaging** (`originalPackaging`) — recommended.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Video Games / Collection/Lot

**Pipeline status:** Blocked universally.  
**Standard search identity:** Approximate Item Count, Platforms Included, Notable Games / Consoles.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — required.
- **Approximate Item Count** (`approximateItemCount`) — required.
- **Platforms Included** (`platformsIncluded`) — recommended.
- **Notable Games / Consoles** (`notableGamesConsoles`) — recommended.
- **Includes Graded Games** (`includesGradedGames`) — optional.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

## 4.36 Vintage Toys

### Vintage Toys / Action Figure / Doll

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Toy Name / Character, Brand, Franchise, Year, Packaging Type, Complete, Accessories Included.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — conditional.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Toy Name / Character** (`toyName`) — required.
- **Brand** (`brand`) — recommended.
- **Franchise** (`franchise`) — recommended.
- **Year** (`year`) — recommended.
- **Packaging Type** (`packagingType`) — required.
- **Complete** (`complete`) — recommended.
- **Accessories Included** (`accessoriesIncluded`) — recommended.
- **Is Graded** (`isGraded`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Vintage Toys / Board Game / Puzzle

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Game / Puzzle Name, Publisher / Brand, Year, Number of Pieces, Complete, Missing Pieces, Instructions Included, Box Included.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — conditional.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Game / Puzzle Name** (`gamePuzzleName`) — required.
- **Publisher / Brand** (`publisherBrand`) — required.
- **Year** (`year`) — recommended.
- **Number of Pieces** (`numberOfPieces`) — recommended.
- **Complete** (`complete`) — required.
- **Missing Pieces** (`missingPieces`) — required.
- **Is Graded** (`isGraded`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.
- **Instructions Included** (`instructionsIncluded`) — recommended.
- **Box Included** (`boxIncluded`) — recommended.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Vintage Toys / Electronic Toy

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Toy Name, Brand, Year, Tested, Working Condition, Battery Compartment Condition.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — conditional.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Toy Name** (`toyName`) — required.
- **Brand** (`brand`) — recommended.
- **Year** (`year`) — recommended.
- **Tested** (`tested`) — required.
- **Working Condition** (`workingCondition`) — required.
- **Battery Compartment Condition** (`batteryCompartmentCondition`) — recommended.
- **Sound Works** (`soundWorks`) — optional.
- **Lights Work** (`lightsWork`) — optional.
- **Is Graded** (`isGraded`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Vintage Toys / LEGO

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** No keyword identity fields; blocked or provider-specific..

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Photos** (`photos`) — required.
- **Is Graded** (`isGraded`) — required.
- **Condition** (`condition`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.
- **Set Number** (`setNumber`) — recommended.
- **Theme** (`theme`) — recommended.
- **Complete** (`complete`) — recommended.
- **Quantity** (`quantity`) — recommended.
- **Packaging Type** (`packagingType`) — recommended.
- **Missing Details** (`missingDetails`) — recommended.
- **Instructions Included** (`instructionsIncluded`) — optional.
- **Minifigures Included** (`minifiguresIncluded`) — optional.
- **Release Year** (`releaseYear`) — optional.
- **Piece Count** (`pieceCount`) — optional.
- **Retired Status** (`retiredStatus`) — optional.
- **Box Condition** (`boxCondition`) — optional.
- **Instruction Condition** (`instructionCondition`) — optional.
- **Minifigure Details** (`minifigureDetails`) — optional.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Vintage Toys / Model / Kit

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Model / Kit Name, Brand, Scale, Built or Unbuilt, Complete, Instructions Included.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — conditional.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Model / Kit Name** (`modelKitName`) — required.
- **Brand** (`brand`) — recommended.
- **Scale** (`scale`) — recommended.
- **Built or Unbuilt** (`builtOrUnbuilt`) — required.
- **Complete** (`complete`) — recommended.
- **Instructions Included** (`instructionsIncluded`) — recommended.
- **Is Graded** (`isGraded`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Vintage Toys / Playset

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Playset Name, Brand, Franchise, Year, Complete, Missing Pieces, Instructions Included, Original Box Included.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — conditional.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Playset Name** (`playsetName`) — required.
- **Brand** (`brand`) — recommended.
- **Franchise** (`franchise`) — recommended.
- **Year** (`year`) — recommended.
- **Complete** (`complete`) — required.
- **Missing Pieces** (`missingPieces`) — required.
- **Is Graded** (`isGraded`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.
- **Instructions Included** (`instructionsIncluded`) — recommended.
- **Original Box Included** (`originalBoxIncluded`) — recommended.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Vintage Toys / Plush / Stuffed Toy

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Toy Name / Character, Brand, Year, Tags Attached.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — conditional.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Toy Name / Character** (`toyNameCharacter`) — required.
- **Brand** (`brand`) — recommended.
- **Year** (`year`) — recommended.
- **Tags Attached** (`tagsAttached`) — recommended.
- **Cleanliness / Odor Notes** (`cleanlinessOdorNotes`) — optional.
- **Is Graded** (`isGraded`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Vintage Toys / Vehicle

**Pipeline status:** Ranked marketplace/eBay; visual cap.  
**Standard search identity:** Vehicle Name, Brand, Franchise, Year, Packaging Type, Vehicle Type, Working Features.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — conditional.
- **Is Graded** (`isGraded`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Vehicle Name** (`vehicleName`) — required.
- **Brand** (`brand`) — recommended.
- **Franchise** (`franchise`) — recommended.
- **Year** (`year`) — recommended.
- **Packaging Type** (`packagingType`) — required.
- **Vehicle Type** (`vehicleType`) — recommended.
- **Working Features** (`workingFeatures`) — recommended.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

### Vintage Toys / Collection/Lot

**Pipeline status:** Blocked universally.  
**Standard search identity:** Approximate Item Count, Brands Included, Franchises Included, Notable Items.

**Available inventory fields:**
- **Listing Title** (`listingTitle`) — required.
- **Trade Value** (`tradeValue`) — required.
- **Condition** (`condition`) — conditional.
- **Photos** (`photos`) — required.
- **Quantity** (`quantity`) — recommended.
- **Approximate Item Count** (`approximateItemCount`) — required.
- **Brands Included** (`brandsIncluded`) — recommended.
- **Franchises Included** (`franchisesIncluded`) — recommended.
- **Notable Items** (`notableItems`) — recommended.
- **Is Graded** (`isGraded`) — required.
- **Grading Company** (`gradingCompany`) — required.
- **Grade** (`grade`) — required.
- **Certification Number** (`certificationNumber`) — required.

**How these fields are used:**
- Primary identity fields are normalized into the shared category/item-type definition before provider formatting.
- Generic operational fields such as condition, photos, quantity, and trade value are generally not used as the main keyword phrase; they inform eligibility, ranking, price/evidence handling, or visual review.
- Certification and grading fields are used when the source/provider supports them, but grading/reference lookups remain outside marketplace ranking.

## 5. Source-by-source routing matrix

| Source | Shared definition used? | What normally becomes the query | What the source is allowed to contribute |
|---|---:|---|---|
| eBay Active Listings | Yes | Primary structured identity phrase plus bounded fallback tiers | Asking/current-market context; not completed-sale evidence |
| eBay Sold-Comps | Yes | Same standard identity phrase, with completed-sale constraints | Historical/current sold evidence after sale, identity, price, and evidence gates |
| Mercari / other sold-comps adapters | Yes where adapter supports it | Shared identity fields translated into provider search text | Sold-market context subject to provider and evidence rules |
| 130point / auction parsers | Yes where structured input is available | Structured identity; no unsafe title-only fallback when the adapter requires structured fields | Historical sale records only when the source contract validates them |
| COMC / TheCardApi | Yes for supported identity fields, with provider-specific formatting | Card/Pokémon identity, set, number, grade, and provider-specific fields | Inventory/asking or provider-specific market context; source contract controls valuation use |
| Specialist auction sources (Goldin, Lelands, Pristine, Collect, Sirius, Weiss, Nate Sanders, etc.) | Yes for compatible category/item types | Shared category/item identity, then source-specific URL/API formatting and fallback policy | Source-specific active or historical market evidence; eligibility is source-specific |
| HipStamp | Yes for supported stamp identity | Country, year, catalog/Scott number, denomination, and stamp-format terms | Stamp marketplace/sold context; not grading/reference data |
| ComicConnect / Comic Book Realm | Yes for supported comics identity | Comic title, issue, publisher/series, year, and original-art context | Comic marketplace/reference context according to provider contract |
| Pokémon price tracker / TCG catalog | Shared identity fields where supported | Card, set, number, year, rarity, finish, mechanic, language, and product type | Catalog/price-guide context; not automatically a completed sale |
| PSA / BGS / SGC / CGC / PCGS / NGC | No marketplace ranking; uses provider verification contract | Certification number, company, grade, and provider item identity | Certification, population, guide, or reference evidence |
| Numista / Wikidata / Smithsonian / IGDB / RAWG / TCGdex / Discogs | Uses provider-specific catalog contract informed by standard identity | Catalog title/name, series/set, issue/year, platform/product, country/denomination, or release identity | Reference/catalog metadata and identification; not market evidence by default |

**Important limitation:** “Shared definition used” does not mean every provider receives every field. It means the system starts from one normalized identity contract and then adapts it to each provider’s supported query shape.

## 6. Fields available versus fields currently emphasized

The inventory form contains more information than can safely be put into a single keyword query. Tradebilia therefore separates fields into four practical groups:

1. **Search identity:** the minimum fields needed to find the right kind of item.
2. **Search refinement:** fields that improve precision when the provider supports them, such as year, edition, region, language, grade, packaging, or authentication.
3. **Deterministic filtering:** fields used after retrieval to exclude obvious mismatches, such as raw versus graded, sealed versus opened, individual item versus lot, card versus signed physical object, or wrong signer.
4. **Ranking/evidence:** fields used to score relevance or decide whether a result may affect valuation, such as exact signer, signed-object type, authentication evidence, grade, country, issue, or sale status.

A field can therefore be available and important without appearing in the visible search phrase. This is intentional: overloading a marketplace query with every field can produce zero results, while relying on title text alone can admit obvious mismatches.

## 7. Review questions for the advanced AI model

Please ask the reviewing model to check the following:

- Are any high-value identity fields missing from an item type’s inventory form?
- Which fields should be hard search terms, which should be fallback terms, and which should remain post-retrieval filters?
- Are any current synonym groups too narrow or too broad?
- Are provider-specific query limitations documented accurately, especially for specialist sources?
- Are any categories using a weaker search definition than eBay/Sold-Comps?
- Does every non-Collection/Lot item type have a clear identity definition, ranking model, and visual-cap rule where applicable?
- Are market-range types clearly separated from exact-comparable types?
- Are grading/reference/catalog results prevented from entering marketplace ranking and visual-cap logic?
- Are missing fields treated as unknown rather than false mismatches?
- Are fallback tiers bounded and explainable to the user?

## 8. Findings and recommendations for review

1. The architecture is directionally correct: one normalized definition should govern all marketplace searches, while provider adapters preserve source-specific mechanics.
2. The highest-risk area is not missing fields; it is inconsistent provider translation. The next audit should compare the final emitted query for every source against the standard definition for representative items in every category.
3. Every search result should retain an audit record showing: standard fields supplied, fields emitted to the provider, fields omitted because unsupported, fallback tier used, and post-retrieval filters applied.
4. For Autographs, signer identity, signed-object type, authentication evidence, multi-signature count, country/version, and replica/facsimile signals should remain separate from generic keyword matching.
5. For Pokémon, Finish and Card Type / Mechanic must remain separate. Combining them risks the same kind of false partial match previously seen in other categories.
6. For stamps, Gum Type and Hinge Status should remain separate scoring/filter signals.
7. Collection/Lot must remain blocked even if a provider can technically return results, because the unit of comparison is not stable.

## Appendix A — Current code artifacts reviewed

- `shared/marketplaceSearchDefinition.ts` — shared category/item-type search contract.
- `shared/testAiCriteria.ts` — structured query fields and category-specific query builders.
- `server/testAIRouter.ts` — eBay Active and Sold-Comps query construction, fallback tiers, and response mapping.
- Marketplace adapters under `server/` — provider-specific translation and fallback behavior.
- `client/src/lib/fieldDefinitionsGenerated.ts`, `client/src/lib/fieldDefinitionsRemaining.ts`, and `client/src/lib/fieldDefinitionsLego.ts` — current inventory field definitions and requiredness.
- `client/src/lib/layoutConfigs/layouts/` — item-type field placement.
- `server/testAiVisualSourceFilter.ts` — universal filters, category/item-type identity gates, ranking, caps, and market-context behavior.

**Prepared for advanced-model review; no database, migration, secret, provider configuration, deployment, or publishing changes were made.**
