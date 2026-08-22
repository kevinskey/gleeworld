import { useCallback, useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AudioLines, Check, ChevronDown, Mic, Send, Speech, Square, Volume2, VolumeX } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ASSISTANT_VOICES, BROWSER_VOICE_ID, voiceLabel } from '@/lib/assistant/voices';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUserRole } from '@/hooks/useUserRole';
import { useIsPhone } from '@/hooks/use-mobile';
import { useAssistant } from '@/lib/assistant/AssistantProvider';
import { AssistantThread } from './AssistantThread';
import { AssistantSuggestions } from './AssistantSuggestions';
import { AssistantVideoOverlay } from './AssistantVideoOverlay';

const ASSISTANT_DESCRIPTION = "Chat with the GleeWorld Assistant by typing or voice. Some actions ask for confirmation before they run.";

// Chat window over the shared assistant state (AssistantProvider). The
// provider owns the thread, speech, mute, and open state — this component
// is only the two shells (phone bottom sheet / desktop spotlight dialog)
// plus the local input box.
export const AssistantSheet = () => {
  const { profile } = useUserRole();
  const isPhone = useIsPhone();
  const {
    state, send, runAction, cancelAction,
    sheetOpen, setSheetOpen,
    micAvailable, listening, transcript, toggleMic,
    conversationActive, toggleConversation,
    voiceId, setVoice,
    muted, toggleMute,
    speaking, stopSpeaking,
    videoRoom, setVideoRoom,
  } = useAssistant();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 999999 }); }, [state.messages.length]);

  // Mirror the live transcript into the input while listening so the user
  // sees what the mic hears (same behavior the sheet-local mic had).
  useEffect(() => { if (listening) setInput(transcript); }, [listening, transcript]);

  const submit = useCallback((content: string) => {
    if (!content.trim() || state.busy) return;
    setInput('');
    void send(content);
  }, [send, state.busy]);

  const hasMessages = state.messages.length > 0;

  if (isPhone) {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        {/* max-h (not a fixed h) so the sheet hugs its content — a fresh
            thread is just header + chips + input low on the screen, and the
            sheet only approaches 85vh once the conversation fills it. */}
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl flex flex-col p-0">
          <SheetHeader className="px-4 py-2.5 border-b flex-row items-center justify-between space-y-0">
            <SheetTitle className="text-sm font-semibold">GleeWorld Assistant</SheetTitle>
            <SheetDescription className="sr-only">{ASSISTANT_DESCRIPTION}</SheetDescription>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="h-8 rounded-full px-2.5 flex items-center gap-1.5 hover:bg-accent transition-colors text-muted-foreground"
                    title="Change voice"
                  >
                    <Speech className="w-4 h-4" />
                    <span className="text-xs">{voiceLabel(voiceId)}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
                  <DropdownMenuLabel>Assistant voice</DropdownMenuLabel>
                  {ASSISTANT_VOICES.map((v) => (
                    <DropdownMenuItem key={v.id} className="cursor-pointer gap-2" onClick={() => setVoice(v.id)}>
                      <span className="flex-1">
                        {v.label}
                        <span className="block text-xs text-muted-foreground">{v.description}</span>
                      </span>
                      {voiceId === v.id && <Check className="w-4 h-4" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => setVoice(BROWSER_VOICE_ID)}>
                    <span className="flex-1">Browser default</span>
                    {voiceId === BROWSER_VOICE_ID && <Check className="w-4 h-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => setVoice(null)}>
                    Use workspace default
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                type="button"
                onClick={toggleMute}
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
                title={muted ? 'Unmute replies' : 'Mute replies'}
              >
                {muted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
          </SheetHeader>

          {/* min-h-0 lets this region shrink-and-scroll once the sheet hits
              its max-h cap; justify-end keeps a short thread anchored near
              the input instead of stranded at the top. */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col justify-end gap-3">
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
            onSubmit={(e) => { e.preventDefault(); submit(input); }}
          >
            {speaking && (
              <button type="button" onClick={stopSpeaking} aria-label="Stop talking" title="Stop talking"
                className="h-9 w-9 rounded-full flex items-center justify-center bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            )}
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
    <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus(); }}
          className="fixed left-1/2 top-[15%] z-50 w-full max-w-2xl -translate-x-1/2 rounded-2xl border bg-card shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <DialogTitle className="sr-only">GleeWorld Assistant</DialogTitle>
          <DialogDescription className="sr-only">{ASSISTANT_DESCRIPTION}</DialogDescription>

          {/* Compact header — mute + minimize live here so the input row
              stays clean and centered on the mic/text/send trio. */}
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-xs font-medium text-muted-foreground px-1">GleeWorld Assistant</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleMute}
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
                title={muted ? 'Unmute replies' : 'Mute replies'}
              >
                {muted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-muted-foreground" />}
              </button>
              {/* The desktop spotlight otherwise closes only via Esc/backdrop —
                  an invisible exit. Minimizing returns to the floating mic. */}
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Minimize assistant"
                title="Minimize"
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
              >
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Thread grows above the input; when the conversation is empty
              we show suggestions instead and let the input sit right under
              them so the dialog doesn't feel bottom-heavy. */}
          <div className="px-4 py-3">
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

          {/* Input row anchored at the bottom, matching the pattern users
              expect from ChatGPT/Claude/etc. */}
          <form
            className="flex items-center gap-2 px-4 py-3 border-t"
            onSubmit={(e) => { e.preventDefault(); submit(input); }}
          >
            {speaking && (
              <button type="button" onClick={stopSpeaking} aria-label="Stop talking" title="Stop talking"
                className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            )}
            {micAvailable && (
              <button type="button" onClick={toggleMic}
                className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-colors ${listening ? 'bg-destructive/10 text-destructive animate-pulse' : 'hover:bg-accent text-muted-foreground'}`}
                title={listening ? 'Stop listening' : 'Speak'}>
                <Mic className="w-4 h-4" />
              </button>
            )}
            {micAvailable && (
              <button type="button" onClick={toggleConversation}
                className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-colors ${conversationActive ? 'bg-primary/15 text-primary animate-pulse' : 'hover:bg-accent text-muted-foreground'}`}
                title={conversationActive ? 'End conversation' : 'Start voice conversation — hands-free back and forth'}
                aria-label={conversationActive ? 'End conversation' : 'Start voice conversation'}>
                <AudioLines className="w-4 h-4" />
              </button>
            )}
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? 'Listening…' : 'Ask GleeWorld…'}
              className="flex-1 h-9 rounded-full border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Button type="submit" size="sm" className="h-9 w-9 shrink-0 rounded-full p-0" disabled={state.busy || !input.trim()}>
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
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};
