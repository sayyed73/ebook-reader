import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { APP_INFO } from '@/config/app-info';
import { pickedFile } from '@/test/fakes';
import { renderWithServices } from '@/test/render';
import { LibraryScreen } from './LibraryScreen';

describe('LibraryScreen', () => {
  it('shows an empty library', async () => {
    renderWithServices(<LibraryScreen onOpenBook={vi.fn()} />);

    expect(screen.getByRole('heading', { level: 1, name: APP_INFO.name })).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Your library is empty' }),
    ).toBeInTheDocument();
  });

  it('imports a picked book and opens it', async () => {
    const onOpenBook = vi.fn();
    const { platform } = renderWithServices(<LibraryScreen onOpenBook={onOpenBook} />);
    platform.filePicker.next = pickedFile('guide.html', '<title>Sleep Guide</title>');

    await userEvent.click(await screen.findByRole('button', { name: 'Add book' }));

    expect(await screen.findByRole('button', { name: /^Sleep Guide/ })).toBeInTheDocument();
    await waitFor(() => {
      expect(onOpenBook).toHaveBeenCalledWith(expect.any(String));
    });
  });

  it('explains why a file was rejected', async () => {
    const onOpenBook = vi.fn();
    const { platform } = renderWithServices(<LibraryScreen onOpenBook={onOpenBook} />);
    platform.filePicker.next = pickedFile('notes.pdf', '%PDF');

    await userEvent.click(await screen.findByRole('button', { name: 'Add book' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Only HTML books');
    expect(onOpenBook).not.toHaveBeenCalled();
  });

  it('does nothing when the picker is cancelled', async () => {
    const onOpenBook = vi.fn();
    renderWithServices(<LibraryScreen onOpenBook={onOpenBook} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Add book' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onOpenBook).not.toHaveBeenCalled();
  });

  it('deletes a book after confirmation', async () => {
    const { platform } = renderWithServices(<LibraryScreen onOpenBook={vi.fn()} />);
    platform.filePicker.next = pickedFile('guide.html', '<title>Sleep Guide</title>');
    await userEvent.click(await screen.findByRole('button', { name: 'Add book' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Delete Sleep Guide' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('will be removed from this device');
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(
      await screen.findByRole('heading', { name: 'Your library is empty' }),
    ).toBeInTheDocument();
    expect(platform.books.books.size).toBe(0);
  });

  it('keeps the book when deletion is cancelled', async () => {
    const { platform } = renderWithServices(<LibraryScreen onOpenBook={vi.fn()} />);
    platform.filePicker.next = pickedFile('guide.html', '<title>Sleep Guide</title>');
    await userEvent.click(await screen.findByRole('button', { name: 'Add book' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Delete Sleep Guide' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(platform.books.books.size).toBe(1);
  });

  it('opens the existing book when the same file is added again', async () => {
    const onOpenBook = vi.fn();
    const { platform } = renderWithServices(<LibraryScreen onOpenBook={onOpenBook} />);
    platform.filePicker.next = pickedFile('guide.html', '<title>Sleep Guide</title>');
    await userEvent.click(await screen.findByRole('button', { name: 'Add book' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Add book' }));

    await waitFor(() => {
      expect(onOpenBook).toHaveBeenCalledTimes(2);
    });
    expect(onOpenBook.mock.calls[1]).toEqual(onOpenBook.mock.calls[0]);
    expect(platform.books.books.size).toBe(1);
  });

  it('asks whether to replace a different version, and replace keeps one book', async () => {
    const onOpenBook = vi.fn();
    const { platform } = renderWithServices(<LibraryScreen onOpenBook={onOpenBook} />);
    platform.filePicker.next = pickedFile('guide.html', '<title>Sleep Guide</title>v1');
    await userEvent.click(await screen.findByRole('button', { name: 'Add book' }));
    platform.filePicker.next = pickedFile('guide.html', '<title>Sleep Guide 2</title>v2');
    await userEvent.click(await screen.findByRole('button', { name: 'Add book' }));

    expect(await screen.findByRole('dialog')).toHaveTextContent('already in your library');
    await userEvent.click(await screen.findByRole('button', { name: 'Replace' }));

    expect(await screen.findByRole('button', { name: /^Sleep Guide 2/ })).toBeInTheDocument();
    expect(platform.books.books.size).toBe(1);
    await waitFor(() => {
      expect(onOpenBook).toHaveBeenCalledTimes(2);
    });
  });

  it('can keep both versions', async () => {
    const { platform } = renderWithServices(<LibraryScreen onOpenBook={vi.fn()} />);
    platform.filePicker.next = pickedFile('guide.html', '<title>Sleep Guide</title>v1');
    await userEvent.click(await screen.findByRole('button', { name: 'Add book' }));
    platform.filePicker.next = pickedFile('guide.html', '<title>Sleep Guide</title>v2');
    await userEvent.click(await screen.findByRole('button', { name: 'Add book' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Keep both' }));

    expect(await screen.findAllByRole('button', { name: /^Sleep Guide/ })).toHaveLength(2);
  });
});
