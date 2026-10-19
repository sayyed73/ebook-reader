import type { OpenBookMarker, RecoveryStore } from '@/core/reader/recovery';

const KEY = 'reader.open-book';

/** Keeps the recovery marker in the app's own localStorage (synchronous, survives restarts). */
export class LocalRecoveryStore implements RecoveryStore {
  constructor(private readonly storage: Storage = window.localStorage) {}

  read(): OpenBookMarker | null {
    const raw = this.storage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OpenBookMarker> | null;
    return typeof parsed?.bookId === 'string' && typeof parsed.openedAt === 'number'
      ? { bookId: parsed.bookId, openedAt: parsed.openedAt }
      : null;
  }

  write(marker: OpenBookMarker | null): void {
    if (marker) this.storage.setItem(KEY, JSON.stringify(marker));
    else this.storage.removeItem(KEY);
  }
}
