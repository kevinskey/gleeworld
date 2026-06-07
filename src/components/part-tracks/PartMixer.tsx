import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';

export interface MixerTrack {
  id: string;
  voice_part: string;
  audio_url: string | null;
}

interface PartMixerProps {
  pieceTitle: string;
  tracks: MixerTrack[];
}

/**
 * Multi-track listener: plays all enabled parts in sync. Singers can toggle
 * individual voice parts on/off to hear the full mix or solo their part.
 *
 * Sync strategy: all <audio> elements share a single play/pause command and
 * we resync their currentTime to the master (longest track) on every scrub.
 * For practice tracks this is tight enough; tracks should be recorded against
 * the same downbeat / metronome to stay aligned.
 */
export const PartMixer: React.FC<PartMixerProps> = ({ pieceTitle, tracks }) => {
  // Append a one-time cache-buster so any stale 4xx response sitting in the
  // browser HTTP cache from before the storage flatten daemon caught up is
  // bypassed. The query string doesn't affect storage routing — the proxy
  // matches on path only.
  const sessionId = useMemo(() => Math.random().toString(36).slice(2, 8), []);
  const playable = useMemo(
    () => tracks.filter(t => !!t.audio_url).map(t => ({
      ...t,
      audio_url: t.audio_url ? `${t.audio_url}${t.audio_url.includes('?') ? '&' : '?'}cb=${sessionId}` : null,
    })),
    [tracks, sessionId],
  );
  const [enabled, setEnabled] = useState<Set<string>>(() => new Set(playable.map(t => t.id)));
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const refs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const rafRef = useRef<number | null>(null);

  // Keep enabled set in sync if tracks change.
  useEffect(() => {
    setEnabled(prev => {
      const next = new Set<string>();
      for (const t of playable) if (prev.has(t.id) || prev.size === 0) next.add(t.id);
      return next;
    });
  }, [playable]);

  // Apply volume based on enabled set (mute toggles via volume, not pause —
  // pause drifts on resume).
  useEffect(() => {
    for (const t of playable) {
      const el = refs.current.get(t.id);
      if (!el) continue;
      el.volume = enabled.has(t.id) ? 1 : 0;
    }
  }, [enabled, playable]);

  // Track duration = longest of any loaded track.
  const onLoadedMetadata = (id: string) => {
    const el = refs.current.get(id);
    if (!el) return;
    setDuration(d => Math.max(d, el.duration || 0));
  };

  const startPositionLoop = () => {
    const tick = () => {
      const longest = Array.from(refs.current.values()).reduce(
        (max, el) => (el.duration > max.duration ? el : max),
        Array.from(refs.current.values())[0],
      );
      if (longest) setPosition(longest.currentTime);
      // Auto-stop when the longest track ends.
      if (longest && longest.ended) {
        setPlaying(false);
        for (const el of refs.current.values()) el.pause();
        setPosition(0);
        for (const el of refs.current.values()) el.currentTime = 0;
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const stopPositionLoop = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  useEffect(() => {
    return () => {
      stopPositionLoop();
      for (const el of refs.current.values()) el.pause();
    };
  }, []);

  const togglePlay = () => {
    if (playing) {
      for (const el of refs.current.values()) el.pause();
      setPlaying(false);
      stopPositionLoop();
      return;
    }
    // Reset every track to the same scrub time before kicking off — drift
    // safety net so multi-part mixes stay aligned.
    const target = position;
    const elements = Array.from(refs.current.values());
    if (elements.length === 0) {
      toast.error('No audio loaded yet — try again in a moment.');
      return;
    }
    for (const el of elements) {
      try { el.currentTime = target; } catch {}
    }
    // Fire each play() WITHOUT awaiting — keeping the user-gesture context on
    // every call. Track errors per-element so we can surface them instead of
    // silently swallowing them.
    let started = 0;
    let firstError: string | null = null;
    elements.forEach((el) => {
      const p = el.play();
      // Some browsers return undefined from play(); guard before .catch.
      if (p && typeof p.then === 'function') {
        p.then(() => {
          started += 1;
          if (started === 1) {
            setPlaying(true);
            startPositionLoop();
          }
        }).catch((err: any) => {
          if (!firstError) {
            firstError = err?.message ?? err?.name ?? 'play failed';
            const code = el.error?.code;
            const codeText = code === 4
              ? ' (no supported sources — browser likely has a stale 403 cached; try a hard refresh)'
              : '';
            toast.error(`Couldn't start playback: ${firstError}${codeText}`);
            // eslint-disable-next-line no-console
            console.warn('[PartMixer] play() rejected', { url: el.src, error: err, mediaError: el.error });
          }
        });
      } else {
        setPlaying(true);
        startPositionLoop();
      }
    });
  };

  const restart = () => {
    for (const el of refs.current.values()) {
      el.pause();
      el.currentTime = 0;
    }
    setPosition(0);
    setPlaying(false);
    stopPositionLoop();
  };

  const onScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    setPosition(t);
    for (const el of refs.current.values()) el.currentTime = t;
  };

  const toggle = (id: string) => {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const soloOnly = (id: string) => {
    setEnabled(new Set([id]));
  };

  const enableAll = () => {
    setEnabled(new Set(playable.map(t => t.id)));
  };

  const mmss = (s: number) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2, '0')}`;
  };

  if (playable.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic px-1">
        No audio uploaded yet for this piece.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 p-3">
      {/* Hidden audio elements — one per playable track. New uploads can 403
          for a few seconds while the storage flatten daemon catches up; on
          error we retry the load with an increasing delay so the user
          doesn't have to refresh the page. */}
      {playable.map(t => (
        <audio
          key={t.id}
          ref={el => {
            if (el) refs.current.set(t.id, el);
            else refs.current.delete(t.id);
          }}
          src={t.audio_url ?? undefined}
          // No crossOrigin: the storage origin returns a Set-Cookie header
          // alongside Access-Control-Allow-Origin:*, and Chrome rejects that
          // combination under crossOrigin="anonymous" with
          // MEDIA_ERR_SRC_NOT_SUPPORTED. Plain playback (no canvas/AudioContext
          // access) doesn't need CORS opt-in.
          preload="auto"
          onLoadedMetadata={() => onLoadedMetadata(t.id)}
          onError={(e) => {
            const el = e.currentTarget;
            const attempt = Number(el.dataset.retry ?? '0') + 1;
            if (attempt > 6 || !t.audio_url) return;
            el.dataset.retry = String(attempt);
            const delay = Math.min(8000, 1000 * attempt);
            setTimeout(() => {
              // Bust any HTTP cache for the retry.
              el.src = `${t.audio_url}${t.audio_url!.includes('?') ? '&' : '?'}r=${attempt}`;
              el.load();
            }, delay);
          }}
        />
      ))}

      {/* Voice-part toggles */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mr-1">
          Parts:
        </span>
        {playable.map(t => {
          const on = enabled.has(t.id);
          return (
            <button
              key={t.id}
              onClick={() => toggle(t.id)}
              onDoubleClick={() => soloOnly(t.id)}
              title={on ? 'Mute (double-click to solo)' : 'Unmute'}
              className="focus:outline-none"
            >
              <Badge
                variant={on ? 'default' : 'outline'}
                className={on
                  ? 'bg-violet-600 hover:bg-violet-700 text-white border-0 cursor-pointer'
                  : 'cursor-pointer opacity-60 hover:opacity-100'}
              >
                {on ? <Volume2 className="h-3 w-3 mr-1" /> : <VolumeX className="h-3 w-3 mr-1" />}
                {t.voice_part}
              </Badge>
            </button>
          );
        })}
        {enabled.size < playable.length && (
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={enableAll}>
            All
          </Button>
        )}
      </div>

      {/* Transport */}
      <div className="flex items-center gap-3">
        <Button size="icon" variant="default" onClick={togglePlay} className="h-9 w-9 rounded-full">
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={restart} className="h-9 w-9" title="Restart">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <span className="font-mono text-xs tabular-nums text-muted-foreground min-w-[3rem]">
          {mmss(position)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.05}
          value={position}
          onChange={onScrub}
          className="flex-1 accent-violet-600"
          aria-label={`Scrub ${pieceTitle}`}
        />
        <span className="font-mono text-xs tabular-nums text-muted-foreground min-w-[3rem] text-right">
          {mmss(duration)}
        </span>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Tap a part to mute / unmute. Double-tap to solo. "All" re-enables every part.
      </p>
    </div>
  );
};

export default PartMixer;
