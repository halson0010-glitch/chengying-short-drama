import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type GradientButtonProps = {
  children: ReactNode;
  icon?: ReactNode;
  to?: string;
  variant?: 'primary' | 'secondary';
  className?: string;
  onClick?: () => void;
  'data-track'?: string;
  'data-drama-id'?: string;
  'data-source'?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>;

export default function GradientButton({
  children,
  icon,
  to,
  variant = 'primary',
  className = '',
  type = 'button',
  onClick,
  'data-track': dataTrack,
  'data-drama-id': dataDramaId,
  'data-source': dataSource,
  ...buttonProps
}: GradientButtonProps) {
  const styles =
    variant === 'primary'
      ? 'bg-accent text-white shadow-glow hover:brightness-110'
      : 'border border-white/10 bg-white/[0.06] text-white hover:border-white/20 hover:bg-white/[0.1]';
  const shared = `inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold transition duration-200 ${styles} ${className}`;
  const trackingProps = {
    'data-track': dataTrack,
    'data-drama-id': dataDramaId,
    'data-source': dataSource,
  };

  if (to) {
    return (
      <Link to={to} className={shared} onClick={onClick} {...trackingProps}>
        {icon}
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={shared} onClick={onClick} {...trackingProps} {...buttonProps}>
      {icon}
      {children}
    </button>
  );
}
