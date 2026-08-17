// "Add from Library" — search the shared score library (gw_sheet_music,
// via the authenticated gw_sheet_music_browse view) or the signed-in
// user's personal scores (gw_personal_scores) and drop one into the
// program as a new piece.
//
// Personal-score picks leave `sheet_music_id: null` — the FK on
// gw_concert_program_pieces targets gw_sheet_music only, so a personal
// score is copied by VALUE (title/composer/voicing), not by reference.
//
// The dialog only fetches + maps rows; it never writes. Picking a row
// calls onPick and closes — the page decides how to apply it
// (addPieceToGroup for a single pick here; the batch-insert handler for
// setlist import lives in SetlistImportDialog's sibling on the page).
import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export interface LibraryPickFields {
  title: string;
  composer: string | null;
  voicing: string | null;
  sheet_music_id: string | null;
}

export interface LibraryPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (fields: LibraryPickFields) => void;
}

interface LibraryRow {
  id: string;
  title: string;
  composer: string | null;
  voicing: string | null;
}

type LibraryTab = 'scores' | 'mine';

const SEARCH_DEBOUNCE_MS = 300;

function LibraryResultList({
  loading, error, rows, onRetry, onPick,
}: {
  loading: boolean;
  error: boolean;
  rows: LibraryRow[];
  onRetry: () => void;
  onPick: (row: LibraryRow) => void;
}) {
  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin inline-block mr-1.5" /> Loading…
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-8 text-center space-y-2">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load — try again</p>
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>Retry</Button>
      </div>
    );
  }
  if (rows.length === 0) {
    return <div className="py-8 text-center text-sm text-muted-foreground">No results</div>;
  }
  return (
    <ul className="max-h-72 overflow-y-auto divide-y divide-border -mx-1">
      {rows.map((row) => (
        <li key={row.id}>
          <button
            type="button"
            onClick={() => onPick(row)}
            className="w-full text-left px-2 py-2 rounded-md hover:bg-muted transition-colors"
          >
            <div className="text-sm font-medium truncate">{row.title}</div>
            <div className="text-xs text-muted-foreground truncate">
              {[row.composer, row.voicing].filter(Boolean).join(' · ') || '—'}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function LibraryPickerDialog({ open, onOpenChange, onPick }: LibraryPickerDialogProps) {
  const [tab, setTab] = useState<LibraryTab>('scores');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [rows, setRows] = useState<LibraryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Debounce the search box — one query per pause, not per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // Fresh state every time the dialog opens (reopen shouldn't show a
  // stale search or a stale error from the last time it was open).
  useEffect(() => {
    if (!open) return;
    setTab('scores');
    setQuery('');
    setDebouncedQuery('');
  }, [open]);

  const fetchRows = useCallback(async (activeTab: LibraryTab, q: string) => {
    setLoading(true);
    setError(false);
    try {
      const table = activeTab === 'scores' ? 'gw_sheet_music_browse' : 'gw_personal_scores';
      let builder = supabase.from(table).select('id, title, composer, voicing');
      const trimmed = q.trim();
      if (trimmed) builder = builder.or(`title.ilike.%${trimmed}%,composer.ilike.%${trimmed}%`);
      const { data, error: err } = await builder.order('title').limit(50);
      if (err) { setError(true); setRows([]); return; }
      setRows((data ?? []) as LibraryRow[]);
    } catch {
      setError(true);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void fetchRows(tab, debouncedQuery);
  }, [open, tab, debouncedQuery, fetchRows]);

  const handlePick = (row: LibraryRow) => {
    onPick({
      title: row.title,
      composer: row.composer ?? null,
      voicing: row.voicing ?? null,
      sheet_music_id: tab === 'scores' ? row.id : null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add from library</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as LibraryTab)}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="scores">Scores</TabsTrigger>
            <TabsTrigger value="mine">My Music</TabsTrigger>
          </TabsList>
          <Input
            aria-label="Search library"
            placeholder="Search title or composer…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mt-3"
          />
          <TabsContent value="scores" className="mt-2">
            <LibraryResultList
              loading={loading}
              error={error}
              rows={rows}
              onRetry={() => fetchRows(tab, debouncedQuery)}
              onPick={handlePick}
            />
          </TabsContent>
          <TabsContent value="mine" className="mt-2">
            <LibraryResultList
              loading={loading}
              error={error}
              rows={rows}
              onRetry={() => fetchRows(tab, debouncedQuery)}
              onPick={handlePick}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
