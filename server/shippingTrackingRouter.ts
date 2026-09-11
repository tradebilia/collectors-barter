import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { lookupDhlTracking } from "./dhlTracking";
import { lookupFedexTracking } from "./fedexTracking";
import { lookupUpsTracking } from "./upsTracking";

const carrierSchema = z.enum(["UPS", "FedEx", "DHL"]);

export const shippingTrackingRouter = router({
  lookup: protectedProcedure
    .input(z.object({
      carrier: carrierSchema,
      trackingNumber: z.string().trim().min(7).max(40),
    }))
    .mutation(async ({ input }) => {
      switch (input.carrier) {
        case "UPS":
          return lookupUpsTracking(input.trackingNumber);
        case "FedEx":
          return lookupFedexTracking(input.trackingNumber);
        case "DHL":
          return lookupDhlTracking(input.trackingNumber);
      }
    }),
});
