import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readProjectFile = (name: string) =>
  readFileSync(join(process.cwd(), name), "utf-8");

describe("handoff documentation safeguards", () => {
  const guide = readProjectFile("SESSION_HANDOFF_GUIDE.md");
  const quickStart = readProjectFile("NEXT_SESSION_QUICK_START.md");
  const assets = readProjectFile("IMAGE_ASSET_INVENTORY.md");
  const audit = readProjectFile("HANDOFF_ADVERSARIAL_AUDIT.md");
  const migration = readProjectFile("NEW_WEBDEV_MIGRATION_READINESS_REPORT.md");
  const evidence = readProjectFile("MIGRATION_PREREQUISITE_EVIDENCE.md");
  const isolation = readProjectFile("STAGING_INTEGRATION_ISOLATION_MATRIX.md");
  const currentProjectHandoff = readProjectFile("CURRENT_PROJECT_HANDOFF.md");

  it("preserves the external database warning and explicit approval gate", () => {
    expect(guide).toContain("CUSTOM_DATABASE_URL");
    expect(guide).toContain("external MySQL/TiDB-compatible database");
    expect(guide).toContain("Rich explicitly confirms");
  });

  it("records that a fresh task cannot attach to the active WebDev project", () => {
    expect(guide).toContain("fresh Project task cannot be documented as attaching");
    expect(quickStart).toContain("Critical platform limitation");
    expect(audit).toContain("cannot be documented as attaching");
    expect(migration).toContain("not a normal session handoff");
  });

  it("requires approved migration gates before replacement-project creation", () => {
    expect(quickStart).toContain("Do not create the replacement project yet");
    expect(migration).toContain("No-go rule");
    expect(migration).toContain("media strategy");
    expect(migration).toContain("rollback");
  });

  it("requires an exact writable staging snapshot before independent-project testing", () => {
    expect(quickStart).toContain("complete writable staging snapshot");
    expect(quickStart).toContain("isolated writable staging database clone");
    expect(quickStart).toContain("replicated static/customer media");
    expect(migration).toContain("complete working snapshot of the current site");
    expect(migration).toContain("isolated staging database clone");
    expect(migration).toContain("every target object");
    expect(migration).toContain("production delta");
    expect(migration).not.toContain("later, only with explicit approval, perform the customer-media cutover");
  });

  it("keeps secrets out of the migration package", () => {
    expect(guide).toContain("token-bearing remote URL");
    expect(quickStart).toContain("Never copy, attach, print, or commit raw secrets");
    expect(migration).toContain("never place raw values");
  });

  it("forbids using platform-generated local metadata as a handoff or secret source", () => {
    expect(guide).toContain(".project-config.json");
    expect(guide).toContain("Do not open, copy, attach, print, or commit it");
    expect(quickStart).toContain(".project-config.json");
    expect(quickStart).toContain("Do not open, copy, attach, print, or commit it");
  });

  it("requires the adversarial evidence ledger and migration report", () => {
    expect(guide).toContain("HANDOFF_ADVERSARIAL_AUDIT.md");
    expect(guide).toContain("NEW_WEBDEV_MIGRATION_READINESS_REPORT.md");
    expect(quickStart).toContain("HANDOFF_ADVERSARIAL_AUDIT.md");
    expect(quickStart).toContain("NEW_WEBDEV_MIGRATION_READINESS_REPORT.md");
    expect(assets).toContain("HANDOFF_ADVERSARIAL_AUDIT.md");
    expect(assets).toContain("NEW_WEBDEV_MIGRATION_READINESS_REPORT.md");
    expect(audit).toContain("Historical Current-Project Evidence");
  });

  it("documents all currently essential integration credential names without raw values", () => {
    for (const name of [
      "SOLD_COMPS_API_KEY",
      "PARSE_BOT_API_KEY",
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_VERIFY_SERVICE_SID",
      "EBAY_PROD_CLIENT_ID",
      "EBAY_PROD_CLIENT_SECRET",
      "TRADEBILIA_OPENAI_API_KEY",
    ]) {
      expect(guide).toContain(name);
    }
  });

  it("documents the verified static recovery release and controlled media migration rule", () => {
    expect(assets).toContain("tradebilia-static-assets-2026-08-11");
    expect(assets).toContain("182292f179319e64610d25c273018df8d3665c225b34870335d0c0651a78528c");
    expect(assets).toContain("Never commit");
    expect(migration).toContain("checksum-backed binary manifest");
    expect(migration).toContain("25 current binary files");
    expect(migration).toContain("4 current avatar binaries");
  });

  it("requires database, scheduler, and two-domain cutover safeguards", () => {
    expect(migration).toContain("schema/migration ledger");
    expect(migration).toContain("three active Heartbeat jobs");
    expect(migration).toContain("tradebilia.manus.space");
    expect(migration).toContain("tradebilia-vauewtpb.manus.space");
  });

  it("records current read-only prerequisite evidence without clearing unresolved media gates", () => {
    expect(evidence).toContain("CUSTOM_DATABASE_URL");
    expect(evidence).toContain("25");
    expect(evidence).toContain("4");
    expect(evidence).toContain("source-unavailable");
    expect(evidence).toContain("Do not create the replacement project");
  });

  it("documents the fail-closed staging safety control and independent-project decisions", () => {
    expect(isolation).toContain("TRADEBILIA_STAGING_MODE");
    expect(isolation).toContain("collectors-barter-staging");
    expect(isolation).toContain("Do not attach `tradebilia.manus.space`");
    expect(isolation).toContain("create Phase B1 staging project");
  });

  it("provides one current-project handoff that pauses migration and names the next bug", () => {
    expect(currentProjectHandoff).toContain("Do **not** create a replacement website");
    expect(currentProjectHandoff).toContain("Separate-project migration | **Paused.**");
    expect(currentProjectHandoff).toContain("clone-only continuation path");
    expect(currentProjectHandoff).toContain("/home/ubuntu/tradebilia-clone");
    expect(currentProjectHandoff).toContain("sendInquiryReply");
    expect(currentProjectHandoff).toContain("sender receives an unread-message alert");
  });
});
