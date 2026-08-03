// Card rendering for a personal score — mirrors the Scores tab's ScoreCard
// layout (icon tile, clamped title, reserved composer line, badge cluster,
// trailing affordance) so the two tabs read as one library.
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, FileMusic, Loader2, Pencil, Star, Trash2 } from 'lucide-react';
import { SOFT_CARD } from '@/components/music-library/scores/types';
import type { PersonalScore } from '@/hooks/usePersonalScores';
import { SOURCE_LABEL, isExternalOnly } from './personalScoreDisplay';

export function MyMusicCard({
  score, opening, onOpen, onEdit, onRemove, onToggleFavorite,
}: {
  score: PersonalScore;
  opening: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onToggleFavorite: () => void;
}) {
  const externalOnly = isExternalOnly(score);
  return (
    <Card className={`${SOFT_CARD} group relative h-full flex flex-col transition-colors hover:bg-accent/40 focus-within:bg-accent/40`}>
      <CardContent className="p-3 sm:p-4 flex-1 flex flex-col">
        {/* Whole card opens the PDF (or the source site for external rows).
            The trailing icon is the affordance — without it the card reads
            as an inert list row, since there is no thumbnail and the source
            badge looks like a status. */}
        <button
          type="button"
          className="block w-full text-left cursor-pointer disabled:cursor-wait flex-1 flex flex-col"
          onClick={onOpen}
          disabled={opening}
          aria-label={`Open ${score.title}`}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-muted text-muted-foreground">
              {opening
                ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
                : <FileMusic className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-sm font-semibold leading-snug line-clamp-2 break-words pr-6"
                title={score.title || 'Untitled'}
              >
                {score.title || 'Untitled'}
              </div>
              {/* Reserve the composer line so cards stay the same height. */}
              <div className="text-sm text-muted-foreground truncate mt-0.5">
                {score.composer || '\u00A0'}
              </div>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">{SOURCE_LABEL[score.source]}</Badge>
                {score.voicing && <Badge variant="outline" className="text-xs">{score.voicing}</Badge>}
                {(score.tags ?? []).map((t) => (
                  <Badge key={t} variant="outline" className="text-xs text-muted-foreground">#{t}</Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-auto pt-3 flex items-center justify-end">
            <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
              {opening ? 'Opening…' : externalOnly ? 'Open at source' : 'Open'}
              <ExternalLink className="w-4 h-4" />
            </span>
          </div>
        </button>
        <div className="absolute top-3 right-3 flex items-center gap-0.5">
          {/* Star stays visible always (it carries state); edit/delete
              reveal on hover on desktop like before. */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className={`p-1 rounded transition-colors ${
              score.is_favorite
                ? 'text-primary hover:text-primary/70'
                : 'text-muted-foreground/50 hover:text-foreground opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100'
            }`}
            aria-label={score.is_favorite ? `Unfavorite ${score.title}` : `Favorite ${score.title}`}
            aria-pressed={score.is_favorite}
            title={score.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className={`w-4 h-4 ${score.is_favorite ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100"
            aria-label={`Edit ${score.title}`}
            title="Edit title / composer / voicing"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100"
            aria-label={`Remove ${score.title}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
