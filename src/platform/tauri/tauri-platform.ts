import { convertFileSrc } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { Platform } from '../platform';
import { LocalRecoveryStore } from '../web/local-recovery-store';
import { onPageHide } from '../web/web-platform';
import { TauriBookRepository } from './tauri-book-repository';
import { TauriBookStorageRepository } from './tauri-book-storage-repository';
import { TauriFilePicker } from './tauri-file-picker';

/** Native runtime (Windows, macOS, Linux, iOS, Android) via Tauri 2. */
export function createTauriPlatform(): Platform {
  return {
    kind: 'tauri',
    filePicker: new TauriFilePicker(),
    books: new TauriBookRepository(),
    bookStorage: new TauriBookStorageRepository(),
    recovery: new LocalRecoveryStore(),
    // Served by the `bookframe` protocol (src-tauri/src/book_frame.rs). The URL form differs by
    // OS (bookframe://localhost/… or http://bookframe.localhost/…); Tauri picks the right one.
    bookFrameUrl: convertFileSrc('frame.html', 'bookframe'),
    onAppClosing: onWindowClosing,
  };
}

/** Desktop windows can close without a pagehide event, so also listen for the close request. */
function onWindowClosing(listener: () => void): () => void {
  const removePageHide = onPageHide(listener);
  const unlisten = getCurrentWindow()
    .onCloseRequested(listener)
    .catch(() => () => undefined);
  return () => {
    removePageHide();
    void unlisten.then((stop) => {
      stop();
    });
  };
}
