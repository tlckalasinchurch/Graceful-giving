/**
 * A job left "processing" by a dead function returns to the queue; one out of
 * attempts fails together with its slip. Skipped unless DATABASE_URL is set.
 */
import { afterAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { DEFAULT_CHURCH_ID, getDb } from "../db";
import { lineProcessingJobs, lineSlips } from "../../drizzle/schema";
import { reclaimStuckJobs } from "./processWorker";
import { purgeTenant } from "../test/tenant";

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("reclaimStuckJobs", () => {
  afterAll(async () => {
    if (process.env.DATABASE_URL) await purgeTenant();
  });

  async function seed(attempts: number, minutesAgo: number) {
    const db = (await getDb())!;
    const [slip] = await db
      .insert(lineSlips)
      .values({
        churchId: DEFAULT_CHURCH_ID,
        lineUserId: "Ustuck",
        lineEventId: `evt-${attempts}-${minutesAgo}-${Math.random()}`,
        slipImageKey: "k",
        slipHash: `h-${Math.random()}`,
        status: "pending",
      })
      .returning({ id: lineSlips.id });
    const [job] = await db
      .insert(lineProcessingJobs)
      .values({
        slipId: slip.id,
        churchId: DEFAULT_CHURCH_ID,
        status: "processing",
        attempts,
        lastAttemptAt: sql`now() - (interval '1 minute' * ${minutesAgo})`,
      })
      .returning({ id: lineProcessingJobs.id });
    return { db, slipId: slip.id, jobId: job.id };
  }

  it("requeues an old processing job and leaves a fresh one", async () => {
    const old = await seed(1, 30);
    const fresh = await seed(1, 1);
    await reclaimStuckJobs();
    const status = async (id: number) =>
      (
        await old.db
          .select()
          .from(lineProcessingJobs)
          .where(eq(lineProcessingJobs.id, id))
      )[0].status;
    expect(await status(old.jobId)).toBe("queued");
    expect(await status(fresh.jobId)).toBe("processing");
  });

  it("fails a job out of attempts and its pending slip", async () => {
    const dead = await seed(3, 30);
    await reclaimStuckJobs();
    const [job] = await dead.db
      .select()
      .from(lineProcessingJobs)
      .where(eq(lineProcessingJobs.id, dead.jobId));
    const [slip] = await dead.db
      .select()
      .from(lineSlips)
      .where(eq(lineSlips.id, dead.slipId));
    expect(job.status).toBe("failed");
    expect(slip.status).toBe("failed");
  });
});
