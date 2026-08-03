import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { StoreScoreRow } from '@/lib/store/api';
import { StoreScoreCover } from './StoreScoreCover';

interface Props {
  scores: StoreScoreRow[];
  linkFor?: (s: StoreScoreRow) => string;
  /** Score id to ring-highlight (e.g. from a ?score= deep link). */
  highlightId?: string | null;
}

/** Single product card — cover on top, title/composer/price below. Also used
 *  by the partner page's horizontal Featured shelf. */
export function StoreScoreCard({ score, to }: { score: StoreScoreRow; to: string }) {
  return (
    <Link to={to} className="block h-full">
      <Card className="overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40 h-full">
        <StoreScoreCover score={score} />
        <CardContent className="p-3">
          <p className="text-sm font-semibold line-clamp-2 leading-snug min-h-[2.5rem]">{score.title}</p>
          <p className="text-xs text-muted-foreground truncate">{score.composer ?? '—'}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-bold text-foreground">${(score.price_cents / 100).toFixed(2)}</span>
            {score.voicing && <Badge variant="secondary" className="text-xs">{score.voicing}</Badge>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function StoreScoreGrid({ scores, linkFor = (s) => `/store/scores/${s.id}`, highlightId }: Props) {
  // `highlightId` distinguishes "this grid owns highlighting" (prop passed,
  // possibly null when there's no ?score= match) from "this grid doesn't"
  // (prop omitted entirely). Only the owning grid emits the `score-<id>`
  // anchor id — otherwise two grids rendering the same score (e.g. a
  // Featured shelf + the full catalog) both emit it, and
  // document.getElementById finds whichever renders first, which may not
  // be the ringed one.
  const ownsHighlighting = highlightId !== undefined;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {scores.map((s) => (
        <div
          key={s.id}
          id={ownsHighlighting ? `score-${s.id}` : undefined}
          className={s.id === highlightId ? 'ring-2 ring-primary rounded-lg' : ''}
        >
          <StoreScoreCard score={s} to={linkFor(s)} />
        </div>
      ))}
    </div>
  );
}
