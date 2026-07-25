// GleeWorld Planner ("Notes" in the nav) — the workspace shell.
// One route, URL-addressable state:
//   /planner                     → Today (daily note + events + tasks)
//   /planner?view=tasks|kanban|notes|search|templates|trash
//   /planner?view=calendar&ptype=weekly&pkey=2026-W42
//   /planner/:noteId             → a specific note
// Three panels: sidebar (sheet on mobile), main view, and a context
// panel for open notes (inline on xl, sheet below).
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Info, Menu, Plus, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { periodKey, PERIOD_TYPES, type PeriodType } from '@/lib/planner/dateKeys';
import { createNote, trashNote } from '@/lib/planner/notesApi';
import { useNote, useSavedFilters } from './hooks';
import ContextPanel from './components/ContextPanel';
import KanbanView from './components/KanbanView';
import NoteEditor from './components/NoteEditor';
import NotesListView from './components/NotesListView';
import PeriodView from './components/PeriodView';
import PlannerSidebar, { type PlannerSelection } from './components/PlannerSidebar';
import SearchView from './components/SearchView';
import TasksView from './components/TasksView';
import TemplatesView from './components/TemplatesView';
import TrashView from './components/TrashView';

export default function PlannerPage() {
  const { noteId } = useParams<{ noteId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const view = params.get('view') ?? (noteId ? 'note' : 'today');
  const rawPtype = params.get('ptype');
  const ptype: PeriodType = PERIOD_TYPES.includes(rawPtype as PeriodType) ? (rawPtype as PeriodType) : 'daily';
  const pkey = params.get('pkey') ?? periodKey(new Date(), ptype);

  const selection: PlannerSelection = useMemo(() => {
    switch (view) {
      case 'tasks': return { view: 'tasks' };
      case 'kanban': return { view: 'kanban' };
      case 'templates': return { view: 'templates' };
      case 'trash': return { view: 'trash' };
      case 'search': return { view: 'search', filterId: params.get('filter') ?? undefined };
      case 'notes': return {
        view: 'notes',
        folderId: params.get('folder') ?? undefined,
        tag: params.get('tag') ?? undefined,
        favoritesOnly: params.get('fav') === '1' || undefined,
      };
      default: return { view: 'today' };
    }
  }, [view, params]);

  const select = useCallback((sel: PlannerSelection) => {
    setSidebarOpen(false);
    const p = new URLSearchParams();
    p.set('view', sel.view);
    if (sel.view === 'notes') {
      if (sel.folderId) p.set('folder', sel.folderId);
      if (sel.tag) p.set('tag', sel.tag);
      if (sel.favoritesOnly) p.set('fav', '1');
    }
    if (sel.view === 'search' && sel.filterId) p.set('filter', sel.filterId);
    if (sel.view === 'today') return navigate('/planner');
    navigate(`/planner?${p.toString()}`);
  }, [navigate]);

  const openNote = useCallback((id: string) => {
    setSidebarOpen(false);
    navigate(`/planner/${id}`);
  }, [navigate]);

  // One-tap "New note", available from the always-visible chrome (sidebar on
  // desktop, top-bar row on mobile) so starting a note never takes a trip
  // through the menu. Files into the current folder when a folder view is
  // open, else unfiled, then opens the editor.
  const qc = useQueryClient();
  const newNote = useMutation({
    mutationFn: (folderId: string | null) => createNote({ folder_id: folderId }),
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: ['planner'] });
      openNote(note.id);
    },
    onError: () => toast.error('Could not create the note'),
  });
  const handleNewNote = useCallback(() => {
    if (newNote.isPending) return;
    newNote.mutate(view === 'notes' ? params.get('folder') ?? null : null);
  }, [newNote, view, params]);

  const openPeriod = useCallback((type: PeriodType, key: string) => {
    const todayNow = periodKey(new Date(), 'daily');
    if (type === 'daily' && key === todayNow) return navigate('/planner');
    navigate(`/planner?view=calendar&ptype=${type}&pkey=${key}`);
  }, [navigate]);

  const sidebar = (
    <PlannerSidebar selection={selection} onSelect={select} />
  );

  return (
    <div className="mx-auto flex w-full max-w-none px-2 sm:px-4">
      {/* Desktop sidebar. lg+ only — at md (iPad portrait) the dashboard nav
          is already showing, and a second inline sidebar squeezed the actual
          content into a sliver. Tablets use the Menu sheet like phones. */}
      <aside className="sticky top-[var(--gw-header-h,64px)] hidden h-[calc(100vh-var(--gw-header-h,64px))] w-60 shrink-0 self-start overflow-y-auto border-r border-border lg:block">
        {sidebar}
      </aside>

      <div className="min-w-0 flex-1 px-4 py-4 lg:px-6">
        {/* Mobile / tablet / narrow-desktop top bar — Menu opens the sidebar
            popover; the primary "New note" action sits alongside so it's
            reachable without going through Menu. Hidden at lg+ where the
            persistent sidebar carries both. */}
        <div className="mb-3 flex items-center gap-2 lg:hidden">
          <Popover open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5" aria-label="Open planner menu">
                <Menu className="h-4 w-4" /> Menu
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="max-h-[70vh] w-72 overflow-y-auto p-0">
              {sidebar}
            </PopoverContent>
          </Popover>
          <Button
            size="sm"
            className="gap-1.5"
            disabled={newNote.isPending}
            onClick={handleNewNote}
          >
            <Plus className="h-4 w-4" /> New note
          </Button>
        </div>

        {noteId ? (
          <NoteView noteId={noteId} onOpenNote={openNote} onBack={() => navigate('/planner?view=notes')} />
        ) : view === 'tasks' ? (
          <TasksView onOpenNote={openNote} />
        ) : view === 'kanban' ? (
          <KanbanView onOpenNote={openNote} />
        ) : view === 'templates' ? (
          <TemplatesView onOpenNote={openNote} />
        ) : view === 'trash' ? (
          <TrashView />
        ) : view === 'search' ? (
          <SearchWithFilter filterId={params.get('filter')} onOpenNote={openNote} />
        ) : view === 'notes' ? (
          <NotesListView
            scope={{
              folderId: params.get('folder') ?? (params.get('tag') || params.get('fav') ? undefined : null),
              tag: params.get('tag') ?? undefined,
              favoritesOnly: params.get('fav') === '1',
            }}
            title={params.get('tag') ? `#${params.get('tag')}` : params.get('fav') === '1' ? 'Favorites' : 'Notes'}
            onOpenNote={openNote}
          />
        ) : (
          <PeriodView
            type={view === 'calendar' ? ptype : 'daily'}
            dateKey={view === 'calendar' ? pkey : periodKey(new Date(), 'daily')}
            onNavigate={openPeriod}
            onOpenNote={openNote}
            onNewNote={handleNewNote}
            creatingNote={newNote.isPending}
          />
        )}
      </div>
    </div>
  );
}

