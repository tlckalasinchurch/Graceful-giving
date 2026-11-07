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
        "min-h-11 w-full appearance-none rounded-xl border-2 border-[var(--ink)]",
        "bg-surface py-2.5 pl-4 pr-10 text-sm font-medium text-ink shadow-[2px_2px_0_var(--ink)] transition-all",
        "focus:border-brand focus:shadow-[2px_2px_0_var(--brand)] focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        invalid && "border-danger shadow-[2px_2px_0_var(--danger)]",
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 stroke-[2.5] text-ink"
    />
  </div>
));
NativeSelect.displayName = "NativeSelect";
