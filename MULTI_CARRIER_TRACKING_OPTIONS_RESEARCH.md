# Multi-Carrier Tracking Options: Broad Investigation

**Prepared for:** Tradebilia
**Purpose:** Identify a legitimate free or low-volume API option for USPS, UPS, FedEx, and DHL package tracking without scraping carrier websites.
**Status:** Research complete; no provider selected or integrated from this review.

## Executive conclusion

There is **no verified, permanently free, general-purpose API** that Tradebilia can use to retrieve arbitrary tracking information across USPS, UPS, FedEx, and DHL at production scale. The strongest no-cost candidate is **17TRACK**, but its current allowance is finite and its own USPS policy confirms that it cannot remove the sender-MID authorization problem for arbitrary USPS tracking numbers.

> A free SDK, GitHub repository, or self-hosted application does not create carrier-data rights. It either requires direct carrier credentials or delegates the data-access problem to a paid provider.

For Tradebilia, the practical interim approach is to retain the existing direct **UPS** and **FedEx** integrations, keep **DHL** ready for credentials, leave USPS API tracking pending USPS authorization, and consider 17TRACK only as a limited pilot for non-USPS carriers.

## Results by candidate

| Candidate | Verified free allowance | API status | USPS implication | Assessment |
|---|---:|---|---|---|
| **17TRACK** | Official API guide says new accounts receive a **one-time 200-number allocation** after the recurring 100/month allocation ended on January 7, 2026. Its support page still says 100 monthly quotas, so dashboard confirmation is required. | Public API with an account security key. | 17TRACK says USPS queries must be linked to an authorized MID from April 1, 2026; arbitrary/off-chain queries may be restricted. | **Best low-volume pilot for UPS/FedEx/DHL; not a USPS authorization workaround.** |
| **TrackingMore** | Free plan is listed with **0 credits**; tracking API is a paid/trial feature. | API is available on paid plans. | No verified free USPS API allowance. | **Not a free API solution.** |
| **Tracktry** | 50 free credits/month for dashboard tracking. | API and webhooks are listed on paid Basic and higher plans. | No free API entitlement. | **Not a free API solution.** |
| **CWILL Post-Purchase** (formerly ParcelPanel) | 20 credits/month for its hosted order-tracking product. | Developer API and webhooks are listed on paid Professional plans. | No free general API. | **Useful no-code product, not a free API.** |
| **Ship24** | A limited free/development offer is advertised, but official materials make the production API and USPS coverage plan-dependent. | Account/API key required. | No verified free USPS production path. | **Not suitable without written plan confirmation.** |
| **AfterShip** | No permanent free Tracking API found. | API/webhooks are on paid tracking tiers. | Paid offering. | **Not a free solution.** |
| **WhereParcel** | Three-month promotional offer only if a promotional post is made; otherwise seven-day trial. | API keys provided after trial signup. | Claims support, but legal/terms page was not accessible at expected URL and carrier-count claims conflict. | **Do not select without due diligence.** |
| **Karrio / self-hosted GitHub tools** | Software is open source. | Requires individual carrier accounts and credentials. | Does not grant USPS third-party data rights. | **Useful infrastructure only when direct carrier access already exists.** |

## What GitHub and Reddit add

GitHub repositories such as [Karrio](https://github.com/karrioapi/karrio) are legitimate orchestration tools. They can normalize direct carrier integrations, but they do not supply carrier credentials, authorization, or tracking data on their own.

Reddit threads are useful for discovering provider names and practical experiences, but they frequently repeat stale quotas or promotional offers. For example, community posts still mention 17TRACK’s old recurring 100-number allowance, while its current API guide says new accounts receive a one-time 200-number allocation. Provider terms and API documentation should therefore control any implementation decision.

## USPS-specific conclusion

USPS’s April 2026 access controls are the limiting factor, not Tradebilia’s request format or OAuth credentials. Both the current USPS API and 17TRACK’s own USPS notice distinguish between authorized shipments tied to a sender’s Mailer ID and arbitrary third-party tracking requests.

| Requirement | Result for Tradebilia’s current use case |
|---|---|
| Valid USPS tracking number | Available, but insufficient for an API response. |
| USPS OAuth client credentials | Already validated successfully. |
| Third-party sender MID authorization | Not available for the tested received package. |
| Public USPS website lookup | Available to the user directly. |
| Scraping USPS public pages | Not used; USPS terms prohibit data scraping and bypassing site protections. |

## Recommended decision path

Tradebilia should keep direct carrier integrations for UPS and FedEx, add DHL after its credentials are available, and wait for the USPS authorization outcome. If a no-cost pilot is desired, create a 17TRACK developer account and test a small number of **UPS, FedEx, and DHL** numbers first. Do not present it as a solution for unrestricted USPS queries until a real USPS number succeeds through the provider under its current policy.

No carrier site should be scraped. The legal and operational risk is higher than the value of replacing a low-volume API provider or an official tracking link.

## References

[1] [17TRACK API documentation](https://api.17track.net/en/doc)
[2] [17TRACK USPS tracking policy](https://www.17track.net/en/uspsTracking)
[3] [17TRACK plan details](https://help.17track.net/hc/en-us/articles/37575217580825-Plan-Details)
[4] [TrackingMore pricing](https://www.trackingmore.com/pricing)
[5] [Tracktry pricing](https://www.tracktry.com/pricing)
[6] [CWILL Post-Purchase pricing](https://www.parcelpanel.com/pricing/)
[7] [AfterShip Tracking pricing](https://www.aftership.com/pricing/tracking)
[8] [WhereParcel](https://whereparcel.com/)
[9] [Karrio on GitHub](https://github.com/karrioapi/karrio)
[10] [USPS API access controls](https://www.usps.com/business/api-access.htm)
[11] [USPS terms of use](https://about.usps.com/termsofuse.htm)
