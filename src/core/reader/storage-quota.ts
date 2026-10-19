/** Per-book storage limit, matching what browsers give a site's localStorage. */
export const STORAGE_QUOTA_BYTES = 5 * 1024 * 1024;

/** Browsers count localStorage in UTF-16 code units: 2 bytes per character. */
export function entryBytes(key: string, value: string): number {
  return (key.length + value.length) * 2;
}

export function totalBytes(entries: Iterable<readonly [string, string]>): number {
  let total = 0;
  for (const [key, value] of entries) total += entryBytes(key, value);
  return total;
}
