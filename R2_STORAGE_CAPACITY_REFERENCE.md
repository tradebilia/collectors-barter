# Cloudflare R2 Storage Capacity Reference

Tradebilia's administrator Media Storage report uses Cloudflare R2 for its public-media and static-artwork buckets. As of 2026-08-27, Cloudflare documents **unlimited data storage per R2 bucket**; this is a capacity characteristic rather than a plan ceiling.

For Standard storage, Cloudflare documents a monthly free allowance of **10 GB-month**. This is a billing allowance based on storage use over the billing month, not a hard 10 GB storage cap. R2 bucket and account metrics are available through Cloudflare Dashboard analytics and the GraphQL Analytics API; the dashboard remains the authoritative account-wide view, including activity outside the two Tradebilia buckets.

The Tradebilia report provides a read-only aggregate of the two Tradebilia buckets and labels a total as a lower bound whenever the 10,000-object safety scan limit is reached. It does not return object keys, credentials, or private-evidence URLs.

## Official sources

1. [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/) — Standard-storage pricing and 10 GB-month monthly free allowance.
2. [Cloudflare R2 Metrics and Analytics](https://developers.cloudflare.com/r2/platform/metrics-analytics/) — dashboard and GraphQL storage metrics.
3. [Cloudflare R2 Limits](https://developers.cloudflare.com/r2/platform/limits/) — unlimited data storage and object count per bucket.
