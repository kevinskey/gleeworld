import React, { useEffect, useRef, useState } from 'react';
import { Plus, X, Loader2, Search, Upload, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseYouTubeInput } from '@/lib/youtubeId';
import { parseVideoSource, providerLabel, type ParsedVideoSource } from '@/lib/videoSources';

interface AddYouTubeVideoFormProps {
  // Called after a successful insert so the caller can refresh its grid.
  onAdded: () => void;
}

interface SearchHit {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  description: string;
  thumbnail: string;
  url: string;
}

type Mode = 'search' | 'url' | 'upload';

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB — Supabase edge default; large enough for member submissions.
const ACCEPT_VIDEO = 'video/*,.mkv,.avi,.wmv,.flv';

// Add-a-video control for /youtube. Was YouTube-only; now accepts any
// major streaming URL (Vimeo, TikTok, Twitch, etc.) and direct file
// uploads to the shared media-library bucket. YouTube search remains
// the default since the /youtube page is still primarily YT-shaped
// (thumbnails, embeds, channel metaphor).
//
// Gating who SEES this form is the caller's job (YouTubeChannel checks
// useUserRole().isAdmin) — this component assumes it should render. Note
// youtube_videos RLS is WITH CHECK (true) for any authenticated user,
// so the real access control here is UI-only; a signed-in non-admin who
// reaches this component via devtools could still insert. Tightening
// that is an RLS change, not a UI one.
export const AddYouTubeVideoForm: React.FC<AddYouTubeVideoFormProps> = ({ onAdded }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('search');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Search state — mirrors AccompanimentPicker's 300ms debounce + edge fn
  // call so quota (~100 units per search of the 10k/day free tier) isn't
  // burned per keystroke.
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);

  const reset = () => {
    setUrl('');
    setTitle('');
    setError(null);
    setQuery('');
    setHits([]);
    setSearchErr(null);
    setUploadProgress(null);
  };

  const handleCancel = () => {
    setOpen(false);
    reset();
  };

  useEffect(() => {
    if (!open || mode !== 'search') return;
    const term = query.trim();
    if (!term) { setHits([]); setSearchErr(null); return; }
    let cancelled = false;
    setSearching(true);
    setSearchErr(null);
    const handle = window.setTimeout(async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke('youtube-search', {
          body: { q: term, maxResults: 10 },
        });
        if (fnErr) throw fnErr;
        const body = data as { hits?: SearchHit[]; error?: string };
        if (body?.error) throw new Error(body.error);
        if (!cancelled) setHits(body?.hits ?? []);
      } catch (e) {
        if (!cancelled) setSearchErr(e instanceof Error ? e.message : 'YouTube search failed.');
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => { cancelled = true; window.clearTimeout(handle); };
  }, [open, mode, query]);

  // Insert a video row. Accepts either a legacy YT-shaped payload
  // (videoId + videoTitle) or a fully parsed source (any provider).
  // Kept unified so both the search-result click and the URL/upload
  // flows go through the same code path.
  const insertRow = async (source: ParsedVideoSource, providedTitle: string) => {
    setSubmitting(true);
    try {
      const { data, error: insertError } = await supabase
        .from('youtube_videos')
        .insert({
          video_id: source.videoId,
          // NOT a channels row — see clientActions.ts add_video for why null
          // is correct here and 'manual-upload' (a string) is not: this
          // column is a UUID FK and a non-UUID string fails every insert.
          channel_id: null as unknown as string,
          title: providedTitle || (source.provider === 'youtube' ? source.videoId : `${providerLabel(source.provider)} video`),
          thumbnail_url: source.thumbnailUrl ?? '',
          video_url: source.canonicalUrl,
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

  const addYouTube = async (videoId: string, videoTitle: string) => {
    await insertRow(
      {
        provider: 'youtube',
        videoId,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      },
      videoTitle,
    );
  };

  // Real title via YouTube's oEmbed endpoint — CORS-enabled, keyless, and
  // not billed against the Data API quota. Returns '' on any failure so
  // insertRow's videoId fallback still applies (offline, deleted/region-
  // blocked video, CSP misconfig). www.youtube.com must stay in the
  // index.html connect-src for this to work.
  const fetchYouTubeTitle = async (videoId: string): Promise<string> => {
    try {
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`,
        { signal: ctrl.signal },
      );
      window.clearTimeout(timer);
      if (!res.ok) return '';
      const body = (await res.json()) as { title?: unknown };
      return typeof body.title === 'string' ? body.title.trim() : '';
    } catch {
      return '';
    }
  };

  const handleUrlSubmit = async () => {
    setError(null);
    const trimmed = url.trim();
    // Fast path: YouTube 11-char id or any YouTube URL shape.
    const ytId = parseYouTubeInput(trimmed);
    if (ytId) {
      setSubmitting(true);
      const resolvedTitle = title.trim() || (await fetchYouTubeTitle(ytId));
      await addYouTube(ytId, resolvedTitle);
      return;
    }
    const source = parseVideoSource(trimmed);
    if (!source) {
      setError('Paste a YouTube, Vimeo, Dailymotion, Twitch, Facebook, Instagram, TikTok, Loom, Wistia, SoundCloud URL, or a direct link to a video file (.mp4, .mov, .webm, .m3u8).');
      return;
    }
    await insertRow(source, title.trim());
  };

  const handleFileSelected = async (file: File) => {
    setError(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`File is too large. Max upload is ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`);
      return;
    }
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData?.user?.id;
    if (!uid) {
      setError('You must be signed in to upload.');
      return;
    }
    setSubmitting(true);
    setUploadProgress(0);
    try {
      // Path shape mirrors other uploads: bucket + user-scoped folder +
      // timestamped filename to avoid collisions on same-name re-uploads.
      const safeName = file.name.replace(/[^A-Za-z0-9.\-_]/g, '_');
      const path = `videos/${uid}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from('media-library')
        .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const { data: pub } = supabase.storage.from('media-library').getPublicUrl(path);
      setUploadProgress(100);
      await insertRow(
        {
          provider: 'direct',
          videoId: path,
          embedUrl: pub.publicUrl,
          canonicalUrl: pub.publicUrl,
          thumbnailUrl: null,
        },
        title.trim() || file.name.replace(/\.[^.]+$/, ''),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
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
        <h3 className="text-sm font-medium text-foreground">Add a video</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancel} aria-label="Cancel">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex rounded-md border border-border bg-muted/40 p-0.5 text-xs">
        {([
          { key: 'search' as const, label: 'Search YouTube', icon: Search },
          { key: 'url' as const, label: 'Paste URL', icon: LinkIcon },
          { key: 'upload' as const, label: 'Upload file', icon: Upload },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setMode(key); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              mode === key ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {mode === 'search' && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Song, artist, or channel…"
              className="pl-8 text-xs"
              aria-label="Search YouTube"
              autoFocus
            />
          </div>
          {searchErr && <p className="text-xs text-destructive">{searchErr}</p>}
          <div className="max-h-72 overflow-y-auto -mx-1">
            {searching && hits.length === 0 && (
              <div className="flex items-center gap-2 px-3 py-6 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching…
              </div>
            )}
            {!searching && !searchErr && query.trim() && hits.length === 0 && (
              <div className="px-3 py-6 text-xs text-muted-foreground">No matches.</div>
            )}
            <ul className="space-y-1">
              {hits.map((hit) => (
                <li key={hit.videoId}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => addYouTube(hit.videoId, hit.title)}
                    className="w-full flex items-start gap-3 px-2 py-2 rounded-md hover:bg-muted text-left transition-colors disabled:opacity-60"
                  >
                    <img
                      src={hit.thumbnail}
                      alt=""
                      className="w-24 h-14 object-cover rounded shrink-0 bg-muted"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium line-clamp-2">{hit.title}</div>
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">{hit.channelTitle}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Click a result to add it. Uses the shared YouTube API quota (~100 searches/day platform-wide).
          </p>
        </div>
      )}

      {mode === 'url' && (
        <div className="space-y-3">
          <div>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="YouTube, Vimeo, TikTok, Twitch, .mp4 link…"
              className="text-xs"
              aria-label="Video URL"
              autoFocus
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
            <Button size="sm" className="text-xs gap-2" onClick={handleUrlSubmit} disabled={submitting || !url.trim()}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Add video
            </Button>
          </div>
        </div>
      )}

      {mode === 'upload' && (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_VIDEO}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelected(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={submitting}
            className="w-full flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/30 hover:bg-muted transition-colors py-8 text-xs text-muted-foreground disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Uploading{uploadProgress !== null ? ` (${uploadProgress}%)` : '…'}</span>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6" />
                <span>Click to choose a video file</span>
                <span className="text-[11px]">MP4, MOV, WebM, MKV, AVI up to 500 MB</span>
              </>
            )}
          </button>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional; defaults to filename)"
            className="text-xs"
            aria-label="Video title (optional)"
            disabled={submitting}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" className="text-xs" onClick={handleCancel} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddYouTubeVideoForm;
