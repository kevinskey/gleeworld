import React, { useEffect, useRef, useState } from 'react';
import { Plus, X, Loader2, Search, Upload, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseYouTubeInput } from '@/lib/youtubeId';
import { parseVideoSource, youTubeSource, type ParsedVideoSource } from '@/lib/videoSources';
import { addVideoToLibrary } from '@/lib/videoLibrary';
import { useYouTubeSearch, type YouTubeHit } from '@/hooks/useYouTubeSearch';

interface AddYouTubeVideoFormProps {
  // Called after a successful insert so the caller can refresh its grid.
  onAdded: () => void;
}

type Mode = 'search' | 'url' | 'upload';

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB — Supabase edge default; large enough for member submissions.
const ACCEPT_VIDEO = 'video/*,.mkv,.avi,.wmv,.flv';

const PASTE_HELP =
  'Paste a YouTube, Vimeo, Dailymotion, Twitch, Facebook, Instagram, TikTok, Loom, Wistia, SoundCloud URL, or a direct link to a video file (.mp4, .mov, .webm, .m3u8).';

// Split a pasted blob into candidate links, preserving order and dropping
// repeats. Whitespace is the only separator: some CDN video URLs legitimately
// contain commas, so a trailing comma from a pasted list is stripped off the
// token instead of being treated as a delimiter.
function tokenizeLinks(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of raw.split(/\s+/)) {
    const token = piece.replace(/[,;]+$/, '').trim();
    if (!token || seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}

// Failure lists go in an inline error, so show a few verbatim and count the
// rest rather than printing 30 URLs into the form.
function summarizeFailures(failed: string[]): string {
  const shown = failed.slice(0, 3).join(', ');
  return failed.length > 3 ? `${shown} … and ${failed.length - 3} more` : shown;
}

// Bounded-parallel map. Used for oEmbed title lookups so pasting 40 links
// doesn't open 40 sockets at once, while still finishing in seconds.
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor;
      cursor += 1;
      out[i] = await fn(items[i]!, i);
    }
  });
  await Promise.all(workers);
  return out;
}

