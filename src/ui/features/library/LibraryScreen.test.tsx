import { screen } from '@testing-library/react';
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

    expect(await screen.findByRole('button', { name: /Sleep Guide/ })).toBeInTheDocument();
    expect(onOpenBook).toHaveBeenCalledWith(expect.any(String));
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
});
