import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The app's one styled `<select>`.
 *
 * Twenty-odd screens each styled a bare `<select>` by hand, so the same
 * control appeared with three corner radii, three backgrounds and four
 * heights depending on the page, and several sat below the 44px the rest of
 * the app uses as its minimum touch target.
 *
 * This keeps the native element — the platform picker on a phone is better
 * than anything we would build, and swapping in a listbox would change how
 * the form behaves — and only settles how it looks and how large it is.
 */
export interface NativeSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Renders the invalid state without depending on a form library. */
  invalid?: boolean;
  /**
   * Classes for the positioning wrapper. Width belongs here, not on the
   * select: the arrow is absolutely positioned against the wrapper, so a
   * narrower select inside a full-width wrapper leaves the arrow stranded.
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
        "min-h-11 w-full appearance-none rounded-2xl border border-line",
        "bg-surface py-2.5 pl-4 pr-10 text-sm text-ink",
        "focus:border-brand focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        invalid && "border-danger",
        className
      )}
      {...props}
    >
      {children}
    </select>
    {/* The arrow is ours because `appearance-none` removes the platform one.
        Not focusable, so it never sits between the label and the control. */}
    <ChevronDown
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-3"
    />
  </div>
));
NativeSelect.displayName = "NativeSelect";
