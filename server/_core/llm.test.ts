import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A caller with a time budget must not be held open by retries. That means the
 * backoff delay itself has to be cancellable: otherwise a provider that keeps
 * answering 503 holds the worker past the moment its job gave up.
 */

vi.mock("./env", () => ({
  ENV: {
    forgeApiKey: "test-key",
    forgeApiUrl: "",
    appId: "",
    isProduction: false,
    cronSecret: "",
  },
}));

import { invokeLLM } from "./llm";

const messages = [{ role: "user" as const, content: "อ่านสลิป" }];

const okResponse = () =>
  new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const busyResponse = () =>
  new Response(null, { status: 503, headers: { "retry-after": "0" } });

describe("invokeLLM cancellation", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("does not start a request when the caller already cancelled", async () => {
    const controller = new AbortController();
    controller.abort(
      new DOMException("worker OCR budget exceeded", "TimeoutError")
    );

    await expect(
      invokeLLM({ messages, signal: controller.signal })
    ).rejects.toMatchObject({ name: "TimeoutError" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects during backoff instead of retrying past the budget", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(async () => {
      // The budget runs out while the 503 is being handled.
      controller.abort(new DOMException("budget", "TimeoutError"));
      return busyResponse();
    });

    const started = Date.now();
    await expect(
      invokeLLM({ messages, signal: controller.signal })
    ).rejects.toMatchObject({ name: "TimeoutError" });

    // One attempt only: the wait before the second was cancelled.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it("keeps retrying a transient failure while the caller waits", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(busyResponse())
      .mockResolvedValueOnce(busyResponse())
      .mockResolvedValueOnce(okResponse());

    const running = invokeLLM({ messages });
    for (let i = 0; i < 20; i++) await Promise.resolve();
    await vi.advanceTimersByTimeAsync(60_000);

    await expect(running).resolves.toMatchObject({
      choices: [{ message: { content: "{}" } }],
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
