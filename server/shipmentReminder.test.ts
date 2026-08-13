import { describe, expect, it } from "vitest";
import { getShipmentReminderKind, isShipmentReminderEmailEnabled, shipmentReminderMarker } from "./shipmentReminder";

describe("shipment reminder policy", () => {
  const now = new Date("2026-08-01T12:00:00.000Z");
  it("uses a single due-soon marker and daily overdue marker", () => {
    const dueSoon = new Date("2026-08-03T11:00:00.000Z");
    expect(getShipmentReminderKind(dueSoon, now)).toBe("due-soon");
    expect(shipmentReminderMarker("due-soon", dueSoon, now)).toBe("due-soon-2026-08-03");
    expect(getShipmentReminderKind(new Date("2026-08-01T11:59:00.000Z"), now)).toBe("overdue");
  });
  it("defaults to enabled but honors an explicit email opt-out", () => {
    expect(isShipmentReminderEmailEnabled(undefined)).toBe(true);
    expect(isShipmentReminderEmailEnabled('{"itemsShipped":{"email":false}}')).toBe(false);
  });
});
