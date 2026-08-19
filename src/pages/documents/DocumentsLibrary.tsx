// Documents library — personal word processor documents (gw_personal_docs).
// Lists every doc the signed-in user owns (RLS scopes listDocs() to
// auth.uid()), lets them start a new one, and open/delete existing ones.
// The editor itself (DocumentEditorPage, Task 9) renders its own content
// only — this page's job is discovery + create + delete, wrapped by the
// dashboard shell at the route level (App.tsx), not here.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Loader2, MoreVertical, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { listDocs, createDoc, deleteDoc, type PersonalDocListItem } from '@/lib/documents/personalDocsApi';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const DOCS_QUERY_KEY = ['personal-docs'] as const;

export default function DocumentsLibrary() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: docs, isLoading, isError } = useQuery({
    queryKey: DOCS_QUERY_KEY,
    queryFn: listDocs,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDoc(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DOCS_QUERY_KEY });
      toast.success('Document deleted');
    },
    onError: () => toast.error('Could not delete this document.'),
    onSettled: () => setDeletingId(null),
  });

  const handleNewDocument = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) {
        toast.error('You need to be signed in to create a document.');
        return;
      }
      const doc = await createDoc(userId);
      navigate(`/dashboard/documents/${doc.id}`);
    } catch {
      toast.error('Could not create a new document.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardPageShell
      title="Documents"
      icon={FileText}
      subtitle="Essays, program notes, and research papers, saved to your personal library."
      actions={
        <Button size="sm" className="gap-1.5" disabled={creating} onClick={() => void handleNewDocument()}>
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          New document
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : isError ? (
        <EmptyState
          title="Couldn't load your documents"
          body="Check your connection and try again."
        />
      ) : !docs?.length ? (
        <EmptyState
          title="No documents yet"
          body="Write essays, program notes, and research papers — without leaving GleeWorld."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {docs.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              onOpen={() => navigate(`/dashboard/documents/${doc.id}`)}
              onRequestDelete={() => setDeletingId(doc.id)}
            />
          ))}
        </div>
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document? This can&apos;t be undone.</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deletingId) deleteMutation.mutate(deletingId); }}
              disabled={deleteMutation.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardPageShell>
  );
}

function DocumentRow({ doc, onOpen, onRequestDelete }: {
  doc: PersonalDocListItem;
  onOpen: () => void;
  onRequestDelete: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-start gap-3 rounded-md border border-border bg-card px-3 py-2.5 pr-12 text-left transition-colors hover:bg-accent"
      >
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{doc.title}</span>
          <span className="text-xs text-muted-foreground">
            {doc.word_count.toLocaleString()} words · {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
          </span>
        </span>
      </button>

      <div className="absolute top-1/2 right-1 -translate-y-1/2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label={`More actions for ${doc.title}`}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => { e.stopPropagation(); onRequestDelete(); }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-border bg-card px-6 py-10">
      <FileText className="h-6 w-6 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
