// React-side bindings for the Studio engine + session storage.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  createSession, deleteSession, listMySessions, loadSession, saveSession,
  getAssetUrl, uploadAudioAsset,
  type SessionListItem,
} from '@/lib/studio/storage';
import { StudioEngine, type EngineState } from '@/lib/studio/engine/engine';
import { setAssetUrl } from '@/lib/studio/engine/assetUrlCache';
import { renderSessionToWav } from '@/lib/studio/engine/mixdown';
import type { Session } from '@/lib/studio/session';
import {
  isNativeStudioAvailable, openNativeStudio, NativeStudio, type NativeEngineState,
} from '@/plugins/studioEngine';

// ── Current user's tenant + user id (needed for createSession) ───────

export function useStudioOwner() {
  return useQuery({
    queryKey: ['studio-owner'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('not signed in');
      const { data: profile, error } = await supabase
        .from('gw_profiles').select('tenant_id').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      if (!profile?.tenant_id) throw new Error('profile missing tenant_id');
      return { userId: user.id, tenantId: profile.tenant_id as string };
    },
    staleTime: 5 * 60_000,
  });
}

// ── Session list / create / delete ───────────────────────────────────

export function useMySessions() {
  return useQuery<SessionListItem[]>({
    queryKey: ['studio-sessions'],
    queryFn: listMySessions,
    staleTime: 30_000,
  });
}

export function useCreateStudioSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['studio-sessions'] }),
  });
}

export function useDeleteStudioSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => deleteSession(sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['studio-sessions'] }),
  });
}

// ── Load + edit a single session with debounced autosave ─────────────

