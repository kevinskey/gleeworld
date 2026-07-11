// Right-hand context panel for an open note: properties (folder,
// favorite, tags), backlinks, outgoing links, and version history with
// restore. Rendered inline on desktop, inside a sheet on mobile.
import { useState } from 'react';
import { format } from 'date-fns';
import { ExternalLink, FileClock, FileText, Link2, Star } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { moveToFolder, restoreRevision, setFavorite } from '@/lib/planner/notesApi';
import { entityRoute } from '@/lib/planner/wikiLinks';
import type { NoteType, PlannerEntityType, PlannerNote } from '@/lib/planner/types';
import { useBacklinks, useFolders, useRevisions } from '../hooks';
import { noteDisplayTitle } from '@/lib/planner/noteTitles';

const NO_FOLDER = '__none__';

export default function ContextPanel({ note, onOpenNote }: {
  note: PlannerNote;
  onOpenNote: (noteId: string) => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: folders } = useFolders();
  const { data: backlinks } = useBacklinks(note.id);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data: revisions } = useRevisions(note.id, historyOpen);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['planner'] });

  const favorite = useMutation({
    mutationFn: () => setFavorite(note.id, !note.is_favorite),
    onSuccess: invalidate,
    onError: () => toast.error('Could not update favorite'),
  });
  const move = useMutation({
    mutationFn: (folderId: string | null) => moveToFolder(note.id, folderId),
    onSuccess: invalidate,
    onError: () => toast.error('Could not move the note'),
  });
  const restore = useMutation({
    mutationFn: (revisionId: string) => restoreRevision(note.id, revisionId),
    onSuccess: () => { toast.success('Version restored'); invalidate(); },
    onError: () => toast.error('Could not restore that version'),
  });

  return (
    <div className="flex flex-col gap-4 text-sm">
      <section aria-label="Note properties" className="flex flex-col gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Properties</h2>
        <Button
          variant="outline" size="sm" className="justify-start gap-2"
          aria-pressed={note.is_favorite}
          onClick={() => favorite.mutate()}
        >
          <Star className={`h-4 w-4 ${note.is_favorite ? 'fill-warning text-warning' : ''}`} />
          {note.is_favorite ? 'Favorited' : 'Add to favorites'}
        </Button>
        {note.note_type === 'note' && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="planner-folder-select">Folder</label>
            <Select
              value={note.folder_id ?? NO_FOLDER}
              onValueChange={(v) => move.mutate(v === NO_FOLDER ? null : v)}
            >
              <SelectTrigger id="planner-folder-select" className="h-9">
                <SelectValue placeholder="No folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_FOLDER}>No folder</SelectItem>
                {(folders ?? []).map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {!!note.tags.length && (
          <div className="flex flex-wrap gap-1">
            {note.tags.map((t) => (
              <Badge key={t} variant="outline" className="text-[11px] font-normal text-muted-foreground">#{t}</Badge>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Created {format(new Date(note.created_at), 'MMM d, yyyy')} · Updated {format(new Date(note.updated_at), 'MMM d, yyyy h:mm a')}
        </p>
        {note.entity_type && note.entity_id && (
          <Button
            variant="outline" size="sm" className="justify-start gap-2"
            onClick={() => navigate(entityRoute({ entityType: note.entity_type as PlannerEntityType, entityId: note.entity_id! }))}
          >
            <ExternalLink className="h-4 w-4" /> Open linked {note.entity_type.replace('_', ' ')}
          </Button>
        )}
      </section>

      <Separator />

      <section aria-label="Backlinks" className="flex flex-col gap-2">
        <h2 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Link2 className="h-3.5 w-3.5" aria-hidden /> Linked from
        </h2>
        {!backlinks?.length ? (
          <p className="text-xs text-muted-foreground">No other notes link here yet. Type [[{note.title || 'this note'}]] elsewhere to create a link.</p>
        ) : backlinks.map((b) => (
          <button
            key={b.id}
            onClick={() => onOpenNote(b.id)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{noteDisplayTitle(b.title, b.note_type as NoteType, b.date_key)}</span>
          </button>
        ))}
      </section>

      <Separator />

      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2">
            <FileClock className="h-4 w-4" /> Version history
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-1 pt-1">
          {!revisions?.length ? (
            <p className="px-2 text-xs text-muted-foreground">Versions are kept each time the note saves.</p>
          ) : revisions.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1">
              <span className="text-xs text-muted-foreground">
                v{r.version} · {format(new Date(r.created_at), 'MMM d, h:mm a')}
              </span>
              <Button
                variant="ghost" size="sm" className="h-6 px-2 text-xs"
                onClick={() => restore.mutate(r.id)}
              >
                Restore
              </Button>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
