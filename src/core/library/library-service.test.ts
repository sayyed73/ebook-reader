import { InMemoryBookRepository, pickedFile } from '@/test/fakes';
import { LibraryService } from './library-service';

function setup() {
  const books = new InMemoryBookRepository();
  let clock = 1000;
  let nextId = 0;
  const service = new LibraryService({
    books,
    now: () => clock,
    newId: () => `book-${++nextId}`,
  });
  return { books, service, tick: (ms: number) => (clock += ms) };
}

describe('LibraryService.importFile', () => {
  it('stores a valid book with its content and metadata', async () => {
    const { books, service } = setup();
    const result = await service.importFile(
      pickedFile('guide.html', '<title>Guide</title><p>Hi</p>'),
    );

    expect(result.ok).toBe(true);
    const book = books.books.get('book-1');
    expect(book).toMatchObject({
      title: 'Guide',
      fileName: 'guide.html',
      sizeBytes: 29,
      importedAt: 1000,
      lastOpenedAt: null,
      safeMode: false,
    });
    expect(book?.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(books.contents.get('book-1')).toBe('<title>Guide</title><p>Hi</p>');
  });

  it('rejects unsupported files without reading them', async () => {
    const { books, service } = setup();
    const read = vi.fn();
    const result = await service.importFile({ name: 'a.pdf', sizeBytes: 10, read });

    expect(result).toEqual({ ok: false, error: { kind: 'unsupported-type' } });
    expect(read).not.toHaveBeenCalled();
    expect(books.books.size).toBe(0);
  });

  it('reports read failures', async () => {
    const { service } = setup();
    const result = await service.importFile({
      name: 'a.html',
      sizeBytes: 10,
      read: () => Promise.reject(new Error('denied')),
    });
    expect(result).toEqual({ ok: false, error: { kind: 'read-failed' } });
  });
});

describe('LibraryService.list', () => {
  it('orders by most recently opened or imported', async () => {
    const { service, tick } = setup();
    await service.importFile(pickedFile('a.html', '<p>a</p>'));
    tick(10);
    await service.importFile(pickedFile('b.html', '<p>b</p>'));
    tick(10);
    const a = await service.get('book-1');
    if (a) await service.markOpened(a);

    expect((await service.list()).map((b) => b.fileName)).toEqual(['a.html', 'b.html']);
  });
});
