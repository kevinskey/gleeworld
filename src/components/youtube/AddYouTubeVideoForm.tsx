import React, { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseYouTubeInput } from '@/lib/youtubeId';

interface AddYouTubeVideoFormProps {
  // Called after a successful insert so the caller can refresh its grid.
  onAdded: () => void;
}

// Admin-only "add a video" control for /youtube. Gating who SEES this form
// is the caller's job (YouTubeChannel checks useUserRole().isAdmin) — this
// component assumes it should render. Note youtube_videos RLS is
// WITH CHECK (true) for any authenticated user, so the real access control
// here is UI-only; a signed-in non-admin who reaches this component via
// devtools could still insert. Tightening that is an RLS change, not a UI one.
export const AddYouTubeVideoForm: React.FC<AddYouTubeVideoFormProps> = ({ onAdded }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setUrl('');
    setTitle('');
    setError(null);
  };

  const handleCancel = () => {
    setOpen(false);
    reset();
  };

  const handleSubmit = async () => {
    setError(null);
    const videoId = parseYouTubeInput(url);
    if (!videoId) {
      setError('Paste a full YouTube URL (youtube.com/watch?v=…, youtu.be/…) or an 11-character video ID.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: insertError } = await supabase
        .from('youtube_videos')
        .insert({
          video_id: videoId,
          // NOT a channels row — see clientActions.ts add_video for why null
          // is correct here and 'manual-upload' (a string) is not: this
          // column is a UUID FK and a non-UUID string fails every insert.
          channel_id: null,
          title: title.trim() || videoId,
          thumbnail_url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          video_url: `https://www.youtube.com/watch?v=${videoId}`,
          published_at: new Date().toISOString(),
        })
        .select();

      if (insertError) {
        if (insertError.code === '23505') {
          toast({ title: 'Already added', description: 'That video is already in the library.', variant: 'destructive' });
        } else {
          toast({ title: 'Could not add video', description: insertError.message, variant: 'destructive' });
        }
        return;
      }
      if (!data?.length) {
        toast({ title: 'Could not add video', description: 'No row was returned — check permissions.', variant: 'destructive' });
        return;
      }

      toast({ title: 'Video added', description: 'It will appear in the grid now.' });
      reset();
      setOpen(false);
      onAdded();
    } catch (err) {
      toast({ title: 'Could not add video', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2 text-xs">
        <Plus className="w-4 h-4" />
        Add video
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 max-w-xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Add a YouTube video</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancel} aria-label="Cancel">
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=... or video ID"
          className="text-xs"
          aria-label="YouTube URL or video ID"
        />
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        className="text-xs"
        aria-label="Video title (optional)"
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" className="text-xs" onClick={handleCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button size="sm" className="text-xs gap-2" onClick={handleSubmit} disabled={submitting || !url.trim()}>
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Add video
        </Button>
      </div>
    </div>
  );
};

export default AddYouTubeVideoForm;
