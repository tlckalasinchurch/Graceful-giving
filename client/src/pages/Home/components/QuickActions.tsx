import type { LucideIcon } from "lucide-react";

export interface QuickAction {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  /** The one or two actions a treasurer uses most get the primary tint. */
  primary?: boolean;
}

/**
 * Compact shortcut grid: four per row on a phone, one row on desktop. Each
 * target is at least 72×64px, so it is easy to hit with a thumb.
 */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  if (actions.length === 0) return null;
  return (
    <section aria-labelledby="quick-actions-heading" className="space-y-3">
      <h2
        id="quick-actions-heading"
        className="text-base font-semibold text-foreground"
      >
        ทำรายการ
      </h2>
      <ul className="grid grid-cols-4 gap-2 sm:gap-3 lg:grid-cols-8">
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <li key={action.label} className="min-w-0">
              <button
                type="button"
                onClick={action.onSelect}
                className="flex min-h-[4.5rem] w-full flex-col items-center justify-start gap-1.5 rounded-xl px-1 py-2 text-center hover:bg-muted"
              >
                <span
                  className={`flex size-11 items-center justify-center rounded-xl border ${
                    action.primary
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-primary-strong"
                  }`}
                  aria-hidden="true"
                >
                  <Icon className="size-5" />
                </span>
                <span className="text-xs font-medium leading-tight text-foreground-soft">
                  {action.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
