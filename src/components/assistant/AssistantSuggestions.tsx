import { cn } from '@/lib/utils';

/** Tenant-neutral starter prompts shown when a thread has no messages yet. */
export const ASSISTANT_SUGGESTIONS = [
  "What's on my calendar tomorrow?",
  'Open Studio',
  'Make a note…',
] as const;

interface AssistantSuggestionsProps {
  onPick: (text: string) => void;
  className?: string;
}

export const AssistantSuggestions = ({ onPick, className }: AssistantSuggestionsProps) => (
  <div className={cn('flex flex-wrap gap-2', className)}>
    {ASSISTANT_SUGGESTIONS.map((s) => (
      <button
        key={s}
        type="button"
        onClick={() => onPick(s)}
        className="h-8 px-3 rounded-full border bg-card text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        {s}
      </button>
    ))}
  </div>
);
