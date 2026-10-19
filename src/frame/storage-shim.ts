import type { StorageEntries } from '@/core/library/ports';
import type { StorageMessage } from '@/core/reader/frame-protocol';
import { STORAGE_QUOTA_BYTES, entryBytes, totalBytes } from '@/core/reader/storage-quota';

/**
 * A `Storage`-compatible object for the book. Sandboxed frames can't use the real
 * localStorage (they have an opaque origin), so books get this instead: reads are served from
 * memory, writes are reported to the host which persists them per book.
 *
 * Supports both the method API (`getItem`) and property access (`localStorage.key = v`).
 */
export function createStorage(
  seed: StorageEntries,
  onChange: (message: StorageMessage) => void,
  quotaBytes: number = STORAGE_QUOTA_BYTES,
): Storage {
  const data = new Map<string, string>(Object.entries(seed));
  let bytes = totalBytes(data);

  // Books may pass any value; like the real Storage, keys and values are coerced to strings.
  const api: Storage = {
    get length() {
      return data.size;
    },
    key(index: unknown) {
      return Array.from(data.keys())[Math.trunc(Number(index))] ?? null;
    },
    getItem(key: unknown) {
      return data.get(String(key)) ?? null;
    },
    setItem(rawKey: unknown, rawValue: unknown) {
      const key = String(rawKey);
      const value = String(rawValue);
      const previous = data.get(key);
      const next =
        bytes - (previous === undefined ? 0 : entryBytes(key, previous)) + entryBytes(key, value);
      if (next > quotaBytes) {
        throw new DOMException(
          `Setting the value of '${key}' exceeded the quota.`,
          'QuotaExceededError',
        );
      }
      data.set(key, value);
      bytes = next;
      onChange({ type: 'storage-set', key, value });
    },
    removeItem(rawKey: unknown) {
      const key = String(rawKey);
      const previous = data.get(key);
      if (previous === undefined) return;
      data.delete(key);
      bytes -= entryBytes(key, previous);
      onChange({ type: 'storage-remove', key });
    },
    clear() {
      if (data.size === 0) return;
      data.clear();
      bytes = 0;
      onChange({ type: 'storage-clear' });
    },
  };

  const isApiProperty = (property: string | symbol) =>
    typeof property === 'symbol' || property in api;

  return new Proxy(api, {
    get(target, property, receiver) {
      if (isApiProperty(property)) return Reflect.get(target, property, receiver) as unknown;
      return data.get(property as string);
    },
    set(target, property, value) {
      if (isApiProperty(property)) return Reflect.set(target, property, value);
      target.setItem(property as string, value as string);
      return true;
    },
    deleteProperty(target, property) {
      if (isApiProperty(property)) return false;
      target.removeItem(property as string);
      return true;
    },
    has(target, property) {
      return isApiProperty(property) ? property in target : data.has(property as string);
    },
    ownKeys() {
      return Array.from(data.keys());
    },
    getOwnPropertyDescriptor(_target, property) {
      if (typeof property === 'symbol' || !data.has(property)) return undefined;
      return { value: data.get(property), writable: true, enumerable: true, configurable: true };
    },
  });
}
