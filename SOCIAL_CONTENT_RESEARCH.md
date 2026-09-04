# Social Content Manager research

Date: 2026-09-04

## Official capability findings

Meta’s current Instagram Platform documentation says content publishing is available for Instagram professional accounts, including business and creator accounts. Publishing can cover single images, videos, Reels, and carousels, with the appropriate login configuration, permissions, access level, and account connection. Meta states that media used for publishing must be hosted on a publicly accessible server at the time of the attempt, and its documentation describes a 100 API-published-posts-per-24-hour moving limit for Instagram accounts. Advanced Access and App Review are required when serving accounts outside the app’s own roles or managed business.

X’s current Posts API documentation describes `POST /2/tweets` for creating posts. It supports text and media, with up to four photos, one animated GIF, or one video per post. OAuth scopes include write access, and X documents plan-dependent limits and media constraints. We should not assume that an X connector is free or that every account tier supports every media operation.

LinkedIn’s current Posts API documentation supports organic and sponsored posts containing text, images, videos, documents, articles, multi-image content, polls, and celebrations, while organic carousel support is not available in the cited documentation. Organization publishing requires organization-social permissions and an appropriate organization role. LinkedIn also requires a version header and notes a deprecation/migration window for an older Marketing API version, so the implementation must pin a current API version and plan for upgrades.

## Product implication

The first release should be an approval-first content workspace that stores drafts, media references, target platforms, proposed publish time, status, author, and audit history. Direct publishing should be a second phase after official platform apps, OAuth, scopes, account ownership, media-hosting, and rate-limit behavior are verified. The admin should never silently publish to an external platform; each publish action should show the target account, exact copy, attached media, and explicit confirmation.

## Privacy and security guardrails

Store provider access tokens only in secure server-side secrets or encrypted integration storage, never in client code, logs, database text fields, or URLs. Public-facing Tradebilia member data should not be copied into social drafts without an explicit privacy review. Media should be served from durable project storage using short-lived access where appropriate, and external post IDs should be treated as private operational metadata rather than exposed in public UI.

## Sources

- [1] Meta, Instagram Platform Content Publishing, updated June 30, 2026: https://developers.facebook.com/documentation/instagram-platform/content-publishing
- [2] Meta, Instagram Platform Overview, updated June 30, 2026: https://developers.facebook.com/documentation/instagram-platform/overview
- [3] X Developers, Create Posts: https://docs.x.com/x-api/posts/create-post
- [4] LinkedIn, Posts API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-08

## References

[1] Meta, Instagram Platform Content Publishing — https://developers.facebook.com/documentation/instagram-platform/content-publishing

[2] Meta, Instagram Platform Overview — https://developers.facebook.com/documentation/instagram-platform/overview

[3] X Developers, Create Posts — https://docs.x.com/x-api/posts/create-post

[4] LinkedIn, Posts API — https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-08

## Note

This is a planning record. No external account was connected, no post was created, and no secret was requested or displayed.

## YouTube extension

The official YouTube Data API documentation describes OAuth-authorized video uploads through `videos.insert`, including title, description, tags, category, privacy status, and scheduled publish metadata. It requires a Google API project with the YouTube Data API enabled and OAuth 2.0 credentials. The current reference documents a 256GB maximum upload size, video MIME types, and quota controls; it also warns that uploads from unverified API projects created after July 28, 2020 are restricted to private viewing until the API project passes an audit. Because this feature is planning-only, the Social Content Manager will expose YouTube as a target platform and will not request YouTube credentials or perform uploads.

- [5] Google for Developers, YouTube Data API Upload a Video: https://developers.google.com/youtube/v3/guides/uploading_a_video
- [6] Google for Developers, YouTube Data API Videos: insert: https://developers.google.com/youtube/v3/docs/videos/insert
- [7] Google for Developers, YouTube Data API Overview: https://developers.google.com/youtube/v3/getting-started
