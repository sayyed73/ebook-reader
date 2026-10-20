import { useEffect, useRef, useState } from 'react';
import { useServices } from '@/app/services-context';
import type { BookId } from '@/core/library/book';
import type { OpenedBook } from '@/core/reader/reader-service';

export type OpenedBookState =
  | { readonly status: 'loading' }
  | { readonly status: 'not-found' }
  | { readonly status: 'error' }
  | { readonly status: 'open'; readonly opened: OpenedBook };

/**
 * Loads a book with its saved data and keeps that data flushed while the reader is open.
 * `onSaveError` is called when the book's data couldn't be saved.
 */
export function useOpenedBook(bookId: BookId, onSaveError: () => void): OpenedBookState {
  const { reader } = useServices();
  const [state, setState] = useState<OpenedBookState>({ status: 'loading' });
  const onSaveErrorRef = useRef(onSaveError);

  useEffect(() => {
    onSaveErrorRef.current = onSaveError;
  }, [onSaveError]);

  useEffect(() => {
    let active = true;
    const onSaveError = () => {
      if (active) onSaveErrorRef.current();
    };
    reader.open(bookId, { onSaveError }).then(
      (result) => {
        if (!active) return;
        setState(result.ok ? { status: 'open', opened: result.value } : { status: 'not-found' });
      },
      () => {
        if (active) setState({ status: 'error' });
      },
    );
    return () => {
      active = false;
    };
  }, [reader, bookId]);

  const storage = state.status === 'open' ? state.opened.storage : null;
  useFlushOnExit(storage ? () => storage.flush() : null);

  return state;
}

/**
 * Runs `flush` when the app goes to the background (mobile may then kill it without warning),
 * when the app closes (the desktop window waits for it), and when the component unmounts.
 */
export function useFlushOnExit(flush: (() => Promise<unknown>) | null): void {
  const { platform } = useServices();
  useEffect(() => {
    if (!flush) return;
    const flushIfHidden = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    document.addEventListener('visibilitychange', flushIfHidden);
    const stopOnClosing = platform.onAppClosing(flush);
    return () => {
      document.removeEventListener('visibilitychange', flushIfHidden);
      stopOnClosing();
      void flush();
    };
  }, [flush, platform]);
}
