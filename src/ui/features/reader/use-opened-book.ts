import { useEffect, useState } from 'react';
import { useServices } from '@/app/services-context';
import type { BookId } from '@/core/library/book';
import type { OpenedBook } from '@/core/reader/reader-service';

export type OpenedBookState =
  | { readonly status: 'loading' }
  | { readonly status: 'not-found' }
  | { readonly status: 'error' }
  | { readonly status: 'open'; readonly opened: OpenedBook };

/** Loads a book with its saved data and keeps that data flushed while the reader is open. */
export function useOpenedBook(bookId: BookId): OpenedBookState {
  const { reader } = useServices();
  const [state, setState] = useState<OpenedBookState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    reader.open(bookId).then(
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
  useEffect(() => {
    if (!storage) return;
    // Save promptly when the app goes to the background (mobile may kill it without warning).
    const flushIfHidden = () => {
      if (document.visibilityState === 'hidden') void storage.flush();
    };
    const flush = () => void storage.flush();
    document.addEventListener('visibilitychange', flushIfHidden);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', flushIfHidden);
      window.removeEventListener('pagehide', flush);
      void storage.flush();
    };
  }, [storage]);

  return state;
}
