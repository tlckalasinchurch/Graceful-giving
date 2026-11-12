import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// The page imports the tRPC client and many components. Only ReceiverCheck is
// under test, so stub the module graph that needs a server.
vi.mock("@/lib/trpc", () => ({ trpc: {} }));
vi.mock("@/components/layout/AppLayout", () => ({ AppLayout: () => null }));

import { EscalationNote, ReceiverCheck } from "./GivingInbox";

const aiData = (receiver: string) => ({
  receiverAccount: "xxx-x-x6789-x",
  receiverName: "คริสตจักรทดสอบ",
  receiverBank: "กสิกรไทย",
  verification: { receiver },
});

describe("ReceiverCheck", () => {
  it("shows the receiver and a match", () => {
    const { container } = render(<ReceiverCheck aiData={aiData("match")} />);
    expect(screen.getByText(/xxx-x-x6789-x/)).toBeTruthy();
    expect(screen.getByText(/ตรงกับบัญชีของคริสตจักร/)).toBeTruthy();
    expect(container.firstChild).toHaveClass("bg-tile-mint");
  });

  it("warns on a mismatch and on one differing digit", () => {
    const { rerender, container } = render(<ReceiverCheck aiData={aiData("mismatch")} />);
    expect(screen.getByText(/ไม่ตรงกับบัญชีของคริสตจักร/)).toBeTruthy();
    expect(container.firstChild).toHaveClass("bg-danger/10");

    rerender(<ReceiverCheck aiData={aiData("suspect")} />);
    expect(screen.getByText(/ต่างจากบัญชีคริสตจักร 1 หลัก/)).toBeTruthy();
    expect(container.firstChild).toHaveClass("bg-tile-sand");
  });

  it("says it could not compare when the result is unknown", () => {
    const { container } = render(<ReceiverCheck aiData={aiData("unknown")} />);
    expect(screen.getByText(/ตรวจเทียบอัตโนมัติไม่ได้/)).toBeTruthy();
    expect(container.firstChild).toHaveClass("bg-paper-2");
  });

  it("shows nothing for a slip read before this check existed", () => {
    const { container } = render(<ReceiverCheck aiData={{ amount: 500 }} />);
    expect(container.firstChild).toBeNull();
    const { container: c2 } = render(<ReceiverCheck aiData={null} />);
    expect(c2.firstChild).toBeNull();
  });
});

describe("EscalationNote", () => {
  it("tells staff the system stopped rejecting this donor", () => {
    render(<EscalationNote aiData={{ verification: { escalated: true } }} />);
    const note = screen.getByRole("note");
    expect(note.textContent).toContain("หลายครั้ง");
    expect(note).toHaveClass("bg-tile-sand");
  });

  it("shows nothing for a normal slip", () => {
    const { container } = render(
      <EscalationNote aiData={{ verification: { escalated: false } }} />
    );
    expect(container.firstChild).toBeNull();
  });
});
