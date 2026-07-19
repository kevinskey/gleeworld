// GleeWorld Video library — list + upload. /video entry point.

import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Film, Upload, Trash2, Play, Clock, AlertCircle, Cog,
} from 'lucide-react';
import {
  useMyVideos, useUploadVideo, useDeleteVideo, useVideoStatusPoll, useVideoOwner,
  useThumbnailUrl,
} from '@/hooks/useStudioVideo';
import { toast } from 'sonner';
import { PageTitle } from '@/components/dashboard/DashboardPageShell';

function formatBytes(n: number | null): string {
  if (!n) return '—';
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
function formatDuration(s: number | null): string {
  if (s === null) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}
function formatDate(d: string): string {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function VideoLibrary() {
  const videos = useMyVideos();
  const owner = useVideoOwner();
  const upload = useUploadVideo();
  const del = useDeleteVideo();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);

  // Poll while anything is uploading/processing so the user sees status
  // updates without manual refresh.
  const anyInFlight = (videos.data ?? []).some((v) => v.status === 'uploading' || v.status === 'processing');
  useVideoStatusPoll(anyInFlight);

  const onPick = async (file: File) => {
    try {
      const id = await upload.mutateAsync({ file });
      toast.success('Uploaded');
      navigate(`/video/${id}`);
    } catch (e) {
      toast.error('Upload failed', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto space-y-5">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <PageTitle icon={Film}>Video</PageTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Rehearsal recordings, lesson videos, performance archives.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInput} type="file" accept="video/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); }}
          />
          <Button onClick={() => fileInput.current?.click()} disabled={!owner.data || upload.isPending}>
            {upload.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
            {upload.isPending && upload.progress
              ? `${upload.progress.phase === 'uploading' ? 'Uploading' : upload.progress.phase}…`
              : 'Upload video'}
          </Button>
        </div>
      </header>

      {upload.isPending && upload.progress && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="capitalize">{upload.progress.phase}</span>
              <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${upload.progress.pct}%` }} />
              </div>
              <span className="text-xs tabular-nums w-12 text-right">{Math.round(upload.progress.pct)}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {videos.isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading videos…
        </div>
      ) : (videos.data ?? []).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground space-y-3">
            <Film className="w-8 h-8 mx-auto opacity-40" />
            <p>No videos yet.</p>
            <Button size="sm" onClick={() => fileInput.current?.click()} disabled={!owner.data}>
              <Upload className="w-3.5 h-3.5 mr-1" /> Upload your first video
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {videos.data!.map((v) => (
            <li key={v.id}>
              <Card className="hover:shadow-md transition-shadow overflow-hidden">
                <Link to={`/video/${v.id}`} className="block">
                  <Thumbnail video={v} />
                </Link>
                <CardContent className="p-3 space-y-2">
                  <Link to={`/video/${v.id}`}>
                    <div className="font-semibold text-sm leading-tight truncate">{v.title}</div>
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {v.duration_seconds !== null && (
                      <span className="inline-flex items-center gap-1"><Clock className="w-4 h-4" /> {formatDuration(v.duration_seconds)}</span>
                    )}
                    <span>· {formatBytes(v.size_bytes)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">{formatDate(v.created_at)}</div>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                      onClick={async () => {
                        if (!confirm(`Delete "${v.title}"?`)) return;
                        try { await del.mutateAsync(v.id); toast.success('Deleted'); }
                        catch (e) { toast.error('Could not delete', { description: e instanceof Error ? e.message : String(e) }); }
                      }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Thumbnail({ video }: { video: { id: string; thumb_path: string | null; status: string } }) {
  const url = useThumbnailUrl(video);
  return (
    <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/30 flex items-center justify-center relative">
      {url.data ? (
        <img src={url.data} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <Play className="w-10 h-10 text-primary/60" />
      )}
      {video.status !== 'ready' && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <StatusBadge status={video.status} />
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'uploading') return (
    <Badge variant="outline" className="bg-card"><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Uploading</Badge>
  );
  if (status === 'processing') return (
    <Badge variant="outline" className="bg-card"><Cog className="w-4 h-4 mr-1" /> Processing</Badge>
  );
  if (status === 'error') return (
    <Badge variant="outline" className="bg-card text-rose-700 border-rose-200"><AlertCircle className="w-4 h-4 mr-1" /> Error</Badge>
  );
  return null;
}
