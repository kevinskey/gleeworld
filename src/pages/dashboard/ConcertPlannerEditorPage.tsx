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
  type ProgramCard,
  type VisualTheme,
  type PrintFormat,
  type RightsStatus,
} from '@/lib/concertPlanner';
import { RosterEditor } from '@/components/concertPlanner/RosterEditor';
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

  const theme = themeClasses(program.theme);
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
                  <option value="classic-concert">Classic Concert</option>
                  <option value="modern-show">Modern Show</option>
                  <option value="chamber-minimalist">Chamber Minimalist</option>
                </select>
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
                publicUrl={publicUrl}
              />
            ))}
        </section>
      </main>

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
  theme: ReturnType<typeof themeClasses>;
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
  publicUrl: string | null;
}

function ProgramCardView(p: CardViewProps) {
  const { card, viewMode, theme, program, pieces, roster, header, onHeaderChange } = p;

  // In editor view we always show the card (so the admin can re-enable
  // a hidden one); audience view drops hidden cards entirely.
  const hiddenStyle = !card.visible && viewMode === 'editor' ? 'opacity-50 border-dashed' : '';

  return (
    <div className={`relative group program-card ${theme.card} ${hiddenStyle}`}>
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
          <button
            onClick={() => toast.message('Regen coming soon', { description: 'AI rewrite for this card will live here.' })}
            className="px-2 py-1 hover:bg-amber-50 rounded text-amber-700 flex items-center gap-1 text-[10px] font-semibold"
          >
            <Sparkles className="w-3 h-3" /> Regen
          </button>
        </div>
      )}

      {card.kind === 'hero-cover' && (
        <div className="text-center py-4">
          <span className={theme.accent}>Concert Program</span>
          {viewMode === 'editor' ? (
            <div className="space-y-3 max-w-xl mx-auto mt-2">
              <input
                type="text"
                value={header.title}
                onChange={(e) => onHeaderChange((h: any) => ({ ...h, title: e.target.value }))}
                className="w-full text-center text-2xl font-bold bg-transparent border-b border-dashed border-border focus:outline-none focus:border-primary"
                placeholder="Concert title"
              />
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
              <h2 className="text-3xl font-bold tracking-tight">{program.title || 'Untitled program'}</h2>
              {program.subtitle && <p className="text-base text-muted-foreground">{program.subtitle}</p>}
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
        return (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <div className="md:col-span-5 border-l-2 border-border pl-3">
              <span className={theme.accent}>Performance notes</span>
              {viewMode === 'editor' ? (
                <div className="space-y-2 mt-1">
                  <BufferedTitleInput
                    value={piece.title}
                    onCommit={(v) => p.onUpdatePiece(piece.id, { title: v })}
                    placeholder="Title"
                    className="text-base font-bold"
                  />
                  <Input
                    value={piece.composer ?? ''}
                    onChange={(e) => p.onUpdatePiece(piece.id, { composer: e.target.value })}
                    placeholder="Composer"
                    className="text-xs"
                  />
                  <Input
                    value={piece.arranger ?? ''}
                    onChange={(e) => p.onUpdatePiece(piece.id, { arranger: e.target.value })}
                    placeholder="Arranger (if applicable)"
                    className="text-xs"
                  />
                  <Input
                    type="number"
                    value={piece.duration_seconds ?? ''}
                    onChange={(e) => p.onUpdatePiece(piece.id, { duration_seconds: e.target.value ? Number(e.target.value) : null })}
                    placeholder="Duration (seconds)"
                    className="text-xs"
                  />
                  <select
                    value={piece.rights_status ?? 'unknown'}
                    onChange={(e) => p.onUpdatePiece(piece.id, { rights_status: e.target.value as RightsStatus })}
                    className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs"
                  >
                    <option value="unknown">Rights: Unknown</option>
                    <option value="public_domain">Rights: Public Domain</option>
                    <option value="licensed">Rights: Licensed</option>
                  </select>
                  {piece.rights_status === 'licensed' && (
                    <Input
                      value={piece.copyright_info ?? ''}
                      onChange={(e) => p.onUpdatePiece(piece.id, { copyright_info: e.target.value })}
                      placeholder="Publisher / copyright line"
                      className="text-xs"
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
            <div className="md:col-span-7 text-xs">
              {viewMode === 'editor' ? (
                <Textarea
                  rows={4}
                  value={piece.program_notes ?? ''}
                  onChange={(e) => p.onUpdatePiece(piece.id, { program_notes: e.target.value })}
                  placeholder="Program notes (history, analysis, dedications…)"
                  className="text-xs"
                />
              ) : (
                <p className="leading-relaxed italic text-muted-foreground">
                  "{piece.program_notes || 'No program notes provided.'}"
                </p>
              )}
            </div>
            {/* Card-wide footer for the delete action so it doesn't
                compete with the notes textarea or the control bar. */}
            {viewMode === 'editor' && (
              <div className="md:col-span-12 flex justify-end no-print pt-2 border-t border-border/60 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => p.onDeletePiece(piece.id)}
                  className="text-rose-600 hover:text-rose-700"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete piece
                </Button>
              </div>
            )}
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

// Title-field buffer.
//
// The DB constraint `CHECK (length(trim(title)) > 0)` rejects updates
// that clear the title to empty, which would normally flash the input
// back to its old value mid-typing. We buffer locally so the user can
// type through an empty state, and only push to the DB once the value
// has a non-empty trim. On blur we either commit (non-empty) or revert
// the local buffer (empty → restore the last persisted value).
function BufferedTitleInput({
  value, onCommit, placeholder, className,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [local, setLocal] = useState(value);
  const lastPropRef = useRef(value);
  const debounceRef = useRef<number | null>(null);

  // Resync from upstream only when the local buffer matches the
  // previous upstream value (i.e. we haven't started editing yet) —
  // prevents the cursor from jumping mid-type.
  useEffect(() => {
    if (local === lastPropRef.current) setLocal(value);
    lastPropRef.current = value;
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Input
      value={local}
      placeholder={placeholder}
      className={className}
      onChange={(e) => {
        const next = e.target.value;
        setLocal(next);
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        if (next.trim().length > 0) {
          debounceRef.current = window.setTimeout(() => onCommit(next), 500);
        }
      }}
      onBlur={() => {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        if (local.trim().length > 0 && local !== value) {
          onCommit(local);
        } else if (local.trim().length === 0) {
          setLocal(value); // revert empty back to persisted
        }
      }}
    />
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

function themeClasses(theme: VisualTheme) {
  switch (theme) {
    case 'modern-show':
      return {
        container: 'bg-zinc-950 text-zinc-100',
        card: 'bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl p-6',
        accent: 'text-cyan-400 font-mono tracking-wider text-[10px] uppercase block mb-1',
      };
    case 'chamber-minimalist':
      return {
        container: 'bg-stone-50 text-stone-900',
        card: 'bg-white border border-stone-200 rounded-xl shadow-sm p-6',
        accent: 'text-stone-500 uppercase font-bold text-[10px] tracking-widest block mb-1',
      };
    case 'classic-concert':
    default:
      return {
        container: 'bg-slate-50 text-slate-900',
        card: 'bg-white border-t-4 border-t-amber-700 border-x border-b border-slate-200 rounded-xl shadow-sm p-6',
        accent: 'text-amber-700 font-semibold tracking-wide uppercase text-[10px] block mb-1',
      };
  }
}

function printFormatStyles(format: PrintFormat) {
  switch (format) {
    case 'half-fold': return 'max-w-xl mx-auto';
    case 'trifold':   return 'max-w-6xl mx-auto';
    case 'qr-lobby':  return 'max-w-md mx-auto text-center';
    case 'letter-portrait':
    default:          return 'max-w-4xl mx-auto';
  }
}

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
