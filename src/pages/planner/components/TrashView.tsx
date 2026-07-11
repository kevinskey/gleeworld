// Trash: soft-deleted notes with restore and (confirmed) permanent
// delete. Normal deletes always land here first.
import { formatDistanceToNow } from 'date-fns';
import { RotateCcw, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { deleteNoteForever, restoreNote } from '@/lib/planner/notesApi';
import type { NoteType } from '@/lib/planner/types';
import { useTrash } from '../hooks';
import { EmptyState } from './TasksView';
import { noteDisplayTitle } from '@/lib/planner/noteTitles';

export default function TrashView() {
  const { data: notes, isLoading } = useTrash(true);
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['planner'] });

  const restore = useMutation({
    mutationFn: restoreNote,
    onSuccess: () => { toast.success('Note restored'); invalidate(); },
    onError: () => toast.error('Could not restore the note'),
  });
  const destroy = useMutation({
    mutationFn: deleteNoteForever,
    onSuccess: () => { toast.success('Note permanently deleted'); invalidate(); },
    onError: () => toast.error('Could not delete the note'),
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Trash</h1>
        <p className="text-sm text-muted-foreground">Deleted notes stay here until you restore them or delete them permanently.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">{[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : !notes?.length ? (
        <EmptyState icon={Trash2} title="Trash is empty" body="Notes you delete will appear here." />
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((n) => (
            <div key={n.id} className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">
                  {noteDisplayTitle(n.title, n.note_type as NoteType, n.date_key)}
                </p>
                {n.deleted_at && (
                  <p className="text-xs text-muted-foreground">
                    Deleted {formatDistanceToNow(new Date(n.deleted_at), { addSuffix: true })}
                  </p>
                )}
              </div>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => restore.mutate(n.id)}>
                <RotateCcw className="h-3.5 w-3.5" /> Restore
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="gap-1 text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this note permanently?</AlertDialogTitle>
                    <AlertDialogDescription>
                      “{noteDisplayTitle(n.title, n.note_type as NoteType, n.date_key)}” and its revision history will be gone for good. This can't be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep it</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => destroy.mutate(n.id)}
                    >
                      Delete permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
