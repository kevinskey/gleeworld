// Part Tracks landing page — pick (or create) a project. Since
// 2026-07-10 both the score link AND the backing track are optional at
// creation time (only a title is required): a project can be just
// voices, and the backing track can be chosen right in the dialog or
// later in the studio.

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Badge } from '@/components/ui/badge';
import { Disc3, Plus, Music, Search, Loader2, Sparkles, Trash2, Upload, Youtube, X } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { createPartTracksProject, deletePartTracksProject, type PartTracksProject, VOICING_TEMPLATES } from '@/hooks/usePartTracksProject';
import { PartTracksStudio } from '@/components/partTracks/PartTracksStudio';
import { AccompanimentPicker } from '@/components/partTracks/AccompanimentPicker';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

interface ScoreOption {
  id: string;
  title: string;
  composer: string | null;
  voicing: string | null;
}

interface ProjectRow extends PartTracksProject {
  score_title?: string;
  score_composer?: string | null;
}

export default function PartTracksLandingPage() {
  const { projectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();

  if (projectId) {
    return (
      <UniversalLayout>
        <PartTracksStudio projectId={projectId} />
      </UniversalLayout>
    );
  }

  return <ProjectsList onOpen={(id) => navigate(`/dashboard/part-tracks/${id}`)} />;
}

function ProjectsList({ onOpen }: { onOpen: (projectId: string) => void }) {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  const { data: projects = [], isLoading, refetch } = useQuery<ProjectRow[]>({
    queryKey: ['part-tracks-projects-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_part_tracks_projects')
        .select('*, score:gw_sheet_music(title, composer)')
        .order('created_at', { ascending: false })
        .limit(200);
      return (data ?? []).map((p: any) => ({
        ...p,
        score_title: p.score?.title,
        score_composer: p.score?.composer,
      }));
    },
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return projects;
    return projects.filter((p) =>
      p.title.toLowerCase().includes(s) ||
      p.score_title?.toLowerCase().includes(s) ||
      p.score_composer?.toLowerCase().includes(s));
  }, [projects, search]);

  return (
    <UniversalLayout>
    <DashboardPageShell
      title="Part Tracks Studio"
      icon={Disc3}
      subtitle="Build accompaniment and voice-part recordings. Link a score from your Music Library if you want one."
      actions={
        <Button onClick={() => setCreating(true)}>
          <Plus className="w-5 h-5 mr-1.5" /> New Project
        </Button>
      }
    >
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects, scores, composer…"
          className="pl-9 h-9"
        />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading projects…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center text-sm text-muted-foreground space-y-3">
            <Sparkles className="w-10 h-10 mx-auto text-amber-500/60" />
            <div>No projects yet.</div>
            <Button onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4 mr-1" /> Start your first project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Each card is a relative wrapper so the corner trash button
              can sit absolutely positioned. The body of the card still
              opens the project; the trash button stops propagation +
              confirms via toast before deleting. */}
          {filtered.map((p) => (
            <div
              key={p.id}
              className="relative group rounded-xl border border-border bg-card hover:border-primary/60 hover:shadow-md transition-all"
            >
              <button
                type="button"
                onClick={() => onOpen(p.id)}
                className="text-left p-4 w-full"
              >
                <div className="flex items-center gap-2 mb-2 pr-8">
                  <Disc3 className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold truncate flex-1">{p.title}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {p.score_title
                    ? `${p.score_title}${p.score_composer ? ` · ${p.score_composer}` : ''}`
                    : 'No score linked'}
                </div>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {p.voicing && <Badge variant="outline" className="text-[10px]">{p.voicing}</Badge>}
                  {p.tempo_bpm && <Badge variant="outline" className="text-[10px]">♩ {p.tempo_bpm}</Badge>}
                  {p.key_signature && <Badge variant="outline" className="text-[10px]">{p.key_signature}</Badge>}
                </div>
                <div className="text-[10px] text-muted-foreground mt-2">
                  Created {format(parseISO(p.created_at), 'MMM d, yyyy')}
                </div>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toast(`Delete project "${p.title}"?`, {
                    description: 'Every track and recording linked to this project will be removed.',
                    duration: 10000,
                    action: {
                      label: 'Delete',
                      onClick: async () => {
                        const { error } = await deletePartTracksProject(p.id);
                        if (error) toast.error(`Couldn't delete: ${error}`);
                        else { toast.success(`Removed "${p.title}"`); refetch(); }
                      },
                    },
                    cancel: { label: 'Cancel', onClick: () => { /* dismiss */ } },
                  });
                }}
                className="absolute top-2 right-2 inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity touch-manipulation"
                title="Delete project"
                aria-label={`Delete project ${p.title}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <CreateProjectDialog
        open={creating}
        onOpenChange={setCreating}
        userId={user?.id ?? null}
        onCreated={(id) => { setCreating(false); refetch(); onOpen(id); }}
      />
    </DashboardPageShell>
    </UniversalLayout>
  );
}

// Backing-track selection held in dialog state until the project row
// exists, then persisted with the same accompaniment_* shape the studio
// handlers write — so entering the studio afterwards behaves exactly as
// if the backing had been picked there.
type BackingChoice =
  | { kind: 'file'; file: File; label: string }
  | { kind: 'apple_music' | 'apple_music_album'; id: string; storefront: string; title: string; artist: string; artworkUrl: string | null; label: string }
  | { kind: 'youtube'; url: string; label: string };

async function applyBackingChoice(projectId: string, choice: BackingChoice) {
  if (choice.kind === 'file') {
    const ext = (choice.file.name.split('.').pop() || 'mp3').toLowerCase();
    const contentType = choice.file.type && choice.file.type !== 'application/octet-stream'
      ? choice.file.type
      : 'audio/mpeg';
    const path = `part-tracks/${projectId}/accompaniment-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('sheet-music').upload(path, choice.file, { contentType, upsert: true });
    if (error) throw new Error(`Backing upload failed: ${error.message}`);
    const url = supabase.storage.from('sheet-music').getPublicUrl(path).data.publicUrl;
    await supabase.from('gw_part_tracks_projects').update({
      accompaniment_url: url,
      accompaniment_title: choice.file.name,
      accompaniment_kind: 'file',
      accompaniment_apple_music_id: null,
      accompaniment_youtube_url: null,
    } as any).eq('id', projectId);
    await supabase.from('gw_part_tracks_tracks').update({ audio_url: url })
      .eq('project_id', projectId).eq('kind', 'accompaniment');
  } else if (choice.kind === 'youtube') {
    await supabase.from('gw_part_tracks_projects').update({
      accompaniment_url: null,
      accompaniment_title: 'YouTube backing track',
      accompaniment_kind: 'youtube',
      accompaniment_apple_music_id: null,
      accompaniment_youtube_url: choice.url,
    } as any).eq('id', projectId);
  } else {
    await supabase.from('gw_part_tracks_projects').update({
      accompaniment_url: null,
      accompaniment_title: `${choice.title} · ${choice.artist}${choice.kind === 'apple_music_album' ? ' (album)' : ''}`,
      accompaniment_kind: choice.kind,
      accompaniment_apple_music_id: choice.id,
      accompaniment_apple_music_storefront: choice.storefront,
      accompaniment_apple_music_artist: choice.artist,
      accompaniment_apple_music_artwork_url: choice.artworkUrl,
      accompaniment_youtube_url: null,
    } as any).eq('id', projectId);
  }
}

