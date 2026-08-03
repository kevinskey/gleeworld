import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Music, Headphones, Library as LibraryIcon, Pencil, PencilLine, Share2, ListMusic,
} from 'lucide-react';
import { RightsBadge } from '@/components/policies/RightsBadge';
import { isSharedAnyLane, sharingSummary, type ScoreRow } from './types';

// Compact one-line-per-score rendering for the list layout. Same data and
// actions as ScoreCard; the badge cluster collapses away below md so phone
// rows stay title + actions.
export function ScoreListRow({
  row, courseCode, canEdit, onAnnotate, onAttachAudio, onEdit, onToggleShare, onPartTracks,
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
  // Bulk-select mode: clicking toggles selection instead of opening the
  // viewer; a leading checkbox mirrors the state.
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
    <div
      className={`flex items-center gap-3 px-3 sm:px-4 py-3 ${clickable ? 'cursor-pointer transition-colors hover:bg-accent/40' : ''} ${selected ? 'bg-primary/5' : ''}`}
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
        <Checkbox checked={selected} className="pointer-events-none shrink-0" aria-hidden />
      )}
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary">
        <Music className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold leading-snug truncate">{row.title || 'Untitled'}</div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">{row.composer || ' '}</div>
        {/* Badges live inside the flexible title column and wrap, so they can
            never squeeze the title to zero width or push the actions off the
            card edge (which is exactly what happened at iPad widths when this
            cluster was a shrink-0 sibling of the title). */}
        <div className="hidden md:flex items-center gap-2 flex-wrap mt-1.5">
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
        {courseCode ? (
          <Badge variant="outline" className="text-xs">{courseCode}</Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground">Platform</Badge>
        )}
        {hasAudio && (
          <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
            <Headphones className="w-3 h-3 mr-1" />
            Audio
          </Badge>
        )}
        <Badge
          variant="outline"
          className="text-xs"
          title={`${copies} ${copies === 1 ? 'physical copy' : 'physical copies'}${row.physical_location ? ` · ${row.physical_location}` : ''}`}
        >
          <LibraryIcon className="w-3 h-3 mr-1" />
          {copies}
        </Badge>
        {/* At-a-glance sharing — librarians only. */}
        {canEdit && (() => {
          const share = sharingSummary(row);
          return (
            <Badge
              variant="outline"
              className={`text-xs ${share.shared ? '' : 'text-muted-foreground'}`}
              title={share.detail}
            >
              <Share2 className="w-3 h-3 mr-1" />
              {share.label}
            </Badge>
          );
        })()}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onPartTracks(); }}
          aria-label="Part tracks"
          title="Part tracks"
        >
          <ListMusic className="w-4 h-4" />
        </Button>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            aria-label="Edit score details"
          >
            <Pencil className="w-4 h-4" />
          </Button>
        )}
        {canEdit && (
          <Button
            variant={isSharedAnyLane(row) ? 'secondary' : 'outline'}
            size="sm"
            className="text-xs"
            onClick={(e) => { e.stopPropagation(); onToggleShare(); }}
            aria-label={isSharedAnyLane(row) ? 'Shared — review sharing' : 'Share this score'}
            title={sharingSummary(row).detail}
          >
            <Share2 className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">{isSharedAnyLane(row) ? 'Shared' : 'Share'}</span>
          </Button>
        )}
        {hasPdf && (
          <>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={(e) => { e.stopPropagation(); onAttachAudio(); }}
              >
                <Headphones className="w-4 h-4 mr-1.5" />
                {hasAudio ? 'Audio' : 'Attach audio'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onAnnotate(); }}
              aria-label="Annotate score"
            >
              <PencilLine className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Annotate</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
