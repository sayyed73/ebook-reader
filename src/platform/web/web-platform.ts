import type { Platform } from '../platform';
import { openDatabase } from './indexed-db';
import { LocalRecoveryStore } from './local-recovery-store';
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
    recovery: new LocalRecoveryStore(),
    bookFrameUrl: '/frame.html',
    onAppClosing: onPageHide,
  };
}

export function onPageHide(listener: () => void): () => void {
  window.addEventListener('pagehide', listener);
  return () => {
    window.removeEventListener('pagehide', listener);
  };
}