function CreateProjectDialog({
  open, onOpenChange, userId, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string | null;
  onCreated: (projectId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<ScoreOption | null>(null);
  const [voicing, setVoicing] = useState<string>('SATB');
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [backing, setBacking] = useState<BackingChoice | null>(null);
  const [accPickerOpen, setAccPickerOpen] = useState(false);

  const { data: scores = [] } = useQuery<ScoreOption[]>({
    queryKey: ['part-tracks-score-picker', open],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_sheet_music')
        .select('id, title, composer, voicing')
        .eq('is_archived', false)
        .order('title')
        .limit(500);
      return (data ?? []) as ScoreOption[];
    },
  });

  const filteredScores = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return scores.slice(0, 50);
    return scores.filter((sc) =>
      sc.title?.toLowerCase().includes(s) ||
      sc.composer?.toLowerCase().includes(s)).slice(0, 50);
  }, [scores, search]);

  const submit = async () => {
    const finalTitle = title.trim() || picked?.title || '';
    if (!finalTitle) return;
    setSubmitting(true);
    const projectId = await createPartTracksProject({
      sheetMusicId: picked?.id ?? null,
      title: finalTitle,
      voicing: voicing || picked?.voicing || null,
      userId,
    });
    if (!projectId) { setSubmitting(false); toast.error('Could not create project'); return; }
    if (backing) {
      try {
        await applyBackingChoice(projectId, backing);
      } catch (e: any) {
        // Non-fatal: the project exists; the studio can set the backing
        // track again from its own picker.
        toast.warning(`Project created, but the backing track could not be set (${e?.message ?? 'unknown error'}). Set it in the studio.`);
      }
    }
    setSubmitting(false);
    onCreated(projectId);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => onOpenChange(false)}>
      <div
        className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold">New Part Tracks project</h2>
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              1. Project title + voicing
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title" />
              </div>
              <div className="col-span-2 flex gap-1 flex-wrap">
                {Object.keys(VOICING_TEMPLATES).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVoicing(v)}
                    className={`px-2 py-1 text-xs rounded border ${
                      voicing === v
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              The chosen voicing seeds the tracks list. SATB → S/A/T/B, SSA → S1/S2/A, etc.
            </p>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              2. Backing track <span className="normal-case tracking-normal">(optional)</span>
            </div>
            {backing ? (
              <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                {backing.kind === 'file' ? <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
                  : backing.kind === 'youtube' ? <Youtube className="w-4 h-4 text-muted-foreground shrink-0" />
                  : <Music className="w-4 h-4 text-muted-foreground shrink-0" />}
                <span className="text-sm truncate flex-1">{backing.label}</span>
                <button
                  type="button"
                  onClick={() => setBacking(null)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Remove backing track"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setAccPickerOpen(true)}>
                <Music className="w-4 h-4 mr-1" /> Choose backing track
              </Button>
            )}
            <p className="text-[11px] text-muted-foreground mt-2">
              Upload a file or link Apple Music / YouTube. You can also set or change it later in the studio.
            </p>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
              <span>3. Link a score <span className="normal-case tracking-normal">(optional)</span></span>
              {picked && (
                <button
                  type="button"
                  onClick={() => setPicked(null)}
                  className="normal-case tracking-normal underline hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search the Music Library…"
                className="pl-9 h-9"
              />
            </div>
            <div className="border rounded-md max-h-60 overflow-y-auto divide-y">
              {filteredScores.map((sc) => {
                const isPicked = picked?.id === sc.id;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => {
                      setPicked(sc);
                      if (sc.voicing) setVoicing(sc.voicing);
                      if (!title) setTitle(sc.title);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left ${
                      isPicked ? 'bg-accent/60' : 'hover:bg-accent/40'
                    }`}
                  >
                    <Music className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{sc.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {sc.composer ?? '—'}{sc.voicing ? ` · ${sc.voicing}` : ''}
                      </div>
                    </div>
                  </button>
                );
              })}
              {filteredScores.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground italic">No matches.</div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={(!title.trim() && !picked) || submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Disc3 className="w-4 h-4 mr-1" />}
            Create project
          </Button>
        </div>

        {/* Same picker the studio uses — the choice is held in dialog
            state and persisted right after the project row exists. */}
        <AccompanimentPicker
          open={accPickerOpen}
          onClose={() => setAccPickerOpen(false)}
          onPickFile={(file) => setBacking({ kind: 'file', file, label: file.name })}
          onPickAppleMusic={(t) => setBacking({ kind: 'apple_music', ...t, label: `${t.title} · ${t.artist}` })}
          onPickAppleMusicAlbum={(a) => setBacking({ kind: 'apple_music_album', ...a, label: `${a.title} · ${a.artist} (album)` })}
          onPickYouTube={(url) => setBacking({ kind: 'youtube', url, label: url })}
        />
      </div>
    </div>
  );
}