export function useStudioSession(sessionId: string | null) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!sessionId) { setSession(null); return; }
    setLoading(true); setError(null);
    loadSession(sessionId)
      .then((s) => { if (!cancelled) setSession(s); })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sessionId]);

  const queueSave = useCallback((next: Session) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { saveSession(next).catch(setError); }, 800);
  }, []);

  const update = useCallback((mutator: (s: Session) => Session) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = mutator(prev);
      queueSave(next);
      return next;
    });
  }, [queueSave]);

  // Flush on unmount.
  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (session) saveSession(session).catch(() => { /* swallow */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { session, loading, error, update };
}

// ── Engine lifecycle bound to a session ──────────────────────────────
//
// On iOS we drive the native StudioEnginePlugin (AVAudioEngine).
// Everywhere else we use the Tone.js StudioEngine. The returned API
// is uniform so StudioEditor doesn't know which engine it's talking to.

/** A signature of the parts of the session that require a full engine
 * rebuild. Volume / pan / mute / solo / arm — the "strip" controls —
 * are NOT in this signature; they go through updateTrackStrip without
 * disposing and rebuilding every player. Without this, a slider drag
 * would reload the whole engine on every animation frame. */
function structuralSig(session: Session | null): string {
  if (!session) return '';
  const parts: string[] = [
    String(session.tracks.length),
    String(session.assets.length),
    String(session.tempo_bpm),
    `${session.time_signature.numerator}/${session.time_signature.denominator}`,
    session.master.fx.map((f) => `${f.id}:${f.type}:${f.enabled}`).join(','),
  ];
  for (const t of session.tracks) {
    parts.push(`${t.id}:${t.kind}`);
    parts.push(t.fx.map((f) => `${f.id}:${f.type}:${f.enabled}`).join(','));
    if (t.kind === 'audio') {
      for (const c of t.clips) {
        parts.push(`${c.id}:${c.asset_id}:${c.start_seconds.toFixed(3)}:${c.duration_seconds.toFixed(3)}:${c.offset_seconds.toFixed(3)}:${c.gain_db}:${c.pitch_semitones}:${c.time_stretch}:${c.reverse}`);
      }
    } else if (t.kind === 'midi') {
      parts.push(`${t.instrument.type}:${t.instrument.preset_id ?? ''}`);
      for (const c of t.clips) {
        parts.push(`${c.id}:${c.start_seconds.toFixed(3)}:${c.duration_seconds.toFixed(3)}:${c.notes.length}`);
      }
    }
  }
  return parts.join('|');
}

export function useStudioEngine(session: Session | null) {
  const native = isNativeStudioAvailable();
  const engineRef = useRef<StudioEngine | null>(null);
  const nativeCloseRef = useRef<(() => Promise<void>) | null>(null);
  const [state, setState] = useState<EngineState | null>(null);
  const [warming, setWarming] = useState(false);

  // Create the web engine once on mount (no-op on native).
  useEffect(() => {
    if (native) return;
    const engine = new StudioEngine();
    engineRef.current = engine;
    const unsub = engine.subscribe((s) => setState(s));
    return () => {
      unsub();
      engine.dispose();
      engineRef.current = null;
    };
  }, [native]);

  // Reload session whenever it changes. A previous "structural sig"
  // optimization that skipped reload on volume/pan changes broke the
  // first load for some sessions and left them silent — until we can
  // root-cause that, the full reload here is the safe path. The
  // volume-drag rebuild lag returns; we'll address it again with a
  // gentler approach.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    if (native) {
      setWarming(true);
      (async () => {
        if (nativeCloseRef.current) { await nativeCloseRef.current(); nativeCloseRef.current = null; }
        const close = await openNativeStudio({
          session,
          assets: session.assets,
          resolveUrl: (a) => getAssetUrl({ tenantId: session.tenant_id, sessionId: session.id, asset: a }),
          onState: (s: NativeEngineState) => setState({
            isReady: s.isReady, isPlaying: s.isPlaying,
            positionSeconds: s.positionSeconds, tempoBpm: s.tempoBpm,
            loopEnabled: false, loopStartSeconds: 0, loopEndSeconds: 0,
            metronomeOn: false, metronomeVolumeDb: 0, peakDbL: -Infinity, peakDbR: -Infinity,
          }),
        });
        if (cancelled) { await close(); return; }
        nativeCloseRef.current = close;
        setWarming(false);
      })();
      return () => { cancelled = true; nativeCloseRef.current?.(); nativeCloseRef.current = null; };
    }

    // Web path.
    if (!engineRef.current) return;
    setWarming(true);
    (async () => {
      await Promise.all(session.assets.map(async (a) => {
        try {
          const url = await getAssetUrl({ tenantId: session.tenant_id, sessionId: session.id, asset: a });
          setAssetUrl(a.id, url);
        } catch { /* swallow */ }
      }));
      if (cancelled) return;
      engineRef.current?.loadSession(session);
      setWarming(false);
    })();
    return () => { cancelled = true; };
  }, [session, native]);

  const api = useMemo(() => {
    if (native) {
      return {
        start: async () => { await NativeStudio.start(); },
        play: async () => { await NativeStudio.play(); },
        pause: async () => { await NativeStudio.pause(); },
        stop: async () => { await NativeStudio.stop(); },
        seek: async (s: number) => { await NativeStudio.seek({ seconds: s }); },
        updateTrackStrip: async (id: string, p: { volume_db?: number; pan?: number; mute?: boolean; solo?: boolean }) => {
          await NativeStudio.updateStrip({
            trackId: id,
            volumeDb: p.volume_db, pan: p.pan, mute: p.mute,
          });
        },
        updateTempo: async (bpm: number) => { await NativeStudio.updateTempo({ bpm }); },
        updateTimeSignature: async (_n: number, _d: number) => { /* not wired on native yet */ },
        updateTransport: async (_args: { tempo?: number; timeSignature?: [number, number]; loop?: { start: number; end: number; enabled: boolean } }) => {
          /* native loop wiring lands in a future iOS pass */
        },
        setMetronome: (_on: boolean) => { /* native engine doesn't expose metronome yet */ },
        setMetronomeVolume: (_db: number) => { /* native engine doesn't expose click volume yet */ },
        triggerMetronomeClick: (_accent: boolean) => { /* native count-in not wired yet */ },
        /** iOS-only: kicks the AVAudioEngine input tap into a WAV file
         * in the app's tmp dir. Returns when the take stops. The
         * editor's startRecording dispatches here on iOS instead of
         * using Tone.js + getUserMedia + MediaRecorder, which is the
         * unreliable web fallback inside WKWebView. */
        nativeRecordStart: async () => { await NativeStudio.recordStart(); },
        nativeRecordStop: async () => NativeStudio.recordStop(),
      };
    }
    return {
      start: () => engineRef.current?.start(),
      play: () => engineRef.current?.play(),
      pause: () => engineRef.current?.pause(),
      stop: () => engineRef.current?.stop(),
      seek: (s: number) => engineRef.current?.seek(s),
      updateTrackStrip: (id: string, p: { volume_db?: number; pan?: number; mute?: boolean; solo?: boolean }) =>
        engineRef.current?.updateTrackStrip(id, p),
      updateTempo: (bpm: number) => engineRef.current?.updateTransport({ tempo: bpm }),
      updateTimeSignature: (n: number, d: number) =>
        engineRef.current?.updateTransport({ timeSignature: [n, d] }),
      updateTransport: (args: { tempo?: number; timeSignature?: [number, number]; loop?: { start: number; end: number; enabled: boolean } }) =>
        engineRef.current?.updateTransport(args),
      setMetronome: (on: boolean) => engineRef.current?.setMetronome(on),
      setMetronomeVolume: (db: number) => engineRef.current?.setMetronomeVolume(db),
      triggerMetronomeClick: (accent: boolean) => engineRef.current?.triggerMetronomeClick(accent),
      /** Web path doesn't have a native recorder — the editor falls
       * back to its existing Tone.js + getUserMedia + MediaRecorder
       * flow when these return null. */
      nativeRecordStart: null as null | (() => Promise<void>),
      nativeRecordStop: null as null | (() => Promise<{ localUrl: string; filename: string }>),
    };
  }, [native]);

  return { engine: engineRef.current, state, warming, native, ...api };
}

// ── Mixdown to WAV ───────────────────────────────────────────────────

export function useMixdown() {
  return useMutation({
    mutationFn: async (session: Session) => {
      return await renderSessionToWav(session);
    },
  });
}

// ── Asset upload (drag a file in) ────────────────────────────────────

export function useUploadAudioAsset(session: Session | null) {
  return useMutation({
    mutationFn: async (file: File) => {
      if (!session) throw new Error('no session');
      // Decode for duration / sample rate / channels.
      const ctx = new AudioContext();
      const buf = await ctx.decodeAudioData(await file.arrayBuffer());
      await ctx.close();
      // Pre-compute peaks (~300 samples) so the clip block shows a
      // static waveform without re-decoding on every render.
      const peaks = (() => {
        const channel = buf.getChannelData(0);
        const total = channel.length;
        const target = 300;
        const window = Math.max(1, Math.floor(total / target));
        const out: number[] = [];
        for (let i = 0; i < target; i++) {
          const start = i * window;
          const end = Math.min(total, start + window);
          let peak = 0;
          for (let j = start; j < end; j++) {
            const v = Math.abs(channel[j]);
            if (v > peak) peak = v;
          }
          out.push(peak);
        }
        return out;
      })();
      const asset = await uploadAudioAsset({
        tenantId: session.tenant_id,
        sessionId: session.id,
        file,
        filename: file.name,
        duration_seconds: buf.duration,
        sample_rate: buf.sampleRate,
        channels: buf.numberOfChannels,
      });
      return { ...asset, peaks };
    },
  });
}
