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
import './ReaderScreen.css';

interface ReaderScreenProps {
  bookId: BookId;
  onClose: () => void;
}

export function ReaderScreen({ bookId, onClose }: ReaderScreenProps) {
  const state = useOpenedBook(bookId);
  const backButton = <IconButton label="Back to library" icon={<BackIcon />} onClick={onClose} />;

  if (state.status === 'open') {
    return <OpenReader key={bookId} opened={state.opened} backButton={backButton} />;
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

const TOAST_MESSAGES: Record<Exclude<FrameEvent, 'left-page'>, string> = {
  'link-blocked': 'Links to other pages are turned off in books.',
  'storage-full': "This book's storage is full, so the latest change wasn't saved.",
};

interface OpenReaderProps {
  opened: OpenedBook;
  backButton: React.ReactNode;
}

function OpenReader({ opened, backButton }: OpenReaderProps) {
  const { library, platform } = useServices();
  const [book, setBook] = useState(opened.book);
  const [frameKey, setFrameKey] = useState(0);
  const [leftPage, setLeftPage] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  const reloadFrame = () => {
    setLeftPage(false);
    setFrameKey((key) => key + 1);
  };

  const toggleSafeMode = () => {
    void library.setSafeMode(book, !book.safeMode).then((updated) => {
      setBook(updated);
      reloadFrame();
    });
  };

  const handleFrameEvent = useCallback((event: FrameEvent) => {
    if (event === 'left-page') {
      setLeftPage(true);
      return;
    }
    setToast({ id: Date.now(), message: TOAST_MESSAGES[event] });
  }, []);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

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
            onEvent={handleFrameEvent}
          />
        )}
      </div>
      {toast && <Toast key={toast.id} message={toast.message} onDone={clearToast} />}
    </div>
  );
}
