import type { Platform } from '../platform';

/** Browser runtime: used for development and automated tests. */
export function createWebPlatform(): Platform {
  return { kind: 'web' };
}
