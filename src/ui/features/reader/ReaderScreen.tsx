import type React from 'react';
import { useCallback, useState } from 'react';
import { useServices } from '@/app/services-context';
import type { BookId } from '@/core/library/book';
import type { OpenedBook } from '@/core/reader/reader-service';
import { AppHeader } from '@/ui/components/AppHeader';
import { Banner } from '@/ui/components/Banner';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { IconButton } from '@/ui/components/IconButton';
import { BackIcon, BookIcon, ShieldIcon } from '@/ui/components/icons';
import { Toast } from '@/ui/components/Toast';
import { BookFrame } from './BookFrame';
import type { FrameEvent } from './use-book-frame';
import { useOpenedBook } from './use-opened-book';
import { useReadingPosition } from './use-reading-position';
import './ReaderScreen.css';

const TOAST_MESSAGES = {
  'link-blocked': 'Links to other pages are turned off in books.',
  'storage-full': "This book's storage is full, so the latest change wasn't saved.",
  'save-failed': "Your progress couldn't be saved on this device.",
} as const;

type ToastKind = keyof typeof TOAST_MESSAGES;

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
        <OpenReader
          key={bookId}
          opened={state.opened}
          onToast={showToast}
          backButton={backButton}
        />
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
  backButton: React.ReactNode;
}

function OpenReader({ opened, onToast, backButton }: OpenReaderProps) {
  const { library, platform } = useServices();
  const [book, setBook] = useState(opened.book);
  const [frameKey, setFrameKey] = useState(0);
  const [leftPage, setLeftPage] = useState(false);
  const savePosition = useReadingPosition(book.id);

  const reloadFrame = () => {
    setLeftPage(false);
    setFrameKey((key) => key + 1);
  };

  const toggleSafeMode = () => {
    void library.setSafeMode(book.id, !book.safeMode).then((updated) => {
      if (!updated) return;
      setBook(updated);
      reloadFrame();
    });
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
        leading={backButton}
        actions={
          <IconButton
            label="Safe mode"
            showLabel
            icon={<ShieldIcon size={18} />}
            aria-pressed={book.safeMode}
            onClick={toggleSafeMode}
          />
        }
      />
      {book.safeMode && (
        <div className="reader__notice">
          <Banner tone="info">
            Safe mode is on: this book&apos;s scripts are turned off, so interactive parts
            won&apos;t work.
          </Banner>
        </div>
      )}
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
            safeMode={book.safeMode}
            initialPosition={opened.book.position}
            onEvent={handleFrameEvent}
            onPosition={savePosition}
          />
        )}
      </div>
    </div>
  );
}
