# Tradebilia RSS Feed Deep Dive — All Categories

**Research date:** 2026-09-25  
**Current registry screened:** 157 feeds  
**Result:** 63 additional non-duplicate candidates identified across all 11 categories.

> RSS and Atom feeds are **context-only**. They can inform release timing, supply, collector attention, provenance, authentication risk, cultural significance, and auction awareness. They are not completed-sale comparables, appraisals, or valuation evidence.

## Priority order

The strongest first additions are **Sports Cards, Video Games, Pokémon/TCG, Movies, and Comics**. These categories gained the most useful primary-source release, platform, physical-media, or Japan-first coverage. Stamps and Coins should follow closely because their candidates add specialist auction and authenticity context.

| Priority | Category | New candidates | Main incremental value |
|---:|---|---:|---|
| 1 | Sports Cards | 5 | Panini/Topps manufacturer releases, checklists, redemptions, vintage history |
| 2 | Video Games | 8 | Physical releases, arcade/coin-op, retro hardware, platform intelligence |
| 3 | Pokémon / TCG | 7 | Japan-first products, competitive metagame, rules, card lists |
| 4 | Movies | 7 | Physical media, boutique labels, restoration, film preservation |
| 5 | Comics | 6 | Independent comics, solicitations, distributor/publisher and awards coverage |
| 6 | Vintage Toys | 6 | Toy auctions, trade coverage, LEGO, antique-toy reference |
| 7 | Stamps | 6 | International societies, auctions, Commonwealth/Europe/India issues |
| 8 | Music | 6 | Limited editions, vinyl, legacy labels, archival context |
| 9 | Coins | 4 | Auction commentary, international numismatics, counterfeit education |
| 10 | Autographs | 4 | Specialist auction, manuscript, provenance and historical-document context |
| 11 | Disney Pins | 4 | Pin drops, trading rules and official Disney business context |

## Comics — 6 candidates

