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
  position: null,
};

function renderInterrupted() {
  return renderWithServices(<App />, (p) => {
    p.books.books.set(book.id, book);
    p.books.contents.set(book.id, '<p>hi</p>');
    p.bookStorage.saved.set(book.id, { progress: '1' });
    p.recovery.marker = { bookId: book.id, openedAt: 2 };
  });
}

describe('App recovery', () => {
  it('offers to remove a book that was open when the app stopped', async () => {
    const { platform } = renderInterrupted();

    expect(await screen.findByRole('dialog')).toHaveTextContent('closed while “Sleep Guide”');
    await userEvent.click(screen.getByRole('button', { name: 'Remove book' }));

    expect(
      await screen.findByRole('heading', { name: 'Your library is empty' }),
    ).toBeInTheDocument();
    expect(platform.books.books.size).toBe(0);
    expect(platform.bookStorage.saved.size).toBe(0);
  });

  it('can open the book anyway', async () => {
    renderInterrupted();
    await userEvent.click(await screen.findByRole('button', { name: 'Open anyway' }));

    expect(await screen.findByRole('button', { name: 'Back to library' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks only once', async () => {
    renderInterrupted();
    await userEvent.click(await screen.findByRole('button', { name: 'Not now' }));
    await userEvent.click(await screen.findByRole('button', { name: /^Sleep Guide/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Back to library' }));

    expect(await screen.findByRole('button', { name: /^Sleep Guide/ })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
