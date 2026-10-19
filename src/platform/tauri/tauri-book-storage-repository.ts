import { invoke } from '@tauri-apps/api/core';
import type { BookId } from '@/core/library/book';
import type { BookStorageRepository, StorageEntries } from '@/core/library/ports';

export class TauriBookStorageRepository implements BookStorageRepository {
  load(id: BookId): Promise<StorageEntries> {
    return invoke('book_storage_load', { id });
  }
  save(id: BookId, entries: StorageEntries): Promise<void> {
    return invoke('book_storage_save', { id, entries });
  }
  delete(id: BookId): Promise<void> {
    return invoke('book_storage_delete', { id });
  }
}
