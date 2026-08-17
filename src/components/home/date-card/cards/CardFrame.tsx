// Shared visual shell for every date card. One place owns the plate styling
// so all five types stay visually identical apart from their content.
import { useContext } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { DateCardSwitcherContext } from '../switcherContext';

interface Props {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  subtitle?: string;
  onClick?: () => void;
}

export function CardFrame({ icon: Icon, eyebrow, title, subtitle, onClick }: Props) {
  // Admin type-switcher, threaded in by DateCardSlot. Lives at the end of
  // the eyebrow row so it never crowds the '›' action chevron on the right.
  const switcher = useContext(DateCardSwitcherContext);
  const body = (
    <>
      <div className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        {(eyebrow || switcher) && (
          <div className="flex items-center gap-1.5 min-w-0">
            {eyebrow && (
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground truncate">
                {eyebrow}
              </span>
            )}
            {switcher}
          </div>
        )}
        <div className="font-serif text-lg font-semibold leading-tight truncate">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground truncate">{subtitle}</div>}
      </div>
      {onClick && <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />}
    </>
  );

  const cls = 'w-full bg-card border border-border rounded-2xl p-4 flex items-center gap-3 text-left';
  return onClick
    ? <button type="button" onClick={onClick} className={cls}>{body}</button>
    : <div className={cls}>{body}</div>;
}
