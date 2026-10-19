import type { BookId } from '../library/book';

/** Recorded while a book is open and the app is in the foreground. */
export interface OpenBookMarker {
  readonly bookId: BookId;
  readonly openedAt: number;
}

/** Small synchronous store for the marker; it must work while the app is shutting down. */
export interface RecoveryStore {
  read(): OpenBookMarker | null;
  write(marker: OpenBookMarker | null): void;
}

/**
 * Detects that the app stopped (froze, crashed or was force-quit) while a book was open: the
 * marker is set while reading and cleared whenever the app closes or goes to the background
 * normally. A marker found at startup means the last session didn't end normally; the user is
 * then offered to remove that book, so a book that freezes the app can't lock them out.
 */
export class RecoveryService {
  constructor(
    private readonly store: RecoveryStore,
    private readonly now: () => number = Date.now,
  ) {}

  /** The book that was open when the app last stopped unexpectedly, if any. Read once. */
  takeInterruptedBook(): BookId | null {
    const marker = this.safeRead();
    this.safeWrite(null);
    return marker?.bookId ?? null;
  }

  readingStarted(bookId: BookId): void {
    this.safeWrite({ bookId, openedAt: this.now() });
  }

  readingStopped(): void {
    this.safeWrite(null);
  }

  // Recovery is best effort: storage problems must never break reading.
  private safeRead(): OpenBookMarker | null {
    try {
      return this.store.read();
    } catch {
      return null;
    }
  }

  private safeWrite(marker: OpenBookMarker | null): void {
    try {
      this.store.write(marker);
    } catch {
      // ignored
    }
  }
}
