import { Moon, Sun, Sunrise, type LucideIcon } from "lucide-react";

export type Greeting = {
  /** Thai greeting shown as the heading. */
  thai: string;
  /** Short English accent set in the Caveat script face (Latin glyphs only). */
  script: string;
  icon: LucideIcon;
};

/**
 * Greeting for the local hour: morning 05:00–11:59, afternoon 12:00–16:59,
 * evening 17:00–04:59.
 */
export function getGreeting(now: Date): Greeting {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12)
    return { thai: "อรุณสวัสดิ์", script: "Good morning", icon: Sunrise };
  if (hour >= 12 && hour < 17)
    return { thai: "สวัสดีตอนบ่าย", script: "Good afternoon", icon: Sun };
  return { thai: "สวัสดีตอนค่ำ", script: "Good evening", icon: Moon };
}

export type Scripture = { text: string; reference: string };

/**
 * Stewardship verses in short Thai renderings. Check the wording against the
 * Thai Bible version your church reads before relying on it in print.
 */
export const DAILY_SCRIPTURES: Scripture[] = [
  { text: "ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก", reference: "2 โครินธ์ 9:7" },
  {
    text: "จงถวายเกียรติแด่พระยาห์เวห์ด้วยทรัพย์สมบัติของท่าน",
    reference: "สุภาษิต 3:9",
  },
  { text: "จงให้ แล้วท่านจะได้รับ", reference: "ลูกา 6:38" },
  { text: "การให้เป็นความสุขยิ่งกว่าการรับ", reference: "กิจการ 20:35" },
  {
    text: "ทรัพย์สมบัติของท่านอยู่ที่ไหน ใจของท่านก็จะอยู่ที่นั่นด้วย",
    reference: "มัทธิว 6:21",
  },
  {
    text: "แผ่นดินโลกและสิ่งสารพัดในโลกเป็นของพระยาห์เวห์",
    reference: "สดุดี 24:1",
  },
  {
    text: "จงใช้ของประทานที่แต่ละคนได้รับ ปรนนิบัติกันและกัน",
    reference: "1 เปโตร 4:10",
  },
  {
    text: "อย่าละเลยที่จะทำดีและแบ่งปันสิ่งของของท่าน",
    reference: "ฮีบรู 13:16",
  },
  {
    text: "พระเจ้าของข้าพเจ้าจะประทานทุกสิ่งที่ท่านขาด",
    reference: "ฟีลิปปี 4:19",
  },
  {
    text: "จงนำสิบชักหนึ่งเต็มเม็ดเต็มหน่วยมาไว้ในคลัง",
    reference: "มาลาคี 3:10",
  },
];

/** Same verse for the whole local calendar day; the next day moves on. */
export function getDailyScripture(now: Date): Scripture {
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      startOfYear.getTime()) /
      86_400_000
  );
  return DAILY_SCRIPTURES[dayOfYear % DAILY_SCRIPTURES.length];
}
