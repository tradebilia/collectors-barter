# USPS Tracking Integration Notes

The USPS Developer Portal Getting Started guide confirms that an app created through the Customer Onboarding Portal provides a Consumer Key and Consumer Secret. Tracking is included in the default API product. USPS OAuth uses a client-credentials token request with `client_id`, `client_secret`, and `grant_type=client_credentials`, then uses the returned access token as a Bearer token. [1] [2]

For the new Test AI section, use the current Tracking v3r2 endpoint: `POST https://apis.usps.com/tracking/v3r2/tracking` with an array containing the user-entered `trackingNumber`. The endpoint requires OAuth and returns current status, status summary, delivery expectation, and tracking events. Only this read-only endpoint will be called; notification and proof-of-delivery endpoints are explicitly out of scope. [3]

## Sources

[1] [USPS Getting Started](https://developers.usps.com/getting-started)

[2] [USPS OAuth 2.0](https://developers.usps.com/Oauth)

[3] [USPS Tracking v3r2](https://developers.usps.com/trackingv3r2)
