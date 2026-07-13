import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { threadReducer, INITIAL_THREAD } from './threadReducer';
import { executeClientAction } from './clientActions';
import { getSpeechInput, isMuted, setMuted, speak } from './speech';
import { ConfirmActionQueue } from './confirmQueue';
import { loadThread, saveThread } from './threadStorage';
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
  muted: boolean;
  toggleMute: () => void;
  videoRoom: string | null;
  setVideoRoom: (room: string | null) => void;
  captionReply: { id: string; text: string } | null;
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
  const [videoRoom, setVideoRoom] = useState<string | null>(null);
  const [captionReply, setCaptionReply] = useState<{ id: string; text: string } | null>(null);
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
    if (!outcome.ok) speak(outcome.message, { muted });
    // Only a confirm-gated action can have a queued follow-up waiting on it.
    if (action.confirm) advanceConfirmQueue(msgId);
  }, [muted, navigate, setSheetOpen, advanceConfirmQueue]);

  const cancelAction = useCallback((msgId: string) => {
    dispatch({ type: 'action-state', id: msgId, state: 'cancelled' });
    advanceConfirmQueue(msgId);
  }, [advanceConfirmQueue]);

  const send = useCallback(async (content: string) => {
    const text = content.trim();
    if (!text || state.busy) return;
    dispatch({ type: 'send', id: crypto.randomUUID(), content: text });
    const history = [...state.messages.map((m) => ({ role: m.role, content: m.content })), { role: 'user' as const, content: text }];
    try {
      const { data, error } = await supabase.functions.invoke('assistant-chat', {
        body: {
          messages: history,
          context: {
            firstName: profile?.full_name?.split(' ')[0] ?? 'there',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        },
      });
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
      speak(data.reply ?? '', { muted });
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
  }, [state.busy, state.messages, profile, muted, runAction, setSheetOpen]);

  const toggleMic = useCallback(() => {
    const speech = speechRef.current;
    if (!speech.available) return;
    if (listening) { speech.stop(); setListening(false); return; }
    setListening(true);
    setTranscript('');
    setCaptionReply(null);
    let finalTranscript = '';
    speech.start(
      (t, isFinal) => { setTranscript(t); if (isFinal) finalTranscript = t; },
      () => { setListening(false); if (finalTranscript.trim()) void send(finalTranscript); },
    );
  }, [listening, send]);

  const toggleMute = useCallback(() => {
    const m = !muted;
    setMuted(m);
    setMutedState(m);
  }, [muted]);

  return (
    <AssistantContext.Provider value={{
      state, send, runAction, cancelAction,
      sheetOpen, setSheetOpen,
      micAvailable: speechRef.current.available, listening, transcript, toggleMic,
      muted, toggleMute,
      videoRoom, setVideoRoom,
      captionReply,
    }}>
      {children}
    </AssistantContext.Provider>
  );
};
