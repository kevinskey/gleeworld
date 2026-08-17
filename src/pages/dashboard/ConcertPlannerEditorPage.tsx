// Concert Planner editor — true-paper canvas with on-page editing.
//
// This page renders the program as it will actually print: a document
// hook (useConcertProgramDoc) owns the blocks-document + pieces + roster;
// useBlockMeasurements measures every flowable unit off-screen at the
// real print width; paginateProgram flows those units onto pages at the
// real print height; ProgramSheetView renders one `.cp-sheet` per page,
// scaled to fit the canvas pane. The rail (Add / Design / Format /
// Details) mutates the document; it never touches layout math directly.
//
// Task 9 wires the editing layer: desktop (lg+) is click-to-edit in place
// via `EditableText` + fast entry (Enter/Tab routing between piece
// title/composer fields); mobile taps open `PieceEditPopover` as a
// Dialog. Rights, arranger, voicing, soloists, notes, duration, and
// reorder/delete all live in that popover. `pieceRefs` is the focus
// registry fast entry drives; `selectedPieceId` also gates the on-page
// ghost chips (BlockRenderers/PieceLine).
//
// IMPORTANT: the off-screen measurement pass (useBlockMeasurements) must
// render the SAME markup print/public will — never the editable one.
// `ctx` (no `edit`) feeds measurement; `viewCtx` (`{ ...ctx, edit }`)
// feeds the visible ProgramSheetView. Mixing them would (a) skew measured
// heights against contentEditable's own metrics and (b) register piece
// refs pointing at invisible off-screen nodes, breaking fast-entry focus.
import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Plus, Type, Minus, Users, Library, ListMusic, AlertTriangle, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { useConcertProgramDoc } from '@/hooks/useConcertProgramDoc';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  PRINT_DESIGNS, newBlockId, type PrintDesign, type ProgramBlock, type ProgramFormat,
  type PieceGroupBlock,
} from '@/lib/concertProgram/types';
import { flattenPieceOrder } from '@/lib/concertProgram/blocks';
import { contentHeightIn } from '@/lib/concertProgram/geometry';
import { paginateProgram } from '@/lib/concertProgram/paginate';
import { paddedPanelCount } from '@/lib/concertProgram/impose';
import { slugify } from '@/lib/concertProgram/slug';
import { validateProgram } from '@/lib/concertPlanner/validate';
import type { ConcertProgram as ValidateConcertProgram } from '@/lib/concertPlanner/types';
import { useBlockMeasurements } from '@/components/concert-program/useBlockMeasurements';
import { ProgramSheetView } from '@/components/concert-program/ProgramSheetView';
import { PieceEditPopover } from '@/components/concert-program/PieceEditPopover';
import { BlockRail } from '@/components/concert-program/BlockRail';
import { RosterPanel } from '@/components/concert-program/RosterPanel';
import { LibraryPickerDialog, type LibraryPickFields } from '@/components/concert-program/LibraryPickerDialog';
import { SetlistImportDialog, type SetlistImportResult } from '@/components/concert-program/SetlistImportDialog';
import { PublishPanel } from '@/components/concert-program/PublishPanel';
import { ConcertProgramPrintView } from '@/components/concert-program/ConcertProgramPrintView';
import { PIECE_FIELD_DEBOUNCE_MS } from '@/components/concert-program/editDebounce';
import type { RenderCtx } from '@/components/concert-program/blocks/BlockRenderers';
import type { ProgramEditCtx } from '@/components/concert-program/editTypes';
import type { ConcertProgramPiece } from '@/hooks/useConcertPrograms';

// ── Rail ─────────────────────────────────────────────────────────────────
// Shared between the lg+ sticky column and the below-lg Sheet drawer so the
// two surfaces can never drift out of sync. Below lg there is no on-page
// editing (mobile piece rows open PieceEditPopover as a Dialog instead), so
// the header fields live here too — this is the ONLY way to edit them on a
// phone/tablet.

interface EditorRailProps {
  design: PrintDesign;
  format: ProgramFormat;
  onDesignChange: (v: PrintDesign) => void;
  onFormatChange: (v: ProgramFormat) => void;
  panelLine: string | null;
  canAddPiece: boolean;
  onAddPiece: () => void;
  onAddFromLibrary: () => void;
  onImportSetlist: () => void;
  onAddText: () => void;
  onAddDivider: () => void;
  canAddRoster: boolean;
  onAddRoster: () => void;
  callTime: string;
  onCallTimeChange: (v: string) => void;
  targetLengthMinutes: string;
  onTargetLengthChange: (v: string) => void;
  totalMinutesLabel: string;
  title: string;
  onTitleChange: (v: string) => void;
  subtitle: string;
  onSubtitleChange: (v: string) => void;
  conductor: string;
  onConductorChange: (v: string) => void;
  accompanist: string;
  onAccompanistChange: (v: string) => void;
  venue: string;
  onVenueChange: (v: string) => void;
  performerGroup: string;
  onPerformerGroupChange: (v: string) => void;
  eventDate: string;
  onEventDateChange: (v: string) => void;
}

