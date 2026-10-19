import type { Book, BookId } from '../library/book';
import type { LibraryService } from '../library/library-service';
import type { BookStorageRepository } from '../library/ports';
import { err, ok, type Result } from '../shared/result';
import { BookStorageSession } from './book-storage-session';

export interface OpenedBook {
  readonly book: Book;
  readonly html: string;
  readonly storage: BookStorageSession;
}

export type OpenBookError = { readonly kind: 'not-found' };

export interface OpenBookOptions {
  /** Called when the book's saved data couldn't be written. */
  readonly onSaveError?: (error: unknown) => void;
}

/** Reader use cases: opening a book with its saved data. */
export class ReaderService {
  constructor(
    private readonly library: LibraryService,
    private readonly bookStorage: BookStorageRepository,
  ) {}

  async open(
    id: BookId,
    options: OpenBookOptions = {},
  ): Promise<Result<OpenedBook, OpenBookError>> {
    const [html, entries] = await Promise.all([
      this.library.getContent(id),
      this.bookStorage.load(id),
    ]);
    if (html === null) return err({ kind: 'not-found' });
    const book = await this.library.markOpened(id);
    if (!book) return err({ kind: 'not-found' });

    const storage = new BookStorageSession(id, entries, this.bookStorage, {
      ...(options.onSaveError ? { onSaveError: options.onSaveError } : {}),
    });
    return ok({ book, html, storage });
  }
}
