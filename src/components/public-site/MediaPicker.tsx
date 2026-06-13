import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, Music, Video, Image as ImageIcon, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MediaItem {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Filter files by MIME prefix. */
  accept: 'audio' | 'video' | 'image';
  onPick: (item: MediaItem) => void;
}

const PREFIX_LABEL = { audio: 'Audio', video: 'Video', image: 'Photo' };
const ACCEPT_ATTR = { audio: 'audio/*', video: 'video/*', image: 'image/*' };
const MAX_BYTES = { audio: 100 * 1024 * 1024, video: 500 * 1024 * 1024, image: 20 * 1024 * 1024 };
const ACCEPT_ICON = { audio: Music, video: Video, image: ImageIcon };

export function MediaPicker({ open, onOpenChange, accept, onPick }: Props) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');

  // Refresh library when the dialog opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setItems(null);
    (async () => {
      const { data, error } = await supabase
        .from('gw_media_library')
        .select('id, title, file_url, file_type')
        .like('file_type', `${accept}/%`)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(100);
      if (cancelled) return;
      if (error) {
        toast.error(`Couldn't load library: ${error.message}`);
        setItems([]);
        return;
      }
      setItems((data ?? []) as MediaItem[]);
    })();
    return () => { cancelled = true; };
  }, [open, accept]);

  const handleUpload = async (file: File) => {
    if (file.size > MAX_BYTES[accept]) {
      toast.error(`File too large. Max ${Math.round(MAX_BYTES[accept] / 1024 / 1024)} MB.`);
      return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const path = `${accept}-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase
      .storage
      .from('media-library')
      .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
    if (uploadErr) {
      toast.error(`Upload failed: ${uploadErr.message}`);
      setUploading(false);
      return;
    }
    const publicUrl = supabase.storage.from('media-library').getPublicUrl(path).data.publicUrl;
    const title = file.name.replace(/\.[^.]+$/, '');
    const { data: row, error: insertErr } = await supabase
      .from('gw_media_library')
      .insert({
        title,
        file_url: publicUrl,
        file_path: path,
        file_type: file.type || `${accept}/*`,
        file_size: file.size,
        bucket_id: 'media-library',
        is_public: true,
        category: accept,
      })
      .select('id, title, file_url, file_type')
      .single();
    setUploading(false);
    if (insertErr || !row) {
      toast.error(`Couldn't index file: ${insertErr?.message ?? 'no row returned'}`);
      return;
    }
    toast.success('Uploaded to media library');
    onPick(row as MediaItem);
    onOpenChange(false);
  };

  const filtered = items?.filter((i) =>
    query.trim() === '' ? true : i.title.toLowerCase().includes(query.trim().toLowerCase()),
  ) ?? null;

  const Icon = ACCEPT_ICON[accept];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pick {PREFIX_LABEL[accept].toLowerCase()} from library</DialogTitle>
          <DialogDescription>
            Choose an existing file, or upload a new one — it'll be saved to your media library and available to reuse.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${PREFIX_LABEL[accept].toLowerCase()}…`}
            className="h-9"
          />
          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium cursor-pointer transition-colors whitespace-nowrap">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Uploading…' : 'Upload'}
            <input
              type="file"
              accept={ACCEPT_ATTR[accept]}
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) handleUpload(f);
              }}
            />
          </label>
        </div>

        <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200 divide-y">
          {filtered === null ? (
            <div className="p-6 flex items-center justify-center text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              No {PREFIX_LABEL[accept].toLowerCase()} files yet. Upload one to get started.
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { onPick(item); onOpenChange(false); }}
                className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors"
              >
                <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm flex-1 truncate">{item.title}</span>
                <Check className="w-4 h-4 text-sky-600 opacity-0 group-hover:opacity-100" />
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
