import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { fetchPassage, searchScripture } from '@/lib/bible/fetchPassage';
import { assistantNavTargets } from '@/lib/navigation/navCatalog';
import { threadReducer, INITIAL_THREAD } from './threadReducer';
import { executeClientAction, resolvePageRoute } from './clientActions';
import { getSpeechInput, isMuted, setMuted, sanitizeForSpeech, speak, stopSpeaking } from './speech';
import { ConfirmActionQueue } from './confirmQueue';
import { loadThread, saveThread } from './threadStorage';
import { useAssistantVoice, BROWSER_VOICE_ID } from './voices';
import type { AssistantAction, ThreadState } from './types';
import type { ConciergeResult } from './conciergeTypes';

export interface NowPlaying {
  /** Which engine the popout drives. Absent = 'youtube' (older callers). */
  source?: 'youtube' | 'apple';
  /** YouTube video id — required when source is youtube. */
  videoId?: string;
  /** Apple Music catalog id + kind — required when source is apple. */
  appleId?: string;
  appleKind?: 'song' | 'album' | 'playlist';
  artworkUrl?: string | null;
  title?: string;
  channel?: string;
  /** True when restored after a page refresh: render paused with a
   *  tap-to-resume — browsers forbid un-gestured audio after reload. */
  resumePaused?: boolean;
}

export interface AssistantContextValue {
  state: ThreadState;
  send: (content: string) => Promise<void>;
  runAction: (msgId: string, action: AssistantAction) => Promise<void>;
  cancelAction: (msgId: string) => void;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  micAvailable: boolean;
  listening: boolean;
  transcript: string;
  toggleMic: () => void;
  muted: boolean;
  toggleMute: () => void;
  speaking: boolean;
  stopSpeaking: () => void;
  videoRoom: string | null;
  setVideoRoom: (room: string | null) => void;
  resultsPanel: ConciergeResult | null;
  setResultsPanel: (r: ConciergeResult | null) => void;
  /** The video playing in the floating window, if any. Deliberately NOT part
   *  of resultsPanel: music has to keep playing while the sheet is closed and
   *  while the next question is being asked. */
  nowPlaying: NowPlaying | null;
  setNowPlaying: (v: NowPlaying | null) => void;
  captionReply: { id: string; text: string } | null;
  /** Tenant-configured assistant voice from Workspace Settings → Branding.
   *  Null while loading, or if the tenant hasn't picked one (app default). */
  voiceId: string | null;
  /** A playlist scheduled on a calendar event that just started: the
   *  one-tap offer. Browsers cannot start audio unattended, so the tap IS
   *  the schedule firing. */
  scheduledPlay: { eventTitle: string; label: string } | null;
  acceptScheduledPlay: () => void;
  dismissScheduledPlay: () => void;
  /** The user's personal name for the assistant (gw_profiles.assistant_name,
   *  per USER across tenants). Null = default "GleeWorld Assistant". Set by
   *  telling the assistant "I'll call you Ruby" (set_assistant_name tool);
   *  surfaces in the sheet header and the live-voice agent identity. */
  assistantName: string | null;
  /** Live conversation mode (ElevenLabs WebRTC agent): full-duplex voice
   *  with real barge-in — the user's VOICE interrupts the assistant, no
   *  tapping required. 'connecting' while the session is being set up. */
  liveStatus: 'off' | 'connecting' | 'live';
  startLive: () => void;
  endLive: () => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

// One conversation across both brains. Typed sends and live-voice
// ask_gleeworld calls used to keep separate thread ids (localStorage vs an
// in-memory ref), so switching to live voice silently started a fresh thread
// — on 2026-08-10 the assistant answered "we're just getting started here"
// twenty seconds after the user's first question. Both paths now read and
// write this one stored id.
const THREAD_ID_KEY = 'gw-assistant-thread-id';
function readStoredThreadId(): string | undefined {
  try { return localStorage.getItem(THREAD_ID_KEY) ?? undefined; }
  catch { return undefined; }
}
function writeStoredThreadId(id: string): void {
  try { localStorage.setItem(THREAD_ID_KEY, id); }
  catch { /* private mode / quota — persistence just doesn't survive refresh */ }
}

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error('useAssistant must be used within AssistantProvider');
  return ctx;
}

export function useAssistantOptional(): AssistantContextValue | null {
  return useContext(AssistantContext);
}

// Owns everything about the assistant that must survive navigation: the
// thread, the confirm queue, speech in/out, and the sheet's open state.
// Mounted once in DashboardShell; AssistantSheet and AssistantFab are
// pure consumers. The thread mirrors to sessionStorage so a reload keeps
// the conversation (see threadStorage for the confirm-card sanitizing).
/** How long a reply will wait for the voice preference to resolve before
 *  speaking anyway. Long enough for a warm query, short enough that a stalled
 *  one never reads as the assistant ignoring you. */
const VOICE_RESOLVE_TIMEOUT_MS = 2500;
/**
 * Last-resort delay before printing a reply that has not started speaking.
 * Generous on purpose: a normal spoken reply waits up to
 * VOICE_RESOLVE_TIMEOUT_MS for the tenant voice and then several seconds for
 * ElevenLabs synthesis, and captioning THAT would undo the voice-first
 * behaviour. This only catches turns where speech never reports back at all.
 */
const CAPTION_FALLBACK_MS = 8000;

let liveNowPlaying: NowPlaying | null = null;

