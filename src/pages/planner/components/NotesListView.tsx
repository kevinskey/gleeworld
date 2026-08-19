// Notes list for a scope (all / folder / tag / favorites) with create,
// and the note detail view (editor + context panel is composed by
// PlannerPage; this file is just the list).
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Plus, Star, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { createNote, trashNote } from '@/lib/planner/notesApi';
import type { NoteType } from '@/lib/planner/types';
import { useNotesList } from '../hooks';
import { EmptyState } from './TasksView';
import { noteDisplayTitle } from '@/lib/planner/noteTitles';

export interface NotesListViewProps {
  scope: { folderId?: string | null; tag?: string; favoritesOnly?: boolean };
  title: string;
  onOpenNote: (noteId: string) => void;
}

export default function NotesListView({ scope, title, onOpenNote }: NotesListViewProps) {
  const { data: notes, isLoading, isError } = useNotesList(scope);
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  const create = useMutation({
    mutationFn: () => createNote({ folder_id: scope.folderId ?? null }),
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: ['planner'] });
      onOpenNote(note.id);
    },
    onError: () => toast.error('Could not create the note'),
    onSettled: () => setCreating(false),
  });

  // Soft-delete via trashNote (sets deleted_at). Notes stay in Trash and
  // can be restored — matches the planner's existing two-step delete
  // (Trash → Delete forever) rather than nuking them from the row.
  const trash = useMutation({
    mutationFn: (id: string) => trashNote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planner'] });
      toast.success('Moved to Trash');
    },
    onError: () => toast.error('Could not delete the note'),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <Button
          size="sm"
          className="gap-1"
          disabled={creating}
          onClick={() => { setCreating(true); create.mutate(); }}
        >
          <Plus className="h-4 w-4" /> New note
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : isError ? (
        <EmptyState icon={FileText} title="Couldn't load notes" body="Check your connection and try again." />
      ) : !notes?.length ? (
        <EmptyState icon={FileText} title="No notes here yet" body="Create a note, or apply a template from the Templates view." />
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((n) => {
            const noteTitle = noteDisplayTitle(n.title, n.note_type as NoteType, n.date_key);
            // Row is a positioned container so the trash button can sit
            // as a SIBLING of the open-note button (nesting buttons is
            // invalid HTML). Trash stays visible at every width — the old
            // md:opacity-0 + group-hover reveal keyed on viewport width,
            // not pointer type, so iPads (md+ AND touch, no hover) had no
            // way to delete a note. Right padding on the button keeps text
            // from colliding with the trash zone.
            return (
              <div key={n.id} className="relative">
                <button
                  onClick={() => onOpenNote(n.id)}
                  className="flex w-full items-start gap-3 rounded-md border border-border bg-card px-3 py-2.5 pr-12 text-left transition-colors hover:bg-accent"
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-foreground">
                        {noteTitle}
                      </span>
                      {n.is_favorite && <Star className="h-3.5 w-3.5 shrink-0 fill-warning text-warning" aria-label="Favorite" />}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(n.updated_at), { addSuffix: true })}
                      </span>
                      {n.tags.slice(0, 4).map((t) => (
                        <Badge key={t} variant="outline" className="text-[11px] font-normal text-muted-foreground">#{t}</Badge>
                      ))}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!confirm(`Move "${noteTitle}" to Trash?`)) return;
                    trash.mutate(n.id);
                  }}
                  disabled={trash.isPending}
                  className="absolute top-1/2 right-2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10 disabled:opacity-40"
                  aria-label={`Delete ${noteTitle}`}
                  title="Move to Trash"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
