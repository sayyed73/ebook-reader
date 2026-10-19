import type { ReadingPosition } from '@/core/library/book';

const REPORT_INTERVAL_MS = 500;

/** Reports the scroll position while reading (throttled) and once more when the page goes away. */
export function trackReadingPosition(
  win: Window,
  report: (position: ReadingPosition) => void,
): void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const send = () => {
    timer = null;
    report({ scrollY: win.scrollY });
  };
  win.addEventListener(
    'scroll',
    () => {
      timer ??= setTimeout(send, REPORT_INTERVAL_MS);
    },
    { passive: true },
  );
  win.addEventListener('pagehide', send);
}

/** Scrolls back to a saved position once the book has finished loading. */
export function restoreReadingPosition(win: Window, position: ReadingPosition | null): void {
  if (!position || position.scrollY === 0) return;
  win.addEventListener(
    'load',
    () => {
      // 'instant' overrides books that set `scroll-behavior: smooth`.
      win.scrollTo({ top: position.scrollY, behavior: 'instant' });
    },
    { once: true },
  );
}
