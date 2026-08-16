export type ShipmentReminderKind = "due-soon" | "overdue";
export function getShipmentReminderKind(deadline: Date, now: Date): ShipmentReminderKind | null {
  const remainingMs = deadline.getTime() - now.getTime();
  if (remainingMs <= 0) return "overdue";
  return remainingMs <= 48 * 60 * 60 * 1000 ? "due-soon" : null;
}
export function shipmentReminderMarker(kind: ShipmentReminderKind, deadline: Date, now: Date): string {
  return kind === "overdue" ? `overdue-${now.toISOString().slice(0, 10)}` : `due-soon-${deadline.toISOString().slice(0, 10)}`;
}
export function isShipmentReminderEmailEnabled(preferences: string | null | undefined): boolean {
  try { return JSON.parse(preferences || "{}")?.itemsShipped?.email !== false; } catch { return true; }
}
