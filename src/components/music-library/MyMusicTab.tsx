// "My Music" — the user's personal library (uploads now; CPDL saves and
// purchases land here in later phases). User-scoped, follows the person
// across tenants. Spec: docs/superpowers/specs/2026-07-12-personal-music-library-design.md
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Music, Plus, Trash2, FileMusic, ExternalLink, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { usePersonalScores, type PersonalScore } from '@/hooks/usePersonalScores';
import { getSignedUrl } from '@/utils/storage';
import { PERSONAL_SCORES_BUCKET } from '@/lib/personalLibrary';

const SOURCE_LABEL: Record<PersonalScore['source'], string> = {
  upload: 'Upload',
  cpdl: 'CPDL',
  purchase: 'Composer Store',
};

type SortKey = 'recent' | 'oldest' | 'title-asc' | 'title-desc' | 'composer-asc' | 'source';

export function MyMusicTab() {
  const { scores, isLoading, uploadScore, removeScore } = usePersonalScores();
  const [adding, setAdding] = useState(false);
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  const [viewingTitle, setViewingTitle] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('recent');

  // Filter + sort into a derived list. Case-insensitive match against title,
  // composer, and voicing so a user typing "SATB" or "brahms" both work.
  // Empty query short-circuits — no need to run toLowerCase on every row.
  const visibleScores = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? scores.filter((s) =>
          (s.title || '').toLowerCase().includes(q)
          || (s.composer || '').toLowerCase().includes(q)
          || (s.voicing || '').toLowerCase().includes(q))
      : scores;
    // Sort a shallow copy — the source array is a react-query cache, mutating
    // it would break equality checks downstream.
    const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
    const sorted = [...filtered];
    switch (sortKey) {
      case 'title-asc':
        sorted.sort((a, b) => collator.compare(a.title || '', b.title || ''));
        break;
      case 'title-desc':
        sorted.sort((a, b) => collator.compare(b.title || '', a.title || ''));
        break;
      case 'composer-asc':
        sorted.sort((a, b) => collator.compare(a.composer || '', b.composer || ''));
        break;
      case 'source':
        sorted.sort((a, b) => a.source.localeCompare(b.source) || collator.compare(a.title, b.title));
        break;
      case 'oldest':
        sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
        break;
      case 'recent':
      default:
        sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return sorted;
  }, [scores, query, sortKey]);

  const openScore = async (s: PersonalScore) => {
    if (openingId) return; // one at a time — stacking clicks stacked requests
    setOpeningId(s.id);
    try {
      // waitForReady=false: that retry loop exists to ride out the post-upload
      // flatten window. Here the object has existed for a while, so a failure
      // is a real failure — retrying just burned 30 silent seconds.
      const url = await getSignedUrl(PERSONAL_SCORES_BUCKET, s.storage_path, 3600, false);
      if (!url) {
        toast.error(`Could not open "${s.title}". The file may be missing.`);
        return;
      }
      setViewingTitle(s.title);
      setViewingUrl(url);
    } finally {
      setOpeningId(null);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-8">Loading your music…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Your personal library — it follows you across every group you sing with.
        </p>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add a PDF
        </Button>
      </div>

      {scores.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, composer, or voicing…"
              className="pl-9"
              aria-label="Search My Music"
            />
          </div>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="sm:w-56" aria-label="Sort My Music">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="title-asc">Title A → Z</SelectItem>
              <SelectItem value="title-desc">Title Z → A</SelectItem>
              <SelectItem value="composer-asc">Composer A → Z</SelectItem>
              <SelectItem value="source">Source</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {scores.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center bg-muted/30">
          <Music className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
          <p className="text-sm font-medium">No music yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add a PDF, save a public-domain score, or buy one from a publisher.
          </p>
        </div>
      ) : visibleScores.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center bg-muted/30">
          <Search className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
          <p className="text-sm font-medium">No matches for "{query}"</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try a shorter search, or clear it to see everything.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleScores.map((s) => (
            <li
              key={s.id}
              className="group relative rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md focus-within:border-primary/50"
            >
              {/* Whole card opens the PDF. The trailing icon is the affordance —
                  without it the card reads as an inert list row, since there is
                  no thumbnail and the source badge looks like a status. */}
              <button
                type="button"
                className="block w-full text-left cursor-pointer disabled:cursor-wait"
                onClick={() => openScore(s)}
                disabled={openingId === s.id}
                aria-label={`Open ${s.title}`}
              >
                <div className="flex items-center gap-2">
                  {openingId === s.id
                    ? <Loader2 className="w-4 h-4 text-primary shrink-0 animate-spin" />
                    : <FileMusic className="w-4 h-4 text-primary shrink-0" />}
                  <span className="text-sm font-semibold leading-tight truncate">{s.title}</span>
                </div>
                {s.composer && (
                  <div className="text-xs text-muted-foreground truncate mt-1">{s.composer}</div>
                )}
                <div className="mt-2 flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-xs">{SOURCE_LABEL[s.source]}</Badge>
                  {s.voicing && <Badge variant="outline" className="text-xs">{s.voicing}</Badge>}
                  <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                    {openingId === s.id ? 'Opening…' : 'Open'}
                    <ExternalLink className="w-4 h-4" />
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm(`Remove "${s.title}" from My Music?`)) return;
                  try { await removeScore(s); toast.success('Removed'); }
                  catch (e) { toast.error(e instanceof Error ? e.message : 'Remove failed'); }
                }}
                className="absolute top-3 right-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                aria-label={`Remove ${s.title}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <UploadDialog
        open={adding}
        onClose={() => setAdding(false)}
        onUpload={async (file, meta) => {
          await uploadScore(file, meta);
          toast.success(`"${meta.title}" added to My Music`);
        }}
      />

      {/* Phase 1 viewer: plain PDF (annotation tables FK to gw_sheet_music). */}
      <Dialog open={!!viewingUrl} onOpenChange={(o) => !o && setViewingUrl(null)}>
        <DialogContent className="max-w-5xl h-[85vh] p-0 flex flex-col">
          <DialogHeader className="px-4 pt-3 pb-2 shrink-0">
            <DialogTitle className="text-sm">{viewingTitle}</DialogTitle>
          </DialogHeader>
          {viewingUrl && (
            <iframe title={viewingTitle} src={viewingUrl} className="flex-1 w-full border-0 rounded-b-xl" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UploadDialog({ open, onClose, onUpload }: {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, meta: { title: string; composer?: string; voicing?: string }) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [voicing, setVoicing] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => { setFile(null); setTitle(''); setComposer(''); setVoicing(''); };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a PDF to My Music</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="score-file">PDF file</Label>
            <Input
              id="score-file" type="file" accept="application/pdf" className="mt-1"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !title) setTitle(f.name.replace(/\.pdf$/i, ''));
              }}
            />
          </div>
          <div>
            <Label htmlFor="score-title">Title</Label>
            <Input id="score-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="score-composer">Composer</Label>
              <Input id="score-composer" value={composer} onChange={(e) => setComposer(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="score-voicing">Voicing</Label>
              <Input id="score-voicing" value={voicing} onChange={(e) => setVoicing(e.target.value)} placeholder="SATB" className="mt-1" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={busy}>Cancel</Button>
          <Button
            disabled={!file || !title.trim() || busy}
            onClick={async () => {
              if (!file) return;
              setBusy(true);
              try {
                await onUpload(file, { title, composer: composer || undefined, voicing: voicing || undefined });
                reset(); onClose();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Upload failed');
              } finally { setBusy(false); }
            }}
          >
            {busy ? 'Adding…' : 'Add to My Music'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
