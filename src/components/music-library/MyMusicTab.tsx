// "My Music" — the user's personal library (uploads now; CPDL saves and
// purchases land here in later phases). User-scoped, follows the person
// across tenants. Spec: docs/superpowers/specs/2026-07-12-personal-music-library-design.md
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Music, Plus, Trash2, FileMusic } from 'lucide-react';
import { toast } from 'sonner';
import { usePersonalScores, type PersonalScore } from '@/hooks/usePersonalScores';
import { getSignedUrl } from '@/utils/storage';
import { PERSONAL_SCORES_BUCKET } from '@/lib/personalLibrary';

const SOURCE_LABEL: Record<PersonalScore['source'], string> = {
  upload: 'Upload',
  cpdl: 'CPDL',
  purchase: 'Lion & Lamb',
};

export function MyMusicTab() {
  const { scores, isLoading, uploadScore, removeScore } = usePersonalScores();
  const [adding, setAdding] = useState(false);
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  const [viewingTitle, setViewingTitle] = useState('');

  const openScore = async (s: PersonalScore) => {
    const url = await getSignedUrl(PERSONAL_SCORES_BUCKET, s.storage_path, 3600, true);
    if (!url) { toast.error('Could not open that score. Try again.'); return; }
    setViewingTitle(s.title);
    setViewingUrl(url);
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

      {scores.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center bg-muted/30">
          <Music className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
          <p className="text-sm font-medium">No music yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add a PDF, save a public-domain score, or buy one from a publisher.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {scores.map((s) => (
            <li key={s.id} className="group relative rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
              <button type="button" className="block w-full text-left" onClick={() => openScore(s)}>
                <div className="flex items-center gap-2">
                  <FileMusic className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-semibold leading-tight truncate">{s.title}</span>
                </div>
                {s.composer && (
                  <div className="text-xs text-muted-foreground truncate mt-1">{s.composer}</div>
                )}
                <div className="mt-2 flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-xs">{SOURCE_LABEL[s.source]}</Badge>
                  {s.voicing && <Badge variant="outline" className="text-xs">{s.voicing}</Badge>}
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
