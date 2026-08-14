# UPS Tracking Integration Notes

UPS’s official Client Credentials flow issues a Bearer token for server-owned integrations. The read-only Test AI lookup uses that token with the Track API endpoint `GET /api/track/v1/details/{inquiryNumber}` and supplies the required `transId` and `transactionSrc` headers. The request disables signature and proof-of-delivery return data so the application does not receive those sensitive artifacts. [1] [2]

The UPS Client ID and Client Secret are used only on the server and are never returned to the browser. The current Test AI flow does not use the authorization-code callback to perform a tracking lookup; it uses client credentials. The production callback route remains reserved for a future UPS account-authorization experience.

## Official CIE Test Validation

UPS’s Getting Started guide states that Customer Integration Environment (CIE) endpoints are available for basic API validation when supplied with a valid Client ID, Client Secret, and OAuth token. The current Track API documentation lists `https://wwwcie.ups.com/api/track/v1/details/{inquiryNumber}` as the CIE tracking endpoint and specifies that `transId` and `transactionSrc` headers are required. [3] [4]

UPS Track Alert documentation publishes two repeatedly usable CIE test tracking numbers: `1ZCIETST0111111114` and `1ZCIETST0422222228`. The Track Alert API itself creates subscriptions and webhooks, so this integration will not call it; the published numbers can be used only for a controlled, read-only Track API contract check. [5]

## Sources

[1] [UPS Track API](https://developer.ups.com/tag/Tracking)

[2] [UPS OAuth Client Credentials API](https://developer.ups.com/tag/OAuth-Client-Credentials?loc=en_US)

[3] [UPS Getting Started](https://developer.ups.com/get-started)

[4] [UPS Track API](https://developer.ups.com/tag/Tracking)

[5] [UPS Track Alert FAQ](https://developer.ups.com/tag/UPS-Track-Alert?loc=en_US)
