import { render, screen } from '@testing-library/react';
import { APP_INFO } from '@/config/app-info';
import { LibraryScreen } from './LibraryScreen';

describe('LibraryScreen', () => {
  it('shows the app name and an empty library', () => {
    render(<LibraryScreen />);

    expect(screen.getByRole('heading', { level: 1, name: APP_INFO.name })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your library is empty' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add book' })).toBeInTheDocument();
  });
});
