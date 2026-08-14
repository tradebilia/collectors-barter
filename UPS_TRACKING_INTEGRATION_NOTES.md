# UPS Tracking Integration Notes

UPS’s official Client Credentials flow issues a Bearer token for server-owned integrations. The read-only Test AI lookup uses that token with the Track API endpoint `GET /api/track/v1/details/{inquiryNumber}` and supplies the required `transId` and `transactionSrc` headers. The request disables signature and proof-of-delivery return data so the application does not receive those sensitive artifacts. [1] [2]

The UPS Client ID and Client Secret are used only on the server and are never returned to the browser. The current Test AI flow does not use the authorization-code callback to perform a tracking lookup; it uses client credentials. The production callback route remains reserved for a future UPS account-authorization experience.

## Sources

[1] [UPS Track API](https://developer.ups.com/tag/Tracking)

[2] [UPS OAuth Client Credentials API](https://developer.ups.com/tag/OAuth-Client-Credentials?loc=en_US)
