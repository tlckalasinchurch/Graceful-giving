import { useCallback, useState } from "react";

type State<C> = { key: string; cursor: C | null; history: Array<C | null> };

/**
 * Cursor paging for a server list that returns `nextCursor`.
 *
 * Pass the values that define the list (search text, filters, period). When
 * any value changes the list goes back to page 1 in the same render, so the
 * server is never asked for the new filter with the old cursor.
 */
export function useCursorPagination<C>(resetKeys: readonly unknown[]) {
  const key = JSON.stringify(resetKeys);
  const [state, setState] = useState<State<C>>({
    key,
    cursor: null,
    history: [],
  });
  const current: State<C> =
    state.key === key ? state : { key, cursor: null, history: [] };

  const next = useCallback(
    (nextCursor: C | null | undefined) => {
      if (!nextCursor) return;
      setState({
        key,
        cursor: nextCursor,
        history: [...current.history, current.cursor],
      });
    },
    [key, current.cursor, current.history]
  );

  const prev = useCallback(() => {
    if (current.history.length === 0) return;
    setState({
      key,
      cursor: current.history[current.history.length - 1],
      history: current.history.slice(0, -1),
    });
  }, [key, current.history]);

  return {
    cursor: current.cursor,
    /** Zero for the first page. */
    pageIndex: current.history.length,
    hasPrev: current.history.length > 0,
    next,
    prev,
  };
}
