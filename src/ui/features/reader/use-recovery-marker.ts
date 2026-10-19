import { useEffect } from 'react';
import { useServices } from '@/app/services-context';
import type { BookId } from '@/core/library/book';

/**
 * Marks the book as "being read" while it is open and the app is in the foreground. Normal
 * exits (closing the reader or the app, going to the background) clear the mark; if the app
 * freezes or crashes it stays, and the next launch offers to remove the book.
 */
export function useRecoveryMarker(bookId: BookId): void {
  const { recovery, platform } = useServices();

  useEffect(() => {
    const sync = () => {
      if (document.visibilityState === 'hidden') recovery.readingStopped();
      else recovery.readingStarted(bookId);
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    const stopListening = platform.onAppClosing(() => {
      recovery.readingStopped();
    });
    return () => {
      document.removeEventListener('visibilitychange', sync);
      stopListening();
      recovery.readingStopped();
    };
  }, [recovery, platform, bookId]);
}
