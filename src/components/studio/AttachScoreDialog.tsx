// AttachScoreDialog — lets the user search the music library and attach a
// score to the current Studio session. The chosen scoreId is surfaced via
// onAttach; the caller owns the session update.

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface AttachScoreDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAttach: (scoreId: string) => void;
}

interface ScoreRow {
  id: string;
  title: string;
  composer: string | null;
  voicing: string | null;
}

export function AttachScoreDialog({ open, onOpenChange, onAttach }: AttachScoreDialogProps) {
  const [query, setQuery] = useState('');

  const { data = [], isLoading } = useQuery<ScoreRow[]>({
    queryKey: ['studio-attach-score', query],
    enabled: open,
    queryFn: async () => {
      let q = supabase
        .from('gw_sheet_music')
        .select('id, title, composer, voicing')
        .limit(20);
      if (query.trim()) q = q.ilike('title', `%${query.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ScoreRow[];
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark bg-card text-foreground border-border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Attach score</DialogTitle>
        </DialogHeader>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title…"
          autoFocus
          className="bg-background border-border"
          onKeyDown={(e) => e.stopPropagation()}
        />
        <ul className="max-h-80 overflow-y-auto divide-y divide-border mt-2">
          {isLoading && (
            <li className="p-2 text-sm text-muted-foreground">Searching…</li>
          )}
          {data.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="w-full text-left p-2 hover:bg-muted transition-colors rounded"
                onClick={() => {
                  onAttach(s.id);
                  onOpenChange(false);
                  setQuery('');
                }}
              >
                <div className="text-sm font-medium">{s.title}</div>
                <div className="text-xs text-muted-foreground">
                  {[s.composer, s.voicing].filter(Boolean).join(' · ')}
                </div>
              </button>
            </li>
          ))}
          {!isLoading && data.length === 0 && (
            <li className="p-2 text-sm text-muted-foreground italic">No matches.</li>
          )}
        </ul>
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => { onOpenChange(false); setQuery(''); }}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
