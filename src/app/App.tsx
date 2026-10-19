import { useCallback, useState } from 'react';
import type { BookId } from '@/core/library/book';
import { LibraryScreen } from '@/ui/features/library/LibraryScreen';
import { ReaderScreen } from '@/ui/features/reader/ReaderScreen';
import { useServices } from './services-context';

type View = { readonly name: 'library' } | { readonly name: 'reader'; readonly bookId: BookId };

export function App() {
  const { interruptedBookId } = useServices();
  const [view, setView] = useState<View>({ name: 'library' });
  const [recoveryBookId, setRecoveryBookId] = useState(interruptedBookId);

  const openBook = useCallback((bookId: BookId) => {
    setView({ name: 'reader', bookId });
  }, []);
  const clearRecovery = useCallback(() => {
    setRecoveryBookId(null);
  }, []);

  if (view.name === 'reader') {
    return (
      <ReaderScreen
        bookId={view.bookId}
        onClose={() => {
          setView({ name: 'library' });
        }}
      />
    );
  }
  return (
    <LibraryScreen
      onOpenBook={openBook}
      interruptedBookId={recoveryBookId}
      onRecoveryHandled={clearRecovery}
    />
  );
}
