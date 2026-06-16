// Music Library (Command Center). Sheet music scores only — gw_sheet_music.
// Two tabs: Scores (browse + upload, scope filter, search) and Setlists
// (build/play performance orderings). Clicking a score opens
// PDFViewerWithAnnotations so the score can be marked up; annotations
// persist via gw_sheet_music_annotations and can be shared per existing
// flows. The legacy /music-library two-pane viewer remains for deep links.

import { lazy, Suspense, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Music, Upload, Search, Loader2, FileMusic, ListMusic,
  PencilLine,
} from 'lucide-react';
import { toast } from 'sonner';
import { useScopeFilter } from '@/hooks/useScopeFilter';
import { ScopeFilterChips } from '@/components/library/ScopeFilterChips';

const SetlistBuilder = lazy(() =>
  import('@/components/music-library/SetlistBuilder').then((m) => ({ default: m.SetlistBuilder })),
);
const PDFViewerWithAnnotations = lazy(() =>
  import('@/components/PDFViewerWithAnnotations').then((m) => ({ default: m.PDFViewerWithAnnotations })),
);

type TopTab = 'scores' | 'setlists';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

interface ScoreRow {
  id: string;
  title: string;
  composer: string | null;
  voicing: string | null;
  difficulty_level: string | null;
  pdf_url: string | null;
  course_id: string | null;
  created_at: string | null;
}

