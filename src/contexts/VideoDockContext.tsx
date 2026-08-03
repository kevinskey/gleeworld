// Persistent video dock — lets a video keep playing after the user leaves
// the page it started on (Kevin 2026-08-03: "when i go to another page it
// stays on until i cut it off").
//
// Flow: a page plays a YouTube video inline (its own iframe). On unmount,
// the page hands the video here via dock({videoId, title, startAt}) and a
// small fixed-position player re-embeds it (autoplay, resuming at the
// last reported time) OUTSIDE the route tree, so further navigation never
// interrupts it. The X is the only thing that stops it.
//
// The startAt handoff means a brief reload blip at the moment of
// navigation — a plain iframe can't survive an unmount — but playback
// resumes where it was (time comes from the page's postMessage tracker;
// see reference: YouTube embeds stream infoDelivery after a 'listening'
// handshake).
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

export interface DockedVideo {
  /** YouTube video id (the 11-char id, not our row id). */
  videoId: string;
  title: string;
  /** Seconds into the video when the handoff happened. */
  startAt: number;
}

interface VideoDockValue {
  docked: DockedVideo | null;
  dock: (v: DockedVideo) => void;
  closeDock: () => void;
}

const VideoDockContext = createContext<VideoDockValue | null>(null);

export function useVideoDock(): VideoDockValue {
  const ctx = useContext(VideoDockContext);
  if (!ctx) throw new Error('useVideoDock must be used within VideoDockProvider');
  return ctx;
}

export function useVideoDockOptional(): VideoDockValue | null {
  return useContext(VideoDockContext);
}

export function VideoDockProvider({ children }: { children: ReactNode }) {
  const [docked, setDocked] = useState<DockedVideo | null>(null);
  const dock = useCallback((v: DockedVideo) => {
    if (!/^[\w-]{6,20}$/.test(v.videoId)) return; // sanity — goes into an iframe src
    setDocked(v);
  }, []);
  const closeDock = useCallback(() => setDocked(null), []);
  const value = useMemo(() => ({ docked, dock, closeDock }), [docked, dock, closeDock]);
  return <VideoDockContext.Provider value={value}>{children}</VideoDockContext.Provider>;
}

// The floating player itself. Bottom-LEFT so it never collides with the
// assistant FAB (bottom-right); sits above the docked mobile tab bar.
export function VideoDockPlayer() {
  const ctx = useVideoDockOptional();
  if (!ctx?.docked) return null;
  const { docked, closeDock } = ctx;
  const src = `https://www.youtube.com/embed/${docked.videoId}?autoplay=1&start=${Math.max(0, Math.floor(docked.startAt))}&playsinline=1&rel=0`;
  return (
    <div
      className="fixed left-4 z-50 w-[288px] sm:w-[336px] rounded-xl overflow-hidden bg-background/95 backdrop-blur-xl border border-border shadow-2xl bottom-[calc(env(safe-area-inset-bottom,0px)+68px)] md:bottom-4"
      data-testid="video-dock"
    >
      <div className="flex items-center gap-2 pl-3 pr-1 py-1">
        <span className="flex-1 truncate text-xs font-medium text-foreground">{docked.title}</span>
        <button
          type="button"
          aria-label="Stop video"
          title="Stop video"
          onClick={closeDock}
          className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="aspect-video bg-black">
        <iframe
          src={src}
          title={docked.title}
          className="w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
