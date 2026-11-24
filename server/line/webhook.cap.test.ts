import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const count = vi.fn();
const drain = vi.fn(async () => undefined);
const put = vi.fn();
vi.mock("../db", () => ({
  DEFAULT_CHURCH_ID: "test-church",
  countRecentSlipsFromLineUser: (...a: unknown[]) => count(...a),
  getDb: async () => ({
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => [] }) }),
    }),
  }),
}));
vi.mock("../storage", () => ({
  storagePutPrivate: (...a: unknown[]) => put(...a),
}));
vi.mock("./processWorker", () => ({ drainWorkerWithin: () => drain() }));

import { registerLineWebhook } from "./webhook";
import { MAX_SLIPS_PER_DAY } from "../../shared/givingLimits";

function send(body: unknown) {
  let handler!: (req: unknown, res: unknown) => void;
  registerLineWebhook({
    post: (_p: string, h: typeof handler) => (handler = h),
  } as never);
  const req = new EventEmitter() as EventEmitter & { headers: object };
  req.headers = { "x-line-signature": "dev" };
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    headersSent: false,
  };
  const done = new Promise<void>(r => res.json.mockImplementation(() => r()));
  handler(req, res);
  req.emit("data", Buffer.from(JSON.stringify(body)));
  req.emit("end");
  return done.then(() => res);
}

const imageEvent = {
  type: "message",
  webhookEventId: "evt-1",
  message: { type: "image", id: "m1" },
  source: { type: "user", userId: "Uspam" },
};

describe("LINE webhook daily cap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({}) }))
    );
  });

  it("drops an image once the sender is at the daily cap, without downloading it", async () => {
    count.mockResolvedValue(MAX_SLIPS_PER_DAY);
    const res = await send({ destination: "x", events: [imageEvent] });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(put).not.toHaveBeenCalled();
    expect(
      vi.mocked(fetch).mock.calls.some(c => String(c[0]).includes("/content"))
    ).toBe(false);
  });

  it("downloads the image while the sender is under the cap", async () => {
    count.mockResolvedValue(MAX_SLIPS_PER_DAY - 1);
    await send({ destination: "x", events: [imageEvent] });
    expect(
      vi.mocked(fetch).mock.calls.some(c => String(c[0]).includes("/content"))
    ).toBe(true);
  });
});
