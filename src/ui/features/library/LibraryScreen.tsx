import { APP_INFO } from '@/config/app-info';
import { AppHeader } from '@/ui/components/AppHeader';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { BookIcon, PlusIcon } from '@/ui/components/icons';
import './LibraryScreen.css';

export function LibraryScreen() {
  // Importing is wired up in Release 1 / Phase 2 (reader core).
  const importAvailable = false;

  return (
    <div className="screen">
      <AppHeader title={APP_INFO.name} />
      <main className="screen__content">
        <EmptyState
          icon={<BookIcon size={56} />}
          title="Your library is empty"
          description="Add an HTML book (.html) to start reading. Your progress is saved on this device."
          action={
            <Button variant="primary" disabled={!importAvailable}>
              <PlusIcon />
              Add book
            </Button>
          }
        />
      </main>
    </div>
  );
}
