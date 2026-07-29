// AccompanimentLane — decorative header row above the track list.
//
// Rendered when session.accompaniment != null. For streaming kinds
// (apple_music, apple_music_album, youtube) it also hosts the
// "Capture from playback" button so the user can record the room
// while the backing plays, converting the streaming backing to a
// WAV file locked to the session.
//
// For kind='file' the lane is purely decorative — the file is already
// loaded as a normal audio track/asset by the StudioEditor effect.

import type React from 'react';
import { useEffect } from 'react';
import { Music, Youtube, Square, CircleDot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Accompaniment } from '@/lib/studio/session';

export interface AccompanimentLaneProps {
  accompaniment: Accompaniment;
  /** Called when the user hits "Capture from playback". */
  onCapture: () => Promise<void>;
  /** True while capture is in-flight — button becomes pulsing Stop. */
  capturing: boolean;
  /** True while any regular take is recording — disables capture button. */
  recordingInProgress: boolean;
  /** Called when user hits Stop mid-capture. */
  onStopCapture: () => Promise<void>;
  /** Ref for YouTube iframe (only used when kind='youtube'). */
  ytIframeRef?: React.MutableRefObject<HTMLIFrameElement | null>;
}

export function AccompanimentLane({
  accompaniment,
  onCapture,
  onStopCapture,
  capturing,
  recordingInProgress,
  ytIframeRef,
}: AccompanimentLaneProps) {
  const isApple =
    accompaniment.kind === 'apple_music' || accompaniment.kind === 'apple_music_album';
  const isYouTube = accompaniment.kind === 'youtube';
  const isFile = accompaniment.kind === 'file';

  // C1: Null the YouTube iframe ref when the kind changes away from 'youtube'
  // or when the component unmounts entirely. This ensures the hook's
  // postMessage calls see null via optional chaining rather than posting to
  // a stale detached iframe after a slow streaming.start() completion.
  useEffect(() => {
    if (isYouTube) return; // ref is actively in use — leave it
    if (ytIframeRef) ytIframeRef.current = null;
  }, [isYouTube, ytIframeRef]);
  useEffect(() => {
    return () => {
      if (ytIframeRef) ytIframeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render using kind-switches so TypeScript narrows the discriminated union.
  const renderMeta = () => {
    if (accompaniment.kind === 'apple_music' || accompaniment.kind === 'apple_music_album') {
      const appleAcc = accompaniment;
      return (
        <>
          {appleAcc.appleMusicArtworkUrl ? (
            <img src={appleAcc.appleMusicArtworkUrl} alt="" className="w-8 h-8 rounded shrink-0" />
          ) : (
            <Music className="w-8 h-8 text-pink-400 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">{appleAcc.title}</div>
            <div className="text-[10px] uppercase tracking-wider text-pink-400">
              Apple Music{appleAcc.kind === 'apple_music_album' ? ' · Album' : ''}
            </div>
          </div>
        </>
      );
    }
    if (accompaniment.kind === 'youtube') {
      return (
        <>
          <Youtube className="w-8 h-8 text-rose-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">{accompaniment.title ?? 'YouTube backing'}</div>
            <div className="text-[10px] uppercase tracking-wider text-rose-500">YouTube</div>
          </div>
        </>
      );
    }
    // kind === 'file'
    return (
      <>
        <Music className="w-8 h-8 text-slate-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm truncate">{accompaniment.title ?? 'Accompaniment'}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">File (locked)</div>
        </div>
      </>
    );
  };

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 flex items-center gap-3">
      {renderMeta()}

      {!isFile &&
        (capturing ? (
          <Button
            size="sm"
            variant="destructive"
            className="animate-pulse"
            onClick={() => void onStopCapture()}
          >
            <Square className="w-3.5 h-3.5 mr-1" fill="currentColor" /> Stop capture
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={recordingInProgress}
            onClick={() => void onCapture()}
            title="Record the room while the backing plays. Future takes will lock to the WAV."
          >
            <CircleDot className="w-3.5 h-3.5 mr-1 text-red-500" /> Capture from playback
          </Button>
        ))}

      {accompaniment.kind === 'youtube' && (
        <iframe
          ref={ytIframeRef}
          className="w-0 h-0 opacity-0 pointer-events-none"
          allow="autoplay"
          src={`https://www.youtube.com/embed/${extractYouTubeId(accompaniment.youtubeUrl)}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
          title="YouTube backing"
        />
      )}
    </div>
  );
}

function extractYouTubeId(url: string): string {
  const m = url.match(/(?:v=|be\/|embed\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : '';
}
