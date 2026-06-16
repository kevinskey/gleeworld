// Music Library (Command Center). Sheet music scores only — gw_sheet_music.
// Two tabs: Scores (browse + upload, scope filter, search) and Setlists
// (build/play performance orderings). Clicking a score opens
// PDFViewerWithAnnotations so the score can be marked up; annotations
// persist via gw_sheet_music_annotations and can be shared per existing
// flows. The legacy /music-library two-pane viewer remains for deep links.

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
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
  PencilLine, Headphones, Youtube, X, Pencil, Library as LibraryIcon,
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
  audio_url: string | null;
  audio_title: string | null;
  physical_copies_count: number | null;
  physical_location: string | null;
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
  // Audio attach dialog state — opens the per-score "Attach audio" picker.
  const [attachingAudio, setAttachingAudio] = useState<ScoreRow | null>(null);
  // Edit dialog state — librarian edit (title, composer, voicing, copies, location).
  const [editing, setEditing] = useState<ScoreRow | null>(null);

  const { data: rows = [], isLoading } = useQuery<ScoreRow[]>({
    queryKey: ['music-library-scores', scope],
    queryFn: async () => {
      let q = supabase
        .from('gw_sheet_music')
        .select('id, title, composer, voicing, difficulty_level, pdf_url, audio_url, audio_title, physical_copies_count, physical_location, course_id, created_at')
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
                  onAttachAudio={() => setAttachingAudio(r)}
                  onEdit={() => setEditing(r)}
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

      <AttachAudioDialog
        score={attachingAudio}
        userId={user?.id ?? null}
        onOpenChange={(open) => !open && setAttachingAudio(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['music-library-scores'] });
          setAttachingAudio(null);
        }}
      />

      <EditScoreDialog
        score={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['music-library-scores'] });
          setEditing(null);
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
  row, courseCode, onAnnotate, onAttachAudio, onEdit,
}: {
  row: ScoreRow;
  courseCode: string | null;
  onAnnotate: () => void;
  onAttachAudio: () => void;
  onEdit: () => void;
}) {
  const hasPdf = !!row.pdf_url;
  const hasAudio = !!row.audio_url;
  const copies = row.physical_copies_count ?? 0;
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
              {hasAudio && (
                <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                  <Headphones className="w-3 h-3 mr-1" />
                  Audio
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                <LibraryIcon className="w-3 h-3 mr-1" />
                {copies} {copies === 1 ? 'physical copy' : 'physical copies'}
                {row.physical_location ? ` · ${row.physical_location}` : ''}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            aria-label="Edit score details"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          {hasPdf && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onAttachAudio(); }}
              >
                <Headphones className="w-4 h-4 mr-1.5" />
                {hasAudio ? 'Audio' : 'Attach audio'}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onAnnotate(); }}
              >
                <PencilLine className="w-4 h-4 mr-1.5" />
                Annotate
              </Button>
            </>
          )}
        </div>
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
  const [physicalCopies, setPhysicalCopies] = useState('');
  const [physicalLocation, setPhysicalLocation] = useState('');
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

      const copies = parseInt(physicalCopies, 10);
      const { error: insertErr } = await supabase.from('gw_sheet_music').insert({
        title: title || file?.name || 'Untitled',
        composer: composer || null,
        voicing: voicing || null,
        pdf_url: pdfUrl,
        physical_copies_count: Number.isFinite(copies) ? copies : 0,
        physical_location: physicalLocation.trim() || null,
        course_id: destination === 'platform' ? null : destination,
        created_by: userId,
        is_archived: false,
        is_public: false,
      });
      if (insertErr) throw insertErr;

      toast.success('Score added.');
      setFile(null); setTitle(''); setComposer(''); setVoicing('');
      setPhysicalCopies(''); setPhysicalLocation('');
      setDestination('platform');
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Physical copies</Label>
              <Input
                type="number"
                min={0}
                value={physicalCopies}
                onChange={(e) => setPhysicalCopies(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-sm">Library location</Label>
              <Input
                value={physicalLocation}
                onChange={(e) => setPhysicalLocation(e.target.value)}
                placeholder="Folder B-12"
              />
            </div>
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

function AttachAudioDialog({
  score, userId, onOpenChange, onSaved,
}: {
  score: ScoreRow | null;
  userId: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const open = !!score;
  const [tab, setTab] = useState<'file' | 'youtube'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset form whenever a new score is opened.
  useEffect(() => {
    if (score) {
      const initialTitle = score.audio_title ?? '';
      const isYouTubeUrl = !!score.audio_url && /youtu(be\.com|\.be)/i.test(score.audio_url);
      setTab(isYouTubeUrl ? 'youtube' : 'file');
      setYoutubeUrl(isYouTubeUrl ? (score.audio_url ?? '') : '');
      setFile(null);
      setTitle(initialTitle);
    }
  }, [score]);

  async function handleSave() {
    if (!score || !userId) return;
    setSubmitting(true);
    try {
      let audioUrl: string | null = null;
      let audioTitle = title.trim();

      if (tab === 'file') {
        if (!file) {
          toast.error('Pick an MP3 first.');
          setSubmitting(false);
          return;
        }
        const ext = file.name.split('.').pop() || 'mp3';
        const path = `audio/${score.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('sheet-music')
          .upload(path, file, { contentType: file.type, upsert: true });
        if (uploadErr) throw uploadErr;
        audioUrl = supabase.storage.from('sheet-music').getPublicUrl(path).data.publicUrl;
        if (!audioTitle) audioTitle = file.name.replace(/\.[^.]+$/, '');
      } else {
        const url = youtubeUrl.trim();
        if (!url) {
          toast.error('Paste a YouTube URL first.');
          setSubmitting(false);
          return;
        }
        if (!/youtu(be\.com|\.be)/i.test(url)) {
          toast.error('That doesn\u2019t look like a YouTube URL.');
          setSubmitting(false);
          return;
        }
        audioUrl = url;
        if (!audioTitle) audioTitle = 'YouTube audio';
      }

      const { error } = await supabase
        .from('gw_sheet_music')
        .update({ audio_url: audioUrl, audio_title: audioTitle })
        .eq('id', score.id);
      if (error) throw error;

      toast.success('Audio attached.');
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to attach audio.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove() {
    if (!score) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('gw_sheet_music')
        .update({ audio_url: null, audio_title: null })
        .eq('id', score.id);
      if (error) throw error;
      toast.success('Audio removed.');
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove audio.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Attach audio</DialogTitle>
          <DialogDescription>
            Upload an MP3 or paste a YouTube URL. The score's play button will load this automatically.
            {score?.audio_url && ' YouTube videos play audio only — the player is hidden.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 border-b border-border">
          <button
            type="button"
            onClick={() => setTab('file')}
            className={
              tab === 'file'
                ? 'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 border-primary text-primary -mb-px'
                : 'inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            <Upload className="w-4 h-4" /> MP3
          </button>
          <button
            type="button"
            onClick={() => setTab('youtube')}
            className={
              tab === 'youtube'
                ? 'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 border-primary text-primary -mb-px'
                : 'inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            <Youtube className="w-4 h-4" /> YouTube
          </button>
        </div>

        <div className="space-y-3 pt-2">
          {tab === 'file' ? (
            <div>
              <Label className="text-sm">MP3 file</Label>
              <Input
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/aac,audio/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="cursor-pointer"
              />
            </div>
          ) : (
            <div>
              <Label className="text-sm">YouTube URL</Label>
              <Input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Video stays hidden during playback — only the audio plays.
              </p>
            </div>
          )}

          <div>
            <Label className="text-sm">Display title (optional)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Reference recording"
            />
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-between sm:justify-between gap-2">
          <div>
            {score?.audio_url && (
              <Button variant="ghost" size="sm" onClick={handleRemove} disabled={submitting}>
                <X className="w-4 h-4 mr-1" /> Remove
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Headphones className="w-4 h-4 mr-1.5" />}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditScoreDialog({
  score, onOpenChange, onSaved,
}: {
  score: ScoreRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const open = !!score;
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [voicing, setVoicing] = useState('');
  const [physicalCopies, setPhysicalCopies] = useState('');
  const [physicalLocation, setPhysicalLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (score) {
      setTitle(score.title ?? '');
      setComposer(score.composer ?? '');
      setVoicing(score.voicing ?? '');
      setPhysicalCopies(
        score.physical_copies_count != null ? String(score.physical_copies_count) : '',
      );
      setPhysicalLocation(score.physical_location ?? '');
    }
  }, [score]);

  async function handleSave() {
    if (!score) return;
    setSubmitting(true);
    try {
      const copies = parseInt(physicalCopies, 10);
      const { error } = await supabase
        .from('gw_sheet_music')
        .update({
          title: title.trim() || 'Untitled',
          composer: composer.trim() || null,
          voicing: voicing.trim() || null,
          physical_copies_count: Number.isFinite(copies) ? copies : 0,
          physical_location: physicalLocation.trim() || null,
        })
        .eq('id', score.id);
      if (error) throw error;
      toast.success('Score updated.');
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || 'Update failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit score</DialogTitle>
          <DialogDescription>
            Update title, composer, voicing, and physical inventory for this score.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label className="text-sm">Composer</Label>
            <Input value={composer} onChange={(e) => setComposer(e.target.value)} />
          </div>
          <div>
            <Label className="text-sm">Voicing</Label>
            <Input value={voicing} onChange={(e) => setVoicing(e.target.value)} placeholder="SATB" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Physical copies</Label>
              <Input
                type="number"
                min={0}
                value={physicalCopies}
                onChange={(e) => setPhysicalCopies(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-sm">Library location</Label>
              <Input
                value={physicalLocation}
                onChange={(e) => setPhysicalLocation(e.target.value)}
                placeholder="Folder B-12"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={submitting || !title.trim()}>
            {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Pencil className="w-4 h-4 mr-1.5" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
