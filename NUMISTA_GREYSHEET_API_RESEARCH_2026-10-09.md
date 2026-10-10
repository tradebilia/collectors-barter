# Numista / Greysheet API Research — 2026-10-09

## Question
Whether the Numista API provides the Greysheet certified-grade price data visible on some Numista website pages, specifically values such as PCGS MS65.

## Official evidence gathered

### 1. Numista API documentation
- URL: https://en.numista.com/api/doc/index.php
- The official documentation identifies the current price endpoint as `GET /types/{type_id}/issues/{issue_id}/prices`.
- It describes the endpoint as price estimates for an issue by grade.
- Response is a currency plus a `prices` array. Each price has only `grade` and `price` fields.
- The documented sample grades are circulation categories (`f`, `vf`, `xf`). The schema does not expose a price-source field, a Greysheet/CPG indicator, grading-company field, slab designation, PCGS/NGC certification number, or an API switch for MS/PR certified-grade values.
- The API docs also expose a separately billed `/types/{type_id}/sales_records` endpoint. Numista pricing terms state sales-record requests cost EUR 0.010 each on the paid plan.

### 2. Live Numista API behavior for the current integration
- A bounded read-only call for the Morgan Dollar type and 1886 issue returned the documented issue-price response with seven price rows:
  `g`, `vg`, `f`, `vf`, `xf`, `au`, and `unc`.
- It did not return `MS63`, `MS65`, `PR`, a grading-company attribution, or a source field that identifies Greysheet.
- Therefore the current Numista API response cannot substantiate an exact PCGS MS65 guide value for that item.

### 3. Public Numista Morgan Dollar page
- URL: https://en.numista.com/1492
- The public type page shows values in a G/VG/F/VF/XF/AU/UNC matrix.
- Its own disclaimer says those table values are expressed in the selected currency and are based on evaluations by Numista users and Internet sales; they are indications only.
- The page also contains a “Right Now on Greysheet” area, but those entries are current marketplace listings, not a certified-grade price-guide API response.

### 4. Numista terms and pricing
- URLs:
  - https://en.numista.com/api/pricing.php
  - https://en.numista.com/api/license.php
- Numista permits API-powered applications to display licensed data with Numista attribution, but does not let clients redistribute it as a data feed or bulk database.
- Catalogue metadata may be cached up to seven days. Other catalogue data may not be persistently stored or cached unless separately permitted.

### 5. Official Greysheet API
- URLs:
  - https://www.greysheet.com/cms/1049/cdn-public-api-v2-usage-guide
  - https://www.greysheet.com/publications/api-pricing
  - https://www.greysheet.com/cms/1053/api-terms-of-use-and-license-agreement
- Greysheet’s own CDN Public API explicitly provides grading-aware pricing records. Its documented `CdnPricingItemDto` includes `Grade` (numeric), `GradeLabel` (examples include MS65 and PR70), `CpgVal`, `GreyVal`, `PcgsVal`, `NgcVal`, and `BlueBookVal`.
- Advanced API access is required for comprehensive pricing sources, including `GreyVal`, `PcgsVal`, and `NgcVal`; it also requires an eligible Dealer+ or Pro subscription. API usage is separately billed.
- Greysheet’s API terms allow front-facing display of CPG retail values with attribution and a hyperlink to CDN. Greysheet wholesale values (including `GreyVal`) are back-end/internal only unless CDN gives prior written permission. Caching is capped at 24 hours and not past the data refresh time/end of business day.

## Interim conclusion
The official Numista API price endpoint is working as documented, but its response is not a documented source for Greysheet’s detailed certified MS/PR values. It supplies Numista issue-level estimates in its returned grade set. The appropriate programmatic source for certified-grade Greysheet/CPG data is Greysheet’s own CDN Public API, subject to subscription, API credentials, usage fees, attribution/display restrictions, and access-tier constraints.
