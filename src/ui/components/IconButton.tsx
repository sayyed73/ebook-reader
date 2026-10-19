import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './IconButton.css';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  /** Shows the label next to the icon instead of only as an accessible name. */
  showLabel?: boolean;
}

export function IconButton({
  label,
  icon,
  showLabel = false,
  className,
  ...rest
}: IconButtonProps) {
  const classes = ['icon-button', className].filter(Boolean).join(' ');
  return (
    <button
      type="button"
      className={classes}
      aria-label={showLabel ? undefined : label}
      title={label}
      {...rest}
    >
      {icon}
      {showLabel && <span className="icon-button__label">{label}</span>}
    </button>
  );
}
