import type { ImportError } from '@/core/library/library-service';

export function describeImportError(error: ImportError): string {
  switch (error.kind) {
    case 'unsupported-type':
      return 'Only HTML books (.html or .htm files) can be added.';
    case 'empty':
      return 'This file is empty.';
    case 'too-large':
      return `This file is too large. The limit is ${Math.round(error.maxBytes / (1024 * 1024))} MB.`;
    case 'not-html':
      return "This file doesn't look like an HTML book.";
    case 'read-failed':
      return "The file couldn't be read. Try again or choose another file.";
  }
}
