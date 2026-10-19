import { sha256Hex } from '../shared/hash';
import { err, ok, type Result } from '../shared/result';
import type { Book, BookId } from './book';
import { checkBookFileMeta, decodeBookHtml, extractTitle, type BookFileError } from './book-file';
import type { BookRepository, PickedFile } from './ports';

export type ImportError = BookFileError | { readonly kind: 'read-failed' };

export interface LibraryServiceDeps {
  readonly books: BookRepository;
  readonly now?: () => number;
  readonly newId?: () => BookId;
}

/** Library use cases: importing, listing and updating books. */
export class LibraryService {
  private readonly books: BookRepository;
  private readonly now: () => number;
  private readonly newId: () => BookId;

  constructor(deps: LibraryServiceDeps) {
    this.books = deps.books;
    this.now = deps.now ?? Date.now;
    this.newId = deps.newId ?? (() => crypto.randomUUID());
  }

  async importFile(file: PickedFile): Promise<Result<Book, ImportError>> {
    const meta = checkBookFileMeta(file.name, file.sizeBytes);
    if (!meta.ok) return meta;

    let bytes: Uint8Array;
    try {
      bytes = await file.read();
    } catch {
      return err({ kind: 'read-failed' });
    }
    // The picker's reported size is a hint; enforce limits on what was actually read.
    const actual = checkBookFileMeta(file.name, bytes.length);
    if (!actual.ok) return actual;

    const decoded = decodeBookHtml(bytes);
    if (!decoded.ok) return decoded;

    const book: Book = {
      id: this.newId(),
      title: extractTitle(decoded.value, file.name),
      fileName: file.name,
      sizeBytes: bytes.length,
      contentHash: await sha256Hex(bytes),
      importedAt: this.now(),
      lastOpenedAt: null,
      safeMode: false,
    };
    await this.books.add(book, decoded.value);
    return ok(book);
  }

  /** Most recently opened (or imported) first. */
  async list(): Promise<Book[]> {
    const books = await this.books.list();
    const recency = (b: Book) => b.lastOpenedAt ?? b.importedAt;
    return books.sort((a, b) => recency(b) - recency(a));
  }

  get(id: BookId): Promise<Book | null> {
    return this.books.get(id);
  }

  getContent(id: BookId): Promise<string | null> {
    return this.books.getContent(id);
  }

  async markOpened(book: Book): Promise<Book> {
    const updated = { ...book, lastOpenedAt: this.now() };
    await this.books.update(updated);
    return updated;
  }

  async setSafeMode(book: Book, safeMode: boolean): Promise<Book> {
    const updated = { ...book, safeMode };
    await this.books.update(updated);
    return updated;
  }
}
