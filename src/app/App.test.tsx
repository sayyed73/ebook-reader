import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Book } from '@/core/library/book';
import { renderWithServices } from '@/test/render';
import { App } from './App';

const book: Book = {
  id: 'b1',
  title: 'Sleep Guide',
  fileName: 'sleep.html',
  sizeBytes: 10,
  contentHash: 'h',
  importedAt: 1,
  lastOpenedAt: 2,
  safeMode: false,
  position: null,
};

describe('App recovery', () => {
  it('offers safe mode for a book that was open when the app stopped', async () => {
    const { platform } = renderWithServices(<App />, (p) => {
      p.books.books.set(book.id, book);
      p.books.contents.set(book.id, '<p>hi</p>');
      p.recovery.marker = { bookId: book.id, openedAt: 2 };
    });

    expect(await screen.findByRole('dialog')).toHaveTextContent('closed while “Sleep Guide”');
    await userEvent.click(screen.getByRole('button', { name: 'Open in safe mode' }));

    expect(await screen.findByRole('button', { name: 'Safe mode' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(platform.books.books.get('b1')?.safeMode).toBe(true);
  });

  it('shows nothing after a normal exit or for a deleted book', async () => {
    renderWithServices(<App />, (p) => {
      p.recovery.marker = { bookId: 'deleted', openedAt: 2 };
    });
    expect(
      await screen.findByRole('heading', { name: 'Your library is empty' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
