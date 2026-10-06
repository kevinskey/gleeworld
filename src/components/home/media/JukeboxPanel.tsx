// JukeboxPanel — the Command Center media-zone sibling of /dashboard/jukebox
// (JukeboxPage). Replaced the SoundCloudPanel (2026-10-06): the Jukebox
// superseded the SoundCloud page a day earlier, but the Command Center was
// still pointing every member at the tenant's SoundCloud profile.
//
// Same data contract as the full page, deliberately: identical query keys
// (so the two surfaces share the react-query cache), tracks/playlists/shares
// read through the caller's own RLS view, and playback through short-lived
// presigned URLs from the jukebox-track-url function — this panel never
// holds a direct file URL a member could lift.
//
// Compact by design: header with a playlist <select> and a track-search
// field, a one-line transport when something is playing, then the track
// list filling whatever height the parent grid row grants. Playlist admin
// and sharing stay on the full page. The SmartSearchBar's music lane pipes
// its query here via the same custom event the SoundCloud panel used.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { visiblePlaylists, formatDuration, type JukeboxShare } from '@/lib/jukebox/shares';
import { Music, Loader2, Search, X, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SC_SEARCH_EVENT } from './SmartSearchBar';

interface Track {
  id: string;
  title: string;
  upload_date: string | null;
  duration_ms: number | null;
}

interface Playlist {
  id: string;
  title: string;
}

interface PlaylistTrackRow {
  playlist_id: string;
  track_id: string;
  position: number;
}

/** Sentinel <select> value for "everything shared with me / the library". */
const ALL_TRACKS = 'all';

// Same autoplay-policy unlock as the full page: one sample of silence played
// synchronously inside the click so the element is user-activated before the
// async presign round trip.
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

