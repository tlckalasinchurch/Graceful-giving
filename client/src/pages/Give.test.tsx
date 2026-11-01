import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let auth: { user: Record<string, unknown> | null; loading: boolean };
let status: { state: string } | undefined;

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: auth.user,
    loading: auth.loading,
    isAuthenticated: Boolean(auth.user),
  }),
}));
const invalidateMe = vi.fn();
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ auth: { me: { invalidate: invalidateMe } } }),
    auth: { status: { useQuery: () => ({ data: status }) } },
  },
}));
let liffId: string | null = null;
let liffResult = "not_in_line";
const signInWithLiff = vi.fn(async () => liffResult);
vi.mock("@/lib/liffSignIn", () => ({
  fetchLiffId: async () => liffId,
  signInWithLiff: (...args: unknown[]) =>
    (signInWithLiff as unknown as (...a: unknown[]) => unknown)(...args),
}));
vi.mock("./GivingStation", () => ({
  PlainGivingStation: () => <div data-testid="station" />,
}));

import Give from "./Give";

const member = { role: "user", churchRole: "MEMBER", roles: ["MEMBER"] };

describe("Give (the public giving link)", () => {
  beforeEach(() => {
    auth = { user: null, loading: false };
    status = { state: "signed_out" };
    liffId = null;
    liffResult = "not_in_line";
    signInWithLiff.mockClear();
    invalidateMe.mockClear();
    window.history.pushState({}, "", "/give");
  });

  it("shows a LINE sign-in that returns to the giving link, and no other link", () => {
    render(<Give />);
    const link = screen.getByRole("link", { name: /LINE/ });
    expect(link.getAttribute("href")).toBe("/api/auth/line/login?next=give");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("shows the giving page to an ordinary member", () => {
    auth.user = member;
    render(<Give />);
    expect(screen.getByTestId("station")).toBeTruthy();
  });

  it("shows staff the same plain giving page, not the full app", () => {
    auth.user = { role: "user", churchRole: "TREASURER", roles: ["TREASURER"] };
    render(<Give />);
    expect(screen.getByTestId("station")).toBeTruthy();
  });

  it("offers no sign-in to a disabled account", () => {
    status = { state: "disabled" };
    render(<Give />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("ปิดการใช้งาน");
  });

  it("shows why a sign-in failed", () => {
    window.history.pushState({}, "", "/give?error=cancelled");
    render(<Give />);
    expect(screen.getByRole("alert").textContent).toContain("ยกเลิก");
  });

  describe("inside the LINE app (LIFF)", () => {
    it("does not start LIFF when the server has no LIFF ID", async () => {
      render(<Give />);
      await Promise.resolve();
      expect(signInWithLiff).not.toHaveBeenCalled();
      expect(screen.getByRole("link", { name: /LINE/ })).toBeTruthy();
    });

    it("signs the person in and reloads who they are", async () => {
      liffId = "123-abc";
      liffResult = "signed_in";
      render(<Give />);
      await waitFor(() => expect(invalidateMe).toHaveBeenCalledTimes(1));
      expect(signInWithLiff).toHaveBeenCalledWith("123-abc");
      expect(signInWithLiff).toHaveBeenCalledTimes(1);
    });

    it("shows the LINE button in an ordinary browser", async () => {
      liffId = "123-abc";
      liffResult = "not_in_line";
      render(<Give />);
      await waitFor(() => expect(signInWithLiff).toHaveBeenCalled());
      expect(await screen.findByRole("link", { name: /LINE/ })).toBeTruthy();
      expect(invalidateMe).not.toHaveBeenCalled();
    });

    it("falls back to the LINE button when LIFF fails", async () => {
      liffId = "123-abc";
      liffResult = "failed";
      render(<Give />);
      expect(await screen.findByRole("link", { name: /LINE/ })).toBeTruthy();
      expect(invalidateMe).not.toHaveBeenCalled();
    });

    it("keeps the waiting message while LIFF sends the person to sign in", async () => {
      liffId = "123-abc";
      liffResult = "redirecting";
      render(<Give />);
      expect(await screen.findByRole("status")).toBeTruthy();
      expect(screen.queryByRole("link")).toBeNull();
    });
  });
});
