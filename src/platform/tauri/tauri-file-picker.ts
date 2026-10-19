import { invoke } from '@tauri-apps/api/core';
import type { FilePicker, PickedFile } from '@/core/library/ports';

interface PickedFileInfo {
  readonly token: number;
  readonly name: string;
  readonly sizeBytes: number;
}

/** The system file dialog, opened and read natively (src-tauri/src/picker.rs). */
export class TauriFilePicker implements FilePicker {
  async pickBookFile(): Promise<PickedFile | null> {
    const info = await invoke<PickedFileInfo | null>('pick_book_file');
    if (!info) return null;
    return {
      name: info.name,
      sizeBytes: info.sizeBytes,
      read: async () =>
        new Uint8Array(await invoke<ArrayBuffer>('read_picked_file', { token: info.token })),
    };
  }
}
