import type { Platform } from '../platform';
import { openDatabase } from './indexed-db';
import { WebBookRepository } from './web-book-repository';
import { WebBookStorageRepository } from './web-book-storage-repository';
import { WebFilePicker } from './web-file-picker';

/** Browser runtime: used for development and automated tests. */
export function createWebPlatform(): Platform {
  const db = openDatabase();
  return {
    kind: 'web',
    filePicker: new WebFilePicker(),
    books: new WebBookRepository(db),
    bookStorage: new WebBookStorageRepository(db),
    bookFrameUrl: '/frame.html',
  };
}
