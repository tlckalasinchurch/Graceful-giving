/**
 * End-to-end withdrawal-signing workflow against a real Postgres database.
 *
 * Skipped unless DATABASE_URL is set. To run it:
 *   DATABASE_URL=postgresql://user@host:port/db pnpm exec vitest run \
 *     server/withdrawals.workflow.test.ts
 *
 * Every row it writes belongs to a throwaway tenant generated for this file
 * (see server/test/tenant.ts), and the whole tenant is dropped afterwards, so
 * a run cannot reach the application's data.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import type { TrpcContext } from "./_core/context";
import { sql } from "drizzle-orm";
import { TEST_CHURCH_ID, purgeTenant } from "./test/tenant";

type User = NonNullable<TrpcContext["user"]>;

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

// Safety net: drop the whole tenant once the file is done.
afterAll(async () => {
  if (!hasDb) return;
  const db = await getDb();
  if (db) await purgeTenant(db);
});

function createContext(user: User | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

const base: User = {
  id: 0,
  openId: "x",
  email: null,
  name: null,
  loginMethod: null,
  role: "user",
  churchRole: "MEMBER",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

/** The signer the bank requires on every cheque (the pastor). */
const pastor: User = {
  ...base,
  id: 951,
  openId: "w9-pastor",
  churchRole: "PASTOR",
};
const treasurer: User = {
  ...base,
  id: 952,
  openId: "w9-treasurer",
  churchRole: "TREASURER",
};
const assistant: User = {
  ...base,
  id: 953,
  openId: "w9-assistant",
  churchRole: "MEMBER",
};
/** A member with no financial role, used as the requester. */
const requester: User = { ...base, id: 955, openId: "w9-requester" };

const asPastor = () => appRouter.createCaller(createContext(pastor));
const asTreasurer = () => appRouter.createCaller(createContext(treasurer));
const asAssistant = () => appRouter.createCaller(createContext(assistant));
const asRequester = () => appRouter.createCaller(createContext(requester));

let requestIdCounter = 0;

async function seedSigners() {
  const db = await getDb();
  if (!db) throw new Error("unreachable");
  for (const [id, required] of [
    [pastor.id, true],
    [treasurer.id, false],
    [assistant.id, false],
  ] as const) {
    await db.execute(
      sql`INSERT INTO bank_signers ("churchId", "userId", "isRequired", "addedBy")
          VALUES (${TEST_CHURCH_ID}, ${id}, ${required}, ${id})
          ON CONFLICT ("churchId", "userId") DO NOTHING`
    );
  }
}

async function newRequest(requestedBy: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("unreachable");
  requestIdCounter += 1;
  const rows = await db.execute(
    sql`INSERT INTO withdrawal_requests ("churchId", amount, purpose, "requestedBy", "requestDate", status)
        VALUES (${TEST_CHURCH_ID}, '500.00', ${"ค่าทดสอบ " + requestIdCounter}, ${requestedBy}, now(), 'pending')
        RETURNING id`
  );
  return (rows as unknown as Array<{ id: number }>)[0].id;
}

async function requestStatus(id: number) {
  const db = await getDb();
  if (!db) throw new Error("unreachable");
  const rows = await db.execute(
    sql`SELECT status, "rejectionReason", "approvedBy" FROM withdrawal_requests WHERE id = ${id}`
  );
  return (
    rows as unknown as Array<{
      status: string;
      rejectionReason: string | null;
      approvedBy: number | null;
    }>
  )[0];
}

async function approvalRows(id: number) {
  const db = await getDb();
  if (!db) throw new Error("unreachable");
  const rows = await db.execute(
    sql`SELECT "userId", decision FROM withdrawal_approvals WHERE "requestId" = ${id}`
  );
  return rows as unknown as Array<{ userId: number; decision: string }>;
}

