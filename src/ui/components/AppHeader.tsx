import type { ReactNode } from 'react';
import './AppHeader.css';

interface AppHeaderProps {
  title: string;
  actions?: ReactNode;
}

export function AppHeader({ title, actions }: AppHeaderProps) {
  return (
    <header className="app-header">
      <h1 className="app-header__title">{title}</h1>
      {actions && <div className="app-header__actions">{actions}</div>}
    </header>
  );
}