- [SKTCHD](https://sktchd.com/feed/) — current comics-business and market commentary.
- [The Comics Journal](https://www.tcj.com/feed/) — independent and alternative comics, creators and publishers.
- [AIPT Comics](https://aiptcomics.com/feed/) — solicitations, previews, variants and publisher announcements.
- [Penguin Random House Comics](https://prhcomics.com/feed/) — official distributor/publisher release and special-edition intelligence.
- [Archie Comics](https://archiecomics.com/feed/) — direct issue, licensed-release and special-program announcements.
- [Comic-Con International — Toucan](https://www.comic-con.org/toucan/feed/) — Eisner Awards, convention programming and recognition signals.

Deferred: CGC Comics, Heritage Comics Blog, Comic Art Fans, Hake’s, ComicsPRO, Marvel, DC and PreviewsWorld were not added because feeds were unavailable, blocked, stale, HTML instead of XML, or lacked a usable current endpoint.

## Sports Cards — 5 candidates

- [Panini News — The Knight’s Lance](https://blog.paniniamerica.net/feed/) — manufacturer releases, distribution and redemption fulfillment.
- [Topps Ripped](https://ripped.topps.com/feed/) — official Topps/Fanatics guides, checklists, release timing and product history.
- [Go GTS](https://gogts.net/feed/) — distributor previews, box configurations, checklists and hobby calendar context.
- [National Baseball Hall of Fame and Museum](https://baseballhall.org/rss.xml) — historical baseball-card and artifact context.
- [Old Sports Cards](https://www.oldsportscards.com/feed/) — vintage-card condition, variations and set-history education.

Topps Ripped and Go GTS were verified by the feed-opening workflow but may challenge generic scripted clients. Use retry/backoff and never substitute an HTML challenge page for feed data. Sports Card Investor, SGC, CGC Cards, Robert Edward Auctions, Lelands, NSCC and PWCC were deferred due to stale, blocked, missing or unusable feeds.

## Vintage Toys — 6 candidates

- [Morphy Auctions Toys & Pop Culture](https://morphyauctions.com/auctions/divisions/toys-pop-culture/feed/) — toy/pop-culture auction events and supply context.
- [Antique Trader Toys Archives](https://www.antiquetrader.com/collectibles/toys-collectibles/feed) — classic toys, LEGO, history and collecting trends.
- [Toy World Magazine](https://toyworldmag.co.uk/feed/) — manufacturer, licensing, retail and distribution intelligence.
- [Brickset](https://brickset.com/feed/) — LEGO reveals, reissues and collector-reference data.
- [The Brothers Brick](https://feeds.feedburner.com/TheBrothersBrick) — independent LEGO collector and fan-demand context.
- [AntiqueToys.com](https://www.antiquetoys.com/feed/) — antique-toy maker, origin and identification context; moderate confidence because it is commercial and lower cadence.

Bertoia, Hake’s, AFA, Mattel Investor Relations, SWCA, Vintage Star Wars Collectors and Antique Toy World were deferred for zero-entry, blocked, stale, CAPTCHA or non-feed responses. Super7 was already present in the registry.

## Video Games — 8 candidates

- [Evercade News](https://evercade.co.uk/feed/) — official retro cartridges, arcade collections and physical releases.
- [Fangamer News](https://www.fangamer.com/blogs/news.atom) — limited merchandise, anniversary products and collector editions.
- [Arcade Heroes](https://arcadeheroes.com/feed/) — arcade/coin-op cabinets, manufacturers and preservation context.
- [The Arcade Blogger](https://arcadeblogger.com/feed/) — arcade machines, ports, installations and events.
- [Old School Gamer Magazine](https://www.oldschoolgamermagazine.com/feed/) — retro history, hardware and collector culture.
- [RetroRGB](https://retrorgb.com/feed) — retro hardware, repair, mods, FPGA and preservation.
- [GameDiscoverCo Newsletter](https://newsletter.gamediscover.co/feed) — data-led discovery and consumer-demand context.
- [PlayStation.Blog](https://blog.playstation.com/feed/) — official releases, remasters, hardware and anniversaries.

Heritage, CGC Video Games, WATA/PSA, Digital Foundry, Racketboy and Premium Edition Games were deferred for blocked, HTML or stale responses. PriceCharting was excluded because it is already registered.

## Pokémon / TCG — 7 candidates

- [Pokémon Card Channel Japan](https://www.youtube.com/feeds/videos.xml?channel_id=UCysOBNRW0rEmLtFptj1TN7A) — official Japanese releases, tournaments, rules and merchandise.
- [PocketMonsters.net News](https://pocketmonsters.net/rss) — Japanese/global product, card database, merchandise and TCG Pocket coverage.
- [The PokeGym](https://pokegym.net/feed/) — tournament rulings, prerelease FAQs and Play! Pokémon updates; may need retry handling.
- [PokecaBook](https://pokecabook.com/feed/) — Japanese Gym Battle winning-decklist aggregation.
- [PokéCard Lab](https://pokecardlab.com/feed/) — Japanese decklists, archetypes, interactions and tournament analysis.
- [PokéCa Hack](https://pokecahack.com/feed/) — Japanese card lists, rarities, promos, products and tournament information.
- [r/PokemonTCG](https://www.reddit.com/r/PokemonTCG/.rss) — restock, scalping, resealing, pull-rate, grading and error-card discussion; low-weight community context only.

PokeGuardian, SixPrizes, Bulbanews, CGC Cards and alternate PokéBeach feeds were deferred for 404, stale, malformed, blocked or duplicate conditions.

## Movies — 7 candidates

- [Blu-ray.com New Releases](https://www.blu-ray.com/rss/newreleasesfeed.xml) — high-frequency Blu-ray/4K release and edition timing.
- [Media Play News](https://www.mediaplaynews.com/feed/) — physical-media, distribution and home-entertainment trade news.
- [Severin Films](https://severinfilms.com/blogs/news.atom) — boutique restoration, box sets and limited editions.
- [Bad Film Restoration](https://badfilmrestoration.com/feed/) — restoration quality and boutique-label commentary.
- [Library of Congress — Now See Hear!](https://blogs.loc.gov/now-see-hear/feed/) — audiovisual preservation and collection context.
- [Museum of the Moving Image](https://movingimage.org/feed/) — film history, exhibitions and moving-image collections.
- [American Film Institute](https://www.afi.com/feed/) — film canon, preservation, festivals and cultural significance.

Propstore, Heritage, The Digital Bits, Criterion, Mondo and Vinegar Syndrome were deferred because they returned HTML, blocked responses or empty feeds.

## Autographs — 4 candidates

- [John Reznikoff — News & History](https://johnreznikoff.com/feed/) — rare-autograph, manuscript, book and photograph auction context.
- [Bonhams Press Releases](https://www.bonhams.com/press_release/rss/) — international auction, provenance and rare-book context.
- [Antiques And The Arts Weekly](https://www.antiquesandthearts.com/feed/) — auction reporting, estimates, demand and historical-document sales context.
- [Rare Book Buyer](https://www.rarebookbuyer.com/feed/) — signed books, manuscripts, libraries, appraisals and provenance; moderate confidence because of dealer perspective.

University Archives, Alexander Historical Auctions, RR Auction, Raab Collection, Seth Kaller, National Archives, Ephemera Society, PBA Galleries and Auction Daily were deferred for blocks, stale feeds, HTML or zero entries. Nate D. Sanders and Collectors Weekly were already registered.

## Disney Pins — 4 candidates

- [Laughing Place Disney Pins](https://www.laughingplace.com/w/tag/disney-pins/feed/) — pin drops, limited releases and trading-rule changes.
- [Daps Magic Pin Trading](https://www.dapsmagic.com/tag/pin-trading/feed/) — park rules, events and pin-release context.
- [Chip and Company Disney Pins](https://chipandco.com/tag/disney-pins/feed/) — park/store merchandise, collections and collector news.
- [The Walt Disney Company](https://thewaltdisneycompany.com/feed/) — broad official Disney Experiences, licensing and consumer-products context; strict relevance filtering required.

Disney Food Blog, BlogMickey, KennythePirate, MiceChat, Attractions Magazine, PinPics and Pin Trading DB were deferred for blocked, stale or missing feeds.

## Music — 6 candidates

- [Third Man Records Vault News](https://thirdmanrecords.com/blogs/vault-news.atom) — limited editions, archival releases and subscription packages.
- [The Vinyl Press](https://thevinylpress.com/feed/) — premium pressings, reissues and mastering.
- [The Vinyl District](https://feeds.feedburner.com/TheVinylDistrict) — vinyl culture, record stores and collector context.
- [Library of Congress Music Division](https://blogs.loc.gov/music/feed/) — archival, preservation and artist-legacy context.
- [Blue Note Records](https://www.bluenote.com/feed/) — official jazz reissues, catalog projects and anniversaries.
- [uDiscover Music](https://www.udiscovermusic.com/feed/) — catalog campaigns, box sets and anniversary editions; filter for physical/legacy topics.

Discogs, RR Auction, Julien’s, Heritage, Omega, Record Store Day, The Vinyl Factory and Turntable Lab were deferred for blocks, 404s, empty feeds or stale content.

## Stamps — 6 candidates

- [The Collectors Club](https://www.collectorsclub.org/feed/) — research, exhibits, expertizing and collector events.
- [Grosvenor Philatelic Auctions](https://www.grosvenorauctions.com/feed/) — catalog launches, auctions and prices-realized context.
- [Classic Latin America](https://classiclatinamerica.com/feed/) — Latin American philately, auctions, forgeries and market commentary.
- [Commonwealth Stamps Opinion](http://commonwealthstampsopinion.blogspot.com/feeds/posts/default?alt=rss) — Commonwealth issue dates, formats and postal administrations.
- [Europa Stamps](https://europa-stamps.blogspot.com/feeds/posts/default?alt=rss) — Europa/CEPT, Norden and SEPAC issue intelligence.
- [MB’s Stamps of India](https://mbstamps.blogspot.com/feeds/posts/default?alt=rss) — India Post issues, covers, cancellations and exhibitions.

The Philatelic Foundation, Kelleher, Paul Fraser, Smithsonian, The Postal Museum and Cherrystone were deferred for stale, blocked or 404 responses. USPS and RPSL were already registered.

## Coins — 4 candidates

- [CoinWeek Auction News](https://coinweek.com/auction-news/feed/) — U.S., world and ancient coin auction commentary.
- [CoinsWeekly](https://new.coinsweekly.com/feed/) — international, ancient and European numismatic coverage.
- [COINage Magazine](https://www.coinagemag.com/feed/) — grading premiums, collections, auctions and collector developments.
- [Anti-Counterfeiting Educational Foundation](https://acefonline.org/feed/) — counterfeit coins/bars, buyer education and enforcement context.

Coin World, Heritage, Stack’s Bowers, U.S. Mint, PCGS, NGC, ANACS and E-Sylum were deferred for 404, blocked, stale or unverified feed responses. CoinTalk was already registered.

## Implementation controls

1. Deduplicate by normalized URL and publisher/source key. Do not add an alternate endpoint for an already-covered source without reviewing the scope difference.
2. Store category, source type, audit date, confidence, access notes and `context_only=true` with every source.
3. Use primary-source feeds for release/event discovery. Use specialist and community feeds as corroborating context only.
4. Keep auction previews, estimates and prices-realized articles separate from completed-sale evidence.
5. Apply topic filters to broad feeds such as The Walt Disney Company and uDiscover Music. Apply aggressive noise controls to Reddit.
6. Add retry/backoff for Topps Ripped, Go GTS and The PokeGym, which may challenge generic clients even though their feed content was verified through the source-opening workflow.
7. Monitor HTTP status, redirects, parser health, freshness, item count and duplicate-item rate. Quarantine stale, empty, blocked, HTML or non-feed responses.

## Post-insertion runtime verification

All 63 approved candidates were inserted into the sandbox registry, bringing the registry to 220 unique feeds before the later Collectors Universe additions. A bounded runtime sweep using the application-style User-Agent found 52 healthy feeds on the first pass. A targeted retry recovered The Comics Journal, AntiqueToys.com, PokéCa Hack, Daps Magic Pin Trading, and Grosvenor Philatelic Auctions, bringing the confirmed healthy count to 57/63. Six remain access-qualified but currently unavailable from this sandbox runtime: Topps Ripped returned HTTP 403 HTML; Library of Congress — Now See Hear! returned HTTP 403 HTML; Library of Congress Music Division returned HTTP 403 HTML; Brickset timed out twice; Chip and Company Disney Pins timed out twice; and The Walt Disney Company timed out twice. They remain registered because Rich asked to add all vetted candidates, but the analyzer will surface their individual feed errors rather than treating them as evidence. No HTML challenge response is parsed as RSS. The current registry is 222 feeds after adding the two missing Collectors Universe category feeds.
