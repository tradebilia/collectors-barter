import { writeFileSync } from 'node:fs';
import { CATEGORY_ITEM_TYPES } from '../client/src/lib/fieldDefinitionsRemaining';

type QueryMap = {
  activeEbay: string;
  soldComps: string;
  otherSources: string;
  conditionalRules: string;
  excludedFields: string;
  notes: string;
};

const queryMaps: Record<string, QueryMap> = {
  sports_cards: {
    activeEbay: 'Year; Manufacturer; Player; Card Number; Certification Company; Grade; Condition (not for Unopened Product)',
    soldComps: 'Year; Manufacturer; Player; Card Number; Certification Company; Grade; Condition (not for Unopened Product)',
    otherSources: '130Point: user-facing title query; certification sources: certificate/company when available',
    conditionalRules: 'Unopened Product: Sport + Product Format; Authentication Company only when Authenticated = Yes; FASC only when From A Sealed Case = Yes',
    excludedFields: 'Unopened Product excludes Product Name and Condition; FASC is omitted when sealed-case value is No',
    notes: 'Unopened Product also omits invalid Grade 0 values. Detailed sports-card queries have safe broader fallbacks.',
  },
  comics: {
    activeEbay: 'Comic Title; Issue Number; Certification Company; Grade; Condition',
    soldComps: 'Comic Title; Issue Number; Certification Company; Grade; Condition',
    otherSources: 'GoCollect/Comic Book Realm/Heritage: placeholder or source-specific availability',
    conditionalRules: 'Certification Company and Grade are used when present; Condition is used for ungraded items',
    excludedFields: 'No dedicated active/sold query branch for every comic subtype beyond the common comic identity fields',
    notes: 'The item title remains a fallback when structured fields are missing.',
  },
  coins: {
    activeEbay: 'Generic listing title; Certification Company; Grade',
    soldComps: 'Generic listing title; Certification Company; Grade',
    otherSources: 'PCGS CoinFacts; NGC placeholder; Numista catalog candidate',
    conditionalRules: 'Certification Company and Grade are included when present',
    excludedFields: 'No dedicated coin-specific marketplace query branch currently replaces the generic title query',
    notes: 'Use catalog/certificate sources for identity; marketplace query remains title-led.',
  },
  stamps: {
    activeEbay: 'Generic listing title; Certification Company; Grade',
    soldComps: 'Year; Scott Number (US#); Certification Company; Grade; Condition',
    otherSources: 'Wikidata/Smithsonian reference metadata; catalog sources are not valuation evidence',
    conditionalRules: 'Scott Number and year improve completed-sale searches when stored; Grade/Condition depend on item state',
    excludedFields: 'No dedicated active-listing stamp query branch currently uses Scott Number',
    notes: 'Sold-Comps has a dedicated stamp branch; active eBay currently falls back to generic logic.',
  },
  video_games: {
    activeEbay: 'Year; Game Title; Platform; Certification Company; Grade; Condition',
    soldComps: 'Year; Game Title; Platform; Certification Company; Grade; Condition',
    otherSources: 'IGDB; RAWG; PriceCharting placeholder/direct API candidate',
    conditionalRules: 'Year is included only when valid; Grade/Condition depend on grading state',
    excludedFields: 'Catalog metadata is not automatically used as a price filter',
    notes: 'Game Title falls back to the listing title when structured title is missing.',
  },
  movies: {
    activeEbay: 'Listing Title; Format; Certification Company; Grade; Condition',
    soldComps: 'Listing Title; Format; Certification Company; Grade; Condition',
    otherSources: 'Reference catalog sources may support identity but are not currently valuation sources',
    conditionalRules: 'Format is included when stored; Grade/Condition depend on grading state',
    excludedFields: 'No title/format normalization beyond the current movie branch',
    notes: 'Box set and individual movie types share the current movie query branch.',
  },
  music: {
    activeEbay: 'Generic listing title; Certification Company; Grade',
    soldComps: 'Generic listing title; Certification Company; Grade',
    otherSources: 'Discogs: Album / Release Title; Artist / Performer; optional Release Year with year-first search and broad fallback',
    conditionalRules: 'Discogs requires Album/Release Title; Artist is sent separately; Release Year narrows first and falls back without year',
    excludedFields: 'Discogs intentionally does not use catalog number, label, country, or format as restrictive filters',
    notes: 'Display/listing title is only a fallback when Album/Release Title is unavailable.',
  },
  autographs: {
    activeEbay: 'Signer; Signed Item Type; Authentication Company; Certification Company; Grade',
    soldComps: 'Signer; Signed Item Type; Authentication Company; Certification Company; Grade',
    otherSources: 'Parse.bot/third-party sources are placeholders unless authorized',
    conditionalRules: 'Authentication Company is included when stored; certification fields depend on item state',
    excludedFields: 'No dedicated autograph transaction-history source is currently active',
    notes: 'Signer is the primary identity field for structured autograph searches.',
  },
  vintage_toys: {
    activeEbay: 'Generic listing title; Certification Company; Grade',
    soldComps: 'Year; Toy Name; Brand/Franchise; Certification Company; Grade; Condition',
    otherSources: 'hobbyDB; PriceCharting; GoCollect/Heritage placeholders',
    conditionalRules: 'Year, brand/franchise, and grade/condition are used when present',
    excludedFields: 'No dedicated active-listing vintage-toy branch currently uses toy-specific fields',
    notes: 'LEGO fields are currently cataloged in the form registry but are not a dedicated marketplace query branch.',
  },
  disney_pins: {
    activeEbay: 'Generic listing title; Certification Company; Grade',
    soldComps: 'Disney Pins marker; Character; Pin Name',
    otherSources: 'Reference/catalog sources are placeholders',
    conditionalRules: 'Character and Pin Name are used for completed-sale searches when present',
    excludedFields: 'No dedicated active-listing Disney Pins branch currently uses character/pin fields',
    notes: 'Sold-Comps has a dedicated Disney Pins branch.',
  },
  pokemon: {
    activeEbay: 'Year; Edition/Era; Card Name; Card Number; Certification Company; Grade; Condition',
    soldComps: 'Year; Edition/Era; Card Name; Card Number; Certification Company; Grade; Condition',
    otherSources: 'TCGdex Pokemon Catalog; PriceCharting/TCGplayer are not currently active valuation feeds',
    conditionalRules: 'Certification Company and Grade are included when present; Condition applies to ungraded items',
    excludedFields: 'No dedicated price-history source is currently active beyond configured marketplace routes',
    notes: 'Structured Pokemon identity fields are preferred over the listing title.',
  },
};

