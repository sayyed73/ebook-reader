import { sha256Hex } from '../shared/hash';
import { err, ok, type Result } from '../shared/result';
import {
  isValidPosition,
  withBookDefaults,
  type Book,
  type BookId,
  type ReadingPosition,
} from './book';
import { checkBookFileMeta, decodeBookHtml, extractTitle, type BookFileError } from './book-file';
import type { BookRepository, BookStorageRepository, PickedFile } from './ports';

export type ImportError = BookFileError | { readonly kind: 'read-failed' };

/** A validated file waiting for the user to decide how to add it. */
export interface PendingImport {
  readonly title: string;
  readonly fileName: string;
  readonly sizeBytes: number;
  readonly contentHash: string;
  readonly html: string;
}

export type ImportOutcome =
  | { readonly kind: 'added'; readonly book: Book }
  /** The exact same file is already in the library. */
  | { readonly kind: 'already-in-library'; readonly book: Book }
  /** A different version of a book with the same name or title exists: ask the user. */
  | { readonly kind: 'conflict'; readonly existing: Book; readonly pending: PendingImport };

export interface LibraryServiceDeps {
  readonly books: BookRepository;
  readonly bookStorage: BookStorageRepository;
  readonly now?: () => number;
  readonly newId?: () => BookId;
}

type BookPatch = Partial<Pick<Book, 'lastOpenedAt' | 'position'>>;

/** Library use cases: importing, listing, updating and deleting books. */
export class LibraryService {
  private readonly books: BookRepository;
  private readonly bookStorage: BookStorageRepository;
  private readonly now: () => number;
  private readonly newId: () => BookId;
  /** Metadata writes run one at a time so read-modify-write updates can't interleave. */
  private writes: Promise<unknown> = Promise.resolve();

  constructor(deps: LibraryServiceDeps) {
    this.books = deps.books;
    this.bookStorage = deps.bookStorage;
    this.now = deps.now ?? Date.now;
    this.newId = deps.newId ?? (() => crypto.randomUUID());
  }

  async importFile(file: PickedFile): Promise<Result<ImportOutcome, ImportError>> {
    const pending = await this.prepareImport(file);
    if (!pending.ok) return pending;

    const books = await this.list();
    const identical = books.find((b) => b.contentHash === pending.value.contentHash);
    if (identical) return ok({ kind: 'already-in-library', book: identical });

    const sameName = books.find((b) => isSameBookName(b, pending.value));
    if (sameName) return ok({ kind: 'conflict', existing: sameName, pending: pending.value });

    return ok({ kind: 'added', book: await this.addAsNew(pending.value) });
  }

  async addAsNew(pending: PendingImport): Promise<Book> {
    const book: Book = {
      id: this.newId(),
      title: pending.title,
      fileName: pending.fileName,
      sizeBytes: pending.sizeBytes,
      contentHash: pending.contentHash,
      importedAt: this.now(),
      lastOpenedAt: null,
      position: null,
    };
    await this.books.add(book, pending.html);
    return book;
  }

  /**
   * Swaps in a new version of an existing book. Its id, saved data (progress) and reading position
   * are kept.
   */
  replace(id: BookId, pending: PendingImport): Promise<Book | null> {
    return this.serialize(async () => {
      const existing = await this.get(id);
      if (!existing) return null;
      const book: Book = {
        ...existing,
        title: pending.title,
        fileName: pending.fileName,
        sizeBytes: pending.sizeBytes,
        contentHash: pending.contentHash,
      };
      await this.books.replace(book, pending.html);
      return book;
    });
  }

  /** Removes the book and everything saved for it. */
  delete(id: BookId): Promise<void> {
    return this.serialize(async () => {
      await this.books.delete(id);
      await this.bookStorage.delete(id);
    });
  }

  /** Most recently opened (or imported) first. */
  async list(): Promise<Book[]> {
    const books = (await this.books.list()).map(withBookDefaults);
    const recency = (b: Book) => b.lastOpenedAt ?? b.importedAt;
    return books.sort((a, b) => recency(b) - recency(a));
  }

  async get(id: BookId): Promise<Book | null> {
    const book = await this.books.get(id);
    return book ? withBookDefaults(book) : null;
  }

  getContent(id: BookId): Promise<string | null> {
    return this.books.getContent(id);
  }

  markOpened(id: BookId): Promise<Book | null> {
    return this.patch(id, { lastOpenedAt: this.now() });
  }

  async savePosition(id: BookId, position: ReadingPosition): Promise<void> {
    if (!isValidPosition(position)) return;
    await this.patch(id, { position: { scrollY: Math.round(position.scrollY) } });
  }

  /** Read-modify-write by id, serialized so concurrent updates of different fields both apply. */
  private patch(id: BookId, patch: BookPatch): Promise<Book | null> {
    return this.serialize(async () => {
      const current = await this.get(id);
      if (!current) return null;
      const updated = { ...current, ...patch };
      await this.books.update(updated);
      return updated;
    });
  }

  private serialize<T>(work: () => Promise<T>): Promise<T> {
    const result = this.writes.then(work, work);
    this.writes = result.catch(() => undefined);
    return result;
  }

  private async prepareImport(file: PickedFile): Promise<Result<PendingImport, ImportError>> {
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

    return ok({
      title: extractTitle(decoded.value, file.name),
      fileName: file.name,
      sizeBytes: bytes.length,
      contentHash: await sha256Hex(bytes),
      html: decoded.value,
    });
  }
}

function isSameBookName(book: Book, pending: PendingImport): boolean {
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  return same(book.fileName, pending.fileName) || same(book.title, pending.title);
}
