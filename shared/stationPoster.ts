import { z } from "zod";

/**
 * The words on the giving poster. The church saves them once and every device
 * shows the same poster. The QR image is not part of it: only the link is.
 */
export const stationPosterSchema = z.object({
  brandPrefix: z.string().trim().max(40),
  brandHighlight: z.string().trim().max(40),
  headlineWhite: z.string().trim().max(80),
  headlineOrange: z.string().trim().max(80),
  scanPrompt: z.string().trim().max(120),
  /** The link in the QR code. Empty means the giving link, /give. */
  qrValue: z.string().trim().max(500),
  centerBadge: z.string().trim().max(20),
  qrCaption: z.string().trim().max(40),
  footerWhite: z.string().trim().max(60),
  footerOrange: z.string().trim().max(60),
  footerSub: z.string().trim().max(200),
});

export type StationPoster = z.infer<typeof stationPosterSchema>;

export const DEFAULT_STATION_POSTER: StationPoster = {
  brandPrefix: "Grace",
  brandHighlight: "Box",
  headlineWhite: "จุดถวายทรัพย์",
  headlineOrange: "อัตโนมัติ",
  scanPrompt: "สแกน LINE หรือ QR เพื่อเริ่มใช้งาน",
  qrValue: "",
  centerBadge: "LINE",
  qrCaption: "LINE OFFICIAL",
  footerWhite: "ใจยินดี?",
  footerOrange: "ร่วมถวายได้เลย",
  footerSub:
    "เปิดรับถวายทุกกองทุน ส่งสลิปให้เหรัญญิกตรวจสอบก่อนบันทึกเข้าบัญชี",
};

/**
 * Reads the saved text. Bad or missing JSON gives the defaults, and a missing
 * field gets its default, so an older save never breaks the page.
 */
export function parseStationPoster(
  raw: string | null | undefined
): StationPoster {
  if (!raw) return DEFAULT_STATION_POSTER;
  try {
    const value: unknown = JSON.parse(raw);
    const parsed = stationPosterSchema.partial().safeParse(value);
    if (!parsed.success) return DEFAULT_STATION_POSTER;
    return { ...DEFAULT_STATION_POSTER, ...parsed.data };
  } catch {
    return DEFAULT_STATION_POSTER;
  }
}
