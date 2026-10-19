import { InMemoryBookRepository, InMemoryBookStorageRepository, pickedFile } from '@/test/fakes';
import type { ImportOutcome } from './library-service';
import { LibraryService } from './library-service';

function setup() {
  const books = new InMemoryBookRepository();
  const bookStorage = new InMemoryBookStorageRepository();
  let clock = 1000;
  let nextId = 0;
  const service = new LibraryService({
    books,
    bookStorage,
    now: () => clock,
    newId: () => `book-${++nextId}`,
  });
  return { books, bookStorage, service, tick: (ms: number) => (clock += ms) };
}

async function importOk(
  service: LibraryService,
  name: string,
  html: string,
): Promise<ImportOutcome> {
  const result = await service.importFile(pickedFile(name, html));
  if (!result.ok) throw new Error(`import failed: ${result.error.kind}`);
  return result.value;
}

describe('LibraryService.importFile', () => {
  it('stores a valid book with its content and metadata', async () => {
    const { books, service } = setup();
    const outcome = await importOk(service, 'guide.html', '<title>Guide</title><p>Hi</p>');

    expect(outcome.kind).toBe('added');
    const book = books.books.get('book-1');
    expect(book).toMatchObject({
      title: 'Guide',
      fileName: 'guide.html',
      sizeBytes: 29,
      importedAt: 1000,
      lastOpenedAt: null,
      position: null,
    });
    expect(book?.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(books.contents.get('book-1')).toBe('<title>Guide</title><p>Hi</p>');
  });

  it('recognises the exact same file instead of adding it twice', async () => {
    const { books, service } = setup();
    await importOk(service, 'guide.html', '<title>Guide</title>');
    const again = await importOk(service, 'renamed.html', '<title>Guide</title>');

    expect(again).toMatchObject({ kind: 'already-in-library', book: { id: 'book-1' } });
    expect(books.books.size).toBe(1);
  });

  it('reports a conflict for a different version with the same name or title', async () => {
    const { books, service } = setup();
    await importOk(service, 'guide.html', '<title>Guide</title><p>v1</p>');

    const sameFile = await importOk(service, 'GUIDE.html', '<title>Other</title><p>v2</p>');
    const sameTitle = await importOk(service, 'guide (1).html', '<title>guide</title><p>v3</p>');

    expect(sameFile).toMatchObject({ kind: 'conflict', existing: { id: 'book-1' } });
    expect(sameTitle).toMatchObject({ kind: 'conflict', existing: { id: 'book-1' } });
    expect(books.books.size).toBe(1);
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

describe('resolving conflicts', () => {
  async function withConflict() {
    const ctx = setup();
    await importOk(ctx.service, 'guide.html', '<title>Guide</title><p>v1</p>');
    await ctx.service.savePosition('book-1', { scrollY: 420 });
    await ctx.bookStorage.save('book-1', { progress: '3' });
    const outcome = await importOk(ctx.service, 'guide.html', '<title>Guide 2</title><p>v2</p>');
    if (outcome.kind !== 'conflict') throw new Error('expected a conflict');
    return { ...ctx, pending: outcome.pending };
  }

  it('replace swaps the content but keeps id, progress and position', async () => {
    const { service, books, bookStorage, pending } = await withConflict();
    const replaced = await service.replace('book-1', pending);

    expect(replaced).toMatchObject({
      id: 'book-1',
      title: 'Guide 2',
      position: { scrollY: 420 },
    });
    expect(books.contents.get('book-1')).toBe('<title>Guide 2</title><p>v2</p>');
    expect(await bookStorage.load('book-1')).toEqual({ progress: '3' });
    expect(books.books.size).toBe(1);
  });

  it('keep both adds a separate book with fresh progress', async () => {
    const { service, books, bookStorage, pending } = await withConflict();
    const added = await service.addAsNew(pending);

    expect(added).toMatchObject({ id: 'book-2', position: null });
    expect(books.books.size).toBe(2);
    expect(await bookStorage.load('book-2')).toEqual({});
  });
});

describe('LibraryService updates', () => {
  it('orders by most recently opened or imported', async () => {
    const { service, tick } = setup();
    await importOk(service, 'a.html', '<p>a</p>');
    tick(10);
    await importOk(service, 'b.html', '<p>b</p>');
    tick(10);
    await service.markOpened('book-1');

    expect((await service.list()).map((b) => b.fileName)).toEqual(['a.html', 'b.html']);
  });

  it('updates fields independently without overwriting each other', async () => {
    const { service, tick } = setup();
    await importOk(service, 'a.html', '<p>a</p>');
    tick(5);
    await Promise.all([
      service.markOpened('book-1'),
      service.savePosition('book-1', { scrollY: 99.6 }),
    ]);
    expect(await service.get('book-1')).toMatchObject({
      lastOpenedAt: 1005,
      position: { scrollY: 100 },
    });
  });

  it('ignores invalid positions', async () => {
    const { service } = setup();
    await importOk(service, 'a.html', '<p>a</p>');
    await service.savePosition('book-1', { scrollY: Number.NaN });
    await service.savePosition('book-1', { scrollY: -5 });
    expect((await service.get('book-1'))?.position).toBeNull();
  });

  it('drops fields that no longer exist from stored books', async () => {
    const { service, books } = setup();
    await importOk(service, 'a.html', '<p>a</p>');
    const stored = books.books.get('book-1');
    if (!stored) throw new Error('missing');
    books.books.set('book-1', { ...stored, safeMode: true } as typeof stored);

    expect(await service.get('book-1')).not.toHaveProperty('safeMode');
  });

  it('fills defaults for books stored before positions existed', async () => {
    const { service, books } = setup();
    await importOk(service, 'a.html', '<p>a</p>');
    const stored = books.books.get('book-1');
    if (!stored) throw new Error('missing');
    const legacy = Object.fromEntries(Object.entries(stored).filter(([key]) => key !== 'position'));
    books.books.set('book-1', legacy as unknown as typeof stored);

    expect((await service.get('book-1'))?.position).toBeNull();
  });

  it('delete removes the book, its content and its saved data', async () => {
    const { service, books, bookStorage } = setup();
    await importOk(service, 'a.html', '<p>a</p>');
    await bookStorage.save('book-1', { k: 'v' });

    await service.delete('book-1');

    expect(books.books.size).toBe(0);
    expect(books.contents.size).toBe(0);
    expect(bookStorage.saved.size).toBe(0);
  });
});
