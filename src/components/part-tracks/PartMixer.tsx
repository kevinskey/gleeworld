import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
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

/** Imperative API exposed via ref so parent cards can drive playback from
 *  outside the mixer (e.g. a "Play all" button in the piece header). */
export interface PartMixerHandle {
  playAll: () => void;
  pause: () => void;
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
export const PartMixer = forwardRef<PartMixerHandle, PartMixerProps>(({ pieceTitle, tracks }, ref) => {
  // Append a cache-buster so a stale 4xx HTTP-cached response (from before
  // the storage flatten daemon caught up) is bypassed. We bump the session
  // ID every time a new track is detected, which also forces every audio
  // element to remount with a fresh src — the in-code equivalent of the
  // hard-refresh the user otherwise had to do after a new recording.
  const [sessionIdSeed, bumpSession] = useState(() => Math.random().toString(36).slice(2, 8));
  const sessionId = sessionIdSeed;
  const playable = useMemo(
    () => tracks.filter(t => !!t.audio_url).map(t => ({
      ...t,
      audio_url: t.audio_url ? `${t.audio_url}${t.audio_url.includes('?') ? '&' : '?'}cb=${sessionId}` : null,
    })),
    [tracks, sessionId],
  );
  const [enabled, setEnabled] = useState<Set<string>>(() => new Set(playable.map(t => t.id)));
  // Per-track gain (0-1). Independent of mute toggles — when a track is
  // enabled its element volume is set to this gain; when muted, 0.
  const [trackVolume, setTrackVolume] = useState<Record<string, number>>({});
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const refs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const rafRef = useRef<number | null>(null);

  // Track which IDs we've ever seen, so newly arriving tracks (e.g. a fresh
  // upload while the mixer is mounted) start enabled by default — but a
  // track the user explicitly muted stays muted across re-renders.
  const seenIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    // Detect new arrivals *first* so we can force their audio elements to
    // load — otherwise the most recent recording sits at readyState 0 and
    // play() rejects until the user hard-refreshes or toggles chips.
    const newIds: string[] = [];
    for (const t of playable) {
      if (!seenIdsRef.current.has(t.id)) {
        seenIdsRef.current.add(t.id);
        newIds.push(t.id);
      }
    }

    setEnabled(prev => {
      const next = new Set<string>(prev);
      for (const id of newIds) next.add(id);
      // Drop IDs no longer present so an old solo doesn't keep the set frozen.
      const playableIds = new Set(playable.map(t => t.id));
      for (const id of Array.from(next)) {
        if (!playableIds.has(id)) next.delete(id);
      }
      return next;
    });

    // When a new track shows up, bump the session ID. That changes the
    // ?cb=<id> appended to every audio_url, which changes the audio
    // elements' src props, which causes React to remount every <audio>
    // with a fresh source. The browser then loads each from scratch —
    // exactly the behaviour of a hard refresh. Interrupts ongoing
    // playback, but that's the price of "Play all just works after a
    // new take".
    if (newIds.length > 0) {
      bumpSession(Math.random().toString(36).slice(2, 8));
    }
  }, [playable]);

  // Apply volume based on enabled set + per-track gain (mute toggles via
  // volume, not pause — pause drifts on resume).
  useEffect(() => {
    for (const t of playable) {
      const el = refs.current.get(t.id);
      if (!el) continue;
      const gain = trackVolume[t.id] ?? 1;
      el.volume = enabled.has(t.id) ? gain : 0;
    }
  }, [enabled, playable, trackVolume]);

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

  // Expose a play-all imperative handle so the piece card header can
  // trigger playback without owning the mixer's audio refs directly.
  useImperativeHandle(ref, () => ({
    playAll: () => {
      const elements = Array.from(refs.current.values());
      if (elements.length === 0) {
        toast.error('No audio loaded yet — try again in a moment.');
        return;
      }
      // Critical: do everything synchronously inside the user-gesture event.
      // setTimeout (or even an async/await) drops the gesture and Safari /
      // Chrome will silently reject the play() promise for any element that
      // wasn't already playing — which was the "only one part plays" bug.
      for (const el of elements) {
        try {
          // Override any previous mute directly on the DOM so we don't have
          // to wait for the volume useEffect to run on next render. Honor
          // the per-track gain so the user's level mix carries through.
          // (Map el → track id via refs.)
          const id = Array.from(refs.current.entries())
            .find(([, ref]) => ref === el)?.[0];
          el.volume = id ? (trackVolume[id] ?? 1) : 1;
          if (el.readyState < 2) el.load();
        } catch {}
      }
      elements.forEach((el) => {
        const tryPlay = () => {
          const p = el.play();
          if (p && typeof p.then === 'function') {
            p.catch((err: any) => {
              // eslint-disable-next-line no-console
              console.warn('[PartMixer.playAll] play() rejected', { url: el.src, error: err });
            });
          }
        };
        if (el.readyState >= 2) {
          tryPlay();
        } else {
          // Brand-new upload that hasn't finished buffering yet — queue
          // play on canplay so we don't drop it. Browsers honour the
          // gesture for a short window after the click that opened this
          // call, which is enough for the file to stream in.
          const onCanPlay = () => {
            el.removeEventListener('canplay', onCanPlay);
            tryPlay();
          };
          el.addEventListener('canplay', onCanPlay, { once: true });
        }
      });
      // Then update the chip UI to reflect that everything is on.
      setEnabled(new Set(playable.map(t => t.id)));
    },
    pause: () => {
      for (const el of refs.current.values()) el.pause();
    },
  }), [playable, trackVolume]);

