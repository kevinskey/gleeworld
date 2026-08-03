// Multi-file upload for My Music — drag-and-drop or pick several PDFs,
// tweak each title (default: cleaned filename), then upload sequentially
// through usePersonalScores.uploadScore (which already rolls back the
// storage object when the row insert fails). Partial failures keep the
// dialog open with per-file error rows so nothing is silently lost.
// Pattern mirrors librarian/BulkPDFUploader.tsx.
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertCircle, CheckCircle2, FileMusic, FolderUp, Loader2, Upload, X,
} from 'lucide-react';
import { toast } from 'sonner';

interface UploadItem {
  id: string;
  file: File;
  title: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

const cleanTitle = (filename: string): string =>
  filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();

export function MyMusicUploadDialog({ open, onClose, onUpload }: {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, meta: { title: string; composer?: string; voicing?: string }) => Promise<void>;
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [composer, setComposer] = useState('');
  const [voicing, setVoicing] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const addFiles = useCallback((files: FileList | File[]) => {
    const pdfs = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
    );
    if (pdfs.length === 0) {
      toast.error('PDF files only.');
      return;
    }
    setItems((prev) => [
      ...prev,
      ...pdfs.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        title: cleanTitle(file.name),
        status: 'pending' as const,
      })),
    ]);
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const reset = () => {
    setItems([]); setComposer(''); setVoicing('');
  };

  const close = () => { reset(); onClose(); };

  const handleUploadAll = async () => {
    const pending = items.filter((i) => i.status === 'pending' || i.status === 'error');
    if (pending.length === 0) return;
    setUploading(true);
    let ok = 0;
    let failed = 0;
    // Sequential on purpose: parallel uploads hammer the storage proxy and
    // make per-file failure attribution murky.
    for (const item of pending) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading', errorMessage: undefined } : i)));
      try {
        await onUpload(item.file, {
          title: item.title.trim() || cleanTitle(item.file.name),
          composer: composer.trim() || undefined,
          voicing: voicing.trim() || undefined,
        });
        ok += 1;
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'success' } : i)));
      } catch (e) {
        failed += 1;
        setItems((prev) => prev.map((i) => (i.id === item.id
          ? { ...i, status: 'error', errorMessage: e instanceof Error ? e.message : 'Upload failed' }
          : i)));
      }
    }
    setUploading(false);
    if (failed === 0) {
      toast.success(ok === 1 ? 'Added to My Music' : `${ok} scores added to My Music`);
      close();
    } else {
      // Keep the dialog open: failed rows show their error and stay
      // retryable; successes are already saved.
      toast.error(`${failed} of ${ok + failed} uploads failed — fix and retry below.`);
    }
  };

  const pendingCount = items.filter((i) => i.status === 'pending' || i.status === 'error').length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !uploading) close(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add PDFs to My Music</DialogTitle>
          <DialogDescription>
            Drop one or many PDF scores. Titles come from the filenames — tidy them before uploading.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 -mx-1 px-1">
          {/* Drop zone + picker */}
          <label
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragActive(false);
              if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
            }}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border bg-muted/30 hover:bg-muted/50'
            }`}
          >
            <FolderUp className="w-8 h-8 text-muted-foreground" />
            <span className="text-sm font-medium">Drop PDFs here or tap to choose</span>
            <span className="text-xs text-muted-foreground">You can pick several at once.</span>
            <input
              type="file"
              accept="application/pdf"
              multiple
              className="sr-only"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </label>

          {/* Per-file rows */}
          {items.length > 0 && (
            <ScrollArea className="max-h-56 rounded-lg border">
              <ul className="divide-y">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 px-2 py-2">
                    <span className="shrink-0">
                      {item.status === 'uploading' ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        : item.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        : item.status === 'error' ? <AlertCircle className="w-4 h-4 text-destructive" />
                        : <FileMusic className="w-4 h-4 text-muted-foreground" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <Input
                        value={item.title}
                        onChange={(e) => setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, title: e.target.value } : i)))}
                        disabled={item.status === 'uploading' || item.status === 'success'}
                        className="h-8 text-sm"
                        aria-label={`Title for ${item.file.name}`}
                      />
                      {item.status === 'error' && item.errorMessage && (
                        <p className="text-xs text-destructive mt-1 truncate" title={item.errorMessage}>{item.errorMessage}</p>
                      )}
                    </div>
                    {item.status !== 'uploading' && item.status !== 'success' && (
                      <button
                        type="button"
                        onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                        className="p-1 rounded text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${item.file.name}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}

          {/* Shared metadata — applied to every file in this batch. */}
          {items.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="mm-upload-composer">Composer <span className="text-muted-foreground font-normal">(all files)</span></Label>
                <Input id="mm-upload-composer" value={composer} onChange={(e) => setComposer(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="mm-upload-voicing">Voicing <span className="text-muted-foreground font-normal">(all files)</span></Label>
                <Input id="mm-upload-voicing" value={voicing} onChange={(e) => setVoicing(e.target.value)} placeholder="SATB" className="mt-1" />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 border-t">
          <Button variant="outline" onClick={close} disabled={uploading}>
            {items.some((i) => i.status === 'success') ? 'Done' : 'Cancel'}
          </Button>
          <Button onClick={handleUploadAll} disabled={uploading || pendingCount === 0}>
            {uploading
              ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              : <Upload className="w-4 h-4 mr-1.5" />}
            {uploading
              ? 'Uploading…'
              : pendingCount <= 1
                ? 'Add to My Music'
                : `Add ${pendingCount} to My Music`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
