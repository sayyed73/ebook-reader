/**
 * The runtime-specific services the app depends on. Each runtime (browser, Tauri) provides
 * one implementation; UI and core code only ever see this interface.
 *
 * Capabilities (file picker, book storage, book frame host, ...) are added here as the
 * features that need them are built.
 */
export type PlatformKind = 'web' | 'tauri';

export interface Platform {
  readonly kind: PlatformKind;
}
