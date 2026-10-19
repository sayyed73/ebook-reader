import type { Platform } from '../platform';

/** Native runtime (Windows, macOS, Linux, iOS, Android) via Tauri 2. */
export function createTauriPlatform(): Platform {
  return { kind: 'tauri' };
}
