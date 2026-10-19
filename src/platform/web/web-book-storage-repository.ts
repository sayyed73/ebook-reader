import type { BookId } from '@/core/library/book';
import type { BookStorageRepository, StorageEntries } from '@/core/library/ports';
import { STORES, requestToPromise, transact } from './indexed-db';

export class WebBookStorageRepository implements BookStorageRepository {
  constructor(private readonly db: Promise<IDBDatabase>) {}

  async load(id: BookId): Promise<StorageEntries> {
    const entries = await transact(await this.db, STORES.storage, 'readonly', (tx) =>
      requestToPromise(
        tx.objectStore(STORES.storage).get(id) as IDBRequest<StorageEntries | undefined>,
      ),
    );
    return entries ?? {};
  }

  async save(id: BookId, entries: StorageEntries): Promise<void> {
    await transact(await this.db, STORES.storage, 'readwrite', (tx) => {
      tx.objectStore(STORES.storage).put(entries, id);
    });
  }

  async delete(id: BookId): Promise<void> {
    await transact(await this.db, STORES.storage, 'readwrite', (tx) => {
      tx.objectStore(STORES.storage).delete(id);
    });
  }
}
