import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from './Button';
import './ConfirmDialog.css';

export interface DialogAction {
  readonly label: string;
  readonly onSelect: () => void;
  readonly variant?: 'primary' | 'secondary' | 'danger';
}

interface ConfirmDialogProps {
  title: string;
  children: ReactNode;
  actions: readonly DialogAction[];
  /** Called on Escape or the Cancel button. */
  onCancel: () => void;
  cancelLabel?: string;
}

/** Modal confirmation using the native <dialog> element (focus trapping and Escape built in). */
export function ConfirmDialog({
  title,
  children,
  actions,
  onCancel,
  cancelLabel = 'Cancel',
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      dialog?.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id="confirm-dialog-title" className="confirm-dialog__title">
        {title}
      </h2>
      <div className="confirm-dialog__body">{children}</div>
      <div className="confirm-dialog__actions">
        <Button onClick={onCancel}>{cancelLabel}</Button>
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant ?? 'secondary'}
            onClick={action.onSelect}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </dialog>
  );
}
