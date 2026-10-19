import { useCallback, useMemo } from 'react';
import { useServices } from '@/app/services-context';
import type { BookId, ReadingPosition } from '@/core/library/book';
import { debounce } from '@/core/shared/debounce';
import { useFlushOnExit } from './use-opened-book';

const SAVE_DELAY_MS = 1000;

/** Returns a callback that saves the reading position (batched, and flushed on exit). */
export function useReadingPosition(bookId: BookId): (position: ReadingPosition) => void {
  const { library } = useServices();
  const save = useMemo(
    () =>
      debounce((position: ReadingPosition) => {
        // Losing a scroll position is harmless, so failures are ignored.
        library.savePosition(bookId, position).catch(() => undefined);
      }, SAVE_DELAY_MS),
    [library, bookId],
  );
  const flush = useCallback(() => {
    save.flush();
  }, [save]);
  useFlushOnExit(flush);
  return save;
}
