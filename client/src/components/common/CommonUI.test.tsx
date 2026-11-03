import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  LoadingSkeleton,
  EmptyState,
  ErrorState,
  StatusBadge,
  Chip,
  FilterBar,
} from "./CommonUI";

describe("CommonUI Components", () => {
  describe("LoadingSkeleton", () => {
    it("renders default 3 skeleton placeholder items", () => {
      const { container } = render(<LoadingSkeleton />);
      const items = container.querySelectorAll(".animate-pulse");
      expect(items.length).toBe(3);
    });

    it("renders specified count of skeleton items", () => {
      const { container } = render(<LoadingSkeleton count={5} />);
      const items = container.querySelectorAll(".animate-pulse");
      expect(items.length).toBe(5);
    });
  });

  describe("EmptyState", () => {
    it("renders title, description and illustration", () => {
      render(
        <EmptyState
          title="ไม่พบข้อมูล"
          description="ยังไม่มีรายการถวายในระบบขณะนี้"
        />
      );

      expect(screen.getByText("ไม่พบข้อมูล")).toBeInTheDocument();
      expect(
        screen.getByText("ยังไม่มีรายการถวายในระบบขณะนี้")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("img", { name: "กล่องถวาย" })
      ).toBeInTheDocument();
    });

    it("renders action button and triggers callback on click", () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          title="ไม่มีกองทุน"
          description="กรุณาสร้างกองทุนใหม่"
          actionText="สร้างกองทุน"
          onAction={handleAction}
        />
      );

      const actionBtn = screen.getByRole("button", { name: "สร้างกองทุน" });
      expect(actionBtn).toBeInTheDocument();
      fireEvent.click(actionBtn);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });
  });

  describe("ErrorState", () => {
    it("renders error state with alert role and default title", () => {
      render(<ErrorState description="ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" />);

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(screen.getByText("โหลดข้อมูลไม่สำเร็จ")).toBeInTheDocument();
      expect(
        screen.getByText("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้")
      ).toBeInTheDocument();
    });

    it("renders retry button and fires callback when provided", () => {
      const handleRetry = vi.fn();
      render(
        <ErrorState
          description="เกิดข้อผิดพลาดในการดึงข้อมูล"
          onRetry={handleRetry}
        />
      );

      const retryBtn = screen.getByRole("button", { name: "ลองใหม่" });
      expect(retryBtn).toBeInTheDocument();
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe("StatusBadge", () => {
    it("renders default label for approved status", () => {
      render(<StatusBadge status="approved" />);
      expect(screen.getByText("อนุมัติแล้ว")).toBeInTheDocument();
    });

    it("renders default label for pending status", () => {
      render(<StatusBadge status="pending" />);
      expect(screen.getByText("รอดำเนินการ")).toBeInTheDocument();
    });

    it("renders custom label when provided", () => {
      render(<StatusBadge status="approved" label="ผ่านการตรวจแล้ว" />);
      expect(screen.getByText("ผ่านการตรวจแล้ว")).toBeInTheDocument();
    });
  });

  describe("Chip and FilterBar", () => {
    it("fills a chosen form chip with the brand colour by default", () => {
      render(<Chip active>เงินสด</Chip>);
      const chip = screen.getByRole("button", { name: "เงินสด" });
      expect(chip).toHaveAttribute("aria-pressed", "true");
      expect(chip.className).toContain("bg-brand");
    });

    it("marks the chosen filter by tone, not by the brand fill", () => {
      render(
        <FilterBar
          searchValue=""
          onSearchChange={() => {}}
          filters={[
            { id: "all", label: "ทั้งหมด", count: 6 },
            { id: "income", label: "รายรับ", count: 3 },
          ]}
          activeFilter="all"
          onFilterChange={() => {}}
        />
      );
      const active = screen.getByRole("button", { name: /ทั้งหมด/ });
      expect(active).toHaveAttribute("aria-pressed", "true");
      expect(active.className).not.toContain("bg-brand");
      expect(active.className).not.toContain("shadow");
    });

    it("calls onFilterChange with the chip id", () => {
      const onFilterChange = vi.fn();
      render(
        <FilterBar
          searchValue=""
          onSearchChange={() => {}}
          filters={[
            { id: "all", label: "ทั้งหมด" },
            { id: "income", label: "รายรับ" },
          ]}
          activeFilter="all"
          onFilterChange={onFilterChange}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: "รายรับ" }));
      expect(onFilterChange).toHaveBeenCalledWith("income");
    });
  });
});
