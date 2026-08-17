// Concert Planner editor — true-paper scaffold.
//
// This page renders the program as it will actually print: a document
// hook (useConcertProgramDoc) owns the blocks-document + pieces + roster;
// useBlockMeasurements measures every flowable unit off-screen at the
// real print width; paginateProgram flows those units onto pages at the
// real print height; ProgramSheetView renders one `.cp-sheet` per page,
// scaled to fit the canvas pane. The rail (Add / Design / Format /
// Details) mutates the document; it never touches layout math directly.
//
// This is a scaffold: inline editing, block reordering/drag, the piece
// detail dialog, Library/Setlist import, and Publish/Print all land in
// later tasks. The extension points they need are already here:
// `selectedPieceId`/`setSelectedPieceId`, `pieceRefs` (a registry later
// tasks populate for click-to-jump), and the `onSelectPiece`/
// `openPieceEditor` stub handlers.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Type, Minus, Users, Library, ListMusic, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
// Not called yet — wired for Publish in Task 12/13.
import { supabase } from '@/integrations/supabase/client';
import { useConcertProgramDoc } from '@/hooks/useConcertProgramDoc';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import {
  PRINT_DESIGNS, newBlockId, type PrintDesign, type ProgramBlock, type ProgramFormat,
} from '@/lib/concertProgram/types';
import { contentHeightIn } from '@/lib/concertProgram/geometry';
import { paginateProgram } from '@/lib/concertProgram/paginate';
import { paddedPanelCount } from '@/lib/concertProgram/impose';
import { useBlockMeasurements } from '@/components/concert-program/useBlockMeasurements';
import { ProgramSheetView } from '@/components/concert-program/ProgramSheetView';
import type { RenderCtx } from '@/components/concert-program/blocks/BlockRenderers';

// ── Rail ─────────────────────────────────────────────────────────────────
// Shared between the lg+ sticky column and the below-lg Sheet drawer so the
// two surfaces can never drift out of sync.

interface EditorRailProps {
  design: PrintDesign;
  format: ProgramFormat;
  onDesignChange: (v: PrintDesign) => void;
  onFormatChange: (v: ProgramFormat) => void;
  panelLine: string | null;
  canAddPiece: boolean;
  onAddPiece: () => void;
  onAddText: () => void;
  onAddDivider: () => void;
  canAddRoster: boolean;
  onAddRoster: () => void;
  callTime: string;
  onCallTimeChange: (v: string) => void;
  targetLengthMinutes: string;
  onTargetLengthChange: (v: string) => void;
  totalMinutesLabel: string;
}

function EditorRail({
  design, format, onDesignChange, onFormatChange, panelLine,
  canAddPiece, onAddPiece, onAddText, onAddDivider, canAddRoster, onAddRoster,
  callTime, onCallTimeChange, targetLengthMinutes, onTargetLengthChange, totalMinutesLabel,
}: EditorRailProps) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Add</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={onAddPiece} disabled={!canAddPiece} className="justify-start">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Piece
          </Button>
          <Button variant="outline" size="sm" disabled className="justify-start">
            <Library className="w-3.5 h-3.5 mr-1.5" /> From Library
          </Button>
          <Button variant="outline" size="sm" disabled className="justify-start col-span-2">
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

// ── Page ─────────────────────────────────────────────────────────────────

export default function ConcertPlannerEditorPage() {
  const { id } = useParams<{ id: string }>();
  const {
    program, pieces, roster, isLoading, blocks, setBlocks, addPieceToGroup, updateProgram,
  } = useConcertProgramDoc(id);
  const { settings } = useBrandingSettings();

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

  const ctx: RenderCtx = useMemo(() => ({
    blocks: blocks ?? [],
    piecesById,
    roster,
    program: headerCtx,
    orgName,
    logoUrl,
    qrDataUrl: null,
  }), [blocks, piecesById, roster, headerCtx, orgName, logoUrl]);

  const { heights, measureHost } = useBlockMeasurements({
    blocks: blocks ?? [], ctx, design, format, rosterSectionIds,
  });

  const { pages, oversized } = useMemo(
    () => paginateProgram(blocks ?? [], rosterSectionIds, heights ?? new Map(), contentHeightIn(format)),
    [blocks, rosterSectionIds, heights, format],
  );

  // ── Page-level state for later tasks (inline editing, click-to-jump).
  // Not consumed within this scaffold — Task 9+ wires piece rows to
  // register into pieceRefs and call these handlers on click/dblclick.
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const pieceRefs = useRef(new Map<string, HTMLElement>());
  const onSelectPiece = (pieceId: string) => setSelectedPieceId(pieceId);
  const openPieceEditor = (pieceId: string) => setSelectedPieceId(pieceId);
  void pieceRefs;
  void onSelectPiece;
  void openPieceEditor;
  void selectedPieceId;

  // ── Details fields (call_time, target_length_minutes): 800ms-debounced
  // diff against the program row, same pattern the old editor used for its
  // header snapshot — avoids a DB write per keystroke.
  const [detailsDraft, setDetailsDraft] = useState({ call_time: '', target_length_minutes: '' });
  useEffect(() => {
    if (!program) return;
    setDetailsDraft({
      call_time: program.call_time || '',
      target_length_minutes: program.target_length_minutes != null ? String(program.target_length_minutes) : '',
    });
  }, [program?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!program) return;
    const h = window.setTimeout(() => {
      const dirty: Record<string, unknown> = {};
      if ((program.call_time || '') !== detailsDraft.call_time) {
        dirty.call_time = detailsDraft.call_time || null;
      }
      const tlmRaw = detailsDraft.target_length_minutes.trim();
      const tlm = tlmRaw === '' ? null : Number(tlmRaw);
      if ((program.target_length_minutes ?? null) !== tlm && !Number.isNaN(tlm)) {
        dirty.target_length_minutes = tlm;
      }
      if (Object.keys(dirty).length > 0) updateProgram.mutate(dirty);
    }, 800);
    return () => window.clearTimeout(h);
  }, [detailsDraft]); // eslint-disable-line react-hooks/exhaustive-deps

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
    onAddText: handleAddText,
    onAddDivider: handleAddDivider,
    canAddRoster: !hasRosterBlock,
    onAddRoster: handleAddRoster,
    callTime: detailsDraft.call_time,
    onCallTimeChange: (v) => setDetailsDraft((d) => ({ ...d, call_time: v })),
    targetLengthMinutes: detailsDraft.target_length_minutes,
    onTargetLengthChange: (v) => setDetailsDraft((d) => ({ ...d, target_length_minutes: v })),
    totalMinutesLabel,
  };

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
            <div className="mt-4">
              <EditorRail {...railProps} />
            </div>
          </SheetContent>
        </Sheet>
        <Button variant="outline" size="sm" disabled>Print / Save PDF</Button>
        <Button size="sm" disabled>Publish</Button>
      </header>

      <main className="flex-1 lg:grid lg:grid-cols-[1fr_280px] gap-4 p-3 lg:p-4 min-h-0">
        <div className="min-w-0">
          {oversized.length > 0 ? (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-xs px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              A block is taller than one page and will be clipped — split it up.
            </div>
          ) : null}
          <div className="bg-muted/40 rounded-lg overflow-auto p-4 lg:p-8">
            {measureHost}
            <ProgramSheetView pages={pages} ctx={ctx} design={design} format={format} scaleToFit />
          </div>
        </div>
        <aside className="hidden lg:block lg:sticky lg:top-4 self-start">
          <EditorRail {...railProps} />
        </aside>
      </main>
    </div>
  );
}
