import type { ReactNode } from 'react';

interface Props {
  title: string;
  count?: number;
  action?: ReactNode;
}

// Plain <h2> on purpose — CardTitle's .font-headline (17px) would silently
// override any text-size utility here.
export function StoreSectionHeader({ title, count, action }: Props) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <h2 className="text-lg font-semibold tracking-tight">
        {title}
        {typeof count === 'number' && (
          <span className="text-sm text-muted-foreground font-normal"> · {count}</span>
        )}
      </h2>
      {action}
    </div>
  );
}
