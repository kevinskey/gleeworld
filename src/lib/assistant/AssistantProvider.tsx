import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { threadReducer, INITIAL_THREAD } from './threadReducer';
import { executeClientAction } from './clientActions';
import { getSpeechInput, isMuted, setMuted, speak, stopSpeaking } from './speech';
import { ConfirmActionQueue } from './confirmQueue';
import { loadThread, saveThread } from './threadStorage';
import { getVoiceOverride, setVoiceOverrideStored, useAssistantVoice, voiceLabel } from './voices';
import type { AssistantAction, ThreadState } from './types';

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
  /** Hands-free voice conversation: mic reopens after each spoken reply
   *  until toggled off, two silent turns pass, or the mic is stopped. */
  conversationActive: boolean;
  toggleConversation: () => void;
  muted: boolean;
  toggleMute: () => void;
  speaking: boolean;
  stopSpeaking: () => void;
  videoRoom: string | null;
  setVideoRoom: (room: string | null) => void;
  captionReply: { id: string; text: string } | null;
  /** Effective assistant voice: the user's on-page pick (this device)
   *  falling back to the tenant's Workspace Settings → Branding choice. */
  voiceId: string | null;
  /** Pick a voice for this device (null = back to tenant default). Speaks
   *  a short sample so the choice is audible immediately. */
  setVoice: (id: string | null) => void;
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
  const [videoRoom, setVideoRoom] = useState<string | null>(null);
  const [captionReply, setCaptionReply] = useState<{ id: string; text: string } | null>(null);
  const { voiceId: tenantVoiceId } = useAssistantVoice();
  // Effective voice = the user's on-page pick (per device) → tenant default.
  const [voiceOverride, setVoiceOverride] = useState<string | null>(getVoiceOverride());
  const voiceId = voiceOverride ?? tenantVoiceId;
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
    // Grab the current auth token on every speak() so a token refresh
    // doesn't leave us stuck on a 401 — cheap, session cache is in memory.
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
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
    // Ride/food hand-off links. Confirm-gated actions run from the user's tap
    // on the confirm card, so this window.open carries a user gesture and
    // isn't popup-blocked. The URL always comes from our own deep-link
    // builders, never from model output.
    if (outcome.openExternalUrl) window.open(outcome.openExternalUrl, '_blank', 'noopener,noreferrer');
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
  const getFreshGeo = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    if (geoDeniedRef.current) return null;
    const cached = geoRef.current;
    if (cached && Date.now() - cached.ts < 15 * 60 * 1000) {
      return { lat: cached.lat, lng: cached.lng };
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = { lat: pos.coords.latitude, lng: pos.coords.longitude, ts: Date.now() };
          geoRef.current = next;
          resolve({ lat: next.lat, lng: next.lng });
        },
        () => {
          // Permission dismissed / denied / errored. Don't re-prompt this
          // session — user can enable in browser settings if they want it.
          geoDeniedRef.current = true;
          resolve(null);
        },
        { enableHighAccuracy: false, maximumAge: 15 * 60 * 1000, timeout: 5000 },
      );
    });
  }, []);

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
            ...(geo ? { geo } : {}),
          },
        },
      });
      if (data?.thread_id && data.thread_id !== storedThreadId) {
        try { localStorage.setItem('gw-assistant-thread-id', data.thread_id); }
        catch { /* private mode / quota — persistence just doesn't survive refresh */ }
      }
      if (error || data?.error) {
        dispatch({ type: 'fail', error: data?.error ?? "I couldn't reach the assistant right now." });
        return;
      }
      // Malformed response: no reply text and no error to show — surface a
      // failure instead of dispatching an empty-content assistant message
      // and leaving busy stuck (or silently doing nothing).
      if (!data || (data.reply == null && data.error == null)) {
        dispatch({ type: 'fail', error: "I couldn't reach the assistant right now." });
        return;
      }
      const replyId = crypto.randomUUID();
      const actions: AssistantAction[] = data.actions ?? [];
      const { first: confirmAction, autoRun } = confirmQueueRef.current.register(replyId, actions);
      dispatch({ type: 'reply', id: replyId, content: data.reply ?? '', pendingAction: confirmAction });
      speakNow(data.reply ?? '');
      // Sheet closed = this turn came from the floating mic. Surface the
      // reply as a caption; and NEVER leave a confirm card invisible —
      // SMS/email sends must show their Send/Cancel, so open the sheet.
      if (!sheetOpenRef.current) {
        if (confirmAction) setSheetOpen(true);
        else if (data.reply) setCaptionReply({ id: replyId, text: data.reply });
      }
      // Non-confirm actions run immediately, in order.
      for (const action of autoRun) {
        await runAction(replyId, action);
      }
    } catch {
      dispatch({ type: 'fail', error: "I couldn't reach the assistant right now." });
    }
  }, [state.busy, state.messages, profile, speakNow, runAction, setSheetOpen, getFreshGeo]);

  // ── Conversation mode ──────────────────────────────────────────────────
  // One mic session per turn, relaunched after each reply. Refs (not state)
  // drive the loop because every decision happens inside speech/speak
  // callbacks that would otherwise close over stale values.
  const [conversationActive, setConversationActiveState] = useState(false);
  const conversationRef = useRef(false);
  const listeningRef = useRef(false);
  const speakingRef = useRef(false);
  useEffect(() => { speakingRef.current = speaking; }, [speaking]);
  const emptyTurnsRef = useRef(0);
  // Self-reference so the retry inside onEnd doesn't fight useCallback order.
  const startListeningRef = useRef<() => void>(() => {});

  const endConversation = useCallback(() => {
    conversationRef.current = false;
    setConversationActiveState(false);
    emptyTurnsRef.current = 0;
  }, []);

  const startListening = useCallback(() => {
    const speech = speechRef.current;
    if (!speech.available || listeningRef.current) return;
    // Barge-in: starting to talk cuts off whatever she's saying.
    stopSpeakingNow();
    listeningRef.current = true;
    setListening(true);
    setTranscript('');
    setCaptionReply(null);
    let finalTranscript = '';
    speech.start(
      (t, isFinal) => { setTranscript(t); if (isFinal) finalTranscript = t; },
      () => {
        listeningRef.current = false;
        setListening(false);
        const said = finalTranscript.trim();
        if (said) { emptyTurnsRef.current = 0; void send(said); return; }
        // Silence. In conversation mode allow one more open-mic window,
        // then bow out — a hot mic forever is creepy and eats battery.
        if (conversationRef.current) {
          emptyTurnsRef.current += 1;
          if (emptyTurnsRef.current < 2) startListeningRef.current();
          else endConversation();
        }
      },
    );
  }, [send, stopSpeakingNow, endConversation]);
  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);

  const toggleMic = useCallback(() => {
    const speech = speechRef.current;
    if (!speech.available) return;
    if (listeningRef.current) {
      // Manually stopping the mic also leaves conversation mode — the
      // user is clearly done talking, don't reopen on them.
      endConversation();
      speech.stop();
      return;
    }
    startListening();
  }, [startListening, endConversation]);

  const toggleConversation = useCallback(() => {
    if (!speechRef.current.available) return;
    if (conversationRef.current) {
      endConversation();
      if (listeningRef.current) speechRef.current.stop();
      stopSpeakingNow();
      return;
    }
    conversationRef.current = true;
    setConversationActiveState(true);
    emptyTurnsRef.current = 0;
    // Greet first — starting a conversation with a silently hot mic feels
    // broken ("it does not greet me"). When the greeting finishes speaking,
    // the speaking-end effect below opens the mic, the same path every
    // later turn uses. Muted (or TTS-less) sessions skip straight to
    // listening since there is nothing to hear.
    if (!muted) {
      const firstName = profile?.full_name?.split(' ')[0];
      void speakNow(
        `Hey${firstName ? ` ${firstName}` : ''} — I'm listening. What can I do for you?`,
      );
      // If speech never actually starts (TTS failure before onplay), fall
      // back to the mic so the conversation can't stall at the greeting.
      setTimeout(() => {
        if (conversationRef.current && !speakingRef.current && !listeningRef.current) {
          startListeningRef.current();
        }
      }, 4000);
    } else if (!listeningRef.current) {
      startListening();
    }
  }, [startListening, endConversation, stopSpeakingNow, muted, profile, speakNow]);

  // Reopen the mic when her reply finishes playing.
  const prevSpeakingRef = useRef(false);
  useEffect(() => {
    const justFinished = prevSpeakingRef.current && !speaking;
    prevSpeakingRef.current = speaking;
    if (justFinished && conversationRef.current && !listeningRef.current && !state.busy) {
      startListeningRef.current();
    }
  }, [speaking, state.busy]);

  // Fallback for turns that never speak (muted, empty reply, TTS failure):
  // when the request finishes and no speech has started shortly after,
  // reopen the mic anyway so the loop can't stall.
  const prevBusyRef = useRef(false);
  useEffect(() => {
    const justFinished = prevBusyRef.current && state.busy === false;
    prevBusyRef.current = state.busy;
    if (!justFinished || !conversationRef.current) return;
    const t = setTimeout(() => {
      if (conversationRef.current && !listeningRef.current && !speakingRef.current) {
        startListeningRef.current();
      }
    }, muted ? 300 : 2500);
    return () => clearTimeout(t);
  }, [state.busy, muted]);

  const setVoice = useCallback((id: string | null) => {
    setVoiceOverrideStored(id);
    setVoiceOverride(id);
    // Make the pick audible right away — update the ref synchronously so
    // the sample uses the new voice, not the previous render's.
    voiceIdRef.current = id ?? tenantVoiceId;
    const label = id === 'browser' ? 'the browser voice' : voiceLabel(voiceIdRef.current);
    void speakNow(`Hi — this is ${label}.`);
  }, [tenantVoiceId, speakNow]);

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
      conversationActive, toggleConversation,
      muted, toggleMute, setVoice,
      speaking, stopSpeaking: stopSpeakingNow,
      videoRoom, setVideoRoom,
      captionReply,
      voiceId,
    }}>
      {children}
    </AssistantContext.Provider>
  );
};
