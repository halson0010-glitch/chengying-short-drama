import { useEffect, useMemo, useState } from 'react';
import { PlayIcon } from '../common/Icons';

type MockPosterProps = {
  gradient: string;
  title: string;
  posterUrl?: string;
  fallbackPosterUrl?: string;
  posterCandidates?: string[];
  assetSource?: string;
  tags?: string[];
  showPlay?: boolean;
  className?: string;
};

export default function MockPoster({
  gradient,
  title,
  posterUrl,
  fallbackPosterUrl,
  posterCandidates,
  assetSource,
  tags = [],
  showPlay = true,
  className = '',
}: MockPosterProps) {
  const candidateKey = posterCandidates?.length ? posterCandidates.join('|') : [posterUrl, fallbackPosterUrl].join('|');
  const candidates = useMemo(
    () =>
      (posterCandidates?.length ? posterCandidates : [posterUrl, fallbackPosterUrl]).filter(
        (item): item is string => Boolean(item),
      ),
    [candidateKey, fallbackPosterUrl, posterCandidates, posterUrl],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [posterFailed, setPosterFailed] = useState(false);
  const activeUrl = candidates[activeIndex];

  useEffect(() => {
    setActiveIndex(0);
    setPosterFailed(false);
  }, [candidateKey]);

  const handleImageError = () => {
    if (activeIndex < candidates.length - 1) {
      setActiveIndex((index) => index + 1);
      return;
    }
    setPosterFailed(true);
  };

  return (
    <div className={`relative aspect-[9/16] overflow-hidden bg-raised ${className}`} style={{ background: gradient }}>
      {activeUrl && !posterFailed && (
        <img
          src={activeUrl}
          alt={`${title} poster`}
          loading="lazy"
          data-src-debug={activeUrl}
          data-source-debug={assetSource}
          onError={handleImageError}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="pointer-events-none absolute -right-10 top-[14%] h-32 w-32 rounded-full bg-white/14 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 bottom-[25%] h-28 w-28 rounded-full bg-black/24 blur-2xl" />
      <div className="pointer-events-none absolute inset-x-5 top-[12%] h-px bg-white/16" />
      <div className="pointer-events-none absolute bottom-[26%] left-5 top-[12%] w-px bg-white/10" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/58 via-black/6 to-black/4" />
      {showPlay && (
        <span className="absolute left-1/2 top-[45%] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white/90 backdrop-blur transition group-hover:scale-110 group-hover:bg-accent">
          <PlayIcon className="ml-0.5 h-5 w-5" />
        </span>
      )}
      <div className="absolute inset-x-4 bottom-4">
        <p className="text-clamp-2 text-base font-bold leading-tight drop-shadow">{title}</p>
        {tags.length > 0 && <p className="mt-1 truncate text-[11px] text-white/65">{tags.slice(0, 2).join(' · ')}</p>}
      </div>
    </div>
  );
}