export const AssistantProvider = ({ children, initialSheetOpen = false }: { children: ReactNode; initialSheetOpen?: boolean }) => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { profile } = useUserRole();
  const [state, dispatch] = useReducer(
    threadReducer,
    undefined as unknown as ThreadState,
    () => ({ ...INITIAL_THREAD, messages: loadThread() }),
  );
  const [sheetOpen, setSheetOpenState] = useState(initialSheetOpen);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [muted, setMutedState] = useState(isMuted());
  const [speaking, setSpeaking] = useState(false);
  // Bumped by every Stop tap; a speakNow that started before the bump
  // aborts instead of launching TTS the tap couldn't reach.
  const speakRequestRef = useRef(0);
  const [videoRoom, setVideoRoom] = useState<string | null>(null);
  const [resultsPanel, setResultsPanel] = useState<ConciergeResult | null>(null);
  const [captionReply, setCaptionReply] = useState<{ id: string; text: string } | null>(null);
  /**
   * The voice, and whether it has actually been decided yet.
   *
   * `loading` used to be dropped on the floor here. Until the tenant's
   * branding AND this user's own preference have both resolved, voiceId is
   * null — and speak() maps null to the app default. So the first reply after
   * a page load came out in Jessica and later ones in the chosen voice, which
   * is what "the voice changes through the conversation" was.
   */
  const { voiceId, loading: voiceLoading } = useAssistantVoice();
  const voiceIdRef = useRef<string | null>(voiceId);
  useEffect(() => { voiceIdRef.current = voiceId; }, [voiceId]);

  // Waiters parked by speakNow while the voice is still resolving.
  const voiceReadyRef = useRef({ ready: false, waiters: [] as Array<() => void> });
  /**
   * Music starts, the assistant stops talking.
   *
   * Two audio sources competing for the same speaker is not a preference
   * question: the reply is "Playing Ave Verum" while Ave Verum is already
   * playing over it. Anything spoken is cut the moment a video appears.
   */
  // The popout survives a page refresh (Kevin, 2026-08-11): what was
  // playing is mirrored to sessionStorage and restored on mount. Browsers
  // forbid audio resuming without a gesture after a reload, so the popout
  // comes back PAUSED with resumePaused set — its play button is the tap.
  const NOW_PLAYING_KEY = 'gw-assistant-now-playing';
  // Module-scope survivor: remounts of this provider (route changes swap
  // DashboardShell instances) keep the SAME page-load state — only a real
  // refresh goes to sessionStorage and comes back paused.
  const [nowPlaying, setNowPlayingState] = useState<NowPlaying | null>(() => {
    if (liveNowPlaying) return liveNowPlaying;
    try {
      const raw = sessionStorage.getItem(NOW_PLAYING_KEY);
      if (!raw) return null;
      const v = JSON.parse(raw) as NowPlaying;
      return v && (v.videoId || v.appleId) ? { ...v, resumePaused: true } : null;
    } catch { return null; }
  });
  const setNowPlaying = useCallback((v: NowPlaying | null) => {
    setNowPlayingState(v);
    liveNowPlaying = v;
    // Explicitly cleared (X button / stop_playback): silence MusicKit here,
    // in the provider — the popout's unmount is NOT a stop signal, because
    // route changes remount it while the music should keep going.
    if (v === null) {
      import('@/lib/musicKit').then(({ getMusicKit }) => getMusicKit()).then((kit) => kit.stop()).catch(() => { /* never loaded */ });
    }
    try {
      if (v) sessionStorage.setItem(NOW_PLAYING_KEY, JSON.stringify(v));
      else sessionStorage.removeItem(NOW_PLAYING_KEY);
    } catch { /* private mode — playback just won't survive refresh */ }
  }, []);
  /** Event-scheduled playlist offer. Polls once a minute for events that
   *  started in the last 20 minutes carrying assistant_playlist. Only the
   *  two playback tools may run from DB data — anything else is ignored. */
  const [scheduledPlay, setScheduledPlay] = useState<{ eventId: string; eventTitle: string; label: string; action: AssistantAction } | null>(null);
  useEffect(() => {
    let stopped = false;
    const SEEN_KEY = 'gw-assistant-sched-seen';
    const ALLOWED = ['play_my_playlist', 'play_apple_music'];
    const check = async () => {
      try {
        const since = new Date(Date.now() - 20 * 60000).toISOString();
        const until = new Date(Date.now() + 60000).toISOString();
        const { data } = await supabase
          .from('gw_events')
          .select('id, title, start_date, assistant_playlist')
          .gte('start_date', since)
          .lte('start_date', until)
          .not('assistant_playlist', 'is', null)
          .limit(5);
        if (stopped || !data?.length) return;
        let seen: string[] = [];
        try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]'); } catch { /* fresh */ }
        const ev = (data as Array<{ id: string; title?: string; assistant_playlist?: { tool?: string; args?: Record<string, unknown>; label?: string } }>)
          .find((e) => !seen.includes(e.id) && e.assistant_playlist?.tool && ALLOWED.includes(e.assistant_playlist.tool));
        if (!ev) return;
        setScheduledPlay({
          eventId: ev.id,
          eventTitle: ev.title ?? 'your event',
          label: ev.assistant_playlist!.label ?? 'Music',
          action: { tool: ev.assistant_playlist!.tool!, args: ev.assistant_playlist!.args ?? {}, confirm: false },
        });
      } catch { /* offline — try again next tick */ }
    };
    check();
    const timer = setInterval(check, 60000);
    return () => { stopped = true; clearInterval(timer); };
  }, []);
  const markScheduledSeen = useCallback((eventId: string) => {
    try {
      const seen: string[] = JSON.parse(localStorage.getItem('gw-assistant-sched-seen') ?? '[]');
      localStorage.setItem('gw-assistant-sched-seen', JSON.stringify([...seen.slice(-40), eventId]));
    } catch { /* best effort */ }
  }, []);


  /** Thread used by spoken questions, so a follow-up keeps its context.
   *  Seeded from the same stored id the typed path uses — see THREAD_ID_KEY. */
  const liveThreadRef = useRef<string | null>(null);
  /** In-flight ask_gleeworld call. The live agent (or an impatient human
   *  re-asking into 15s of silence) can fire the same question twice —
   *  on 2026-08-10 both ran to completion and two answers were spoken over
   *  each other. Identical question → share the one in-flight result;
   *  different question → wait for the current one to settle first, so
   *  answers can never interleave. */
  const liveAskRef = useRef<{ question: string; promise: Promise<string> } | null>(null);
  useEffect(() => {
    if (voiceLoading) return;
    voiceReadyRef.current.ready = true;
    voiceReadyRef.current.waiters.splice(0).forEach((w) => w());
  }, [voiceLoading]);

  /**
   * Wait for the voice to be decided — but never for long.
   *
   * Bounded because being SILENT is worse than being in the wrong voice: if
   * branding is slow or fails, the assistant still has to answer. One
   * consistent voice for a whole conversation is the goal; a stalled query
   * must not buy silence.
   */
  const awaitVoice = useCallback(() => new Promise<void>((resolve) => {
    if (voiceReadyRef.current.ready) { resolve(); return; }
    const timer = setTimeout(resolve, VOICE_RESOLVE_TIMEOUT_MS);
    voiceReadyRef.current.waiters.push(() => { clearTimeout(timer); resolve(); });
  }), []);
  const speechRef = useRef(getSpeechInput());
  const confirmQueueRef = useRef(new ConfirmActionQueue());
  // Async send() must see the CURRENT open state, not the one captured at
  // call time — the caption/auto-open decisions happen after the network
  // round-trip.
  const sheetOpenRef = useRef(sheetOpen);
  sheetOpenRef.current = sheetOpen;
  const videoRoomRef = useRef(videoRoom);
  videoRoomRef.current = videoRoom;

  useEffect(() => { saveThread(state.messages); }, [state.messages]);

  // Block close while a video call is live — same guard the sheet had:
  // the call overlay renders inside the sheet content, so an ordinary
  // close would unmount it and drop the call.
  const setSheetOpen = useCallback((next: boolean) => {
    if (!next && videoRoomRef.current) return;
    setSheetOpenState(next);
  }, []);

  // Unmount safety: stop the mic and any in-flight reply speech.
  useEffect(() => () => {
    speechRef.current.stop();
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }, []);

  // Speak a reply while tracking `speaking` so the UI can show a Stop
  // control; stopSpeakingNow cuts her off immediately (barge-in / Stop tap).
  /**
   * @param onSilent Called when the reply never became audible — speak()
   *   reported onEnd without ever reporting onStart. That covers muting, a
   *   dead WKWebView synth, an ElevenLabs failure and a blocked autoplay
   *   alike. Callers use it to surface the text instead, so a failed voice
   *   can never leave a turn with no audio AND no words on screen.
   */
  const speakNow = useCallback(async (
    text: string,
    cbs?: { onStarted?: () => void; onSilent?: () => void },
  ) => {
    // EVERY exit path must report. The previous version returned early on a
    // speak-token bump and had no catch, so a Stop tap, a barge-in, or a
    // throw in getSession() left the caller waiting forever — no audio, no
    // text, an invisible turn. That is the bug this whole guard exists for.
    let started = false;
    const reportSilent = () => { if (!started) cbs?.onSilent?.(); };
    try {
    // Speaking goes true the moment a spoken reply is REQUESTED, not when
    // audio starts. ElevenLabs synthesis of a long reply (news rundown)
    // takes many seconds, and waiting for onplay left that whole window
    // with a mic instead of a Stop — Kevin: "I am unable to stop." A Stop
    // tap during synthesis bumps the speak session, so the late-arriving
    // audio checks the token and never plays. speak() guarantees onEnd on
    // every path (muted, empty, dead synth, error) so this can't stick.
    if (text.trim() && !muted) setSpeaking(true);
    const myRequest = speakRequestRef.current;
    // Grab the current auth token on every speak() so a token refresh
    // doesn't leave us stuck on a 401 — cheap, session cache is in memory.
    // Let the voice settle before speaking, so a conversation does not start
    // in one voice and continue in another.
    await awaitVoice();
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    // Stop was tapped while we awaited the token — honor it; calling
    // speak() now would start a fresh TTS session the tap can't cancel.
    if (speakRequestRef.current !== myRequest) { reportSilent(); return; }
    // onStart fires ONLY on real audio (utterance.onstart / audio.onplay);
    // every silent path in speak() calls onEnd alone. So "ended without
    // starting" is a reliable signal that the user heard nothing.
    speak(text, {
      muted,
      voiceId: voiceIdRef.current,
      accessToken,
      // Same reason the voice picker needs it: VITE_SUPABASE_URL isn't set
      // in this project (client.ts derives the URL from the tenant bootstrap
      // at runtime), so without an explicit supabaseUrl, speak() falls back
      // to browser SpeechSynthesis and ignores voiceId — every reply comes
      // out in the OS default voice regardless of the tenant's pick.
      supabaseUrl: SUPABASE_URL,
      onStart: () => { started = true; setSpeaking(true); cbs?.onStarted?.(); },
      onEnd: () => { setSpeaking(false); reportSilent(); },
    });
    } catch (err) {
      // Speech never got as far as playback. Say so rather than hanging.
      console.warn('[assistant] speech failed before playback:', err);
      setSpeaking(false);
      reportSilent();
    }
  }, [muted]);

  const stopSpeakingNow = useCallback(() => {
    speakRequestRef.current += 1;
    stopSpeaking();
    setSpeaking(false);
  }, []);

  /**
   * Route an incoming panel result: video to the floating player, everything
   * else to the sheet's panel.
   *
   * A video is the one result you keep using AFTER the answer — you listen to
   * it, and you go on talking to the assistant while it plays. In the panel it
   * died the moment the sheet closed and it took half the sheet away from the
   * conversation meanwhile.
   *
   * Anything being spoken is cut when the music starts: two audio sources on
   * one speaker means the reply is read out over the recording it announced.
   */
  const showResult = useCallback((result: ConciergeResult) => {
    if (result.kind === 'video' && result.videoId) {
      stopSpeakingNow();
      setNowPlaying({ videoId: result.videoId, title: result.title, channel: result.channel });
      return;
    }
    setResultsPanel(result);
  }, [stopSpeakingNow]);


  const advanceConfirmQueue = useCallback((msgId: string) => {
    const nextId = crypto.randomUUID();
    const nextAction = confirmQueueRef.current.next(msgId, nextId);
    if (!nextAction) return;
    dispatch({ type: 'reply', id: nextId, content: "There's one more to confirm:", pendingAction: nextAction });
  }, []);

  const runAction = useCallback(async (msgId: string, action: AssistantAction) => {
    dispatch({ type: 'action-state', id: msgId, state: 'confirmed' });
    const outcome = await executeClientAction(action);
    dispatch({ type: 'action-state', id: msgId, state: outcome.ok ? 'done' : 'error' });
    if (outcome.openVideoRoom) setVideoRoom(outcome.openVideoRoom);
    // Ride/food hand-off links. Confirm-gated actions run from the user's tap
    // on the confirm card, so this window.open carries a user gesture and
    // isn't popup-blocked. The URL always comes from our own deep-link
    // builders, never from model output.
    if (outcome.openExternalUrl) window.open(outcome.openExternalUrl, '_blank', 'noopener,noreferrer');
    if (outcome.stopPlayback) setNowPlaying(null);
    if (outcome.appleMusic) {
      // Same rule as the YouTube popout: two audio sources on one speaker
      // means the reply gets read out over the music it announced.
      stopSpeakingNow();
      setNowPlaying({
        source: 'apple',
        appleId: outcome.appleMusic.id,
        appleKind: outcome.appleMusic.kind,
        title: outcome.appleMusic.title,
        channel: outcome.appleMusic.artist,
        artworkUrl: outcome.appleMusic.artworkUrl,
      });
    }
    if (outcome.navigateTo) { setSheetOpen(false); navigate(outcome.navigateTo); }
    if (!outcome.ok) speakNow(outcome.message);
    // Only a confirm-gated action can have a queued follow-up waiting on it.
    if (action.confirm) advanceConfirmQueue(msgId);
    // Invalidate whichever react-query caches a successful action just made
    // stale, so the user sees the change without a page refresh. Every entry
    // maps a tool → the query key(s) rendered from the row it wrote.
    // useGleeWorldEvents keys on ['glee-world-events', userId] — invalidating
    // the base key matches every user-scoped variant. Google-events are
    // written by the best-effort pushEventToGoogle inside the action, so
    // bump that key too on create_event.
    if (outcome.ok) {
      switch (action.tool) {
        case 'create_event':
          // useGleeWorldEvents keys on ['glee-world-events', userId]; invalidating
          // the base key matches every user-scoped variant. ['events'] is the
          // legacy key some appointment hooks still use. Google-events comes
          // from the best-effort pushEventToGoogle inside the executor.
          qc.invalidateQueries({ queryKey: ['glee-world-events'] });
          qc.invalidateQueries({ queryKey: ['events'] });
          qc.invalidateQueries({ queryKey: ['google-events'] });
          break;
        case 'set_date_card':
          qc.invalidateQueries({ queryKey: ['date-card-setting'] });
          break;
      }
    }
  }, [navigate, setSheetOpen, advanceConfirmQueue, speakNow, qc, setNowPlaying, stopSpeakingNow]);

  const cancelAction = useCallback((msgId: string) => {
    dispatch({ type: 'action-state', id: msgId, state: 'cancelled' });
    advanceConfirmQueue(msgId);
  }, [advanceConfirmQueue]);

  // Cached geolocation for find_nearby_place. We try once per assistant
  // session; if the user denies (or the browser has no geolocation) we
  // remember that so we don't re-prompt on every send. Reused for 15
  // minutes before requesting a fresh fix. Kept in memory (never
  // localStorage) — a coarse coordinate is still personal data and the
  // user's grant is per-tab. When we don't have geo, the model falls
  // back to asking the user for a `near` string.
  const geoRef = useRef<{ lat: number; lng: number; ts: number } | null>(null);
  const geoDeniedRef = useRef(false);
  // Set after a getCurrentPosition call that never called back. From then on
  // sends never AWAIT geolocation again — they fire a background warm-up and
  // proceed without geo immediately.
  const geoSlowRef = useRef(false);
  const getFreshGeo = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    if (geoDeniedRef.current) return null;
    const cached = geoRef.current;
    if (cached && Date.now() - cached.ts < 15 * 60 * 1000) {
      return { lat: cached.lat, lng: cached.lng };
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
    const request = (onDone?: (v: { lat: number; lng: number } | null) => void) =>
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = { lat: pos.coords.latitude, lng: pos.coords.longitude, ts: Date.now() };
          geoRef.current = next;
          geoSlowRef.current = false;
          onDone?.({ lat: next.lat, lng: next.lng });
        },
        () => {
          // Permission dismissed / denied / errored. Don't re-prompt this
          // session — user can enable in browser settings if they want it.
          geoDeniedRef.current = true;
          onDone?.(null);
        },
        { enableHighAccuracy: false, maximumAge: 15 * 60 * 1000, timeout: 5000 },
      );
    if (geoSlowRef.current) {
      // A previous call stalled (or the permission prompt is still up) —
      // warm the cache in the background but never block this send on it.
      request();
      return null;
    }
    return new Promise((resolve) => {
      // WKWebView with no NSLocationWhenInUseUsageDescription NEVER invokes
      // either callback — the PositionOptions timeout only starts counting
      // once permission is resolved (verified on the iOS 18 simulator,
      // 2026-08-02: probe saw no callback after 15s). Every send() awaits
      // this, so without a wall-clock race one geolocation stall froze the
      // assistant for the rest of the session (busy stuck true = every
      // later message silently dropped). Race a hard 4s timer; a late
      // success still lands in geoRef for the next message.
      let settled = false;
      const settle = (v: { lat: number; lng: number } | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(v);
      };
      const timer = setTimeout(() => {
        geoSlowRef.current = true;
        settle(null);
      }, 4000);
      request(settle);
    });
  }, []);

  // A failure with the sheet closed (floating-mic flow) used to render only
  // inside the invisible thread — the user spoke, watched their words appear,
  // then NOTHING. Surface it as a caption too so every failure is visible.
  const failVisibly = useCallback((message: string) => {
    dispatch({ type: 'fail', error: message });
    if (!sheetOpenRef.current) setCaptionReply({ id: crypto.randomUUID(), text: message });
  }, []);

  // ── Live conversation mode (ElevenLabs WebRTC agent) ────────────────
  // Full-duplex voice: the agent hears the user WHILE it speaks, so the
  // user's voice interrupts naturally (Kevin: "my voice can't interrupt?").
  // The SDK (+ LiveKit) is ~heavy, so it's dynamically imported only when
  // a session actually starts. Client tools mirror the chat assistant's
  // navigation/news surface; anything else stays with push-to-talk chat.
  const [liveStatus, setLiveStatus] = useState<'off' | 'connecting' | 'live'>('off');
  const liveSessionRef = useRef<{ endSession: () => Promise<void> } | null>(null);
  const liveConnectingRef = useRef(false);

  const endLive = useCallback(() => {
    const session = liveSessionRef.current;
    liveSessionRef.current = null;
    setLiveStatus('off');
    if (session) void session.endSession().catch(() => { /* already closed */ });
  }, []);

  const startLive = useCallback(async () => {
    if (liveSessionRef.current || liveConnectingRef.current) return;
    liveConnectingRef.current = true;
    setLiveStatus('connecting');
    // Live mode owns the audio path — silence push-to-talk TTS and mic.
    stopSpeakingNow();
    speechRef.current.stop();
    setListening(false);
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-conversation-token');
      const token = (data as { token?: string } | null)?.token;
      if (error || !token) {
        // The function returns a 500 with a body explaining why, but
        // supabase-js reports non-2xx as a generic FunctionsHttpError and
        // leaves the body unread — so the specific cause was being thrown
        // away one step short of the user. Read it back off the response.
        let detail = (data as { error?: string } | null)?.error ?? '';
        const res = (error as { context?: Response } | null)?.context;
        if (!detail && res && typeof res.json === 'function') {
          try { detail = (await res.json())?.error ?? ''; } catch { /* not JSON */ }
        }
        throw new Error(detail || error?.message || 'no conversation token');
      }
      const { Conversation } = await import('@elevenlabs/client');
      // The agent carries its own TTS voice (Jessica). Without this override
      // every tenant hears Jessica in live mode regardless of the Branding
      // tab pick — the push-to-talk path honored it, live mode didn't.
      // Requires `conversation_config_override.tts.voice_id: true` in the
      // agent's security settings; with it off, ElevenLabs rejects the
      // session outright, so this and that flag ship together.
      // BROWSER_VOICE_ID is meaningless here (a WebRTC agent has no
      // browser-synth path) — it falls through to the agent default.
      const liveVoiceId = voiceIdRef.current;
      const voiceOverride =
        liveVoiceId && liveVoiceId !== BROWSER_VOICE_ID
          ? { overrides: { tts: { voiceId: liveVoiceId } } }
          : {};
      // Preferred form of address ("call me Doc") outranks the real first name.
      const firstName = profile?.preferred_name?.trim()
        || profile?.full_name?.trim().split(/\s+/)[0] || '';
      const session = await Conversation.startSession({
        conversationToken: token,
        connectionType: 'webrtc',
        ...voiceOverride,
        // Greets by name. The agent's first_message is "Hi, {{user_first_name}}!"
        // and ElevenLabs substitutes this before speaking, so the greeting is
        // personal without a round trip. A blank name would leave a dangling
        // "Hi," so it falls back to "there".
        dynamicVariables: {
          user_first_name: firstName || 'there',
          // The user's personal name for her. The agent prompt reads
          // {{assistant_name}}; the platform default covers old bundles.
          assistant_name: profile?.assistant_name?.trim() || 'the GleeWorld Assistant',
        },
        clientTools: {
          /**
           * Everything the typed assistant can do, spoken.
           *
           * Live voice is a different brain — an ElevenLabs agent with its own
           * small tool list — so it could not reach the choral library, the
           * calendar, the liturgical calendar or the user's own data. Asked
           * about the Negro spiritual it had nothing to consult, which is no
           * use to someone who only wants to speak.
           *
           * Porting each tool across would mean maintaining two catalogues
           * that drift. Instead this hands the question to assistant-chat —
           * the same brain, the same tools, the same prompt — and speaks what
           * comes back. One tool here buys every capability there, and
           * anything added to the text assistant reaches voice for free.
           *
           * The thread id is carried so a spoken follow-up keeps its context,
           * exactly as it would when typed.
           */
          ask_gleeworld: async (params: { question?: string }) => {
            const question = String(params?.question ?? '').trim();
            if (!question) return 'Ask the user what they would like to know.';
            const pending = liveAskRef.current;
            if (pending && pending.question === question.toLowerCase()) return pending.promise;
            if (pending) await pending.promise.catch(() => { /* settled is all we need */ });
            const run = (async (): Promise<string> => {
            try {
              // The SAME context the typed path sends. Without it the
              // delegated brain is half-blind: no geo means "find me a
              // coffee" cannot locate anything, and no navTargets means it
              // cannot resolve a page by name. A question asked aloud
              // deserves the same footing as one typed.
              const geo = await getFreshGeo();
              const { data, error } = await supabase.functions.invoke('assistant-chat', {
                body: {
                  messages: [{ role: 'user', content: question }],
                  thread_id: liveThreadRef.current ?? readStoredThreadId(),
                  context: {
                    firstName: profile?.preferred_name?.trim() || profile?.full_name?.split(' ')[0] || 'there',
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    navTargets: assistantNavTargets(),
                    // Tells the server this reply is read aloud in full, so
                    // it answers short-first (prompt + length guard there).
                    voice: true,
                    ...(geo ? { geo } : {}),
                  },
                },
              });
              if (error) throw error;
              const res = (data as {
                reply?: string;
                thread_id?: string;
                actions?: AssistantAction[];
                resultsPanel?: unknown;
              } | null);
              if (res?.thread_id) {
                liveThreadRef.current = res.thread_id;
                writeStoredThreadId(res.thread_id);
              }

              // Its ACTIONS matter as much as its words. A spoken "find me a
              // coffee" should still raise the card with the tap-to-open-maps
              // button, and "open the calendar" should still open it —
              // dropping these left voice describing things it had not done.
              if (res?.resultsPanel && typeof res.resultsPanel === 'object' && 'kind' in res.resultsPanel) {
                showResult(res.resultsPanel as ConciergeResult);
              }
              const spokenId = crypto.randomUUID();
              const actions = res?.actions ?? [];
              // Confirm-gated actions (texts, emails, deletes) are NOT run
              // from a voice turn: they are registered so the sheet shows
              // their card and a human presses the button. Speaking is not
              // consent to send something on someone's behalf.
              const { first: needsConfirm, autoRun } = confirmQueueRef.current.register(spokenId, actions);
              for (const action of autoRun) await runAction(spokenId, action);
              if (needsConfirm) setSheetOpen(true);

              // The agent speaks this verbatim, so markdown scaffolding
              // ("***Ein deutsches Requiem***", bullet asterisks) must go.
              const spoken = sanitizeForSpeech(res?.reply || '');
              if (spoken) return spoken;
              // Empty reply + an action = a silent action turn (stopping
              // playback, opening a page). Telling the agent "nothing found"
              // here would have it apologize for a success.
              return actions.length > 0
                ? 'The action is done and visible on screen. Acknowledge in at most three words.'
                : "I couldn't find anything on that.";
            } catch (err) {
              return `I couldn't look that up: ${err instanceof Error ? err.message : 'unknown error'}`;
            }
            })();
            liveAskRef.current = { question: question.toLowerCase(), promise: run };
            try { return await run; }
            finally { if (liveAskRef.current?.promise === run) liveAskRef.current = null; }
          },
          open_page: async (params: { name?: string }) => {
            const resolved = resolvePageRoute(String(params?.name ?? ''));
            if (!resolved) return `No page called "${String(params?.name ?? '')}" — tell the user you couldn't find it.`;
            navigate(resolved.route);
            return `Opened ${resolved.label}.`;
          },
          read_news: async (params: { limit?: number }) => {
            const raw = Number(params?.limit);
            const limit = Math.max(1, Math.min(30, Number.isFinite(raw) ? Math.trunc(raw) : 12));
            const { data: news, error: newsErr } = await supabase.functions.invoke('fetch-news-feeds', {
              body: { offset: 0, limit },
            });
            if (newsErr) return JSON.stringify({ error: newsErr.message ?? 'news fetch failed' });
            const items = Array.isArray((news as { items?: unknown[] } | null)?.items)
              ? (news as { items: Array<Record<string, unknown>> }).items
              : [];
            return JSON.stringify({
              items: items.slice(0, limit).map((it) => ({
                title: it?.title,
                source: it?.source,
                summary: typeof it?.description === 'string' ? it.description.slice(0, 240) : '',
                url: it?.link,
              })),
            });
          },
          /**
           * Scripture in live voice.
           *
           * Live mode is a DIFFERENT brain from the typed assistant — an
           * ElevenLabs agent with its own tool list — so the Bible tools the
           * chat path has had all along simply did not exist here. Asking her
           * to read a psalm out loud got nothing.
           *
           * lookup_bible RETURNS text for her to speak; open_bible only
           * navigates. Both, because "read me Psalm 23 and put it up" is one
           * request, not two.
           */
          lookup_bible: async (params: { reference?: string; query?: string; translation?: string }) => {
            const translation = String(params?.translation ?? '') || undefined;
            const ref = String(params?.reference ?? '').trim();
            const query = String(params?.query ?? '').trim();
            if (!ref && !query) return 'Ask which passage or phrase they want.';
            const result = ref
              ? await fetchPassage(ref, translation)
              : await searchScripture(query, translation);
            // Returned verbatim either way: on failure she is told to say she
            // could not find it rather than recite from memory, and eight
            // translations differ enough that a remembered verse is wrong.
            return result.text;
          },
          open_bible: async (params: { reference?: string; translation?: string }) => {
            const ref = String(params?.reference ?? '').trim();
            if (!ref) return 'Ask which passage they want to see.';
            const qs = new URLSearchParams({ ref });
            if (params?.translation) qs.set('translation', String(params.translation));
            navigate(`/bible?${qs.toString()}`);
            return `Opened ${ref}.`;
          },
          open_link: async (params: { url?: string; title?: string }) => {
            const url = String(params?.url ?? '');
            if (!/^https?:\/\/\S+$/i.test(url)) return 'That link is invalid — do not retry it.';
            (globalThis as unknown as Window).open(url, '_blank', 'noopener,noreferrer');
            return `Opened ${String(params?.title ?? 'the article').slice(0, 120)}.`;
          },
        },
        onDisconnect: () => {
          liveSessionRef.current = null;
          setLiveStatus('off');
        },
      });
      liveSessionRef.current = session;
      setLiveStatus('live');
    } catch (err) {
      setLiveStatus('off');
      // Say WHY. The reason travelled all the way from ElevenLabs — through
      // the edge function, through supabase-js — and was thrown away in this
      // catch, leaving a fixed string that could mean a dead key, a missing
      // permission, a deleted agent or no microphone. Configuration faults
      // last hours; a message that cannot distinguish them costs every one of
      // those hours.
      const reason = err instanceof Error ? err.message : String(err ?? '');
      failVisibly(
        reason && !/^no conversation token$/i.test(reason)
          ? `Live voice isn't available: ${reason}`
          : "Live voice isn't available right now.",
      );
    } finally {
      liveConnectingRef.current = false;
    }
  }, [navigate, stopSpeakingNow, showResult, failVisibly, profile?.full_name, profile?.assistant_name, profile?.preferred_name, getFreshGeo, runAction, setSheetOpen]);

  // End the live session if the provider ever unmounts (sign-out, tenant
  // switch) — a dangling WebRTC session would keep the mic open.
  useEffect(() => endLive, [endLive]);

  const send = useCallback(async (content: string) => {
    const text = content.trim();
    if (!text || state.busy) return;
    dispatch({ type: 'send', id: crypto.randomUUID(), content: text });
    // Only the latest user turn matters — the edge function loads prior
    // history from the DB by thread_id (Layer 2 persistence). Older
    // clients that sent full history still work; the server takes the
    // last user message.
    const history = [{ role: 'user' as const, content: text }];
    const storedThreadId = liveThreadRef.current ?? readStoredThreadId();
    // Try for a fresh coordinate before the request so the assistant can
    // answer "find me a starbucks nearby" without a permission prompt
    // mid-conversation. Silently no-op when the user has denied or the
    // API is unavailable — the assistant will just ask where they are.
    const geo = await getFreshGeo();
    try {
      const { data, error } = await supabase.functions.invoke('assistant-chat', {
        body: {
          messages: history,
          thread_id: storedThreadId,
          context: {
            firstName: profile?.preferred_name?.trim() || profile?.full_name?.split(' ')[0] || 'there',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            // Live page list from the nav catalog, so open_page keeps up
            // with new add-ons without touching the edge function.
            navTargets: assistantNavTargets(),
            ...(geo ? { geo } : {}),
          },
        },
      });
      if (data?.thread_id && data.thread_id !== storedThreadId) writeStoredThreadId(data.thread_id);
      if (data?.thread_id) liveThreadRef.current = data.thread_id;
      if (error || data?.error) {
        failVisibly(data?.error ?? "I couldn't reach the assistant right now.");
        return;
      }
      // Malformed response: no reply text and no error to show — surface a
      // failure instead of dispatching an empty-content assistant message
      // and leaving busy stuck (or silently doing nothing).
      if (!data || (data.reply == null && data.error == null)) {
        failVisibly("I couldn't reach the assistant right now.");
        return;
      }
      if (data.resultsPanel && typeof data.resultsPanel === 'object' && 'kind' in data.resultsPanel) {
        showResult(data.resultsPanel as ConciergeResult);
      }
      const replyId = crypto.randomUUID();
      const actions: AssistantAction[] = data.actions ?? [];
      const { first: confirmAction, autoRun } = confirmQueueRef.current.register(replyId, actions);
      // Silent action turns (Kevin 2026-08-03: "not respond when just
      // completing a task"): the model replies with an empty message when
      // its whole turn is a UI action. No bubble, no speech — the page
      // changing is the feedback. A confirm card still needs its bubble.
      const replyText = (data.reply ?? '').trim();
      if (replyText || confirmAction) {
        dispatch({ type: 'reply', id: replyId, content: data.reply ?? '', pendingAction: confirmAction });
        // If she never actually speaks it, print it instead. The caption used
        // to be gated on isMuted(), which is only ONE of the ways a reply goes
        // unheard — a dead WKWebView synth, an ElevenLabs error or a blocked
        // autoplay left no audio AND no text, which users read as the
        // assistant being broken (Kevin, 2026-08-06: asked who wrote the
        // German Requiem, saw nothing, while the server had persisted a
        // correct answer).
        // Belt AND braces. onSilent covers the speech pipeline reporting
        // failure; the timer covers it never reporting at all — a hang, a
        // rejected promise, a code path added later that forgets to call
        // back. Kevin lost a turn to exactly that (2026-08-06) AFTER the
        // first fix, so the caption no longer depends on speech behaving.
        const showCaption = () => {
          if (!sheetOpenRef.current && !confirmAction && data.reply) {
            setCaptionReply({ id: replyId, text: data.reply });
          }
        };
        const captionTimer = window.setTimeout(showCaption, CAPTION_FALLBACK_MS);
        speakNow(replyText, {
          onStarted: () => window.clearTimeout(captionTimer),
          onSilent: () => { window.clearTimeout(captionTimer); showCaption(); },
        });
      } else {
        dispatch({ type: 'settle' });
      }
      // Sheet closed = this turn came from the floating mic. Voice-first by
      // Kevin's request (2026-08-03): a spoken reply is NOT also printed as
      // a caption — the text is always in the thread behind the FAB's caret.
      // The caption remains only as the fallback when she can't speak
      // (muted), and NEVER leave a confirm card invisible — SMS/email sends
      // must show their Send/Cancel, so open the sheet.
      if (!sheetOpenRef.current && confirmAction) setSheetOpen(true);
      // Non-confirm actions run immediately, in order.
      for (const action of autoRun) {
        await runAction(replyId, action);
      }
    } catch {
      failVisibly("I couldn't reach the assistant right now.");
    }
  }, [state.busy, state.messages, profile, speakNow, showResult, runAction, setSheetOpen, getFreshGeo, failVisibly]);

  const toggleMic = useCallback(() => {
    // Live mode owns the mic — push-to-talk stays out of the way.
    if (liveSessionRef.current) return;
    const speech = speechRef.current;
    if (!speech.available) return;
    if (listening) { speech.stop(); setListening(false); return; }
    // Barge-in: starting to talk cuts off whatever she's saying.
    stopSpeakingNow();
    setListening(true);
    setTranscript('');
    setCaptionReply(null);
    let finalTranscript = '';
    speech.start(
      (t, isFinal) => { setTranscript(t); if (isFinal) finalTranscript = t; },
      () => { setListening(false); if (finalTranscript.trim()) void send(finalTranscript); },
    );
  }, [listening, send, stopSpeakingNow]);

  const toggleMute = useCallback(() => {
    const m = !muted;
    setMuted(m);
    setMutedState(m);
    // Muting silences the current reply too, not just future ones.
    if (m) stopSpeakingNow();
  }, [muted, stopSpeakingNow]);

  const acceptScheduledPlay = useCallback(() => {
    if (!scheduledPlay) return;
    markScheduledSeen(scheduledPlay.eventId);
    const action = scheduledPlay.action;
    setScheduledPlay(null);
    void runAction(crypto.randomUUID(), action);
  }, [scheduledPlay, markScheduledSeen, runAction]);
  const dismissScheduledPlay = useCallback(() => {
    if (!scheduledPlay) return;
    markScheduledSeen(scheduledPlay.eventId);
    setScheduledPlay(null);
  }, [scheduledPlay, markScheduledSeen]);

  return (
    <AssistantContext.Provider value={{
      state, send, runAction, cancelAction,
      sheetOpen, setSheetOpen,
      micAvailable: speechRef.current.available, listening, transcript, toggleMic,
      muted, toggleMute,
      speaking, stopSpeaking: stopSpeakingNow,
      liveStatus, startLive, endLive,
      videoRoom, setVideoRoom,
      resultsPanel, setResultsPanel,
      nowPlaying, setNowPlaying,
      scheduledPlay: scheduledPlay ? { eventTitle: scheduledPlay.eventTitle, label: scheduledPlay.label } : null,
      acceptScheduledPlay, dismissScheduledPlay,
      captionReply,
      voiceId,
      assistantName: profile?.assistant_name?.trim() || null,
    }}>
      {children}
    </AssistantContext.Provider>
  );
};
