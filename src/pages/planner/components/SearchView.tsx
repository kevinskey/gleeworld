// Global planner search: server-side ilike over title/content_text
// (trigram-indexed) + tag filter, with save-as-filter. Task title search
// rides along below the note results.
import { useEffect, useMemo, useState } from 'react';
import { BookmarkPlus, Search as SearchIcon, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { createSavedFilter } from '@/lib/planner/searchApi';
import type { SavedFilterQuery } from '@/lib/planner/types';
import { useAllTags, useNoteSearch } from '../hooks';
import { EmptyState } from './TasksView';
import { noteDisplayTitle } from '@/lib/planner/noteTitles';
import type { NoteType } from '@/lib/planner/types';

export interface SearchViewProps {
  initialQuery?: SavedFilterQuery;
  onOpenNote: (noteId: string) => void;
}

export default function SearchView({ initialQuery, onOpenNote }: SearchViewProps) {
  const [text, setText] = useState(initialQuery?.text ?? '');
  const [debounced, setDebounced] = useState(text);
  const [tags, setTags] = useState<string[]>(initialQuery?.tags ?? []);
  const [saveOpen, setSaveOpen] = useState(false);
  const [filterName, setFilterName] = useState('');
  const { data: allTags } = useAllTags();
  const qc = useQueryClient();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text), 300);
    return () => clearTimeout(t);
  }, [text]);

  // re-seed when a saved filter is opened
  useEffect(() => {
    setText(initialQuery?.text ?? '');
    setTags(initialQuery?.tags ?? []);
  }, [initialQuery]);

  const query: SavedFilterQuery = useMemo(
    () => ({ text: debounced || undefined, tags: tags.length ? tags : undefined }),
    [debounced, tags],
  );
  const active = !!(query.text || query.tags);
  const { data: hits, isLoading } = useNoteSearch(query, active);

  const saveFilter = useMutation({
    mutationFn: () => createSavedFilter(filterName.trim(), query),
    onSuccess: () => {
      toast.success('Filter saved to the sidebar');
      qc.invalidateQueries({ queryKey: ['planner', 'saved-filters'] });
      setSaveOpen(false);
      setFilterName('');
    },
    onError: () => toast.error('Could not save the filter'),
  });

  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-foreground">Search</h1>
        {active && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSaveOpen(true)}>
            <BookmarkPlus className="h-4 w-4" /> Save filter
          </Button>
        )}
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search notes and tasks…"
          aria-label="Search"
          className="pl-9"
        />
      </div>

      {!!allTags?.length && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by tag">
          {allTags.slice(0, 24).map((t) => (
            <button key={t} onClick={() => toggleTag(t)} aria-pressed={tags.includes(t)}>
              <Badge
                variant={tags.includes(t) ? 'default' : 'outline'}
                className="cursor-pointer text-[11px] font-normal"
              >
                #{t}{tags.includes(t) && <X className="ml-1 h-3 w-3" aria-hidden />}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {!active ? (
        <EmptyState icon={SearchIcon} title="Search your planner" body="Find notes by title, body text, or tags — results are scoped to what you can access." />
      ) : isLoading ? (
        <div className="flex flex-col gap-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : !hits?.length ? (
        <EmptyState icon={SearchIcon} title="No matches" body="Try fewer words or different tags." />
      ) : (
        <div className="flex flex-col gap-2" aria-live="polite">
          {hits.map((h) => (
            <button
              key={h.id}
              onClick={() => onOpenNote(h.id)}
              className="flex flex-col gap-0.5 rounded-md border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent"
            >
              <span className="truncate text-sm font-medium text-foreground">
                {noteDisplayTitle(h.title, h.note_type as NoteType, h.date_key)}
              </span>
              {h.snippet && <span className="line-clamp-2 text-xs text-muted-foreground">{h.snippet}</span>}
            </button>
          ))}
        </div>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Save this search</DialogTitle></DialogHeader>
          <Input
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            placeholder="Filter name (e.g. Concert prep)"
            aria-label="Filter name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button disabled={!filterName.trim() || saveFilter.isPending} onClick={() => saveFilter.mutate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
