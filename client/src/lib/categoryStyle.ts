import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Briefcase,
  Church,
  Gift,
  Globe,
  HandCoins,
  Heart,
  HeartHandshake,
  Music,
  Receipt,
  Sprout,
  Wrench,
  Zap,
} from "lucide-react";

/**
 * Icon and tone for each transaction category. A row shows the icon in a
 * tinted circle next to the printed category name, so the colour helps the
 * eye find a category but never carries meaning on its own.
 */
export type CategoryTone = "sage" | "sky" | "sand" | "plum" | "clay" | "slate";

export interface CategoryStyle {
  icon: LucideIcon;
  tone: CategoryTone;
}

const OFFERING: Record<string, CategoryStyle> = {
  tithe: { icon: HandCoins, tone: "sage" },
  general: { icon: Heart, tone: "sage" },
  mission: { icon: Globe, tone: "sky" },
  building: { icon: Church, tone: "sand" },
  welfare: { icon: HeartHandshake, tone: "plum" },
  special: { icon: Gift, tone: "plum" },
};

const EXPENSE: Record<string, CategoryStyle> = {
  utilities: { icon: Zap, tone: "clay" },
  ministry: { icon: Sprout, tone: "sage" },
  pastoral: { icon: BookOpen, tone: "sky" },
  admin: { icon: Briefcase, tone: "slate" },
  building: { icon: Wrench, tone: "sand" },
  worship: { icon: Music, tone: "plum" },
  welfare: { icon: HeartHandshake, tone: "plum" },
  other: { icon: Receipt, tone: "slate" },
};

const FALLBACK: CategoryStyle = { icon: Receipt, tone: "slate" };

export function categoryStyle(
  type: "income" | "expense",
  category: string | null | undefined
): CategoryStyle {
  if (!category) return FALLBACK;
  return (type === "income" ? OFFERING : EXPENSE)[category] ?? FALLBACK;
}

/** Static class strings, so Tailwind can find them in the source. */
export const TONE_CLASSES: Record<CategoryTone, string> = {
  sage: "bg-cat-sage-soft text-cat-sage",
  sky: "bg-cat-sky-soft text-cat-sky",
  sand: "bg-cat-sand-soft text-cat-sand",
  plum: "bg-cat-plum-soft text-cat-plum",
  clay: "bg-cat-clay-soft text-cat-clay",
  slate: "bg-cat-slate-soft text-cat-slate",
};
