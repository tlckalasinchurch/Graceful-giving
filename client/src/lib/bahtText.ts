/**
 * Convert number into Thai Baht text representation
 * e.g. 1250.50 -> หนึ่งพันสองร้อยห้าสิบบาทห้าสิบสตางค์
 */
export function bahtText(num: number): string {
  if (isNaN(num) || num === null || num === undefined) return "ศูนย์บาทถ้วน";
  if (num === 0) return "ศูนย์บาทถ้วน";

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const numWords = [
    "ศูนย์",
    "หนึ่ง",
    "สอง",
    "สาม",
    "สี่",
    "ห้า",
    "หก",
    "เจ็ด",
    "แปด",
    "เก้า",
  ];
  const unitWords = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

  function convertGroup(nStr: string): string {
    let res = "";
    const len = nStr.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(nStr.charAt(i), 10);
      const pos = len - i - 1;
      if (digit !== 0) {
        if (pos === 1 && digit === 1) {
          res += "สิบ";
        } else if (pos === 1 && digit === 2) {
          res += "ยี่สิบ";
        } else if (
          pos === 0 &&
          digit === 1 &&
          len > 1 &&
          parseInt(nStr.charAt(i - 1), 10) !== 0
        ) {
          res += "เอ็ด";
        } else {
          res += numWords[digit] + unitWords[pos];
        }
      }
    }
    return res;
  }

  const fixed = absNum.toFixed(2);
  const parts = fixed.split(".");
  const intPart = parts[0];
  const decPart = parts[1];

  let result = "";

  // Split into million groups
  let remainingInt = intPart;
  const groups: string[] = [];
  while (remainingInt.length > 6) {
    groups.unshift(remainingInt.slice(-6));
    remainingInt = remainingInt.slice(0, -6);
  }
  groups.unshift(remainingInt);

  for (let g = 0; g < groups.length; g++) {
    const grpText = convertGroup(groups[g]);
    if (grpText) {
      result += grpText;
      if (g < groups.length - 1) {
        result += "ล้าน";
      }
    }
  }

  if (!result) result = "ศูนย์";
  result += "บาท";

  const satang = parseInt(decPart, 10);
  if (satang === 0) {
    result += "ถ้วน";
  } else {
    result += convertGroup(decPart) + "สตางค์";
  }

  return (isNegative ? "ลบ" : "") + result;
}
