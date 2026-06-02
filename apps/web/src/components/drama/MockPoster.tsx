import { useEffect, useState } from 'react';
import { PlayIcon } from '../common/Icons';

type MockPosterProps = {
  gradient: string;
  title: string;
  posterUrl?: string;
  fallbackPosterUrl?: string;
  tags?: string[];
  showPlay?: boolean;
  className?: string;
};

export default function MockPoster({
  gradient,
  title,
  posterUrl,
  fallbackPosterUrl,
  tags = [],
  showPlay = true,
  className = '',
}: MockPosterProps) {
  const [activeUrl, setActiveUrl] = useState(posterUrl);
  const [posterFailed, setPosterFailed] = useState(false);

  useEffect(() => {
    setActiveUrl(posterUrl);
    setPosterFailed(false);
  }, [posterUrl, fallbackPosterUrl]);

  const handleImageError = () => {
    if (fallbackPosterUrl && activeUrl !== fallbackPosterUrl) {
      setActiveUrl(fallbackPosterUrl);
      return;
    }
    setPosterFailed(true);
  };

  return (
    <div className={`relative aspect-[9/16] overflow-hidden bg-raised ${className}`} style={{ background: gradient }}>
      {activeUrl && !posterFailed && (
        <img
          src={activeUrl}
          alt={`${title} 封面`}
          loading="lazy"
          onError={handleImageError}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute -right-10 top-[14%] h-32 w-32 rounded-full bg-white/20 blur-3xl" />
      <div className="absolute -left-10 bottom-[25%] h-28 w-28 rounded-full bg-black/30 blur-2xl" />
      <div className="absolute inset-x-5 top-[12%] h-px bg-white/20" />
      <div className="absolute bottom-[26%] left-5 top-[12%] w-px bg-white/15" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/10" />
      {showPlay && (
        <span className="absolute left-1/2 top-[45%] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white/90 backdrop-blur transition group-hover:scale-110 group-hover:bg-accent">
          <PlayIcon className="ml-0.5 h-5 w-5" />
        </span>
      )}
      <div className="absolute inset-x-4 bottom-4">
        <p className="text-base font-bold leading-tight drop-shadow">{title}</p>
        {tags.length > 0 && <p className="mt-1 truncate text-[11px] text-white/65">{tags.slice(0, 2).join(' · ')}</p>}
      </div>
    </div>
  );
}
