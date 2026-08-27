import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const capture = fs.readFileSync(path.join(root, "client/src/pages/TradeRoomGuideCapture.tsx"), "utf8");
const app = fs.readFileSync(path.join(root, "client/src/App.tsx"), "utf8");

describe("development-only Trade Room guide capture", () => {
  it("uses the actual Trade Room stage vocabulary and a non-persisted fictional capture route", () => {
    expect(app).toContain('path="/how-it-works/trade-room-capture/:stage"');
    expect(capture).toContain("Development-only guide example");
    expect(capture).toContain("No record was created or changed");
    expect(capture).toContain("Review");
    expect(capture).toContain("Confirm");
    expect(capture).toContain("Complete");
  });

  it("renders visibly distinct review, confirmation, and completion capture states", () => {
    expect(capture).toContain('selectedStage === "propose" ? <ProposeCapture />');
    expect(capture).toContain('selectedStage === "negotiate" ? <NegotiateCapture />');
    expect(capture).toContain('selectedStage === "review" ? <ReviewCapture />');
    expect(capture).toContain('selectedStage === "shipping" ? <ShippingCapture />');
    expect(capture).toContain('selectedStage === "confirm" ? <ConfirmationCapture /> : <CompletionCapture />');
    expect(capture).toContain("New trade proposal");
    expect(capture).toContain("Negotiation workspace");
    expect(capture).toContain("Shipping stage");
    expect(capture).toContain("Proposal review workspace");
    expect(capture).toContain("Trade Accepted");
    expect(capture).toContain("Items being traded");
    expect(capture).toContain("Trade Complete");
    expect(capture).toContain("Completed exchange summary");
  });

  it("contains only explicitly fictional collector identities and existing fictional listing titles", () => {
    expect(capture).toContain("Avery Cole");
    expect(capture).toContain("Morgan Reed");
    expect(capture).toContain("1986 Fleer Michael Jordan #57");
    expect(capture).toContain("1984 Topps USA Baseball Mark McGwire");
    expect(capture).toContain("no contact or address information");
    expect(capture).toContain("No record was created or changed");
  });

  it("does not call tRPC or include mutations, preserving capture-only behavior", () => {
    expect(capture).not.toContain("trpc.");
    expect(capture).not.toContain("useMutation");
    expect(capture).not.toContain("fetch(");
  });
});
