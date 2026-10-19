/** Minimal promise wrapper over IndexedDB for the browser adapter. */

export const DB_NAME = 'reader-library';
const DB_VERSION = 1;

export const STORES = {
  books: 'books',
  contents: 'book-contents',
  storage: 'book-storage',
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

function upgrade(db: IDBDatabase, oldVersion: number): void {
  // Each block migrates from one schema version to the next; never edit a released block.
  if (oldVersion < 1) {
    db.createObjectStore(STORES.books, { keyPath: 'id' });
    db.createObjectStore(STORES.contents);
    db.createObjectStore(STORES.storage);
  }
}

export function openDatabase(factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      upgrade(request.result, event.oldVersion);
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open the library database.'));
    };
  });
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB request failed.'));
    };
  });
}

/** Runs `work` in one transaction and resolves when the transaction commits. */
export function transact<T>(
  db: IDBDatabase,
  stores: StoreName | StoreName[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    let result: T;
    tx.oncomplete = () => {
      resolve(result);
    };
    tx.onerror = () => {
      reject(tx.error ?? new Error('IndexedDB transaction failed.'));
    };
    tx.onabort = () => {
      reject(tx.error ?? new Error('IndexedDB transaction aborted.'));
    };
    Promise.resolve(work(tx)).then(
      (value) => {
        result = value;
      },
      (error: unknown) => {
        tx.abort();
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}
