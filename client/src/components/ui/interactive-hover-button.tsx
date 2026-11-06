import type { ButtonHTMLAttributes } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Adapted from ObsidianUI (MIT) — free component `interactive-hover-button`.
 * Renders through `./button.tsx` (variant="outline") instead of a raw
 * <button>, so it shares Button's focus-visible ring and disabled handling
 * rather than duplicating them. Theme tokens (bg-background / bg-primary)
 * keep it on the Graceful-giving clay palette automatically.
 * Defaults to type="button" so it never submits an enclosing form.
 */
export function InteractiveHoverButton({
  children,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button
      type={type}
      variant="outline"
      className={cn(
        "group bg-background relative h-auto w-auto overflow-hidden rounded-full p-2 px-6 text-center font-semibold ",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <div className="bg-primary h-2 w-2 rounded-full transition-all duration-300 motion-reduce:transition-none group-hover:scale-[100.8]"></div>
        <span className="inline-block transition-all duration-300 motion-reduce:transition-none group-hover:translate-x-12 group-hover:opacity-0">
          {children}
        </span>
      </div>
      {/* Visual hover layer repeats the label for the slide-in swap —
          hidden from the accessibility tree so the text is announced once. */}
      <div
        aria-hidden="true"
        className="text-primary-foreground absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 opacity-0 transition-all duration-300 motion-reduce:transition-none group-hover:-translate-x-5 group-hover:opacity-100"
      >
        <span>{children}</span>
        <ArrowRight />
      </div>
    </Button>
  );
}

export default InteractiveHoverButton;
