import { useEffect } from 'react';
import './Toast.css';

interface ToastProps {
  message: string;
  onDone: () => void;
  durationMs?: number;
}

/** Short, non-blocking message. Re-mount (via `key`) to show the same message again. */
export function Toast({ message, onDone, durationMs = 2800 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, durationMs);
    return () => {
      clearTimeout(timer);
    };
  }, [onDone, durationMs]);

  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}
