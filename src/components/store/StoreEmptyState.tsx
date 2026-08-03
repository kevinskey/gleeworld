import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  icon: LucideIcon;
  headline: string;
  body?: string;
  cta?: ReactNode;
}

export function StoreEmptyState({ icon: Icon, headline, body, cta }: Props) {
  return (
    <Card className="rounded-2xl border border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-2 p-8 text-center">
        <div className="bg-primary/10 rounded-full p-3">
          <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold">{headline}</p>
        {body && <p className="text-xs text-muted-foreground">{body}</p>}
        {cta}
      </CardContent>
    </Card>
  );
}
