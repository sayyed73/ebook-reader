import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Book } from '@/core/library/book';
import { BookStorageSession } from '@/core/reader/book-storage-session';
import { renderWithServices } from '@/test/render';
import { ReaderScreen } from './ReaderScreen';

const book: Book = {
  id: 'b1',
  title: 'Sleep Guide',
  fileName: 'sleep.html',
  sizeBytes: 10,
  contentHash: 'h',
  importedAt: 1,
  lastOpenedAt: null,
  position: null,
  sourceLocation: null,
};

describe('ReaderScreen', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('leaves the book only after its data has been saved', async () => {
    let finishSave: () => void = () => undefined;
    const flush = vi.spyOn(BookStorageSession.prototype, 'flush').mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishSave = resolve;
        }),
    );
    const onClose = vi.fn();
    renderWithServices(<ReaderScreen bookId={book.id} onClose={onClose} />, (platform) => {
      platform.books.books.set(book.id, book);
      platform.books.contents.set(book.id, '<p>hi</p>');
    });

    // Once the book is open (its frame is shown), leave it.
    await screen.findByLabelText('Sleep Guide');
    const back = screen.getByRole('button', { name: 'Back to library' });
    await userEvent.click(back);

    expect(flush).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(back).toBeDisabled();

    finishSave();
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  it('still leaves if saving takes too long', async () => {
    vi.spyOn(BookStorageSession.prototype, 'flush').mockImplementation(
      () => new Promise<void>(() => undefined),
    );
    const onClose = vi.fn();
    renderWithServices(<ReaderScreen bookId={book.id} onClose={onClose} />, (platform) => {
      platform.books.books.set(book.id, book);
      platform.books.contents.set(book.id, '<p>hi</p>');
    });
    await screen.findByLabelText('Sleep Guide');
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await userEvent.click(screen.getByRole('button', { name: 'Back to library' }));
      expect(onClose).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(3000);
      expect(onClose).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });
});
