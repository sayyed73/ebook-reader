import type { BookId } from '@/core/library/book';
import { APP_INFO } from '@/config/app-info';
import { AppHeader } from '@/ui/components/AppHeader';
import { Banner } from '@/ui/components/Banner';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { BookIcon, PlusIcon } from '@/ui/components/icons';
import { BookList } from './BookList';
import { useLibrary } from './use-library';
import './LibraryScreen.css';

interface LibraryScreenProps {
  onOpenBook: (id: BookId) => void;
}

export function LibraryScreen({ onOpenBook }: LibraryScreenProps) {
  const { books, importing, error, importBook, dismissError } = useLibrary();

  const handleAdd = () => {
    void importBook().then((id) => {
      if (id) onOpenBook(id);
    });
  };

  const addButton = (variant: 'primary' | 'secondary') => (
    <Button variant={variant} onClick={handleAdd} disabled={importing}>
      <PlusIcon />
      {importing ? 'Adding…' : 'Add book'}
    </Button>
  );

  const hasBooks = books !== null && books.length > 0;

  return (
    <div className="screen">
      <AppHeader title={APP_INFO.name} actions={hasBooks ? addButton('secondary') : undefined} />
      <main className="screen__content library">
        {error && (
          <Banner tone="error" onDismiss={dismissError}>
            {error}
          </Banner>
        )}
        {books !== null &&
          (hasBooks ? (
            <BookList books={books} onOpen={onOpenBook} />
          ) : (
            <EmptyState
              icon={<BookIcon size={56} />}
              title="Your library is empty"
              description="Add an HTML book (.html) to start reading. Your progress is saved on this device."
              action={addButton('primary')}
            />
          ))}
      </main>
    </div>
  );
}
