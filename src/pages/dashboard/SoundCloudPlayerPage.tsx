// SoundCloud — the Command Center listening surface. Plays the tenant's
// Media Library audio: tap a track, it plays; a strip pinned to the bottom
// keeps transport controls in reach while the list scrolls.
//
// Distinct from /soundcloud (the SoundCloud.com OAuth search page, kept for
// now and still unlinked). Nothing here talks to soundcloud.com — the name
// is Kevin's, for the surface his listeners already call that.
//
// Media Library's RLS decides what comes back, so this page adds no
// visibility rules of its own: a member sees their tenant's audio and
// nothing else, exactly as /dashboard/media-library shows it.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Music, Play, Pause, SkipBack, SkipForward, Search, Loader2 } from 'lucide-react';
import { nextIndex, prevIndex, toggleFor, type PlaybackState } from '@/lib/media/playlist';

interface TrackRow {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

/** mm:ss, or a dash while the browser still has no duration for the track. */
function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—:—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function SoundCloudPlayerPage() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<PlaybackState>({ index: null, playing: false });
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: rows = [], isLoading } = useQuery<TrackRow[]>({
    queryKey: ['soundcloud-tracks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_media_library')
        .select('id, title, file_url, file_type, created_at')
        .eq('is_deleted', false)
        .like('file_type', 'audio/%')
        .order('created_at', { ascending: false })
        .limit(200);
      return (data ?? []) as TrackRow[];
    },
  });

  const tracks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.title?.toLowerCase().includes(q));
  }, [rows, query]);

  const current = state.index !== null ? tracks[state.index] ?? null : null;
  // Keyed on the id, not the row: re-fetches hand back equal-but-new objects,
  // and depending on those would restart playback under the listener.
  const currentId = current?.id;

  // One <audio> element for the whole page, driven by state — two tracks can
  // never sound at once, which a per-row <audio controls> list allows.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !currentId) return;
    if (state.playing) {
      void el.play().catch(() => setState((s) => ({ ...s, playing: false })));
    } else {
      el.pause();
    }
  }, [state.playing, currentId]);

  // Filtering while a track plays would otherwise leave `index` pointing at
  // a different row. Drop the selection rather than swap the audio silently.
  useEffect(() => {
    setState((s) => (s.index !== null && s.index >= tracks.length ? { index: null, playing: false } : s));
  }, [tracks.length]);

  const select = (i: number) => setState((s) => toggleFor(s, i));
  const goNext = () => setState((s) => ({ index: nextIndex(s.index, tracks.length), playing: true }));
  const goPrev = () => setState((s) => ({ index: prevIndex(s.index, tracks.length), playing: true }));

  const seek = (value: number) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(value)) return;
    el.currentTime = value;
    setPosition(value);
  };

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
        <DashboardPageShell
          title="SoundCloud"
          subtitle="Every audio track in your Media Library, in one player."
        >
          <div className="mb-4 relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tracks"
              className="pl-9"
              aria-label="Search tracks"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-10 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading tracks…
            </div>
          ) : tracks.length === 0 ? (
            <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
              <CardContent className="py-10 text-center text-muted-foreground">
                <Music className="w-8 h-8 mx-auto mb-3 opacity-50" />
                {rows.length === 0
                  ? 'No audio in your Media Library yet. Upload audio there and it shows up here.'
                  : 'No track matches that search.'}
              </CardContent>
            </Card>
          ) : (
            // Bottom padding clears the fixed transport strip so the last
            // row is never parked underneath it.
            <div className="space-y-2 pb-28">
              {tracks.map((t, i) => {
                const isCurrent = state.index === i;
                return (
                  <Card
                    key={t.id}
                    className={`${SOFT_CARD} cursor-pointer transition-colors ${isCurrent ? 'ring-2 ring-primary' : ''}`}
                    style={SOFT_CARD_STYLE}
                    onClick={() => select(i)}
                  >
                    <CardContent className="py-3 px-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        {isCurrent && state.playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{t.title || 'Untitled'}</div>
                        {isCurrent && (
                          <div className="text-xs text-muted-foreground">
                            {clock(position)} / {clock(duration)}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {current && (
            <div
              className="fixed bottom-0 left-0 right-0 z-30 border-t bg-card px-4 py-3"
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
            >
              <div className="max-w-4xl mx-auto flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate text-sm">{current.title || 'Untitled'}</div>
                  <input
                    type="range"
                    min={0}
                    max={Number.isFinite(duration) && duration > 0 ? duration : 0}
                    value={position}
                    onChange={(e) => seek(Number(e.target.value))}
                    className="w-full mt-1"
                    aria-label="Seek"
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                  {clock(position)} / {clock(duration)}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={goPrev} aria-label="Previous track">
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setState((s) => ({ ...s, playing: !s.playing }))}
                    aria-label={state.playing ? 'Pause' : 'Play'}
                  >
                    {state.playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={goNext} aria-label="Next track">
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <audio
            ref={audioRef}
            src={current?.file_url}
            preload="metadata"
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
            onEnded={goNext}
            className="hidden"
          />
        </DashboardPageShell>
      </DashboardShell>
    </UniversalLayout>
  );
}
