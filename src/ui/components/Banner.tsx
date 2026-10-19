import type { ReactNode } from 'react';
import { CloseIcon } from './icons';
import './Banner.css';

interface BannerProps {
  tone: 'info' | 'error';
  children: ReactNode;
  onDismiss?: () => void;
  action?: ReactNode;
}

export function Banner({ tone, children, onDismiss, action }: BannerProps) {
  return (
    <div className={`banner banner--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <div className="banner__message">{children}</div>
      {action}
      {onDismiss && (
        <button type="button" className="banner__dismiss" onClick={onDismiss} aria-label="Dismiss">
          <CloseIcon size={18} />
        </button>
      )}
    </div>
  );
}
