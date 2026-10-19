import type { BookId } from '../library/book';
import type { BookStorageRepository, StorageEntries } from '../library/ports';
import type { StorageMessage } from './frame-protocol';
import { STORAGE_QUOTA_BYTES, entryBytes, totalBytes } from './storage-quota';

export interface BookStorageSessionOptions {
  /** Writes are batched and saved after this quiet period. */
  readonly saveDelayMs?: number;
  readonly quotaBytes?: number;
  readonly onSaveError?: (error: unknown) => void;
}

/**
 * Host-side copy of one open book's localStorage. Applies validated storage messages from the
 * frame, enforces the quota independently of the frame, and persists changes in batches.
 */
export class BookStorageSession {
  private readonly entries: Map<string, string>;
  private bytes: number;
  private readonly saveDelayMs: number;
  private readonly quotaBytes: number;
  private readonly onSaveError: (error: unknown) => void;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;
  private saving: Promise<void> = Promise.resolve();

  constructor(
    private readonly bookId: BookId,
    initial: StorageEntries,
    private readonly repository: BookStorageRepository,
    options: BookStorageSessionOptions = {},
  ) {
    this.entries = new Map(Object.entries(initial));
    this.bytes = totalBytes(this.entries);
    this.saveDelayMs = options.saveDelayMs ?? 250;
    this.quotaBytes = options.quotaBytes ?? STORAGE_QUOTA_BYTES;
    this.onSaveError = options.onSaveError ?? (() => undefined);
  }

  /** Returns false when the change was rejected (over quota). */
  apply(message: StorageMessage): boolean {
    switch (message.type) {
      case 'storage-set': {
        const previous = this.entries.get(message.key);
        const previousBytes = previous === undefined ? 0 : entryBytes(message.key, previous);
        const nextBytes = this.bytes - previousBytes + entryBytes(message.key, message.value);
        if (nextBytes > this.quotaBytes) return false;
        if (previous === message.value) return true;
        this.entries.set(message.key, message.value);
        this.bytes = nextBytes;
        break;
      }
      case 'storage-remove': {
        const previous = this.entries.get(message.key);
        if (previous === undefined) return true;
        this.entries.delete(message.key);
        this.bytes -= entryBytes(message.key, previous);
        break;
      }
      case 'storage-clear':
        if (this.entries.size === 0) return true;
        this.entries.clear();
        this.bytes = 0;
        break;
    }
    this.markDirty();
    return true;
  }

  snapshot(): Record<string, string> {
    return Object.fromEntries(this.entries);
  }

  /** Saves pending changes now. */
  flush(): Promise<void> {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.dirty) return this.saving;
    this.dirty = false;
    const entries = this.snapshot();
    // Saves are chained so an older snapshot can never overwrite a newer one.
    this.saving = this.saving
      .then(() => this.repository.save(this.bookId, entries))
      .catch((error: unknown) => {
        this.onSaveError(error);
      });
    return this.saving;
  }

  private markDirty(): void {
    this.dirty = true;
    if (this.timer !== null) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.saveDelayMs);
  }
}
