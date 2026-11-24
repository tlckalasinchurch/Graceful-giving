import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Privacy from "./Privacy";

/**
 * The privacy page must say what really happens to a slip image: the app
 * sends it to Google's Gemini API on the free tier, which lets Google use it
 * to improve its products. It must not hide that behind the in-app access
 * rules, and must not claim a compliance status nobody has checked.
 */
describe("Privacy page: AI slip reading disclosure", () => {
  const aiSection = () =>
    screen.getByRole("region", { name: "3. การอ่านสลิปด้วย AI ของ Google" });

  it("names Google Gemini API and the data a slip carries", () => {
    render(<Privacy />);
    const text = aiSection().textContent ?? "";
    expect(text).toContain("Google Gemini API");
    expect(text).toContain("ชื่อผู้โอน");
    expect(text).toContain("เลขบัญชี");
    expect(text).toContain("ยอดเงิน");
  });

  it("states the free tier and that Google may use the data for its products and machine learning", () => {
    render(<Privacy />);
    const text = aiSection().textContent ?? "";
    expect(text).toContain("Free Tier");
    expect(text).toContain("ปรับปรุง และพัฒนาผลิตภัณฑ์ของ Google");
    expect(text).toContain("Machine Learning");
  });

  it("says the image is sent as soon as it is attached, before sending", () => {
    render(<Privacy />);
    expect(aiSection().textContent).toContain("ทันทีที่ท่านแนบรูป");
  });

  it("offers the no-slip route on the giving page and says LINE always sends the image", () => {
    render(<Privacy />);
    const items = within(aiSection()).getAllByRole("listitem");
    const noSlip = items.find(li =>
      li.textContent?.includes("โดยไม่แนบรูปสลิป")
    );
    const line = items.find(li => li.textContent?.includes("การส่งผ่าน LINE"));
    expect(noSlip?.textContent).toContain("หน้าถวายทรัพย์");
    expect(line?.textContent).toContain("เสมอ");
    expect(line?.textContent).toContain("ไม่มีทางเลือกนี้");
  });

  it("keeps in-app access separate from processing by Google", () => {
    render(<Privacy />);
    const access = screen
      .getAllByRole("listitem")
      .find(li => li.textContent?.includes("ภายในระบบของคริสตจักรเท่านั้น"));
    expect(access?.textContent).toContain("ข้อ 3");
    expect(screen.getByText(/Private Bucket/)).toBeTruthy();
  });

  it("makes no unchecked compliance claim", () => {
    const { container } = render(<Privacy />);
    expect(container.textContent).not.toContain("PDPA Compliance");
    expect(container.textContent).not.toMatch(/compliant|ปฏิบัติตาม PDPA ครบ/i);
  });

  it("keeps the data-subject rights, now as section 4", () => {
    render(<Privacy />);
    expect(
      screen.getByRole("heading", { name: "4. สิทธิของเจ้าของข้อมูลส่วนบุคคล" })
    ).toBeTruthy();
  });
});
