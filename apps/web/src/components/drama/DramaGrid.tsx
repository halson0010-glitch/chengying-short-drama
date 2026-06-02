import type { Drama } from '../../types/drama';
import DramaCard from './DramaCard';

type DramaGridProps = {
  dramas: Drama[];
  className?: string;
  moduleName?: string;
  reveal?: boolean;
  onCardClick?: (drama: Drama, position: number) => void;
};

export default function DramaGrid({ dramas, className = '', moduleName = '短剧网格', reveal = false, onCardClick }: DramaGridProps) {
  return (
    <div
      data-testid="drama-grid"
      className={`grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-6 ${className}`}
    >
      {dramas.map((drama, index) => (
        <DramaCard
          key={drama.id}
          drama={drama}
          moduleName={moduleName}
          position={index + 1}
          revealIndex={reveal ? index : undefined}
          onClick={onCardClick}
        />
      ))}
    </div>
  );
}
