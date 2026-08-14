# Public Release Verification

## What occurred

The Coming Soon updates were saved in a checkpoint immediately, but the public domain briefly continued to serve the preceding application bundle during the asynchronous deployment rollout. The standard public route does not instruct browsers to cache its HTML: the verified response uses `Cache-Control: no-cache, no-store, must-revalidate`.

The observed stale page was therefore a deployment-propagation interval rather than a page-level browser-cache setting. After the deployment completion notification, the normal route `https://tradebilia.manus.space/coming-soon` served the current layout without a query parameter.

## Required verification before announcing a release

1. Save the checkpoint, which starts the project’s automatic publication.
2. Wait for the deployment-success notification rather than treating checkpoint creation alone as public availability.
3. Open the standard production URL without `?build=`, `?refresh=`, or any other cache-busting query.
4. Confirm the requested visible page content and the expected current bundle are present at that standard URL.
5. Only then tell the user that the change is live.

This procedure avoids presenting a deployment-in-progress state as a completed public release.
