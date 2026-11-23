import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lineProcessingJobs, lineSlips } from "../../drizzle/schema";

/**
 * Worker reliability (R-02 / K1 / C1 / C2 / C3).
 *
 * Two layers, kept apart on purpose:
 *
 * - `unit` — the time budget and its errors, with no database at all.
 * - `integration (fake DB)` — `runWorkerBatch` against an in-memory job store
 *   that behaves like the two tables it talks to (claim only while `queued`,
 *   retry only after the backoff delay, one row per job). The drizzle calls
 *   stay real; only the storage behind them is fake. This is NOT a PostgreSQL
 *   concurrency test: it runs on one thread and never takes a real row lock.
 *
 * Where ownership matters, the assertions read the WHERE clause the worker
 * actually built (`sqlText`), because that is the guard the database applies.
 */

vi.mock("../db", async importOriginal => {
  const actual = await importOriginal<typeof import("../db")>();
  return {
    ...actual,
    getDb: vi.fn(),
    getChurchProfile: vi.fn(),
    countRecentSystemRejectedSlips: vi.fn(),
  };
});
vi.mock("../storage", () => ({
  resolveSlipImageUrl: vi.fn(async () => "https://signed.example/slip.jpg"),
  extractInlineSlipDataUrl: vi.fn(() => null),
}));
vi.mock("./slipOcr", async importOriginal => {
  const actual = await importOriginal<typeof import("./slipOcr")>();
  return { ...actual, extractSlipData: vi.fn() };
});
vi.mock("./duplicateDetector", () => ({
  checkDuplicateByReference: vi.fn(async () => ({
    isDuplicate: false,
    duplicateSlipId: null,
    duplicateOfferingId: null,
    reason: null,
  })),
  checkDuplicateByTransaction: vi.fn(async () => ({
    isDuplicate: false,
    duplicateSlipId: null,
    duplicateOfferingId: null,
    reason: null,
  })),
}));
vi.mock("./memberMatcher", () => ({
  matchMember: vi.fn(async () => null),
}));

import * as dbModule from "../db";
import { TransientOcrError, type SlipExtraction } from "./slipOcr";
import { extractSlipData } from "./slipOcr";
import {
  STALE_JOB_LEASE_MS,
  WORKER_OCR_JOB_TIMEOUT_MS,
  WorkerOcrTimeoutError,
  extractWithinJobBudget,
  reclaimStaleJobs,
  runWorkerBatch,
} from "./processWorker";

const MAX_ATTEMPTS = 3;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const extraction = (over: Partial<SlipExtraction> = {}): SlipExtraction => ({
  rawText: '{"amount":500,"referenceNumber":"REF123"}',
  amount: 500,
  amountConfidence: 0.95,
  transferDate: "2026-11-20",
  transferTime: "10:30",
  dateConfidence: 0.95,
  senderName: "สมชาย ใจดี",
  senderConfidence: 0.95,
  referenceNumber: "REF123",
  referenceConfidence: 0.95,
  bankName: "SCB",
  receiverName: "คริสตจักร",
  receiverAccount: null,
  receiverAccountConfidence: 0,
  receiverAccountType: null,
  receiverBank: "KBANK",
  notes: null,
  ...over,
});

const slipRow = (over: Record<string, unknown> = {}) => ({
  id: 42,
  churchId: "demo-church",
  lineUserId: "U123",
  status: "pending",
  slipImageKey: "line/demo/42.jpg",
  aiData: null,
  declaredAmount: null,
  processingAttempts: 0,
  approvedOfferingId: null,
  ...over,
});

/**
 * Reads the SQL a query was built with, so a test can prove which guard the
 * database will apply. Cycle-safe; skips the schema graph hanging off columns.
 */
function sqlText(value: unknown, depth = 0, seen = new Set<unknown>()): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint")
    return String(value);
  if (typeof value !== "object" || depth > 24 || seen.has(value)) return "";
  seen.add(value);
  if (Array.isArray(value))
    return value.map(v => sqlText(v, depth + 1, seen)).join(" ");
  const parts: string[] = [];
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (key === "table" || key === "encoder" || key === "decoder") continue;
    parts.push(sqlText(v, depth + 1, seen));
  }
  return parts.join(" ");
}

