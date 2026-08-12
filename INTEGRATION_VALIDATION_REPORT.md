# Live Integration Validation Report

## Scope and safeguards

At the user’s direction, `TRADEBILIA_STAGING_MODE` is set to `0`. Live provider behavior is therefore enabled. Validation used the least invasive provider request available, except for one authorized Resend test email and one authorized Twilio Verify SMS. No secret, access token, recipient address, phone number, response body, or provider identifier is recorded in this report.

## Results

| Provider | Result | Validation method | Required follow-up |
|---|---|---|---|
| PCGS | **Validated** | Read-only authenticated coin-detail request | None identified. |
| PSA | **Authorization failed** | Read-only authenticated certification request returned HTTP 403 | Review token entitlement or rotate the PSA token. |
| OpenAI application key | **Authorization failed** | Authenticated model-list request returned HTTP 401 | Replace or correct the application OpenAI key. |
| OpenAI legacy key | **Authorization failed** | Authenticated model-list request returned HTTP 401 | Replace or remove the legacy key after confirming the intended key name. |
| Resend | **Validated for sending** | One authorized test email was accepted; the domains endpoint remained restricted as expected for a send-only key | Confirm inbox delivery if required. |
| Facebook | **Validated to authorization start** | App metadata request succeeded; OAuth authorization redirected to Facebook sign-in | Complete user consent later if an account connection is needed. |
| LinkedIn | **Validated to authorization start** | Generated authorization request redirected to LinkedIn sign-in | Complete user consent later if an account connection is needed. |
| eBay | **Validated to authorization start** | Client-credentials request succeeded; app OAuth redirected to eBay sign-in | Complete user consent later if an account connection is needed. |
| PayPal | **Validated** | Production client-credentials token request succeeded | None identified. |
| Daily | **Validated** | Authenticated rooms metadata request succeeded | None identified. |
| ParseBot | **Validated** | Authenticated task-list request succeeded | None identified. |
| Twilio Verify | **Validated** | Service metadata request succeeded and one authorized SMS was accepted | Confirm device delivery if required. |
| Sold Comps | **Validated** | Authenticated minimal scrape request succeeded | Normalize the environment variable name if application code needs a different spelling. |
| GoCollect | **Not fully validated** | Official material confirms token-gated API access but does not expose a generic account-independent validation endpoint | Obtain an account-specific documented endpoint from GoCollect, then run a read-only check. |
| Whatnot | **Not applicable** | No configured Whatnot API credential or implemented API connection was found | Configure an API integration only if needed. |

## OAuth callbacks

The following live callback URLs are configured and were covered by focused tests:

| Provider | Callback route |
|---|---|
| Facebook | `https://tradebilia.manus.space/api/facebook/callback` |
| LinkedIn | `https://tradebilia.manus.space/api/linkedin/callback` |

The browser validation can start provider authorization, but a provider sign-in page is not rendered inside the Tradebilia WebDev preview because third-party login providers prevent framing. A completed account connection requires the user to sign in and consent from a separate provider-controlled browser context.

## Application validation

After the live-mode changes, TypeScript validation passed and the full automated suite passed: **23 test files and 106 tests**.

## Reference

[1]: https://gocollect.com/data-sharing "GoCollect Data Sharing"
