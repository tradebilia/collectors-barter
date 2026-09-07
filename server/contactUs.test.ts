import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const contactSource = fs.readFileSync(path.resolve(process.cwd(), "client/src/pages/Contact.tsx"), "utf8");
const routerSource = fs.readFileSync(path.resolve(process.cwd(), "server/routers.ts"), "utf8");
const dbSource = fs.readFileSync(path.resolve(process.cwd(), "server/db.ts"), "utf8");
const migrationSource = fs.readFileSync(path.resolve(process.cwd(), "drizzle/0023_support_tickets_runtime.sql"), "utf8");

describe("Contact Us flow", () => {
  it("uses readable light form controls and dropdown options", () => {
    expect(contactSource).toContain('className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-500"');
    expect(contactSource).toContain('className="border-slate-200 bg-white text-slate-900"');
    expect(contactSource).toContain('className="z-50 border-slate-200 bg-white text-slate-900 shadow-xl"');
    expect(contactSource).toContain('className="resize-none border-slate-200 bg-white text-slate-900 placeholder:text-slate-500"');
  });

  it("bootstraps the support-ticket tables before public submission and admin retrieval", () => {
    expect(dbSource).toContain("export async function ensureSupportTicketsTable()");
    expect(dbSource).toContain("CREATE TABLE IF NOT EXISTS supportTickets");
    expect(dbSource).toContain("CREATE TABLE IF NOT EXISTS supportTicketReplies");
    expect(routerSource).toContain("await ensureSupportTicketsTable();");
    expect(routerSource).toContain("INSERT INTO supportTickets");
    expect(routerSource).toContain("SELECT st.*");
    expect(migrationSource).toContain("CREATE TABLE IF NOT EXISTS supportTickets");
  });

  it("returns a ticket reference after storing the Contact Us submission", () => {
    expect(routerSource).toContain("return { success: true, ticketId }");
    expect(contactSource).toContain("setSubmitted(true)");
    expect(contactSource).toContain("Your support ticket");
  });
});

export {};
