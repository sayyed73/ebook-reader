import 'fake-indexeddb/auto';
import type { Book } from '@/core/library/book';
import { DB_NAME, openDatabase } from './indexed-db';
import { WebBookRepository } from './web-book-repository';
import { WebBookStorageRepository } from './web-book-storage-repository';

const book: Book = {
  id: 'b1',
  title: 'Guide',
  fileName: 'guide.html',
  sizeBytes: 10,
  contentHash: 'abc',
  importedAt: 1,
  lastOpenedAt: null,
  safeMode: false,
};

describe('IndexedDB repositories', () => {
  afterEach(async () => {
    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = resolve;
      request.onerror = resolve;
    });
  });

  it('stores books and their content', async () => {
    const db = openDatabase();
    const repo = new WebBookRepository(db);
    await repo.add(book, '<p>hi</p>');
    await repo.update({ ...book, safeMode: true });

    expect(await repo.list()).toEqual([{ ...book, safeMode: true }]);
    expect(await repo.getContent('b1')).toBe('<p>hi</p>');
    expect(await repo.get('missing')).toBeNull();
    (await db).close();
  });

  it('refuses to add the same book id twice', async () => {
    const db = openDatabase();
    const repo = new WebBookRepository(db);
    await repo.add(book, 'a');
    await expect(repo.add(book, 'b')).rejects.toBeDefined();
    expect(await repo.getContent('b1')).toBe('a');
    (await db).close();
  });

  it('saves and loads per-book storage', async () => {
    const db = openDatabase();
    const repo = new WebBookStorageRepository(db);
    expect(await repo.load('b1')).toEqual({});
    await repo.save('b1', { done: 'yes' });
    expect(await repo.load('b1')).toEqual({ done: 'yes' });
    expect(await repo.load('b2')).toEqual({});
    (await db).close();
  });
});
