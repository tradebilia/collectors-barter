import { describe, expect, it, vi } from "vitest";
import { resolveTradebiliaDatabaseTarget } from "../databaseTarget";
import { attestTradebiliaDatabase } from "./databaseAttestation";

const target = resolveTradebiliaDatabaseTarget({
  NEW_TIDB_DATABASE_URL: "mysql://new:password@new.example.test:4000/test?sslMode=VERIFY_IDENTITY",
  TRADEBILIA_DATABASE_TARGET: "new",
});

function executor(databaseName: string) {
  return {
    execute: vi.fn(async (query: any) => {
      const statement = String(query?.queryChunks?.map((chunk: any) => chunk?.value ?? chunk).join("") ?? "");
      return statement.toLowerCase().includes("database")
        ? [[{ databaseName }], []]
        : [[], []];
    }),
  };
}

describe("Tradebilia database attestation", () => {
  it("accepts the independently approved new database and logs no URL material", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const result = await attestTradebiliaDatabase(executor("test"), target);

    expect(result).toMatchObject({ target: "new", databaseName: "test" });
    const output = log.mock.calls.flat().join(" ");
    expect(output).toContain("Attestation");
    expect(output).not.toContain("new.example.test");
    expect(output).not.toContain("password");
    log.mockRestore();
  });

  it("rejects a reachable connection to a database other than the reviewed new target", async () => {
    await expect(attestTradebiliaDatabase(executor("another_database"), target, { log: false }))
      .rejects.toThrow("expected test but connected to another_database");
  });

  it("fails if the driver cannot complete the read-only health probe", async () => {
    await expect(attestTradebiliaDatabase({
      execute: vi.fn(async () => {
        throw Object.assign(new Error("connect ECONNREFUSED user=private"), { code: "ECONNREFUSED" });
      }),
    }, target, { log: false })).rejects.toThrow("connect ECONNREFUSED");
  });
});
