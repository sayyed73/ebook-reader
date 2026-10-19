import type { Book, BookId } from './book';

/**
 * Ports: what the core needs from the runtime. Each platform (browser, Tauri) implements them.
 */

/** A file the user picked. Bytes are read lazily so oversized files can be rejected first. */
export interface PickedFile {
  readonly name: string;
  readonly sizeBytes: number;
  read(): Promise<Uint8Array>;
}

export interface FilePicker {
  /** Resolves to `null` when the user cancels. */
  pickBookFile(): Promise<PickedFile | null>;
}

export interface BookRepository {
  list(): Promise<Book[]>;
  get(id: BookId): Promise<Book | null>;
  getContent(id: BookId): Promise<string | null>;
  /** Adds a new book together with its HTML. */
  add(book: Book, content: string): Promise<void>;
  update(book: Book): Promise<void>;
}

/** A book's saved `localStorage` entries. */
export type StorageEntries = Readonly<Record<string, string>>;

export interface BookStorageRepository {
  load(id: BookId): Promise<StorageEntries>;
  save(id: BookId, entries: StorageEntries): Promise<void>;
}
