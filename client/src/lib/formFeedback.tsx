import { useCallback, useState } from "react";
import { toast } from "sonner";

/**
 * One notification pattern for forms and form-like actions.
 *
 * Each form owns one toast slot, keyed by `formKey`. A new message for the
 * same form replaces the one on screen instead of stacking under it, so:
 * - repeated taps on a failing submit show one message, not one per tap;
 * - a success replaces the validation or request error that came before it.
 *
 * When a page confirms success with its own dialog, call `formToast.clear`
 * instead of `formToast.success`, so the person does not get two confirmations.
 */
type ToastOptions = Parameters<typeof toast.success>[1];

export const formToastId = (formKey: string) => `form:${formKey}`;

export const formToast = {
  error(formKey: string, message: string, options?: ToastOptions) {
    toast.error(message, { ...options, id: formToastId(formKey) });
  },
  success(formKey: string, message: string, options?: ToastOptions) {
    toast.success(message, { ...options, id: formToastId(formKey) });
  },
  clear(formKey: string) {
    // Optional call: unit tests mock sonner with only success/error.
    toast.dismiss?.(formToastId(formKey));
  },
};

/** Move focus to a field and scroll it to the middle of the screen. */
export function focusInvalidField(elementId: string) {
  if (typeof document === "undefined") return;
  focusElement(document.getElementById(elementId));
}

/** Same as focusInvalidField, for a page that already holds a ref. */
export function focusElement(el: HTMLElement | null | undefined) {
  if (!el) return;
  el.focus({ preventScroll: true });
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  // jsdom does not implement scrollIntoView.
  el.scrollIntoView?.({
    block: "center",
    behavior: reduceMotion ? "auto" : "smooth",
  });
}

export const fieldErrorId = (fieldId: string) => `${fieldId}-error`;

type ConstrainedElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

/**
 * Thai message for the browser's own constraint check (required, min, max,
 * step, maxLength, type="email" …) on one control, or undefined when it
 * passes. Forms that set `noValidate` call this so the rules written as HTML
 * attributes still apply, with a Thai message instead of the browser bubble.
 */
export function nativeValidationMessage(
  el: Element | null
): string | undefined {
  if (
    !el ||
    !("validity" in el) ||
    typeof (el as ConstrainedElement).checkValidity !== "function"
  )
    return undefined;
  const field = el as ConstrainedElement;
  if (field.disabled || field.validity.valid) return undefined;
  const v = field.validity;
  const input = field as HTMLInputElement;
  if (v.valueMissing)
    return field instanceof HTMLSelectElement
      ? "กรุณาเลือกรายการในช่องนี้"
      : "กรุณากรอกข้อมูลในช่องนี้";
  if (v.badInput) return "กรุณากรอกตัวเลขให้ถูกต้อง";
  if (v.rangeUnderflow) return `ค่าต้องไม่น้อยกว่า ${input.min}`;
  if (v.rangeOverflow) return `ค่าต้องไม่เกิน ${input.max}`;
  if (v.stepMismatch) return `กรุณาระบุค่าเป็นทวีคูณของ ${input.step}`;
  if (v.tooShort)
    return `กรุณากรอกอย่างน้อย ${(field as HTMLInputElement).minLength} ตัวอักษร`;
  if (v.tooLong)
    return `กรุณากรอกไม่เกิน ${(field as HTMLInputElement).maxLength} ตัวอักษร`;
  if (v.typeMismatch)
    return input.type === "email"
      ? "รูปแบบอีเมลไม่ถูกต้อง"
      : input.type === "url"
        ? "รูปแบบลิงก์ไม่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)"
        : "รูปแบบข้อมูลไม่ถูกต้อง";
  return "รูปแบบข้อมูลไม่ถูกต้อง";
}

/**
 * Inline field errors for one form.
 *
 * `fieldIds` maps each field name to the DOM id of its control, in the order
 * the fields appear on screen. `report` takes the page's own rules, adds the
 * browser's HTML-attribute rules for any field the page did not flag, shows
 * every error inline, puts the first one in the form's toast slot, and
 * focuses that field.
 */
export function useFieldErrors<K extends string>(
  formKey: string,
  fieldIds: Record<K, string>
) {
  const [errors, setErrors] = useState<Partial<Record<K, string>>>({});

  const report = useCallback(
    (pageRules: Partial<Record<K, string>>): boolean => {
      const next: Partial<Record<K, string>> = {};
      for (const field of Object.keys(fieldIds) as K[]) {
        next[field] =
          pageRules[field] ??
          (typeof document === "undefined"
            ? undefined
            : nativeValidationMessage(
                document.getElementById(fieldIds[field])
              ));
      }
      setErrors(next);
      const first = (Object.keys(fieldIds) as K[]).find(k => next[k]);
      if (!first) return true;
      formToast.error(formKey, next[first] as string);
      focusInvalidField(fieldIds[first]);
      return false;
    },
    // fieldIds is a literal at each call site; its values never change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formKey]
  );

  const clearField = useCallback((field: K) => {
    setErrors(current =>
      current[field] ? { ...current, [field]: undefined } : current
    );
  }, []);

  const reset = useCallback(() => setErrors({}), []);

  /** aria wiring for the control of `field`. */
  const invalidProps = (field: K) => ({
    "aria-invalid": errors[field] ? (true as const) : undefined,
    "aria-describedby": errors[field]
      ? fieldErrorId(fieldIds[field])
      : undefined,
  });

  return { errors, report, clearField, reset, invalidProps };
}

/**
 * Thai inline message under a field. Renders nothing without a message.
 * A block <span>, not a <p>, so it is valid inside a <label>.
 */
export function FieldError({
  fieldId,
  message,
}: {
  fieldId: string;
  message?: string;
}) {
  if (!message) return null;
  return (
    <span
      id={fieldErrorId(fieldId)}
      role="alert"
      className="mt-1.5 block text-sm font-bold text-danger"
    >
      {message}
    </span>
  );
}
