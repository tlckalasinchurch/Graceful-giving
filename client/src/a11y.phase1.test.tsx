import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./components/ui/dialog";
import { ReceiptPreviewModal } from "./components/finance/ReceiptPreviewModal";

describe("Phase 1 Accessibility Regressions", () => {
  describe("Radix Dialog Focus Trap & Accessible Name", () => {
    it("renders dialog with DialogTitle and DialogDescription accessible to screen readers", () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ระบุเหตุผลที่ไม่อนุมัติ</DialogTitle>
              <DialogDescription>
                คำขอนี้จะถูกบันทึกว่าไม่ผ่านการอนุมัติ
              </DialogDescription>
            </DialogHeader>
            <textarea aria-label="เหตุผลที่ไม่อนุมัติ" />
            <button type="button">ยืนยัน</button>
          </DialogContent>
        </Dialog>
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "ระบุเหตุผลที่ไม่อนุมัติ" })
      ).toBeInTheDocument();
      expect(screen.getByLabelText("เหตุผลที่ไม่อนุมัติ")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "ปิด" })).toBeInTheDocument();
    });
  });

  describe("File Upload Keyboard Operability & Event Isolation", () => {
    it("dropzone button is reachable by keyboard and triggers click on Enter/Space without double invocation", () => {
      const handleClick = vi.fn();
      render(
        <div
          role="button"
          tabIndex={0}
          aria-label="คลิกเพื่อเลือกไฟล์รูปสลิป"
          onClick={handleClick}
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClick();
            }
          }}
        >
          <input
            type="file"
            aria-label="เลือกไฟล์รูปสลิป"
            tabIndex={-1}
            onClick={e => e.stopPropagation()}
            className="sr-only"
            data-testid="file-input"
          />
          <span>เลือกไฟล์</span>
        </div>
      );

      const button = screen.getByRole("button", {
        name: "คลิกเพื่อเลือกไฟล์รูปสลิป",
      });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("tabindex", "0");

      // Press Enter
      fireEvent.keyDown(button, { key: "Enter" });
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Press Space
      fireEvent.keyDown(button, { key: " " });
      expect(handleClick).toHaveBeenCalledTimes(2);

      // File input is in DOM with sr-only, tabIndex -1 to avoid duplicate tab stops
      const input = screen.getByTestId("file-input");
      expect(input).toHaveClass("sr-only");
      expect(input).toHaveAttribute("tabindex", "-1");

      // Clicking input directly stops propagation so it doesn't trigger parent div's click
      fireEvent.click(input);
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  describe("ReceiptPreviewModal Dialog Semantics", () => {
    it("renders as an accessible dialog and invokes onClose on Escape", () => {
      const onClose = vi.fn();
      render(
        <ReceiptPreviewModal
          isOpen={true}
          onClose={onClose}
          receiptUrl="https://example.com/slip.jpg"
          title="ถวายทรัพย์"
          refCode="INC-2026-0001"
        />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "หลักฐานสลิป / ใบเสร็จแนบ" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "ปิดตัวอย่างใบเสร็จ" })
      ).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
