import { useCallback, useEffect, useState } from 'react';
import { useServices } from '@/app/services-context';
import type { Book, BookId } from '@/core/library/book';
import type { PendingImport } from '@/core/library/library-service';
import { describeImportError } from './import-errors';

export interface ImportConflict {
  readonly existing: Book;
  readonly pending: PendingImport;
}

export type ConflictChoice = 'replace' | 'keep-both' | 'cancel';

export interface LibraryState {
  readonly books: readonly Book[] | null;
  readonly busy: boolean;
  readonly error: string | null;
  /** Set while the user must decide how to add a book whose name is already in the library. */
  readonly conflict: ImportConflict | null;
  /** Resolves to the id of the book to open, or null when there is nothing to open. */
  readonly importBook: () => Promise<BookId | null>;
  readonly resolveConflict: (choice: ConflictChoice) => Promise<BookId | null>;
  readonly deleteBook: (id: BookId) => Promise<void>;
  readonly dismissError: () => void;
}

export function useLibrary(): LibraryState {
  const { library, platform } = useServices();
  const [books, setBooks] = useState<readonly Book[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ImportConflict | null>(null);

  const refresh = useCallback(async () => {
    setBooks(await library.list());
  }, [library]);

  useEffect(() => {
    let active = true;
    library.list().then(
      (list) => {
        if (active) setBooks(list);
      },
      () => {
        if (active) {
          setBooks([]);
          setError("Your library couldn't be loaded. Try restarting the app.");
        }
      },
    );
    return () => {
      active = false;
    };
  }, [library]);

  /** Runs a library action with a busy flag and a generic error message on failure. */
  const run = useCallback(
    async <T>(action: () => Promise<T>, failure: string): Promise<T | null> => {
      setError(null);
      setBusy(true);
      try {
        return await action();
      } catch {
        setError(failure);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const importBook = useCallback(
    () =>
      run(async () => {
        const file = await platform.filePicker.pickBookFile();
        if (!file) return null;
        const result = await library.importFile(file);
        if (!result.ok) {
          setError(describeImportError(result.error));
          return null;
        }
        const outcome = result.value;
        switch (outcome.kind) {
          case 'added':
            await refresh();
            return outcome.book.id;
          case 'already-in-library':
            return outcome.book.id;
          case 'conflict':
            setConflict({ existing: outcome.existing, pending: outcome.pending });
            return null;
        }
      }, 'Something went wrong while adding the book. Please try again.'),
    [run, platform, library, refresh],
  );

  const resolveConflict = useCallback(
    async (choice: ConflictChoice) => {
      const current = conflict;
      setConflict(null);
      if (!current || choice === 'cancel') return null;
      return run(async () => {
        const book =
          choice === 'replace'
            ? await library.replace(current.existing.id, current.pending)
            : await library.addAsNew(current.pending);
        await refresh();
        return book?.id ?? null;
      }, 'Something went wrong while adding the book. Please try again.');
    },
    [conflict, run, library, refresh],
  );

  const deleteBook = useCallback(
    async (id: BookId) => {
      await run(async () => {
        await library.delete(id);
        await refresh();
      }, "The book couldn't be deleted. Please try again.");
    },
    [run, library, refresh],
  );

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  return { books, busy, error, conflict, importBook, resolveConflict, deleteBook, dismissError };
}