// Add-a-video control for /youtube. Was YouTube-only; now accepts any
// major streaming URL (Vimeo, TikTok, Twitch, etc.) and direct file
// uploads to the shared media-library bucket. YouTube search remains
// the default since the /youtube page is still primarily YT-shaped
// (thumbnails, embeds, channel metaphor).
//
// The Paste URLs tab takes a whole list, not just one link: paste 30 links
// and each is parsed, titled, and inserted, with duplicates and unreadable
// lines reported back rather than aborting the batch.
//
// Gating who SEES this form is the caller's job (YouTubeChannel checks
// useUserRole().isAdmin) — this component assumes it should render. The UI
// gate is belt-and-braces: migration 20260216024654 dropped the old
// permissive policies, so youtube_videos writes are admin-only at the RLS
// level too. A non-admin who reaches this via devtools gets an empty row
// set back, which addVideoToLibrary reports as { outcome: 'failed' }.
export const AddYouTubeVideoForm: React.FC<AddYouTubeVideoFormProps> = ({ onAdded }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('search');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  // Bulk-paste progress: how many of the pasted links have been processed.
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const {
    hits,
    searching,
    error: searchErr,
    term: searchedTerm,
    search: runSearch,
    clear: clearSearch,
  } = useYouTubeSearch(10);

  // True from the keystroke until the 300ms debounce actually fires a search
  // for what is now in the box.
  //
  // Before useYouTubeSearch was extracted, the debounce effect called
  // setSearching(true) / setSearchErr(null) SYNCHRONOUSLY on every keystroke.
  // A hook can only flip those when the request starts, 300ms later, which
  // left two wrong frames: the empty state answered "No matches." for the
  // whole debounce window on the first keystroke of every search, and the
  // PREVIOUS query's error text sat on screen over the new query. Deriving
  // "the box has moved on from what was last searched" restores both — the
  // hook keeps its single source of truth about requests, and the dialog
  // owns the fact that it debounces.
  const trimmedQuery = query.trim();
  const debouncePending = trimmedQuery !== '' && trimmedQuery !== searchedTerm;

  const reset = () => {
    setUrl('');
    setTitle('');
    setError(null);
    setQuery('');
    clearSearch();
    setUploadProgress(null);
    setProgress(null);
  };

  const handleCancel = () => {
    setOpen(false);
    reset();
  };

  // 300ms debounce is safe here because this dialog is admin-only. The
  // /video header bar, which every member can reach, submits explicitly
  // instead — see the QUOTA note in useYouTubeSearch.
  useEffect(() => {
    if (!open || mode !== 'search') return;
    const term = query.trim();
    if (!term) { clearSearch(); return; }
    const handle = window.setTimeout(() => { void runSearch(term); }, 300);
    return () => window.clearTimeout(handle);
  }, [open, mode, query, runSearch, clearSearch]);

  const insertRow = async (source: ParsedVideoSource, providedTitle: string) => {
    setSubmitting(true);
    try {
      const result = await addVideoToLibrary(source, providedTitle);
      if (result.outcome === 'duplicate') {
        toast({ title: 'Already added', description: 'That video is already in the library.', variant: 'destructive' });
        return;
      }
      if (result.outcome === 'failed') {
        toast({ title: 'Could not add video', description: result.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Video added', description: 'It will appear in the grid now.' });
      reset();
      setOpen(false);
      onAdded();
    } finally {
      setSubmitting(false);
    }
  };

  const addYouTube = async (videoId: string, videoTitle: string) => {
    await insertRow(youTubeSource(videoId), videoTitle);
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

  // Turn one pasted token into something insertable. YouTube links get their
  // real title from oEmbed here; other providers fall back to
  // addVideoToLibrary's "<Provider> video" default since there's no keyless
  // title endpoint.
  const resolveToken = async (
    token: string,
  ): Promise<{ source: ParsedVideoSource; title: string } | { badToken: string }> => {
    const ytId = parseYouTubeInput(token);
    if (ytId) {
      return {
        source: youTubeSource(ytId),
        title: await fetchYouTubeTitle(ytId),
      };
    }
    const source = parseVideoSource(token);
    if (!source) return { badToken: token };
    return { source, title: '' };
  };

  // Many links at once. Titles resolve in parallel because each oEmbed call
  // can burn its full 4s timeout, but the inserts run sequentially in pasted
  // order so published_at — and therefore the grid's "recent" sort — follows
  // the order they were listed. The per-link title box is ignored here; with
  // a batch there's no sane way to apply one typed title.
  const addManyLinks = async (tokens: string[]) => {
    setSubmitting(true);
    setError(null);
    setProgress({ done: 0, total: tokens.length });
    try {
      const resolved = await mapWithConcurrency(tokens, 4, resolveToken);
      let added = 0;
      let duplicate = 0;
      const failed: string[] = [];

      for (let i = 0; i < resolved.length; i += 1) {
        const entry = resolved[i]!;
        if ('badToken' in entry) {
          failed.push(entry.badToken);
        } else {
          const result = await addVideoToLibrary(entry.source, entry.title);
          if (result.outcome === 'added') added += 1;
          else if (result.outcome === 'duplicate') duplicate += 1;
          else failed.push(tokens[i]!);
        }
        setProgress({ done: i + 1, total: tokens.length });
      }

      if (added > 0) onAdded();

      if (added === 0 && duplicate === 0) {
        // Nothing landed at all — most likely the paste wasn't links.
        setError(`${PASTE_HELP}\n\nCouldn't use: ${summarizeFailures(failed)}`);
        return;
      }

      const parts = [`${added} added`];
      if (duplicate > 0) parts.push(`${duplicate} already in the library`);
      if (failed.length > 0) parts.push(`${failed.length} couldn't be read`);
      toast({ title: `Added ${added} of ${tokens.length} links`, description: parts.join(' · ') });

      if (failed.length > 0) {
        // Keep the form open so Kevin can see and fix the ones that failed.
        setUrl(failed.join('\n'));
        setError(`These couldn't be read — fix or remove them: ${summarizeFailures(failed)}`);
        return;
      }
      reset();
      setOpen(false);
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  const handleUrlSubmit = async () => {
    setError(null);
    const tokens = tokenizeLinks(url);
    if (tokens.length === 0) {
      setError(PASTE_HELP);
      return;
    }
    if (tokens.length > 1) {
      await addManyLinks(tokens);
      return;
    }

    const trimmed = tokens[0]!;
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
      setError(PASTE_HELP);
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

  const linkCount = mode === 'url' ? tokenizeLinks(url).length : 0;

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
          { key: 'url' as const, label: 'Paste URLs', icon: LinkIcon },
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
          {searchErr && !debouncePending && <p className="text-xs text-destructive">{searchErr}</p>}
          <div className="max-h-72 overflow-y-auto -mx-1">
            {(searching || debouncePending) && hits.length === 0 && (
              <div className="flex items-center gap-2 px-3 py-6 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching…
              </div>
            )}
            {!searching && !debouncePending && !searchErr && trimmedQuery && hits.length === 0 && (
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
            <Textarea
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={'Paste one link per line:\nhttps://youtu.be/…\nhttps://www.youtube.com/watch?v=…'}
              className="text-xs min-h-24 font-mono"
              aria-label="Video URL"
              rows={4}
              autoFocus
              disabled={submitting}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              {linkCount > 1
                ? `${linkCount} links — titles are pulled from YouTube automatically.`
                : 'One link, or paste a whole list to add them all at once.'}
            </p>
            {error && <p className="text-xs text-destructive mt-1 whitespace-pre-line break-words">{error}</p>}
          </div>
          {linkCount <= 1 && (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional)"
              className="text-xs"
              aria-label="Video title (optional)"
              disabled={submitting}
            />
          )}
          <div className="flex items-center justify-end gap-2">
            {progress && (
              <span className="text-[11px] text-muted-foreground mr-auto">
                Adding {progress.done} of {progress.total}…
              </span>
            )}
            <Button variant="ghost" size="sm" className="text-xs" onClick={handleCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button size="sm" className="text-xs gap-2" onClick={handleUrlSubmit} disabled={submitting || !url.trim()}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {linkCount > 1 ? `Add ${linkCount} videos` : 'Add video'}
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
