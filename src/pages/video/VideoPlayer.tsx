// GleeWorld Video player — single-video page at /video/:id.
//
// Phase 1: HTML5 <video> playing the source MP4 via a signed URL.
// Phase 2 will swap to hls.js when an hls_path is set.

import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, AlertCircle, Trash2, Save } from 'lucide-react';
import { useVideo, usePlaybackUrl, useDeleteVideo } from '@/hooks/useStudioVideo';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function VideoPlayer() {
  const { id } = useParams<{ id: string }>();
  const video = useVideo(id ?? null);
  const url = usePlaybackUrl(video.data ?? null);
  const del = useDeleteVideo();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  if (video.isLoading) return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading video…
    </div>
  );
  if (video.error || !video.data) return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-sm text-destructive p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <div>Could not load video.</div>
      </div>
    </div>
  );

  const v = video.data;
  const beginEdit = () => {
    setTitle(v.title);
    setDescription(v.description ?? '');
    setEditing(true);
  };

  const save = async () => {
    const { error } = await supabase
      .from('gw_studio_videos')
      .update({ title: title.trim() || v.title, description: description.trim() || null })
      .eq('id', v.id);
    if (error) {
      toast.error('Could not save', { description: error.message });
      return;
    }
    toast.success('Saved');
    setEditing(false);
    video.refetch();
  };

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-4">
      <div>
        <Link to="/video" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> All videos
        </Link>
      </div>

      <Card className="overflow-hidden">
        <div className="aspect-video bg-black flex items-center justify-center">
          {v.status !== 'ready' ? (
            <div className="text-center text-sm text-white/70 space-y-2 p-6">
              <Loader2 className="w-6 h-6 mx-auto animate-spin" />
              <div>Video is {v.status}…</div>
              {v.error_message && <div className="text-rose-300 text-xs">{v.error_message}</div>}
            </div>
          ) : url.isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          ) : url.data ? (
            <video
              src={url.data} controls playsInline
              className="w-full h-full"
              preload="metadata"
            />
          ) : (
            <div className="text-sm text-rose-300">Could not get playback URL.</div>
          )}
        </div>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-3">
          {!editing ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-semibold tracking-tight truncate">{v.title}</h1>
                  {v.description && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{v.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" onClick={beginEdit}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={async () => {
                    if (!confirm(`Delete "${v.title}"?`)) return;
                    try { await del.mutateAsync(v.id); toast.success('Deleted'); navigate('/video'); }
                    catch (e) { toast.error('Could not delete', { description: e instanceof Error ? e.message : String(e) }); }
                  }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-x-2">
                <span>Status: {v.status}</span>
                {v.duration_seconds !== null && <span>· {Math.round(v.duration_seconds)}s</span>}
                {v.size_bytes !== null && <span>· {(v.size_bytes / (1024 * 1024)).toFixed(1)} MB</span>}
                {v.mime && <span>· {v.mime}</span>}
              </div>
            </>
          ) : (
            <>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={3} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                <Button onClick={save}><Save className="w-3.5 h-3.5 mr-1" /> Save</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
