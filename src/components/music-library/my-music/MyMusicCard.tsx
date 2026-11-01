// Card rendering for a personal score — mirrors the Scores tab's ScoreCard
// layout (icon tile, clamped title, reserved composer line, badge cluster,
// trailing affordance) so the two tabs read as one library.
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, FileMusic, HardDriveDownload, Library as LibraryIcon, Loader2, Pencil, Star, Trash2 } from 'lucide-react';
import { SOFT_CARD } from '@/components/music-library/scores/types';
import type { PersonalScore } from '@/hooks/usePersonalScores';
import { SOURCE_LABEL, isExternalOnly } from './personalScoreDisplay';

/** Compact badge: one size smaller and tighter than the default so a card can
 *  carry source, voicing, tags and state without growing. */
const BADGE = 'text-[11px] leading-4 px-1.5 py-0 font-medium';

/** "Added Mar 3" / "Added Mar 3, 2025" — the year only when it isn't this year. */
function formatAdded(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `Added ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })}`;
}

export function MyMusicCard({
  score, opening, onOpen, onEdit, onRemove, onToggleFavorite,
  published = false, onTogglePublish, savedOnDevice, onToggleDevice,
}: {
  score: PersonalScore;
  opening: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onToggleFavorite: () => void;
  // Librarian-only publish-to-tenant-library affordance; undefined hides it.
  published?: boolean;
  onTogglePublish?: () => void;
  // Save-to-device (offline vault) affordance; undefined hides it (external-
  // only rows, unsupported browsers).
  savedOnDevice?: boolean;
  onToggleDevice?: () => void;
}) {
  const externalOnly = isExternalOnly(score);
  // The action icons used to float over the top-right corner, and the title
  // reserved up to 144px for them — on a 3-up desktop grid that left room
  // for about six characters ("Welco me…", Kevin, 2026-11-01). They now sit
  // in the footer row, so the title owns the card's full width and the card
  // itself can be shorter and denser.
  const added = formatAdded(score.created_at);
  const hoverReveal = '${hoverReveal}';
  return (
    <Card className={`${SOFT_CARD} group relative h-full flex flex-col transition-colors hover:bg-accent/40 focus-within:bg-accent/40`}>
      <CardContent className="p-3 flex-1 flex flex-col">
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
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-muted text-muted-foreground">
              {opening
                ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
                : <FileMusic className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              {/* Titles are often raw upload filenames with no spaces;
                  overflow-wrap:anywhere lets the clamp show two useful lines
                  of an underscore-joined name instead of one overflowing one. */}
              <div
                className="text-sm font-semibold leading-snug line-clamp-2 [overflow-wrap:anywhere]"
                title={score.title || 'Untitled'}
              >
                {score.title || 'Untitled'}
              </div>
              {/* Reserve the composer line so cards stay the same height. */}
              <div className="text-xs text-muted-foreground truncate mt-0.5">
                {score.composer || '\u00A0'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            <Badge variant="secondary" className={`${BADGE} ${score.source === 'upload' ? 'text-muted-foreground' : ''}`}>
              {SOURCE_LABEL[score.source]}
            </Badge>
            {score.voicing && <Badge variant="outline" className={BADGE}>{score.voicing}</Badge>}
            {published && (
              <Badge variant="outline" className={`${BADGE} text-primary border-primary/40`} title="In your group’s library">
                <LibraryIcon className="w-3 h-3 mr-1" />
                Published
              </Badge>
            )}
            {savedOnDevice && (
              <Badge variant="outline" className={`${BADGE} text-muted-foreground`} title="Saved on this device (works offline)">
                <HardDriveDownload className="w-3 h-3 mr-1" />
                On device
              </Badge>
            )}
            {(score.tags ?? []).map((t) => (
              <Badge key={t} variant="outline" className={`${BADGE} text-muted-foreground`}>#{t}</Badge>
            ))}
            {added && (
              <span className="text-[11px] text-muted-foreground ml-auto whitespace-nowrap" title={new Date(score.created_at).toLocaleString()}>
                {added}
              </span>
            )}
          </div>
        </button>
        {/* Footer: per-score actions on the left, the open affordance on the
            right. Star carries state so it is always visible; the rest reveal
            on hover at desktop widths and stay visible on touch. */}
        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-0.5 -ml-1">
          {/* Star stays visible always (it carries state); edit/delete
              reveal on hover on desktop like before. */}
          {onToggleDevice && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleDevice(); }}
              className={`p-1 rounded transition-colors ${
                savedOnDevice
                  ? 'text-primary hover:text-primary/70'
                  : 'text-muted-foreground/50 hover:text-foreground ${hoverReveal}'
              }`}
              aria-label={savedOnDevice ? `Remove ${score.title} from this device` : `Save ${score.title} to this device`}
              aria-pressed={savedOnDevice}
              title={savedOnDevice ? 'Remove from this device' : 'Save to this device (works offline)'}
            >
              <HardDriveDownload className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className={`p-1 rounded transition-colors ${
              score.is_favorite
                ? 'text-primary hover:text-primary/70'
                : 'text-muted-foreground/50 hover:text-foreground ${hoverReveal}'
            }`}
            aria-label={score.is_favorite ? `Unfavorite ${score.title}` : `Favorite ${score.title}`}
            aria-pressed={score.is_favorite}
            title={score.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className={`w-4 h-4 ${score.is_favorite ? 'fill-current' : ''}`} />
          </button>
          {onTogglePublish && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onTogglePublish(); }}
              className={`p-1 rounded transition-colors ${
                published
                  ? 'text-primary hover:text-primary/70'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent ${hoverReveal}'
              }`}
              aria-label={published ? `Unpublish ${score.title} from the group library` : `Publish ${score.title} to the group library`}
              aria-pressed={published}
              title={published ? 'Published — click to unpublish' : 'Publish to your group’s library'}
            >
              <LibraryIcon className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className={`p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent ${hoverReveal}`}
            aria-label={`Edit ${score.title}`}
            title="Edit title / composer / voicing"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className={`p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 ${hoverReveal}`}
            aria-label={`Remove ${score.title}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
          </div>
          <button
            type="button"
            onClick={onOpen}
            disabled={opening}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary group-hover:text-primary transition-colors disabled:cursor-wait"
            aria-label={`Open ${score.title}`}
          >
            {opening ? 'Opening…' : externalOnly ? 'Open at source' : 'Open'}
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
