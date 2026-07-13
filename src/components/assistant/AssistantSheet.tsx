import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Send, Volume2, VolumeX, Loader2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { threadReducer, INITIAL_THREAD } from '@/lib/assistant/threadReducer';
import { executeClientAction } from '@/lib/assistant/clientActions';
import { getSpeechInput, isMuted, setMuted, speak } from '@/lib/assistant/speech';
import type { AssistantAction } from '@/lib/assistant/types';
import { JitsiMeetRoom } from '@/components/video/JitsiMeetRoom';

interface AssistantSheetProps { open: boolean; onOpenChange: (open: boolean) => void; autoListen?: boolean }

export const AssistantSheet = ({ open, onOpenChange, autoListen }: AssistantSheetProps) => {
  const navigate = useNavigate();
  const { profile } = useUserRole();
  const [state, dispatch] = useReducer(threadReducer, INITIAL_THREAD);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const [videoRoom, setVideoRoom] = useState<string | null>(null);
  const speechRef = useRef(getSpeechInput());
  const scrollRef = useRef<HTMLDivElement>(null);

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
  // rendered inside SheetContent, so an ordinary close would unmount it and
  // drop the call. The call's own close button clears videoRoom first.
  const handleOpenChange = useCallback((next: boolean) => {
    if (!next && videoRoom) return;
    onOpenChange(next);
  }, [videoRoom, onOpenChange]);

  const runAction = useCallback(async (msgId: string, action: AssistantAction) => {
    dispatch({ type: 'action-state', id: msgId, state: 'confirmed' });
    const outcome = await executeClientAction(action);
    dispatch({ type: 'action-state', id: msgId, state: outcome.ok ? 'done' : 'error' });
    if (outcome.openVideoRoom) setVideoRoom(outcome.openVideoRoom);
    if (outcome.navigateTo) { onOpenChange(false); navigate(outcome.navigateTo); }
    if (!outcome.ok) speak(outcome.message, { muted });
  }, [muted, navigate, onOpenChange]);

  const send = useCallback(async (content: string) => {
    const text = content.trim();
    if (!text || state.busy) return;
    setInput('');
    const userId = crypto.randomUUID();
    dispatch({ type: 'send', id: userId, content: text });
    const history = [...state.messages.map((m) => ({ role: m.role, content: m.content })), { role: 'user' as const, content: text }];
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
    const replyId = crypto.randomUUID();
    const actions: AssistantAction[] = data.actions ?? [];
    const confirmAction = actions.find((a) => a.confirm);
    dispatch({ type: 'reply', id: replyId, content: data.reply ?? '', pendingAction: confirmAction });
    speak(data.reply ?? '', { muted });
    // Non-confirm actions run immediately, in order.
    for (const action of actions.filter((a) => !a.confirm)) {
      await runAction(replyId, action);
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

  useEffect(() => { if (open && autoListen && !listening && speechRef.current.available) toggleMic(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] sm:h-[70vh] sm:max-w-xl sm:mx-auto rounded-t-2xl flex flex-col p-0">
        <SheetHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-sm font-semibold">GleeWorld Assistant</SheetTitle>
          <button
            type="button"
            onClick={() => { const m = !muted; setMuted(m); setMutedState(m); }}
            className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
            title={muted ? 'Unmute replies' : 'Mute replies'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-muted-foreground" />}
          </button>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {state.messages.length === 0 && (
            <p className="text-sm text-muted-foreground pt-6 text-center">
              Ask me anything — "What's on my calendar tomorrow?", "Open Studio", "Make a note…"
            </p>
          )}
          {state.messages.map((m) => (
            <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div className={m.role === 'user'
                ? 'max-w-[85%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-3 py-2 text-sm'
                : 'max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm text-foreground'}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.pendingAction && m.actionState === 'pending' && (
                  <div className="mt-2 rounded-lg border bg-card p-2 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {m.pendingAction.tool === 'send_sms' ? 'Text' : 'Email'} to{' '}
                      {(m.pendingAction.args.recipient_names as string[] | undefined)?.join(', ') ?? 'recipients'}:
                    </p>
                    <p className="text-xs font-medium">
                      {String(m.pendingAction.args.message ?? m.pendingAction.args.body ?? '')}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs" onClick={() => runAction(m.id, m.pendingAction!)}>Send</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => dispatch({ type: 'action-state', id: m.id, state: 'cancelled' })}>Cancel</Button>
                    </div>
                  </div>
                )}
                {m.actionState === 'done' && <p className="text-xs text-muted-foreground mt-1">✓ Done</p>}
                {m.actionState === 'cancelled' && <p className="text-xs text-muted-foreground mt-1">Cancelled</p>}
                {m.actionState === 'error' && <p className="text-xs text-destructive mt-1">That didn't work — see above.</p>}
              </div>
            </div>
          ))}
          {state.busy && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          {state.error && <p className="text-xs text-destructive">{state.error}</p>}
        </div>

        <form
          className="border-t px-3 py-2 flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); send(input); }}
        >
          {speechRef.current.available && (
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
          <div className="fixed inset-0 z-[60] bg-background">
            <button type="button" onClick={() => setVideoRoom(null)}
              className="absolute top-3 right-3 z-[61] h-8 w-8 rounded-full bg-card border flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
            <JitsiMeetRoom
              roomName={videoRoom}
              userName={profile?.full_name ?? 'Member'}
              userEmail={profile?.email}
              userId={profile?.user_id}
              onClose={() => setVideoRoom(null)}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