export function JukeboxPanel() {
  // Optional-called: test harnesses (and older mocks) stub useUserRole with
  // only the functions they care about.
  const { isAdmin, isSuperAdmin } = useUserRole();
  const canManage = (isAdmin?.() ?? false) || (isSuperAdmin?.() ?? false);

  const [choice, setChoice] = useState<string | null>(null);
  const [trackQuery, setTrackQuery] = useState('');

  // The smart search bar's music lane lands here (same event the SoundCloud
  // panel listened for, so the bar needs no rewiring).
  useEffect(() => {
    const onSearch = (e: Event) => {
      const q = (e as CustomEvent<{ query?: string }>).detail?.query ?? '';
      if (q) setTrackQuery(q);
    };
    window.addEventListener(SC_SEARCH_EVENT, onSearch);
    return () => window.removeEventListener(SC_SEARCH_EVENT, onSearch);
  }, []);

  // ----- data (query keys shared with JukeboxPage on purpose) -----------
  const { data: tracks = [], isLoading } = useQuery<Track[]>({
    queryKey: ['jukebox-tracks'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_jukebox_tracks')
        .select('id, title, upload_date, duration_ms')
        .order('upload_date', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as Track[];
    },
  });

  const { data: playlists = [] } = useQuery<Playlist[]>({
    queryKey: ['jukebox-playlists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_jukebox_playlists')
        .select('id, title')
        .order('title');
      if (error) throw error;
      return (data ?? []) as unknown as Playlist[];
    },
  });

  const { data: shares = [] } = useQuery<JukeboxShare[]>({
    queryKey: ['jukebox-shares'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_jukebox_playlist_shares')
        .select('id, playlist_id, playlist_title, share_type, target_role, course_id, invited_email, revoked_at')
        .is('revoked_at', null);
      if (error) throw error;
      return (data ?? []) as unknown as JukeboxShare[];
    },
  });

  const { data: playlistTracks = [] } = useQuery<PlaylistTrackRow[]>({
    queryKey: ['jukebox-playlist-tracks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_jukebox_playlist_tracks')
        .select('playlist_id, track_id, position');
      if (error) throw error;
      return (data ?? []) as unknown as PlaylistTrackRow[];
    },
  });

  const visible = useMemo(
    () => visiblePlaylists(playlists, shares, canManage),
    [playlists, shares, canManage],
  );

  const trackById = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);
  const sourceTracks = useMemo(() => {
    if (!choice || choice === ALL_TRACKS) return tracks;
    return playlistTracks
      .filter((r) => r.playlist_id === choice)
      .sort((a, b) => a.position - b.position)
      .map((r) => trackById.get(r.track_id))
      .filter((t): t is Track => !!t);
  }, [choice, tracks, playlistTracks, trackById]);

  const q = trackQuery.trim().toLowerCase();
  const shown = useMemo(
    () => (q ? sourceTracks.filter((t) => t.title.toLowerCase().includes(q)) : sourceTracks),
    [sourceTracks, q],
  );

  // ----- playback --------------------------------------------------------
  const audioRef = useRef<HTMLAudioElement>(null);
  const unlocked = useRef(false);
  // The queue is the list as it looked when play started, so a later search
  // doesn't yank the running order out from under the listener.
  const [queue, setQueue] = useState<Track[]>([]);
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);

  // Same presign-and-cache idiom as the full page (the bucket is private).
  const signedUrls = useRef(new Map<string, { url: string; expiresAt: number }>());
  const resolveStreamUrl = async (trackId: string): Promise<string> => {
    const hit = signedUrls.current.get(trackId);
    if (hit && hit.expiresAt > Date.now()) return hit.url;
    const { data, error } = await supabase.functions.invoke('jukebox-track-url', {
      body: { trackId },
    });
    if (error) throw error;
    const payload = data as { url?: string; error?: string; expires_in?: number };
    if (!payload?.url) throw new Error(payload?.error ?? 'No stream URL');
    signedUrls.current.set(trackId, {
      url: payload.url,
      expiresAt: Date.now() + ((payload.expires_in ?? 3600) - 300) * 1000,
    });
    return payload.url;
  };

  const play = (track: Track) => {
    const el = audioRef.current;
    if (el && !unlocked.current) {
      el.src = SILENT_WAV;
      void el.play().catch(() => undefined);
      unlocked.current = true;
    }
    setQueue(shown);
    setCurrent(track);
    setPlaying(true);
  };

  const step = (dir: 1 | -1) => {
    if (!current || queue.length === 0) return;
    const i = queue.findIndex((t) => t.id === current.id);
    const next = queue[(i + dir + queue.length) % queue.length];
    if (next) { setCurrent(next); setPlaying(true); }
  };

  const toggle = () => {
    const el = audioRef.current;
    if (!el || !current) return;
    if (el.paused) void el.play().catch(() => undefined);
    else el.pause();
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !current) return;
    let stale = false;
    void resolveStreamUrl(current.id)
      .then((url) => {
        if (stale) return;
        el.src = url;
        return el.play();
      })
      .catch(() => { if (!stale) setPlaying(false); });
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  return (
    <div className="h-full w-full min-h-0 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
      <audio
        ref={audioRef}
        onEnded={() => step(1)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* Header: identity + playlist picker. shrink-0 so the track list
          below is the only thing that flexes. */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        {/* Script faces render visually smaller than their box; the wordmark
            needs a couple of steps up to read at header weight (Kevin,
            2026-10-06: "[title] should be bigger"). leading-none keeps the
            taller glyph from inflating the bar. */}
        <Music className="w-5 h-5 text-primary shrink-0" aria-hidden />
        <span className="text-2xl leading-none font-semibold font-script">Yo Player</span>
        <select
          value={choice ?? ALL_TRACKS}
          onChange={(e) => setChoice(e.target.value)}
          aria-label="Choose a playlist"
          className="ml-auto min-w-0 max-w-[55%] truncate rounded-md border border-input bg-background px-2 py-1 text-xs"
        >
          <option value={ALL_TRACKS}>{canManage ? 'All songs' : 'Shared with me'}</option>
          {visible.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </div>

      {/* Search row */}
      <div className="relative px-3 py-1.5 border-b border-border shrink-0">
        <Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" aria-hidden />
        <input
          value={trackQuery}
          onChange={(e) => setTrackQuery(e.target.value)}
          placeholder="Search songs…"
          aria-label="Search songs"
          className="w-full rounded-md border border-input bg-background pl-7 pr-7 py-1 text-xs"
        />
        {trackQuery && (
          <button
            type="button"
            onClick={() => setTrackQuery('')}
            aria-label="Clear search"
            className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Transport: only mounts once something plays, so the idle panel is
          all list. */}
      {current && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border shrink-0 bg-muted/40">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => step(-1)} aria-label="Previous">
            <SkipBack className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => step(1)} aria-label="Next">
            <SkipForward className="w-3.5 h-3.5" />
          </Button>
          <span className="min-w-0 flex-1 truncate text-xs font-medium">{current.title}</span>
        </div>
      )}

      {/* The track list is the only scrolling region. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" aria-label="Loading" />
          </div>
        ) : shown.length === 0 ? (
          <p className="px-3 py-4 text-xs text-muted-foreground">
            {q
              ? 'No songs match.'
              : canManage
                ? 'No songs in the library yet.'
                : 'No music has been shared with you yet.'}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {shown.map((t) => {
              const active = current?.id === t.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => (active ? toggle() : play(t))}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/60',
                      active && 'bg-muted',
                    )}
                  >
                    <span className="w-4 shrink-0 text-muted-foreground">
                      {active && playing
                        ? <Pause className="w-3.5 h-3.5" aria-hidden />
                        : <Play className="w-3.5 h-3.5" aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs">{t.title}</span>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {formatDuration(t.duration_ms)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
