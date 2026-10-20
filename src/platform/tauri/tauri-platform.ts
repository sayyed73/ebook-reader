import { convertFileSrc } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { AppClosingListener, Platform } from '../platform';
import { LocalRecoveryStore } from '../web/local-recovery-store';
import { onPageHide } from '../web/web-platform';
import { TauriBookRepository } from './tauri-book-repository';
import { TauriBookStorageRepository } from './tauri-book-storage-repository';
import { TauriFilePicker } from './tauri-file-picker';

/** Longest time closing the window waits for listeners (e.g. saving the open book). */
const CLOSE_WAIT_LIMIT_MS = 2000;

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
    onAppClosing: createWindowClosing(),
  };
}

/**
 * Desktop windows can close without a pagehide event, so the window's close request is used too.
 * One handler serves all listeners: it waits for them (capped), then lets Tauri close the window.
 * While any JS close handler exists Tauri leaves the closing to it, which needs the
 * `core:window:allow-destroy` permission (capabilities/default.json).
 */
function createWindowClosing(): (listener: AppClosingListener) => () => void {
  const listeners = new Set<AppClosingListener>();
  let stopListening: Promise<() => void> | null = null;

  const runListeners = async () => {
    const work = Promise.allSettled([...listeners].map((listener) => Promise.resolve(listener())));
    const limit = new Promise((resolve) => setTimeout(resolve, CLOSE_WAIT_LIMIT_MS));
    await Promise.race([work, limit]);
  };

  return (listener) => {
    listeners.add(listener);
    const removePageHide = onPageHide(listener);
    stopListening ??= getCurrentWindow()
      .onCloseRequested(runListeners)
      .catch(() => () => undefined);
    return () => {
      removePageHide();
      listeners.delete(listener);
      if (listeners.size === 0 && stopListening) {
        const stop = stopListening;
        stopListening = null;
        void stop.then((unlisten) => {
          unlisten();
        });
      }
    };
  };
}
