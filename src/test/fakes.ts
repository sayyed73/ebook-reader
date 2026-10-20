import type { Book, BookId } from '@/core/library/book';
import type {
  BookRepository,
  BookStorageRepository,
  FilePicker,
  PickedFile,
  StorageEntries,
} from '@/core/library/ports';
import type { OpenBookMarker, RecoveryStore } from '@/core/reader/recovery';
import type { Platform } from '@/platform/platform';

export class InMemoryBookRepository implements BookRepository {
  readonly books = new Map<BookId, Book>();
  readonly contents = new Map<BookId, string>();

  list() {
    return Promise.resolve([...this.books.values()]);
  }
  get(id: BookId) {
    return Promise.resolve(this.books.get(id) ?? null);
  }
  getContent(id: BookId) {
    return Promise.resolve(this.contents.get(id) ?? null);
  }
  add(book: Book, content: string) {
    this.books.set(book.id, book);
    this.contents.set(book.id, content);
    return Promise.resolve();
  }
  update(book: Book) {
    this.books.set(book.id, book);
    return Promise.resolve();
  }
  replace(book: Book, content: string) {
    this.books.set(book.id, book);
    this.contents.set(book.id, content);
    return Promise.resolve();
  }
  delete(id: BookId) {
    this.books.delete(id);
    this.contents.delete(id);
    return Promise.resolve();
  }
}

export class InMemoryBookStorageRepository implements BookStorageRepository {
  readonly saved = new Map<BookId, StorageEntries>();
  saveCount = 0;

  load(id: BookId) {
    return Promise.resolve(this.saved.get(id) ?? {});
  }
  save(id: BookId, entries: StorageEntries) {
    this.saveCount += 1;
    this.saved.set(id, { ...entries });
    return Promise.resolve();
  }
  delete(id: BookId) {
    this.saved.delete(id);
    return Promise.resolve();
  }
}

export class StubFilePicker implements FilePicker {
  next: PickedFile | null = null;
  pickBookFile() {
    return Promise.resolve(this.next);
  }
}

export class InMemoryRecoveryStore implements RecoveryStore {
  marker: OpenBookMarker | null = null;
  read() {
    return this.marker;
  }
  write(marker: OpenBookMarker | null) {
    this.marker = marker;
  }
}

export function pickedFile(
  name: string,
  content: string | Uint8Array,
  location?: string,
): PickedFile {
  const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
  return { name, sizeBytes: bytes.length, location, read: () => Promise.resolve(bytes) };
}

export function createTestPlatform(): Platform & {
  books: InMemoryBookRepository;
  bookStorage: InMemoryBookStorageRepository;
  filePicker: StubFilePicker;
  recovery: InMemoryRecoveryStore;
} {
  return {
    kind: 'web',
    books: new InMemoryBookRepository(),
    bookStorage: new InMemoryBookStorageRepository(),
    filePicker: new StubFilePicker(),
    recovery: new InMemoryRecoveryStore(),
    bookFrameUrl: '/frame.html',
    onAppClosing: () => () => undefined,
  };
}
