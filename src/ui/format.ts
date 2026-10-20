/**
 * Short, human-readable source of a book: the folder its file was added from ("Downloads"),
 * or null when the location isn't a file path (e.g. an Android content URI) or is unknown.
 */
export function describeSourceFolder(location: string | null): string | null {
  if (!location || /^[a-z][a-z0-9+.-]*:\/\//i.test(location)) return null;
  const parts = location.split(/[\\/]/).filter(Boolean);
  return parts.length >= 2 ? (parts[parts.length - 2] ?? null) : null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

/** "just now", "5 minutes ago", "yesterday", "3 weeks ago". */
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const elapsed = now - timestamp;
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (const [unit, ms] of UNITS) {
    if (elapsed >= ms) return format.format(-Math.floor(elapsed / ms), unit);
  }
  return 'just now';
}
