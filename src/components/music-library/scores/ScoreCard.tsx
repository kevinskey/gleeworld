import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Music, Headphones, Library as LibraryIcon, Layers, MoreHorizontal,
  Pencil, PencilLine, Share2, ListMusic,
} from 'lucide-react';
import { RightsBadge } from '@/components/policies/RightsBadge';
import { SOFT_CARD, isSharedAnyLane, sharingSummary, type ScoreRow } from './types';

export function ScoreCard({
  row, courseCode, canEdit, onAnnotate, onAttachAudio, onEdit, onToggleShare, onPartTracks,
  onAddToCollection,
  selectable = false, selected = false, onToggleSelect,
}: {
  row: ScoreRow;
  courseCode: string | null;
  canEdit: boolean;
  onAnnotate: () => void;
  onAttachAudio: () => void;
  onEdit: () => void;
  onToggleShare: () => void;
  onPartTracks: () => void;
  onAddToCollection?: () => void;
  // Bulk-select mode: clicking toggles selection instead of opening the
  // viewer; a checkbox mirrors the state.
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const hasPdf = !!row.pdf_url || !!row.storage_path;
  const hasAudio = !!row.audio_url;
  const copies = row.physical_copies_count ?? 0;
  const clickable = selectable || hasPdf;
  const handleActivate = selectable ? onToggleSelect : (hasPdf ? onAnnotate : undefined);
  return (
    <Card
      className={`${SOFT_CARD} h-full flex flex-col relative ${clickable ? 'cursor-pointer transition-colors hover:bg-accent/40' : ''} ${selected ? 'ring-2 ring-primary' : ''}`}
      onClick={handleActivate}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-pressed={selectable ? selected : undefined}
      onKeyDown={
        handleActivate
          ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleActivate(); } }
          : undefined
      }
    >
      {selectable && (
        <div className="absolute top-2.5 right-2.5 z-10">
          <Checkbox checked={selected} className="pointer-events-none bg-background" aria-hidden />
        </div>
      )}
      <CardContent className="p-3 sm:p-4 flex-1 flex flex-col">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-muted text-muted-foreground">
            <Music className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            {/* Titles are frequently raw upload filenames with no spaces, so
                wrap on any character — truncating them to one line hid the
                only part that distinguishes one score from another. */}
            <div
              className="text-sm font-semibold leading-snug line-clamp-2 break-words"
              title={row.title || 'Untitled'}
            >
              {row.title || 'Untitled'}
            </div>
            {/* Always reserve the composer line so cards stay the same
                height whether composer was provided or not. */}
            <div className="text-sm text-muted-foreground truncate mt-0.5">
              {row.composer || '\u00A0'}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <RightsBadge
                status={row.rights_status}
                seatCount={row.license_seat_count}
                warning={
                  row.rights_status === 'licensed' && row.license_expires_at && new Date(row.license_expires_at) < new Date()
                    ? 'expired'
                    : null
                }
                compact
              />
              {row.voicing && <Badge variant="outline" className="text-xs">{row.voicing}</Badge>}
              {row.difficulty_level && <Badge variant="outline" className="text-xs">{row.difficulty_level}</Badge>}
              {courseCode ? (
                <Badge variant="outline" className="text-xs">{courseCode}</Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">Platform</Badge>
              )}
              {hasAudio && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  <Headphones className="w-3 h-3 mr-1" />
                  Audio
                </Badge>
              )}
              {/* Only worth a badge when copies actually exist — "0 physical
                  copies" was on every card and crowded out the badges that
                  carry information. */}
              {copies > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs max-w-full"
                  title={`${copies} ${copies === 1 ? 'physical copy' : 'physical copies'}${row.physical_location ? ` · ${row.physical_location}` : ''}`}
                >
                  <LibraryIcon className="w-3 h-3 mr-1 shrink-0" />
                  <span className="truncate">
                    {copies} {copies === 1 ? 'copy' : 'copies'}
                    {row.physical_location ? ` · ${row.physical_location}` : ''}
                  </span>
                </Badge>
              )}
              {/* At-a-glance sharing — librarians only; members don't need
                  to reason about who else can see a score. */}
              {canEdit && (() => {
                const share = sharingSummary(row);
                return (
                  <Badge
                    variant="outline"
                    className={`text-xs max-w-full ${share.shared ? '' : 'text-muted-foreground'}`}
                    title={share.detail}
                  >
                    <Share2 className="w-3 h-3 mr-1 shrink-0" />
                    <span className="truncate">{share.label}</span>
                  </Badge>
                );
              })()}
            </div>
          </div>
        </div>
        {/* Secondary actions live in one "More" menu so the row never
            spills past the card edge; Annotate — the action performers
            actually reach for — stays as the one labelled button. Share
            keeps its own button for librarians (highest-frequency action,
            and its variant mirrors the sharing state). */}
        <div className="flex flex-wrap items-center justify-end gap-1.5 mt-auto pt-3">
          {canEdit && (
            <Button
              variant={isSharedAnyLane(row) ? 'secondary' : 'outline'}
              size="sm"
              className="shrink-0"
              onClick={(e) => { e.stopPropagation(); onToggleShare(); }}
              aria-label={isSharedAnyLane(row) ? 'Shared — review sharing' : 'Share this score'}
              title={sharingSummary(row).detail}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
                aria-label="More actions"
                title="More actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {canEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="w-4 h-4 mr-2" /> Edit details
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onPartTracks}>
                <ListMusic className="w-4 h-4 mr-2" /> Part tracks
              </DropdownMenuItem>
              {canEdit && hasPdf && (
                <DropdownMenuItem onClick={onAttachAudio}>
                  <Headphones className="w-4 h-4 mr-2" /> {hasAudio ? 'Audio tracks' : 'Attach audio'}
                </DropdownMenuItem>
              )}
              {canEdit && onAddToCollection && (
                <DropdownMenuItem onClick={onAddToCollection}>
                  <Layers className="w-4 h-4 mr-2" /> Add to collection
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {hasPdf && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={(e) => { e.stopPropagation(); onAnnotate(); }}
            >
              <PencilLine className="w-4 h-4 mr-1.5" />
              Annotate
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
