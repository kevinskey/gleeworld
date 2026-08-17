// Full piece editor: everything the inline title/composer EditableTexts and
// ghost chips don't cover directly — arranger, voicing, soloists, program
// notes, duration, rights status + copyright, reorder, delete.
//
// Desktop: a Popover anchored to the piece's line on the page (a virtual
// anchor via the registered DOM node — no visible trigger element).
// Mobile (<1024px, useIsMobile): a centered Dialog instead, since there's
// no on-page line to anchor to (piece rows aren't contentEditable there).
//
// Edits are buffered locally and diffed against the piece on a single
// 700ms debounce timer (same semantics the old piece editor used) — never
// a write per keystroke, and a blank title is never sent.
import { useEffect, useRef, useState, type RefObject } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { ConcertProgramPiece } from '@/hooks/useConcertPrograms';
import type { RightsStatus } from '@/lib/concertPlanner/types';
import { PIECE_FIELD_DEBOUNCE_MS as DEBOUNCE_MS } from './editDebounce';

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** "3:45" / "45" → seconds; anything unparseable → null (never printed anyway). */
function parseDuration(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const withColon = t.match(/^(\d+):([0-5]?\d)$/);
  if (withColon) return Number(withColon[1]) * 60 + Number(withColon[2]);
  if (/^\d+$/.test(t)) return Number(t);
  return null;
}

interface Draft {
  title: string; composer: string; arranger: string; voicing: string; soloists: string;
  program_notes: string; duration: string; rights_status: RightsStatus; copyright_info: string;
}

function draftFromPiece(p: ConcertProgramPiece): Draft {
  return {
    title: p.title ?? '',
    composer: p.composer ?? '',
    arranger: p.arranger ?? '',
    voicing: p.voicing ?? '',
    soloists: p.soloists ?? '',
    program_notes: p.program_notes ?? '',
    duration: formatDuration(p.duration_seconds),
    rights_status: p.rights_status ?? 'unknown',
    copyright_info: p.copyright_info ?? '',
  };
}

export interface PieceEditPopoverProps {
  piece: ConcertProgramPiece | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The piece's title-line DOM node — anchors the desktop popover. */
  anchorEl: HTMLElement | null;
  focusField?: string | null;
  updatePiece: (pieceId: string, patch: Partial<ConcertProgramPiece>) => void;
  onDelete: (pieceId: string) => void;
  onMoveUp: (pieceId: string) => void;
  onMoveDown: (pieceId: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export function PieceEditPopover({
  piece, open, onOpenChange, anchorEl, focusField,
  updatePiece, onDelete, onMoveUp, onMoveDown, canMoveUp = true, canMoveDown = true,
}: PieceEditPopoverProps) {
  const isMobile = useIsMobile();
  const [draft, setDraft] = useState<Draft | null>(piece ? draftFromPiece(piece) : null);
  const dirtyRef = useRef<Set<keyof Draft>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedPieceIdRef = useRef<string | null>(null);
  const pieceRef = useRef<ConcertProgramPiece | null>(piece);
  pieceRef.current = piece;
  // Mirrors `draft` so `flush` can read the latest value from a plain
  // function (setState updaters must stay pure — React may invoke them
  // twice in StrictMode dev builds, which would double-fire updatePiece).
  const draftRef = useRef<Draft | null>(draft);
  draftRef.current = draft;

  // Re-seed the draft only when a DIFFERENT piece opens — a background
  // refetch reflecting our own optimistic write must not clobber what the
  // user is mid-typing.
  useEffect(() => {
    if (piece && piece.id !== loadedPieceIdRef.current) {
      loadedPieceIdRef.current = piece.id;
      setDraft(draftFromPiece(piece));
      dirtyRef.current = new Set();
    } else if (!piece) {
      loadedPieceIdRef.current = null;
    }
  }, [piece]);

  const flush = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const current = pieceRef.current;
    const d = draftRef.current;
    if (!current || !d || dirtyRef.current.size === 0) return;
    const patch: Partial<ConcertProgramPiece> = {};
    for (const field of dirtyRef.current) {
      switch (field) {
        case 'title': {
          const v = d.title.trim();
          if (v) patch.title = d.title;
          break;
        }
        case 'composer': patch.composer = d.composer || null; break;
        case 'arranger': patch.arranger = d.arranger || null; break;
        case 'voicing': patch.voicing = d.voicing || null; break;
        case 'soloists': patch.soloists = d.soloists || null; break;
        case 'program_notes': patch.program_notes = d.program_notes || null; break;
        case 'duration': patch.duration_seconds = parseDuration(d.duration); break;
        case 'rights_status': patch.rights_status = d.rights_status; break;
        case 'copyright_info': patch.copyright_info = d.copyright_info || null; break;
      }
    }
    dirtyRef.current = new Set();
    if (Object.keys(patch).length > 0) updatePiece(current.id, patch);
  };

  // Mirrors `flush` itself so the unmount effect below (registered once, at
  // mount, with an empty dep array) always calls the LATEST closure rather
  // than the one captured on the first render.
  const flushRef = useRef(flush);
  flushRef.current = flush;

  // Navigating away (or the piece row disappearing) mid-debounce must not
  // silently drop a just-typed edit — flush whatever's pending instead of
  // just cancelling the timer. `flush` itself no-ops when dirtyRef is
  // already empty, so this is safe even if the timer already fired.
  useEffect(() => () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    flushRef.current();
  }, []);

