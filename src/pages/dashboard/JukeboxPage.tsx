// Jukebox — the Command Center listening surface.
//
// Replaced the SoundCloud widget page (2026-10-05): the catalog now lives in
// our own bucket (gw_jukebox_tracks rows pointing at Spaces CDN files), so
// playback is a plain <audio> element — no SoundCloud rate limits, no
// preview traps, and playlists are curated in-app and shared with members
// through gw_jukebox_playlist_shares, the same role/class/email model the
// SoundCloud page used.
//
// Layout is modeled on iTunes (Kevin, 2026-10-05): a transport bar across
// the top with the "LCD" now-playing readout in the middle and search on the
// right; below it a source list of playlists on the left and the song table
// filling the rest.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { useUserRole } from '@/hooks/useUserRole';
import {
  Music, ListMusic, Loader2, Share2, Search, X, Play, Pause,
  SkipBack, SkipForward, Shuffle, Volume2, Plus, MoreHorizontal, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { JukeboxShareDialog, type SharableJukeboxPlaylist } from '@/components/jukebox/JukeboxShareDialog';
import {
  visiblePlaylists, sharesByPlaylist, describeShare, formatDuration,
  type JukeboxShare,
} from '@/lib/jukebox/shares';

interface Track {
  id: string;
  title: string;
  upload_date: string | null;
  duration_ms: number | null;
  audio_url: string;
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

/** Which list the table shows: the whole library or one playlist. */
type Source = { kind: 'library' } | { kind: 'playlist'; id: string };

type SortCol = 'title' | 'duration_ms' | 'upload_date';

const SOFT_CARD = 'border-0 bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = { boxShadow: 'var(--shadow-card)' };

/** m:ss readout for the LCD clock. */
function clock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const t = Math.floor(sec);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

export default function JukeboxPage() {
  const { settings } = useBrandingSettings();
  const { isAdmin, isSuperAdmin } = useUserRole();
  const canManage = isAdmin() || isSuperAdmin();
  const qc = useQueryClient();

  const [source, setSource] = useState<Source>({ kind: 'library' });
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ col: SortCol; dir: 1 | -1 }>({ col: 'upload_date', dir: -1 });
  const [sharing, setSharing] = useState<SharableJukeboxPlaylist | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [deleting, setDeleting] = useState<Playlist | null>(null);

  // ----- data ---------------------------------------------------------
  const { data: tracks = [], isLoading } = useQuery<Track[]>({
    queryKey: ['jukebox-tracks'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_jukebox_tracks')
        .select('id, title, upload_date, duration_ms, audio_url')
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

  // Membership rows for every visible playlist in one query: the counts on
  // the source list need all of them anyway, and 549 tracks × a handful of
  // playlists is small enough that per-playlist refetching would just add
  // spinners.
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

  const shareMap = useMemo(() => sharesByPlaylist(shares), [shares]);
  const visible = useMemo(
    () => visiblePlaylists(playlists, shares, canManage),
    [playlists, shares, canManage],
  );
  const membership = useMemo(() => {
    const m = new Map<string, PlaylistTrackRow[]>();
    for (const r of playlistTracks) {
      const list = m.get(r.playlist_id);
      if (list) list.push(r);
      else m.set(r.playlist_id, [r]);
    }
    for (const list of m.values()) list.sort((a, b) => a.position - b.position);
    return m;
  }, [playlistTracks]);

  // ----- the visible song list ----------------------------------------
  const trackById = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);
  const sourceTracks = useMemo(() => {
    if (source.kind === 'library') return tracks;
    return (membership.get(source.id) ?? [])
      .map((r) => trackById.get(r.track_id))
      .filter((t): t is Track => !!t);
  }, [source, tracks, membership, trackById]);

  const q = query.trim().toLowerCase();
  const shown = useMemo(() => {
    const filtered = q ? sourceTracks.filter((t) => t.title.toLowerCase().includes(q)) : sourceTracks;
    const { col, dir } = sort;
    return [...filtered].sort((a, b) => {
      const av = a[col] ?? '';
      const bv = b[col] ?? '';
      return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
    });
  }, [sourceTracks, q, sort]);

  // ----- playback ------------------------------------------------------
  const audioRef = useRef<HTMLAudioElement>(null);
  // The queue is the table as it looked when play started, so later searches
  // and re-sorts don't yank the running order out from under the listener.
  const [queue, setQueue] = useState<Track[]>([]);
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [volume, setVolume] = useState(() => {
    const v = Number(localStorage.getItem('gw-jukebox-volume'));
    return Number.isFinite(v) && v > 0 && v <= 1 ? v : 0.8;
  });

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    localStorage.setItem('gw-jukebox-volume', String(volume));
  }, [volume]);

  const play = (track: Track, fromList: Track[] = shown) => {
    setQueue(fromList);
    setCurrent(track);
    setPlaying(true);
  };

  // The bucket went private on 2026-10-05: the row's audio_url is a dead
  // link on its own. Each play asks jukebox-track-url for a presigned GET
  // (RLS-checked server-side), cached until shortly before it expires.
  const signedUrls = useRef(new Map<string, { url: string; expiresAt: number }>());
  const signedUrlFor = async (track: Track): Promise<string> => {
    const hit = signedUrls.current.get(track.id);
    if (hit && hit.expiresAt > Date.now() + 5 * 60_000) return hit.url;
    const { data, error } = await supabase.functions.invoke('jukebox-track-url', {
      body: { trackId: track.id },
    });
    if (error || !data?.url) throw error ?? new Error('no signed url');
    signedUrls.current.set(track.id, {
      url: data.url as string,
      expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
    });
    return data.url as string;
  };

  // One element, re-pointed per track. Autoplay after a user gesture is
  // fine; the explicit play() handles the src swap race.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !current) return;
    let cancelled = false;
    signedUrlFor(current)
      .then((url) => {
        if (cancelled || !audioRef.current) return;
        audioRef.current.src = url;
        return audioRef.current.play();
      })
      .catch(() => {
        if (!cancelled) setPlaying(false);
      });
    return () => {
      cancelled = true;
    };
  }, [current]);

  useEffect(() => {
    if (!current || !('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: settings.org_name ?? '',
    });
  }, [current, settings.org_name]);

  const step = (dir: 1 | -1) => {
    if (!current || queue.length === 0) return;
    const i = queue.findIndex((t) => t.id === current.id);
    let next: Track | undefined;
    if (shuffle && queue.length > 1) {
      do { next = queue[Math.floor(Math.random() * queue.length)]; }
      while (next && next.id === current.id);
    } else {
      next = queue[(i + dir + queue.length) % queue.length];
    }
    if (next) { setCurrent(next); setPlaying(true); }
  };

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (!current) {
      if (shown.length > 0) play(shown[0]);
      return;
    }
    if (el.paused) { el.play().catch(() => undefined); setPlaying(true); }
    else { el.pause(); setPlaying(false); }
  };

  // ----- playlist management (admins) ----------------------------------
  const createPlaylist = async () => {
    const title = newTitle.trim();
    if (!title) return;
    const { error } = await supabase.from('gw_jukebox_playlists').insert({ title } as never);
    if (error) { toast.error(error.message); return; }
    setNewTitle('');
    setCreating(false);
    await qc.invalidateQueries({ queryKey: ['jukebox-playlists'] });
  };

  const deletePlaylist = async (p: Playlist) => {
    const { error } = await supabase.from('gw_jukebox_playlists').delete().eq('id', p.id);
    if (error) { toast.error(error.message); return; }
    if (source.kind === 'playlist' && source.id === p.id) setSource({ kind: 'library' });
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['jukebox-playlists'] }),
      qc.invalidateQueries({ queryKey: ['jukebox-playlist-tracks'] }),
      qc.invalidateQueries({ queryKey: ['jukebox-shares'] }),
    ]);
  };

  const addToPlaylist = async (track: Track, playlistId: string) => {
    const pos = (membership.get(playlistId)?.length ?? 0) + 1;
    const { error } = await supabase.from('gw_jukebox_playlist_tracks').insert({
      playlist_id: playlistId, track_id: track.id, position: pos,
    } as never);
    if (error) {
      toast[error.code === '23505' ? 'info' : 'error'](
        error.code === '23505' ? 'Already in that playlist' : error.message,
      );
      return;
    }
    await qc.invalidateQueries({ queryKey: ['jukebox-playlist-tracks'] });
  };

  const removeFromPlaylist = async (track: Track, playlistId: string) => {
    const { error } = await supabase
      .from('gw_jukebox_playlist_tracks')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('track_id', track.id);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ['jukebox-playlist-tracks'] });
  };

  // ----- UI -------------------------------------------------------------
  const sortHeader = (col: SortCol, label: string, extra = '') => (
    <TableHead
      className={`cursor-pointer select-none whitespace-nowrap ${extra}`}
      aria-sort={sort.col === col ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
      onClick={() => setSort((s) => ({ col, dir: s.col === col ? (s.dir === 1 ? -1 : 1) : 1 }))}
    >
      {label}{sort.col === col ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
    </TableHead>
  );

  const playerTitle = settings.org_name ? `${settings.org_name} Player` : 'Player';
  const currentPlaylistTitle =
    source.kind === 'playlist' ? visible.find((p) => p.id === source.id)?.title : null;

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
        <DashboardPageShell
          title={playerTitle}
          subtitle={`${tracks.length} songs in the library, streamed from your own archive.`}
        >
          <audio
            ref={audioRef}
            onTimeUpdate={(e) => setElapsed(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDurationSec(e.currentTarget.duration || 0)}
            onEnded={() => step(1)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />

          {/* -------- transport bar: controls | LCD | volume + search ---- */}
          <Card className={`${SOFT_CARD} mb-4`} style={SOFT_CARD_STYLE}>
            <CardContent className="p-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" aria-label="Previous song"
                  disabled={!current} onClick={() => step(-1)}>
                  <SkipBack className="w-5 h-5" />
                </Button>
                <Button variant="default" size="icon" className="rounded-full h-11 w-11"
                  aria-label={playing ? 'Pause' : 'Play'} onClick={toggle}>
                  {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </Button>
                <Button variant="ghost" size="icon" aria-label="Next song"
                  disabled={!current} onClick={() => step(1)}>
                  <SkipForward className="w-5 h-5" />
                </Button>
                <Button
                  variant={shuffle ? 'secondary' : 'ghost'} size="icon"
                  aria-label="Shuffle" aria-pressed={shuffle}
                  onClick={() => setShuffle((s) => !s)}
                >
                  <Shuffle className="w-4 h-4" />
                </Button>
              </div>

              {/* The iTunes "LCD": title on top, elapsed — scrubber —
                  remaining underneath. bg-muted keeps it a readout, not a
                  card, under any tenant theme. */}
              <div className="flex-1 min-w-[220px] border bg-muted/50 px-4 py-2 text-center">
                {current ? (
                  <>
                    <div className="text-sm font-medium truncate">{current.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
                        {clock(elapsed)}
                      </span>
                      <Slider
                        value={[durationSec ? (elapsed / durationSec) * 100 : 0]}
                        max={100} step={0.1} aria-label="Seek"
                        className="flex-1"
                        onValueChange={([v]) => {
                          const el = audioRef.current;
                          if (el && durationSec) el.currentTime = (v / 100) * durationSec;
                        }}
                      />
                      <span className="text-xs tabular-nums text-muted-foreground w-12 text-left">
                        −{clock(Math.max(0, durationSec - elapsed))}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground">
                    <Music className="w-4 h-4" />
                    <span className="text-sm">Not playing</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 w-36">
                <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <Slider
                  value={[volume * 100]} max={100} step={1} aria-label="Volume"
                  onValueChange={([v]) => setVolume(v / 100)}
                />
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search songs…"
                  aria-label="Search songs"
                  className="pl-9 pr-8 h-9"
                />
                {query && (
                  <button
                    type="button" onClick={() => setQuery('')} aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* -------- source list | song table --------------------------- */}
          <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)] items-start">
            <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
              <CardContent className="p-2">
                <p className="px-2 pt-1 pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Library
                </p>
                <SourceRow
                  icon={<Music className="w-4 h-4" />}
                  label="All songs"
                  count={tracks.length}
                  active={source.kind === 'library'}
                  onClick={() => setSource({ kind: 'library' })}
                />
                <div className="flex items-center justify-between px-2 pt-3 pb-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Playlists
                  </p>
                  {canManage && (
                    <button
                      type="button" aria-label="New playlist"
                      onClick={() => setCreating(true)}
                      className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {visible.length === 0 && (
                  <p className="px-2 pb-2 text-xs text-muted-foreground">
                    {canManage ? 'None yet — make one with +.' : 'No playlists have been shared with you yet.'}
                  </p>
                )}
                {visible.map((p) => (
                  <SourceRow
                    key={p.id}
                    icon={<ListMusic className="w-4 h-4" />}
                    label={p.title}
                    count={membership.get(p.id)?.length ?? 0}
                    active={source.kind === 'playlist' && source.id === p.id}
                    onClick={() => setSource({ kind: 'playlist', id: p.id })}
                    subtitle={canManage
                      ? ((shareMap.get(p.id)?.length ?? 0) === 0
                          ? 'shared with nobody'
                          : (shareMap.get(p.id) ?? []).map((s) => describeShare(s)).join(', '))
                      : undefined}
                    actions={canManage ? (
                      <>
                        <button
                          type="button" aria-label={`Share ${p.title}`}
                          className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground"
                          onClick={(e) => { e.stopPropagation(); setSharing({ id: p.id, title: p.title }); }}
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button" aria-label={`Delete ${p.title}`}
                          className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); setDeleting(p); }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : undefined}
                  />
                ))}
              </CardContent>
            </Card>

            <Card className={`${SOFT_CARD} overflow-hidden`} style={SOFT_CARD_STYLE}>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-10 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading the library…
                  </div>
                ) : shown.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    {q
                      ? `Nothing matches “${query.trim()}”.`
                      : source.kind === 'playlist'
                        ? 'This playlist is empty — add songs from All songs.'
                        : 'No songs in the library yet.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10 text-right">#</TableHead>
                          {sortHeader('title', 'Name')}
                          {sortHeader('duration_ms', 'Time', 'w-20 text-right')}
                          {sortHeader('upload_date', 'Date', 'w-28')}
                          {canManage && <TableHead className="w-12" aria-label="Row actions" />}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shown.map((t, i) => {
                          const active = current?.id === t.id;
                          return (
                            <TableRow
                              key={t.id}
                              className={`cursor-pointer ${active ? 'bg-primary/10' : ''}`}
                              onClick={() => play(t)}
                              aria-current={active ? 'true' : undefined}
                            >
                              <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                                {active
                                  ? (playing
                                      ? <Volume2 className="w-4 h-4 inline text-primary" aria-label="Now playing" />
                                      : <Pause className="w-4 h-4 inline text-primary" aria-label="Paused" />)
                                  : i + 1}
                              </TableCell>
                              <TableCell className="max-w-0 w-full">
                                <span className={`block truncate text-sm ${active ? 'font-medium text-primary' : ''}`}>
                                  {t.title}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                                {formatDuration(t.duration_ms)}
                              </TableCell>
                              <TableCell className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                                {t.upload_date ?? ''}
                              </TableCell>
                              {canManage && (
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7"
                                        aria-label={`Actions for ${t.title}`}>
                                        <MoreHorizontal className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Add to playlist</DropdownMenuLabel>
                                      {playlists.length === 0 && (
                                        <DropdownMenuItem disabled>No playlists yet</DropdownMenuItem>
                                      )}
                                      {playlists.map((p) => (
                                        <DropdownMenuItem key={p.id} onClick={() => void addToPlaylist(t, p.id)}>
                                          <ListMusic className="w-4 h-4 mr-2" /> {p.title}
                                        </DropdownMenuItem>
                                      ))}
                                      {source.kind === 'playlist' && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => void removeFromPlaylist(t, source.id)}
                                          >
                                            <Trash2 className="w-4 h-4 mr-2" /> Remove from this playlist
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {currentPlaylistTitle && (
            <p className="mt-2 text-xs text-muted-foreground">
              Showing “{currentPlaylistTitle}”.
            </p>
          )}

          <JukeboxShareDialog
            playlist={sharing}
            open={!!sharing}
            onOpenChange={(v) => { if (!v) setSharing(null); }}
            shares={sharing ? (shareMap.get(sharing.id) ?? []) : []}
          />

          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>New playlist</DialogTitle>
              </DialogHeader>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void createPlaylist(); }}
                placeholder="Playlist name"
                aria-label="Playlist name"
                autoFocus
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
                <Button disabled={!newTitle.trim()} onClick={() => void createPlaylist()}>
                  Create playlist
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={!!deleting} onOpenChange={(v) => { if (!v) setDeleting(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete “{deleting?.title}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  The playlist and who it was shared with go away. The songs stay in the library.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => { if (deleting) void deletePlaylist(deleting); setDeleting(null); }}
                >
                  Delete playlist
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DashboardPageShell>
      </DashboardShell>
    </UniversalLayout>
  );
}

function SourceRow({
  icon, label, count, active, onClick, subtitle, actions,
}: {
  icon: React.ReactNode; label: string; count: number;
  active: boolean; onClick: () => void;
  subtitle?: string; actions?: React.ReactNode;
}) {
  return (
    <div
      role="button" tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={`w-full flex items-center gap-2 px-2 py-2 text-left cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-ring outline-none ${
        active ? 'bg-primary/10 text-primary' : 'hover:bg-accent/50'
      }`}
    >
      <span className={active ? 'text-primary' : 'text-muted-foreground'}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block truncate text-sm font-medium">{label}</span>
        {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
      {actions}
    </div>
  );
}
