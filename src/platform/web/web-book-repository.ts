import type { Book, BookId } from '@/core/library/book';
import type { BookRepository } from '@/core/library/ports';
import { STORES, requestToPromise, transact } from './indexed-db';

export class WebBookRepository implements BookRepository {
  constructor(private readonly db: Promise<IDBDatabase>) {}

  async list(): Promise<Book[]> {
    return transact(await this.db, STORES.books, 'readonly', (tx) =>
      requestToPromise(tx.objectStore(STORES.books).getAll() as IDBRequest<Book[]>),
    );
  }

  async get(id: BookId): Promise<Book | null> {
    const book = await transact(await this.db, STORES.books, 'readonly', (tx) =>
      requestToPromise(tx.objectStore(STORES.books).get(id) as IDBRequest<Book | undefined>),
    );
    return book ?? null;
  }

  async getContent(id: BookId): Promise<string | null> {
    const content = await transact(await this.db, STORES.contents, 'readonly', (tx) =>
      requestToPromise(tx.objectStore(STORES.contents).get(id) as IDBRequest<string | undefined>),
    );
    return content ?? null;
  }

  async add(book: Book, content: string): Promise<void> {
    await transact(await this.db, [STORES.books, STORES.contents], 'readwrite', (tx) => {
      tx.objectStore(STORES.books).add(book);
      tx.objectStore(STORES.contents).add(content, book.id);
    });
  }

  async replace(book: Book, content: string): Promise<void> {
    await transact(await this.db, [STORES.books, STORES.contents], 'readwrite', (tx) => {
      tx.objectStore(STORES.books).put(book);
      tx.objectStore(STORES.contents).put(content, book.id);
    });
  }

  async delete(id: BookId): Promise<void> {
    await transact(await this.db, [STORES.books, STORES.contents], 'readwrite', (tx) => {
      tx.objectStore(STORES.books).delete(id);
      tx.objectStore(STORES.contents).delete(id);
    });
  }

  async update(book: Book): Promise<void> {
    await transact(await this.db, STORES.books, 'readwrite', (tx) => {
      tx.objectStore(STORES.books).put(book);
    });
  }
}
