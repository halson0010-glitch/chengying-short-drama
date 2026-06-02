type IconProps = {
  className?: string;
};

export function PlayIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.2a1 1 0 0 1 1.53-.85l10 6.8a1 1 0 0 1 0 1.7l-10 6.8A1 1 0 0 1 8 18.8V5.2Z" />
    </svg>
  );
}

export function ChevronDownIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function VolumeIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      <path d="M17 9a4 4 0 0 1 0 6" />
      <path d="M19.5 6.5a8 8 0 0 1 0 11" />
    </svg>
  );
}

export function FullscreenIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4" />
    </svg>
  );
}

export function HeartIcon({ className = 'h-5 w-5', filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M20.8 8.6c0 5.8-8.8 10.6-8.8 10.6S3.2 14.4 3.2 8.6A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.8 2.2Z" />
    </svg>
  );
}

export function SearchIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  );
}

export function CloseIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 6 18 18M18 6 6 18" />
    </svg>
  );
}
