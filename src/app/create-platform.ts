import { isTauri } from '@tauri-apps/api/core';
import type { Platform } from '@/platform/platform';
import { createTauriPlatform } from '@/platform/tauri/tauri-platform';
import { createWebPlatform } from '@/platform/web/web-platform';

/** Composition root: the only place that chooses a platform adapter. */
export function createPlatform(): Platform {
  return isTauri() ? createTauriPlatform() : createWebPlatform();
}
