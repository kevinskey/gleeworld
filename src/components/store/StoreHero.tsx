import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { StoreScoreRow } from '@/lib/store/api';
import { StoreScoreCover } from './StoreScoreCover';

interface Props {
  featured?: StoreScoreRow | null;
  /** Optional slot rendered inside the value-prop fallback card. */
  children?: ReactNode;
}

// Store hero: spotlights the top GW-featured score; falls back to a
// value-prop card when nothing is featured. No Buy-now here — buying
// belongs on the detail page where the license copy lives.
export function StoreHero({ featured, children }: Props) {
  if (!featured) {
    return (
      <div className="rounded-2xl bg-card shadow-sm p-6 space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold">Sheet music direct from composers</h2>
        <p className="text-sm text-muted-foreground">Half of every sale goes to the artist.</p>
        {children}
      </div>
    );
  }

  const byline = [featured.composer, featured.partner?.display_name].filter(Boolean).join(' · ');

  return (
    <div className="rounded-2xl bg-card shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(160px,240px)_1fr] gap-6 p-6">
        <StoreScoreCover score={featured} className="shadow-md rounded-lg" />
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Featured</p>
          <h2 className="text-2xl md:text-3xl font-bold">{featured.title}</h2>
          {byline && <p className="text-sm text-muted-foreground">by {byline}</p>}
          <div className="flex flex-wrap gap-1">
            {featured.voicing && <Badge variant="secondary" className="text-xs">{featured.voicing}</Badge>}
            {featured.difficulty_grade && (
              <Badge variant="secondary" className="text-xs">{featured.difficulty_grade}</Badge>
            )}
            {typeof featured.page_count === 'number' && (
              <Badge variant="secondary" className="text-xs">{featured.page_count} pages</Badge>
            )}
          </div>
          <p className="text-xl font-semibold">${(featured.price_cents / 100).toFixed(2)}</p>
          <Button asChild>
            <Link to={`/store/scores/${featured.id}`}>View score</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
