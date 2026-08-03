// Add a score to a music collection (gw_music_collections /
// gw_music_collection_items — schema shipped 20250809123333, previously
// unused by the Scores tab). Lists public/system collections plus the
// caller's own, and offers inline create-new. A dialog (not a nested
// dropdown submenu) so it works with touch targets on phones.
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FolderPlus, Layers, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { ScoreRow } from './types';

interface CollectionRow {
  id: string;
  title: string;
  is_system: boolean;
  owner_id: string | null;
}

export function AddToCollectionDialog({
  score, onOpenChange,
}: {
  score: ScoreRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const open = !!score;
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newTitle, setNewTitle] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: collections = [], isLoading } = useQuery<CollectionRow[]>({
    queryKey: ['music-collections'],
    enabled: open,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_music_collections')
        .select('id, title, is_system, owner_id')
        .order('is_system', { ascending: false })
        .order('title');
      if (error) throw error;
      return (data ?? []) as CollectionRow[];
    },
  });

  const addTo = async (collectionId: string) => {
    if (!score) return;
    setBusyId(collectionId);
    // `.select()` so an RLS-silenced no-op (or demo tenant) fails loudly.
    const { data, error } = await supabase
      .from('gw_music_collection_items')
      .insert({ collection_id: collectionId, sheet_music_id: score.id })
      .select('id')
      .maybeSingle();
    setBusyId(null);
    if (error) {
      if ((error as { code?: string }).code === '23505') {
        toast('Already in that collection.');
        return;
      }
      toast.error('Could not add to the collection — your role may not have permission.');
      return;
    }
    if (!data) {
      toast.error('Could not add to the collection — your role may not have permission.');
      return;
    }
    toast.success('Added to collection.');
    qc.invalidateQueries({ queryKey: ['collection-items'] });
    onOpenChange(false);
  };

  const createAndAdd = async () => {
    const title = newTitle.trim();
    if (!title || !user || !score) return;
    setCreating(true);
    const { data: created, error } = await supabase
      .from('gw_music_collections')
      .insert({ title, is_public: true, owner_id: user.id })
      .select('id')
      .maybeSingle();
    setCreating(false);
    if (error || !created) {
      toast.error('Could not create the collection.');
      return;
    }
    setNewTitle('');
    qc.invalidateQueries({ queryKey: ['music-collections'] });
    await addTo(created.id);
  };

  if (!score) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate">Add “{score.title}” to a collection</DialogTitle>
          <DialogDescription>
            Collections group scores for browsing — like folders, but a score can live in several.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 rounded-lg border">
          <div className="p-1">
            {isLoading ? (
              <div className="p-3 text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading collections…
              </div>
            ) : collections.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground">No collections yet — create one below.</div>
            ) : collections.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={busyId !== null}
                onClick={() => addTo(c.id)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-muted/60 text-left disabled:opacity-60"
              >
                {busyId === c.id
                  ? <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                  : <Layers className="w-4 h-4 text-muted-foreground shrink-0" />}
                <span className="text-sm truncate flex-1">{c.title}</span>
                {c.is_system && <span className="text-xs uppercase tracking-wider text-muted-foreground">System</span>}
              </button>
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-center gap-2 pt-1">
          <div className="relative flex-1">
            <FolderPlus className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void createAndAdd(); } }}
              placeholder="New collection name…"
              className="pl-8 h-9"
            />
          </div>
          <Button size="sm" onClick={createAndAdd} disabled={creating || !newTitle.trim()}>
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span className="ml-1">Create</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
