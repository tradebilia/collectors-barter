export type TrackingTimelineEvent = {
  type: string;
  timestamp: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
};

export function normalizeTrackingTimeline(events: TrackingTimelineEvent[]): TrackingTimelineEvent[] {
  return events
    .filter((event) => event.type || event.timestamp || event.city || event.state || event.country)
    .map((event) => ({
      type: event.type || "Carrier update",
      timestamp: event.timestamp || null,
      city: event.city || null,
      state: event.state || null,
      country: event.country || null,
    }))
    .sort((left, right) => {
      if (!left.timestamp && !right.timestamp) return 0;
      if (!left.timestamp) return 1;
      if (!right.timestamp) return -1;
      const leftTime = Date.parse(left.timestamp);
      const rightTime = Date.parse(right.timestamp);
      if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return 0;
      return leftTime - rightTime;
    });
}

export function formatTrackingEventLocation(event: TrackingTimelineEvent): string {
  return [event.city, event.state, event.country].filter(Boolean).join(", ") || "Location not provided";
}
