# Parse.bot CGC Comics API reference

Source: [Parse.bot CGC Comics API](https://parse.bot/marketplace/9845a698-e428-4748-aca3-d57d2a49b30a)
Official verification page: [CGC Comics verification](https://www.cgccomics.com/verify/)

## Verified capability

Parse.bot lists a dedicated CGC Comics API separate from its CGC trading-card API. The listed operations are certification lookup, comic search, population lookup, and publisher/title/issue browsing.

A certification lookup can provide the CGC certificate number, title, issue number, issue date/year, publisher, variant, grade, page quality, grade date, label category, art comments, key comments, master ID, collectible type, and additional certificate detail fields.

Population data can provide grade counts across the grading scale and separate counts for relevant label categories such as Universal, Signature Series, Qualified, Conserved, Restored, and total graded copies. Population counts are supporting scarcity context only; they are not a valuation.

The service may be rate-limited, and newly graded items may not be searchable until shipped. It is a managed wrapper over publicly accessible source data, not an official CGC API.

## Tradebilia sandbox scope

The Test AI sandbox currently has a CGC placeholder source. This change should add a conditional CGC Comics source that runs only when:

1. The selected item category is Comics.
2. The grading company is CGC.
3. A certification number is present.

The source should remain sandbox-only. It must not change the production Trade Room analyzer, database schema, migrations, scheduled jobs, production domains, or stored listing data.

## Proposed response contract

`getCgcComicsData({ certNumber: string })` should return a status, safe user-facing message, and normalized data containing certificate identity, issue metadata, grade, page quality, label category, comments, master ID, collectible type, certificate details, and optional population data.

Use only the existing server-side Parse.bot secret. Never print, store, or expose credentials. Handle missing credentials, invalid certificates, upstream errors, and rate limits with safe messages.

## Test requirements

Add regression tests for normalized field mapping, missing-certificate behavior, non-comic/non-CGC gating, and safe provider errors. Verify the native Test AI sandbox with a real CGC Comics test certificate if one is available; otherwise verify that the source remains disabled and does not issue an upstream request without a certificate.

## Related source

The separate CGC Cards API is listed at [Parse.bot CGC Cards API](https://parse.bot/marketplace/427f6417-2b2c-4de0-b0c8-9fd81dccae45/cgccards-com-api). It should not be used for CGC Comics.

No private credentials or user data are included in this memo.

## End
