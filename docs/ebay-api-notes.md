# eBay API Notes — Identity API Response

## Critical Finding

The Commerce Identity API (`GET /user/`) does NOT return `feedbackScore` or `positiveFeedbackPercent`.

The actual response fields are:
- accountType
- businessAccount (or individualAccount)
- registrationMarketplaceId
- status
- userId
- username

Feedback data is NOT part of the Identity API response.

## Where to get feedback data

Feedback score and percentage must come from the **Trading API** (XML):
- `GetUser` call returns `FeedbackScore` and `PositiveFeedbackPercent`
- `GetFeedback` call returns individual feedback entries

Both require the Trading API XML format with `X-EBAY-API-CALL-NAME` headers.
