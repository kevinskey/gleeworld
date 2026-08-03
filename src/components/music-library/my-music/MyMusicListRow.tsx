// Compact one-line-per-score rendering for the My Music list layout —
// mirrors the Scores tab's ScoreListRow so the two tabs read as one library.
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileMusic, Loader2, Pencil, Star, Trash2 } from 'lucide-react';
import type { PersonalScore } from '@/hooks/usePersonalScores';
import { SOURCE_LABEL, isExternalOnly } from './personalScoreDisplay';

export function MyMusicListRow({
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
    <div
      className="flex items-center gap-3 px-3 sm:px-4 py-3 cursor-pointer transition-colors hover:bg-accent/40"
      onClick={opening ? undefined : onOpen}
      role="button"
      tabIndex={0}
      aria-label={`Open ${score.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!opening) onOpen(); }
      }}
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-muted text-muted-foreground">
        {opening
          ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
          : <FileMusic className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold leading-snug truncate">{score.title || 'Untitled'}</div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">{score.composer || '\u00A0'}</div>
        <div className="hidden md:flex items-center gap-2 flex-wrap mt-1.5">
          <Badge variant="secondary" className="text-xs">{SOURCE_LABEL[score.source]}</Badge>
          {score.voicing && <Badge variant="outline" className="text-xs">{score.voicing}</Badge>}
          {(score.tags ?? []).map((t) => (
            <Badge key={t} variant="outline" className="text-xs text-muted-foreground">#{t}</Badge>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
          {opening ? 'Opening…' : externalOnly ? 'Open at source' : 'Open'}
          <ExternalLink className="w-4 h-4" />
        </span>
        <Button
          variant="ghost"
          size="sm"
          className={score.is_favorite ? 'text-primary hover:text-primary/70' : 'text-muted-foreground/60 hover:text-foreground'}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          aria-label={score.is_favorite ? `Unfavorite ${score.title}` : `Favorite ${score.title}`}
          aria-pressed={score.is_favorite}
          title={score.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star className={`w-4 h-4 ${score.is_favorite ? 'fill-current' : ''}`} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          aria-label={`Edit ${score.title}`}
          title="Edit title / composer / voicing"
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label={`Remove ${score.title}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
