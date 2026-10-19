import type { Book, BookId } from '@/core/library/book';
import { BookIcon, ShieldIcon } from '@/ui/components/icons';
import { formatFileSize } from '@/ui/format';
import './BookList.css';

interface BookListProps {
  books: readonly Book[];
  onOpen: (id: BookId) => void;
}

export function BookList({ books, onOpen }: BookListProps) {
  return (
    <ul className="book-list" aria-label="Books">
      {books.map((book) => (
        <li key={book.id}>
          <button
            type="button"
            className="book-card"
            onClick={() => {
              onOpen(book.id);
            }}
          >
            <span className="book-card__cover" aria-hidden="true">
              <BookIcon size={28} />
            </span>
            <span className="book-card__body">
              <span className="book-card__title">{book.title}</span>
              <span className="book-card__meta">
                {book.fileName} · {formatFileSize(book.sizeBytes)}
              </span>
              {book.safeMode && (
                <span className="book-card__badge">
                  <ShieldIcon size={14} /> Safe mode
                </span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
