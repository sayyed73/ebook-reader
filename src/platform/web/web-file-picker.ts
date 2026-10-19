import type { FilePicker, PickedFile } from '@/core/library/ports';

/** Opens the browser's file chooser via a temporary `<input type="file">`. */
export class WebFilePicker implements FilePicker {
  pickBookFile(): Promise<PickedFile | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.html,.htm,text/html';
      input.addEventListener(
        'change',
        () => {
          const file = input.files?.[0];
          resolve(file ? toPickedFile(file) : null);
        },
        { once: true },
      );
      input.addEventListener(
        'cancel',
        () => {
          resolve(null);
        },
        { once: true },
      );
      input.click();
    });
  }
}

function toPickedFile(file: File): PickedFile {
  return {
    name: file.name,
    sizeBytes: file.size,
    read: async () => new Uint8Array(await file.arrayBuffer()),
  };
}
