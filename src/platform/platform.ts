import type { BookRepository, BookStorageRepository, FilePicker } from '@/core/library/ports';
import type { RecoveryStore } from '@/core/reader/recovery';

/**
 * The runtime-specific services the app depends on. Each runtime (browser, Tauri) provides
 * one implementation; UI and core code only ever see this interface.
 */
export type PlatformKind = 'web' | 'tauri';

/** May return a promise (e.g. a pending save) for the close to wait on. */
export type AppClosingListener = () => unknown;

export interface Platform {
  readonly kind: PlatformKind;
  readonly filePicker: FilePicker;
  readonly books: BookRepository;
  readonly bookStorage: BookStorageRepository;
  readonly recovery: RecoveryStore;
  /** URL of the isolated page that hosts a book (see docs/SECURITY.md). */
  readonly bookFrameUrl: string;
  /**
   * Calls `listener` when the app is about to close normally; where the platform allows it, the
   * close waits (briefly) for a returned promise, e.g. a pending save. Returns an unsubscribe
   * function. (A frozen app can't run it, which is how unexpected exits are detected.)
   */
  onAppClosing(listener: AppClosingListener): () => void;
}
