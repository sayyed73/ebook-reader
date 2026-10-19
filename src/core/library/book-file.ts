import { err, ok, type Result } from '../shared/result';

export const MAX_BOOK_SIZE_BYTES = 20 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = ['.html', '.htm'] as const;
const SNIFF_BYTES = 8 * 1024;

export type BookFileError =
  | { readonly kind: 'unsupported-type' }
  | { readonly kind: 'empty' }
  | { readonly kind: 'too-large'; readonly maxBytes: number }
  | { readonly kind: 'not-html' };

export function hasSupportedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** Checks that can run before the file is read. */
export function checkBookFileMeta(
  fileName: string,
  sizeBytes: number,
): Result<void, BookFileError> {
  if (!hasSupportedExtension(fileName)) return err({ kind: 'unsupported-type' });
  if (sizeBytes === 0) return err({ kind: 'empty' });
  if (sizeBytes > MAX_BOOK_SIZE_BYTES) {
    return err({ kind: 'too-large', maxBytes: MAX_BOOK_SIZE_BYTES });
  }
  return ok(undefined);
}

/**
 * Decodes HTML bytes to text. Uses the BOM or a `<meta charset>` declaration when present,
 * otherwise UTF-8. Rejects content that is clearly binary or contains no markup.
 */
export function decodeBookHtml(bytes: Uint8Array): Result<string, BookFileError> {
  if (bytes.length === 0) return err({ kind: 'empty' });
  const head = bytes.subarray(0, SNIFF_BYTES);
  if (looksBinary(head)) return err({ kind: 'not-html' });

  const text = new TextDecoder(detectEncoding(head)).decode(bytes);
  if (!text.includes('<')) return err({ kind: 'not-html' });
  return ok(text);
}

function looksBinary(head: Uint8Array): boolean {
  // UTF-16 files legitimately contain NUL bytes; they are recognised by their BOM.
  if (hasUtf16Bom(head)) return false;
  return head.includes(0);
}

function hasUtf16Bom(head: Uint8Array): boolean {
  return (head[0] === 0xff && head[1] === 0xfe) || (head[0] === 0xfe && head[1] === 0xff);
}

function detectEncoding(head: Uint8Array): string {
  if (head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf) return 'utf-8';
  if (head[0] === 0xff && head[1] === 0xfe) return 'utf-16le';
  if (head[0] === 0xfe && head[1] === 0xff) return 'utf-16be';

  const ascii = new TextDecoder('latin1').decode(head.subarray(0, 1024));
  const declared = /<meta[^>]+charset\s*=\s*["']?\s*([\w-]+)/i.exec(ascii)?.[1];
  if (declared && isSupportedEncoding(declared)) return declared.toLowerCase();
  return 'utf-8';
}

function isSupportedEncoding(label: string): boolean {
  try {
    new TextDecoder(label);
    return true;
  } catch {
    return false;
  }
}

/** Display title: the document's `<title>`, else the file name without extension. */
export function extractTitle(html: string, fileName: string): string {
  const raw = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '';
  const title = decodeBasicEntities(raw).replace(/\s+/g, ' ').trim();
  if (title) return title.slice(0, 200);
  return fileName.replace(/\.html?$/i, '') || fileName;
}

const BASIC_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeBasicEntities(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      return safeFromCodePoint(parseInt(entity.slice(2), 16)) ?? match;
    }
    if (entity.startsWith('#')) return safeFromCodePoint(parseInt(entity.slice(1), 10)) ?? match;
    return BASIC_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function safeFromCodePoint(codePoint: number): string | null {
  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return null;
  }
}
