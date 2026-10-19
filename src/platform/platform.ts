import type { BookRepository, BookStorageRepository, FilePicker } from '@/core/library/ports';

/**
 * The runtime-specific services the app depends on. Each runtime (browser, Tauri) provides
 * one implementation; UI and core code only ever see this interface.
 */
export type PlatformKind = 'web' | 'tauri';

export interface Platform {
  readonly kind: PlatformKind;
  readonly filePicker: FilePicker;
  readonly books: BookRepository;
  readonly bookStorage: BookStorageRepository;
  /** URL of the isolated page that hosts a book (see docs/SECURITY.md). */
  readonly bookFrameUrl: string;
}
