import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { assistantNavTargets } from '@/lib/navigation/navCatalog';
import { threadReducer, INITIAL_THREAD } from './threadReducer';
import { executeClientAction, resolvePageRoute } from './clientActions';
import { getSpeechInput, isMuted, setMuted, speak, stopSpeaking } from './speech';
import { ConfirmActionQueue } from './confirmQueue';
import { loadThread, saveThread } from './threadStorage';
import { useAssistantVoice } from './voices';
import type { AssistantAction, ThreadState } from './types';
import type { ConciergeResult } from './conciergeTypes';

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
  captionReply: { id: string; text: string } | null;
  /** Tenant-configured assistant voice from Workspace Settings → Branding.
   *  Null while loading, or if the tenant hasn't picked one (app default). */
  voiceId: string | null;
  /** Live conversation mode (ElevenLabs WebRTC agent): full-duplex voice
   *  with real barge-in — the user's VOICE interrupts the assistant, no
   *  tapping required. 'connecting' while the session is being set up. */
  liveStatus: 'off' | 'connecting' | 'live';
  startLive: () => void;
  endLive: () => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

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
  const { voiceId } = useAssistantVoice();
  const voiceIdRef = useRef<string | null>(voiceId);
  useEffect(() => { voiceIdRef.current = voiceId; }, [voiceId]);
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
  const speakNow = useCallback(async (text: string) => {
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
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    // Stop was tapped while we awaited the token — honor it; calling
    // speak() now would start a fresh TTS session the tap can't cancel.
    if (speakRequestRef.current !== myRequest) return;
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
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
    });
  }, [muted]);

  const stopSpeakingNow = useCallback(() => {
    speakRequestRef.current += 1;
    stopSpeaking();
    setSpeaking(false);
  }, []);


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
  }, [navigate, setSheetOpen, advanceConfirmQueue, speakNow, qc]);

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
      if (error || !token) throw new Error(error?.message ?? 'no conversation token');
      const { Conversation } = await import('@elevenlabs/client');
      const session = await Conversation.startSession({
        conversationToken: token,
        connectionType: 'webrtc',
        clientTools: {
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
    } catch {
      setLiveStatus('off');
      failVisibly("Live voice isn't available right now.");
    } finally {
      liveConnectingRef.current = false;
    }
  }, [navigate, stopSpeakingNow, failVisibly]);

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
    const storedThreadId = (() => {
      try { return localStorage.getItem('gw-assistant-thread-id') ?? undefined; }
      catch { return undefined; }
    })();
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
            firstName: profile?.full_name?.split(' ')[0] ?? 'there',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            // Live page list from the nav catalog, so open_page keeps up
            // with new add-ons without touching the edge function.
            navTargets: assistantNavTargets(),
            ...(geo ? { geo } : {}),
          },
        },
      });
      if (data?.thread_id && data.thread_id !== storedThreadId) {
        try { localStorage.setItem('gw-assistant-thread-id', data.thread_id); }
        catch { /* private mode / quota — persistence just doesn't survive refresh */ }
      }
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
        setResultsPanel(data.resultsPanel as ConciergeResult);
      }
      const replyId = crypto.randomUUID();
      const actions: AssistantAction[] = data.actions ?? [];
      const { first: confirmAction, autoRun } = confirmQueueRef.current.register(replyId, actions);
      dispatch({ type: 'reply', id: replyId, content: data.reply ?? '', pendingAction: confirmAction });
      speakNow(data.reply ?? '');
      // Sheet closed = this turn came from the floating mic. Voice-first by
      // Kevin's request (2026-08-03): a spoken reply is NOT also printed as
      // a caption — the text is always in the thread behind the FAB's caret.
      // The caption remains only as the fallback when she can't speak
      // (muted), and NEVER leave a confirm card invisible — SMS/email sends
      // must show their Send/Cancel, so open the sheet.
      if (!sheetOpenRef.current) {
        if (confirmAction) setSheetOpen(true);
        else if (data.reply && isMuted()) setCaptionReply({ id: replyId, text: data.reply });
      }
      // Non-confirm actions run immediately, in order.
      for (const action of autoRun) {
        await runAction(replyId, action);
      }
    } catch {
      failVisibly("I couldn't reach the assistant right now.");
    }
  }, [state.busy, state.messages, profile, speakNow, runAction, setSheetOpen, getFreshGeo, failVisibly]);

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
      captionReply,
      voiceId,
    }}>
      {children}
    </AssistantContext.Provider>
  );
};
