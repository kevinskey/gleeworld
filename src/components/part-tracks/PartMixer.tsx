import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';

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
  const playable = useMemo(() => tracks.filter(t => !!t.audio_url), [tracks]);
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

  const togglePlay = async () => {
    if (playing) {
      for (const el of refs.current.values()) el.pause();
      setPlaying(false);
      stopPositionLoop();
      return;
    }
    // Reset to a common time before playing — drift safety net.
    const target = position;
    for (const el of refs.current.values()) el.currentTime = target;
    try {
      await Promise.all(Array.from(refs.current.values()).map(el => el.play()));
      setPlaying(true);
      startPositionLoop();
    } catch {
      // user-gesture failed or src not ready
    }
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
      {/* Hidden audio elements — one per playable track */}
      {playable.map(t => (
        <audio
          key={t.id}
          ref={el => {
            if (el) refs.current.set(t.id, el);
            else refs.current.delete(t.id);
          }}
          src={t.audio_url ?? undefined}
          preload="metadata"
          onLoadedMetadata={() => onLoadedMetadata(t.id)}
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