function SearchWithFilter({ filterId, onOpenNote }: { filterId: string | null; onOpenNote: (id: string) => void }) {
  const { data: filters } = useSavedFilters();
  const filter = filterId ? filters?.find((f) => f.id === filterId) : undefined;
  return <SearchView key={filterId ?? 'blank'} initialQuery={filter?.query} onOpenNote={onOpenNote} />;
}

function NoteView({ noteId, onOpenNote, onBack }: {
  noteId: string;
  onOpenNote: (id: string) => void;
  onBack: () => void;
}) {
  const { data: note, isLoading, isError } = useNote(noteId);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const qc = useQueryClient();
  const trash = useMutation({
    mutationFn: () => trashNote(noteId),
    onSuccess: () => {
      toast.success('Note moved to Trash');
      qc.invalidateQueries({ queryKey: ['planner'] });
      onBack();
    },
    onError: () => toast.error('Could not delete the note'),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (isError || !note) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border bg-card px-6 py-10">
        <p className="text-sm font-medium text-foreground">This note isn't available.</p>
        <p className="text-sm text-muted-foreground">It may have been deleted, or you may not have access to it.</p>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back to notes
        </Button>
      </div>
    );
  }
  if (note.deleted_at) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border bg-card px-6 py-10">
        <p className="text-sm font-medium text-foreground">This note is in the Trash.</p>
        <p className="text-sm text-muted-foreground">Restore it from the Trash view to keep editing.</p>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back to notes
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> Notes
          </Button>
          <div className="flex items-center gap-1">
            {/* Context panel on smaller screens */}
            <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 xl:hidden" aria-label="Note details">
                  <Info className="h-4 w-4" /> Details
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 overflow-y-auto">
                <SheetHeader><SheetTitle className="text-base">Note details</SheetTitle></SheetHeader>
                <div className="pt-4">
                  <ContextPanel note={note} onOpenNote={(id) => { setDetailsOpen(false); onOpenNote(id); }} />
                </div>
              </SheetContent>
            </Sheet>
            <Button
              variant="ghost" size="sm"
              className="gap-1.5 text-muted-foreground hover:text-destructive"
              onClick={() => trash.mutate()}
              disabled={trash.isPending}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <NoteEditor
            note={note}
            onSaved={(saved) => qc.setQueryData(['planner', 'note', noteId], saved)}
          />
        </div>
      </div>

      {/* Inline context panel on wide screens */}
      <aside className="sticky top-[calc(var(--gw-header-h,64px)+1rem)] hidden w-56 shrink-0 self-start xl:block">
        <ContextPanel note={note} onOpenNote={onOpenNote} />
      </aside>
    </div>
  );
}
