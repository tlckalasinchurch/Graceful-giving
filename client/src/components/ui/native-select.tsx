import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The app's one styled `<select>`.
 */
export interface NativeSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Renders the invalid state without depending on a form library. */
  invalid?: boolean;
  /**
   * Classes for the positioning wrapper.
   */
  wrapperClassName?: string;
}

export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  NativeSelectProps
>(({ className, invalid, wrapperClassName, children, ...props }, ref) => (
  <div className={cn("relative w-full", wrapperClassName)}>
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "min-h-11 w-full appearance-none rounded-xl border border-line",
        "bg-surface py-2 pl-3.5 pr-10 text-base font-medium text-ink transition-colors hover:border-[var(--field)]",
        "focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        invalid && "border-danger",
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      aria-hidden="true"
      className="pointer-events-none absolute right-3.5 top-1/2 size-4.5 -translate-y-1/2 stroke-[2.5] text-ink"
    />
  </div>
));
NativeSelect.displayName = "NativeSelect";
