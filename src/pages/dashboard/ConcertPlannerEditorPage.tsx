// Concert Planner editor — card-stack builder.
//
// One data set (program + pieces + roster) drives both the Editor view
// (inline fields + per-card controls) and the Audience view (same stack
// without admin chrome). The transform layer in @/lib/concertPlanner
// produces an ordered list of ProgramCards from the underlying data
// honoring the per-program card_layout JSON.
//
// Publishing is gated on: zero "required" validation items AND an
// explicit human approval checkbox AND a fresh slug. The publish modal
// hands the admin a QR + copyable public URL.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronUp, ChevronDown, Eye, EyeOff, Edit3, Sparkles,
  ShieldCheck, Layers, FileText, Printer, Share2, Loader2, Check, AlertTriangle,
  XCircle, QrCode, Plus, Trash2, Music, Palette, MoreVertical, X, GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useConcertProgram } from '@/hooks/useConcertPrograms';
import {
  transformProgramToCards,
  validateProgram,
  themeStyles,
  printFormatStyles,
  THEME_OPTIONS,
  type ProgramCard,
  type VisualTheme,
  type PrintFormat,
  type RightsStatus,
} from '@/lib/concertPlanner';
import { RosterEditor } from '@/components/concertPlanner/RosterEditor';
import { SpeechInputButton } from '@/components/concertPlanner/SpeechInputButton';
import { useResizableWidth } from '@/hooks/useResizableWidth';
import {
  DndContext, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors,
  closestCenter, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/integrations/supabase/client';

export default function ConcertPlannerEditorPage() {
  const { id } = useParams<{ id: string }>();
  const concert = useConcertProgram(id);
  const {
    program, pieces, roster, isLoading,
    updateProgram, addPiece, updatePiece, deletePiece, reorderPieces,
  } = concert;

  const [viewMode, setViewMode] = useState<'editor' | 'audience'>('editor');
  const [hasApproval, setHasApproval] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  // Regen dialog state — kept at the page level so the dialog can be a
  // single instance rather than one per card.
  const [regenCard, setRegenCard] = useState<ProgramCard | null>(null);
  // Piece-detail cards default to COLLAPSED in editor mode so the page
  // doesn't grow into a multi-screen scroll once a program has 5+ pieces.
  // We track which piece ids are expanded; tap a card to expand/collapse.
  // Audience view ignores this entirely (always shows the full content).
  const [expandedPieces, setExpandedPieces] = useState<Set<string>>(new Set());
  const toggleExpanded = (pieceId: string) => setExpandedPieces((prev) => {
    const next = new Set(prev);
    if (next.has(pieceId)) next.delete(pieceId); else next.add(pieceId);
    return next;
  });

  // Gamma-style single-card focus. Editor shows ONE card at a time and
  // a thumbnail rail on the left lets the user jump between cards.
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  // Theme picker + validation badge modals.
  const [themeOpen, setThemeOpen] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  // Drag-to-resize the thumbnail rail. Width persists per user across
  // sessions via localStorage.
  const railResize = useResizableWidth(240, {
    min: 180, max: 480,
    storageKey: 'gw.concertPlanner.railWidth',
  });
  // On phones the rail can't co-exist with the canvas side-by-side
  // (240 px rail + main = forced horizontal scroll on a 375 px screen).
  // Hide it by default and let the top bar's "Cards" button slide it
  // in as a temporary drawer.
  const [mobileRailOpen, setMobileRailOpen] = useState(false);

  // Snapshot fields the admin types into so we don't fire a DB write per
  // keystroke. Push to DB on blur or 800ms after the last edit.
  const [header, setHeader] = useState({
    title: '', subtitle: '', event_date: '', call_time: '',
    venue: '', conductor: '', accompanist: '', performer_group: '',
    notes: '', target_length_minutes: '',
  });
  useEffect(() => {
    if (!program) return;
    setHeader({
      title: program.title || '',
      subtitle: program.subtitle || '',
      event_date: program.event_date || '',
      call_time: program.call_time || '',
      venue: program.venue || '',
      conductor: program.conductor || '',
      accompanist: program.accompanist || '',
      performer_group: program.performer_group || '',
      notes: program.notes || '',
      target_length_minutes: program.target_length_minutes != null ? String(program.target_length_minutes) : '',
    });
  }, [program?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!program) return;
    const h = window.setTimeout(() => {
      const dirty: Record<string, unknown> = {};
      const fieldsToCompare: Array<keyof typeof header> = [
        'title', 'subtitle', 'event_date', 'call_time', 'venue',
        'conductor', 'accompanist', 'performer_group', 'notes',
      ];
      fieldsToCompare.forEach((k) => {
        const current = (program as any)[k] ?? '';
        if (header[k] !== current) dirty[k] = header[k] || null;
      });
      // target_length_minutes is numeric; null out if empty.
      const tlmRaw = header.target_length_minutes.trim();
      const tlm = tlmRaw === '' ? null : Number(tlmRaw);
      if ((program.target_length_minutes ?? null) !== tlm && !Number.isNaN(tlm)) {
        dirty.target_length_minutes = tlm;
      }
      if (Object.keys(dirty).length > 0) updateProgram.mutate(dirty);
    }, 800);
    return () => window.clearTimeout(h);
  }, [header]); // eslint-disable-line react-hooks/exhaustive-deps

  const cards = useMemo(
    () => transformProgramToCards(program, pieces, roster),
    [program, pieces, roster],
  );

  // Keep activeCardIndex in range as cards mutate (pieces added/removed,
  // visibility flipped, etc). Without this, deleting the last piece while
  // it's the active card would leave activeCardIndex pointing past the end.
  useEffect(() => {
    if (activeCardIndex >= cards.length && cards.length > 0) {
      setActiveCardIndex(cards.length - 1);
    }
  }, [cards.length, activeCardIndex]);
  const validation = useMemo(
    () => validateProgram(program, pieces, roster),
    [program, pieces, roster],
  );

  const canPublish = !validation.hasRequiredFixes && hasApproval;

  // ── Card layout mutations ────────────────────────────────────────
  const moveCard = (cardId: string, dir: 'up' | 'down') => {
    if (!program) return;
    const current = cards.map((c) => c.id);
    const i = current.indexOf(cardId);
    const j = dir === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= current.length) return;
    [current[i], current[j]] = [current[j], current[i]];
    updateProgram.mutate({
      card_layout: { ...(program.card_layout ?? {}), order: current },
    });
  };

  const toggleVisible = (cardId: string) => {
    if (!program) return;
    const hidden = new Set(program.card_layout?.hidden ?? []);
    if (hidden.has(cardId)) hidden.delete(cardId);
    else hidden.add(cardId);
    updateProgram.mutate({
      card_layout: { ...(program.card_layout ?? {}), hidden: Array.from(hidden) },
    });
  };

  // ── Publish ──────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!program || !canPublish) return;
    setPublishing(true);
    try {
      const slug = program.published_slug
        ?? slugify(program.title) + '-' + program.id.slice(0, 6);
      const { data: { user } } = await supabase.auth.getUser();
      await updateProgram.mutateAsync({
        published_at: new Date().toISOString(),
        published_by: user?.id ?? null,
        published_slug: slug,
      } as any);
      setPublishOpen(true);
    } catch (e: any) {
      toast.error(e?.message ?? 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!program) return;
    if (!confirm('Take the public program offline?')) return;
    try {
      await updateProgram.mutateAsync({
        published_at: null,
        published_by: null,
      } as any);
      toast.success('Program unpublished');
    } catch (e: any) {
      toast.error(e?.message ?? 'Unpublish failed');
    }
  };

  // ── Render ───────────────────────────────────────────────────────
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

  const theme = themeStyles(program.theme);
  const formatStyles = printFormatStyles(program.print_format);
  const publicUrl = program.published_slug
    ? `${window.location.origin}/program/${program.published_slug}`
    : null;

  return (
    <div className={`min-h-screen ${theme.container} transition-colors flex flex-col`}>
      {/* Print CSS — one card per page, no editor chrome. */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body, .min-h-screen { background: white !important; color: black !important; }
          .program-card { page-break-after: always; break-inside: avoid; border: none !important; box-shadow: none !important; padding: 2rem 0 !important; }
        }
      ` }} />

      {/* Gamma-style top bar: back, title, view toggle, Theme, Print, Agent, Publish. */}
      <header className="no-print bg-card/95 backdrop-blur border-b border-border sticky top-0 z-30 px-3 py-2 flex items-center gap-2 flex-wrap">
        <Button asChild variant="ghost" size="sm" className="px-2">
          <Link to="/dashboard/concert-planner">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        {/* Phone-only hamburger to open the card rail as a drawer. */}
        {viewMode === 'editor' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileRailOpen(true)}
            className="px-2 lg:hidden"
            aria-label="Open card list"
          >
            <Layers className="w-4 h-4" />
          </Button>
        )}
        <input
          type="text"
          value={header.title}
          onChange={(e) => setHeader((h) => ({ ...h, title: e.target.value }))}
          className="text-sm font-semibold bg-transparent border border-transparent hover:border-border focus:border-primary focus:outline-none px-2 py-1 rounded min-w-0 flex-1 max-w-sm"
          placeholder="Untitled program"
        />
        <div className="flex-1" />
        <div className="bg-muted rounded-lg p-0.5 flex no-print">
          <button
            onClick={() => setViewMode('editor')}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${viewMode === 'editor' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
          ><Edit3 className="w-3 h-3" /> Editor</button>
          <button
            onClick={() => setViewMode('audience')}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${viewMode === 'audience' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
          ><Eye className="w-3 h-3" /> Audience</button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setThemeOpen(true)}>
          <Palette className="w-4 h-4 mr-1" /> Theme
        </Button>
        <Button variant="ghost" size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-1" /> Print
        </Button>
        {cards[activeCardIndex] && (cards[activeCardIndex].kind === 'piece-detail' || cards[activeCardIndex].kind === 'hero-cover') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRegenCard(cards[activeCardIndex])}
            className="border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            <Sparkles className="w-4 h-4 mr-1" /> Agent
          </Button>
        )}
        {program.published_at ? (
          <Button variant="outline" size="sm" onClick={handleUnpublish}>
            Unpublish
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={!canPublish || publishing}
            onClick={handlePublish}
            className={canPublish ? '' : 'opacity-50'}
          >
            <Share2 className="w-4 h-4 mr-1" />
            {publishing ? 'Publishing…' : 'Publish'}
          </Button>
        )}
      </header>

      <main className="flex-1 flex min-h-[calc(100vh-3.25rem)]">
        {/* AUDIENCE: scroll the full card stack the way the printed
            program reads. EDITOR: single-card focus with a thumbnail
            rail on the left. */}
        {viewMode === 'audience' ? (
          <section className={`${formatStyles} mx-auto space-y-6 w-full p-6`}>
            {cards
              .filter((c) => c.visible)
              .map((card, idx, arr) => (
                <ProgramCardView
                  key={card.id}
                  card={card}
                  index={idx}
                  last={idx === arr.length - 1}
                  viewMode={viewMode}
                  theme={theme}
                  program={program}
                  pieces={pieces}
                  roster={roster}
                  header={header}
                  onHeaderChange={setHeader}
                  onAddPiece={() => addPiece.mutate({})}
                  onUpdatePiece={(pieceId, patch) => updatePiece.mutate({ pieceId, patch })}
                  onDeletePiece={(pieceId) => deletePiece.mutate(pieceId)}
                  onReorderPieces={(ids) => reorderPieces.mutate(ids)}
                  onMoveCard={(dir) => moveCard(card.id, dir)}
                  onToggleVisible={() => toggleVisible(card.id)}
                  onOpenRegen={() => setRegenCard(card)}
                  pieceExpanded
                  onTogglePieceExpanded={() => {}}
                  publicUrl={publicUrl}
                />
              ))}
          </section>
        ) : (
          <>
            {/* Desktop rail — visible at lg+ as a flex sibling. */}
            <div className="hidden lg:flex shrink-0">
              <CardNavigator
                cards={cards}
                activeIndex={activeCardIndex}
                onSelect={setActiveCardIndex}
                pieceCount={pieces.length}
                onAddPiece={() => addPiece.mutate({})}
                onReorderPieces={(ids) => reorderPieces.mutate(ids)}
                pieces={pieces}
                width={railResize.width}
                onToggleVisible={toggleVisible}
              />
              <div
                {...railResize.handleProps}
                className="no-print w-1 cursor-col-resize bg-border/40 hover:bg-primary/40 active:bg-primary/60 transition-colors shrink-0"
                aria-label="Resize card rail"
              />
            </div>

            {/* Phone rail — slides in from the left, tap backdrop to close. */}
            {mobileRailOpen && (
              <div className="lg:hidden fixed inset-0 z-40 flex">
                <div className="relative bg-card shadow-2xl flex">
                  <CardNavigator
                    cards={cards}
                    activeIndex={activeCardIndex}
                    onSelect={(i) => { setActiveCardIndex(i); setMobileRailOpen(false); }}
                    pieceCount={pieces.length}
                    onAddPiece={() => { addPiece.mutate({}); setMobileRailOpen(false); }}
                    onReorderPieces={(ids) => reorderPieces.mutate(ids)}
                    pieces={pieces}
                    width={280}
                    onToggleVisible={toggleVisible}
                  />
                  <button
                    onClick={() => setMobileRailOpen(false)}
                    aria-label="Close card list"
                    className="absolute top-2 -right-9 w-8 h-8 rounded-full bg-card border border-border shadow flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div
                  className="flex-1 bg-black/40"
                  onClick={() => setMobileRailOpen(false)}
                />
              </div>
            )}

            <section className="flex-1 min-w-0 overflow-auto px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
              <div className="max-w-5xl mx-auto">
                {cards[activeCardIndex] ? (
                  <ProgramCardView
                    key={cards[activeCardIndex].id}
                    card={cards[activeCardIndex]}
                    index={activeCardIndex}
                    last={activeCardIndex === cards.length - 1}
                    viewMode="editor"
                    theme={theme}
                    program={program}
                    pieces={pieces}
                    roster={roster}
                    header={header}
                    onHeaderChange={setHeader}
                    onAddPiece={() => addPiece.mutate({})}
                    onUpdatePiece={(pieceId, patch) => updatePiece.mutate({ pieceId, patch })}
                    onDeletePiece={(pieceId) => deletePiece.mutate(pieceId)}
                    onReorderPieces={(ids) => reorderPieces.mutate(ids)}
                    onMoveCard={(dir) => moveCard(cards[activeCardIndex].id, dir)}
                    onToggleVisible={() => toggleVisible(cards[activeCardIndex].id)}
                    onOpenRegen={() => setRegenCard(cards[activeCardIndex])}
                    pieceExpanded
                    onTogglePieceExpanded={() => {}}
                    publicUrl={publicUrl}
                  />
                ) : null}

                {/* Page nav at bottom of single-card view */}
                <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground no-print">
                  <button
                    onClick={() => setActiveCardIndex(Math.max(0, activeCardIndex - 1))}
                    disabled={activeCardIndex === 0}
                    className="flex items-center gap-1.5 px-3 py-2 rounded hover:bg-muted disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4 -rotate-90" /> Previous
                  </button>
                  <span className="font-mono tabular-nums">{activeCardIndex + 1} / {cards.length}</span>
                  <button
                    onClick={() => setActiveCardIndex(Math.min(cards.length - 1, activeCardIndex + 1))}
                    disabled={activeCardIndex >= cards.length - 1}
                    className="flex items-center gap-1.5 px-3 py-2 rounded hover:bg-muted disabled:opacity-30"
                  >
                    Next <ChevronDown className="w-4 h-4 -rotate-90" />
                  </button>
                </div>
              </div>
            </section>

            {/* Floating validation badge — bottom-left of the editor canvas. */}
            <ValidationBadge
              validation={validation}
              open={validationOpen}
              onToggle={() => setValidationOpen((o) => !o)}
              hasApproval={hasApproval}
              onApprovalChange={setHasApproval}
            />
          </>
        )}
      </main>

      {/* Regen — AI rewrite of a single card. Currently supports
          piece-detail (program_notes) + hero-cover (subtitle). */}
      <RegenDialog
        card={regenCard}
        program={program}
        pieces={pieces}
        onClose={() => setRegenCard(null)}
        onAcceptPieceNotes={(pieceId, suggestion) => {
          updatePiece.mutate({ pieceId, patch: { program_notes: suggestion } });
          setRegenCard(null);
        }}
        onAcceptSubtitle={(suggestion) => {
          updateProgram.mutate({ subtitle: suggestion } as any);
          setHeader((h) => ({ ...h, subtitle: suggestion }));
          setRegenCard(null);
        }}
      />

      {/* Theme picker modal — opened from the top bar's Theme button.
          Replaces the old sidebar Style section. Also bundles the
          print-format + roster shortcuts so settings live in one place. */}
      <Dialog open={themeOpen} onOpenChange={setThemeOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="w-4 h-4" /> Theme &amp; layout
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 block">Theme</Label>
              <div className="grid grid-cols-2 gap-2">
                {THEME_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => updateProgram.mutate({ theme: t.value })}
                    className={`text-left p-3 rounded-lg border transition-all ${program.theme === t.value ? 'border-primary bg-primary/5 ring-2 ring-primary/30' : 'border-border hover:border-primary/40'}`}
                  >
                    <div className="text-sm font-semibold">{t.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{t.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Print format</Label>
                <select
                  value={program.print_format}
                  onChange={(e) => updateProgram.mutate({ print_format: e.target.value as PrintFormat })}
                  className="w-full mt-1 bg-background border border-border rounded px-2 py-1.5 text-sm"
                >
                  <option value="letter-portrait">Letter (portrait)</option>
                  <option value="half-fold">Half-fold booklet</option>
                  <option value="trifold">Trifold brochure</option>
                  <option value="qr-lobby">QR lobby flyer</option>
                </select>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Target length (minutes)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={header.target_length_minutes}
                  onChange={(e) => setHeader((h) => ({ ...h, target_length_minutes: e.target.value }))}
                  className="mt-1 text-sm"
                  placeholder="e.g. 45"
                />
              </div>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 block">Ensemble roster</Label>
              <RosterEditor concert={concert} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Publish success modal */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-emerald-600" /> Program is live
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-3 py-2">
            <div className="bg-muted rounded-xl p-4 inline-block">
              <QrPlaceholder url={publicUrl ?? ''} />
            </div>
            <div className="text-xs text-muted-foreground break-all">{publicUrl}</div>
            <Button
              onClick={async () => {
                if (publicUrl) {
                  await navigator.clipboard.writeText(publicUrl);
                  toast.success('Public URL copied');
                }
              }}
              className="w-full"
            >
              Copy public URL
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Card renderer ─────────────────────────────────────────────────

interface CardViewProps {
  card: ProgramCard;
  index: number;
  last: boolean;
  viewMode: 'editor' | 'audience';
  theme: ReturnType<typeof themeStyles>;
  program: NonNullable<ReturnType<typeof useConcertProgram>['program']>;
  pieces: ReturnType<typeof useConcertProgram>['pieces'];
  roster: ReturnType<typeof useConcertProgram>['roster'];
  header: any;
  onHeaderChange: React.Dispatch<React.SetStateAction<any>>;
  onAddPiece: () => void;
  onUpdatePiece: (pieceId: string, patch: any) => void;
  onDeletePiece: (pieceId: string) => void;
  onReorderPieces: (ids: string[]) => void;
  onMoveCard: (dir: 'up' | 'down') => void;
  onToggleVisible: () => void;
  onOpenRegen: () => void;
  pieceExpanded: boolean;
  onTogglePieceExpanded: () => void;
  publicUrl: string | null;
}

function ProgramCardView(p: CardViewProps) {
  const { card, viewMode, theme, program, pieces, roster, header, onHeaderChange } = p;

  // In editor view we always show the card (so the admin can re-enable
  // a hidden one); audience view drops hidden cards entirely.
  const hiddenStyle = !card.visible && viewMode === 'editor' ? 'opacity-50 border-dashed' : '';

  // Hero gets the theme's heroBg gradient; everything else uses the
  // body font when one is configured.
  const cardStyle: React.CSSProperties | undefined =
    card.kind === 'hero-cover' ? theme.heroBg : theme.body;

  // Collapsed piece-detail cards get tighter padding so the stack reads
  // like a list rather than a stack of full-size cards.
  const collapsedPiece = card.kind === 'piece-detail'
    && viewMode === 'editor'
    && !p.pieceExpanded;
  const compactClasses = collapsedPiece ? '!p-3' : '';

  return (
    <div className={`relative group program-card ${theme.card} ${compactClasses} ${hiddenStyle}`} style={cardStyle}>
      {/* Control bar — a real top header inside the card so it never
          overlaps content. Only visible in editor mode. */}
      {viewMode === 'editor' && (
        <div className="no-print flex items-center justify-end gap-1 mb-3 -mt-2 -mr-2 text-xs">
          <button onClick={() => p.onMoveCard('up')} disabled={p.index === 0} className="p-1 hover:bg-muted rounded disabled:opacity-30" aria-label="Move up">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => p.onMoveCard('down')} disabled={p.last} className="p-1 hover:bg-muted rounded disabled:opacity-30" aria-label="Move down">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={p.onToggleVisible} className="p-1 hover:bg-muted rounded" aria-label="Toggle visibility">
            {card.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-rose-500" />}
          </button>
          {(card.kind === 'piece-detail' || card.kind === 'hero-cover') && (
            <button
              onClick={p.onOpenRegen}
              className="px-2 py-1 hover:bg-amber-50 rounded text-amber-700 flex items-center gap-1 text-[10px] font-semibold"
              aria-label="Regenerate this card with AI"
            >
              <Sparkles className="w-3 h-3" /> Regen
            </button>
          )}
        </div>
      )}

      {card.kind === 'hero-cover' && (
        <div className="text-center py-4">
          <span className={theme.accent}>Concert Program</span>
          {viewMode === 'editor' ? (
            <div className="space-y-3 max-w-xl mx-auto mt-2">
              <div className="relative">
                <input
                  type="text"
                  value={header.title}
                  onChange={(e) => onHeaderChange((h: any) => ({ ...h, title: e.target.value }))}
                  className="w-full text-center text-2xl sm:text-3xl md:text-4xl lg:text-5xl break-words bg-transparent border-b border-dashed border-current/30 focus:outline-none focus:border-primary pr-10"
                  style={theme.heroTitle}
                  placeholder="Concert title"
                />
                <SpeechInputButton
                  label="Dictate concert title"
                  className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 no-print"
                  onTranscript={(text) =>
                    onHeaderChange((h: any) => ({ ...h, title: text }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-left text-xs">
                <FieldInline label="Venue" value={header.venue} onChange={(v) => onHeaderChange((h: any) => ({ ...h, venue: v }))} />
                <FieldInline label="Conductor" value={header.conductor} onChange={(v) => onHeaderChange((h: any) => ({ ...h, conductor: v }))} />
                <FieldInline label="Accompanist" value={header.accompanist} onChange={(v) => onHeaderChange((h: any) => ({ ...h, accompanist: v }))} />
                <FieldInline label="Date" type="date" value={header.event_date} onChange={(v) => onHeaderChange((h: any) => ({ ...h, event_date: v }))} />
                <FieldInline label="Call time" type="time" value={header.call_time} onChange={(v) => onHeaderChange((h: any) => ({ ...h, call_time: v }))} />
                <FieldInline label="Performer group" value={header.performer_group} onChange={(v) => onHeaderChange((h: any) => ({ ...h, performer_group: v }))} />
              </div>
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight break-words leading-[1.05]" style={theme.heroTitle}>{program.title || 'Untitled program'}</h2>
              {program.subtitle && <p className="text-base italic opacity-80">{program.subtitle}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 border-t border-border text-xs text-muted-foreground">
                {program.venue && <div><strong>Venue:</strong> {program.venue}</div>}
                {program.conductor && <div><strong>Conductor:</strong> {program.conductor}</div>}
                {program.accompanist && <div><strong>Accompanist:</strong> {program.accompanist}</div>}
              </div>
              {program.event_date && (
                <div className="text-xs text-muted-foreground pt-1">
                  {new Date(program.event_date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                  {program.call_time && ` · Call ${program.call_time}`}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {card.kind === 'timeline-program' && (
        <div>
          <h3 className={theme.accent}>{card.title}</h3>
          <div className="space-y-2 mt-4">
            {pieces.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">No pieces yet.</div>
            ) : pieces.slice().sort((a, b) => a.sort_order - b.sort_order).map((piece, i) => (
              <div key={piece.id} className="flex items-start justify-between border-b border-border/50 pb-2 text-sm">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="font-mono text-muted-foreground/60 font-bold tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{piece.title || 'Untitled work'}</div>
                    <div className="text-xs text-muted-foreground">
                      {piece.composer || 'Composer pending'}
                      {piece.arranger && ` · arr. ${piece.arranger}`}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {piece.duration_seconds ? formatDuration(piece.duration_seconds) : '—'}
                </span>
              </div>
            ))}
          </div>
          {viewMode === 'editor' && (
            <div className="mt-3 no-print">
              <Button variant="ghost" size="sm" onClick={p.onAddPiece}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add piece
              </Button>
            </div>
          )}
        </div>
      )}

      {card.kind === 'piece-detail' && (() => {
        const piece = pieces.find((x) => x.id === card.pieceId);
        if (!piece) return null;
        // In editor mode, default to a collapsed compact row so the
        // page stays scannable. Audience mode always shows the full
        // notes — that's what the public program needs.
        if (viewMode === 'editor' && !p.pieceExpanded) {
          return (
            <button
              type="button"
              onClick={p.onTogglePieceExpanded}
              className="w-full flex items-center justify-between gap-3 text-left"
            >
              <div className="flex items-start gap-3 min-w-0">
                <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{piece.title || 'Untitled piece'}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {piece.composer || 'Composer pending'}
                    {piece.arranger && ` · arr. ${piece.arranger}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                {piece.duration_seconds ? <span className="font-mono tabular-nums">{formatDuration(piece.duration_seconds)}</span> : null}
                <span className="text-[10px] uppercase tracking-wider opacity-70">Tap to edit</span>
              </div>
            </button>
          );
        }
        return (
          <div>
            {viewMode === 'editor' && (
              <button
                type="button"
                onClick={p.onTogglePieceExpanded}
                className="no-print mb-2 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <ChevronUp className="w-3.5 h-3.5" /> Collapse
              </button>
            )}
            <PieceDetailEditor
              piece={piece}
              viewMode={viewMode}
              themeAccent={theme.accent}
              onCommit={(patch) => p.onUpdatePiece(piece.id, patch)}
              onDelete={() => p.onDeletePiece(piece.id)}
            />
          </div>
        );
      })()}

      {card.kind === 'grid-roster' && (
        <div>
          <h3 className={theme.accent}>{card.title}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {roster.length === 0 ? (
              <div className="col-span-full text-xs text-muted-foreground italic">No roster yet. Add sections from the sidebar.</div>
            ) : roster.map((sect) => (
              <div key={sect.id} className="space-y-1">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b pb-0.5">{sect.section_name}</h4>
                {sect.members.length === 0 ? (
                  <p className="text-[11px] italic text-rose-500">Empty</p>
                ) : (
                  <ul className="text-xs space-y-0.5">
                    {sect.members.map((m) => <li key={m.id} className="truncate">{m.member_name}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {card.kind === 'rights-footer' && (
        <div className="text-[11px] flex flex-col md:flex-row items-start md:items-center justify-between gap-2 border-t border-border pt-3 text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>All works credited per their composer + licensing status above.</span>
          </div>
          <div className="italic">"Texts and music used by permission. All rights reserved."</div>
        </div>
      )}

      {card.kind === 'qr-access' && (
        <div className="text-center py-4">
          <div className="max-w-xs mx-auto p-3 bg-card border border-border rounded-xl flex flex-col items-center">
            <QrPlaceholder url={p.publicUrl ?? ''} />
            <p className="text-xs font-semibold mt-2">Digital program</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5 break-all">
              {p.publicUrl ?? '(publish to generate a public URL)'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Gamma-style thumbnail rail. Click any card to jump straight to it
// in the main canvas. Piece-detail cards are draggable so the user can
// reorder repertoire by drag-and-drop; non-piece cards (cover, program,
// roster, rights, share) are fixed in position by the transform layer.
function CardNavigator({
  cards, activeIndex, onSelect, pieceCount, onAddPiece, onReorderPieces, pieces, width, onToggleVisible,
}: {
  cards: ProgramCard[];
  activeIndex: number;
  onSelect: (i: number) => void;
  pieceCount: number;
  onAddPiece: () => void;
  onReorderPieces: (orderedIds: string[]) => void;
  pieces: { id: string; sort_order: number }[];
  width: number;
  onToggleVisible: (cardId: string) => void;
}) {
  // Touch + mouse drag via @dnd-kit. The old HTML5 drag API doesn't
  // fire touchstart/touchmove on iOS Safari, which left iPad users
  // unable to reorder. Pointer + Touch sensors below cover both.
  // Activation distance prevents tap-to-select from being interpreted
  // as drag-to-reorder.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Only piece-detail cards are sortable. The structural cards (cover,
  // program, ensemble, rights, share) stay anchored — moving the cover
  // below the pieces would break the program's reading order.
  const pieceIds = cards
    .filter((c) => c.kind === 'piece-detail' && c.pieceId)
    .map((c) => c.pieceId!) as string[];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIdx = pieceIds.indexOf(String(active.id));
    const toIdx = pieceIds.indexOf(String(over.id));
    if (fromIdx === -1 || toIdx === -1) return;
    const next = arrayMove(pieceIds, fromIdx, toIdx);
    onReorderPieces(next);
  };

  return (
    <aside
      className="no-print shrink-0 border-r border-border bg-muted/30 flex flex-col"
      style={{ width }}
    >
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
        <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
          {cards.length} card{cards.length === 1 ? '' : 's'}
        </span>
        <button
          onClick={onAddPiece}
          className="p-1.5 rounded hover:bg-card text-muted-foreground hover:text-foreground"
          aria-label="Add piece"
          title="Add piece"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={pieceIds} strategy={verticalListSortingStrategy}>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {cards.map((c, i) => {
              const isActive = i === activeIndex;
              const label = cardLabel(c);
              if (c.kind === 'piece-detail' && c.pieceId) {
                return (
                  <SortablePieceRow
                    key={c.id}
                    pieceId={c.pieceId}
                    index={i + 1}
                    label={label}
                    isActive={isActive}
                    visible={c.visible}
                    onSelect={() => onSelect(i)}
                    onToggleVisible={() => onToggleVisible(c.id)}
                  />
                );
              }
              return (
                <StaticCardRow
                  key={c.id}
                  index={i + 1}
                  label={label}
                  isActive={isActive}
                  visible={c.visible}
                  onSelect={() => onSelect(i)}
                  onToggleVisible={() => onToggleVisible(c.id)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
      <div className="p-2 border-t border-border">
        <Button size="sm" variant="outline" onClick={onAddPiece} className="w-full">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add piece
        </Button>
        <div className="mt-1.5 text-xs text-center text-muted-foreground">
          {pieceCount} piece{pieceCount === 1 ? '' : 's'} on the program
        </div>
      </div>
    </aside>
  );
}

// Sortable wrapper for piece-detail rows. The drag handle lives on a
// dedicated grip icon so the rest of the row stays clickable for select.
function SortablePieceRow({
  pieceId, index, label, isActive, visible, onSelect, onToggleVisible,
}: {
  pieceId: string;
  index: number;
  label: { kind: string; title: string };
  isActive: boolean;
  visible: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pieceId });
  return (
    <div
      ref={setNodeRef}
      // dnd-kit listeners + a11y attrs go on the WHOLE row so any pointer
      // start anywhere on the card begins the drag tracking. Activation
      // constraint (distance 6 px in the parent sensor config) means a
      // tap that doesn't move = onClick fires → onSelect. A drag with
      // pointer movement reorders.
      {...attributes}
      {...listeners}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group w-full text-left rounded-md border transition-all touch-none select-none ${
        isActive ? 'border-primary ring-2 ring-primary/20 bg-card shadow-sm' : 'border-transparent hover:border-border hover:bg-card/60'
      } ${!visible ? 'opacity-50' : ''} ${isDragging ? 'opacity-60 shadow-lg z-10 relative bg-card cursor-grabbing' : 'cursor-grab'}`}
    >
      <div className="flex items-start gap-2.5 p-2.5">
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-muted-foreground mt-0.5 shrink-0" />
        <span className="text-xs font-mono font-bold text-muted-foreground tabular-nums w-4 mt-0.5 shrink-0">{index}</span>
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label.kind}</div>
          <div className="text-sm font-semibold leading-tight truncate">{label.title}</div>
        </div>
        <VisibilityToggle visible={visible} onToggle={onToggleVisible} />
      </div>
    </div>
  );
}

// Non-piece cards — render the same row shape without the drag handle so
// the rail visual stays consistent.
function StaticCardRow({
  index, label, isActive, visible, onSelect, onToggleVisible,
}: {
  index: number;
  label: { kind: string; title: string };
  isActive: boolean;
  visible: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      className={`group w-full text-left rounded-md border transition-all cursor-pointer ${
        isActive ? 'border-primary ring-2 ring-primary/20 bg-card shadow-sm' : 'border-transparent hover:border-border hover:bg-card/60'
      } ${!visible ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-2.5 p-2.5 pl-7">
        <span className="text-xs font-mono font-bold text-muted-foreground tabular-nums w-4 mt-0.5 shrink-0">{index}</span>
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label.kind}</div>
          <div className="text-sm font-semibold leading-tight truncate">{label.title}</div>
        </div>
        <VisibilityToggle visible={visible} onToggle={onToggleVisible} />
      </div>
    </div>
  );
}

function VisibilityToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      // Stop pointerdown bubbling so the row-level dnd-kit listeners
      // don't start tracking a drag when the user is aiming at this
      // toggle. Without this the eye click sometimes registered as a
      // tiny drag, suppressing the toggle.
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={`p-1 -m-1 rounded hover:bg-muted shrink-0 ${visible ? 'opacity-0 group-hover:opacity-60 hover:!opacity-100' : 'opacity-80 hover:opacity-100'}`}
      aria-label={visible ? 'Hide from audience' : 'Show in audience'}
      title={visible ? 'Hide from audience' : 'Show in audience'}
    >
      {visible ? <Eye className="w-3.5 h-3.5 text-muted-foreground" /> : <EyeOff className="w-3.5 h-3.5 text-rose-500" />}
    </button>
  );
}

function cardLabel(c: ProgramCard): { kind: string; title: string } {
  switch (c.kind) {
    case 'hero-cover':       return { kind: 'Cover', title: c.title };
    case 'timeline-program': return { kind: 'Program', title: 'Order of pieces' };
    case 'piece-detail':     return { kind: 'Piece', title: c.title };
    case 'grid-roster':      return { kind: 'Ensemble', title: 'Performers' };
    case 'rights-footer':    return { kind: 'Rights', title: 'Credits' };
    case 'qr-access':        return { kind: 'Share', title: 'Public link' };
    default:                 return { kind: 'Card', title: c.title };
  }
}

// Validation badge — floating bottom-left button that summarises issues
// and expands into a popover with the full validation list + approval
// checkbox. Stays out of the way until the user wants to publish.
function ValidationBadge({
  validation, open, onToggle, hasApproval, onApprovalChange,
}: {
  validation: { items: { id: string; category: string; level: 'ready' | 'warning' | 'required'; message: string }[]; hasRequiredFixes: boolean; hasWarnings: boolean };
  open: boolean;
  onToggle: () => void;
  hasApproval: boolean;
  onApprovalChange: (v: boolean) => void;
}) {
  const requiredCount = validation.items.filter((i) => i.level === 'required').length;
  const warnCount = validation.items.filter((i) => i.level === 'warning').length;
  const badgeColor = requiredCount > 0
    ? 'bg-rose-600 text-white'
    : warnCount > 0 ? 'bg-amber-500 text-white'
    : 'bg-emerald-600 text-white';
  const badgeLabel = requiredCount > 0
    ? `${requiredCount} required`
    : warnCount > 0 ? `${warnCount} warning${warnCount === 1 ? '' : 's'}`
    : 'Ready to publish';

  return (
    <>
      <button
        onClick={onToggle}
        className={`no-print fixed bottom-4 left-4 z-20 ${badgeColor} rounded-full pl-3 pr-4 py-2 text-sm font-semibold shadow-lg flex items-center gap-2 hover:scale-105 transition-transform`}
      >
        {requiredCount > 0 ? <XCircle className="w-4 h-4" /> : warnCount > 0 ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
        {badgeLabel}
      </button>
      {open && (
        <div className="no-print fixed bottom-16 left-4 z-30 w-[28rem] max-h-[60vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4" /> Validation
            </h3>
            <button onClick={onToggle} className="p-1.5 hover:bg-muted rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {validation.items.map((item) => (
              <div
                key={item.id}
                className={`p-2.5 rounded border text-sm flex items-start gap-2 ${
                  item.level === 'required' ? 'bg-rose-50 border-rose-100 text-rose-900'
                  : item.level === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-900'
                  : 'bg-emerald-50 border-emerald-100 text-emerald-900'
                }`}
              >
                {item.level === 'required' && <XCircle className="w-4 h-4 mt-0.5 text-rose-600 shrink-0" />}
                {item.level === 'warning' && <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />}
                {item.level === 'ready' && <Check className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />}
                <div>
                  <div className="text-xs uppercase font-semibold opacity-70 tracking-wide">{item.category} · {item.level}</div>
                  <div className="mt-0.5 leading-snug">{item.message}</div>
                </div>
              </div>
            ))}
          </div>
          <label className="px-4 py-3 border-t border-border flex items-start gap-2 cursor-pointer text-sm bg-muted/30">
            <input
              type="checkbox"
              checked={hasApproval}
              onChange={(e) => onApprovalChange(e.target.checked)}
              className="mt-1"
            />
            <span>I've reviewed every piece's composer, arranger, rights status, and the roster.</span>
          </label>
        </div>
      )}
    </>
  );
}

// Regen dialog — calls concert-card-regen edge function and lets the
// admin preview / edit / accept the AI suggestion. Supports two card
// kinds: piece-detail (rewrites program_notes) + hero-cover (rewrites
// program subtitle).
function RegenDialog({
  card, program, pieces, onClose, onAcceptPieceNotes, onAcceptSubtitle,
}: {
  card: ProgramCard | null;
  program: NonNullable<ReturnType<typeof useConcertProgram>['program']>;
  pieces: ReturnType<typeof useConcertProgram>['pieces'];
  onClose: () => void;
  onAcceptPieceNotes: (pieceId: string, suggestion: string) => void;
  onAcceptSubtitle: (suggestion: string) => void;
}) {
  type Tone = 'concise' | 'scholarly' | 'warm';
  const [tone, setTone] = useState<Tone>('warm');
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset state whenever the dialog opens against a different card.
  useEffect(() => {
    if (card) {
      setSuggestion('');
      setError(null);
      setTone('warm');
    }
  }, [card?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!card) return null;

  const piece = card.kind === 'piece-detail'
    ? pieces.find((p) => p.id === card.pieceId)
    : null;

  const runRegen = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('concert-card-regen', {
        body: {
          card_kind: card.kind,
          program_id: program.id,
          piece_id: card.pieceId,
          tone,
        },
      });
      if (fnErr) throw new Error(fnErr.message || 'Edge function failed');
      if (data?.error) throw new Error(data.message || data.error);
      const text = String(data?.suggestion ?? '').trim();
      if (!text) throw new Error('AI returned no text');
      setSuggestion(text);
    } catch (e: any) {
      setError(e?.message ?? 'Regen failed');
    } finally {
      setBusy(false);
    }
  };

  const accept = () => {
    const final = suggestion.trim();
    if (!final) return;
    if (card.kind === 'piece-detail' && piece) {
      onAcceptPieceNotes(piece.id, final);
    } else if (card.kind === 'hero-cover') {
      onAcceptSubtitle(final);
    }
  };

  const title = card.kind === 'piece-detail'
    ? `Regen — ${piece?.title || 'piece'} notes`
    : 'Regen — concert subtitle';
  const currentText = card.kind === 'piece-detail'
    ? (piece?.program_notes ?? '')
    : (program.subtitle ?? '');

  return (
    <Dialog open={!!card} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" /> {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tone</Label>
            <div className="mt-1 flex gap-1.5">
              {(['concise', 'warm', 'scholarly'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                    tone === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary/60'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Current</Label>
            <div className="mt-1 p-3 rounded border border-border bg-muted/40 text-sm whitespace-pre-wrap min-h-[3rem]">
              {currentText || <span className="text-muted-foreground italic">(empty)</span>}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Suggested</Label>
              <Button size="sm" variant="outline" onClick={runRegen} disabled={busy}>
                {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                {suggestion ? 'Regenerate' : 'Generate'}
              </Button>
            </div>
            <Textarea
              rows={card.kind === 'hero-cover' ? 2 : 6}
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder={busy ? 'Generating…' : 'Click Generate to draft a suggestion.'}
              className="mt-1 text-sm"
            />
            {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={accept} disabled={!suggestion.trim() || busy}>
            <Check className="w-4 h-4 mr-1" /> Accept
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Piece-detail editor.
//
// One self-contained local buffer for every editable field on a piece.
// Typing only mutates local state — no DB write per keystroke, no
// refetch flicker, no caret jump. A single useEffect debounces dirty
// fields and pushes the patch after 700ms of quiet. The title field
// has the extra constraint that it can't be persisted empty (DB CHECK),
// so we filter it out of the patch when blank — local stays blank so
// the buyer can keep typing.
function PieceDetailEditor({
  piece, viewMode, themeAccent, onCommit, onDelete,
}: {
  piece: {
    id: string; title: string;
    composer: string | null; arranger: string | null;
    duration_seconds: number | null;
    rights_status: RightsStatus | null;
    copyright_info: string | null;
    program_notes: string | null;
  };
  viewMode: 'editor' | 'audience';
  themeAccent: string;
  onCommit: (patch: any) => void;
  onDelete: () => void;
}) {
  const [local, setLocal] = useState({
    title: piece.title,
    composer: piece.composer ?? '',
    arranger: piece.arranger ?? '',
    duration_seconds: piece.duration_seconds != null ? String(piece.duration_seconds) : '',
    rights_status: (piece.rights_status ?? 'unknown') as RightsStatus,
    copyright_info: piece.copyright_info ?? '',
    program_notes: piece.program_notes ?? '',
  });

  // Resync local from the canonical piece only when local hasn't been
  // edited (i.e. local matches what we last saw from upstream). This
  // keeps a sibling's refetch from clobbering an in-progress edit.
  const lastPieceRef = useRef(piece);
  useEffect(() => {
    const last = lastPieceRef.current;
    setLocal((prev) => ({
      title: prev.title === (last.title ?? '') ? piece.title : prev.title,
      composer: prev.composer === (last.composer ?? '') ? (piece.composer ?? '') : prev.composer,
      arranger: prev.arranger === (last.arranger ?? '') ? (piece.arranger ?? '') : prev.arranger,
      duration_seconds: prev.duration_seconds === (last.duration_seconds != null ? String(last.duration_seconds) : '')
        ? (piece.duration_seconds != null ? String(piece.duration_seconds) : '')
        : prev.duration_seconds,
      rights_status: prev.rights_status === (last.rights_status ?? 'unknown') ? (piece.rights_status ?? 'unknown') : prev.rights_status,
      copyright_info: prev.copyright_info === (last.copyright_info ?? '') ? (piece.copyright_info ?? '') : prev.copyright_info,
      program_notes: prev.program_notes === (last.program_notes ?? '') ? (piece.program_notes ?? '') : prev.program_notes,
    }));
    lastPieceRef.current = piece;
  }, [piece]);

  // Debounced commit — only sends fields that differ from the canonical
  // piece, and refuses to send an empty title (the DB rejects it).
  useEffect(() => {
    const t = window.setTimeout(() => {
      const patch: Record<string, unknown> = {};
      if (local.title !== piece.title && local.title.trim().length > 0) patch.title = local.title;
      if (local.composer !== (piece.composer ?? '')) patch.composer = local.composer || null;
      if (local.arranger !== (piece.arranger ?? '')) patch.arranger = local.arranger || null;
      const currentDur = piece.duration_seconds != null ? String(piece.duration_seconds) : '';
      if (local.duration_seconds !== currentDur) {
        patch.duration_seconds = local.duration_seconds.trim() === '' ? null : Number(local.duration_seconds);
      }
      if (local.rights_status !== (piece.rights_status ?? 'unknown')) patch.rights_status = local.rights_status;
      if (local.copyright_info !== (piece.copyright_info ?? '')) patch.copyright_info = local.copyright_info || null;
      if (local.program_notes !== (piece.program_notes ?? '')) patch.program_notes = local.program_notes || null;
      if (Object.keys(patch).length > 0) onCommit(patch);
    }, 700);
    return () => window.clearTimeout(t);
  }, [local]); // eslint-disable-line react-hooks/exhaustive-deps

  const setField = <K extends keyof typeof local>(k: K, v: (typeof local)[K]) =>
    setLocal((prev) => ({ ...prev, [k]: v }));

  // Audience mode stays the two-column split (notes-on-the-right looks
  // like a real printed program). Editor mode goes full-width with a
  // dense 12-col metadata grid up top + the notes textarea spanning
  // the whole width below — minimises vertical scroll once the piece
  // is expanded.
  if (viewMode !== 'editor') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-4 border-l-2 border-border pl-3">
          <span className={themeAccent}>Performance notes</span>
          <div className="mt-1">
            <h4 className="text-xl font-bold leading-tight">{piece.title || 'Untitled work'}</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {piece.composer || 'Composer pending'}
              {piece.arranger && ` · arr. ${piece.arranger}`}
            </p>
          </div>
        </div>
        <div className="md:col-span-8 text-base">
          <p className="leading-relaxed italic text-muted-foreground">
            "{piece.program_notes || 'No program notes provided.'}"
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <span className={themeAccent}>Performance notes</span>

      {/* Row 1 — Title (wide) + Composer + Arranger */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
        <div className="md:col-span-6 relative">
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Title</label>
          <Input
            value={local.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="Title"
            className="text-base font-bold pr-9"
          />
          <SpeechInputButton
            label="Dictate piece title"
            className="absolute right-1 top-[26px] h-7 w-7 no-print"
            onTranscript={(text) => setField('title', text)}
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Composer</label>
          <Input
            value={local.composer}
            onChange={(e) => setField('composer', e.target.value)}
            placeholder="Composer"
            className="text-sm"
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Arranger</label>
          <Input
            value={local.arranger}
            onChange={(e) => setField('arranger', e.target.value)}
            placeholder="If applicable"
            className="text-sm"
          />
        </div>
      </div>

      {/* Row 2 — Duration + Rights + Copyright (only when licensed) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
        <div className="md:col-span-3">
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Duration (sec)</label>
          <Input
            type="number"
            value={local.duration_seconds}
            onChange={(e) => setField('duration_seconds', e.target.value)}
            placeholder="e.g. 240"
            className="text-sm"
          />
        </div>
        <div className={local.rights_status === 'licensed' ? 'md:col-span-3' : 'md:col-span-9'}>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Rights</label>
          <select
            value={local.rights_status}
            onChange={(e) => setField('rights_status', e.target.value as RightsStatus)}
            className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm h-9"
          >
            <option value="unknown">Unknown</option>
            <option value="public_domain">Public Domain</option>
            <option value="licensed">Licensed</option>
          </select>
        </div>
        {local.rights_status === 'licensed' && (
          <div className="md:col-span-6">
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Publisher / copyright</label>
            <Input
              value={local.copyright_info}
              onChange={(e) => setField('copyright_info', e.target.value)}
              placeholder="Publisher / copyright line"
              className="text-sm"
            />
          </div>
        )}
      </div>

      {/* Row 3 — Program notes textarea spans full width */}
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Program notes</label>
        <div className="relative">
          <Textarea
            rows={4}
            value={local.program_notes}
            onChange={(e) => setField('program_notes', e.target.value)}
            placeholder="History, analysis, dedications…"
            className="text-sm pr-10"
          />
          <SpeechInputButton
            label="Dictate program notes (appends)"
            className="absolute right-1 top-1 h-7 w-7 no-print"
            onTranscript={(text) => {
              const sep = local.program_notes && !local.program_notes.endsWith(' ') ? ' ' : '';
              setField('program_notes', `${local.program_notes}${sep}${text}`);
            }}
          />
        </div>
      </div>

      {/* Footer — delete */}
      <div className="flex justify-end no-print pt-2 border-t border-border/60">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-rose-600 hover:text-rose-700"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete piece
        </Button>
      </div>
    </div>
  );
}

function FieldInline({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-0.5 bg-background border border-border rounded px-1.5 py-0.5 text-xs"
      />
    </label>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function slugify(s: string) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'program';
}

function QrPlaceholder({ url }: { url: string }) {
  // Placeholder QR — the visual placeholder from the prototype. A real
  // QR generator (e.g. the `qrcode` lib we already use for ticketing)
  // gets wired in P5 once the public URL is stable.
  return (
    <svg
      className="w-24 h-24 text-foreground"
      viewBox="0 0 100 100"
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-label={`QR placeholder for ${url}`}
    >
      <path d="M0,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z" />
      <path d="M70,0 h30 v30 h-30 z M80,10 h10 v10 h-10 z" />
      <path d="M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z" />
      <path d="M40,5 h10 v10 h-10 z M55,0 h10 v5 h-10 z M45,20 h20 v5 h-20 z" />
      <path d="M35,40 h10 v15 h-10 z M50,35 h15 v10 h-15 z M75,45 h20 v10 h-20 z" />
      <path d="M40,70 h15 v5 h-15 z M45,85 h10 v15 h-10 z M70,75 h15 v10 h-15 z" />
      <path d="M60,90 h25 v5 h-25 z M90,65 h5 v25 h-5 z" />
    </svg>
  );
}
