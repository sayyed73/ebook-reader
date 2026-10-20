import { useState } from 'react';
import type { Book, BookId } from '@/core/library/book';
import { APP_INFO } from '@/config/app-info';
import { AppHeader } from '@/ui/components/AppHeader';
import { Banner } from '@/ui/components/Banner';
import { Button } from '@/ui/components/Button';
import { ConfirmDialog } from '@/ui/components/ConfirmDialog';
import { EmptyState } from '@/ui/components/EmptyState';
import { BookIcon, PlusIcon } from '@/ui/components/icons';
import { BookList } from './BookList';
import { RecoveryPrompt } from './RecoveryPrompt';
import { useLibrary } from './use-library';
import './LibraryScreen.css';

interface LibraryScreenProps {
  onOpenBook: (id: BookId) => void;
  /** Book that was open when the app last stopped unexpectedly (see RecoveryService). */
  interruptedBookId?: BookId | null;
  onRecoveryHandled?: () => void;
}

export function LibraryScreen({
  onOpenBook,
  interruptedBookId = null,
  onRecoveryHandled = () => undefined,
}: LibraryScreenProps) {
  const { books, busy, error, conflict, importBook, resolveConflict, deleteBook, dismissError } =
    useLibrary();
  const [pendingDelete, setPendingDelete] = useState<Book | null>(null);

  const openIfAny = (id: BookId | null) => {
    if (id) onOpenBook(id);
  };

  const addButton = (variant: 'primary' | 'secondary') => (
    <Button
      variant={variant}
      onClick={() => {
        void importBook().then(openIfAny);
      }}
      disabled={busy}
    >
      <PlusIcon />
      {busy ? 'Working…' : 'Add book'}
    </Button>
  );

  const hasBooks = books !== null && books.length > 0;
  // Only books still in the library are offered; a deleted one is silently skipped.
  const interruptedBook = books?.find((book) => book.id === interruptedBookId) ?? null;

  return (
    <div className="screen">
      <AppHeader title={APP_INFO.name} actions={hasBooks ? addButton('secondary') : undefined} />
      <main className="screen__content library">
        {error && (
          <Banner tone="error" onDismiss={dismissError}>
            {error}
          </Banner>
        )}
        {books !== null &&
          (hasBooks ? (
            <BookList books={books} onOpen={onOpenBook} onDelete={setPendingDelete} />
          ) : (
            <EmptyState
              icon={<BookIcon size={56} />}
              title="Your library is empty"
              description="Add an HTML book (.html) to start reading. Your progress is saved on this device."
              action={addButton('primary')}
            />
          ))}
      </main>

      {conflict && (
        <ConfirmDialog
          title={`“${conflict.existing.title}” is already in your library`}
          onCancel={() => void resolveConflict('cancel')}
          actions={[
            {
              label: 'Keep both',
              onSelect: () => void resolveConflict('keep-both').then(openIfAny),
            },
            {
              label: 'Replace',
              variant: 'primary',
              onSelect: () => void resolveConflict('replace').then(openIfAny),
            },
          ]}
        >
          This file looks like a different version of it. Replace the book in your library (your
          progress is kept), or keep both as separate books?
        </ConfirmDialog>
      )}

      {interruptedBook && !conflict && (
        <RecoveryPrompt
          book={interruptedBook}
          onDismiss={onRecoveryHandled}
          onOpen={() => {
            onRecoveryHandled();
            onOpenBook(interruptedBook.id);
          }}
          onRemove={() => {
            onRecoveryHandled();
            void deleteBook(interruptedBook.id);
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={`Remove “${pendingDelete.title}”?`}
          onCancel={() => {
            setPendingDelete(null);
          }}
          actions={[
            {
              label: 'Remove',
              variant: 'danger',
              onSelect: () => {
                const { id } = pendingDelete;
                setPendingDelete(null);
                void deleteBook(id);
              },
            },
          ]}
        >
          The book and everything saved in it (progress, notes) will be removed from this device.
        </ConfirmDialog>
      )}
    </div>
  );
}
