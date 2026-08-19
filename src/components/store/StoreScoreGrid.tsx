// Product cards per the 2026-08-03 store model: cover LEFT, details right
// (title, composer/arranger, badges, optional 30s audio preview), price +
// Preview/Add-to-Cart footer. 1-up phones / 2-up iPad / 4-up desktop.
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import type { StoreScoreRow } from '@/lib/store/api';
import { StoreScoreCover } from './StoreScoreCover';
import { StoreAudioPreview } from './StoreAudioPreview';
import { useCartOptional } from './CartContext';

interface Props {
  scores: StoreScoreRow[];
  linkFor?: (s: StoreScoreRow) => string;
  /** Score id to ring-highlight (e.g. from a ?score= deep link). */
  highlightId?: string | null;
}

export function StoreScoreCard({ score, to }: { score: StoreScoreRow; to: string }) {
  const cart = useCartOptional();
  const navigate = useNavigate();

  const addToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cart) { navigate(to); return; } // Music Library tab renders without a cart
    const res = cart.addItem(score);
    if (!res.ok && res.reason === 'multiple_partners') {
      toast('Your cart has items from another publisher', {
        action: { label: 'Clear cart & add this', onClick: () => { cart.clear(); cart.addItem(score); } },
      });
      return;
    }
    toast.success('Added to cart');
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md hover:border-primary/40 h-full">
      <div className="flex gap-3 p-3 h-full">
        <Link to={to} className="block w-24 sm:w-28 shrink-0 self-start">
          <StoreScoreCover score={score} className="rounded-md shadow-sm" />
        </Link>
        <div className="min-w-0 flex-1 flex flex-col">
          <Link to={to} className="block">
            <p className="text-sm font-semibold line-clamp-2 leading-snug hover:text-primary transition-colors">
              {score.title}
            </p>
          </Link>
          {score.composer && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{score.composer}</p>
          )}
          {score.arranger && (
            <p className="text-xs text-muted-foreground truncate">Arr. {score.arranger}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {score.voicing && <Badge variant="secondary" className="text-xs">{score.voicing}</Badge>}
            {score.tags?.[0] && <Badge variant="outline" className="text-xs">{score.tags[0]}</Badge>}
          </div>
          {score.sample_audio_storage_path && (
            <StoreAudioPreview path={score.sample_audio_storage_path} className="mt-2" />
          )}
          <div className="flex items-center justify-between gap-2 mt-auto pt-2">
            <span className="text-sm font-bold text-foreground">
              ${(score.price_cents / 100).toFixed(2)}
            </span>
            <div className="flex items-center gap-1.5">
              <Button asChild variant="outline" className="h-8 px-2.5 text-xs">
                <Link to={to}>Preview</Link>
              </Button>
              <Button className="h-8 px-2.5 text-xs" onClick={addToCart}>
                Add to Cart <ShoppingCart className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function StoreScoreGrid({ scores, linkFor = (s) => `/store/scores/${s.id}`, highlightId }: Props) {
  // `highlightId` distinguishes "this grid owns highlighting" (prop passed,
  // possibly null when there's no ?score= match) from "this grid doesn't"
  // (prop omitted entirely). Only the owning grid emits the `score-<id>`
  // anchor id — otherwise two grids rendering the same score both emit it
  // and getElementById finds whichever renders first.
  const ownsHighlighting = highlightId !== undefined;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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
