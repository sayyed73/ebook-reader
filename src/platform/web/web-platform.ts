import type { AppClosingListener, Platform } from '../platform';
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

/** Browsers can't delay closing a page, so async work started here is best effort. */
export function onPageHide(listener: AppClosingListener): () => void {
  const handle = () => {
    void listener();
  };
  window.addEventListener('pagehide', handle);
  return () => {
    window.removeEventListener('pagehide', handle);
  };
}
