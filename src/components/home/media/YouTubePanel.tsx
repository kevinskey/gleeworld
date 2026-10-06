// YouTube panel for the Command Center media zone. Doc's playlists + likes,
// browsed and played inline without leaving the dashboard.
//
// Talks to the 'youtube-library' edge function (status / playlists /
// playlistItems / liked) and to 'google-oauth-start' for the connect flow.
// The 'Recent' tab is a purely local watch history — see youtubeTypes.ts for
// why the YouTube API can never provide that.
//
// Sizing contract: the root fills its parent (h-full w-full min-h-0 flex-col);
// the integrator owns the outer clamp height, so no fixed heights here. The
// list is the only scrolling region; the player pins above it.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, History, ListVideo, LogOut, Search as SearchIcon, X, Youtube } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  readYtHistory,
  recordYtPlay,
  type YtHistoryEntry,
  type YtPlaylist,
  type YtPlaylistsResponse,
  type YtStatus,
  type YtVideo,
  type YtVideosResponse,
} from './youtubeTypes';

const STALE_MS = 5 * 60 * 1000;

// Thin invoke wrapper: supabase.functions.invoke resolves successfully even
// when the function returns an application-level {error} payload, so we
// normalize both failure shapes into thrown Errors for react-query.
async function ytInvoke<T extends { error?: string }>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('youtube-library', { body });
  if (error) throw new Error(error.message);
  const payload = data as T;
  if (payload?.error) throw new Error(payload.error);
  return payload;
}

function isScopeMissing(err: unknown): boolean {
  return err instanceof Error && err.message.includes('youtube_scope_missing');
}

type Tab = 'playlists' | 'liked' | 'recent' | 'search';

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <ul className="divide-y divide-border">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
          <div className="h-10 w-[71px] shrink-0 rounded-md bg-muted" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3 w-3/4 rounded bg-muted" />
            <div className="h-2.5 w-1/3 rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Errors render as a quiet line with Retry — never a blank panel, never a
// giant alert box that dominates a small dashboard tile.
function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground">
      <span className="truncate">Couldn&rsquo;t load — {message}</span>
      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs shrink-0" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function VideoRow({
  title,
  thumb,
  channel,
  meta,
  active,
  onClick,
}: {
  title: string;
  thumb: string;
  channel: string;
  meta?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent/50',
          active && 'bg-accent',
        )}
      >
        {/* 16:9 thumb kept small so rows stay dense in the clamp height. */}
        <img
          src={thumb}
          alt=""
          loading="lazy"
          className="h-10 w-[71px] shrink-0 rounded-md object-cover bg-muted"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium leading-tight">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {channel}
            {meta ? ` · ${meta}` : ''}
          </span>
        </span>
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Data-bound lists
// ---------------------------------------------------------------------------

