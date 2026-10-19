export type BookId = string;

/** Where the reader was in a book, restored when the book is opened again. */
export interface ReadingPosition {
  readonly scrollY: number;
}

/** Metadata for a book in the library. The HTML itself is stored separately (it can be large). */
export interface Book {
  readonly id: BookId;
  readonly title: string;
  readonly fileName: string;
  readonly sizeBytes: number;
  /** SHA-256 of the file bytes, hex. Used to recognise re-imports of the same file. */
  readonly contentHash: string;
  readonly importedAt: number;
  readonly lastOpenedAt: number | null;
  readonly position: ReadingPosition | null;
}

/**
 * Normalizes a stored record: fills fields added after it was first stored and drops fields that
 * no longer exist, so older records stay readable.
 */
export function withBookDefaults(stored: Omit<Book, 'position'> & Partial<Book>): Book {
  return {
    id: stored.id,
    title: stored.title,
    fileName: stored.fileName,
    sizeBytes: stored.sizeBytes,
    contentHash: stored.contentHash,
    importedAt: stored.importedAt,
    lastOpenedAt: stored.lastOpenedAt,
    position: stored.position ?? null,
  };
}

/** Upper bound for a stored scroll offset; anything larger is treated as invalid. */
const MAX_SCROLL_Y = 10_000_000;

export function isValidPosition(position: ReadingPosition): boolean {
  return (
    Number.isFinite(position.scrollY) && position.scrollY >= 0 && position.scrollY <= MAX_SCROLL_Y
  );
}
