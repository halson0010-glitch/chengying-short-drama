import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="surface flex min-h-64 flex-col items-center justify-center gap-4 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-2xl text-white/40">
        ∅
      </div>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="mt-2 text-sm text-white/50">{description}</p>}
      </div>
      {action}
    </div>
  );
}

