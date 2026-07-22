// Admin dialog for editing a row in youtube_videos. Fields we expose:
// title, description, category, tags[], is_featured. The DB has more
// columns (view_count, published_at, etc.) but those are either
// synced-from-provider (YouTube API import) or engagement metrics —
// letting an admin type over them would corrupt the source of truth.

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EditVideoRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  is_featured: boolean | null;
}

interface Props {
  open: boolean;
  video: EditVideoRow | null;
  categorySuggestions: string[];
  onClose: () => void;
  onSaved: () => void;
}

export function EditVideoDialog({ open, video, categorySuggestions, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [featured, setFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!video) return;
    setTitle(video.title || '');
    setDescription(video.description || '');
    setCategory(video.category || '');
    setTagsText((video.tags || []).join(', '));
    setFeatured(!!video.is_featured);
  }, [video]);

  const save = async () => {
    if (!video) return;
    setSaving(true);
    try {
      // Normalize tags: split on commas, trim, drop empties, dedupe
      // case-insensitively so "Choir" and "choir" don't both show up.
      const seen = new Set<string>();
      const tags = tagsText
        .split(',')
        .map((t) => t.trim())
        .filter((t) => {
          if (!t) return false;
          const k = t.toLowerCase();
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });

      const { error } = await supabase
        .from('youtube_videos')
        .update({
          title: title.trim() || video.title,
          description: description.trim() || null,
          category: category.trim() || null,
          tags: tags.length > 0 ? tags : null,
          is_featured: featured,
          updated_at: new Date().toISOString(),
        })
        .eq('id', video.id);

      if (error) {
        toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Saved' });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit video</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 min-h-[80px]"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1"
              placeholder="e.g. Rehearsal, Concert, Lecture"
              list="video-category-suggestions"
            />
            <datalist id="video-category-suggestions">
              {categorySuggestions.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Tags (comma-separated)</label>
            <Input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              className="mt-1"
              placeholder="soprano, warm-up, mus-101"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={featured} onCheckedChange={(v) => setFeatured(!!v)} />
            <span>Featured</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
