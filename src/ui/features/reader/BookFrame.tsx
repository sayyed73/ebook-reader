import type { ReadingPosition } from '@/core/library/book';
import { BOOK_FRAME_SANDBOX } from '@/core/reader/frame-policy';
import type { BookStorageSession } from '@/core/reader/book-storage-session';
import { useBookFrame, type FrameEvent } from './use-book-frame';

interface BookFrameProps {
  title: string;
  frameUrl: string;
  html: string;
  storage: BookStorageSession;
  initialPosition: ReadingPosition | null;
  onEvent: (event: FrameEvent) => void;
  onPosition: (position: ReadingPosition) => void;
}

/**
 * The isolated viewport for a book. The book never touches the app's DOM: it runs in a
 * sandboxed iframe on a separate page with its own CSP (docs/SECURITY.md).
 */
export function BookFrame({ title, frameUrl, ...frameOptions }: BookFrameProps) {
  const iframeRef = useBookFrame(frameOptions);
  return (
    <iframe
      ref={iframeRef}
      className="book-frame"
      title={title}
      src={frameUrl}
      sandbox={BOOK_FRAME_SANDBOX}
      referrerPolicy="no-referrer"
    />
  );
}
