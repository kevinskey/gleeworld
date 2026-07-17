// Drums Player — same-size card as the other Music Tools, but instead
// of an SVG cartoon we render an actual photo of each instrument and
// overlay invisible hit-zone buttons positioned with absolute coords.
// The image is the visual; the rectangles on top capture taps.
//
// Self-hosted images at /img/drums/<kit>.jpg|png. Samples still come
// from /soundfonts/ via smplr (FluidR3_GM).

import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { Soundfont } from 'smplr';
import { cn } from '@/lib/utils';
import { forceAudioUnlock } from '@/lib/audioTools/unlock';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

type DrumKit = 'timpani' | 'djembe' | 'drumset';

interface DrumsPlayerProps {
  className?: string;
  /** When set, the kit selector tabs are hidden and this kit is shown.
   *  Used by InstrumentPlayer to embed a single drum kit inside its
   *  own card without a competing UI. */
  kit?: DrumKit;
  /** When true, render without the outer card chrome so the parent can
   *  control wrapping. */
  embedded?: boolean;
}

// Same fix as InstrumentPlayer: the self-hosted /soundfonts/{name}-mp3.js
// files were never deployed (404 → smplr parsed nginx's 404 HTML → silent).
// Point at gleitz's public MIDI.js soundfont CDN (allowlisted in the CSP
// connect-src); works on web and Capacitor.
const SOUNDFONT_BASE = 'https://gleitz.github.io/midi-js-soundfonts/FatBoy/';
const IMG_BASE = '/img/drums/';

// Sample IDs prefixed with `__synth:` are NOT loaded from the soundfont
// directory — they're built on the fly with Tone.js inside the player.
// FluidR3's general-purpose drum samples (woodblock, synth_drum,
// taiko_drum) sound like 1980s drum-machine knockoffs when used outside
// their intended role, so the canonical kit pieces (kick, snare, hi-hats,
// crash, ride) are all synthesized for a realistic acoustic feel. The
// toms still use melodic_tom because that one actually sounds like a
// tom.
const SYNTH_CRASH    = '__synth:crash';
const SYNTH_RIDE     = '__synth:ride';
const SYNTH_HIHAT_C  = '__synth:hihat-closed';
const SYNTH_HIHAT_O  = '__synth:hihat-open';
const SYNTH_SNARE    = '__synth:snare';
const SYNTH_KICK     = '__synth:kick';

const KIT_SAMPLES: Record<DrumKit, string[]> = {
  timpani:  ['timpani'],
  djembe:   ['taiko_drum'],
  // Only the toms still load from the soundfont; everything else is
  // a Tone.js synth voice built lazily on the fly.
  drumset:  ['melodic_tom'],
};

const KIT_IMAGES: Record<DrumKit, { src: string; alt: string }> = {
  timpani:  { src: `${IMG_BASE}timpani.jpg`,  alt: 'Orchestral timpani' },
  djembe:   { src: `${IMG_BASE}djembe.jpg`,   alt: 'West African djembe drum' },
  drumset:  { src: `${IMG_BASE}drumset.png`,  alt: 'Acoustic drum kit' },
};

// Each hit zone is described as percentages of the image so the layout
// scales with the card size. left/top/width/height all percent of the
// IMAGE box (not the card). label is shown briefly on tap.
interface HitZone {
  id: string;
  label: string;
  sample: string;
  note: string;
  velocity?: number;
  shape: 'rect' | 'circle';
  // Centered coords for circles; top-left for rects. All in %.
  left: number; top: number; width: number; height: number;
}

// Timpani: 4 kettledrums in a row. The photo shows a real orchestral
// setup so each zone lands on its own drumhead. Drum heads occupy the
// upper third of the image.
const TIMPANI_ZONES: HitZone[] = [
  { id: 'tim-eb', label: 'E♭', sample: 'timpani', note: 'D#2', shape: 'circle', left: 14, top: 32, width: 18, height: 22 },
  { id: 'tim-f',  label: 'F',  sample: 'timpani', note: 'F2',  shape: 'circle', left: 37, top: 32, width: 20, height: 24 },
  { id: 'tim-g',  label: 'G',  sample: 'timpani', note: 'G2',  shape: 'circle', left: 61, top: 32, width: 20, height: 24 },
  { id: 'tim-a',  label: 'A',  sample: 'timpani', note: 'A2',  shape: 'circle', left: 85, top: 32, width: 18, height: 22 },
];

