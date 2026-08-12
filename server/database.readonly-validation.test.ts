import { createConnection } from "mysql2/promise";
import { afterAll, describe, expect, it } from "vitest";

const expectedCounts = {
  users: 3,
  userProfiles: 4,
  listings: 15,
  listingPhotos: 25,
  itemInquiries: 1,
  tradeProposals: 1,
} as const;

let connection: Awaited<ReturnType<typeof createConnection>> | undefined;

afterAll(async () => {
  await connection?.end();
});

describe("shared database read-only validation", () => {
  it("connects with the secure URL and confirms the approved baseline counts", async () => {
    const databaseUrl = process.env.CUSTOM_DATABASE_URL;
    expect(databaseUrl).toBeTruthy();

    connection = await createConnection(databaseUrl!);

    const entries = await Promise.all(
      Object.keys(expectedCounts).map(async tableName => {
        const [rows] = await connection!.query<Array<{ count: number }>>(
          `SELECT COUNT(*) AS count FROM \`${tableName}\``
        );
        return [tableName, Number(rows[0]?.count ?? 0)] as const;
      })
    );

    expect(Object.fromEntries(entries)).toEqual(expectedCounts);
  });
});