function EditorRail({
  design, format, onDesignChange, onFormatChange, panelLine,
  canAddPiece, onAddPiece, onAddFromLibrary, onImportSetlist, onAddText, onAddDivider, canAddRoster, onAddRoster,
  callTime, onCallTimeChange, targetLengthMinutes, onTargetLengthChange, totalMinutesLabel,
  title, onTitleChange, subtitle, onSubtitleChange, conductor, onConductorChange,
  accompanist, onAccompanistChange, venue, onVenueChange, performerGroup, onPerformerGroupChange,
  eventDate, onEventDateChange,
}: EditorRailProps) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Add</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={onAddPiece} disabled={!canAddPiece} className="justify-start">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Piece
          </Button>
          <Button variant="outline" size="sm" onClick={onAddFromLibrary} disabled={!canAddPiece} className="justify-start">
            <Library className="w-3.5 h-3.5 mr-1.5" /> From Library
          </Button>
          <Button variant="outline" size="sm" onClick={onImportSetlist} className="justify-start col-span-2">
            <ListMusic className="w-3.5 h-3.5 mr-1.5" /> Import setlist
          </Button>
          <Button variant="outline" size="sm" onClick={onAddText} className="justify-start">
            <Type className="w-3.5 h-3.5 mr-1.5" /> Text
          </Button>
          <Button variant="outline" size="sm" onClick={onAddDivider} className="justify-start">
            <Minus className="w-3.5 h-3.5 mr-1.5" /> Divider
          </Button>
          <Button variant="outline" size="sm" onClick={onAddRoster} disabled={!canAddRoster} className="justify-start col-span-2">
            <Users className="w-3.5 h-3.5 mr-1.5" /> Roster
          </Button>
        </div>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Design</h3>
        <div className="space-y-2">
          {PRINT_DESIGNS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => onDesignChange(d.value)}
              aria-pressed={design === d.value}
              className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                design === d.value ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/40'
              }`}
            >
              <div className="text-sm font-semibold">{d.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{d.sub}</div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Format</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onFormatChange('letter-portrait')}
            aria-pressed={format === 'letter-portrait'}
            className={`flex-1 text-sm px-3 py-1.5 rounded-md border ${
              format === 'letter-portrait' ? 'border-primary bg-primary/5 font-semibold' : 'border-border hover:border-primary/40'
            }`}
          >
            Letter
          </button>
          <button
            type="button"
            onClick={() => onFormatChange('half-fold')}
            aria-pressed={format === 'half-fold'}
            className={`flex-1 text-sm px-3 py-1.5 rounded-md border ${
              format === 'half-fold' ? 'border-primary bg-primary/5 font-semibold' : 'border-border hover:border-primary/40'
            }`}
          >
            Half-fold
          </button>
        </div>
        {panelLine ? <p className="text-xs text-muted-foreground mt-1.5">{panelLine}</p> : null}
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Details</h3>
        <div className="space-y-3">
          <div>
            <Label htmlFor="cp-title" className="text-xs">Title</Label>
            <Input id="cp-title" value={title} onChange={(e) => onTitleChange(e.target.value)} className="mt-1 text-sm" />
          </div>
          <div>
            <Label htmlFor="cp-subtitle" className="text-xs">Subtitle</Label>
            <Input id="cp-subtitle" value={subtitle} onChange={(e) => onSubtitleChange(e.target.value)} className="mt-1 text-sm" />
          </div>
          <div>
            <Label htmlFor="cp-conductor" className="text-xs">Conductor</Label>
            <Input id="cp-conductor" value={conductor} onChange={(e) => onConductorChange(e.target.value)} className="mt-1 text-sm" />
          </div>
          <div>
            <Label htmlFor="cp-accompanist" className="text-xs">Accompanist</Label>
            <Input id="cp-accompanist" value={accompanist} onChange={(e) => onAccompanistChange(e.target.value)} className="mt-1 text-sm" />
          </div>
          <div>
            <Label htmlFor="cp-performer-group" className="text-xs">Performing group</Label>
            <Input id="cp-performer-group" value={performerGroup} onChange={(e) => onPerformerGroupChange(e.target.value)} className="mt-1 text-sm" />
          </div>
          <div>
            <Label htmlFor="cp-venue" className="text-xs">Venue</Label>
            <Input id="cp-venue" value={venue} onChange={(e) => onVenueChange(e.target.value)} className="mt-1 text-sm" />
          </div>
          <div>
            <Label htmlFor="cp-event-date" className="text-xs">Event date</Label>
            <Input
              id="cp-event-date" type="date" value={eventDate}
              onChange={(e) => onEventDateChange(e.target.value)} className="mt-1 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="cp-call-time" className="text-xs">Call time</Label>
            <Input
              id="cp-call-time"
              type="time"
              value={callTime}
              onChange={(e) => onCallTimeChange(e.target.value)}
              className="mt-1 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="cp-target-length" className="text-xs">Target length (minutes)</Label>
            <Input
              id="cp-target-length"
              type="number"
              inputMode="numeric"
              value={targetLengthMinutes}
              onChange={(e) => onTargetLengthChange(e.target.value)}
              className="mt-1 text-sm"
              placeholder="e.g. 45"
            />
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs bg-muted rounded-full px-2.5 py-1 font-mono tabular-nums">
            {totalMinutesLabel}
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Focus routing helper ────────────────────────────────────────────────
// New piece rows (and the composer field of an existing row) don't exist
// in the DOM the instant addPieceToGroup resolves — React hasn't
// committed the render yet. Retry across a few animation frames rather
// than a fixed timeout, matching the liturgy aid editor's pattern.
function focusWithRetry(getEl: () => HTMLElement | null | undefined, attemptsLeft = 10) {
  const el = getEl();
  if (el) {
    el.focus();
    return;
  }
  if (attemptsLeft <= 0) return;
  requestAnimationFrame(() => focusWithRetry(getEl, attemptsLeft - 1));
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function ConcertPlannerEditorPage() {
  const { id } = useParams<{ id: string }>();
  const {
    program, pieces, roster, isLoading, blocks, setBlocks, persistBlocksNow, addPieceToGroup, updatePiece,
    deletePieceWithUndo, deleteBlockWithUndo, updateProgram, legacyConcert,
  } = useConcertProgramDoc(id);
  const { settings } = useBrandingSettings();
  const isMobile = useIsMobile();

  // Legacy print_format values (trifold, qr-lobby) predate the true-paper
  // rebuild and have no renderer here; they fall back to letter-portrait.
  const format = (program?.print_format === 'half-fold' ? 'half-fold' : 'letter-portrait') as ProgramFormat;
  const design = (program?.print_design ?? 'classic-1943') as PrintDesign;

  const piecesById = useMemo(() => new Map(pieces.map((p) => [p.id, p])), [pieces]);
  const rosterSectionIds = useMemo(
    () => roster.filter((s) => s.members.length > 0).map((s) => s.id),
    [roster],
  );

  const headerCtx = useMemo(() => ({
    title: program?.title ?? '',
    subtitle: program?.subtitle ?? null,
    event_date: program?.event_date ?? null,
    venue: program?.venue ?? null,
    conductor: program?.conductor ?? null,
    accompanist: program?.accompanist ?? null,
    performer_group: program?.performer_group ?? null,
  }), [program]);

  const orgName = settings.org_name;
  const logoUrl = settings.logo_url;

  // ── Validation (Task 12: Publish panel) ─────────────────────────────────
  // validateProgram's ConcertProgram type (src/lib/concertPlanner/types.ts)
  // differs from the hook's (missing here: tenant_id) — validate.ts only
  // ever reads venue/event_date/conductor/accompanist/target_length_minutes
  // off it, so the cast is safe; nothing this function reads is absent
  // from the hook's shape.
  const validation = useMemo(
    () => validateProgram(program as unknown as ValidateConcertProgram | null, pieces, roster),
    [program, pieces, roster],
  );

  // ── Footer QR (Task 12) ──────────────────────────────────────────────────
  const footerBlock = useMemo(() => (blocks ?? []).find((b) => b.kind === 'footer'), [blocks]);
  const footerShowQr = !!(footerBlock && footerBlock.kind === 'footer' && footerBlock.showQr);
  const isPublished = !!program?.published_at;

  const [footerQrDataUrl, setFooterQrDataUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!isPublished || !footerShowQr || !program?.published_slug) {
      setFooterQrDataUrl(null);
      return;
    }
    let cancelled = false;
    const publicUrl = `${window.location.origin}/program/${program.published_slug}`;
    QRCode.toDataURL(publicUrl, { width: 300, margin: 2, color: { dark: '#000000', light: '#FFFFFF' } })
      .then((url) => { if (!cancelled) setFooterQrDataUrl(url); })
      .catch(() => { if (!cancelled) setFooterQrDataUrl(null); });
    return () => { cancelled = true; };
  }, [isPublished, footerShowQr, program?.published_slug]);

  // Plain ctx — no `edit` key. This is what print/public would see, and
  // it's what feeds measurement (see file header note). qrDataUrl is only
  // ever non-null here when published && the footer block has showQr —
  // gated explicitly (not just trusting the effect above) so a toggle-off
  // can never show a stale QR for even one render.
  const ctx: RenderCtx = useMemo(() => ({
    blocks: blocks ?? [],
    piecesById,
    roster,
    program: headerCtx,
    orgName,
    logoUrl,
    qrDataUrl: isPublished && footerShowQr ? footerQrDataUrl : null,
  }), [blocks, piecesById, roster, headerCtx, orgName, logoUrl, isPublished, footerShowQr, footerQrDataUrl]);

  const { heights, measureHost } = useBlockMeasurements({
    blocks: blocks ?? [], ctx, design, format, rosterSectionIds,
  });

  const { pages, oversized } = useMemo(
    () => paginateProgram(blocks ?? [], rosterSectionIds, heights ?? new Map(), contentHeightIn(format)),
    [blocks, rosterSectionIds, heights, format],
  );

  // ── Piece selection + focus registry ────────────────────────────────────
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  // Keyed by pieceId (title editor) or `${pieceId}:composer` (composer editor).
  const pieceRefs = useRef(new Map<string, HTMLElement>());

  const registerPieceEl = useCallback((key: string, el: HTMLElement | null) => {
    if (el) pieceRefs.current.set(key, el);
    else pieceRefs.current.delete(key);
  }, []);

  const onSelectPiece = useCallback((pieceId: string) => setSelectedPieceId(pieceId), []);

  // ── Piece editor popover state ──────────────────────────────────────────
  const [editorPieceId, setEditorPieceId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorFocusField, setEditorFocusField] = useState<string | null>(null);
  const [editorAnchorEl, setEditorAnchorEl] = useState<HTMLElement | null>(null);

  const openPieceEditor = useCallback((pieceId: string, focusField?: string) => {
    setSelectedPieceId(pieceId);
    setEditorPieceId(pieceId);
    setEditorFocusField(focusField ?? null);
    setEditorAnchorEl(pieceRefs.current.get(pieceId) ?? null);
    setEditorOpen(true);
  }, []);

  // ── Print / Save-PDF overlay (Task 13) ──────────────────────────────────
  const [printOpen, setPrintOpen] = useState(false);

  // Print overlay renders READ-ONLY: it must never get `viewCtx` (which
  // carries `edit` for on-page editing) — always the plain measurement
  // `ctx`, defensively copied so a future edit to `ctx` can't leak an
  // `edit` key into it by accident.
  const printCtx: RenderCtx = useMemo(() => ({ ...ctx }), [ctx]);

  const handlePrintClick = useCallback(() => {
    if (flattenPieceOrder(blocks ?? []).length === 0) {
      if (!window.confirm('This program has no pieces — print anyway?')) return;
    }
    setPrintOpen(true);
  }, [blocks]);

  // ── Publish panel (Task 12) ─────────────────────────────────────────────
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Verbatim slug scheme + publish/unpublish semantics from the old editor
  // (ConcertPlannerEditorPage, handlePublish/handleUnpublish): unpublish
  // KEEPS published_slug so re-publishing reuses the same public URL.
  const handlePublish = useCallback(async () => {
    if (!program) return;
    setPublishing(true);
    try {
      const slug = program.published_slug ?? `${slugify(program.title)}-${program.id.slice(0, 6)}`;
      const { data: { user } } = await supabase.auth.getUser();
      await updateProgram.mutateAsync({
        published_at: new Date().toISOString(),
        published_by: user?.id ?? null,
        published_slug: slug,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  }, [program, updateProgram]);

  const handleUnpublish = useCallback(async () => {
    if (!program) return;
    try {
      await updateProgram.mutateAsync({ published_at: null, published_by: null });
      toast.success('Program unpublished');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Unpublish failed');
    }
  }, [program, updateProgram]);

  // Close the panel, select + scroll to the offending piece (scrollIntoView
  // feature-detected — absent in jsdom), then open its popover focused on
  // whichever field the blocker is actually about.
  const onJumpToPiece = useCallback((pieceId: string) => {
    setPublishOpen(false);
    setSelectedPieceId(pieceId);
    const el = pieceRefs.current.get(pieceId);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'center' });
    }
    const isRightsIssue = validation.items.some(
      (i) => i.id === `rights-${pieceId}` || i.id === `rights-info-${pieceId}`,
    );
    openPieceEditor(pieceId, isRightsIssue ? 'rights_status' : 'composer');
  }, [validation, openPieceEditor]);

  const onToggleFooterQr = useCallback((v: boolean) => {
    if (!blocks) return;
    setBlocks(blocks.map((b) => (b.kind === 'footer' ? { ...b, showQr: v } : b)));
  }, [blocks, setBlocks]);

  // ── Debounced piece-field commits for inline (non-popover) edits ───────
  // Same buffer-then-diff semantics the popover uses (shared DEBOUNCE_MS),
  // kept separate per pieceId so editing two different rows in quick
  // succession doesn't cross-contaminate a single shared buffer.
  const pieceCommitRef = useRef(new Map<string, { patch: Partial<ConcertProgramPiece>; timer: ReturnType<typeof setTimeout> }>());
  // Ref mirror so the unmount-only flush effect (empty deps) always calls
  // the LATEST updatePiece rather than whatever was current at mount.
  const updatePieceRef = useRef(updatePiece);
  updatePieceRef.current = updatePiece;

  // Navigating away mid-debounce must not silently drop a just-typed edit —
  // flush every still-pending entry instead of only cancelling its timer.
  // Entries whose timer already fired have already been deleted from the
  // map (see the setTimeout callback below), so this can't double-commit.
  useEffect(() => () => {
    pieceCommitRef.current.forEach((entry, pieceId) => {
      clearTimeout(entry.timer);
      updatePieceRef.current(pieceId, entry.patch);
    });
    pieceCommitRef.current.clear();
  }, []);

  const onCommitPieceField = useCallback((pieceId: string, field: 'title' | 'composer', value: string): boolean => {
    if (field === 'title' && value.trim() === '') return false; // never send a blank title
    const existing = pieceCommitRef.current.get(pieceId);
    if (existing) clearTimeout(existing.timer);
    const patch: Partial<ConcertProgramPiece> = { ...(existing?.patch ?? {}) };
    if (field === 'composer') patch.composer = value || null;
    else patch.title = value;
    const timer = setTimeout(() => {
      pieceCommitRef.current.delete(pieceId);
      updatePiece(pieceId, patch);
    }, PIECE_FIELD_DEBOUNCE_MS);
    pieceCommitRef.current.set(pieceId, { patch, timer });
    return true;
  }, [updatePiece]);

  // ── Fast entry: Enter/Tab routing between piece title + composer fields ─
  const findGroupAndIndex = useCallback((pieceId: string): { groupId: string; index: number } | null => {
    for (const b of blocks ?? []) {
      if (b.kind === 'piece-group') {
        const i = b.pieceIds.indexOf(pieceId);
        if (i !== -1) return { groupId: b.id, index: i };
      }
    }
    return null;
  }, [blocks]);

  const onFastEnter = useCallback((pieceId: string) => {
    const loc = findGroupAndIndex(pieceId);
    if (!loc) return;
    void (async () => {
      const newId = await addPieceToGroup(loc.groupId, loc.index + 1);
      if (newId) focusWithRetry(() => pieceRefs.current.get(newId));
    })();
  }, [findGroupAndIndex, addPieceToGroup]);

  const onTabToComposer = useCallback((pieceId: string) => {
    focusWithRetry(() => pieceRefs.current.get(`${pieceId}:composer`), 0);
  }, []);

  const onComposerEnter = useCallback((pieceId: string) => {
    const loc = findGroupAndIndex(pieceId);
    if (!loc) return;
    const group = (blocks ?? []).find((b) => b.id === loc.groupId) as PieceGroupBlock | undefined;
    const nextId = group?.pieceIds[loc.index + 1];
    if (nextId) {
      focusWithRetry(() => pieceRefs.current.get(nextId));
      return;
    }
    void (async () => {
      const newId = await addPieceToGroup(loc.groupId, 'end');
      if (newId) focusWithRetry(() => pieceRefs.current.get(newId));
    })();
  }, [findGroupAndIndex, blocks, addPieceToGroup]);

  const onAddPieceAtEnd = useCallback((groupId: string) => {
    void (async () => {
      const newId = await addPieceToGroup(groupId, 'end');
      if (newId) focusWithRetry(() => pieceRefs.current.get(newId));
    })();
  }, [addPieceToGroup]);

  // ── Block field commits (group heading/credit, free-text blocks) ───────
  const onCommitBlockField = useCallback((
    blockId: string, field: 'sectionHeading' | 'creditLine' | 'text', value: string,
  ) => {
    if (!blocks) return;
    const next: ProgramBlock[] = blocks.map((b) => {
      if (b.id !== blockId) return b;
      if (field === 'text' && b.kind === 'text') return { ...b, text: value };
      if (field === 'sectionHeading' && b.kind === 'piece-group') {
        return { ...b, sectionHeading: value.trim() === '' ? null : value };
      }
      if (field === 'creditLine' && b.kind === 'piece-group') {
        return { ...b, creditLine: value.trim() === '' ? null : value };
      }
      return b;
    });
    setBlocks(next);
  }, [blocks, setBlocks]);

  // ── Header fields (title/subtitle/conductor/accompanist/venue) ─────────
  // Debounced-diff against the program row, same pattern the rail already
  // used for call_time/target_length_minutes — one draft object now covers
  // every on-page-editable header field plus the rail-only ones.
  const [headerDraft, setHeaderDraft] = useState({
    title: '', subtitle: '', conductor: '', accompanist: '', venue: '', performer_group: '',
    call_time: '', target_length_minutes: '',
  });
  useEffect(() => {
    if (!program) return;
    setHeaderDraft({
      title: program.title || '',
      subtitle: program.subtitle || '',
      conductor: program.conductor || '',
      accompanist: program.accompanist || '',
      venue: program.venue || '',
      performer_group: program.performer_group || '',
      call_time: program.call_time || '',
      target_length_minutes: program.target_length_minutes != null ? String(program.target_length_minutes) : '',
    });
  }, [program?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ref mirrors so `computeHeaderDirty` (called from both the per-keystroke
  // debounce timer and the true-unmount flush effect below) always reads
  // the latest program/draft without needing them in a dependency array.
  const programRef = useRef(program);
  programRef.current = program;
  const headerDraftRef = useRef(headerDraft);
  headerDraftRef.current = headerDraft;
  const updateProgramRef = useRef(updateProgram);
  updateProgramRef.current = updateProgram;

  const computeHeaderDirty = useCallback((): Record<string, unknown> => {
    const p = programRef.current;
    const draft = headerDraftRef.current;
    const dirty: Record<string, unknown> = {};
    if (!p) return dirty;
    (['title', 'subtitle', 'conductor', 'accompanist', 'venue', 'performer_group'] as const).forEach((field) => {
      const draftVal = draft[field];
      const current = (p[field] ?? '') as string;
      if (draftVal === current) return;
      if (field === 'title' && draftVal.trim() === '') return; // never blank the program title
      dirty[field] = draftVal === '' ? null : draftVal;
    });
    if ((p.call_time || '') !== draft.call_time) {
      dirty.call_time = draft.call_time || null;
    }
    const tlmRaw = draft.target_length_minutes.trim();
    const tlm = tlmRaw === '' ? null : Number(tlmRaw);
    if ((p.target_length_minutes ?? null) !== tlm && !Number.isNaN(tlm)) {
      dirty.target_length_minutes = tlm;
    }
    return dirty;
  }, []);

  useEffect(() => {
    if (!program) return;
    const h = window.setTimeout(() => {
      const dirty = computeHeaderDirty();
      if (Object.keys(dirty).length > 0) updateProgramRef.current.mutate(dirty);
    }, 800);
    return () => window.clearTimeout(h);
    // Deliberately keyed ONLY on headerDraft: program/updateProgram are read
    // via refs at flush time so a background refetch (e.g. from our own
    // optimistic mutate) never cancels-and-reschedules the pending timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerDraft]);

  // True-unmount-only flush: this effect's cleanup runs exactly once (empty
  // deps), unlike the per-keystroke debounce effect above whose cleanup
  // fires on every headerDraft change just to cancel-and-reschedule. Without
  // this, navigating away inside the 800ms window drops the pending edit.
  useEffect(() => () => {
    const dirty = computeHeaderDirty();
    if (Object.keys(dirty).length > 0) updateProgramRef.current.mutate(dirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCommitHeaderField = useCallback((
    field: 'title' | 'subtitle' | 'conductor' | 'accompanist' | 'venue' | 'performer_group', value: string,
  ): boolean => {
    if (field === 'title' && value.trim() === '') return false; // never blank the program title
    setHeaderDraft((d) => ({ ...d, [field]: value }));
    return true;
  }, []);

  const onCommitEventDate = useCallback((value: string | null) => {
    updateProgram.mutate({ event_date: value });
  }, [updateProgram]);

  // ── Reorder (popover up/down — moves a piece within/between groups) ────
  const moveOrderedPiece = useCallback((pieceId: string, direction: 'up' | 'down') => {
    if (!blocks) return;
    const groupIdxs = blocks
      .map((b, i) => ({ b, i }))
      .filter((x): x is { b: PieceGroupBlock; i: number } => x.b.kind === 'piece-group');
    const owner = groupIdxs.find(({ b }) => b.pieceIds.includes(pieceId));
    if (!owner) return;
    const posInGroup = owner.b.pieceIds.indexOf(pieceId);
    const ownerPos = groupIdxs.findIndex((g) => g.i === owner.i);

    const next = blocks.slice();
    if (direction === 'up') {
      if (posInGroup > 0) {
        const ids = owner.b.pieceIds.slice();
        [ids[posInGroup - 1], ids[posInGroup]] = [ids[posInGroup], ids[posInGroup - 1]];
        next[owner.i] = { ...owner.b, pieceIds: ids };
      } else if (ownerPos > 0) {
        const prevGroup = groupIdxs[ownerPos - 1];
        const fromIds = owner.b.pieceIds.filter((pid) => pid !== pieceId);
        const toIds = [...prevGroup.b.pieceIds, pieceId];
        next[owner.i] = { ...owner.b, pieceIds: fromIds };
        next[prevGroup.i] = { ...prevGroup.b, pieceIds: toIds };
      } else {
        return;
      }
    } else {
      if (posInGroup < owner.b.pieceIds.length - 1) {
        const ids = owner.b.pieceIds.slice();
        [ids[posInGroup], ids[posInGroup + 1]] = [ids[posInGroup + 1], ids[posInGroup]];
        next[owner.i] = { ...owner.b, pieceIds: ids };
      } else if (ownerPos < groupIdxs.length - 1) {
        const nextGroup = groupIdxs[ownerPos + 1];
        const fromIds = owner.b.pieceIds.filter((pid) => pid !== pieceId);
        const toIds = [pieceId, ...nextGroup.b.pieceIds];
        next[owner.i] = { ...owner.b, pieceIds: fromIds };
        next[nextGroup.i] = { ...nextGroup.b, pieceIds: toIds };
      } else {
        return;
      }
    }
    setBlocks(next);
  }, [blocks, setBlocks]);

  const totalMinutesLabel = useMemo(() => {
    const totalSeconds = pieces.reduce((s, p) => s + (p.duration_seconds ?? 0), 0);
    return `${Math.round(totalSeconds / 60)} min`;
  }, [pieces]);

  // ── Rail "Add" handlers ── real for piece/text/divider/roster; Library +
  // Setlist import stay disabled placeholders until Task 11.
  const lastGroupId = useMemo(() => {
    const groups = (blocks ?? []).filter(
      (b): b is Extract<ProgramBlock, { kind: 'piece-group' }> => b.kind === 'piece-group',
    );
    return groups.length ? groups[groups.length - 1].id : null;
  }, [blocks]);
  const hasRosterBlock = (blocks ?? []).some((b) => b.kind === 'roster');

  const insertBeforeFooter = (block: ProgramBlock) => {
    if (!blocks) return;
    const footerIdx = blocks.findIndex((b) => b.kind === 'footer');
    const idx = footerIdx === -1 ? blocks.length : footerIdx;
    setBlocks([...blocks.slice(0, idx), block, ...blocks.slice(idx)]);
  };

  const handleAddPiece = () => {
    if (!lastGroupId) return;
    void addPieceToGroup(lastGroupId, 'end');
  };
  const handleAddText = () => insertBeforeFooter({ id: newBlockId(), kind: 'text', text: '', align: 'center' });
  const handleAddDivider = () => insertBeforeFooter({ id: newBlockId(), kind: 'divider' });
  const handleAddRoster = () => insertBeforeFooter({ id: newBlockId(), kind: 'roster' });

  // ── Library picker + Setlist import (Task 11) ───────────────────────────
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [setlistOpen, setSetlistOpen] = useState(false);

  // Single pick: reuse the normal add-piece path (same insert-then-splice
  // atomicity addPieceToGroup already gives every other "Add" action).
  const handleLibraryPick = useCallback((fields: LibraryPickFields) => {
    if (!lastGroupId) return;
    void (async () => {
      const newId = await addPieceToGroup(lastGroupId, 'end', fields);
      if (newId) toast.success(`Added "${fields.title}"`);
    })();
  }, [lastGroupId, addPieceToGroup]);

  // Batch import: never a half-imported group. Insert all rows first; only
  // on a full match do we append a new piece-group and persist. Any
  // mismatch (write error, or the persisted-block write itself failing)
  // rolls the inserted rows back and reports the same failure — the user
  // never sees a partially-imported setlist.
  const handleSetlistImport = useCallback(async ({ pieces: rows, setlistId }: SetlistImportResult) => {
    if (!blocks || !id) return;
    const base = flattenPieceOrder(blocks).length;
    const { data, error } = await supabase
      .from('gw_concert_program_pieces')
      .insert(rows.map((r, i) => ({
        program_id: id,
        sort_order: base + i,
        title: r.title ?? 'Untitled',
        composer: r.composer ?? null,
        voicing: r.voicing ?? null,
        sheet_music_id: r.sheet_music_id ?? null,
      })))
      .select('id');
    if (error || !data || data.length !== rows.length) {
      toast.error('Import failed — nothing was added');
      return;
    }
    const group: PieceGroupBlock = {
      id: newBlockId(),
      kind: 'piece-group',
      sectionHeading: null,
      pieceIds: data.map((d: { id: string }) => d.id),
      creditLine: null,
    };
    const footerIdx = blocks.findIndex((b) => b.kind === 'footer');
    const next = blocks.slice();
    next.splice(footerIdx === -1 ? next.length : footerIdx, 0, group);
    const ok = await persistBlocksNow(next);
    if (ok) {
      updateProgram.mutate({ setlist_id: setlistId });
      toast.success(`Imported ${rows.length} piece${rows.length === 1 ? '' : 's'}`);
    } else {
      // Rollback the orphaned insert. Mirrors addPieceToGroup's rollback
      // pattern (Task 7): if the delete itself doesn't cleanly remove every
      // row (RLS-silenced, network error, etc.), don't pretend it worked —
      // warn so it's traceable, and let reconcile visibly re-adopt any
      // orphan rows into the program next time blocks load.
      const insertedIds = data.map((d: { id: string }) => d.id);
      const { data: delData, error: delError } = await supabase
        .from('gw_concert_program_pieces')
        .delete()
        .in('id', insertedIds)
        .select('id');
      if (delError || delData?.length !== insertedIds.length) {
        console.warn('[concert-program] setlist import rollback incomplete — orphan piece rows may remain', {
          expected: insertedIds.length,
          deleted: delData?.length ?? 0,
          error: delError,
        });
      }
      toast.error('Import failed — nothing was added');
    }
  }, [blocks, id, persistBlocksNow, updateProgram]);

  // ── Block rail: whole-block reorder/delete/insert ───────────────────────
  // Title always stays first, footer always stays last (contract enforced
  // by construction here, not by clamping an arbitrary index): every one of
  // these handlers only ever touches the middle slice.
  const [rosterPanelOpen, setRosterPanelOpen] = useState(false);

  // Drag drop is a discrete gesture — persist immediately, never the
  // debounced setBlocks.
  const handleReorderMiddle = useCallback((nextMiddle: ProgramBlock[]) => {
    if (!blocks || blocks.length < 2) return;
    const titleBlock = blocks[0];
    const footerBlock = blocks[blocks.length - 1];
    void persistBlocksNow([titleBlock, ...nextMiddle, footerBlock]);
  }, [blocks, persistBlocksNow]);

  // ▲▼ buttons: also a discrete gesture, also immediate.
  const handleMoveBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
    if (!blocks) return;
    const idx = blocks.findIndex((b) => b.id === blockId);
    if (idx <= 0 || idx >= blocks.length - 1) return; // not found, or title/footer
    const swapWith = direction === 'up' ? idx - 1 : idx + 1;
    if (swapWith <= 0 || swapWith >= blocks.length - 1) return; // would land on title/footer
    const next = blocks.slice();
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    void persistBlocksNow(next);
  }, [blocks, persistBlocksNow]);

  const handleDeleteBlock = useCallback((blockId: string) => {
    void deleteBlockWithUndo(blockId);
  }, [deleteBlockWithUndo]);

  // Hover-revealed "+" between rail rows: typed text, so the debounced
  // setBlocks (not persistBlocksNow) — same path insertBeforeFooter uses.
  const handleInsertTextAt = useCallback((indexInMiddle: number) => {
    if (!blocks || blocks.length < 2) return;
    const footerIdx = blocks.length - 1;
    const insertAt = Math.min(Math.max(indexInMiddle + 1, 1), footerIdx);
    const block: ProgramBlock = { id: newBlockId(), kind: 'text', text: '', align: 'center' };
    setBlocks([...blocks.slice(0, insertAt), block, ...blocks.slice(insertAt)]);
  }, [blocks, setBlocks]);

  const paddedPanels = paddedPanelCount(pages.length);
  const panelLine = format === 'half-fold'
    ? `${pages.length} panels → ${paddedPanels / 4} sheets (${paddedPanels - pages.length} blank panels)`
    : null;

  const railProps: EditorRailProps = {
    design,
    format,
    onDesignChange: (v) => updateProgram.mutate({ print_design: v }),
    onFormatChange: (v) => updateProgram.mutate({ print_format: v }),
    panelLine,
    canAddPiece: !!lastGroupId,
    onAddPiece: handleAddPiece,
    onAddFromLibrary: () => setLibraryOpen(true),
    onImportSetlist: () => setSetlistOpen(true),
    onAddText: handleAddText,
    onAddDivider: handleAddDivider,
    canAddRoster: !hasRosterBlock,
    onAddRoster: handleAddRoster,
    callTime: headerDraft.call_time,
    onCallTimeChange: (v) => setHeaderDraft((d) => ({ ...d, call_time: v })),
    targetLengthMinutes: headerDraft.target_length_minutes,
    onTargetLengthChange: (v) => setHeaderDraft((d) => ({ ...d, target_length_minutes: v })),
    totalMinutesLabel,
    title: headerDraft.title,
    onTitleChange: (v) => setHeaderDraft((d) => ({ ...d, title: v })),
    subtitle: headerDraft.subtitle,
    onSubtitleChange: (v) => setHeaderDraft((d) => ({ ...d, subtitle: v })),
    conductor: headerDraft.conductor,
    onConductorChange: (v) => setHeaderDraft((d) => ({ ...d, conductor: v })),
    accompanist: headerDraft.accompanist,
    onAccompanistChange: (v) => setHeaderDraft((d) => ({ ...d, accompanist: v })),
    venue: headerDraft.venue,
    onVenueChange: (v) => setHeaderDraft((d) => ({ ...d, venue: v })),
    performerGroup: headerDraft.performer_group,
    onPerformerGroupChange: (v) => setHeaderDraft((d) => ({ ...d, performer_group: v })),
    eventDate: program?.event_date ?? '',
    onEventDateChange: (v) => updateProgram.mutate({ event_date: v || null }),
  };

  // ── ProgramEditCtx: only built on desktop — mobile piece rows tap-open
  // the dialog instead of going contentEditable (spec: "no scaled carets").
  const editCtx: ProgramEditCtx = useMemo(() => ({
    selectedPieceId,
    onSelectPiece,
    onCommitPieceField,
    onCommitBlockField,
    onCommitHeaderField,
    onCommitEventDate,
    onFastEnter,
    onTabToComposer,
    onComposerEnter,
    onOpenPieceEditor: openPieceEditor,
    onAddPieceAtEnd,
    registerPieceEl,
    inlineEditable: !isMobile,
    onOpenRoster: () => setRosterPanelOpen(true),
  }), [
    selectedPieceId, onSelectPiece, onCommitPieceField, onCommitBlockField, onCommitHeaderField,
    onCommitEventDate, onFastEnter, onTabToComposer, onComposerEnter, openPieceEditor, onAddPieceAtEnd,
    registerPieceEl, isMobile,
  ]);

  // The visible sheet gets `edit`; the hidden measurement pass (built from
  // `ctx` above) never does. See file header note.
  const viewCtx: RenderCtx = useMemo(() => ({ ...ctx, edit: editCtx }), [ctx, editCtx]);

  const editingPiece = editorPieceId ? piecesById.get(editorPieceId) ?? null : null;
  const editingLoc = editorPieceId ? findGroupAndIndex(editorPieceId) : null;
  const editingGroup = editingLoc ? (blocks ?? []).find((b) => b.id === editingLoc.groupId) as PieceGroupBlock | undefined : undefined;
  const groupOrder = (blocks ?? []).filter((b) => b.kind === 'piece-group');
  const editingGroupPos = editingGroup ? groupOrder.findIndex((g) => g.id === editingGroup.id) : -1;
  const canMoveUp = !!editingLoc && (editingLoc.index > 0 || editingGroupPos > 0);
  const canMoveDown = !!editingLoc && !!editingGroup
    && (editingLoc.index < editingGroup.pieceIds.length - 1 || editingGroupPos < groupOrder.length - 1);

  if (isLoading) {
    return <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  }
  if (!program) {
    return (
      <div className="p-10 text-center space-y-2">
        <div className="text-sm text-muted-foreground">Program not found.</div>
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard/concert-planner"><ArrowLeft className="w-4 h-4 mr-1" /> All programs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.25rem)]">
      <header className="bg-card/95 backdrop-blur border-b border-border sticky top-0 z-30 px-3 py-2 flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="px-2">
          <Link to="/dashboard/concert-planner"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="text-sm font-semibold truncate min-w-0 flex-1">{program.title || 'Untitled program'}</div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="lg:hidden">Design &amp; add</Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] sm:max-w-sm overflow-y-auto">
            <SheetHeader><SheetTitle>Program tools</SheetTitle></SheetHeader>
            <div className="mt-4 space-y-4">
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between px-2 -mx-2">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Blocks</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <BlockRail
                    blocks={blocks ?? []}
                    onReorderMiddle={handleReorderMiddle}
                    onMoveBlock={handleMoveBlock}
                    onDeleteBlock={handleDeleteBlock}
                    onInsertTextAt={handleInsertTextAt}
                  />
                </CollapsibleContent>
              </Collapsible>
              <EditorRail {...railProps} />
            </div>
          </SheetContent>
        </Sheet>
        <Button variant="outline" size="sm" disabled={!program || !blocks} onClick={handlePrintClick}>
          Print / Save PDF
        </Button>
        <Button size="sm" disabled={!program} onClick={() => setPublishOpen(true)}>
          {isPublished ? 'Published' : 'Publish'}
        </Button>
      </header>

      <main className="flex-1 lg:grid lg:grid-cols-[10rem_1fr_280px] gap-4 p-3 lg:p-4 min-h-0">
        <aside className="hidden lg:block lg:sticky lg:top-4 self-start">
          <BlockRail
            blocks={blocks ?? []}
            onReorderMiddle={handleReorderMiddle}
            onMoveBlock={handleMoveBlock}
            onDeleteBlock={handleDeleteBlock}
            onInsertTextAt={handleInsertTextAt}
          />
        </aside>
        <div className="min-w-0">
          {oversized.length > 0 ? (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-xs px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              A block is taller than one page and will be clipped — split it up.
            </div>
          ) : null}
          <div className="bg-muted/40 rounded-lg overflow-auto p-4 lg:p-8">
            {measureHost}
            <ProgramSheetView pages={pages} ctx={viewCtx} design={design} format={format} scaleToFit />
          </div>
        </div>
        <aside className="hidden lg:block lg:sticky lg:top-4 self-start">
          <EditorRail {...railProps} />
        </aside>
      </main>

      <PieceEditPopover
        piece={editingPiece}
        open={editorOpen && !!editingPiece}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditorFocusField(null);
        }}
        anchorEl={editorAnchorEl}
        focusField={editorFocusField}
        updatePiece={updatePiece}
        onDelete={(pieceId) => { void deletePieceWithUndo(pieceId); setEditorOpen(false); }}
        onMoveUp={(pieceId) => moveOrderedPiece(pieceId, 'up')}
        onMoveDown={(pieceId) => moveOrderedPiece(pieceId, 'down')}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
      />

      <RosterPanel open={rosterPanelOpen} onOpenChange={setRosterPanelOpen} concert={legacyConcert} />

      <LibraryPickerDialog open={libraryOpen} onOpenChange={setLibraryOpen} onPick={handleLibraryPick} />
      <SetlistImportDialog open={setlistOpen} onOpenChange={setSetlistOpen} onImport={handleSetlistImport} />

      <PublishPanel
        open={publishOpen}
        onOpenChange={setPublishOpen}
        validation={validation}
        program={program}
        onJumpToPiece={onJumpToPiece}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        publishing={publishing}
        footerShowQr={footerShowQr}
        onToggleFooterQr={onToggleFooterQr}
      />

      {printOpen ? (
        <ConcertProgramPrintView
          pages={pages}
          ctx={printCtx}
          design={design}
          format={format}
          onClose={() => setPrintOpen(false)}
        />
      ) : null}
    </div>
  );
}
