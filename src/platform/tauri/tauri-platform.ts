import type { Platform } from '../platform';
import { createWebPlatform } from '../web/web-platform';

/**
 * Native runtime (Windows, macOS, Linux, iOS, Android) via Tauri 2.
 *
 * Until Phase 4 this reuses the browser adapter: storage lives in the WebView's IndexedDB and
 * the frame page comes from the dev server. Phase 4 replaces these with native file picking,
 * app-data storage and a dedicated frame protocol (required for production builds).
 */
export function createTauriPlatform(): Platform {
  return { ...createWebPlatform(), kind: 'tauri' };
}
