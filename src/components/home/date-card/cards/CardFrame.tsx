// Shared visual shell for every date card. One place owns the plate styling
// so all five types stay visually identical apart from their content.
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  subtitle?: string;
  onClick?: () => void;
}

export function CardFrame({ icon: Icon, eyebrow, title, subtitle, onClick }: Props) {
  const body = (
    <>
      <div className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground truncate">
            {eyebrow}
          </div>
        )}
        <div className="font-serif text-lg font-semibold leading-tight truncate">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground truncate">{subtitle}</div>}
      </div>
      {onClick && <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />}
    </>
  );

  const cls = 'w-full bg-card border border-border p-4 flex items-center gap-3 text-left';
  return onClick
    ? <button type="button" onClick={onClick} className={cls}>{body}</button>
    : <div className={cls}>{body}</div>;
}
