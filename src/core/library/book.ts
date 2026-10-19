export type BookId = string;

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
  /** When true the book is shown with its scripts disabled. */
  readonly safeMode: boolean;
}
