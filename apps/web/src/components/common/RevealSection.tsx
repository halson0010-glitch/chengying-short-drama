import type { ReactNode } from 'react';
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll';

type RevealSectionProps = {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
};

export default function RevealSection({
  title,
  subtitle,
  action,
  children,
  className = '',
  headerClassName = '',
  contentClassName = '',
}: RevealSectionProps) {
  const { ref, revealed } = useRevealOnScroll<HTMLElement>();

  return (
    <section ref={ref} className={`reveal-section ${revealed ? 'is-revealed' : ''} ${className}`}>
      {(title || subtitle || action) && (
        <div className={`reveal-title mb-5 flex items-end justify-between gap-3 ${headerClassName}`}>
          <div>
            {title && <h2 className="text-xl font-bold md:text-2xl lg:text-[28px]">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-white/45">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={`reveal-content ${contentClassName}`}>{children}</div>
    </section>
  );
}
