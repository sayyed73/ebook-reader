import { useEffect, useState } from 'react';
import { useServices } from '@/app/services-context';
import type { Book, BookId } from '@/core/library/book';
import { APP_INFO } from '@/config/app-info';
import { ConfirmDialog } from '@/ui/components/ConfirmDialog';

interface RecoveryPromptProps {
  bookId: BookId;
  onOpen: (id: BookId) => void;
  onDismiss: () => void;
}

/** Offered at startup when the app stopped unexpectedly while a book was open. */
export function RecoveryPrompt({ bookId, onOpen, onDismiss }: RecoveryPromptProps) {
  const { library } = useServices();
  const [book, setBook] = useState<Book | null>(null);

  useEffect(() => {
    let active = true;
    library.get(bookId).then(
      (found) => {
        if (!active) return;
        if (found) setBook(found);
        else onDismiss();
      },
      () => {
        if (active) onDismiss();
      },
    );
    return () => {
      active = false;
    };
  }, [library, bookId, onDismiss]);

  if (!book) return null;

  const openInSafeMode = () => {
    void library.setSafeMode(book.id, true).then(() => {
      onOpen(book.id);
    });
  };

  return (
    <ConfirmDialog
      title={`${APP_INFO.name} closed while “${book.title}” was open`}
      onCancel={onDismiss}
      cancelLabel="Not now"
      actions={[
        {
          label: 'Open normally',
          onSelect: () => {
            onOpen(book.id);
          },
        },
        { label: 'Open in safe mode', variant: 'primary', onSelect: openInSafeMode },
      ]}
    >
      If this book made the app freeze, open it in safe mode: its scripts stay off until you turn
      safe mode off again.
    </ConfirmDialog>
  );
}
