# Diagnosis: Item Detail Pages Slow / Timing Out

Date: 2026-07-05

## Symptom
- Homepage loads fine; item detail pages (/listings/:id) take a very long time or time out.

## Findings (measured in browser on /listings/630004)
- Total tRPC requests on a single page load: **61**
- Breakdown: 1x `auth.me,market.listingDetail` (batched, fast), **60x `favorites.trackView,favorites.trackView`** (each request itself a batch of 2 mutations = ~120 mutations total)
- Slowest trackView requests took 5.4s each; server was saturated processing ~120 DB writes for a single page view
- The flood stops eventually (React eventually stabilizes), but during the storm the page and server stall, causing slow loads/timeouts, especially with multiple users
- market.listingDetail itself responds in ~0.42s via curl — the API is NOT the bottleneck

## Root Cause
`client/src/pages/ItemDetail.tsx` lines 3-10:

```tsx
function useTrackView(listingId: number) {
  const trackViewMutation = trpc.favorites.trackView.useMutation();
  useEffect(() => {
    if (listingId > 0) {
      trackViewMutation.mutate({ listingId });
    }
  }, [listingId, trackViewMutation]);
}
```

- `trackViewMutation` (the object returned by `useMutation()`) is NOT referentially stable across renders.
- Including it in the `useEffect` dependency array causes: mutate -> state change -> re-render -> new mutation object -> effect re-runs -> mutate again... i.e., a self-sustaining render/request loop.
- Each mutate triggers a DB UPDATE (trackListingView), flooding the TiDB connection and starving the listingDetail query -> slow page loads/timeouts.

## Fix
Track the last-tracked listingId in a ref and only fire the mutation once per listingId; remove the unstable mutation object from the dependency array.
