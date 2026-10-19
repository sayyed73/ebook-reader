import {
  MAX_BOOK_SIZE_BYTES,
  checkBookFileMeta,
  decodeBookHtml,
  extractTitle,
  hasSupportedExtension,
} from './book-file';

const encode = (text: string) => new TextEncoder().encode(text);

describe('hasSupportedExtension', () => {
  it.each(['book.html', 'BOOK.HTM', 'a.b.html'])('accepts %s', (name) => {
    expect(hasSupportedExtension(name)).toBe(true);
  });
  it.each(['book.pdf', 'book.html.exe', 'html', 'book.xhtml'])('rejects %s', (name) => {
    expect(hasSupportedExtension(name)).toBe(false);
  });
});

describe('checkBookFileMeta', () => {
  it('rejects empty and oversized files', () => {
    expect(checkBookFileMeta('a.html', 0)).toEqual({ ok: false, error: { kind: 'empty' } });
    expect(checkBookFileMeta('a.html', MAX_BOOK_SIZE_BYTES + 1)).toEqual({
      ok: false,
      error: { kind: 'too-large', maxBytes: MAX_BOOK_SIZE_BYTES },
    });
    expect(checkBookFileMeta('a.html', MAX_BOOK_SIZE_BYTES).ok).toBe(true);
  });
});

describe('decodeBookHtml', () => {
  it('decodes UTF-8 and strips the BOM', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...encode('<p>héllo</p>')]);
    expect(decodeBookHtml(bytes)).toEqual({ ok: true, value: '<p>héllo</p>' });
  });

  it('honours a declared legacy charset', () => {
    const head = encode('<meta charset="windows-1252"><p>');
    const bytes = new Uint8Array([...head, 0xe9, ...encode('</p>')]);
    expect(decodeBookHtml(bytes)).toEqual({
      ok: true,
      value: '<meta charset="windows-1252"><p>é</p>',
    });
  });

  it('rejects binary content and text without markup', () => {
    expect(decodeBookHtml(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00, 0x01]))).toEqual({
      ok: false,
      error: { kind: 'not-html' },
    });
    expect(decodeBookHtml(encode('just text'))).toEqual({ ok: false, error: { kind: 'not-html' } });
  });
});

describe('extractTitle', () => {
  it('uses the document title with entities decoded', () => {
    expect(extractTitle('<title>\n  Sleep &amp; Rest &#8212; Guide </title>', 'x.html')).toBe(
      'Sleep & Rest — Guide',
    );
  });
  it('falls back to the file name', () => {
    expect(extractTitle('<p>no title</p>', 'My Book.html')).toBe('My Book');
    expect(extractTitle('<title>  </title>', 'notes.htm')).toBe('notes');
  });
});