// Djembe technique → zone mapping:
//   • Bass (Gun/Goum) — open palm in the CENTER of the head. Lowest pitch.
//   • Tone (Don/Doum) — fingers flat on the mid-radius of the head. Mid.
//   • Slap (Pa/Tak)   — fingertips at the very RIM. Highest, sharp crack.
//
// The three zones are concentric, so render order matters: largest
// (slap) first, smallest (bass) LAST. Later items in this array render
// ON TOP via absolute positioning, so the small bass center intercepts
// dead-center clicks before the slap ring underneath gets them.
// Djembe photo is now cropped to a ~square 375×360 so the card matches
// the height of the other Music Tools. The drumhead pixel position
// stayed the same, but it's a larger fraction of the shorter image,
// so top + heights are rescaled to keep the zones over the head.
const DJEMBE_ZONES: HitZone[] = [
  { id: 'dj-slap', label: 'Slap', sample: 'taiko_drum', note: 'D5', velocity: 105, shape: 'circle', left: 50, top: 30, width: 56, height: 34 },
  { id: 'dj-tone', label: 'Tone', sample: 'taiko_drum', note: 'G3', velocity: 95,  shape: 'circle', left: 50, top: 30, width: 36, height: 22 },
  { id: 'dj-bass', label: 'Bass', sample: 'taiko_drum', note: 'C2', velocity: 115, shape: 'circle', left: 50, top: 30, width: 18, height: 12 },
];

const DRUMSET_ZONES: HitZone[] = [
  { id: 'crash',   label: 'Crash',   sample: SYNTH_CRASH,   note: 'G4', shape: 'circle', left: 14, top: 18, width: 26, height: 14 },
  { id: 'hihat-c', label: 'Hi-hat',  sample: SYNTH_HIHAT_C, note: 'C5', shape: 'circle', left: 30, top: 50, width: 22, height: 12 },
  { id: 'hihat-o', label: 'Open HH', sample: SYNTH_HIHAT_O, note: 'C5', shape: 'circle', left: 30, top: 40, width: 22, height: 8  },
  { id: 'tom-hi',  label: 'Tom 1',   sample: 'melodic_tom', note: 'G3', shape: 'circle', left: 40, top: 38, width: 18, height: 14 },
  { id: 'tom-mid', label: 'Tom 2',   sample: 'melodic_tom', note: 'D3', shape: 'circle', left: 56, top: 40, width: 18, height: 14 },
  { id: 'tom-lo',  label: 'Floor',   sample: 'melodic_tom', note: 'A2', shape: 'circle', left: 80, top: 60, width: 20, height: 16 },
  { id: 'ride',    label: 'Ride',    sample: SYNTH_RIDE,    note: 'C5', shape: 'circle', left: 80, top: 38, width: 22, height: 12 },
  { id: 'snare',   label: 'Snare',   sample: SYNTH_SNARE,   note: 'C2', shape: 'circle', left: 58, top: 58, width: 20, height: 16 },
  { id: 'kick',    label: 'Kick',    sample: SYNTH_KICK,    note: 'C1', shape: 'circle', left: 42, top: 78, width: 28, height: 20 },
];

const DEFAULT_ZONES: Record<DrumKit, HitZone[]> = {
  timpani: TIMPANI_ZONES,
  djembe:  DJEMBE_ZONES,
  drumset: DRUMSET_ZONES,
};

// localStorage key — local draft a single editor sees while dragging,
// before they publish to the server.
const ZONE_OVERRIDES_KEY = 'gw_drum_zone_overrides';
// Supabase row id for the single platform-wide drum-zone config.
const SERVER_ZONE_ID = 'global';

