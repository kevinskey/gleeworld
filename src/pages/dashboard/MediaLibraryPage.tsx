// Media Library (Command Center). Audio, video, MusicXML, documents, images —
// everything that isn't a sheet-music score (those live in /dashboard/music-
// library against gw_sheet_music). Honors the role-based visibility rules
// from RLS: admins see everything, instructors see their classes + platform,
// students see platform + enrolled classes. The scope chips on the header
// let an instructor narrow to a specific class.

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
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
  Image as ImageIcon, Music, Video, FileText, FolderOpen, Upload, Search,
  Loader2, Trash2, Download, X, Share2, Mail,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useScopeFilter } from '@/hooks/useScopeFilter';
import { ScopeFilterChips } from '@/components/library/ScopeFilterChips';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

type Kind = 'all' | 'audio' | 'video' | 'document' | 'image' | 'other';

interface MediaRow {
  id: string;
  title: string;
  file_url: string;
  file_path: string;
  file_type: string;
  file_size: number;
  course_id: string | null;
  created_at: string;
  folder: string | null;
}

function kindOf(fileType: string): Exclude<Kind, 'all'> {
  if (fileType?.startsWith('image/')) return 'image';
  if (fileType?.startsWith('audio/')) return 'audio';
  if (fileType?.startsWith('video/')) return 'video';
  if (fileType?.includes('pdf') || fileType?.includes('doc') || fileType?.includes('xml')) return 'document';
  return 'other';
}

const KIND_TABS: Array<{ key: Kind; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'all',      label: 'All',       icon: FolderOpen },
  { key: 'audio',    label: 'Audio',     icon: Music },
  { key: 'video',    label: 'Video',     icon: Video },
  { key: 'document', label: 'Documents', icon: FileText },
  { key: 'image',    label: 'Images',    icon: ImageIcon },
];

