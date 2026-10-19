import type { BookId } from '@/core/library/book';
import { LibraryService } from '@/core/library/library-service';
import { ReaderService } from '@/core/reader/reader-service';
import { RecoveryService } from '@/core/reader/recovery';
import type { Platform } from '@/platform/platform';

/** Everything the UI is allowed to use. Built once at startup from the platform adapter. */
export interface AppServices {
  readonly platform: Platform;
  readonly library: LibraryService;
  readonly reader: ReaderService;
  readonly recovery: RecoveryService;
  /** Book that was open when the app last stopped unexpectedly (read once at startup). */
  readonly interruptedBookId: BookId | null;
}

export function createServices(platform: Platform): AppServices {
  const library = new LibraryService({ books: platform.books, bookStorage: platform.bookStorage });
  const reader = new ReaderService(library, platform.bookStorage);
  const recovery = new RecoveryService(platform.recovery);
  return {
    platform,
    library,
    reader,
    recovery,
    interruptedBookId: recovery.takeInterruptedBook(),
  };
}
