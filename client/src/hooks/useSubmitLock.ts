import { useCallback, useRef } from "react";

/**
 * Blocks a second submit while the first is still on its way.
 *
 * A button that is disabled while a request runs is not enough: the disabled
 * state is applied after the next render, so two clicks that arrive in the
 * same instant can both send the request. That saves a gift, an expense or a
 * withdrawal twice. This lock is a ref, so it takes effect at once.
 *
 *   const { lock, unlock } = useSubmitLock();
 *   const save = trpc.x.create.useMutation({ onSettled: unlock });
 *   const submit = () => { if (!lock()) return; save.mutate(...); };
 *
 * Call `lock()` only after the form has passed its checks, so a form that
 * failed a check can be sent again.
 */
export function useSubmitLock() {
  const busy = useRef(false);
  const lock = useCallback(() => {
    if (busy.current) return false;
    busy.current = true;
    return true;
  }, []);
  const unlock = useCallback(() => {
    busy.current = false;
  }, []);
  return { lock, unlock };
}