  // A fast open → edit → close (e.g. Delete right after typing) must not
  // drop the pending edit.
  const wasOpenRef = useRef(open);
  useEffect(() => {
    if (wasOpenRef.current && !open) flush();
    wasOpenRef.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof Draft>(field: K, value: Draft[K]) => {
    setDraft((d) => (d ? { ...d, [field]: value } : d));
    dirtyRef.current.add(field);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, DEBOUNCE_MS);
  };

  if (!piece || !draft) return null;

  const body = (
    <div className="space-y-3">
      <div>
        <Label htmlFor="pep-title" className="text-xs">Title</Label>
        <Input
          id="pep-title" value={draft.title}
          onChange={(e) => set('title', e.target.value)}
          autoFocus={!focusField || focusField === 'title'}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="pep-composer" className="text-xs">Composer</Label>
          <Input
            id="pep-composer" value={draft.composer}
            onChange={(e) => set('composer', e.target.value)}
            autoFocus={focusField === 'composer'}
          />
        </div>
        <div>
          <Label htmlFor="pep-arranger" className="text-xs">Arranger</Label>
          <Input
            id="pep-arranger" value={draft.arranger}
            onChange={(e) => set('arranger', e.target.value)}
            autoFocus={focusField === 'arranger'}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="pep-voicing" className="text-xs">Voicing</Label>
          <Input
            id="pep-voicing" value={draft.voicing}
            onChange={(e) => set('voicing', e.target.value)}
            autoFocus={focusField === 'voicing'}
          />
        </div>
        <div>
          <Label htmlFor="pep-duration" className="text-xs">Duration (mm:ss)</Label>
          <Input
            id="pep-duration" value={draft.duration} placeholder="3:45"
            onChange={(e) => set('duration', e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="pep-soloists" className="text-xs">Soloists</Label>
        <Input
          id="pep-soloists" value={draft.soloists}
          onChange={(e) => set('soloists', e.target.value)}
          autoFocus={focusField === 'soloists'}
        />
      </div>
      <div>
        <Label htmlFor="pep-notes" className="text-xs">Program notes</Label>
        <Textarea
          id="pep-notes" rows={3} value={draft.program_notes}
          onChange={(e) => set('program_notes', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="pep-rights" className="text-xs">Rights</Label>
        <Select value={draft.rights_status} onValueChange={(v) => set('rights_status', v as RightsStatus)}>
          <SelectTrigger id="pep-rights">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unknown">Unknown</SelectItem>
            <SelectItem value="public_domain">Public domain</SelectItem>
            <SelectItem value="licensed">Licensed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {draft.rights_status === 'licensed' ? (
        <div>
          <Label htmlFor="pep-copyright" className="text-xs">Copyright info</Label>
          <Input
            id="pep-copyright" value={draft.copyright_info}
            onChange={(e) => set('copyright_info', e.target.value)}
          />
        </div>
      ) : null}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="sm" aria-label="Move up" disabled={!canMoveUp} onClick={() => onMoveUp(piece.id)}>
            <ArrowUp className="w-3.5 h-3.5" />
          </Button>
          <Button type="button" variant="outline" size="sm" aria-label="Move down" disabled={!canMoveDown} onClick={() => onMoveDown(piece.id)}>
            <ArrowDown className="w-3.5 h-3.5" />
          </Button>
        </div>
        <Button
          type="button" variant="outline" size="sm" className="text-destructive"
          onClick={() => { flush(); onDelete(piece.id); onOpenChange(false); }}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit piece</DialogTitle></DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor virtualRef={{ current: anchorEl } as unknown as RefObject<HTMLElement>} />
      <PopoverContent className="w-80" align="start" side="bottom">
        {body}
      </PopoverContent>
    </Popover>
  );
}
