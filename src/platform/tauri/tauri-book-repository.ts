import { invoke } from '@tauri-apps/api/core';
import type { Book, BookId } from '@/core/library/book';
import type { BookRepository } from '@/core/library/ports';

/** Books stored as files in the app's data folder (src-tauri/src/library). */
export class TauriBookRepository implements BookRepository {
  list(): Promise<Book[]> {
    return invoke('library_list');
  }
  get(id: BookId): Promise<Book | null> {
    return invoke('library_get', { id });
  }
  getContent(id: BookId): Promise<string | null> {
    return invoke('library_get_content', { id });
  }
  add(book: Book, content: string): Promise<void> {
    return invoke('library_add', { book, content });
  }
  update(book: Book): Promise<void> {
    return invoke('library_update', { book });
  }
  replace(book: Book, content: string): Promise<void> {
    return invoke('library_replace', { book, content });
  }
  delete(id: BookId): Promise<void> {
    return invoke('library_delete', { id });
  }
}