function getQueryMap(category: string, itemType: string, fieldNames: string[]): QueryMap {
  const base = queryMaps[category];
  if (category !== 'sports_cards') return base;

  const sportFilter = 'Sport post-filter: exclude explicit conflicting sports; retain sparse titles without a stated sport';
  if (itemType === 'single_card') {
    return {
      activeEbay: `Year; Manufacturer; Player; Card Number; Certification Company; Grade when valid; ${sportFilter}`,
      soldComps: `Year; Manufacturer; Player; Card Number; Certification Company; Grade when valid; ${sportFilter}`,
      otherSources: base.otherSources,
      conditionalRules: 'Sport is used for post-retrieval conflict filtering; certification company and grade are included when supplied; listing title is the final fallback.',
      excludedFields: 'Condition is not sent as a query token; set/parallel/autograph details are not currently provider-specific query filters.',
      notes: 'Uses detailed, no-card-number, broader identity, and listing-title fallback queries.',
    };
  }
  if (itemType === 'card_set') {
    return {
      activeEbay: `Year; Manufacturer; Certification Company; Grade when valid; ${sportFilter}`,
      soldComps: `Year; Manufacturer; Certification Company; Grade when valid; ${sportFilter}`,
      otherSources: base.otherSources,
      conditionalRules: 'Sport is used for post-retrieval conflict filtering; certification company and grade are included when supplied.',
      excludedFields: 'Player, card number, condition, set type, missing-card details, and card count are not dedicated provider query tokens.',
      notes: 'Structured player/card-number criteria are empty for this item type; listing title remains a fallback.',
    };
  }
  if (itemType === 'unopened_product') {
    return {
      activeEbay: 'Year; Manufacturer; Sport; Product Format; Authentication Company only when Authenticated = Yes; FASC only when From a Sealed Case = Yes; valid certification/grade values',
      soldComps: 'Year; Manufacturer; Sport; Product Format; Authentication Company only when Authenticated = Yes; FASC only when From a Sealed Case = Yes; valid certification/grade values',
      otherSources: base.otherSources,
      conditionalRules: 'Sport and Product Format are used when supplied; Authentication Company is conditional on Authenticated = Yes; exact FASC token is conditional on From a Sealed Case = Yes.',
      excludedFields: 'Product Name and Condition are intentionally omitted; invalid Grade 0 values are omitted; Sport also receives post-retrieval conflict filtering.',
      notes: 'The current revised unopened-product contract does not use Product Name or Condition as query tokens.',
    };
  }
  return {
    activeEbay: `Year; Manufacturer when supplied; listing-title fallback; ${sportFilter}`,
    soldComps: `Year; Manufacturer when supplied; listing-title fallback; ${sportFilter}`,
    otherSources: base.otherSources,
    conditionalRules: 'Sport is used for post-retrieval conflict filtering; only scalar structured values available to the shared builder are included.',
    excludedFields: 'Approximate card count, years included, manufacturers included, notable players/cards, and graded-card count are not dedicated provider query tokens.',
    notes: `Collection-lot fields are not expanded into provider-specific search tokens for item type ${itemType}.`,
  };
}

const rows = Object.entries(CATEGORY_ITEM_TYPES).flatMap(([category, itemTypes]) =>
  Object.entries(itemTypes).map(([itemType, fields]) => ({
    category,
    itemType,
    fields: fields.map((field) => ({
      name: field.name,
      label: field.label,
      inputType: field.inputType,
      requirement: field.requirement,
      conditionalLogic: field.conditionalLogic ?? '',
      options: field.dropdownOptions?.join(' | ') ?? '',
      supportsOther: field.supportsOther ? 'Yes' : 'No',
    })),
    query: getQueryMap(category, itemType, fields.map((field) => field.name)),
  })),
);

writeFileSync('/home/ubuntu/tradebilia-isolated-development/scripts/test_ai_query_audit.json', JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2));
console.log(`Exported ${rows.length} category/item-type mappings.`);
