import React from "react";
import { Link, useLocation } from "wouter";
import {
  confirmDiscardPendingChanges,
  clearUnsavedChanges,
  hasUnsavedChanges,
} from "@/hooks/useUnsavedChanges";

type LinkProps = React.ComponentProps<typeof Link>;

/**
 * A wouter `Link` that asks for confirmation before leaving a form with
 * unsaved edits using our beautiful SweetAlert modal. Cancelling prevents
 * the default navigation, leaving the user on the form.
 */
export function GuardedLink({ onClick, ...props }: LinkProps) {
  const [, setLocation] = useLocation();
  const targetHref = props.href || props.to;

  return (
    <Link
      {...props}
      onClick={async event => {
        if (hasUnsavedChanges()) {
          event.preventDefault();
          const allowed = await confirmDiscardPendingChanges();
          if (allowed) {
            clearUnsavedChanges();
            if (targetHref) {
              setLocation(String(targetHref));
            }
            onClick?.(event);
          }
          return;
        }
        onClick?.(event);
      }}
    />
  );
}
