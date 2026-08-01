// Interactive practice player: per-part volume/solo/mute, pitch-preserved
// tempo, A-B loop on measure boundaries, count-in, "My part" preset.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Pause, Play, RotateCcw, TimerReset } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { getSignedUrl } from '@/utils/storage';
import { createPartTrackEngine, type PartTrackEngine } from './engine';
import { featuredGains, measureBounds } from './playerMath';
import { voicePartsMatch } from '../voiceParts';
import type { PartTrackManifest, PartTrackRender, PartTrackScore } from '../types';

const ROLE_LABELS: Record<string, string> = {
  soprano: 'Soprano', soprano_1: 'Soprano 1', soprano_2: 'Soprano 2',
  alto: 'Alto', alto_1: 'Alto 1', alto_2: 'Alto 2',
  tenor: 'Tenor', tenor_1: 'Tenor 1', tenor_2: 'Tenor 2',
  bass: 'Bass', bass_1: 'Bass 1', bass_2: 'Bass 2',
  piano: 'Piano', other: 'Other',
};

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface Props {
  score: PartTrackScore;
  renders: PartTrackRender[];
  myVoicePart: string | null;
  onListenStateChange?: (playing: boolean, featuredRole: string | null, tempoPct: number) => void;
}

export function PartTrackPlayer({ score, renders, myVoicePart, onListenStateChange }: Props) {
  const manifest = score.manifest as PartTrackManifest;
  const stems = useMemo(() => renders.filter((r) => r.kind === 'stem' && r.part_role), [renders]);
  const roles = useMemo(() => stems.map((s) => s.part_role as string), [stems]);

  const engineRef = useRef<PartTrackEngine | null>(null);
  const [engineState, setEngineState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [loadProgress, setLoadProgress] = useState<[number, number]>([0, 0]);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [tempoPct, setTempoPct] = useState(100);
  const [volumes, setVolumes] = useState<Record<string, number>>(() =>
    Object.fromEntries(roles.map((r) => [r, 1])));
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const [soloed, setSoloed] = useState<Set<string>>(new Set());
  const [countIn, setCountIn] = useState(false);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [featured, setFeatured] = useState<string | null>(null);

  const effectiveGain = useCallback((role: string, vols: Record<string, number>, mut: Set<string>, sol: Set<string>) => {
    if (mut.has(role)) return 0;
    if (sol.size > 0 && !sol.has(role)) return 0;
    return vols[role] ?? 1;
  }, []);

  const applyGains = useCallback((vols: Record<string, number>, mut: Set<string>, sol: Set<string>) => {
    const e = engineRef.current;
    if (!e) return;
    for (const role of roles) e.setGain(role, effectiveGain(role, vols, mut, sol));
  }, [roles, effectiveGain]);

  const ensureEngine = useCallback(async (): Promise<PartTrackEngine | null> => {
    if (engineRef.current) return engineRef.current;
    // Create + resume the context NOW, synchronously within the click
    // gesture — created later (after awaits) it stays suspended and the
    // worklet handshake deadlocks. See engine.ts.
    const ctx = new AudioContext();
    void ctx.resume();
    setEngineState('loading');
    try {
      const inputs = [] as Array<{ role: string; url: string }>;
      for (const stem of stems) {
        const url = await getSignedUrl('parttrack', stem.audio_path, 3600);
        if (!url) throw new Error(`Could not load the ${stem.part_role} track`);
        inputs.push({ role: stem.part_role as string, url });
      }
      const engine = await createPartTrackEngine(inputs, manifest, (l, t) => setLoadProgress([l, t]), ctx);
      engine.onTick(setPosition);
      engineRef.current = engine;
      applyGains(volumes, muted, soloed);
      setEngineState('ready');
      return engine;
    } catch (e) {
      // Surface the real cause — a silent catch here cost a debugging session.
      console.error('PartTrack player failed to initialize:', e);
      ctx.close().catch(() => undefined); // double-close with engine.ts is harmless
      setEngineState('error');
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stems, manifest]);

  useEffect(() => () => {
    engineRef.current?.dispose();
    engineRef.current = null;
  }, []);

  useEffect(() => {
    onListenStateChange?.(playing, featured, tempoPct);
  }, [playing, featured, tempoPct, onListenStateChange]);

  const togglePlay = async () => {
    const engine = await ensureEngine();
    if (!engine) return;
    if (engine.isPlaying()) {
      engine.pause();
      setPlaying(false);
    } else {
      await engine.play();
      setPlaying(true);
    }
  };

  const commitTempo = (pct: number) => {
    setTempoPct(pct);
    engineRef.current?.setTempo(pct / 100);
  };

  const updateVolume = (role: string, v: number) => {
    const next = { ...volumes, [role]: v };
    setVolumes(next);
    applyGains(next, muted, soloed);
  };

  const toggleSet = (set: Set<string>, role: string): Set<string> => {
    const next = new Set(set);
    if (next.has(role)) next.delete(role);
    else next.add(role);
    return next;
  };

  const applyMyPart = () => {
    const mine = roles.find((r) => r !== 'piano' && voicePartsMatch(r, myVoicePart));
    const target = mine ?? null;
    setFeatured(target);
    const gains = featuredGains(roles, target);
    setVolumes(gains);
    const clearedMute = new Set<string>();
    const clearedSolo = new Set<string>();
    setMuted(clearedMute);
    setSoloed(clearedSolo);
    applyGains(gains, clearedMute, clearedSolo);
  };

  const applyLoop = (start: number | null, end: number | null) => {
    setLoopStart(start);
    setLoopEnd(end);
    const e = engineRef.current;
    if (!e) return;
    if (start !== null && end !== null && end >= start) {
      e.setLoop(measureBounds(manifest, start, end));
    } else {
      e.setLoop(null);
    }
  };

  const currentMeasure = manifest.measures.filter((m) => m.seconds <= position).pop()?.number ?? 1;
  const measureOptions = manifest.measures.map((m) => m.number);

  return (
    <div className="space-y-4">
      {/* Transport */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button size="sm" onClick={() => void togglePlay()} disabled={engineState === 'loading'} className="w-24">
          {engineState === 'loading' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : playing ? (
            <><Pause className="w-4 h-4 mr-1" /> Pause</>
          ) : (
            <><Play className="w-4 h-4 mr-1" /> Play</>
          )}
        </Button>
        <Button
          size="sm" variant="ghost" aria-label="Back to start" title="Back to start"
          onClick={() => engineRef.current?.seekSeconds(loopStart !== null ? measureBounds(manifest, loopStart, loopStart).startSec : 0)}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <span className="text-sm tabular-nums text-muted-foreground">
          m. {currentMeasure} · {fmtTime(position)} / {fmtTime(manifest.duration_ms / 1000)}
        </span>
        <div className="flex items-center gap-1.5 ml-auto">
          <TimerReset className="w-4 h-4 text-muted-foreground" />
          <Label htmlFor="pt-count-in" className="text-xs font-normal">Count-in</Label>
          <Switch id="pt-count-in" checked={countIn} onCheckedChange={(v) => {
            setCountIn(v);
            engineRef.current?.setCountIn(v);
          }} />
        </div>
      </div>
      {engineState === 'loading' && (
        <p className="text-xs text-muted-foreground">
          Loading parts… {loadProgress[0]}/{loadProgress[1] || stems.length}
        </p>
      )}
      {engineState === 'error' && (
        <p className="text-xs text-destructive">The audio could not be loaded. Check your connection and try again.</p>
      )}

      {/* Tempo */}
      <div className="flex items-center gap-3">
        <Label className="text-xs w-14 shrink-0">Tempo</Label>
        <Slider
          value={[tempoPct]}
          min={50} max={110} step={1}
          onValueChange={([v]) => setTempoPct(v)}
          onValueCommit={([v]) => commitTempo(v)}
          className="flex-1"
        />
        <span className="text-xs tabular-nums w-10 text-right">{tempoPct}%</span>
      </div>

      {/* A-B loop */}
      <div className="flex items-center gap-2 flex-wrap">
        <Label className="text-xs w-14 shrink-0">Loop</Label>
        <Select
          value={loopStart?.toString() ?? 'none'}
          onValueChange={(v) => applyLoop(v === 'none' ? null : Number(v), loopEnd)}
        >
          <SelectTrigger className="h-8 w-24 text-xs"><SelectValue placeholder="From" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-xs">From…</SelectItem>
            {measureOptions.map((n) => (
              <SelectItem key={n} value={String(n)} className="text-xs">m. {n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={loopEnd?.toString() ?? 'none'}
          onValueChange={(v) => applyLoop(loopStart, v === 'none' ? null : Number(v))}
        >
          <SelectTrigger className="h-8 w-24 text-xs"><SelectValue placeholder="To" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-xs">To…</SelectItem>
            {measureOptions.map((n) => (
              <SelectItem key={n} value={String(n)} className="text-xs">m. {n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(loopStart !== null || loopEnd !== null) && (
          <Button size="sm" variant="ghost" className="text-xs" onClick={() => applyLoop(null, null)}>
            Clear
          </Button>
        )}
        <Button size="sm" variant="outline" className="text-xs ml-auto" onClick={applyMyPart} disabled={!myVoicePart}>
          My part
        </Button>
      </div>

      {/* Part strips */}
      <div className="space-y-2">
        {roles.map((role) => (
          <div key={role} className="flex items-center gap-2">
            <span className="text-sm w-24 shrink-0 truncate">
              {ROLE_LABELS[role] ?? role}
              {featured === role && <Badge variant="secondary" className="ml-1 text-xs">mine</Badge>}
            </span>
            <Slider
              value={[Math.round((volumes[role] ?? 1) * 100)]}
              min={0} max={100} step={1}
              onValueChange={([v]) => updateVolume(role, v / 100)}
              className="flex-1"
            />
            <Button
              size="sm"
              variant={soloed.has(role) ? 'secondary' : 'ghost'}
              className="text-xs w-9 px-0"
              aria-label={`Solo ${ROLE_LABELS[role] ?? role}`}
              onClick={() => {
                const next = toggleSet(soloed, role);
                setSoloed(next);
                applyGains(volumes, muted, next);
              }}
            >
              S
            </Button>
            <Button
              size="sm"
              variant={muted.has(role) ? 'secondary' : 'ghost'}
              className="text-xs w-9 px-0"
              aria-label={`Mute ${ROLE_LABELS[role] ?? role}`}
              onClick={() => {
                const next = toggleSet(muted, role);
                setMuted(next);
                applyGains(volumes, next, soloed);
              }}
            >
              M
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
