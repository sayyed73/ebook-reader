import { useCallback, useEffect, useState } from 'react';
import { useServices } from '@/app/services-context';
import type { Book, BookId } from '@/core/library/book';
import { describeImportError } from './import-errors';

export interface LibraryState {
  readonly books: readonly Book[] | null;
  readonly importing: boolean;
  readonly error: string | null;
  readonly importBook: () => Promise<BookId | null>;
  readonly dismissError: () => void;
}

export function useLibrary(): LibraryState {
  const { library, platform } = useServices();
  const [books, setBooks] = useState<readonly Book[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    library.list().then(
      (list) => {
        if (active) setBooks(list);
      },
      () => {
        if (active) {
          setBooks([]);
          setError("Your library couldn't be loaded.");
        }
      },
    );
    return () => {
      active = false;
    };
  }, [library]);

  const importBook = useCallback(async (): Promise<BookId | null> => {
    setError(null);
    setImporting(true);
    try {
      const file = await platform.filePicker.pickBookFile();
      if (!file) return null;
      const result = await library.importFile(file);
      if (!result.ok) {
        setError(describeImportError(result.error));
        return null;
      }
      setBooks((current) => [result.value, ...(current ?? [])]);
      return result.value.id;
    } catch {
      setError('Something went wrong while adding the book. Please try again.');
      return null;
    } finally {
      setImporting(false);
    }
  }, [library, platform]);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  return { books, importing, error, importBook, dismissError };
}
