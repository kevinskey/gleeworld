// Horizontal scope chip row used by the Music + Media Library headers.
// All / Platform / one chip per accessible class.

import type { ScopeKey, ScopeOption } from '@/hooks/useScopeFilter';

interface Props {
  active: ScopeKey;
  options: ScopeOption[];
  onChange: (key: ScopeKey) => void;
}

export function ScopeFilterChips({ active, options, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((opt) => {
        const isActive = opt.key === active;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={
              isActive
                ? 'inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-primary text-primary-foreground'
                : 'inline-flex items-center px-3 py-1 rounded-full text-sm border border-border text-muted-foreground hover:bg-muted transition-colors'
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
