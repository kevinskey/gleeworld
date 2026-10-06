// Yo Player block — streams the tenant's own Jukebox library on the public
// site. Replaces the SoundCloud block (Kevin, 2026-10-06: "soundcloud should
// be replaced with yo player on the public website"): same slot, but the
// audio comes from our private Spaces bucket through jukebox-track-url
// presigns instead of SoundCloud's widget, so there are no rate limits, no
// 30-second preview traps, and no third-party iframe.
//
// What anonymous visitors can hear is governed by gw_jukebox_playlists
// .is_public (20261006120000): the block lists every public playlist of the
// tenant and nothing else. The editor form is where playlists get flipped
// public — a deliberate, visible switch, because public means PUBLIC.
// Signed-in admins browsing their own site see all playlists through their
// RLS view, so the queries re-assert is_public / public-playlist membership
// client-side: the public page must show an admin exactly what a visitor
// gets.

import { useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { Loader2, Music, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { formatDuration } from '@/lib/jukebox/shares';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';
import { EmptyBlockPlaceholder } from '../EmptyBlockPlaceholder';

const schema = z.object({
  heading: z.string().default('Listen'),
});
type Config = z.infer<typeof schema>;

interface Track {
  id: string;
  title: string;
  duration_ms: number | null;
}

interface PublicPlaylist {
  id: string;
  title: string;
}

// Same autoplay-policy unlock as the Jukebox page: one sample of silence
// played synchronously inside the click so the element is user-activated
// before the async presign round trip.
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

function Render({ config, onConfigChange }: BlockRenderProps<Config>) {
  const editable = !!onConfigChange;
  const [active, setActive] = useState(0);

  const { data: playlists = [], isLoading: playlistsLoading } = useQuery<PublicPlaylist[]>({
    queryKey: ['yo-player-public-playlists'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_jukebox_playlists')
        .select('id, title')
        .eq('is_public', true)
        .order('title');
      if (error) throw error;
      return (data ?? []) as unknown as PublicPlaylist[];
    },
  });

  const current = playlists[Math.min(active, Math.max(0, playlists.length - 1))];

  const { data: tracks = [], isLoading: tracksLoading } = useQuery<Track[]>({
    queryKey: ['yo-player-public-tracks', current?.id],
    enabled: !!current,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('gw_jukebox_playlist_tracks')
        .select('track_id, position')
        .eq('playlist_id', current!.id)
        .order('position');
      if (error) throw error;
      const ids = (rows ?? []).map((r) => (r as { track_id: string }).track_id);
      if (ids.length === 0) return [];
      const { data: trackRows, error: trackErr } = await supabase
        .from('gw_jukebox_tracks')
        .select('id, title, duration_ms')
        .in('id', ids);
      if (trackErr) throw trackErr;
      const byId = new Map((trackRows ?? []).map((t) => [(t as Track).id, t as Track]));
      return ids.map((id) => byId.get(id)).filter((t): t is Track => !!t);
    },
  });

  // ----- playback (mirrors JukeboxPanel) --------------------------------
  const audioRef = useRef<HTMLAudioElement>(null);
  const unlocked = useRef(false);
  const [playingTrack, setPlayingTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const queue = useRef<Track[]>([]);

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
    queue.current = tracks;
    setPlayingTrack(track);
    setPlaying(true);
  };

  const step = (dir: 1 | -1) => {
    const list = queue.current;
    if (!playingTrack || list.length === 0) return;
    const i = list.findIndex((t) => t.id === playingTrack.id);
    const next = list[(i + dir + list.length) % list.length];
    if (next) { setPlayingTrack(next); setPlaying(true); }
  };

  const toggle = () => {
    const el = audioRef.current;
    if (!el || !playingTrack) return;
    if (el.paused) void el.play().catch(() => undefined);
    else el.pause();
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !playingTrack) return;
    let stale = false;
    void resolveStreamUrl(playingTrack.id)
      .then((url) => {
        if (stale) return;
        el.src = url;
        return el.play();
      })
      .catch(() => { if (!stale) setPlaying(false); });
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingTrack]);

  const totalLabel = useMemo(() => {
    if (tracks.length === 0) return '';
    return `${tracks.length} track${tracks.length === 1 ? '' : 's'}`;
  }, [tracks]);

  // No public playlists: in the editor say so, on the public site render
  // nothing at all — same contract as the SoundCloud block it replaces.
  if (!playlistsLoading && playlists.length === 0) {
    return editable ? <EmptyBlockPlaceholder name="Yo Player" /> : null;
  }

  return (
    <section id="listen" className="gw-container py-5">
      {config.heading && (
        <h2 className="normal-case text-2xl cq-sm:text-3xl font-bold mb-6 flex items-center gap-2">
          <Music className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
          {config.heading}
        </h2>
      )}

      {/* Tabs only earn their space once there is a choice to make. */}
      {playlists.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {playlists.map((p, i) => {
            const on = i === active;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActive(i)}
                className="rounded-full px-3 py-1.5 text-sm border transition-colors"
                style={on
                  ? { background: 'var(--site-accent)', color: '#fff', borderColor: 'var(--site-accent)' }
                  : { borderColor: 'var(--site-accent)', color: 'var(--site-accent)' }}
              >
                {p.title}
              </button>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <audio
          ref={audioRef}
          onEnded={() => step(1)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />

        {/* Now-playing bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors disabled:opacity-40"
            disabled={!playingTrack}
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => (playingTrack ? toggle() : tracks[0] && play(tracks[0]))}
            aria-label={playing ? 'Pause' : 'Play'}
            className="inline-flex items-center justify-center w-11 h-11 rounded-full text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--site-accent)' }}
          >
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 translate-x-[1px]" />}
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors disabled:opacity-40"
            disabled={!playingTrack}
          >
            <SkipForward className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1 px-1">
            <p className="truncate text-sm font-medium">
              {playingTrack ? playingTrack.title : (current?.title ?? '')}
            </p>
            <p className="text-xs text-muted-foreground">
              {playingTrack ? (current?.title ?? '') : totalLabel}
            </p>
          </div>
        </div>

        {/* Track list */}
        {tracksLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" aria-label="Loading" />
          </div>
        ) : (
          <ul className="divide-y divide-border max-h-[420px] overflow-y-auto">
            {tracks.map((t) => {
              const activeRow = playingTrack?.id === t.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => (activeRow ? toggle() : play(t))}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/60 transition-colors ${activeRow ? 'bg-muted' : ''}`}
                  >
                    <span className="w-4 shrink-0" style={{ color: 'var(--site-accent)' }}>
                      {activeRow && playing
                        ? <Pause className="w-4 h-4" aria-hidden />
                        : <Play className="w-4 h-4" aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatDuration(t.duration_ms)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- editor
interface EditorPlaylistRow {
  id: string;
  title: string;
  is_public: boolean;
  trackCount: number;
}

function EditorForm({ config, onChange }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });

  const [rows, setRows] = useState<EditorPlaylistRow[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: pls } = await supabase
        .from('gw_jukebox_playlists')
        .select('id, title, is_public')
        .order('title');
      const { data: pts } = await supabase
        .from('gw_jukebox_playlist_tracks')
        .select('playlist_id');
      if (cancelled) return;
      const counts: Record<string, number> = {};
      for (const r of (pts ?? []) as { playlist_id: string }[]) {
        counts[r.playlist_id] = (counts[r.playlist_id] || 0) + 1;
      }
      setRows(((pls ?? []) as Array<Omit<EditorPlaylistRow, 'trackCount'>>).map((p) => ({
        ...p,
        is_public: !!p.is_public,
        trackCount: counts[p.id] || 0,
      })));
    })();
    return () => { cancelled = true; };
  }, []);

  const togglePublic = async (row: EditorPlaylistRow) => {
    setSaving(row.id);
    const next = !row.is_public;
    const { error } = await supabase
      .from('gw_jukebox_playlists')
      .update({ is_public: next })
      .eq('id', row.id);
    if (!error) {
      setRows((rs) => (rs ?? []).map((r) => (r.id === row.id ? { ...r, is_public: next } : r)));
    }
    setSaving(null);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Section heading</Label>
        <Input
          value={config.heading}
          onChange={(e) => set({ heading: e.target.value })}
          placeholder="Listen"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Public playlists</Label>
        <p className="text-xs text-muted-foreground">
          Checked playlists stream to <strong>everyone</strong> who visits your website —
          no sign-in needed. Member sharing on the Yo Player page is separate and unchanged.
        </p>
        {rows === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading playlists…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No playlists yet — make one on the Yo Player page first.
          </p>
        ) : (
          <ul className="space-y-1">
            {rows.map((r) => (
              <li key={r.id}>
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={r.is_public}
                    disabled={saving === r.id}
                    onChange={() => togglePublic(r)}
                  />
                  <span className="flex-1 truncate">{r.title}</span>
                  <span className="text-xs text-slate-400 shrink-0">
                    {r.trackCount} track{r.trackCount === 1 ? '' : 's'}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export const yoPlayerBlock: BlockModule<typeof schema> = {
  type: 'yo-player',
  name: 'Yo Player',
  description: 'Stream your own Yo Player playlists — pick which ones are public.',
  icon: Music,
  tier: 'free',
  group: 'core',
  poweredBy: 'Yo Player',
  configSchema: schema,
  defaultConfig: { heading: 'Listen' },
  EditorForm,
  Render,
};
