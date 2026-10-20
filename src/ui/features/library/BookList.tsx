import type { Book, BookId } from '@/core/library/book';
import { IconButton } from '@/ui/components/IconButton';
import { BookIcon, TrashIcon } from '@/ui/components/icons';
import { describeSourceFolder, formatFileSize, formatRelativeTime } from '@/ui/format';
import './BookList.css';

interface BookListProps {
  books: readonly Book[];
  onOpen: (id: BookId) => void;
  onDelete: (book: Book) => void;
}

export function BookList({ books, onOpen, onDelete }: BookListProps) {
  return (
    <ul className="book-list" aria-label="Books">
      {books.map((book) => (
        <li key={book.id} className="book-card">
          <button
            type="button"
            className="book-card__open"
            onClick={() => {
              onOpen(book.id);
            }}
          >
            <span className="book-card__cover" aria-hidden="true">
              <BookIcon size={28} />
            </span>
            <span className="book-card__body">
              <span className="book-card__title">{book.title}</span>
              <span className="book-card__meta">{describeActivity(book)}</span>
              <span className="book-card__meta">
                {describeFile(book)} · {formatFileSize(book.sizeBytes)}
              </span>
            </span>
          </button>
          <IconButton
            className="book-card__delete"
            label={`Delete ${book.title}`}
            icon={<TrashIcon size={18} />}
            onClick={() => {
              onDelete(book);
            }}
          />
        </li>
      ))}
    </ul>
  );
}

/** File name, prefixed with its folder when known so copies from different folders are told apart. */
function describeFile(book: Book): string {
  const folder = describeSourceFolder(book.sourceLocation);
  return folder ? `${folder}/${book.fileName}` : book.fileName;
}

function describeActivity(book: Book): string {
  return book.lastOpenedAt === null
    ? `Added ${formatRelativeTime(book.importedAt)}`
    : `Opened ${formatRelativeTime(book.lastOpenedAt)}`;
}
