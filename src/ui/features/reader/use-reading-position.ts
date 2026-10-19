import { useMemo } from 'react';
import { useServices } from '@/app/services-context';
import type { BookId, ReadingPosition } from '@/core/library/book';
import type { LibraryService } from '@/core/library/library-service';
import { debounce } from '@/core/shared/debounce';
import { useFlushOnExit } from './use-opened-book';

const SAVE_DELAY_MS = 1000;

export interface ReadingPositionSaver {
  /** Records a position; saved in batches. */
  readonly save: (position: ReadingPosition) => void;
  /** Saves a pending position now and resolves when it is stored. */
  readonly flush: () => Promise<void>;
}

function createPositionSaver(library: LibraryService, bookId: BookId): ReadingPositionSaver {
  let lastSave: Promise<void> = Promise.resolve();
  const save = debounce((position: ReadingPosition) => {
    // Losing a scroll position is harmless, so failures are ignored.
    lastSave = library.savePosition(bookId, position).catch(() => undefined);
  }, SAVE_DELAY_MS);
  return {
    save,
    flush: () => {
      save.flush();
      return lastSave;
    },
  };
}

/** Saves the reading position (batched, and flushed on exit). */
export function useReadingPosition(bookId: BookId): ReadingPositionSaver {
  const { library } = useServices();
  const saver = useMemo(() => createPositionSaver(library, bookId), [library, bookId]);
  useFlushOnExit(saver.flush);
  return saver;
}
