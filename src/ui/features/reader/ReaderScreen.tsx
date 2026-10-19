import { useCallback, useState } from 'react';
import { useServices } from '@/app/services-context';
import type { BookId } from '@/core/library/book';
import type { OpenedBook } from '@/core/reader/reader-service';
import { AppHeader } from '@/ui/components/AppHeader';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { IconButton } from '@/ui/components/IconButton';
import { BackIcon, BookIcon } from '@/ui/components/icons';
import { Toast } from '@/ui/components/Toast';
import { BookFrame } from './BookFrame';
import type { FrameEvent } from './use-book-frame';
import { useOpenedBook } from './use-opened-book';
import { useReadingPosition } from './use-reading-position';
import { useRecoveryMarker } from './use-recovery-marker';
import './ReaderScreen.css';

const TOAST_MESSAGES = {
  'link-blocked': 'Links to other pages are turned off in books.',
  'storage-full': "This book's storage is full, so the latest change wasn't saved.",
  'save-failed': "Your progress couldn't be saved on this device.",
} as const;

type ToastKind = keyof typeof TOAST_MESSAGES;

/** Longest time leaving a book waits for its data to be saved. */
const LEAVE_WAIT_LIMIT_MS = 3000;

interface ReaderScreenProps {
  bookId: BookId;
  onClose: () => void;
}

export function ReaderScreen({ bookId, onClose }: ReaderScreenProps) {
  const [toast, setToast] = useState<{ id: number; kind: ToastKind } | null>(null);
  const showToast = useCallback((kind: ToastKind) => {
    setToast({ id: Date.now(), kind });
  }, []);
  const clearToast = useCallback(() => {
    setToast(null);
  }, []);
  const state = useOpenedBook(
    bookId,
    useCallback(() => {
      showToast('save-failed');
    }, [showToast]),
  );
  const backButton = <IconButton label="Back to library" icon={<BackIcon />} onClick={onClose} />;
  const toastView = toast && (
    <Toast key={toast.id} message={TOAST_MESSAGES[toast.kind]} onDone={clearToast} />
  );

  if (state.status === 'open') {
    return (
      <>
        <OpenReader key={bookId} opened={state.opened} onToast={showToast} onClose={onClose} />
        {toastView}
      </>
    );
  }

  return (
    <div className="screen">
      <AppHeader title={state.status === 'loading' ? 'Opening…' : 'Book'} leading={backButton} />
      <main className="screen__content">
        {state.status !== 'loading' && (
          <EmptyState
            icon={<BookIcon size={56} />}
            title={
              state.status === 'not-found'
                ? 'This book is no longer in your library'
                : "Couldn't open this book"
            }
            description="Go back to your library and choose another book."
            action={
              <Button variant="primary" onClick={onClose}>
                Back to library
              </Button>
            }
          />
        )}
      </main>
    </div>
  );
}

interface OpenReaderProps {
  opened: OpenedBook;
  onToast: (kind: ToastKind) => void;
  onClose: () => void;
}

function OpenReader({ opened, onToast, onClose }: OpenReaderProps) {
  const { platform } = useServices();
  const { book } = opened;
  const [frameKey, setFrameKey] = useState(0);
  const [leftPage, setLeftPage] = useState(false);
  const position = useReadingPosition(book.id);
  const [closing, setClosing] = useState(false);
  useRecoveryMarker(book.id);

  // Leaving waits until the book's data and reading position are stored, so closing or
  // reloading the app right after leaving can't lose the latest changes. The wait is capped so
  // a stuck save can never trap the reader in the book (the save itself carries on).
  const close = () => {
    setClosing(true);
    const saved = Promise.all([opened.storage.flush(), position.flush()]);
    const limit = new Promise((resolve) => setTimeout(resolve, LEAVE_WAIT_LIMIT_MS));
    void Promise.race([saved, limit]).finally(onClose);
  };

  const reloadFrame = () => {
    setLeftPage(false);
    setFrameKey((key) => key + 1);
  };

  const handleFrameEvent = useCallback(
    (event: FrameEvent) => {
      if (event === 'left-page') {
        setLeftPage(true);
        return;
      }
      onToast(event);
    },
    [onToast],
  );

  return (
    <div className="screen reader">
      <AppHeader
        title={book.title}
        leading={
          <IconButton
            label="Back to library"
            icon={<BackIcon />}
            onClick={close}
            disabled={closing}
          />
        }
      />
      <div className="reader__viewport">
        {leftPage ? (
          <EmptyState
            title="This book tried to open another page"
            description="Books can't leave the reader. Reload the book to continue reading."
            action={
              <Button variant="primary" onClick={reloadFrame}>
                Reload book
              </Button>
            }
          />
        ) : (
          <BookFrame
            key={frameKey}
            title={book.title}
            frameUrl={platform.bookFrameUrl}
            html={opened.html}
            storage={opened.storage}
            initialPosition={book.position}
            onEvent={handleFrameEvent}
            onPosition={position.save}
          />
        )}
      </div>
    </div>
  );
}