describeDb("withdrawal signing workflow against a real database", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db)
      throw new Error("DATABASE_URL set but the database is unreachable");
    await seedSigners();
  });

  it("approves once the pastor and one more have signed", async () => {
    const id = await newRequest(requester.id);

    await expect(
      asPastor().withdrawals.sign({ id, decision: "approved" })
    ).resolves.toMatchObject({ outcome: "pending" });

    await expect(
      asTreasurer().withdrawals.sign({ id, decision: "approved" })
    ).resolves.toMatchObject({ outcome: "approved" });
    await expect(await requestStatus(id)).toMatchObject({ status: "approved" });

    // Meeting the rule closes the request; the third signer cannot sign later.
    await expect(
      asAssistant().withdrawals.sign({ id, decision: "approved" })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await approvalRows(id)).toHaveLength(2);
  });

  it("lets the requester's own signature count but still needs another", async () => {
    const id = await newRequest(pastor.id);

    await expect(
      asPastor().withdrawals.sign({ id, decision: "approved" })
    ).resolves.toMatchObject({ outcome: "pending" });

    await expect(
      asAssistant().withdrawals.sign({ id, decision: "approved" })
    ).resolves.toMatchObject({ outcome: "approved" });
    await expect(await requestStatus(id)).toMatchObject({ status: "approved" });
  });

  it("rejects the request on the first refusal and stores the reason", async () => {
    const id = await newRequest(requester.id);

    await expect(
      asPastor().withdrawals.sign({ id, decision: "approved" })
    ).resolves.toMatchObject({ outcome: "pending" });

    await expect(
      asTreasurer().withdrawals.sign({
        id,
        decision: "rejected",
        note: "งบไม่พอเดือนนี้",
      })
    ).resolves.toMatchObject({ outcome: "rejected" });
    await expect(await requestStatus(id)).toMatchObject({
      status: "rejected",
      rejectionReason: "งบไม่พอเดือนนี้",
    });
  });

  it("refuses a second signature from the same person", async () => {
    const id = await newRequest(requester.id);

    await expect(
      asPastor().withdrawals.sign({ id, decision: "approved" })
    ).resolves.toMatchObject({ outcome: "pending" });

    await expect(
      asPastor().withdrawals.sign({ id, decision: "approved" })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await approvalRows(id)).toHaveLength(1);
  });

  it("records both signatures when two signers press at once", async () => {
    // Review focus 1: both signature rows must persist, and the request must
    // flip to approved exactly once — never "lost" or "double".
    const id = await newRequest(requester.id);

    const results = await Promise.allSettled([
      asPastor().withdrawals.sign({ id, decision: "approved" }),
      asTreasurer().withdrawals.sign({ id, decision: "approved" }),
    ]);
    for (const r of results) {
      expect(r.status).toBe("fulfilled");
    }

    expect(await approvalRows(id)).toHaveLength(2);
    await expect(await requestStatus(id)).toMatchObject({ status: "approved" });
  });

  it("cancels before payout and refuses after", async () => {
    const id = await newRequest(requester.id);

    await expect(
      asRequester().withdrawals.cancel({
        id,
        reason: "เลื่อนกิจกรรมไปสัปดาห์หน้า",
      })
    ).resolves.toMatchObject({ success: true });
    await expect(await requestStatus(id)).toMatchObject({
      status: "cancelled",
    });
    // Cancelling a request that is already settled ends in CONFLICT.
    await expect(
      asRequester().withdrawals.cancel({ id, reason: "ยกเลิกซ้ำ" })
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const paid = await newRequest(requester.id);
    await asPastor().withdrawals.sign({ id: paid, decision: "approved" });
    await asTreasurer().withdrawals.sign({ id: paid, decision: "approved" });
    await asTreasurer().withdrawals.disburse({ id: paid });
    await expect(
      asRequester().withdrawals.cancel({ id: paid, reason: "เปลี่ยนไปจ่ายโอน" })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(await requestStatus(paid)).toMatchObject({
      status: "disbursed",
    });
  });

  it("puts the payout into this Sunday's open round", async () => {
    const db = await getDb();
    if (!db) throw new Error("unreachable");
    const created = await asTreasurer().counting.create({
      serviceDate: new Date("2026-09-20T01:00:00.000Z"),
      serviceRound: 1,
    });
    const id = await newRequest(requester.id);
    await asPastor().withdrawals.sign({ id, decision: "approved" });
    await asTreasurer().withdrawals.sign({ id, decision: "approved" });

    const res = await asTreasurer().withdrawals.disburse({ id });
    await expect(res).resolves.toMatchObject({ sessionId: created.id });

    const rows = await db.execute(
      sql`SELECT type, "withdrawalRequestId", "sessionId" FROM bank_records WHERE "withdrawalRequestId" = ${id}`
    );
    expect(rows as unknown as unknown[]).toHaveLength(1);
    const [row] = rows as unknown as Array<{
      type: string;
      withdrawalRequestId: number;
      sessionId: number;
    }>;
    expect(row.type).toBe("withdrawal");
    expect(row.sessionId).toBe(created.id);
  });

  it("waits for the next round when none is open, then attaches once", async () => {
    // Review Focus 3: no counting round exists yet at payout time; the line
    // lands in the first round created afterwards, exactly once.
    const db = await getDb();
    if (!db) throw new Error("unreachable");
    const id = await newRequest(requester.id);
    await asPastor().withdrawals.sign({ id, decision: "approved" });
    await asTreasurer().withdrawals.sign({ id, decision: "approved" });

    const beforeRows = await db.execute(
      sql`SELECT id FROM bank_records WHERE "withdrawalRequestId" = ${id}`
    );
    expect(beforeRows as unknown as unknown[]).toHaveLength(0);

    const first = await asTreasurer().counting.create({
      serviceDate: new Date("2026-09-27T01:00:00.000Z"),
      serviceRound: 1,
    });

    const afterRows = await db.execute(
      sql`SELECT "sessionId" FROM bank_records WHERE "withdrawalRequestId" = ${id}`
    );
    expect(afterRows as unknown as unknown[]).toHaveLength(1);
    expect(
      (afterRows as unknown as Array<{ sessionId: number }>)[0].sessionId
    ).toBe((first as { id: number }).id);

    // A later round must not attach the same request a second time.
    await asTreasurer().counting.create({
      serviceDate: new Date("2026-10-04T01:00:00.000Z"),
      serviceRound: 1,
    });
    const finalRows = await db.execute(
      sql`SELECT id FROM bank_records WHERE "withdrawalRequestId" = ${id}`
    );
    expect(finalRows as unknown as unknown[]).toHaveLength(1);
  });

  it("skips a round that is already posted", async () => {
    // Review Focus 5: the disbursed amount can never crawl into a posted
    // round; it lands in the first round that is still open.
    const db = await getDb();
    if (!db) throw new Error("unreachable");
    const posted = await asTreasurer().counting.create({
      serviceDate: new Date("2026-09-20T01:00:00.000Z"),
      serviceRound: 1,
    });
    // Posting via the router needs a full reconciliation; the status is all
    // this test's rule needs, so set a posted round directly.
    await db.execute(
      sql`UPDATE counting_sessions SET status = 'posted', "postedBy" = ${treasurer.id}, "postedAt" = now() WHERE id = ${posted.id}`
    );

    const open = await asTreasurer().counting.create({
      serviceDate: new Date("2026-09-27T01:00:00.000Z"),
      serviceRound: 1,
    });

    const id = await newRequest(requester.id);
    await asPastor().withdrawals.sign({ id, decision: "approved" });
    await asTreasurer().withdrawals.sign({ id, decision: "approved" });
    const res = await asTreasurer().withdrawals.disburse({ id });
    await expect(res).resolves.toMatchObject({ sessionId: open.id });
  });
});
