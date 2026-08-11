import { useEffect, useRef, useState } from 'react';
import { GripVertical, Music, Pause, Play, X } from 'lucide-react';
import { useAssistantOptional } from '@/lib/assistant/AssistantProvider';

/**
 * Apple Music body for the popout: drives the MusicKit singleton directly.
 * (The AudioCompanion player would have been free, but its UI only renders
 * inside the score-viewer surfaces — audio started from the assistant on any
 * other page would have been invisible and unstoppable.)
 *
 * Unauthorized listeners get the Apple sign-in sheet on first play; without
 * a subscription MusicKit falls back to previews, which is Apple's rule,
 * not ours.
 */
function AppleMusicBody({ id, kind, artworkUrl, startPaused }: { id: string; kind: 'song' | 'album' | 'playlist'; artworkUrl?: string | null; startPaused?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startPlayback = async () => {
    const { getMusicKit } = await import('@/lib/musicKit');
    const kit = await getMusicKit();
    await kit.setQueue(kind === 'album' ? { album: id } : kind === 'playlist' ? { playlist: id } : { song: id });
    await kit.play();
    setPlaying(true);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Apple's sign-in popup is blocked outside a user click, and this
        // effect runs from an assistant action, not a click. So: already
        // authorized → play; otherwise show the sign-in BUTTON and let the
        // tap be the gesture. (This was "assistant can't access Apple
        // Music", 2026-08-11 — authorize() silently failing on mount.)
        const { isAppleMusicAuthorized } = await import('@/lib/musicKit');
        const authed = await isAppleMusicAuthorized().catch(() => false);
        if (cancelled) return;
        if (!authed) { setNeedsAuth(true); return; }
        // Restored after refresh: queue nothing yet — the play button's tap
        // re-queues and starts (the browser's required gesture).
        if (startPaused) return;
        await startPlayback();
      } catch {
        if (!cancelled) setError("Couldn't start Apple Music playback.");
      }
    })();
    return () => {
      cancelled = true;
      import('@/lib/musicKit')
        .then(({ getMusicKit }) => getMusicKit())
        .then((kit) => kit.stop())
        .catch(() => { /* never played */ });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, kind]);

  const signInAndPlay = async () => {
    try {
      const { authorizeAppleMusic } = await import('@/lib/musicKit');
      const res = await authorizeAppleMusic();
      if (!res.ok) { setError(res.message ?? 'Apple sign-in failed.'); return; }
      setNeedsAuth(false);
      setError(null);
      await startPlayback();
    } catch {
      setError("Couldn't start Apple Music playback.");
    }
  };

  const toggle = async () => {
    try {
      const { getMusicKit } = await import('@/lib/musicKit');
      const kit = await getMusicKit();
      if (playing) { kit.pause(); setPlaying(false); }
      else {
        // After a refresh the queue is empty — set it before playing.
        const q = await kit.queue;
        if (!q || (q.items ?? q._queueItems ?? []).length === 0) {
          await kit.setQueue(kind === 'album' ? { album: id } : kind === 'playlist' ? { playlist: id } : { song: id });
        }
        await kit.play(); setPlaying(true);
      }
    } catch { /* keep the button state honest by not flipping it */ }
  };

  return (
    <div className="flex items-center gap-3 p-3">
      {artworkUrl
        ? <img src={artworkUrl} alt="" className="h-16 w-16 flex-none rounded-md object-cover" />
        : <div className="flex h-16 w-16 flex-none items-center justify-center rounded-md bg-muted"><Music className="h-6 w-6 text-muted-foreground" aria-hidden /></div>}
      <div className="min-w-0 flex-1">
        {error
          ? <p className="text-xs text-muted-foreground">{error}</p>
          : needsAuth
            ? <button type="button" onClick={signInAndPlay} className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted">Sign in to Apple Music</button>
            : <p className="text-xs text-muted-foreground">Apple Music</p>}
      </div>
      {!needsAuth && !error && (
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pause' : 'Play'}
          className="rounded-full border border-border p-2 text-foreground hover:bg-muted"
        >
          {playing ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
        </button>
      )}
    </div>
  );
}

