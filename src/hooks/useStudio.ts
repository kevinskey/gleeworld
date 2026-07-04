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
  const [reloadKey, setReloadKey] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!sessionId) { setSession(null); return; }
    setLoading(true); setError(null);
    // Retry transient network failures (3 attempts, ramp 0/300/900ms).
    // Recording uploads can saturate the WKWebView network briefly on
    // iOS and a single fetch racing with that flips the editor to its
    // error state. A short auto-retry keeps it visible.
    (async () => {
      const delays = [0, 300, 900];
      let lastErr: Error | null = null;
      for (const wait of delays) {
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        if (cancelled) return;
        try {
          const s = await loadSession(sessionId);
          if (cancelled) return;
          setSession(s);
          setError(null);
          setLoading(false);
          return;
        } catch (e) {
          lastErr = e as Error;
        }
      }
      if (!cancelled) {
        setError(lastErr);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

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

  return { session, loading, error, update, reload };
}

// ── Engine lifecycle bound to a session ──────────────────────────────
//
// On iOS we drive the native StudioEnginePlugin (AVAudioEngine).
// Everywhere else we use the Tone.js StudioEngine. The returned API
// is uniform so StudioEditor doesn't know which engine it's talking to.

/** Skeleton signature — only the parts of the session that REQUIRE a
 *  full engine rebuild. Excludes audio clip lists + the assets array;
 *  changes to those are handled incrementally via addClipToTrack /
 *  removeClipFromTrack. Volume / pan / mute / solo go through
 *  updateTrackStrip and don't bump the skeleton either. */
function skeletonSig(session: Session | null): string {
  if (!session) return '';
  const parts: string[] = [
    String(session.tempo_bpm),
    `${session.time_signature.numerator}/${session.time_signature.denominator}`,
    session.master.fx.map((f) => `${f.id}:${f.type}:${f.enabled}`).join(','),
  ];
  for (const t of session.tracks) {
    parts.push(`${t.id}:${t.kind}`);
    parts.push(t.fx.map((f) => `${f.id}:${f.type}:${f.enabled}`).join(','));
    if (t.kind === 'midi') {
      // MIDI tracks still need full rebuild for clip / note edits — the
      // incremental path here only covers audio clips. List midi notes
      // in the skeleton so any edit triggers reload.
      parts.push(`${t.instrument.type}:${t.instrument.preset_id ?? ''}`);
      for (const c of t.clips) {
        parts.push(`${c.id}:${c.start_seconds.toFixed(3)}:${c.duration_seconds.toFixed(3)}:${c.notes.length}`);
      }
    }
  }
  return parts.join('|');
}

/** Audio-clip signature for a single audio track. Used to detect which
 *  clips were added / removed / edited between two sessions so we can
 *  splice the engine instead of rebuilding it. */
function audioClipSig(c: { id: string; asset_id: string; start_seconds: number; duration_seconds: number; offset_seconds: number; gain_db: number; pitch_semitones: number; time_stretch: number; reverse: boolean }): string {
  return `${c.id}:${c.asset_id}:${c.start_seconds.toFixed(3)}:${c.duration_seconds.toFixed(3)}:${c.offset_seconds.toFixed(3)}:${c.gain_db}:${c.pitch_semitones}:${c.time_stretch}:${c.reverse}`;
}

export function useStudioEngine(session: Session | null) {
  const native = isNativeStudioAvailable();
  const engineRef = useRef<StudioEngine | null>(null);
  const nativeCloseRef = useRef<(() => Promise<void>) | null>(null);
  const [state, setState] = useState<EngineState | null>(null);
  const [warming, setWarming] = useState(false);
  // Last skeleton signature we built the engine for. Stays constant
  // across clip edits — only structural changes (tracks, FX, tempo)
  // bump it. Compared against the incoming session to decide between
  // incremental splice (cheap, no audio glitch) and full reload (slow).
  const lastSkeletonRef = useRef<string>('');
  // Snapshot of the audio-clip sets per track from the last engine
  // sync. Diffing against the current session tells us exactly which
  // clips to add or remove on the live graph.
  const lastAudioClipsRef = useRef<Map<string, Map<string, string>>>(new Map());

  // Close the native engine exactly once, on unmount. Session-change
  // effects must never do this (see cleanup note in the reload effect).
  useEffect(() => {
    if (!native) return;
    return () => {
      nativeCloseRef.current?.();
      nativeCloseRef.current = null;
    };
  }, [native]);

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

  // Reload session whenever it changes. Two-tier strategy:
  //   1. Skeleton diff (tracks/FX/tempo/MIDI clips) → full loadSession
  //      (or openNativeStudio on iOS) — the only path that touches
  //      master FX or tears down players.
  //   2. Skeleton-stable change (audio clips added/removed/edited) →
  //      incremental addClipToTrack / removeClipFromTrack delta. No
  //      AVAudioEngine teardown, no Tone.Player rebuild, in-flight
  //      playback survives. Both web and iOS take this path; failures
  //      gracefully fall back to a full reload on the next pass.
  // See skeletonSig + audioClipSig helpers above.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    if (native) {
      // Native diff path. If the skeleton hasn't changed (just clip /
      // asset edits), splice clips on the live AVAudioEngine instead
      // of tearing it down + re-opening — which on iOS means redownload
      // every asset + redecode every AVAudioFile, easily multi-second.
      const skeleton = skeletonSig(session);
      const needsFullReload = skeleton !== lastSkeletonRef.current || !nativeCloseRef.current;
      if (!needsFullReload) {
        setWarming(true);
        (async () => {
          try {
            const assetById = new Map(session.assets.map((a) => [a.id, a]));
            const nextSnap = new Map<string, Map<string, string>>();
            for (const t of session.tracks) {
              if (t.kind !== 'audio') continue;
              const prevClips = lastAudioClipsRef.current.get(t.id) ?? new Map<string, string>();
              const nextClips = new Map<string, string>();
              for (const c of t.clips) nextClips.set(c.id, audioClipSig(c as any));
              nextSnap.set(t.id, nextClips);
              for (const [cid, prevSig] of prevClips.entries()) {
                const cur = nextClips.get(cid);
                if (cur === undefined || cur !== prevSig) {
                  await NativeStudio.removeClipFromTrack({ trackId: t.id, clipId: cid });
                }
              }
              for (const c of t.clips) {
                const prev = prevClips.get(c.id);
                if (prev !== undefined && prev === audioClipSig(c as any)) continue;
                const asset = assetById.get(c.asset_id);
                if (!asset) continue;
                // Resolve the asset to a local URL the native side can
                // open with AVAudioFile. For freshly-recorded takes the
                // localUrl is already a file:// path (recordStop wrote
                // it to tmp); for everything else we need to download
                // the signed URL and stash it locally first. For now
                // pass the signed URL through — AVAudioFile happens to
                // accept https URLs via its NSURL backing on iOS 13+
                // (it streams + caches), and we can layer a local
                // download here later if real-world flake demands it.
                const signedUrl = await getAssetUrl({ tenantId: session.tenant_id, sessionId: session.id, asset });
                if (cancelled) return;
                await NativeStudio.addClipToTrack({ trackId: t.id, clip: c, localUrl: signedUrl });
              }
            }
            if (!cancelled) lastAudioClipsRef.current = nextSnap;
          } catch (e) {
            console.warn('[StudioEngine] native incremental diff failed, falling back to full reload', e);
            // Force full reload next render by clearing the skeleton.
            lastSkeletonRef.current = '';
          } finally {
            if (!cancelled) setWarming(false);
          }
        })();
        return () => { cancelled = true; };
      }

      setWarming(true);
      (async () => {
        if (nativeCloseRef.current) { await nativeCloseRef.current(); nativeCloseRef.current = null; }
        const close = await openNativeStudio({
          session,
          assets: session.assets,
          resolveUrl: (a) => getAssetUrl({ tenantId: session.tenant_id, sessionId: session.id, asset: a }),
          onState: (s: NativeEngineState & { status?: string }) => {
            // Diagnostic emits (e.g. play() debug ping) come through
            // with a `status` field instead of the normal state shape.
            // Log them so we can confirm the bridge round-trips, but
            // don't overwrite React state with undefined fields.
            if (typeof s?.status === 'string') {
              console.info('[StudioEngine] bridge ping:', s.status);
              return;
            }
            // Temporary diagnostic — logs every payload so we can see
            // whether `metronomeOn` is missing or arriving as the wrong
            // type. Will remove once metronome toggle is verified.
            console.debug('[StudioEngine] state', JSON.stringify({
              metOn: s.metronomeOn,
              metOnType: typeof s.metronomeOn,
              pos: s.positionSeconds,
            }));
            setState({
              isReady: s.isReady, isPlaying: s.isPlaying,
              positionSeconds: s.positionSeconds, tempoBpm: s.tempoBpm,
              loopEnabled: false, loopStartSeconds: 0, loopEndSeconds: 0,
              // Coerce to Boolean — some Capacitor bridges hand Bool
              // values across as 0/1 NSNumber, which `??` would treat
              // as defined but `state?.metronomeOn` would render falsy
              // for `0`. Explicit `!!` removes ambiguity.
              metronomeOn: !!s.metronomeOn, metronomeVolumeDb: 0,
              peakDbL: -Infinity, peakDbR: -Infinity,
            });
            // Surface any engine-side error as a toast so device users
            // can report the failure without needing Mac + Safari console.
            const err = (s as any)?.lastError;
            if (typeof err === 'string' && err.length > 0) {
              import('sonner').then(({ toast }) => {
                toast.error('Studio audio error', { description: err });
              }).catch(() => { /* toast unavailable */ });
            }
          },
        });
        if (cancelled) { await close(); return; }
        nativeCloseRef.current = close;
        // Pin the skeleton + audio-clip snapshot now that the native
        // engine reflects this session. Subsequent clip-only edits
        // take the incremental path above.
        lastSkeletonRef.current = skeleton;
        const snap = new Map<string, Map<string, string>>();
        for (const t of session.tracks) {
          if (t.kind !== 'audio') continue;
          const m = new Map<string, string>();
          for (const c of t.clips) m.set(c.id, audioClipSig(c as any));
          snap.set(t.id, m);
        }
        lastAudioClipsRef.current = snap;
        setWarming(false);

        // Logic-Pro-style eager prewarm: as soon as the engine is up,
        // queue a background decode of every asset into the LRU cache.
        // First Play after load has zero disk I/O on the audio thread.
        // Non-file URLs (e.g. signed Supabase https URLs) silently fail
        // the AVAudioFile read inside the engine and are skipped;
        // recorded takes that live in tmp will all warm up successfully.
        try {
          const entries: Array<{ assetId: string; localPath: string }> = [];
          for (const a of session.assets) {
            const url = await getAssetUrl({ tenantId: session.tenant_id, sessionId: session.id, asset: a });
            entries.push({ assetId: a.id, localPath: url });
          }
          if (entries.length > 0) {
            void NativeStudio.prewarmAssets({ assets: entries }).catch(() => {});
          }
        } catch { /* prewarm is best-effort */ }
      })();
      // Cleanup cancels the in-flight open only. Closing the engine here
      // would run on EVERY session edit (React re-runs cleanups per dep
      // change): the first mute/volume/clip write after mount stopped
      // the AVAudioEngine mid-playback and nulled nativeCloseRef, which
      // in turn forced needsFullReload=true forever — the incremental
      // path never ran and every edit cost a full multi-second reopen.
      // The engine now closes on unmount (dedicated effect below) or is
      // replaced by the next full reload, which awaits the old close.
      return () => { cancelled = true; };
    }

    // Web path. Two flavors:
    //   - Skeleton change (tracks added/removed, FX edits, tempo, etc.)
    //     → full engine.loadSession() rebuild. Same as before.
    //   - Skeleton unchanged, only audio clips / assets differ
    //     → incremental addClipToTrack / removeClipFromTrack. No
    //       teardown, no glitch, in-flight playback survives.
    const engine = engineRef.current;
    if (!engine) return;

    const skeleton = skeletonSig(session);
    const needsFullReload = skeleton !== lastSkeletonRef.current;

    setWarming(true);
    (async () => {
      // Pre-warm every signed URL — needed by both paths. Recording flow
      // already cached the new asset's URL synchronously, but other
      // imports may need a network hop.
      await Promise.all(session.assets.map(async (a) => {
        try {
          const url = await getAssetUrl({ tenantId: session.tenant_id, sessionId: session.id, asset: a });
          setAssetUrl(a.id, url);
        } catch { /* swallow */ }
      }));
      if (cancelled) return;

      if (needsFullReload) {
        engine.loadSession(session);
        lastSkeletonRef.current = skeleton;
        // Reset the audio-clip snapshot to mirror what loadSession just
        // built — every clip on every audio track is now "live".
        const snap = new Map<string, Map<string, string>>();
        for (const t of session.tracks) {
          if (t.kind !== 'audio') continue;
          const m = new Map<string, string>();
          for (const c of t.clips) m.set(c.id, audioClipSig(c as any));
          snap.set(t.id, m);
        }
        lastAudioClipsRef.current = snap;
      } else {
        // Skeleton-stable diff: per audio track, splice clips that
        // appeared / disappeared / mutated since the last snapshot.
        const assetById = new Map(session.assets.map((a) => [a.id, a]));
        const nextSnap = new Map<string, Map<string, string>>();
        for (const t of session.tracks) {
          if (t.kind !== 'audio') continue;
          const prevClips = lastAudioClipsRef.current.get(t.id) ?? new Map<string, string>();
          const nextClips = new Map<string, string>();
          for (const c of t.clips) nextClips.set(c.id, audioClipSig(c as any));
          nextSnap.set(t.id, nextClips);

          // Remove clips that are gone or whose signature changed (we
          // re-add them below with the new params).
          for (const [cid, prevSig] of prevClips.entries()) {
            const cur = nextClips.get(cid);
            if (cur === undefined || cur !== prevSig) {
              engine.removeClipFromTrack(t.id, cid);
            }
          }
          // Add brand-new clips + replacements for mutated ones.
          for (const c of t.clips) {
            const prev = prevClips.get(c.id);
            if (prev !== undefined && prev === audioClipSig(c as any)) continue;
            const asset = assetById.get(c.asset_id);
            if (!asset) continue;
            engine.addClipToTrack(t.id, c, asset);
          }
        }
        lastAudioClipsRef.current = nextSnap;
      }

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
            volumeDb: p.volume_db, pan: p.pan, mute: p.mute, solo: p.solo,
          });
        },
        updateTempo: async (bpm: number) => { await NativeStudio.updateTempo({ bpm }); },
        updateTimeSignature: async (_n: number, _d: number) => { /* not wired on native yet */ },
        updateTransport: async (_args: { tempo?: number; timeSignature?: [number, number]; loop?: { start: number; end: number; enabled: boolean } }) => {
          /* native loop wiring lands in a future iOS pass */
        },
        setMetronome: (on: boolean) => {
          // Fire-and-forget — the click engine itself is the only
          // listener that cares about the toggle.
          void NativeStudio.setMetronome({ on });
        },
        setMetronomeVolume: (db: number) => {
          // Volume ONLY — never touch the on/off state here. This used
          // to send `on: true` with every drag, so brushing the click
          // volume slider silently armed the metronome and the next
          // record/play clicked "on its own".
          void NativeStudio.setMetronome({ volumeDb: db });
        },
        triggerMetronomeClick: (accent: boolean) => {
          // Native single click — powers the count-in pre-roll clicks
          // that StudioEditor fires before play() starts the transport.
          void NativeStudio.clickOnce({ accent });
        },
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
