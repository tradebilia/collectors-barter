import { describe, expect, it } from "vitest";
import { getShipmentReminderKind, isShipmentReminderEmailEnabled, shipmentReminderMarker } from "./shipmentReminder";

describe("shipment reminder policy", () => {
  const now = new Date("2026-08-01T12:00:00.000Z");
  it("sends one due-soon reminder inside the 48-hour window and marks overdue reminders by run date", () => {
    const dueSoon = new Date("2026-08-03T11:00:00.000Z");
    const overdue = new Date("2026-08-01T11:59:00.000Z");
    expect(getShipmentReminderKind(dueSoon, now)).toBe("due-soon");
    expect(shipmentReminderMarker("due-soon", dueSoon, now)).toBe("due-soon-2026-08-03");
    expect(getShipmentReminderKind(overdue, now)).toBe("overdue");
    expect(shipmentReminderMarker("overdue", overdue, now)).toBe("overdue-2026-08-01");
  });
  it("honors an explicit opt-out while preserving the default enabled behavior", () => {
    expect(isShipmentReminderEmailEnabled(undefined)).toBe(true);
    expect(isShipmentReminderEmailEnabled('{"itemsShipped":{"email":false}}')).toBe(false);
  });
});