/**
 * A small video window that keeps playing while you carry on.
 *
 * The player used to live in the assistant's results panel, which tied the
 * music to the chat: closing the sheet to look at anything stopped it, and
 * while it was open it took half the sheet away from the conversation. Kevin
 * asked for a window that stays on top while he talks to her, which is the
 * right shape — listening to a recording and asking about it are the same
 * activity, not competing ones.
 *
 * So it is mounted beside the FAB rather than inside the sheet: it outlives
 * the sheet, survives navigation within the app, and stops only when the user
 * closes it.
 *
 * Draggable, because it is deliberately on top of the page and will sooner or
 * later be on top of the one thing you wanted to read.
 */

const WIDTH = 320;
const MARGIN = 16;

export function AssistantMiniPlayer() {
  const assistant = useAssistantOptional();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  // The scheduled-playlist chip shares this floating layer: an event with
  // attached music just started, and this tap is the browser's required
  // user gesture. It renders whether or not something is already playing.
  const chip = assistant?.scheduledPlay ? (
    <div className="fixed bottom-24 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 shadow-xl print:hidden">
      <button
        type="button"
        onClick={() => assistant.acceptScheduledPlay()}
        className="flex items-center gap-2 text-sm font-medium"
      >
        <Play className="h-4 w-4" aria-hidden />
        <span className="max-w-[220px] truncate">{assistant.scheduledPlay.label} — {assistant.scheduledPlay.eventTitle}</span>
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => assistant.dismissScheduledPlay()}
        className="rounded-full p-1 text-muted-foreground hover:bg-muted"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  ) : null;

  if (!assistant?.nowPlaying) return chip;
  const { videoId, title, channel, source, appleId, appleKind, artworkUrl, resumePaused } = assistant.nowPlaying;
  const isApple = source === 'apple' && !!appleId;
  // Older callers set only videoId; a malformed apple entry with no id
  // renders nothing rather than an empty shell.
  if (!isApple && !videoId) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    const el = (e.currentTarget as HTMLElement).closest('[data-mini-player]') as HTMLElement | null;
    if (!el) return;
    const box = el.getBoundingClientRect();
    drag.current = { dx: e.clientX - box.left, dy: e.clientY - box.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    // Clamped to the viewport: dragged off-screen it becomes unreachable,
    // and the only way back would be a reload — which stops the music.
    const w = WIDTH;
    const h = WIDTH * 9 / 16 + 44;
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - w, e.clientX - drag.current.dx)),
      y: Math.max(0, Math.min(window.innerHeight - h, e.clientY - drag.current.dy)),
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    drag.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <>
    {chip}
    <div
      data-mini-player
      className="fixed z-50 overflow-hidden rounded-lg border border-border bg-card shadow-xl print:hidden"
      style={
        pos
          ? { left: pos.x, top: pos.y, width: WIDTH }
          : { left: MARGIN, bottom: MARGIN, width: WIDTH }
      }
    >
      <div className="flex items-center gap-1 border-b border-border bg-muted/40 px-1.5 py-1">
        <button
          type="button"
          aria-label="Move the player"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="cursor-grab touch-none p-0.5 text-muted-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{title || 'Now playing'}</p>
          {channel && <p className="truncate text-[10px] text-muted-foreground">{channel}</p>}
        </div>
        <button
          type="button"
          onClick={() => assistant.setNowPlaying(null)}
          aria-label="Stop playing"
          className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {isApple ? (
        <AppleMusicBody id={appleId!} kind={appleKind ?? 'song'} artworkUrl={artworkUrl} startPaused={resumePaused} />
      ) : (
        <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
          <iframe
            // youtube-nocookie so a rehearsal does not quietly build an ad
            // profile. autoplay because the user asked for it to play.
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId!)}?autoplay=${resumePaused ? 0 : 1}&rel=0`}
            title={title || 'Video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
      )}
    </div>
    </>
  );
}
