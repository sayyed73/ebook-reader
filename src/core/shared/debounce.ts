export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  /** Runs a pending call now. */
  flush(): void;
  cancel(): void;
}

/** Calls `fn` with the latest arguments once calls stop for `waitMs`. */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  waitMs: number,
): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: A | null = null;

  const run = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (pending === null) return;
    const args = pending;
    pending = null;
    fn(...args);
  };

  const debounced = (...args: A) => {
    pending = args;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(run, waitMs);
  };
  debounced.flush = run;
  debounced.cancel = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    pending = null;
  };
  return debounced;
}
