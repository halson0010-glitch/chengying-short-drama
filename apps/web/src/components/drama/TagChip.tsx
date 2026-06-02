type TagChipProps = {
  children: string;
  active?: boolean;
  compact?: boolean;
};

export default function TagChip({ children, active = false, compact = false }: TagChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
      } ${
        active
          ? 'border-transparent bg-accent text-white'
          : 'border-white/[0.08] bg-white/[0.06] text-white/65'
      }`}
    >
      {children}
    </span>
  );
}