/** True when a JavaScript Date was bound into the query (a host clock). */
function bindsDate(value: unknown, depth = 0, seen = new Set<unknown>()): boolean {
  if (value instanceof Date) return true;
  if (!value || typeof value !== "object" || depth > 24 || seen.has(value))
    return false;
  seen.add(value);
  return Object.entries(value as Record<string, unknown>).some(([key, v]) =>
    key === "table" || key === "encoder" ? false : bindsDate(v, depth + 1, seen)
  );
}

type FakeJob = {
  id: number;
  slipId: number;
  status: "queued" | "processing" | "done" | "failed";
  attempts: number;
  lastAttemptAt: Date | null;
  errorMessage: string | null;
};

/**
 * An in-memory stand-in for the two tables the worker writes. The methods are
 * chainable the same way drizzle's are, and the queue query applies the same
 * gates the real SQL does (only `queued`, attempts left, backoff elapsed).
 *
 * `slipWriteLosesRace` / `jobWriteLosesRace` model a guarded UPDATE that
 * matches no row because another run changed it first.
 */
function makeFakeDb(state: {
  jobs: FakeJob[];
  slips: Array<Record<string, any>>;
  failJobStatusUpdate?: boolean;
  slipWriteLosesRace?: boolean;
  jobWriteLosesRace?: boolean;
}) {
  const slipUpdates: Array<Record<string, any>> = [];
  const jobUpdates: Array<Record<string, any>> = [];

  const backoffElapsed = (job: FakeJob) =>
    job.lastAttemptAt === null ||
    Date.now() - job.lastAttemptAt.getTime() >= 60_000;

  const resolve = (q: any) => {
    if (q.kind === "select") {
      if (q.table === lineSlips) return state.slips.map(s => ({ ...s }));
      if (q.table === lineProcessingJobs) {
        // The queue read asks for `attempts`; the stale-job scan does not.
        if (!q.fields || !("attempts" in q.fields)) return [];
        return state.jobs
          .filter(j => j.status === "queued")
          .filter(j => j.attempts <= MAX_ATTEMPTS - 1)
          .filter(backoffElapsed)
          .slice(0, q.limit ?? 10)
          .map(j => ({ id: j.id, slipId: j.slipId, attempts: j.attempts }));
      }
      return [];
    }

    const set = q.set ?? {};
    const where = sqlText(q.whereArg);

    if (q.table === lineProcessingJobs) {
      // A claimed job is the only update that moves queued → processing.
      if (set.status === "processing") {
        const job = state.jobs.find(j => j.status === "queued");
        if (!job) return [];
        job.status = "processing";
        job.attempts += 1;
        job.lastAttemptAt = new Date();
        return q.returning ? [{ id: job.id }] : [];
      }
      // Lease recovery. These tests keep no stale job in the store.
      if (
        typeof set.errorMessage === "string" &&
        set.errorMessage.includes("lease expired")
      ) {
        return [];
      }
      if (state.failJobStatusUpdate) throw new Error("job write failed");
      // Another run closed this job first: the ownership guard matches nothing.
      if (state.jobWriteLosesRace) return [];
      const target =
        state.jobs.find(j => j.status === "processing") ?? state.jobs[0];
      if (!target) return [];
      Object.assign(target, set);
      jobUpdates.push({ ...set, jobId: target.id, where });
      return q.returning ? [{ id: target.id }] : [];
    }

    if (q.table === lineSlips) {
      if (state.slipWriteLosesRace) return [];
      const slip = state.slips[0];
      if (!slip) return [];
      Object.assign(slip, set);
      slipUpdates.push({ ...set, slipId: slip.id, where });
      // The guarded write reports which row it touched.
      return q.returning ? [{ id: slip.id }] : [];
    }

    return [];
  };

  const query = (kind: "select" | "update", opts: any = {}) => {
    const q: any = {
      kind,
      table: opts.table,
      fields: opts.fields,
      set: undefined,
      whereArg: undefined,
      returning: false,
      limit: undefined,
    };
    q.from = (t: unknown) => {
      q.table = t;
      return q;
    };
    q.where = (arg: unknown) => {
      q.whereArg = arg;
      return q;
    };
    q.orderBy = () => q;
    q.limit = (n: number) => {
      q.limit = n;
      return q;
    };
    q.returning = () => {
      q.returning = true;
      return q;
    };
    q.then = (onFulfilled: any, onRejected: any) =>
      Promise.resolve().then(() => resolve(q)).then(onFulfilled, onRejected);
    q.catch = (fn: any) => q.then(undefined, fn);
    return q;
  };

  const db = {
    select: (fields?: unknown) => query("select", { fields }),
    update: (table: unknown) => {
      const q = query("update", { table });
      q.set = (values: unknown) => {
        q.set = values;
        return q;
      };
      return q;
    },
  };

  return { db, slipUpdates, jobUpdates };
}

