import { useRef } from "react";
import { Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { formToast } from "@/lib/formFeedback";
import { downloadSvgAsPng } from "@/lib/downloadQr";
import { formatAmount } from "@/lib/format";

const TOAST_KEY = "promptpay-copy";

/**
 * A PromptPay QR with the amount already filled in, for the donor to scan with
 * a bank app. The same screen cannot be scanned, so the card also saves the
 * code as an image to open from the photo album.
 */
export function PromptPayQrCard({
  payload,
  amount,
  payeeName,
}: {
  payload: string;
  amount: number;
  payeeName: string;
}) {
  const box = useRef<HTMLDivElement>(null);

  const save = async () => {
    const svg = box.current?.querySelector("svg");
    if (!svg) return;
    try {
      await downloadSvgAsPng(svg, `promptpay-${amount}.png`);
    } catch (err) {
      formToast.error(
        TOAST_KEY,
        err instanceof Error ? err.message : "บันทึกรูป QR ไม่สำเร็จ"
      );
    }
  };

  return (
    <section
      aria-label="QR พร้อมเพย์สำหรับถวาย"
      className="bento-card-static p-5 space-y-3 text-center"
    >
      <span className="inline-flex items-center rounded-full bg-tile-sky px-3 py-1 text-xs font-semibold text-tile-sky-ink">
        พร้อมเพย์ QR
      </span>
      <h3 className="display text-base text-ink pt-1">สแกนจ่ายด้วยแอปธนาคาร</h3>
      <p className="text-xs text-ink-2">
        ยอด{" "}
        <span className="font-semibold text-brand tabular-nums">
          {formatAmount(amount)} บาท
        </span>{" "}
        ใส่ให้แล้ว ไม่ต้องพิมพ์ยอดเอง
      </p>

      <div
        ref={box}
        className="mx-auto w-56 max-w-full rounded-2xl border border-line bg-white p-3"
      >
        <QRCodeSVG
          value={payload}
          level="M"
          marginSize={2}
          bgColor="#FFFFFF"
          fgColor="#171A18"
          title={`QR พร้อมเพย์ ${formatAmount(amount)} บาท`}
          className="h-auto w-full"
        />
      </div>

      <p className="text-xs text-ink-3">
        ผู้รับ: <span className="font-bold text-ink">{payeeName}</span>
      </p>

      <button
        type="button"
        onClick={() => void save()}
        className="btn-secondary inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-xs font-bold focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Download className="size-4" aria-hidden="true" />
        <span>บันทึกรูป QR ไว้เปิดในแอปธนาคาร</span>
      </button>

      <ol className="mx-auto max-w-xs list-decimal space-y-0.5 pl-5 text-left text-xs text-ink-3">
        <li>เปิดแอปธนาคาร เลือกสแกน QR หรือเลือกรูปจากอัลบั้ม</li>
        <li>ตรวจชื่อผู้รับและยอดให้ตรง แล้วกดโอน</li>
        <li>กลับมาหน้านี้ แนบสลิปด้านล่าง</li>
      </ol>
    </section>
  );
}