function loadLocalOverrides(): Partial<Record<DrumKit, HitZone[]>> {
  try {
    const raw = localStorage.getItem(ZONE_OVERRIDES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Record<DrumKit, HitZone[]>>;
  } catch {
    return {};
  }
}

function saveLocalOverrides(overrides: Partial<Record<DrumKit, HitZone[]>>) {
  try { localStorage.setItem(ZONE_OVERRIDES_KEY, JSON.stringify(overrides)); } catch { /* ignore quota */ }
}

// Pull the platform-wide zone config from Supabase.
async function fetchServerZones(): Promise<Partial<Record<DrumKit, HitZone[]>>> {
  const { data, error } = await supabase
    .from('gw_drum_zone_config')
    .select('zones')
    .eq('id', SERVER_ZONE_ID)
    .maybeSingle();
  if (error || !data) return {};
  return (data.zones as Partial<Record<DrumKit, HitZone[]>>) ?? {};
}

// Write the full zone config to Supabase. Requires authenticated session
// (RLS policy permits any signed-in user; UI gates this to the edit
// checkbox so it's not totally exposed).
async function publishServerZones(all: Record<DrumKit, HitZone[]>): Promise<boolean> {
  const { error } = await supabase
    .from('gw_drum_zone_config')
    .upsert({ id: SERVER_ZONE_ID, zones: all, updated_at: new Date().toISOString() });
  return !error;
}

export function DrumsPlayer({ className, kit: kitProp, embedded = false }: DrumsPlayerProps) {
  const [kitState, setKitState] = useState<DrumKit>('drumset');
  // When parent supplies `kit`, use that; otherwise fall back to internal
  // tab selector state.
  const kit = kitProp ?? kitState;
  const setKit = (k: DrumKit) => { if (!kitProp) setKitState(k); };
  const [loading, setLoading] = useState(true);
  const [showZones, setShowZones] = useState(false);
  // Edit mode: drag zones around to position them on the photo. Tap +
  // shift to resize. Positions persist to localStorage per kit so the
  // user only has to do this once per device.
  const [editingState, setEditingState] = useState(false);
  const { user } = useAuth();
  // Only platform / tenant admins can move zones — students and visitors
  // never see the Edit toggle. Server RLS enforces the same on the
  // publish path, so a determined non-admin can't write either.
  const { profile } = useUserRole();
  const canEdit = !!(profile?.is_admin || profile?.is_super_admin);
  // Force-off when the user isn't an admin, so any drag handlers gated
  // on `editing` simply don't run.
  const editing = canEdit && editingState;
  const setEditing = (v: boolean) => setEditingState(canEdit && v);
  // Live, mutable copy of zones per kit. Initially seeded from local
  // draft + DEFAULT_ZONES; the server config overlays once the fetch
  // resolves in the useEffect below.
  const [zonesByKit, setZonesByKit] = useState<Record<DrumKit, HitZone[]>>(() => {
    const local = loadLocalOverrides();
    return {
      timpani: local.timpani ?? DEFAULT_ZONES.timpani,
      djembe:  local.djembe  ?? DEFAULT_ZONES.djembe,
      drumset: local.drumset ?? DEFAULT_ZONES.drumset,
    };
  });
  const [publishing, setPublishing] = useState(false);
  // Fetch the platform-wide zone config once. Server takes precedence
  // over the local draft so a freshly-opened browser sees what's been
  // published. The current editor's local draft (if any) still wins on
  // top of that for them specifically — they're mid-edit.
  useEffect(() => {
    let cancelled = false;
    fetchServerZones().then((server) => {
      if (cancelled) return;
      const local = loadLocalOverrides();
      setZonesByKit({
        timpani: local.timpani ?? server.timpani ?? DEFAULT_ZONES.timpani,
        djembe:  local.djembe  ?? server.djembe  ?? DEFAULT_ZONES.djembe,
        drumset: local.drumset ?? server.drumset ?? DEFAULT_ZONES.drumset,
      });
    });
    return () => { cancelled = true; };
  }, []);
  const imageRef = useRef<HTMLImageElement>(null);
  // Currently-dragging zone — captures the offset from the zone's center
  // to the pointer's location at drag-start so the zone follows the
  // pointer without snapping its center under the finger.
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const samplersRef = useRef<Map<string, Soundfont>>(new Map());
  // Bag of synth voices for the kit pieces that aren't sample-driven.
  // Each entry is built lazily on first use and reused across the session.
  const synthsRef = useRef<Map<string, any>>(new Map());
  const [hitId, setHitId] = useState<string | null>(null);
  const hitTimerRef = useRef<number | null>(null);
  // Active "roll" interval per zone (timpani only). Holding a pad fires
  // rapid repeat hits at ~15 Hz with slight velocity variance until the
  // pointer is released — that's the orchestral timpani roll feel.
  const rollTimersRef = useRef<Map<string, number>>(new Map());

  // Load the sample packs the active kit needs; reuse anything already
  // loaded so kit switching doesn't re-download.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const needed = KIT_SAMPLES[kit];
    const ctx = Tone.getContext().rawContext as AudioContext;
    const promises = needed.map(async (name) => {
      let player = samplersRef.current.get(name);
      if (!player) {
        player = new Soundfont(ctx, {
          instrument: name,
          instrumentUrl: `${SOUNDFONT_BASE}${name}-mp3.js`,
          // Route to speakers via the constructor; smplr's player has no
          // `.output` AudioNode, so the old player.output.connect() threw
          // and left the voice silent.
          destination: ctx.destination,
        });
        samplersRef.current.set(name, player);
        await player.load;
      } else {
        await player.load;
      }
    });
    Promise.all(promises).then(() => { if (!cancelled) setLoading(false); })
      .catch((err) => {
        console.warn('[DrumsPlayer] load failed', err);
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [kit]);

  // Lazy-build each synth voice once. Settings tuned per-piece to read
  // as the real instrument:
  //   • Kick — MembraneSynth with a steep pitch envelope (~120→48 Hz)
  //     gives the classic "thump" of a 22" bass drum.
  //   • Snare — NoiseSynth (high-passed) for the snare-wire buzz layered
  //     with a quick MembraneSynth crack for the head attack.
  //   • Hi-hat (closed/open) — MetalSynth with very short / medium decay.
  //   • Crash / Ride — MetalSynth with cymbal-style harmonics.
  const buildSynth = (id: string) => {
    switch (id) {
      case SYNTH_KICK: {
        const k = new Tone.MembraneSynth({
          pitchDecay: 0.05,
          octaves: 6,
          envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.4 },
        }).toDestination();
        k.volume.value = -2;
        return k;
      }
      case SYNTH_SNARE: {
        // Two-voice snare: noise (wires) + membrane (head attack).
        const noise = new Tone.NoiseSynth({
          noise: { type: 'white' },
          envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.04 },
        });
        const hp = new Tone.Filter(1500, 'highpass');
        noise.chain(hp, Tone.getDestination());
        noise.volume.value = -8;
        const body = new Tone.MembraneSynth({
          pitchDecay: 0.02,
          octaves: 3,
          envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.1 },
        }).toDestination();
        body.volume.value = -10;
        return {
          triggerAttackRelease: (note: string, dur: string) => {
            noise.triggerAttackRelease(dur);
            body.triggerAttackRelease(note, dur);
          },
        };
      }
      case SYNTH_HIHAT_C: {
        const h = new Tone.MetalSynth({
          envelope: { attack: 0.001, decay: 0.05, release: 0.04, attackCurve: 'exponential' },
          harmonicity: 5.1,
          modulationIndex: 32,
          resonance: 8000,
          octaves: 0.5,
        }).toDestination();
        h.volume.value = -22;
        return h;
      }
      case SYNTH_HIHAT_O: {
        const h = new Tone.MetalSynth({
          envelope: { attack: 0.001, decay: 0.35, release: 0.2, attackCurve: 'exponential' },
          harmonicity: 5.1,
          modulationIndex: 32,
          resonance: 8000,
          octaves: 0.6,
        }).toDestination();
        h.volume.value = -22;
        return h;
      }
      case SYNTH_CRASH: {
        // Real crash cymbal sample served from /sounds/crash.mp3.
        // Implemented with raw Web Audio so rapid taps overlap — each
        // hit spawns a fresh BufferSourceNode pinned to the same
        // decoded AudioBuffer, letting the previous wash continue
        // while a new strike rings on top. (Tone.Player cancels its
        // previous source on .start(), which sounds wrong for cymbals.)
        const ctx = Tone.getContext().rawContext as AudioContext;
        const gain = ctx.createGain();
        gain.gain.value = 1.1;
        gain.connect(ctx.destination);
        let buffer: AudioBuffer | null = null;
        fetch('/sounds/crash.mp3')
          .then((r) => r.arrayBuffer())
          .then((b) => ctx.decodeAudioData(b))
          .then((decoded) => { buffer = decoded; })
          .catch((err) => console.warn('[Crash] sample load failed', err));
        return {
          triggerAttackRelease: () => {
            if (!buffer) return;
            const src = ctx.createBufferSource();
            src.buffer = buffer;
            src.connect(gain);
            src.start();
          },
        };
      }
      case SYNTH_RIDE: {
        const r = new Tone.MetalSynth({
          envelope: { attack: 0.001, decay: 0.4, release: 0.5, attackCurve: 'exponential' },
          harmonicity: 3.2,
          modulationIndex: 24,
          resonance: 2200,
          octaves: 0.6,
        }).toDestination();
        r.volume.value = -14;
        return r;
      }
    }
    return null;
  };
  const ensureSynth = (id: string) => {
    let s = synthsRef.current.get(id);
    if (!s) { s = buildSynth(id); if (s) synthsRef.current.set(id, s); }
    return s;
  };

  const fireHit = (zone: HitZone, velocityOverride?: number) => {
    if (zone.sample.startsWith('__synth:')) {
      const s = ensureSynth(zone.sample);
      if (s) {
        // Pick a duration that matches the piece's natural sustain.
        const dur = zone.sample === SYNTH_CRASH ? '4n'
                  : zone.sample === SYNTH_HIHAT_O ? '8n'
                  : zone.sample === SYNTH_HIHAT_C ? '32n'
                  : zone.sample === SYNTH_SNARE ? '16n'
                  : zone.sample === SYNTH_KICK ? '8n'
                  : '16n';
        s.triggerAttackRelease(zone.note, dur);
      }
    } else {
      const player = samplersRef.current.get(zone.sample);
      if (!player) return;
      player.start({
        note: zone.note,
        velocity: velocityOverride ?? zone.velocity ?? 100,
      });
    }
    setHitId(zone.id);
    if (hitTimerRef.current) window.clearTimeout(hitTimerRef.current);
    hitTimerRef.current = window.setTimeout(() => setHitId(null), 180);
  };

  const hit = (zone: HitZone) => {
    forceAudioUnlock();
    Tone.start().catch(() => {});
    fireHit(zone);
  };

  // Begin a sustained timpani roll on this pad — rapid repeated strikes
  // with slight tempo + velocity variance so it sounds like a real
  // tremolo rather than a metronomic loop. Idempotent: if a roll is
  // already running on this pad, the existing interval is kept.
  const startRoll = (zone: HitZone) => {
    forceAudioUnlock();
    Tone.start().catch(() => {});
    if (rollTimersRef.current.has(zone.id)) return;
    fireHit(zone, 95);
    const tick = () => {
      // Velocity: 75–105, tempo: 55–75 ms (≈ 13–18 strokes/sec).
      fireHit(zone, 75 + Math.floor(Math.random() * 30));
      const next = 55 + Math.floor(Math.random() * 20);
      const handle = window.setTimeout(tick, next);
      rollTimersRef.current.set(zone.id, handle);
    };
    const handle = window.setTimeout(tick, 65);
    rollTimersRef.current.set(zone.id, handle);
  };

  const stopRoll = (zoneId: string) => {
    const handle = rollTimersRef.current.get(zoneId);
    if (handle !== undefined) {
      window.clearTimeout(handle);
      rollTimersRef.current.delete(zoneId);
    }
  };

  // Clean up any in-flight roll when the kit changes / component unmounts.
  useEffect(() => {
    return () => {
      rollTimersRef.current.forEach((h) => window.clearTimeout(h));
      rollTimersRef.current.clear();
    };
  }, [kit]);

  const image = KIT_IMAGES[kit];
  const zones = zonesByKit[kit];

  // Update a single zone for the active kit. Saves to localStorage as a
  // DRAFT — nothing is visible to other users until the editor hits
  // "Publish".
  const updateZone = (zoneId: string, patch: Partial<HitZone>) => {
    setZonesByKit((prev) => {
      const next = { ...prev };
      next[kit] = next[kit].map((z) => (z.id === zoneId ? { ...z, ...patch } : z));
      const overrides = loadLocalOverrides();
      overrides[kit] = next[kit];
      saveLocalOverrides(overrides);
      return next;
    });
  };

  // Reset the active kit's zones to the bundled defaults (clears the
  // local draft for this kit).
  const resetKit = () => {
    setZonesByKit((prev) => ({ ...prev, [kit]: DEFAULT_ZONES[kit] }));
    const overrides = loadLocalOverrides();
    delete overrides[kit];
    saveLocalOverrides(overrides);
  };

  // Publish the local draft to the server so every other user sees the
  // edited zones the next time they open the Drums card.
  const publishZones = async () => {
    if (!user) {
      toast.error('Sign in to publish drum zones for everyone.');
      return;
    }
    setPublishing(true);
    try {
      const ok = await publishServerZones(zonesByKit);
      if (ok) {
        // Clear local draft now that the server is the source of truth;
        // otherwise this device would keep showing the same coords even
        // if someone else later re-publishes a different layout.
        saveLocalOverrides({});
        toast.success('Drum zones published for all users.');
      } else {
        toast.error('Publish failed — check your permissions.');
      }
    } finally {
      setPublishing(false);
    }
  };

  // Drag helpers — convert pointer position to image-relative percentages.
  const pctFromPointer = (e: React.PointerEvent): { left: number; top: number } | null => {
    const img = imageRef.current;
    if (!img) return null;
    const r = img.getBoundingClientRect();
    return {
      left: ((e.clientX - r.left) / r.width)  * 100,
      top:  ((e.clientY - r.top)  / r.height) * 100,
    };
  };

  const handleEditPointerDown = (zone: HitZone, e: React.PointerEvent) => {
    const pos = pctFromPointer(e);
    if (!pos) return;
    (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
    // Allow the user to grab anywhere on the zone — record the click
    // offset from the zone's center so the zone doesn't snap.
    dragRef.current = {
      id: zone.id,
      offsetX: pos.left - zone.left,
      offsetY: pos.top  - zone.top,
    };
  };

  const handleEditPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const pos = pctFromPointer(e);
    if (!pos) return;
    // Clamp inside the image so a dropped zone can't disappear off-screen.
    const left = Math.max(0, Math.min(100, pos.left - drag.offsetX));
    const top  = Math.max(0, Math.min(100, pos.top  - drag.offsetY));
    updateZone(drag.id, { left, top });
  };

  const handleEditPointerUp = () => {
    dragRef.current = null;
  };

  const body = (
    <>
      {!embedded && (
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">Drums</div>
          <div className="inline-flex rounded-md border border-border p-0.5 text-[11px] bg-muted/30">
            {(['timpani', 'djembe', 'drumset'] as DrumKit[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKit(k)}
                className={cn(
                  'px-2 py-0.5 rounded-sm transition-colors capitalize',
                  kit === k ? 'bg-background font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {k === 'drumset' ? 'Drum Kit' : k}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-muted-foreground gap-2 flex-wrap">
        <span className="italic">
          {loading
            ? `Loading ${kit} samples…`
            : editing
              ? 'Drag a zone to move it. Shift+drag to resize.'
              : 'Tap a drum to strike.'}
        </span>
        <div className="inline-flex items-center gap-2">
          <label className="inline-flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showZones || editing}
              disabled={editing}
              onChange={(e) => setShowZones(e.target.checked)}
              className="h-3 w-3"
            />
            <span>Show zones</span>
          </label>
          {canEdit && (
            <label className="inline-flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={editing}
                onChange={(e) => setEditing(e.target.checked)}
                className="h-3 w-3"
              />
              <span>Edit</span>
            </label>
          )}
          {canEdit && editing && (
            <>
              <button
                type="button"
                onClick={resetKit}
                className="text-[10px] underline text-muted-foreground hover:text-foreground"
                title={`Reset ${kit} zones to defaults`}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={publishZones}
                disabled={publishing || !user}
                className="text-[10px] font-semibold text-primary underline hover:text-primary/80 disabled:opacity-50"
                title="Save these zones for every user (server-side)"
              >
                {publishing ? 'Publishing…' : 'Publish'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Image + absolute-positioned hit zones. The image dictates the
          aspect ratio so zones scale 1:1 with the photo. */}
      <div className="relative w-full bg-slate-50 rounded-lg overflow-hidden">
        <img
          ref={imageRef}
          src={image.src}
          alt={image.alt}
          className="w-full h-auto block select-none"
          draggable={false}
        />
        <div className="absolute inset-0">
          {zones.map((z) => {
            const flashed = hitId === z.id;
            const visible = showZones || editing;
            const baseStyle: React.CSSProperties = {
              position: 'absolute',
              left: z.shape === 'circle' ? `${z.left - z.width / 2}%` : `${z.left}%`,
              top:  z.shape === 'circle' ? `${z.top  - z.height / 2}%` : `${z.top}%`,
              width:  `${z.width}%`,
              height: `${z.height}%`,
              borderRadius: z.shape === 'circle' ? '50%' : 8,
              border: visible
                ? (editing ? '2px solid rgba(251,191,36,0.95)' : '1.5px dashed rgba(251,191,36,0.85)')
                : 'none',
              background: flashed
                ? 'radial-gradient(circle, rgba(254,243,199,0.75) 0%, rgba(251,191,36,0.0) 80%)'
                : (visible ? 'rgba(251,191,36,0.18)' : 'transparent'),
              cursor: editing ? 'move' : (loading ? 'wait' : 'pointer'),
              touchAction: 'none',
              pointerEvents: 'auto',
              padding: 0,
              transition: editing ? 'none' : 'background 0.15s',
            };
            return (
              <button
                key={z.id}
                type="button"
                disabled={loading && !editing}
                style={baseStyle}
                onPointerDown={(e) => {
                  if (editing) { handleEditPointerDown(z, e); return; }
                  if (loading) return;
                  (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
                  // Timpani uses a press-and-hold drumroll model — orchestral
                  // timpani are virtually always rolled, so holding the pad
                  // sustains a rapid tremolo until release. Other kits stay
                  // single-strike per tap.
                  if (kit === 'timpani') startRoll(z);
                  else hit(z);
                }}
                onPointerMove={(e) => { if (editing) handleEditPointerMove(e); }}
                onPointerUp={(e) => {
                  if (editing) { handleEditPointerUp(); return; }
                  if (kit === 'timpani') stopRoll(z.id);
                }}
                onPointerLeave={() => { if (!editing && kit === 'timpani') stopRoll(z.id); }}
                onPointerCancel={() => {
                  if (editing) { handleEditPointerUp(); return; }
                  if (kit === 'timpani') stopRoll(z.id);
                }}
                aria-label={z.label}
                title={editing ? `${z.label} (${z.left.toFixed(1)}, ${z.top.toFixed(1)})` : z.label}
              >
                {visible && (
                  <span style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: '#451a03',
                    textShadow: '0 0 4px rgba(254,243,199,0.9)',
                    pointerEvents: 'none',
                  }}>{z.label}</span>
                )}
                {/* Shift+drag corner handle for resizing. Only shown in
                    edit mode and only on circle zones (which is all of
                    them right now). */}
                {editing && (
                  <span
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      (e.currentTarget as HTMLSpanElement).setPointerCapture(e.pointerId);
                      const startPos = pctFromPointer(e);
                      if (!startPos) return;
                      const startW = z.width, startH = z.height;
                      const onMove = (ev: PointerEvent) => {
                        const img = imageRef.current;
                        if (!img) return;
                        const r = img.getBoundingClientRect();
                        const dx = ((ev.clientX - r.left) / r.width  * 100) - startPos.left;
                        const dy = ((ev.clientY - r.top)  / r.height * 100) - startPos.top;
                        updateZone(z.id, {
                          width:  Math.max(4, Math.min(80, startW + dx * 2)),
                          height: Math.max(3, Math.min(60, startH + dy * 2)),
                        });
                      };
                      const onUp = () => {
                        window.removeEventListener('pointermove', onMove);
                        window.removeEventListener('pointerup', onUp);
                      };
                      window.addEventListener('pointermove', onMove);
                      window.addEventListener('pointerup', onUp);
                    }}
                    style={{
                      position: 'absolute',
                      right: 0, bottom: 0,
                      width: 10, height: 10,
                      background: '#fbbf24',
                      borderRadius: '50%',
                      border: '1px solid #78350f',
                      cursor: 'nwse-resize',
                      touchAction: 'none',
                    }}
                    aria-label={`Resize ${z.label}`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  if (embedded) {
    return <div className={cn('space-y-3', className)}>{body}</div>;
  }
  return (
    <div className={cn('p-3 space-y-3 bg-card border rounded-lg', className)}>
      {body}
    </div>
  );
}