/** Lets the worker reach the point where its budget timer is armed. */
const flushMicrotasks = async (rounds = 100) => {
  for (let i = 0; i < rounds; i++) await Promise.resolve();
};

const queuedJob = (over: Partial<FakeJob> = {}): FakeJob => ({
  id: 1,
  slipId: 42,
  status: "queued",
  attempts: 0,
  lastAttemptAt: null,
  errorMessage: null,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(dbModule.getChurchProfile).mockResolvedValue({
    bankAccount: null,
    promptPayId: null,
  } as never);
  vi.mocked(dbModule.countRecentSystemRejectedSlips).mockResolvedValue(0);
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── Unit: the time budget ────────────────────────────────────────────────────

describe("unit — extractWithinJobBudget", () => {
  /** A provider call that only settles when its signal fires, i.e. a hang. */
  const hangUntilAborted = (opts: { signal?: AbortSignal }) =>
    new Promise<never>((_, reject) => {
      opts.signal?.addEventListener(
        "abort",
        () => reject(new DOMException("provider aborted", "AbortError")),
        { once: true }
      );
    });

  it("hands the provider an abort signal", async () => {
    const seen: { signal?: AbortSignal } = {};
    vi.mocked(extractSlipData).mockImplementation(async (_url, opts) => {
      seen.signal = opts?.signal;
      return extraction();
    });

    await extractWithinJobBudget("https://signed.example/slip.jpg", 1_000);

    expect(seen.signal).toBeInstanceOf(AbortSignal);
    expect(seen.signal?.aborted).toBe(false);
  });

  it("aborts the provider and reports a budget timeout when it hangs", async () => {
    const seen: { signal?: AbortSignal } = {};
    vi.mocked(extractSlipData).mockImplementation((_url, opts) => {
      seen.signal = opts?.signal;
      return hangUntilAborted(opts ?? {});
    });

    const started = Date.now();
    await expect(
      extractWithinJobBudget("https://signed.example/slip.jpg", 20)
    ).rejects.toBeInstanceOf(WorkerOcrTimeoutError);

    expect(Date.now() - started).toBeLessThan(2_000);
    // The provider was actually cancelled, not merely abandoned.
    expect(seen.signal?.aborted).toBe(true);
  });

  it("keeps the cause of the budget failure", async () => {
    vi.mocked(extractSlipData).mockImplementation((_url, opts) =>
      hangUntilAborted(opts ?? {})
    );

    const error = await extractWithinJobBudget("url", 20).catch(e => e);
    expect(error).toBeInstanceOf(WorkerOcrTimeoutError);
    expect((error as WorkerOcrTimeoutError).name).toBe(
      "WorkerOcrTimeoutError"
    );
    expect((error as WorkerOcrTimeoutError).cause).toBeDefined();
  });

  it("does not relabel a provider failure as a budget timeout", async () => {
    const transient = new TransientOcrError("Gemini 503", 503);
    vi.mocked(extractSlipData).mockRejectedValue(transient);

    await expect(extractWithinJobBudget("url", 1_000)).rejects.toBe(transient);
  });

  it("does not relabel a provider cancel as a budget timeout", async () => {
    const aborted = new DOMException("aborted", "AbortError");
    vi.mocked(extractSlipData).mockRejectedValue(aborted);

    await expect(extractWithinJobBudget("url", 1_000)).rejects.toBe(aborted);
  });

  it("leaves the job budget well inside the stale-job lease", () => {
    // Safety of the reaper rests on this: no live job can look stale.
    expect(STALE_JOB_LEASE_MS).toBeGreaterThan(WORKER_OCR_JOB_TIMEOUT_MS * 5);
  });
});

// ─── Integration: runWorkerBatch over an in-memory store ─────────────────────

describe("integration (fake DB) — runWorkerBatch", () => {
  const useDb = (state: Parameters<typeof makeFakeDb>[0]) => {
    const fake = makeFakeDb(state);
    vi.mocked(dbModule.getDb).mockResolvedValue(fake.db as never);
    return { ...fake, jobs: state.jobs, slips: state.slips };
  };

  it("processes a queued job and marks it done", async () => {
    const fake = useDb({ jobs: [queuedJob()], slips: [slipRow()] });
    vi.mocked(extractSlipData).mockResolvedValue(extraction());

    const result = await runWorkerBatch();

    expect(result).toEqual({ processed: 1, errors: 0 });
    expect(extractSlipData).toHaveBeenCalledTimes(1);
    expect(fake.jobs[0].status).toBe("done");
    expect(fake.slips[0].status).toBe("needs_review");
    expect(fake.slipUpdates).toHaveLength(1);
    expect(fake.slipUpdates[0]).toMatchObject({
      status: "needs_review",
      extractedAmount: "500",
      extractedRef: "REF123",
    });
  });

  it("writes the slip only while it is still pending (C1)", async () => {
    const fake = useDb({ jobs: [queuedJob()], slips: [slipRow()] });
    vi.mocked(extractSlipData).mockResolvedValue(extraction());

    await runWorkerBatch();

    const where = fake.slipUpdates[0].where as string;
    expect(where).toContain("status");
    expect(where).toContain("pending");
  });

  it("closes the job only for the attempt this run claimed (C1)", async () => {
    const fake = useDb({ jobs: [queuedJob()], slips: [slipRow()] });
    vi.mocked(extractSlipData).mockResolvedValue(extraction());

    await runWorkerBatch();

    const done = fake.jobUpdates.find(u => u.status === "done");
    expect(done).toBeDefined();
    const where = done?.where as string;
    expect(where).toContain("status");
    expect(where).toContain("processing");
    expect(where).toContain("attempts");
    // The attempt number this run owns, not the one it was selected with.
    expect(fake.jobs[0].attempts).toBe(1);
  });

  it("keeps another run's result when the slip write loses the race (C1)", async () => {
    const fake = useDb({
      jobs: [queuedJob()],
      slips: [slipRow()],
      slipWriteLosesRace: true,
    });
    vi.mocked(extractSlipData).mockResolvedValue(extraction());

    await runWorkerBatch();

    // Nothing overwritten, and the job is not closed by the losing run.
    expect(fake.slips[0].status).toBe("pending");
    expect(fake.slipUpdates).toHaveLength(0);
    expect(fake.jobs[0].status).toBe("processing");
    expect(fake.jobUpdates.find(u => u.status === "done")).toBeUndefined();
  });

  it("does not reopen a job another run already closed (C1)", async () => {
    const fake = useDb({
      jobs: [queuedJob()],
      slips: [slipRow()],
      jobWriteLosesRace: true,
    });
    vi.mocked(extractSlipData).mockResolvedValue(extraction());

    await runWorkerBatch();

    expect(fake.jobs[0].status).toBe("processing");
    expect(fake.jobUpdates).toHaveLength(0);
  });

  it("completes the job when the reading is permanently unreadable", async () => {
    const fake = useDb({ jobs: [queuedJob()], slips: [slipRow()] });
    // A permanent failure never throws; slipOcr returns an empty reading.
    vi.mocked(extractSlipData).mockResolvedValue(
      extraction({
        amount: null,
        amountConfidence: 0,
        transferDate: null,
        dateConfidence: 0,
        senderName: null,
        senderConfidence: 0,
        referenceNumber: null,
        referenceConfidence: 0,
      })
    );

    const result = await runWorkerBatch();

    expect(result).toEqual({ processed: 1, errors: 0 });
    expect(fake.jobs[0].status).toBe("done");
    expect(fake.slips[0].status).toBe("needs_review");
  });

  it("returns a transient failure to the queue without touching the slip", async () => {
    const fake = useDb({ jobs: [queuedJob()], slips: [slipRow()] });
    vi.mocked(extractSlipData).mockRejectedValue(
      new TransientOcrError("Gemini 429", 429)
    );

    const result = await runWorkerBatch();

    expect(result).toEqual({ processed: 0, errors: 1 });
    expect(fake.jobs[0].status).toBe("queued");
    expect(fake.jobs[0].errorMessage).toContain("429");
    // Nothing is written to the slip: no status, no amount, no evidence.
    expect(fake.slipUpdates).toHaveLength(0);
  });

  it("requeues after a budget timeout instead of failing the job", async () => {
    vi.useFakeTimers();
    const fake = useDb({ jobs: [queuedJob()], slips: [slipRow()] });
    const seen: { signal?: AbortSignal } = {};
    vi.mocked(extractSlipData).mockImplementation((_url, opts) => {
      seen.signal = opts?.signal;
      return new Promise<never>((_, reject) => {
        opts?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("aborted", "AbortError")),
          { once: true }
        );
      });
    });

    const running = runWorkerBatch();
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(WORKER_OCR_JOB_TIMEOUT_MS + 1);
    const result = await running;

    expect(result).toEqual({ processed: 0, errors: 1 });
    expect(seen.signal?.aborted).toBe(true);
    expect(fake.jobs[0].status).toBe("queued");
    expect(fake.jobs[0].errorMessage).toContain("budget");
    expect(fake.slipUpdates).toHaveLength(0);
  });

  it("fails the job and the slip once the attempts are used up", async () => {
    const fake = useDb({
      jobs: [queuedJob({ attempts: MAX_ATTEMPTS - 1 })],
      slips: [slipRow()],
    });
    vi.mocked(extractSlipData).mockRejectedValue(
      new TransientOcrError("Gemini 503", 503)
    );

    await runWorkerBatch();

    expect(fake.jobs[0].attempts).toBe(MAX_ATTEMPTS);
    expect(fake.jobs[0].status).toBe("failed");
    expect(fake.slipUpdates).toHaveLength(1);
    expect(fake.slipUpdates[0]).toMatchObject({ status: "failed" });
    // Even the failure write only lands on a slip nobody decided on (C1).
    expect(fake.slipUpdates[0].where).toContain("pending");
  });

  it("does not start a job another worker already claimed", async () => {
    const fake = useDb({
      jobs: [queuedJob({ status: "processing", attempts: 1 })],
      slips: [slipRow()],
    });

    const result = await runWorkerBatch();

    expect(result).toEqual({ processed: 0, errors: 0 });
    expect(extractSlipData).not.toHaveBeenCalled();
    expect(fake.jobs[0].status).toBe("processing");
  });

  it("processes a slip once when two workers run at the same time", async () => {
    const fake = useDb({ jobs: [queuedJob()], slips: [slipRow()] });
    vi.mocked(extractSlipData).mockResolvedValue(extraction());

    const [first, second] = await Promise.all([
      runWorkerBatch(),
      runWorkerBatch(),
    ]);

    expect(extractSlipData).toHaveBeenCalledTimes(1);
    expect(first.processed + second.processed).toBe(1);
    expect(fake.slipUpdates).toHaveLength(1);
    expect(fake.jobs[0].status).toBe("done");
  });

  it("waits out the retry backoff before picking a failed job up again", async () => {
    useDb({
      jobs: [queuedJob({ attempts: 1, lastAttemptAt: new Date() })],
      slips: [slipRow()],
    });

    const result = await runWorkerBatch();

    expect(result).toEqual({ processed: 0, errors: 0 });
    expect(extractSlipData).not.toHaveBeenCalled();
  });

  it("picks the job up again once the backoff has passed", async () => {
    const fake = useDb({
      jobs: [
        queuedJob({ attempts: 1, lastAttemptAt: new Date(Date.now() - 120_000) }),
      ],
      slips: [slipRow()],
    });
    vi.mocked(extractSlipData).mockResolvedValue(extraction());

    const result = await runWorkerBatch();

    expect(result).toEqual({ processed: 1, errors: 0 });
    expect(fake.jobs[0].status).toBe("done");
  });

  it("reports nothing when the database is unavailable", async () => {
    vi.mocked(dbModule.getDb).mockResolvedValue(null);

    await expect(runWorkerBatch()).resolves.toEqual({
      processed: 0,
      errors: 0,
    });
    expect(extractSlipData).not.toHaveBeenCalled();
  });

  it("keeps running when recording the failure itself fails", async () => {
    useDb({
      jobs: [queuedJob()],
      slips: [slipRow()],
      failJobStatusUpdate: true,
    });
    vi.mocked(extractSlipData).mockRejectedValue(
      new TransientOcrError("Gemini 503", 503)
    );

    await expect(runWorkerBatch()).resolves.toEqual({
      processed: 0,
      errors: 1,
    });
  });
});

