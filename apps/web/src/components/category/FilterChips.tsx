type FilterChipsProps = {
  label: string;
  filterKey: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
};

export default function FilterChips({ label, filterKey, options, value, onChange }: FilterChipsProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-white/[0.06] py-4 last:border-b-0 sm:flex-row">
      <p className="w-14 shrink-0 pt-2 text-sm text-white/42">{label}</p>
      <div className="rail-scroll flex gap-2 overflow-x-auto pb-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            data-track="filter-chip"
            data-filter-key={filterKey}
            data-filter-value={option}
            onClick={() => onChange(option)}
            className={`h-9 shrink-0 rounded-full border px-4 text-sm transition ${
              value === option
                ? 'border-transparent bg-accent text-white shadow-glow'
                : 'border-white/[0.08] bg-white/[0.04] text-white/62 hover:border-white/20 hover:text-white'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