export default function MediaLibraryPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { active: scope, setActive: setScope, options, courses, applyFilter } = useScopeFilter();
  const [kind, setKind] = useState<Kind>('all');
  const [folder, setFolder] = useState<string | null>(null); // null = all folders
  const [search, setSearch] = useState('');
  const [shareFolder, setShareFolder] = useState<string | null>(null); // folder being shared
  const [uploadOpen, setUploadOpen] = useState(false);
  // Currently-open media in the inline player dialog. null = nothing
  // playing. Tapping a card opens the player here; external links / new
  // tabs / "open in another app" affordances are removed deliberately so
  // playback always stays inside the Media Library shell.
  const [playing, setPlaying] = useState<MediaRow | null>(null);

  const { data: rows = [], isLoading } = useQuery<MediaRow[]>({
    queryKey: ['media-library', scope],
    queryFn: async () => {
      let q = supabase
        .from('gw_media_library')
        .select('id, title, file_url, file_path, file_type, file_size, course_id, created_at, folder')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(200);
      q = applyFilter(q as any);
      const { data } = await q;
      return (data ?? []) as MediaRow[];
    },
  });

  const courseCodeById = useMemo(() => {
    const m: Record<string, string> = {};
    courses.forEach((c) => { m[c.id] = c.course_code; });
    return m;
  }, [courses]);

  // Distinct folders present in the current result set (e.g. "Studio"),
  // for the folder chip row. null-folder rows are the ungrouped library.
  const folders = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.folder) set.add(r.folder);
    return [...set].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (folder !== null) list = list.filter((r) => (r.folder ?? null) === folder);
    if (kind !== 'all') list = list.filter((r) => kindOf(r.file_type) === kind);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((r) => r.title?.toLowerCase().includes(s));
    }
    return list;
  }, [rows, folder, kind, search]);

  const deleteRow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gw_media_library')
        .update({ is_deleted: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Media removed.');
      qc.invalidateQueries({ queryKey: ['media-library'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Delete failed.'),
  });

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
    <DashboardPageShell
      title="Media Library"
      subtitle="Audio, video, MusicXML, documents, images — everything that isn't sheet music."
      actions={
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="w-4 h-4 mr-1.5" /> Upload
        </Button>
      }
    >
      {/* Scope + kind tabs + search */}
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-5 space-y-4">
          <div>
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">Scope</div>
            <ScopeFilterChips active={scope} options={options} onChange={setScope} />
          </div>
          {/* Folder chips — only shown once at least one foldered item
              exists (e.g. Studio exports). "Library" = ungrouped/all. */}
          {folders.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFolder(null)}
                className={folder === null
                  ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold bg-primary/10 text-primary'
                  : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors'}
              >
                <FolderOpen className="w-4 h-4" /> Library
              </button>
              {folders.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFolder(f)}
                  className={folder === f
                    ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold bg-primary/10 text-primary'
                    : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors'}
                >
                  <FolderOpen className="w-4 h-4" /> {f}
                </button>
              ))}
              {/* Share the currently-selected folder (owner only — shares
                  grant same-tenant recipients read access to your files
                  in this folder). */}
              {folder !== null && (
                <button
                  type="button"
                  onClick={() => setShareFolder(folder)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors border border-border"
                  title={`Share the "${folder}" folder by email`}
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {KIND_TABS.map((t) => {
                const isActive = t.key === kind;
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setKind(t.key)}
                    className={
                      isActive
                        ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold bg-primary/10 text-primary'
                        : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors'
                    }
                  >
                    <Icon className="w-4 h-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search media…"
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      {isLoading ? (
        <div className="text-center py-16">
          <Loader2 className="w-6 h-6 animate-spin inline text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-12 text-center">
            <FolderOpen className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-base font-semibold">Nothing matches the current filters.</p>
            <p className="text-sm text-muted-foreground mt-1">
              {rows.length === 0
                ? 'Upload your first file to populate the library.'
                : 'Try a different scope or search term.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <MediaCard
              key={r.id}
              row={r}
              courseCode={r.course_id ? courseCodeById[r.course_id] ?? null : null}
              onDelete={() => deleteRow.mutate(r.id)}
              onOpen={() => setPlaying(r)}
            />
          ))}
        </div>
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        userId={user?.id ?? null}
        courses={courses}
        onUploaded={() => {
          qc.invalidateQueries({ queryKey: ['media-library'] });
          setUploadOpen(false);
        }}
      />

      <MediaPlayerDialog
        row={playing}
        onOpenChange={(v) => { if (!v) setPlaying(null); }}
      />

      <ShareFolderDialog
        folder={shareFolder}
        ownerId={user?.id ?? null}
        onOpenChange={(v) => { if (!v) setShareFolder(null); }}
      />
    </DashboardPageShell>
    </DashboardShell>
    </UniversalLayout>
  );
}

/** Share a folder (your files under it) with same-tenant recipients by
 *  email. Grants read-only access via gw_media_folder_shares; recipients
 *  see the files in their Media Library. Cross-tenant sharing is not
 *  supported (tenant isolation) — see the design doc. */
function ShareFolderDialog({
  folder, ownerId, onOpenChange,
}: {
  folder: string | null;
  ownerId: string | null;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const open = folder !== null;

  const { data: shares = [] } = useQuery<Array<{ id: string; invited_email: string; created_at: string }>>({
    queryKey: ['media-folder-shares', folder, ownerId],
    enabled: open && !!ownerId,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_media_folder_shares')
        .select('id, invited_email, created_at')
        .eq('owner_user_id', ownerId!)
        .eq('folder', folder!)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });
      return (data ?? []) as any;
    },
  });

  const add = useMutation({
    mutationFn: async (addr: string) => {
      const clean = addr.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) throw new Error('Enter a valid email.');
      const { error } = await supabase.from('gw_media_folder_shares').insert({
        owner_user_id: ownerId, folder, invited_email: clean, permission: 'view',
      } as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { setEmail(''); toast.success('Folder shared.'); qc.invalidateQueries({ queryKey: ['media-folder-shares'] }); },
    onError: (e: any) => toast.error(e?.message || 'Could not share.'),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gw_media_folder_shares')
        .update({ revoked_at: new Date().toISOString() }).eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success('Access revoked.'); qc.invalidateQueries({ queryKey: ['media-folder-shares'] }); },
    onError: (e: any) => toast.error(e?.message || 'Could not revoke.'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2"><Share2 className="w-4 h-4" /> Share "{folder}" folder</DialogTitle>
          <DialogDescription>
            Give someone in your organization read access to your files in this folder. They'll see them in their own Media Library.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email" value={email} placeholder="person@email.com"
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && email.trim()) add.mutate(email); }}
                className="pl-8"
              />
            </div>
            <Button onClick={() => add.mutate(email)} disabled={!email.trim() || add.isPending}>
              {add.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Share'}
            </Button>
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {shares.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">Not shared with anyone yet.</p>
            ) : shares.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded border border-border text-sm">
                <span className="truncate">{s.invited_email}</span>
                <button onClick={() => revoke.mutate(s.id)} className="text-xs text-rose-500 hover:underline shrink-0">Revoke</button>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Recipients must have a GleeWorld account in your organization. Files are shared read-only; revoke anytime.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MediaCard({ row, courseCode, onDelete, onOpen }: { row: MediaRow; courseCode: string | null; onDelete: () => void; onOpen: () => void }) {
  const k = kindOf(row.file_type);
  const tone = {
    audio:    'bg-rose-50 text-rose-600',
    video:    'bg-purple-50 text-purple-600',
    document: 'bg-emerald-50 text-emerald-600',
    image:    'bg-sky-50 text-sky-600',
    other:    'bg-muted text-muted-foreground',
  }[k];
  const Icon = { audio: Music, video: Video, document: FileText, image: ImageIcon, other: FolderOpen }[k];
  return (
    <Card
      className={`${SOFT_CARD} cursor-pointer transition-colors hover:bg-accent/30`}
      style={SOFT_CARD_STYLE}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold leading-snug truncate">{row.title || 'Untitled'}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground capitalize">{k}</span>
              {courseCode ? (
                <Badge variant="outline" className="text-xs">{courseCode}</Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">Platform</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {row.created_at ? format(parseISO(row.created_at), 'MMM d, yyyy') : ''}
            </div>
          </div>
        </div>
        {/* Only delete remains. Open-in-new-tab affordance removed — the
            card click opens the in-app player instead. */}
        <div className="flex items-center justify-end gap-1 mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// In-app player for any media type. Keeps the whole experience inside the
// Media Library shell — no external links, no "open in another app",
// nothing that interrupts the user's flow. Falls back to a download
// button for binary formats that can't be inlined.
function MediaPlayerDialog({
  row, onOpenChange,
}: {
  row: MediaRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const open = !!row;
  if (!row) return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent />
    </Dialog>
  );
  const k = kindOf(row.file_type);
  const ext = (row.file_path?.split('.').pop() || '').toLowerCase();
  const isPdf = row.file_type?.includes('pdf') || ext === 'pdf';
  const isText = ['txt', 'md', 'csv', 'json', 'xml'].includes(ext);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[96vw] h-[90vh] p-0 flex flex-col overflow-hidden bg-background [&>button]:hidden">
        <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0 gap-3">
          <DialogTitle className="text-base truncate flex-1">
            {row.title || 'Untitled'}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" asChild title="Save a copy">
              <a href={row.file_url} download={row.title || undefined}>
                <Download className="w-4 h-4" />
              </a>
            </Button>
            <Button variant="outline" size="icon" onClick={() => onOpenChange(false)} title="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 bg-muted/30 flex items-center justify-center overflow-auto">
          {k === 'audio' ? (
            <div className="w-full max-w-md p-6 flex flex-col items-center gap-4">
              <Music className="w-16 h-16 text-rose-500" />
              <div className="text-center text-sm font-semibold">{row.title}</div>
              <audio controls autoPlay src={row.file_url} className="w-full" />
            </div>
          ) : k === 'video' ? (
            <video controls autoPlay src={row.file_url} className="max-w-full max-h-full bg-black" />
          ) : k === 'image' ? (
            <img src={row.file_url} alt={row.title} className="max-w-full max-h-full object-contain" />
          ) : isPdf || isText ? (
            <iframe
              src={row.file_url}
              title={row.title}
              className="w-full h-full border-0 bg-white"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <FileText className="w-12 h-12 text-muted-foreground" />
              <div className="text-sm">
                <span className="font-semibold">{row.title}</span>
                <div className="text-xs text-muted-foreground mt-1">
                  Preview isn't available for this file type. Use the download button above to save a copy.
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UploadDialog({
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
  const [destination, setDestination] = useState<string>('platform');
  const [submitting, setSubmitting] = useState(false);

  async function handleUpload() {
    if (!file || !userId) return;
    setSubmitting(true);
    try {
      const path = `media/${userId}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('media-library')
        .upload(path, file, { contentType: file.type });
      if (uploadErr) throw uploadErr;
      const { data: pub } = supabase.storage.from('media-library').getPublicUrl(path);

      const { error: insertErr } = await supabase.from('gw_media_library').insert({
        title: title || file.name,
        file_url: pub.publicUrl,
        file_path: path,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
        category: 'general',
        is_public: false,
        is_featured: false,
        is_deleted: false,
        course_id: destination === 'platform' ? null : destination,
        uploaded_by: userId,
        download_count: 0,
        view_count: 0,
      });
      if (insertErr) throw insertErr;

      toast.success('Uploaded.');
      setFile(null); setTitle(''); setDestination('platform');
      onUploaded();
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload to Media Library</DialogTitle>
          <DialogDescription>
            Pick a file, give it a title, choose where it belongs.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm">File</Label>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="cursor-pointer"
            />
          </div>
          <div>
            <Label className="text-sm">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={file?.name ?? 'Optional — defaults to filename'}
            />
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
          <Button onClick={handleUpload} disabled={!file || submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