export default function MusicLibraryPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { active: scope, setActive: setScope, options, courses, applyFilter } = useScopeFilter();
  const [topTab, setTopTab] = useState<TopTab>('scores');
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  // Annotation viewer state — when set, opens a full-screen dialog with the
  // annotated PDF viewer so the user can mark up the score.
  const [viewing, setViewing] = useState<{ id: string; title: string; pdfUrl: string } | null>(null);

  const { data: rows = [], isLoading } = useQuery<ScoreRow[]>({
    queryKey: ['music-library-scores', scope],
    queryFn: async () => {
      let q = supabase
        .from('gw_sheet_music')
        .select('id, title, composer, voicing, difficulty_level, pdf_url, course_id, created_at')
        .eq('is_archived', false)
        .order('title')
        .limit(200);
      q = applyFilter(q as any);
      const { data } = await q;
      return (data ?? []) as ScoreRow[];
    },
  });

  const courseCodeById = useMemo(() => {
    const m: Record<string, string> = {};
    courses.forEach((c) => { m[c.id] = c.course_code; });
    return m;
  }, [courses]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.trim().toLowerCase();
    return rows.filter((r) =>
      r.title?.toLowerCase().includes(s) ||
      r.composer?.toLowerCase().includes(s) ||
      r.voicing?.toLowerCase().includes(s),
    );
  }, [rows, search]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Music Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sheet music scores across your ensembles. Other media types live in the Media Library.
          </p>
        </div>
        {topTab === 'scores' && (
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="w-4 h-4 mr-1.5" /> Add Score
          </Button>
        )}
      </div>

      {/* Top-level tabs: Scores vs Setlists. */}
      <div className="flex gap-2 border-b border-border">
        {([
          { key: 'scores',   label: 'Scores',   Icon: Music },
          { key: 'setlists', label: 'Setlists', Icon: ListMusic },
        ] as Array<{ key: TopTab; label: string; Icon: React.ComponentType<{ className?: string }> }>).map((t) => {
          const isActive = t.key === topTab;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTopTab(t.key)}
              className={
                isActive
                  ? 'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 border-primary text-primary -mb-px'
                  : 'inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors'
              }
            >
              <t.Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {topTab === 'scores' ? (
        <>
          <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
            <CardContent className="p-5 space-y-4">
              <div>
                <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">Scope</div>
                <ScopeFilterChips active={scope} options={options} onChange={setScope} />
              </div>
              <div className="relative max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, composer, voicing…"
                  className="pl-9 h-9"
                />
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 className="w-6 h-6 animate-spin inline text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
              <CardContent className="p-12 text-center">
                <FileMusic className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-base font-semibold">No scores match the current filters.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {rows.length === 0
                    ? 'Add your first score to build the library.'
                    : 'Try a different scope or search term.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((r) => (
                <ScoreCard
                  key={r.id}
                  row={r}
                  courseCode={r.course_id ? courseCodeById[r.course_id] ?? null : null}
                  onAnnotate={() => r.pdf_url && setViewing({ id: r.id, title: r.title, pdfUrl: r.pdf_url })}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        // Setlists tab — wraps the existing SetlistBuilder inside the same
        // card surface. SetlistBuilder owns create / reorder / share /
        // delete; we pass onPdfSelect so picking a song from inside a
        // setlist still opens the annotated viewer.
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-5">
            <Suspense
              fallback={
                <div className="py-10 text-center">
                  <Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" />
                </div>
              }
            >
              <SetlistBuilder
                onPdfSelect={(url, title, id) =>
                  url && setViewing({ id: id ?? '', title, pdfUrl: url })
                }
                onOpenPlayer={() => { /* handled inside SetlistBuilder */ }}
              />
            </Suspense>
          </CardContent>
        </Card>
      )}

      <AddScoreDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        userId={user?.id ?? null}
        courses={courses}
        onUploaded={() => {
          qc.invalidateQueries({ queryKey: ['music-library-scores'] });
          setUploadOpen(false);
        }}
      />

      {/* Annotation viewer — opens a near-fullscreen dialog wrapping the
          shared PDFViewerWithAnnotations. Annotations save into
          gw_sheet_music_annotations and persist across sessions. */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="p-4 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <PencilLine className="w-4 h-4 text-primary" />
              {viewing?.title || 'Score'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {viewing && (
              <Suspense
                fallback={
                  <div className="py-10 text-center">
                    <Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" />
                  </div>
                }
              >
                <PDFViewerWithAnnotations
                  pdfUrl={viewing.pdfUrl}
                  musicId={viewing.id}
                  musicTitle={viewing.title}
                  startInAnnotationMode={false}
                  className="h-full"
                />
              </Suspense>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScoreCard({
  row, courseCode, onAnnotate,
}: { row: ScoreRow; courseCode: string | null; onAnnotate: () => void }) {
  const hasPdf = !!row.pdf_url;
  return (
    <Card
      className={`${SOFT_CARD} ${hasPdf ? 'cursor-pointer transition-colors hover:bg-accent/40' : ''}`}
      style={SOFT_CARD_STYLE}
      onClick={hasPdf ? onAnnotate : undefined}
      role={hasPdf ? 'button' : undefined}
      tabIndex={hasPdf ? 0 : undefined}
      onKeyDown={
        hasPdf
          ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAnnotate(); } }
          : undefined
      }
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary">
            <Music className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold leading-snug truncate">{row.title || 'Untitled'}</div>
            {row.composer && (
              <div className="text-sm text-muted-foreground truncate mt-0.5">{row.composer}</div>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {row.voicing && <Badge variant="outline" className="text-xs">{row.voicing}</Badge>}
              {row.difficulty_level && <Badge variant="outline" className="text-xs">{row.difficulty_level}</Badge>}
              {courseCode ? (
                <Badge variant="outline" className="text-xs">{courseCode}</Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">Platform</Badge>
              )}
            </div>
          </div>
        </div>
        {hasPdf && (
          <div className="flex justify-end mt-3">
            <Button
              variant="default"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onAnnotate(); }}
            >
              <PencilLine className="w-4 h-4 mr-1.5" />
              Annotate
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddScoreDialog({
  open, onOpenChange, userId, courses, onUploaded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string | null;
  courses: Array<{ id: string; course_code: string; title: string }>;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [voicing, setVoicing] = useState('');
  const [destination, setDestination] = useState<string>('platform');
  const [submitting, setSubmitting] = useState(false);

  async function handleUpload() {
    if (!userId) return;
    setSubmitting(true);
    try {
      let pdfUrl: string | null = null;
      if (file) {
        const path = `scores/${userId}/${Date.now()}-${file.name}`;
        const { error: uploadErr } = await supabase.storage
          .from('sheet-music')
          .upload(path, file, { contentType: file.type });
        if (uploadErr) throw uploadErr;
        const { data: pub } = supabase.storage.from('sheet-music').getPublicUrl(path);
        pdfUrl = pub.publicUrl;
      }

      const { error: insertErr } = await supabase.from('gw_sheet_music').insert({
        title: title || file?.name || 'Untitled',
        composer: composer || null,
        voicing: voicing || null,
        pdf_url: pdfUrl,
        course_id: destination === 'platform' ? null : destination,
        created_by: userId,
        is_archived: false,
        is_public: false,
      });
      if (insertErr) throw insertErr;

      toast.success('Score added.');
      setFile(null); setTitle(''); setComposer(''); setVoicing(''); setDestination('platform');
      onUploaded();
    } catch (e: any) {
      toast.error(e?.message || 'Add failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a score</DialogTitle>
          <DialogDescription>
            Upload a PDF and tag it for your library.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm">PDF</Label>
            <Input
              type="file"
              accept="application/pdf,.pdf,.xml,.musicxml"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="cursor-pointer"
            />
          </div>
          <div>
            <Label className="text-sm">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ave Maria" />
          </div>
          <div>
            <Label className="text-sm">Composer</Label>
            <Input value={composer} onChange={(e) => setComposer(e.target.value)} placeholder="Franz Biebl" />
          </div>
          <div>
            <Label className="text-sm">Voicing</Label>
            <Input value={voicing} onChange={(e) => setVoicing(e.target.value)} placeholder="SATB" />
          </div>
          <div>
            <Label className="text-sm">Save to</Label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="platform">Platform (no class)</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.course_code} — {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!title.trim() || submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
            Add Score
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
