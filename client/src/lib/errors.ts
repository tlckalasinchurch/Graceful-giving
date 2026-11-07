/**
 * Turn a thrown tRPC/network error into one Thai sentence a church treasurer
 * can act on. Backend messages are English ("Please login (10001)") and mean
 * nothing to the person reading the screen, so the raw text is only used when
 * it already looks like something written for a human.
 */

const CODE_MESSAGES: Record<string, string> = {
  UNAUTHORIZED:
    "เซสชันการเข้าใช้งานหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง",
  FORBIDDEN: "บัญชีนี้ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้",
  NOT_FOUND: "ไม่พบข้อมูลที่ต้องการ อาจถูกลบหรือย้ายไปแล้ว",
  TIMEOUT: "ระบบใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง",
  TOO_MANY_REQUESTS: "มีคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่",
  PAYLOAD_TOO_LARGE: "ไฟล์หรือข้อมูลมีขนาดใหญ่เกินที่ระบบรองรับ",
  BAD_REQUEST: "ข้อมูลที่ส่งไปไม่ครบถ้วน กรุณาตรวจสอบแล้วลองใหม่",
  INTERNAL_SERVER_ERROR: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง",
  PRECONDITION_FAILED: "ข้อมูลยังไม่พร้อมสำหรับขั้นตอนนี้ กรุณาตรวจสอบอีกครั้ง",
};

const ENGLISH_HINTS: Array<[RegExp, string]> = [
  [
    /failed to fetch|network ?error|fetch failed/i,
    "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่",
  ],
  [
    /please login|unauthori[sz]ed|not authenticated/i,
    CODE_MESSAGES.UNAUTHORIZED,
  ],
  [/permission|forbidden/i, CODE_MESSAGES.FORBIDDEN],
  [
    /database|db|postgres|relation .* does not exist/i,
    "เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาแจ้งผู้ดูแลระบบ",
  ],
];

type ErrorLike = {
  message?: unknown;
  data?: { code?: unknown } | null;
  shape?: { data?: { code?: unknown } | null } | null;
};

function codeOf(error: ErrorLike): string | undefined {
  const code = error.data?.code ?? error.shape?.data?.code;
  return typeof code === "string" ? code : undefined;
}

export function friendlyErrorMessage(
  error: unknown,
  fallback = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"
): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;

  const err = error as ErrorLike;
  const code = codeOf(err);
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];

  const message = typeof err.message === "string" ? err.message.trim() : "";
  if (!message) return fallback;

  for (const [pattern, thai] of ENGLISH_HINTS) {
    if (pattern.test(message)) return thai;
  }

  // Anything still carrying a numeric backend code is not for public reading.
  const isEnglishOnly = /^[\x20-\x7E]+$/.test(message);
  if (isEnglishOnly) return fallback;

  return message;
}

export const CSV_EXPORT_TOO_LARGE_MESSAGE =
  "ข้อมูลที่ส่งออกมีขนาดใหญ่เกินที่ระบบรองรับ กรุณาเลือกช่วงวันที่ให้แคบลง แล้วส่งออกใหม่ทีละช่วง";

/**
 * Thai message for a failed CSV export. A response above the Vercel limit can
 * reach the browser as a gateway error with no tRPC code, so the raw text is
 * matched too. Both cases tell the person to narrow the date range.
 */
export function csvExportErrorMessage(error: unknown): string {
  const err = error as ErrorLike | null | undefined;
  const message =
    typeof err?.message === "string" ? err.message : String(error ?? "");
  if (
    (err && codeOf(err) === "PAYLOAD_TOO_LARGE") ||
    /payload[_ ]too[_ ]large|FUNCTION_PAYLOAD|\b413\b|is not valid JSON|Unexpected token/i.test(
      message
    )
  ) {
    return CSV_EXPORT_TOO_LARGE_MESSAGE;
  }
  return friendlyErrorMessage(
    error,
    "ส่งออกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
  );
}
