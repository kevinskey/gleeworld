import { useCallback, useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ChevronDown, Mic, Send, Square, Volume2, VolumeX } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import { useIsPhone } from '@/hooks/use-mobile';
import { useAssistant } from '@/lib/assistant/AssistantProvider';
import { AssistantThread } from './AssistantThread';
import { AssistantSuggestions } from './AssistantSuggestions';
import { AssistantVideoOverlay } from './AssistantVideoOverlay';
import { AssistantResultsPanel } from './AssistantResultsPanel';

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
    muted, toggleMute,
    speaking, stopSpeaking,
    videoRoom, setVideoRoom,
    resultsPanel, setResultsPanel,
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
          {resultsPanel && (
            // max-h + flex-none + overflow-hidden go on the panel itself.
            // The prior wrapper had max-h alone without a definite height,
            // so the inner h-full didn't constrain and the last place card
            // spilled out past the panel's border, drawing over the chat
            // header and response bubble below it (Kevin's Starbucks pic).
            <AssistantResultsPanel
              result={resultsPanel}
              onClose={() => setResultsPanel(null)}
              className="max-h-[45vh] flex-none border-b border-l-0 overflow-hidden"
            />
          )}
          <SheetHeader className="px-4 py-2.5 border-b flex-row items-center justify-between space-y-0">
            <SheetTitle className="text-sm font-semibold">GleeWorld Assistant</SheetTitle>
            <SheetDescription className="sr-only">{ASSISTANT_DESCRIPTION}</SheetDescription>
            {/* Muted gets a persistent destructive tint so the state reads at
                a glance. Unmuted hover pairs bg-accent WITH accent-foreground —
                on touch devices :hover sticks after a tap, and the old
                muted-gray icon on the stuck tenant-accent circle was
                illegible (Kevin couldn't tell his iPad was muted). */}
            <button
              type="button"
              onClick={toggleMute}
              className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${muted ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
              title={muted ? 'Replies muted — tap to unmute' : 'Mute replies'}
              aria-pressed={muted}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
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
                className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${listening ? 'bg-destructive/10 text-destructive animate-pulse' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'}`}
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
          className={cn(
            'fixed left-1/2 top-[15%] z-50 -translate-x-1/2 rounded-2xl border bg-card shadow-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            resultsPanel ? 'w-full max-w-4xl' : 'w-full max-w-2xl',
          )}
        >
          <DialogTitle className="sr-only">GleeWorld Assistant</DialogTitle>
          <DialogDescription className="sr-only">{ASSISTANT_DESCRIPTION}</DialogDescription>

          {/* Compact header — mute + minimize live here so the input row
              stays clean and centered on the mic/text/send trio. */}
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-xs font-medium text-muted-foreground px-1">GleeWorld Assistant</span>
            <div className="flex items-center gap-1">
              {/* Same muted-state treatment as the sheet header above. */}
              <button
                type="button"
                onClick={toggleMute}
                className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${muted ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
                title={muted ? 'Replies muted — tap to unmute' : 'Mute replies'}
                aria-pressed={muted}
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              {/* The desktop spotlight otherwise closes only via Esc/backdrop —
                  an invisible exit. Minimizing returns to the floating mic. */}
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Minimize assistant"
                title="Minimize"
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="flex">
            <div className={cn('flex flex-col', resultsPanel ? 'flex-1 border-r' : 'w-full')}>
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
                    className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-colors ${listening ? 'bg-destructive/10 text-destructive animate-pulse' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'}`}
                    title={listening ? 'Stop listening' : 'Speak'}>
                    <Mic className="w-4 h-4" />
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
            </div>
            {resultsPanel && (
              <div className="w-[380px] flex-shrink-0">
                <AssistantResultsPanel
                  result={resultsPanel}
                  onClose={() => setResultsPanel(null)}
                  className="h-full"
                />
              </div>
            )}
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
