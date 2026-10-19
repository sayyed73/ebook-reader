import type { Book } from '@/core/library/book';
import { APP_INFO } from '@/config/app-info';
import { ConfirmDialog } from '@/ui/components/ConfirmDialog';

interface RecoveryPromptProps {
  book: Book;
  onOpen: () => void;
  onRemove: () => void;
  onDismiss: () => void;
}

/**
 * Shown at startup when the app stopped unexpectedly while this book was open. If the book
 * froze the app, removing it is the way out; otherwise the reader can just carry on.
 */
export function RecoveryPrompt({ book, onOpen, onRemove, onDismiss }: RecoveryPromptProps) {
  return (
    <ConfirmDialog
      title={`${APP_INFO.name} closed while “${book.title}” was open`}
      onCancel={onDismiss}
      cancelLabel="Not now"
      actions={[
        { label: 'Remove book', variant: 'danger', onSelect: onRemove },
        { label: 'Open anyway', variant: 'primary', onSelect: onOpen },
      ]}
    >
      If this book made the app freeze, remove it from your library (its saved progress is removed
      too). Otherwise, open it and continue reading.
    </ConfirmDialog>
  );
}
