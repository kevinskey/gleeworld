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
  XCircle, QrCode, Plus, Trash2, Music,
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
    <div className={`min-h-screen ${theme.container} transition-colors`}>
      {/* Print CSS — one card per page, no editor chrome. */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body, .min-h-screen { background: white !important; color: black !important; }
          .program-card { page-break-after: always; break-inside: avoid; border: none !important; box-shadow: none !important; padding: 2rem 0 !important; }
        }
      ` }} />

      {/* Top bar */}
      <header className="no-print bg-card border-b border-border sticky top-0 z-30 px-4 py-2.5 flex items-center gap-2 flex-wrap">
        <Button asChild variant="ghost" size="sm">
          <Link to="/dashboard/concert-planner">
            <ArrowLeft className="w-4 h-4 mr-1" /> All programs
          </Link>
        </Button>
        <div className="text-sm font-semibold truncate flex-1 min-w-0">
          {header.title || 'Untitled program'}
        </div>
        <div className="bg-muted rounded-lg p-1 flex">
          <button
            onClick={() => setViewMode('editor')}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${viewMode === 'editor' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
          ><Edit3 className="w-3 h-3" /> Editor</button>
          <button
            onClick={() => setViewMode('audience')}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${viewMode === 'audience' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
          ><Eye className="w-3 h-3" /> Audience</button>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-1" /> Print
        </Button>
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

      <main className="max-w-[1600px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar — editor only */}
        {viewMode === 'editor' && (
          <aside className="no-print lg:col-span-4 space-y-4">
            {/* Always-visible "Add piece" — the one buried on the timeline
                card scrolls out of view once a few pieces exist, so the
                most common action gets a dedicated sidebar button too. */}
            <section className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wider font-semibold">Repertoire</div>
                <div className="text-[11px] text-muted-foreground">{pieces.length} piece{pieces.length === 1 ? '' : 's'} on the program</div>
              </div>
              <Button size="sm" onClick={() => addPiece.mutate({})}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add piece
              </Button>
            </section>

            {/* Approval gate */}
            <section className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-amber-700 mb-2">
                <ShieldCheck className="w-4 h-4" />
                <h3 className="font-semibold text-xs uppercase tracking-wide">Publish approval</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Publishing posts this program to a public URL. Confirm that the rights, credits, and rosters are accurate.
              </p>
              <label className="flex items-start gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={hasApproval}
                  onChange={(e) => setHasApproval(e.target.checked)}
                  className="mt-0.5"
                />
                <span>I've reviewed every piece's composer, arranger, and rights status, and the roster matches who's actually performing.</span>
              </label>
            </section>

            {/* Theme + format */}
            <section className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="font-semibold text-xs uppercase tracking-wide flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Style
              </h3>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Theme</Label>
                <select
                  value={program.theme}
                  onChange={(e) => updateProgram.mutate({ theme: e.target.value as VisualTheme })}
                  className="w-full mt-1 bg-background border border-border rounded px-2 py-1.5 text-xs"
                >
                  {THEME_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {THEME_OPTIONS.find((t) => t.value === program.theme)?.sub}
                </p>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Print format</Label>
                <select
                  value={program.print_format}
                  onChange={(e) => updateProgram.mutate({ print_format: e.target.value as PrintFormat })}
                  className="w-full mt-1 bg-background border border-border rounded px-2 py-1.5 text-xs"
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
                  className="mt-1 text-xs"
                  placeholder="e.g. 45"
                />
              </div>
            </section>

            {/* Validation */}
            <section className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold text-xs uppercase tracking-wide flex items-center gap-1.5 mb-3">
                <FileText className="w-3.5 h-3.5" /> Validation
              </h3>
              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                {validation.items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-2 rounded border text-[11px] flex items-start gap-2 ${
                      item.level === 'required' ? 'bg-rose-50 border-rose-100 text-rose-900'
                      : item.level === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-900'
                      : 'bg-emerald-50 border-emerald-100 text-emerald-900'
                    }`}
                  >
                    {item.level === 'required' && <XCircle className="w-3.5 h-3.5 mt-0.5 text-rose-600 shrink-0" />}
                    {item.level === 'warning' && <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-amber-600 shrink-0" />}
                    {item.level === 'ready' && <Check className="w-3.5 h-3.5 mt-0.5 text-emerald-600 shrink-0" />}
                    <div>
                      <div className="text-[9px] uppercase font-semibold opacity-70">{item.category} · {item.level}</div>
                      <div className="mt-0.5">{item.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Roster */}
            <RosterEditor concert={concert} />
          </aside>
        )}

        {/* Card stack */}
        <section className={`${viewMode === 'editor' ? 'lg:col-span-8' : 'lg:col-span-12'} ${formatStyles} space-y-6 w-full`}>
          {cards
            .filter((c) => viewMode === 'editor' || c.visible)
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
                pieceExpanded={card.pieceId ? expandedPieces.has(card.pieceId) : false}
                onTogglePieceExpanded={() => card.pieceId && toggleExpanded(card.pieceId)}
                publicUrl={publicUrl}
              />
            ))}
          {/* End-of-stack Add piece — the same action that's on the
              timeline card + sidebar, but landed exactly where the eye
              ends up after editing the last piece-detail card. */}
          {viewMode === 'editor' && (
            <div className="no-print flex justify-center pt-2">
              <Button variant="outline" size="sm" onClick={() => addPiece.mutate({})}>
                <Plus className="w-4 h-4 mr-1" /> Add another piece
              </Button>
            </div>
          )}
        </section>
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
                  className="w-full text-center text-3xl bg-transparent border-b border-dashed border-current/30 focus:outline-none focus:border-primary pr-10"
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
              <div className="grid grid-cols-2 gap-2 text-left text-xs">
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
              <h2 className="text-3xl tracking-tight" style={theme.heroTitle}>{program.title || 'Untitled program'}</h2>
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
      <div className="md:col-span-5 border-l-2 border-border pl-3">
        <span className={themeAccent}>Performance notes</span>
        {viewMode === 'editor' ? (
          <div className="space-y-2 mt-1">
            <div className="relative">
              <Input
                value={local.title}
                onChange={(e) => setField('title', e.target.value)}
                placeholder="Title"
                className="text-base font-bold pr-10"
              />
              <SpeechInputButton
                label="Dictate piece title"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 no-print"
                onTranscript={(text) => setField('title', text)}
              />
            </div>
            <Input
              value={local.composer}
              onChange={(e) => setField('composer', e.target.value)}
              placeholder="Composer"
              className="text-sm"
            />
            <Input
              value={local.arranger}
              onChange={(e) => setField('arranger', e.target.value)}
              placeholder="Arranger (if applicable)"
              className="text-sm"
            />
            <Input
              type="number"
              value={local.duration_seconds}
              onChange={(e) => setField('duration_seconds', e.target.value)}
              placeholder="Duration (seconds)"
              className="text-sm"
            />
            <select
              value={local.rights_status}
              onChange={(e) => setField('rights_status', e.target.value as RightsStatus)}
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm"
            >
              <option value="unknown">Rights: Unknown</option>
              <option value="public_domain">Rights: Public Domain</option>
              <option value="licensed">Rights: Licensed</option>
            </select>
            {local.rights_status === 'licensed' && (
              <Input
                value={local.copyright_info}
                onChange={(e) => setField('copyright_info', e.target.value)}
                placeholder="Publisher / copyright line"
                className="text-sm"
              />
            )}
          </div>
        ) : (
          <div className="mt-1">
            <h4 className="text-lg font-bold leading-tight">{piece.title || 'Untitled work'}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {piece.composer || 'Composer pending'}
              {piece.arranger && ` · arr. ${piece.arranger}`}
            </p>
          </div>
        )}
      </div>
      <div className="md:col-span-7 text-sm">
        {viewMode === 'editor' ? (
          <div className="relative">
            <Textarea
              rows={6}
              value={local.program_notes}
              onChange={(e) => setField('program_notes', e.target.value)}
              placeholder="Program notes (history, analysis, dedications…)"
              className="text-sm pr-10"
            />
            <SpeechInputButton
              label="Dictate program notes (appends)"
              className="absolute right-1 top-1 h-7 w-7 no-print"
              onTranscript={(text) => {
                // Textareas APPEND so multiple dictation passes build up.
                const sep = local.program_notes && !local.program_notes.endsWith(' ') ? ' ' : '';
                setField('program_notes', `${local.program_notes}${sep}${text}`);
              }}
            />
          </div>
        ) : (
          <p className="leading-relaxed italic text-muted-foreground">
            "{piece.program_notes || 'No program notes provided.'}"
          </p>
        )}
      </div>
      {viewMode === 'editor' && (
        <div className="md:col-span-12 flex justify-end no-print pt-2 border-t border-border/60 mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-rose-600 hover:text-rose-700"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete piece
          </Button>
        </div>
      )}
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
