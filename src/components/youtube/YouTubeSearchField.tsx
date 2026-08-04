// The search box beside the /video page title. Deliberately NOT
// search-as-you-type: every signed-in member can reach this, and the
// platform shares ~100 YouTube searches per day. Submitting is an explicit
// act — Enter or the button.
import React, { useEffect, useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface YouTubeSearchFieldProps {
  searching: boolean;
  // True once a search has run — drives the clear affordance.
  active: boolean;
  onSearch: (term: string) => void;
  onClear: () => void;
}

export const YouTubeSearchField: React.FC<YouTubeSearchFieldProps> = ({
  searching, active, onSearch, onClear,
}) => {
  const [draft, setDraft] = useState('');

  const submit = () => {
    // The button is disabled while searching; Enter must match it, or holding
    // Enter fires a real quota-costing search per keypress. The hook refuses
    // duplicates as well — this is the visible half of that guard, and it
    // keeps the draft in the box so a newer query is only delayed until the
    // spinner clears, never thrown away without a trace.
    if (searching) return;
    const term = draft.trim();
    if (!term) return;
    onSearch(term);
  };

  // Both exits from a search must land in the same place. `Back to library`
  // in the results panel calls the hook's clear() directly, which flips
  // `active` false but cannot reach this draft — without this the old query
  // stayed in the box while the X that clears it disappeared. Only runs on an
  // active transition, so it never touches text the user is still typing.
  useEffect(() => {
    if (!active) setDraft('');
  }, [active]);

  const clear = () => {
    setDraft('');
    onClear();
  };

  return (
    <div className="flex items-center gap-1.5 w-full sm:w-auto">
      <div className="relative flex-1 sm:w-64">
        <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          placeholder="Search YouTube…"
          aria-label="Search YouTube"
          className="pl-8 pr-8 text-sm h-9"
        />
        {active && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear YouTube search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-9 shrink-0"
        onClick={submit}
        disabled={searching}
        aria-label="Search YouTube videos"
      >
        {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
      </Button>
    </div>
  );
};
