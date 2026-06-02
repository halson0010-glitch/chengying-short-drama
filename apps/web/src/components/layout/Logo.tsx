import { Link } from 'react-router-dom';
import { PlayIcon } from '../common/Icons';

type LogoProps = {
  className?: string;
  compactOnMobile?: boolean;
};

export default function Logo({ className = '', compactOnMobile = false }: LogoProps) {
  return (
    <Link to="/" className={`inline-flex shrink-0 items-center gap-2.5 ${className}`} aria-label="橙影短剧首页">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent shadow-glow">
        <PlayIcon className="ml-0.5 h-4 w-4" />
      </span>
      <span className={`whitespace-nowrap text-xl font-bold tracking-tight ${compactOnMobile ? 'hidden sm:inline' : ''}`}>
        橙影短剧
      </span>
    </Link>
  );
}