  const togglePlay = () => {
    const elements = Array.from(refs.current.values());
    if (elements.length === 0) {
      toast.error('No audio loaded yet — try again in a moment.');
      return;
    }
    if (playing) {
      for (const el of elements) el.pause();
      // setPlaying happens via the audio element's onPause; we don't trust
      // our own state to mirror reality.
      stopPositionLoop();
      return;
    }
    // Fire play() on each element synchronously inside the user-gesture
    // event. The audio element's onPlay handler will flip `playing` to true
    // when the browser actually starts; that way the icon reflects reality.
    let firstError: string | null = null;
    elements.forEach((el) => {
      // If readyState is too low, force a fresh load before play(). Some
      // browsers (notably Safari) return a rejected play() promise when
      // the element is still in HAVE_NOTHING.
      if (el.readyState < 2) {
        try { el.load(); } catch {}
      }
      const p = el.play();
      if (p && typeof p.then === 'function') {
        p.catch((err: any) => {
          if (firstError) return;
          firstError = err?.message ?? err?.name ?? 'play failed';
          const code = el.error?.code;
          const codeMap: Record<number, string> = {
            1: 'aborted',
            2: 'network error',
            3: 'decode error',
            4: 'no supported sources (often a stale cached 403 — hard refresh)',
          };
          const codeText = code ? ` [media error ${code}: ${codeMap[code] ?? 'unknown'}]` : '';
          toast.error(`Couldn't start playback: ${firstError}${codeText}`);
          // eslint-disable-next-line no-console
          console.warn('[PartMixer] play() rejected', {
            url: el.src,
            error: err,
            mediaError: el.error,
            readyState: el.readyState,
            networkState: el.networkState,
            paused: el.paused,
            currentTime: el.currentTime,
            duration: el.duration,
          });
        });
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
          preload="auto"
          onLoadedMetadata={() => onLoadedMetadata(t.id)}
          // Drive playing state from the audio element itself — the only
          // source of truth. If any track starts, the icon shows pause; if
          // the last one pauses/ends, the icon goes back to play.
          onPlay={() => {
            setPlaying(true);
            startPositionLoop();
          }}
          onPause={() => {
            const anyPlaying = Array.from(refs.current.values()).some(a => !a.paused && !a.ended);
            if (!anyPlaying) {
              setPlaying(false);
              stopPositionLoop();
            }
          }}
          onEnded={() => {
            const anyPlaying = Array.from(refs.current.values()).some(a => !a.paused && !a.ended);
            if (!anyPlaying) {
              setPlaying(false);
              stopPositionLoop();
            }
          }}
          onError={(e) => {
            const el = e.currentTarget;
            const attempt = Number(el.dataset.retry ?? '0') + 1;
            if (attempt > 6 || !t.audio_url) return;
            el.dataset.retry = String(attempt);
            const delay = Math.min(8000, 1000 * attempt);
            setTimeout(() => {
              // Strip our session cb so the retry hits the original URL.
              const baseUrl = t.audio_url!.replace(/[?&]cb=[^&]+/, '').replace(/\?$/, '');
              el.src = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}r=${attempt}`;
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
              type="button"
              onClick={(e) => { e.stopPropagation(); toggle(t.id); }}
              title={on ? 'Mute this part' : 'Unmute this part'}
              className={
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold border-2 transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ' +
                (on
                  ? 'bg-violet-600 text-white border-violet-700 hover:bg-violet-700'
                  : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200 line-through')
              }
            >
              {on ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              {t.voice_part}
            </button>
          );
        })}
        {playable.length > 1 && (
          <>
            {playable.some(t => enabled.has(t.id) && enabled.size > 1) && (
              <button
                type="button"
                onClick={() => {
                  // "Solo" the only currently-enabled track, if exactly one is on.
                  // If more than one is on, solo the first on track.
                  const firstOn = playable.find(t => enabled.has(t.id));
                  if (firstOn) soloOnly(firstOn.id);
                }}
                className="h-7 px-2 text-xs rounded-md border border-slate-400 bg-white text-slate-700 hover:bg-slate-100"
                title="Solo the first enabled part"
              >
                Solo
              </button>
            )}
            {enabled.size < playable.length && (
              <button
                type="button"
                onClick={enableAll}
                className="h-7 px-2 text-xs rounded-md border border-violet-500 bg-violet-100 text-violet-800 hover:bg-violet-200"
              >
                Unmute all
              </button>
            )}
          </>
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

      {/* Per-track volume sliders. Lets a singer dial in a balance — soft
          accompaniment, louder soprano they're learning, etc. */}
      <div className="space-y-1.5 rounded-md border bg-white/70 p-2.5">
        <div className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
          Track levels
        </div>
        {playable.map(t => {
          const gain = trackVolume[t.id] ?? 1;
          const on = enabled.has(t.id);
          return (
            <div key={t.id} className="flex items-center gap-2 text-xs">
              <span className={`w-16 truncate font-medium ${on ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                {t.voice_part}
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={gain}
                onChange={(e) => setTrackVolume(prev => ({ ...prev, [t.id]: Number(e.target.value) }))}
                className="flex-1 accent-violet-600"
                aria-label={`Volume for ${t.voice_part}`}
              />
              <span className="w-10 text-right tabular-nums text-muted-foreground">
                {Math.round(gain * 100)}%
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Tap a chip to mute / unmute that part. Pressing play plays every enabled part in sync. The "Unmute all" button brings every part back at once.
      </p>
    </div>
  );
});
PartMixer.displayName = 'PartMixer';

export default PartMixer;
