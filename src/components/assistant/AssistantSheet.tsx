import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Mic, Send, Volume2, VolumeX } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useIsPhone } from '@/hooks/use-mobile';
import { threadReducer, INITIAL_THREAD } from '@/lib/assistant/threadReducer';
import { executeClientAction } from '@/lib/assistant/clientActions';
import { getSpeechInput, isMuted, setMuted, speak } from '@/lib/assistant/speech';
import { ConfirmActionQueue } from '@/lib/assistant/confirmQueue';
import type { AssistantAction } from '@/lib/assistant/types';
import { AssistantThread } from './AssistantThread';
import { AssistantSuggestions } from './AssistantSuggestions';
import { AssistantVideoOverlay } from './AssistantVideoOverlay';

interface AssistantSheetProps { open: boolean; onOpenChange: (open: boolean) => void; listenRequest?: number }

const ASSISTANT_DESCRIPTION = "Chat with the GleeWorld Assistant by typing or voice. Some actions ask for confirmation before they run.";

export const AssistantSheet = ({ open, onOpenChange, listenRequest }: AssistantSheetProps) => {
  const navigate = useNavigate();
  const { profile } = useUserRole();
  const isPhone = useIsPhone();
  const [state, dispatch] = useReducer(threadReducer, INITIAL_THREAD);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const [videoRoom, setVideoRoom] = useState<string | null>(null);
  const speechRef = useRef(getSpeechInput());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmQueueRef = useRef(new ConfirmActionQueue());

  useEffect(() => { scrollRef.current?.scrollTo({ top: 999999 }); }, [state.messages.length]);

  // Stop listening and silence any in-flight reply speech whenever the sheet
  // closes, and on unmount — otherwise SpeechRecognition keeps the mic open
  // and speechSynthesis keeps talking into an invisible sheet.
  useEffect(() => {
    if (open) return;
    speechRef.current.stop();
    setListening(false);
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }, [open]);

  useEffect(() => () => {
    speechRef.current.stop();
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }, []);

  // Block backdrop/Esc/X close while a video call is live — that overlay is
  // rendered inside the shell's content, so an ordinary close would unmount it
  // and drop the call. The call's own close button clears videoRoom first.
  const handleOpenChange = useCallback((next: boolean) => {
    if (!next && videoRoom) return;
    onOpenChange(next);
  }, [videoRoom, onOpenChange]);

  // Once the confirm action shown on `msgId` has been resolved (sent or
  // cancelled), surface the next queued confirm action — if any — as its own
  // new assistant message with its own pending card. This is what keeps a
  // turn with multiple confirm-gated actions (e.g. "text Sarah and email the
  // board") from silently dropping every action after the first: each one
  // gets its own explicit Send/Cancel before it can run.
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
    // Route through the guarded close path — a raw onOpenChange(false) here
    // would bypass the videoRoom guard and unmount a live Jitsi call the
    // instant an assistant-triggered navigation fires.
    if (outcome.navigateTo) { handleOpenChange(false); navigate(outcome.navigateTo); }
    if (!outcome.ok) speak(outcome.message, { muted });
    // Only a confirm-gated action can have a queued follow-up waiting on it.
    if (action.confirm) advanceConfirmQueue(msgId);
  }, [muted, navigate, handleOpenChange, advanceConfirmQueue]);

  const cancelAction = useCallback((msgId: string) => {
    dispatch({ type: 'action-state', id: msgId, state: 'cancelled' });
    advanceConfirmQueue(msgId);
  }, [advanceConfirmQueue]);

  const send = useCallback(async (content: string) => {
    const text = content.trim();
    if (!text || state.busy) return;
    setInput('');
    const userId = crypto.randomUUID();
    dispatch({ type: 'send', id: userId, content: text });
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
      // Non-confirm actions run immediately, in order.
      for (const action of autoRun) {
        await runAction(replyId, action);
      }
    } catch {
      dispatch({ type: 'fail', error: "I couldn't reach the assistant right now." });
    }
  }, [state.busy, state.messages, profile, muted, runAction]);

  const toggleMic = useCallback(() => {
    const speech = speechRef.current;
    if (!speech.available) return;
    if (listening) { speech.stop(); setListening(false); return; }
    setListening(true);
    let finalTranscript = '';
    speech.start(
      (transcript, isFinal) => { setInput(transcript); if (isFinal) finalTranscript = transcript; },
      () => { setListening(false); if (finalTranscript.trim()) send(finalTranscript); },
    );
  }, [listening, send]);

  // Depends on `listenRequest` (an incrementing counter from the launcher),
  // not a boolean — a boolean `autoListen` prop can't re-fire this effect
  // when the sheet is already open, since its value doesn't change between
  // two taps of the launcher's mic button. Each increment is a distinct
  // value, so the effect re-runs every time regardless of open/close state.
  useEffect(() => {
    if (listenRequest && open && !listening && speechRef.current.available) toggleMic();
  }, [listenRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMute = useCallback(() => {
    const m = !muted;
    setMuted(m);
    setMutedState(m);
  }, [muted]);

  const micAvailable = speechRef.current.available;
  const hasMessages = state.messages.length > 0;

  if (isPhone) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl flex flex-col p-0">
          <SheetHeader className="px-4 py-2.5 border-b flex-row items-center justify-between space-y-0">
            <SheetTitle className="text-sm font-semibold">GleeWorld Assistant</SheetTitle>
            <SheetDescription className="sr-only">{ASSISTANT_DESCRIPTION}</SheetDescription>
            <button
              type="button"
              onClick={toggleMute}
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
              title={muted ? 'Unmute replies' : 'Mute replies'}
            >
              {muted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-muted-foreground" />}
            </button>
          </SheetHeader>

          {/* justify-end keeps a short thread (or the empty-state chips)
              anchored near the input instead of stranded at the top of a
              mostly-empty column. */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col justify-end gap-3">
            {!hasMessages && (
              <AssistantSuggestions onPick={send} className="pb-1" />
            )}
            <AssistantThread
              messages={state.messages}
              busy={state.busy}
              error={state.error}
              runAction={runAction}
              cancelAction={cancelAction}
              scrollRef={scrollRef}
              className="space-y-3"
            />
          </div>

          <form
            className="border-t px-3 py-2 flex items-center gap-2"
            onSubmit={(e) => { e.preventDefault(); send(input); }}
          >
            {micAvailable && (
              <button type="button" onClick={toggleMic}
                className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${listening ? 'bg-destructive/10 text-destructive animate-pulse' : 'hover:bg-accent text-muted-foreground'}`}
                title={listening ? 'Stop listening' : 'Speak'}>
                <Mic className="w-4 h-4" />
              </button>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? 'Listening…' : 'Ask GleeWorld…'}
              className="flex-1 h-9 rounded-full border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Button type="submit" size="sm" className="h-9 w-9 rounded-full p-0" disabled={state.busy || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>

          {videoRoom && (
            <AssistantVideoOverlay
              roomName={videoRoom}
              userName={profile?.full_name ?? 'Member'}
              userEmail={profile?.email}
              userId={profile?.user_id}
              onClose={() => setVideoRoom(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus(); }}
          className="fixed left-1/2 top-[15%] z-50 w-full max-w-2xl -translate-x-1/2 rounded-2xl border bg-card shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <DialogTitle className="sr-only">GleeWorld Assistant</DialogTitle>
          <DialogDescription className="sr-only">{ASSISTANT_DESCRIPTION}</DialogDescription>

          {/* Row 1 — the spotlight bar itself: mic, borderless input, send, mute. */}
          <form
            className="flex items-center gap-2 px-4 py-3"
            onSubmit={(e) => { e.preventDefault(); send(input); }}
          >
            {micAvailable && (
              <button type="button" onClick={toggleMic}
                className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-colors ${listening ? 'bg-destructive/10 text-destructive animate-pulse' : 'hover:bg-accent text-muted-foreground'}`}
                title={listening ? 'Stop listening' : 'Speak'}>
                <Mic className="w-4 h-4" />
              </button>
            )}
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? 'Listening…' : 'Ask GleeWorld…'}
              className="flex-1 h-9 border-0 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" size="sm" className="h-9 w-9 shrink-0 rounded-full p-0" disabled={state.busy || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
            <button
              type="button"
              onClick={toggleMute}
              className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
              title={muted ? 'Unmute replies' : 'Mute replies'}
            >
              {muted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-muted-foreground" />}
            </button>
          </form>

          <div className="border-t px-4 py-3">
            {!hasMessages && <AssistantSuggestions onPick={send} />}
            <AssistantThread
              messages={state.messages}
              busy={state.busy}
              error={state.error}
              runAction={runAction}
              cancelAction={cancelAction}
              scrollRef={scrollRef}
              className={hasMessages ? 'max-h-[50vh] overflow-y-auto space-y-3' : undefined}
            />
          </div>

          {videoRoom && (
            <AssistantVideoOverlay
              roomName={videoRoom}
              userName={profile?.full_name ?? 'Member'}
              userEmail={profile?.email}
              userId={profile?.user_id}
              onClose={() => setVideoRoom(null)}
            />
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};
