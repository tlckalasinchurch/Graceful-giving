import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getStationPosterJson: vi.fn(),
    saveStationPosterJson: vi.fn(),
    createAuditLog: vi.fn(),
  };
});

import { appRouter } from "./routers";
import * as db from "./db";
import {
  DEFAULT_STATION_POSTER,
  parseStationPoster,
} from "@shared/stationPoster";

type User = NonNullable<TrpcContext["user"]>;

const ctx = (user: User | null): TrpcContext => ({
  user,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: { clearCookie: () => undefined } as TrpcContext["res"],
});

const member = {
  id: 1,
  openId: "m",
  email: null,
  name: "สมาชิก",
  loginMethod: "line",
  role: "user",
  churchRole: "MEMBER",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
} as User;
const treasurer = { ...member, id: 2, churchRole: "TREASURER" } as User;
const superAdmin = { ...member, id: 3, churchRole: "SUPER_ADMIN" } as User;

const edited = { ...DEFAULT_STATION_POSTER, headlineWhite: "ถวายด้วยใจ" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.getStationPosterJson).mockResolvedValue(null);
});

describe("church.stationPoster", () => {
  it("rejects a signed-out caller", async () => {
    await expect(
      appRouter.createCaller(ctx(null)).church.stationPoster()
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("returns the defaults when nothing is saved", async () => {
    const out = await appRouter
      .createCaller(ctx(member))
      .church.stationPoster();
    expect(out).toEqual(DEFAULT_STATION_POSTER);
  });

  it("returns what was saved", async () => {
    vi.mocked(db.getStationPosterJson).mockResolvedValue(
      JSON.stringify(edited)
    );
    const out = await appRouter
      .createCaller(ctx(member))
      .church.stationPoster();
    expect(out.headlineWhite).toBe("ถวายด้วยใจ");
  });
});

describe("church.saveStationPoster", () => {
  it("lets a church leader save and writes an audit log", async () => {
    await appRouter
      .createCaller(ctx(superAdmin))
      .church.saveStationPoster(edited);
    expect(db.saveStationPosterJson).toHaveBeenCalledWith(
      JSON.stringify(edited)
    );
    expect(db.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "save_station_poster", userId: 3 })
    );
  });

  it("refuses a member and a treasurer", async () => {
    for (const user of [member, treasurer]) {
      await expect(
        appRouter.createCaller(ctx(user)).church.saveStationPoster(edited)
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(db.saveStationPosterJson).not.toHaveBeenCalled();
  });

  it("refuses text that is too long", async () => {
    await expect(
      appRouter
        .createCaller(ctx(superAdmin))
        .church.saveStationPoster({ ...edited, headlineWhite: "ก".repeat(81) })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("parseStationPoster", () => {
  it("falls back to the defaults for bad JSON", () => {
    expect(parseStationPoster("{oops")).toEqual(DEFAULT_STATION_POSTER);
    expect(parseStationPoster('{"headlineWhite": 5}')).toEqual(
      DEFAULT_STATION_POSTER
    );
  });

  it("fills a missing field with its default", () => {
    const out = parseStationPoster('{"headlineWhite":"ก"}');
    expect(out.headlineWhite).toBe("ก");
    expect(out.footerOrange).toBe(DEFAULT_STATION_POSTER.footerOrange);
  });
});