// ─── Recovery of abandoned jobs ──────────────────────────────────────────────

describe("unit — reclaimStaleJobs", () => {
  const fakeDbForReclaim = (opts: {
    requeued: number[];
    exhausted: Array<{ id: number; slipId: number }>;
    failClaim?: boolean;
  }) => {
    const slipUpdates: Array<Record<string, any>> = [];
    const jobWheres: string[] = [];

    const db = {
      update(table: unknown) {
        const q: any = {};
        q.set = (values: Record<string, unknown>) => {
          q.values = values;
          return q;
        };
        q.where = (arg: unknown) => {
          q.whereArg = arg;
          jobWheres.push(sqlText(arg));
          return q;
        };
        q.returning = () => q;
        q.then = (onFulfilled: any, onRejected: any) =>
          Promise.resolve()
            .then(() => {
              if (table === lineSlips) {
                slipUpdates.push({
                  ...q.values,
                  where: sqlText(q.whereArg),
                  whereArg: q.whereArg,
                });
                return [];
              }
              if (q.values?.status === "queued") {
                return opts.requeued.map(id => ({ id }));
              }
              if (opts.failClaim) return [];
              return opts.exhausted.map(job => ({ id: job.id }));
            })
            .then(onFulfilled, onRejected);
        q.catch = (fn: any) => q.then(undefined, fn);
        return q;
      },
      select() {
        const q: any = {
          from: () => q,
          where: () => q,
          orderBy: () => q,
          limit: () => q,
        };
        q.then = (onFulfilled: any, onRejected: any) =>
          Promise.resolve(opts.exhausted).then(onFulfilled, onRejected);
        q.catch = (fn: any) => q.then(undefined, fn);
        return q;
      },
    };

    return { db: db as never, slipUpdates, jobWheres };
  };

  it("requeues a stale job that still has retries and fails the spent one", async () => {
    const fake = fakeDbForReclaim({
      requeued: [1, 2],
      exhausted: [{ id: 3, slipId: 42 }],
    });

    const result = await reclaimStaleJobs(fake.db);

    expect(result).toEqual({ requeued: 2, failed: 1 });
    expect(fake.slipUpdates).toHaveLength(1);
    expect(fake.slipUpdates[0]).toMatchObject({ status: "failed" });
  });

  it("measures the lease with the database clock, not a host clock (C3)", async () => {
    const fake = fakeDbForReclaim({ requeued: [1], exhausted: [] });

    await reclaimStaleJobs(fake.db);

    for (const where of fake.jobWheres) {
      expect(where).toContain("now()");
      // A JS Date here means the comparison used this host's clock.
      expect(where).not.toMatch(/20\d\d-\d\d-\d\dT/);
    }
    expect(fake.jobWheres.length).toBeGreaterThan(0);
  });

  it("never fails a slip staff already decided on (C2)", async () => {
    const fake = fakeDbForReclaim({
      requeued: [],
      exhausted: [{ id: 3, slipId: 42 }],
    });

    await reclaimStaleJobs(fake.db);

    const where = fake.slipUpdates[0].where as string;
    expect(where).toContain("status");
    expect(where).toContain("approved");
    expect(where).toContain("rejected");
    expect(where).toContain("approvedOfferingId");
    // The guard is SQL-side, so no host clock leaks in here either.
    expect(bindsDate(fake.slipUpdates[0].whereArg)).toBe(false);
  });

  it("leaves the slip alone when the stale job was taken by someone else", async () => {
    const fake = fakeDbForReclaim({
      requeued: [],
      exhausted: [{ id: 3, slipId: 42 }],
      failClaim: true,
    });

    const result = await reclaimStaleJobs(fake.db);

    expect(result).toEqual({ requeued: 0, failed: 0 });
    expect(fake.slipUpdates).toHaveLength(0);
  });
});
