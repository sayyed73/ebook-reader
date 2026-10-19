import type { StorageEntries } from '../library/ports';
import { STORAGE_QUOTA_BYTES, entryBytes } from './storage-quota';

/**
 * Messages between the app (host) and the book frame. This is the ONLY channel between
 * untrusted book content and the app, so every incoming message is parsed defensively.
 *
 * Handshake: the frame posts `ready` on `window`; the host replies with `load` and transfers a
 * private MessagePort. All further frame → host messages travel over that port, which only
 * the bootstrap holds. (Window messages can't be authenticated once the frame's document has
 * unloaded: their `source` becomes null, so a book's last save before reloading would be lost.)
 */
export const FRAME_CHANNEL = 'book-frame';
export const FRAME_PROTOCOL_VERSION = 1;

export type StorageMessage =
  | { readonly type: 'storage-set'; readonly key: string; readonly value: string }
  | { readonly type: 'storage-remove'; readonly key: string }
  | { readonly type: 'storage-clear' };

/** Frame → host. */
export type FrameMessage =
  /** Bootstrap is running and waiting for the book (window channel). Repeats after a reload. */
  | { readonly type: 'ready' }
  /** The book's page is going away (reload or attempted navigation). */
  | { readonly type: 'unloading' }
  /** A link to another page was clicked and suppressed. */
  | { readonly type: 'navigation-blocked' }
  | StorageMessage;

/** Host → frame, with the private MessagePort transferred alongside. */
export interface LoadBookMessage {
  readonly type: 'load';
  readonly html: string;
  readonly storage: StorageEntries;
  readonly safeMode: boolean;
}

type Envelope<T> = T & { readonly channel: typeof FRAME_CHANNEL; readonly version: number };

export function toEnvelope<T extends { type: string }>(message: T): Envelope<T> {
  return { ...message, channel: FRAME_CHANNEL, version: FRAME_PROTOCOL_VERSION };
}

function readEnvelope(data: unknown): Record<string, unknown> | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  if (record['channel'] !== FRAME_CHANNEL || record['version'] !== FRAME_PROTOCOL_VERSION) {
    return null;
  }
  return record;
}

/** Validates a message received from the book frame. Returns `null` for anything unexpected. */
export function parseFrameMessage(data: unknown): FrameMessage | null {
  const record = readEnvelope(data);
  if (!record) return null;
  const { key, value } = record;

  switch (record['type']) {
    case 'ready':
    case 'unloading':
    case 'navigation-blocked':
    case 'storage-clear':
      return { type: record['type'] };
    case 'storage-set':
      if (typeof key !== 'string' || typeof value !== 'string') return null;
      if (entryBytes(key, value) > STORAGE_QUOTA_BYTES) return null;
      return { type: 'storage-set', key, value };
    case 'storage-remove':
      if (typeof key !== 'string' || entryBytes(key, '') > STORAGE_QUOTA_BYTES) return null;
      return { type: 'storage-remove', key };
    default:
      return null;
  }
}

/** Validates the load message inside the frame bootstrap. */
export function parseLoadBookMessage(data: unknown): LoadBookMessage | null {
  const record = readEnvelope(data);
  if (!record || record['type'] !== 'load') return null;
  const { html, storage, safeMode } = record;
  if (typeof html !== 'string' || typeof safeMode !== 'boolean') return null;
  if (typeof storage !== 'object' || storage === null || Array.isArray(storage)) return null;

  const entries: Record<string, string> = {};
  for (const [key, value] of Object.entries(storage)) {
    if (typeof value === 'string') entries[key] = value;
  }
  return { type: 'load', html, storage: entries, safeMode };
}
