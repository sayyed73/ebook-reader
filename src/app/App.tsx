import { useState } from 'react';
import type { BookId } from '@/core/library/book';
import { LibraryScreen } from '@/ui/features/library/LibraryScreen';
import { ReaderScreen } from '@/ui/features/reader/ReaderScreen';

type View = { readonly name: 'library' } | { readonly name: 'reader'; readonly bookId: BookId };

export function App() {
  const [view, setView] = useState<View>({ name: 'library' });

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
      onOpenBook={(bookId) => {
        setView({ name: 'reader', bookId });
      }}
    />
  );
}
