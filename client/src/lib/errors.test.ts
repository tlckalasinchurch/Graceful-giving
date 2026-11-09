import { describe, expect, it } from "vitest";
import { friendlyErrorMessage } from "./errors";

const trpc = (code: string, message: string) => ({
  message,
  data: { code },
});

describe("friendlyErrorMessage", () => {
  it("returns the fallback when there is no error", () => {
    expect(friendlyErrorMessage(null, "ล้มเหลว")).toBe("ล้มเหลว");
  });

  it("keeps a Thai reason written by the server, even with an error code", () => {
    const msg = "คำขอนี้ต้องมีผู้ลงนามอย่างน้อย 2 คน";
    expect(friendlyErrorMessage(trpc("BAD_REQUEST", msg))).toBe(msg);
    expect(friendlyErrorMessage(trpc("FORBIDDEN", msg))).toBe(msg);
    expect(friendlyErrorMessage(trpc("PRECONDITION_FAILED", msg))).toBe(msg);
  });

  it("uses the Thai text for the code when the server message is English", () => {
    expect(friendlyErrorMessage(trpc("FORBIDDEN", "Forbidden"))).toMatch(
      /ไม่มีสิทธิ์/
    );
    expect(
      friendlyErrorMessage(trpc("BAD_REQUEST", '[{"code":"too_small"}]'))
    ).toMatch(/ไม่ครบถ้วน/);
  });

  it("always sends an ended session to the sign-in text", () => {
    expect(
      friendlyErrorMessage(trpc("UNAUTHORIZED", "ต้องเข้าสู่ระบบ"))
    ).toMatch(/เซสชัน/);
    expect(
      friendlyErrorMessage(trpc("UNAUTHORIZED", "Please login (10001)"))
    ).toMatch(/เซสชัน/);
  });

  it("explains a network failure in Thai", () => {
    expect(friendlyErrorMessage(new Error("Failed to fetch"))).toMatch(
      /อินเทอร์เน็ต/
    );
  });

  it("hides English-only backend text behind the fallback", () => {
    expect(
      friendlyErrorMessage(
        new Error("Cannot read properties of undefined"),
        "ลองใหม่"
      )
    ).toBe("ลองใหม่");
  });
});
