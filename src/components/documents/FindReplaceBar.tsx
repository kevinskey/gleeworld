// Find & replace bar for the Documents editor. Opens on ⌘F / Ctrl+F, closes
// on Escape — the shortcuts people already have in their fingers from every
// other word processor.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { ChevronDown, ChevronUp, CaseSensitive, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getSearchState } from './extensions/DocumentSearch';

export function FindReplaceBar({ editor }: { editor: Editor | null }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  // Re-render on every editor transaction so the "3 of 12" counter tracks
  // typing and replacing; plugin state lives in ProseMirror, not React.
  const [, forceRender] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editor) return;
    const onTransaction = () => forceRender((n) => n + 1);
    editor.on('transaction', onTransaction);
    return () => { editor.off('transaction', onTransaction); };
  }, [editor]);

  const close = useCallback(() => {
    setOpen(false);
    editor?.commands.clearSearch();
    editor?.commands.focus();
  }, [editor]);

  // ⌘F opens the bar and preselects whatever is in it, matching the browser's
  // own find. We take over ⌘F only while the editor exists on the page.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setOpen(true);
        requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.select(); });
      } else if (e.key === 'Escape' && open) {
        close();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  useEffect(() => {
    if (!editor || !open) return;
    editor.commands.setSearchQuery(query, caseSensitive);
  }, [editor, open, query, caseSensitive]);

  if (!open || !editor) return null;

  const { matches, active } = getSearchState(editor.state);
  const counter = matches.length === 0
    ? (query ? 'No results' : '')
    : `${active + 1} of ${matches.length}`;

  return (
    <div className="sticky top-14 z-30 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) editor.commands.goToPreviousMatch();
            else editor.commands.goToNextMatch();
          }
        }}
        placeholder="Find"
        aria-label="Find in document"
        className="h-8 w-44"
      />
      <span className="text-xs tabular-nums text-muted-foreground min-w-[5.5rem]">{counter}</span>
      <Button
        type="button" variant="ghost" size="icon" className="h-8 w-8"
        title="Previous match (Shift+Enter)" aria-label="Previous match"
        onClick={() => editor.commands.goToPreviousMatch()}
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button
        type="button" variant="ghost" size="icon" className="h-8 w-8"
        title="Next match (Enter)" aria-label="Next match"
        onClick={() => editor.commands.goToNextMatch()}
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
      <Button
        type="button" variant={caseSensitive ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8"
        title="Match case" aria-label="Match case" aria-pressed={caseSensitive}
        onClick={() => setCaseSensitive((v) => !v)}
      >
        <CaseSensitive className="h-4 w-4" />
      </Button>

      <div className="mx-1 h-5 w-px bg-border" />

      <Input
        value={replacement}
        onChange={(e) => setReplacement(e.target.value)}
        placeholder="Replace with"
        aria-label="Replace with"
        className="h-8 w-44"
      />
      <Button
        type="button" variant="outline" size="sm" className="h-8"
        disabled={matches.length === 0}
        onClick={() => editor.commands.replaceCurrentMatch(replacement)}
      >
        Replace
      </Button>
      <Button
        type="button" variant="outline" size="sm" className="h-8"
        disabled={matches.length === 0}
        onClick={() => editor.commands.replaceAllMatches(replacement)}
      >
        All
      </Button>

      <Button
        type="button" variant="ghost" size="icon" className="ml-auto h-8 w-8"
        title="Close (Esc)" aria-label="Close find and replace"
        onClick={close}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
