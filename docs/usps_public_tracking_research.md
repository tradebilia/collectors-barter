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

## Sources

- https://tools.usps.com/tracking/tracking_home.cfm
- https://www.usps.com/business/api-access.htm
- https://github.com/iiPythonx/usps
- https://developers.usps.com/terms-and-conditions
- https://www.usps.com/business/api-access.htm
