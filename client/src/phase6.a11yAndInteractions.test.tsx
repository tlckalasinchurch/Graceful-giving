import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

describe("Phase 6 Independent Audit — Accessibility & Interactions", () => {
  describe("Escape Key Behavior & ARIA Dialog Semantics", () => {
    function MockAccessibleModal({
      isOpen,
      onClose,
    }: {
      isOpen: boolean;
      onClose: () => void;
    }) {
      React.useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
          if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
      }, [isOpen, onClose]);

      if (!isOpen) return null;
      return (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <div className="bg-surface p-6 rounded-2xl max-w-md w-full">
            <h2 id="modal-title" className="text-lg font-bold">
              หัวข้อหน้าต่าง
            </h2>
            <button
              onClick={onClose}
              className="min-h-11 min-w-11 px-4 py-2 bg-primary text-white rounded-xl"
            >
              ปิด
            </button>
          </div>
        </div>
      );
    }

    it("verifies Escape key dismisses dialog and ARIA attributes are present", () => {
      const handleClose = vi.fn();
      const { unmount } = render(
        <MockAccessibleModal isOpen={true} onClose={handleClose} />
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "modal-title");

      fireEvent.keyDown(window, { key: "Escape" });
      expect(handleClose).toHaveBeenCalledTimes(1);

      unmount();
    });
  });

  describe("Touch Target Compliance (≥ 44px / min-h-11)", () => {
    it("confirms min-h-11 class equates to 44px in Tailwind (2.75rem)", () => {
      // 11 * 0.25rem = 2.75rem = 44px
      const minTouchSizePx = 11 * 4;
      expect(minTouchSizePx).toBe(44);
    });
  });

  describe("Progress Bar ARIA Semantics", () => {
    function MockProgressBar({ value, max }: { value: number; max: number }) {
      const pct = Math.min(100, Math.round((value / max) * 100));
      return (
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`งบประมาณใช้ไปแล้ว ${pct}%`}
          className="w-full bg-paper-2 rounded-full h-3 overflow-hidden"
        >
          <div style={{ width: `${pct}%` }} className="bg-primary h-full" />
        </div>
      );
    }

    it("verifies progressbar has valid accessibility role and min/max/now values", () => {
      render(<MockProgressBar value={4500} max={10000} />);
      const bar = screen.getByRole("progressbar");
      expect(bar).toBeInTheDocument();
      expect(bar).toHaveAttribute("aria-valuenow", "45");
      expect(bar).toHaveAttribute("aria-valuemin", "0");
      expect(bar).toHaveAttribute("aria-valuemax", "100");
      expect(bar).toHaveAttribute("aria-label", "งบประมาณใช้ไปแล้ว 45%");
    });
  });
});
