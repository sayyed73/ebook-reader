import { LibraryService } from '@/core/library/library-service';
import { ReaderService } from '@/core/reader/reader-service';
import type { Platform } from '@/platform/platform';

/** Everything the UI is allowed to use. Built once at startup from the platform adapter. */
export interface AppServices {
  readonly platform: Platform;
  readonly library: LibraryService;
  readonly reader: ReaderService;
}

export function createServices(platform: Platform): AppServices {
  const library = new LibraryService({ books: platform.books });
  const reader = new ReaderService(library, platform.bookStorage, (error) => {
    // Never log book contents; the error itself carries no book data.
    console.error('Saving book data failed', error);
  });
  return { platform, library, reader };
}
