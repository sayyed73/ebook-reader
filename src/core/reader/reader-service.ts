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

/** Reader use cases: opening a book with its saved data. */
export class ReaderService {
  constructor(
    private readonly library: LibraryService,
    private readonly bookStorage: BookStorageRepository,
    private readonly onSaveError: (error: unknown) => void = () => undefined,
  ) {}

  async open(id: BookId): Promise<Result<OpenedBook, OpenBookError>> {
    const [book, html, entries] = await Promise.all([
      this.library.get(id),
      this.library.getContent(id),
      this.bookStorage.load(id),
    ]);
    if (!book || html === null) return err({ kind: 'not-found' });

    const opened = await this.library.markOpened(book);
    const storage = new BookStorageSession(id, entries, this.bookStorage, {
      onSaveError: this.onSaveError,
    });
    return ok({ book: opened, html, storage });
  }
}
