import { useState } from 'react';
import { Mic, Sparkles } from 'lucide-react';
import { AssistantSheet } from './AssistantSheet';
import { getSpeechInput } from '@/lib/assistant/speech';

/** Mic + "Ask" pill on the right side of the home greeting row. */
export const AssistantLauncher = () => {
  const [open, setOpen] = useState(false);
  // An incrementing counter, not a boolean: AssistantSheet's autoListen effect
  // fires when this value *changes*. A boolean would go true -> true on a
  // second mic tap while the sheet is already open and never re-fire.
  const [listenRequest, setListenRequest] = useState(0);
  const micAvailable = getSpeechInput().available;

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {micAvailable && (
        <button
          type="button"
          onClick={() => { setListenRequest((n) => n + 1); setOpen(true); }}
          className="h-9 w-9 rounded-full border bg-card flex items-center justify-center hover:bg-accent transition-colors"
          title="Ask by voice"
        >
          <Mic className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 px-3 rounded-full border bg-card flex items-center gap-1.5 text-sm font-medium hover:bg-accent transition-colors"
      >
        <Sparkles className="w-4 h-4 text-muted-foreground" />
        Ask
      </button>
      <AssistantSheet open={open} onOpenChange={setOpen} listenRequest={listenRequest} />
    </div>
  );
};
