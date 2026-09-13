# USPS Public Tracking Fallback Research

## Official findings

The public USPS Tracking page accepts a tracking number and presents package-tracking results to a browser user. The current USPS API access guidance states that Tracking API access is controlled separately: service providers require authorization for the Mailer ID or tracking number and may incur a fee. The existing project API response confirms that the configured account does not have Tracking API authorization.

## Implementation constraint

The Trade Room must not label a USPS number valid merely because it is formatted plausibly. A replacement path must obtain a clear official public-page result and classify the exact “Tracking Not Available” outcome as invalid. If USPS blocks automated access or presents a challenge, the UI must show an unverified state with an official USPS tracking link rather than falsely reporting the number valid.

## Live public-page observation

The official public result route accepts the pattern `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=<tracking-number>`. With the USPS number used in the reported Trade Room test, the extracted official page showed a delivery result and tracking history. Browser automation simultaneously reported a CAPTCHA, so the implementation must treat bot-blocking or challenge responses as **unverified**, not as either valid or invalid.

An inspected open-source CLI uses the same route, first uses Selenium only to obtain challenge cookies, then fetches and parses the page. Its small maintenance footprint and challenge-cookie dependency make it unsuitable to embed directly as production validation code, but it confirms the public route and the automation constraint.

## Current USPS policy cross-check

The current USPS API Terms prohibit using USPS websites or services for data scraping/data mining and prohibit circumventing technology used to protect USPS content. The terms also restrict use to facilitating USPS shipping or mailing transactions unless a specific license allows otherwise. USPS’s Tracking API Access page distinguishes direct shippers using their own MID (continued no-cost access after applicable terms) from service providers tracking other senders’ MIDs (paid access, agreement, payment setup, and authorization requirements).

## In-site visual-confirmation review — September 13, 2026

USPS exposes a public tracking interface at `https://tools.usps.com/go/TrackC`; search results identify a USPS Track & Confirm iframe-oriented route. The official page is currently protected by CAPTCHA during automated browsing, however. A Tradebilia modal could attempt to present the official cross-origin page to a human user, subject to USPS continuing to allow browser framing, but browser same-origin protections prevent Tradebilia from reading the iframe DOM, extracting page text, or detecting a green visual element.

Color is not a reliable validity signal. USPS publishes explicit textual tracking states, including Delivered, In Transit, Shipping Label Created, and USPS in Possession of Item. A compliant user-assisted flow must require a human acknowledgment of the official result and must not relabel it as carrier-automated validation. The viable design is therefore an official USPS page modal with a new-tab fallback and a distinct sender-attestation state such as “USPS result confirmed by sender,” not “Valid Tracking Number.”

## Test AI capture experiment verification — September 13, 2026

The authenticated live Test AI page currently displays the already-published Carrier Tracking Test and no capture controls, as expected before publishing the new Test AI experiment. The signed-in admin session can reach the Test AI page, exposes the USPS tracking-number field, and therefore provides a valid post-publish verification target.

## Sources

- https://tools.usps.com/tracking/tracking_home.cfm
- https://www.usps.com/business/api-access.htm
- https://github.com/iiPythonx/usps
- https://developers.usps.com/terms-and-conditions
- https://www.usps.com/business/api-access.htm