// Both the liked feed and a playlist's items page the same way, so one list
// component covers both — only the query key + request body differ.
function VideoList({
  queryKey,
  requestBody,
  enabled,
  playingId,
  onPlay,
}: {
  queryKey: readonly unknown[];
  requestBody: Record<string, unknown>;
  enabled: boolean;
  playingId: string | null;
  onPlay: (v: YtVideo) => void;
}) {
  const q = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      ytInvoke<YtVideosResponse>(pageParam ? { ...requestBody, pageToken: pageParam } : requestBody),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextPageToken,
    staleTime: STALE_MS,
    enabled,
    retry: (failureCount, err) => !isScopeMissing(err) && failureCount < 2,
  });

  // Infinite scroll (Kevin, 2026-10-03: "infinite results for youtube for
  // upscrolling searches on phones"). Same sentinel pattern as HomeNewsRail.
  // root: null is deliberate — the panel's scroll container lives in the
  // PARENT (the flex-1 overflow-y-auto div in YouTubePanel), and the nearest
  // scrollable ancestor is what the viewport-rooted observer effectively
  // tracks here; 200px rootMargin starts the fetch before the user hits the
  // bottom so the list feels continuous. The three guards mirror the
  // button's own conditions, so observer and button can never double-fetch:
  // react-query coalesces concurrent fetchNextPage calls anyway.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && q.hasNextPage && !q.isFetchingNextPage) {
          void q.fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
    // q.fetchNextPage is stable; hasNextPage/isFetchingNextPage re-arm the
    // observer with fresh closure state after each page lands.
  }, [q.hasNextPage, q.isFetchingNextPage, q.fetchNextPage]);

  if (q.isPending) return <SkeletonRows />;
  if (q.isError) return <InlineError message={(q.error as Error).message} onRetry={() => q.refetch()} />;

  const videos = q.data.pages.flatMap((p) => p.items);
  if (videos.length === 0) {
    return <p className="px-3 py-6 text-center text-xs text-muted-foreground">Nothing here yet.</p>;
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {videos.map((v) => (
          <VideoRow
            key={v.videoId}
            title={v.title}
            thumb={v.thumb}
            channel={v.channel}
            active={playingId === v.videoId}
            onClick={() => onPlay(v)}
          />
        ))}
      </ul>
      {q.hasNextPage && (
        <div ref={sentinelRef} className="p-2">
          {/* The sentinel wraps the button: scrolling near the end fetches the
              next page automatically (the phone expectation — nobody taps
              "Load more" on a feed), and the button stays as the fallback for
              anything without IntersectionObserver and as a visible target
              for keyboard/screen-reader users. */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            disabled={q.isFetchingNextPage}
            onClick={() => q.fetchNextPage()}
          >
            {q.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </>
  );
}

function PlaylistList({
  enabled,
  onOpen,
}: {
  enabled: boolean;
  onOpen: (p: YtPlaylist) => void;
}) {
  const q = useQuery({
    queryKey: ['yt', 'playlists'],
    queryFn: () => ytInvoke<YtPlaylistsResponse>({ kind: 'playlists' }),
    staleTime: STALE_MS,
    enabled,
    retry: (failureCount, err) => !isScopeMissing(err) && failureCount < 2,
  });

  if (q.isPending) return <SkeletonRows />;
  if (q.isError) return <InlineError message={(q.error as Error).message} onRetry={() => q.refetch()} />;

  if (q.data.items.length === 0) {
    return <p className="px-3 py-6 text-center text-xs text-muted-foreground">No playlists yet.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {q.data.items.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onOpen(p)}
            className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent/50"
          >
            <img
              src={p.thumb}
              alt=""
              loading="lazy"
              className="h-10 w-[71px] shrink-0 rounded-md object-cover bg-muted"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium leading-tight">{p.title}</span>
              <span className="block text-xs text-muted-foreground">
                {p.count} video{p.count === 1 ? '' : 's'}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function YouTubePanel() {
  const [tab, setTab] = useState<Tab>('playlists');
  // YouTube search. draft is what's in the box; submitted is what we have
  // actually paid for. The split is quota discipline, not style: a
  // search.list call costs 100 units of the project's 10,000/day (a list
  // call costs 1), so the API fires ONLY on an explicit submit — never per
  // keystroke. Results then scroll infinitely like every other list.
  const [searchDraft, setSearchDraft] = useState('');
  const [searchSubmitted, setSearchSubmitted] = useState('');
  // Drill-down state for the Playlists tab (null = playlist index).
  const [openPlaylist, setOpenPlaylist] = useState<YtPlaylist | null>(null);
  const [nowPlaying, setNowPlaying] = useState<YtVideo | null>(null);
  // Local watch history lives in state so the Recent tab re-renders the
  // moment a play is recorded (localStorage alone wouldn't trigger that).
  const [history, setHistory] = useState<YtHistoryEntry[]>(() => readYtHistory());
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const qc = useQueryClient();

  const status = useQuery({
    queryKey: ['yt', 'status'],
    queryFn: () => ytInvoke<YtStatus & { error?: string }>({ kind: 'status' }),
    staleTime: STALE_MS,
  });

  const play = useCallback((v: YtVideo) => {
    setNowPlaying(v);
    setHistory(recordYtPlay({ videoId: v.videoId, title: v.title, thumb: v.thumb, channel: v.channel }));
  }, []);

  const playFromHistory = useCallback((e: YtHistoryEntry) => {
    play({ videoId: e.videoId, title: e.title, thumb: e.thumb, channel: e.channel, publishedAt: '' });
  }, [play]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      // google-oauth-start returns { url } (verified in the function source);
      // we bounce the whole window there and Google sends Doc back afterward.
      const { data, error } = await supabase.functions.invoke('google-oauth-start', {
        body: { feature: 'youtube', redirect_to: '/dashboard' },
      });
      if (error) throw new Error(error.message);
      const url = (data as { url?: string })?.url;
      if (!url) throw new Error('No authorization URL returned');
      window.location.assign(url);
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : 'Connect failed');
      setConnecting(false);
    }
  }, []);

  // Rides the same google-disconnect the Calendar settings dialog uses: it
  // removes the user's ONE Google connection (revoking the token at Google,
  // best effort), so YouTube and Calendar sync go together — the dialog copy
  // says so. Exists here because "sign out of YouTube" is where users look
  // for it (Kevin, 2026-10-06: "is there a way to sign out of youtube for
  // user?"), not in Calendar settings.
  const signOut = useCallback(async () => {
    setSigningOut(true);
    try {
      const { error } = await supabase.functions.invoke('google-disconnect', { body: {} });
      if (error) throw new Error(error.message);
      setNowPlaying(null);
      setConfirmSignOut(false);
      await qc.invalidateQueries({ queryKey: ['yt'] });
      // The calendar surfaces watch these; they must flip to "not connected"
      // without a reload.
      void qc.invalidateQueries({ queryKey: ['google-connection'] });
      void qc.invalidateQueries({ queryKey: ['google-events'] });
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : 'Sign out failed');
    } finally {
      setSigningOut(false);
    }
  }, [qc]);

  const connected = status.data?.connected === true && status.data?.hasYouTubeScope === true;
  // A scope-missing error from any list call also means "reconnect", but the
  // status call is the authority for the empty-state; list-level scope errors
  // fall through as inline errors whose Retry is harmless.
  const needsConnect = status.isSuccess && !connected;

  return (
    <section className="flex h-full w-full min-h-0 flex-col rounded-xl border border-border bg-card overflow-hidden">
      {/* Header: wordmark + tab pills */}
      <header className="flex items-center gap-3 border-b border-border px-3 py-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <Youtube className="h-4 w-4 text-red-600" aria-hidden />
          YouTube
        </span>
        <nav className="ml-auto flex items-center gap-1" aria-label="YouTube sections">
          {(
            [
              ['playlists', 'Playlists', ListVideo],
              ['liked', 'Liked', Youtube],
              ['recent', 'Recent', History],
              ['search', 'Search', SearchIcon],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                // Leaving Playlists resets the drill so returning starts at
                // the index — matches how Doc expects tab pills to behave.
                if (key !== 'playlists') setOpenPlaylist(null);
              }}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                tab === key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
          {status.data?.connected === true && (
            <button
              type="button"
              onClick={() => setConfirmSignOut(true)}
              aria-label="Sign out of YouTube"
              title="Sign out of YouTube"
              className="ml-1 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </nav>
      </header>

      <AlertDialog open={confirmSignOut} onOpenChange={setConfirmSignOut}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of YouTube?</AlertDialogTitle>
            <AlertDialogDescription>
              This disconnects your Google account from this workspace — YouTube
              here AND Google Calendar sync, since they share one connection.
              You can reconnect any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={signingOut}
              onClick={(e) => { e.preventDefault(); void signOut(); }}
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Inline player: pinned above the list, list keeps scrolling beneath. */}
      {nowPlaying && (
        <div className="relative shrink-0 border-b border-border bg-black">
          <div className="aspect-video w-full">
            <iframe
              key={nowPlaying.videoId}
              src={`https://www.youtube-nocookie.com/embed/${nowPlaying.videoId}?autoplay=1`}
              title={nowPlaying.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
          <button
            type="button"
            onClick={() => setNowPlaying(null)}
            aria-label="Close player"
            className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        {status.isPending && <SkeletonRows />}

        {status.isError && (
          <InlineError message={(status.error as Error).message} onRetry={() => status.refetch()} />
        )}

        {/* Recent is local-only, so the connect empty-state stays off that
            tab — history remains browsable even before Google is linked. */}
        {needsConnect && tab !== 'recent' && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-8 text-center">
            <Youtube className="h-8 w-8 text-red-600" aria-hidden />
            <p className="text-sm text-muted-foreground">Your playlists and likes, right here.</p>
            <Button size="sm" onClick={connect} disabled={connecting}>
              {connecting ? 'Opening Google…' : 'Connect YouTube'}
            </Button>
            {connectError && <p className="text-xs text-destructive">{connectError}</p>}
          </div>
        )}

        {status.isSuccess && connected && (
          <>
            {tab === 'playlists' && !openPlaylist && (
              <PlaylistList enabled onOpen={setOpenPlaylist} />
            )}

            {tab === 'playlists' && openPlaylist && (
              <>
                <button
                  type="button"
                  onClick={() => setOpenPlaylist(null)}
                  className="flex w-full items-center gap-1 border-b border-border px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span className="truncate">{openPlaylist.title}</span>
                </button>
                <VideoList
                  queryKey={['yt', 'playlistItems', openPlaylist.id] as const}
                  requestBody={{ kind: 'playlistItems', playlistId: openPlaylist.id }}
                  enabled
                  playingId={nowPlaying?.videoId ?? null}
                  onPlay={play}
                />
              </>
            )}

            {tab === 'liked' && (
              <VideoList
                queryKey={['yt', 'liked'] as const}
                requestBody={{ kind: 'liked' }}
                enabled
                playingId={nowPlaying?.videoId ?? null}
                onPlay={play}
              />
            )}

            {tab === 'search' && (
              <>
                <form
                  className="flex items-center gap-2 border-b border-border px-2 py-1.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSearchSubmitted(searchDraft.trim());
                  }}
                >
                  <SearchIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <input
                    type="search"
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    placeholder="Search YouTube…"
                    aria-label="Search YouTube"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={!searchDraft.trim()}>
                    Search
                  </Button>
                </form>
                {searchSubmitted ? (
                  <VideoList
                    queryKey={['yt', 'search', searchSubmitted] as const}
                    requestBody={{ kind: 'search', query: searchSubmitted }}
                    enabled
                    playingId={nowPlaying?.videoId ?? null}
                    onPlay={play}
                  />
                ) : (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                    Type something and press Enter.
                  </p>
                )}
              </>
            )}
          </>
        )}

        {/* Recent works even before/without a connection — it's all local.
            This IS the watch-history surface: YouTube's Data API does not
            expose account watch history to any third-party app, so the only
            possible history is the plays recorded here. Don't "fix" it. */}
        {tab === 'recent' && !status.isPending && (
          history.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              Videos you play here will show up in Recent.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((e) => (
                <VideoRow
                  key={e.videoId}
                  title={e.title}
                  thumb={e.thumb}
                  channel={e.channel}
                  meta={new Date(e.playedAt).toLocaleDateString()}
                  active={nowPlaying?.videoId === e.videoId}
                  onClick={() => playFromHistory(e)}
                />
              ))}
            </ul>
          )
        )}
      </div>
    </section>
  );
}
