import React, { useEffect, useState } from 'react';
import { Plus, X, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseYouTubeInput } from '@/lib/youtubeId';

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

// Admin-only "add a video" control for /youtube. Gating who SEES this form
// is the caller's job (YouTubeChannel checks useUserRole().isAdmin) — this
// component assumes it should render. Note youtube_videos RLS is
// WITH CHECK (true) for any authenticated user, so the real access control
// here is UI-only; a signed-in non-admin who reaches this component via
// devtools could still insert. Tightening that is an RLS change, not a UI one.
export const AddYouTubeVideoForm: React.FC<AddYouTubeVideoFormProps> = ({ onAdded }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'search' | 'paste'>('search');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
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

  const addVideo = async (videoId: string, videoTitle: string) => {
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
          title: videoTitle || videoId,
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

  const handlePasteSubmit = async () => {
    setError(null);
    const videoId = parseYouTubeInput(url);
    if (!videoId) {
      setError('Paste a full YouTube URL (youtube.com/watch?v=…, youtu.be/…) or an 11-character video ID.');
      return;
    }
    await addVideo(videoId, title.trim());
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

      {/* Mode toggle: search YouTube directly (default) or paste a URL/ID. */}
      <div className="flex rounded-md border border-border bg-muted/40 p-0.5 text-xs">
        {(['search', 'paste'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setMode(k)}
            className={`flex-1 px-3 py-1.5 rounded transition-colors ${
              mode === k ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {k === 'search' ? 'Search YouTube' : 'Paste URL'}
          </button>
        ))}
      </div>

      {mode === 'search' ? (
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
                    onClick={() => addVideo(hit.videoId, hit.title)}
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
      ) : (
        <div className="space-y-3">
          <div>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or video ID"
              className="text-xs"
              aria-label="YouTube URL or video ID"
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
            <Button size="sm" className="text-xs gap-2" onClick={handlePasteSubmit} disabled={submitting || !url.trim()}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Add video
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddYouTubeVideoForm;
