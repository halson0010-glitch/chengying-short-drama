import { Link } from 'react-router-dom';
import type { Drama } from '../../types/drama';
import RevealSection from '../common/RevealSection';
import DramaCard from './DramaCard';

type SectionRailProps = {
  title: string;
  subtitle?: string;
  dramas: Drama[];
};

export default function SectionRail({ title, subtitle, dramas }: SectionRailProps) {
  if (!dramas.length) return null;

  return (
    <RevealSection
      className="mt-12 md:mt-16"
      title={title}
      subtitle={subtitle}
      action={
        <Link to="/category" className="whitespace-nowrap text-sm text-white/45 transition hover:text-accent">
          查看更多
        </Link>
      }
    >
      <div className="relative">
        <div className="rail-scroll flex snap-x gap-4 overflow-x-auto pb-3 md:gap-5">
          {dramas.map((drama, index) => (
            <DramaCard
              key={drama.id}
              drama={drama}
              compact
              moduleName={title}
              position={index + 1}
              revealIndex={index}
              className="w-[145px] shrink-0 snap-start sm:w-[165px] md:w-[178px]"
            />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-canvas to-transparent" />
      </div>
    </RevealSection>
  );
}
