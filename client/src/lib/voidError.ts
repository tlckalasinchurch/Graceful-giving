/**
 * Plain-Thai help for a cancelled record that the server refused.
 *
 * The server already words these refusals in Thai (server/ledgerGuards.ts), but
 * the sentence says only what happened. This adds what the person can do next.
 * Anything it does not recognise keeps the server's own sentence.
 */

export type VoidFailure = {
  /** One line saying what went wrong. */
  title: string;
  /** What it means and what to do next. */
  advice: string;
  /** The server's own sentence, with its numbers. */
  detail: string;
};

export function explainVoidFailure(
  message: string,
  kind: "offering" | "expense"
): VoidFailure {
  const noun = kind === "offering" ? "รายการถวาย" : "รายจ่าย";

  // "ยอดกองทุน “X” ไม่พอ (คงเหลือ A บาท ต้องใช้ B บาท ขาด C บาท)"
  if (/ยอดกองทุน.*ไม่พอ/.test(message)) {
    return {
      title: `ยังยกเลิก${noun}นี้ไม่ได้ เพราะเงินในกองทุนไม่พอ`,
      advice:
        kind === "offering"
          ? "การยกเลิกรายการถวายจะหักเงินจำนวนนี้ออกจากกองทุน แต่เงินในกองทุนถูกใช้ไปแล้ว ถ้ายกเลิกตอนนี้ยอดกองทุนจะติดลบ รายการนี้จึงยังอยู่เหมือนเดิม ยังไม่มีอะไรถูกเปลี่ยน ให้ตรวจรายจ่ายที่ใช้เงินจากกองทุนนี้ก่อน เมื่อกองทุนมีเงินพอแล้วจึงลองยกเลิกอีกครั้ง"
          : "กองทุนไม่มีเงินพอสำหรับการเปลี่ยนแปลงนี้ รายการนี้จึงยังอยู่เหมือนเดิม ยังไม่มีอะไรถูกเปลี่ยน ตรวจยอดกองทุนก่อน แล้วลองอีกครั้ง",
      detail: message,
    };
  }

  if (/ปิดรอบแล้ว/.test(message)) {
    return {
      title: `ยกเลิก${noun}นี้ไม่ได้ เพราะรอบนับเงินปิดแล้ว`,
      advice:
        "รายการนี้มาจากรอบนับเงินที่ปิดถาวรแล้ว ระบบล็อกไว้เพื่อเก็บเป็นหลักฐานของรอบนั้น จึงแก้ไขหรือยกเลิกไม่ได้ รายการยังอยู่เหมือนเดิม หากข้อมูลผิด ให้ปรึกษาเหรัญญิกหลักหรือผู้ดูแลระบบ",
      detail: message,
    };
  }

  return {
    title: `ยกเลิก${noun}ไม่สำเร็จ`,
    advice: "รายการยังอยู่เหมือนเดิม ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง",
    detail: message,
  };
}
