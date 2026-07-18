// Planner navigation rail: fixed views, folder tree, saved filters, and
// tags. Selection state lives in the URL (PlannerPage owns it); this
// component only reports clicks.
import { useState } from 'react';
import {
  CheckSquare, FileStack, FileText, FolderIcon, FolderPlus,
  KanbanSquare, Pencil, Plus, Search, Star, Sun, Tag, Trash2,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import * as foldersApi from '@/lib/planner/foldersApi';
import type { PlannerFolder, SavedFilter } from '@/lib/planner/types';
import { useAllTags, useFolders, useSavedFilters, useTaskCounts } from '../hooks';
import { deleteSavedFilter } from '@/lib/planner/searchApi';

export type PlannerSelection =
  | { view: 'today' }
  | { view: 'tasks' }
  | { view: 'kanban' }
  | { view: 'notes'; folderId?: string | null; tag?: string; favoritesOnly?: boolean }
  | { view: 'search'; filterId?: string }
  | { view: 'templates' }
  | { view: 'trash' };

export interface PlannerSidebarProps {
  selection: PlannerSelection;
  onSelect: (sel: PlannerSelection) => void;
  /** Create a new note and open it — the always-visible primary action. */
  onNewNote: () => void;
  creatingNote?: boolean;
}

function NavButton({ active, onClick, icon: Icon, label, badge }: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
        active ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1 truncate text-left">{label}</span>
      {!!badge && <Badge variant="outline" className="h-5 px-1.5 text-[11px] font-normal text-muted-foreground">{badge}</Badge>}
    </button>
  );
}

export default function PlannerSidebar({ selection, onSelect, onNewNote, creatingNote }: PlannerSidebarProps) {
  const { data: folders } = useFolders();
  const { data: filters } = useSavedFilters();
  const { data: tags } = useAllTags();
  const { data: counts } = useTaskCounts();
  const qc = useQueryClient();

  const [folderDialog, setFolderDialog] = useState<{ mode: 'create' | 'rename'; folder?: PlannerFolder } | null>(null);
  const [folderName, setFolderName] = useState('');

  const invalidateFolders = () => qc.invalidateQueries({ queryKey: ['planner', 'folders'] });
  const createFolder = useMutation({
    mutationFn: (name: string) => foldersApi.createFolder(name),
    onSuccess: invalidateFolders,
    onError: () => toast.error('Could not create the folder'),
  });
  const renameFolder = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => foldersApi.renameFolder(id, name),
    onSuccess: invalidateFolders,
    onError: () => toast.error('Could not rename the folder'),
  });
  const removeFolder = useMutation({
    mutationFn: (id: string) => foldersApi.deleteFolder(id),
    onSuccess: () => {
      invalidateFolders();
      qc.invalidateQueries({ queryKey: ['planner', 'notes'] });
      toast.success('Folder deleted — its notes moved to All notes');
    },
    onError: () => toast.error('Could not delete the folder'),
  });
  const removeFilter = useMutation({
    mutationFn: deleteSavedFilter,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planner', 'saved-filters'] }),
    onError: () => toast.error('Could not delete the filter'),
  });

  const submitFolderDialog = () => {
    const name = folderName.trim();
    if (!name || !folderDialog) return;
    if (folderDialog.mode === 'create') createFolder.mutate(name);
    else if (folderDialog.folder) renameFolder.mutate({ id: folderDialog.folder.id, name });
    setFolderDialog(null);
    setFolderName('');
  };

  const tree = foldersApi.folderTree(folders ?? []);
  const renderFolders = (parentId: string | null, depth: number): React.ReactNode =>
    (tree.get(parentId) ?? []).map((f) => (
      <div key={f.id} style={{ paddingLeft: depth ? depth * 12 : undefined }}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div>
              <NavButton
                active={selection.view === 'notes' && selection.folderId === f.id}
                onClick={() => onSelect({ view: 'notes', folderId: f.id })}
                icon={FolderIcon}
                label={f.name}
              />
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => { setFolderDialog({ mode: 'rename', folder: f }); setFolderName(f.name); }}>
              <Pencil className="mr-2 h-4 w-4" /> Rename
            </ContextMenuItem>
            <ContextMenuItem className="text-destructive focus:text-destructive" onClick={() => removeFolder.mutate(f.id)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete folder
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        {renderFolders(f.id, depth + 1)}
      </div>
    ));

  return (
    <nav aria-label="Planner" className="flex flex-col gap-4 p-3">
      {/* Primary action, always at the top of the always-visible rail: one
          click to a new note from any planner view (no menu, no scroll). */}
      <Button className="w-full justify-start gap-2" size="sm" onClick={onNewNote} disabled={creatingNote}>
        <Plus className="h-4 w-4" /> New note
      </Button>

      <div className="flex flex-col gap-0.5">
        <NavButton active={selection.view === 'today'} onClick={() => onSelect({ view: 'today' })} icon={Sun} label="Today" badge={counts?.today} />
        <NavButton active={selection.view === 'tasks'} onClick={() => onSelect({ view: 'tasks' })} icon={CheckSquare} label="Tasks" badge={counts?.overdue} />
        <NavButton active={selection.view === 'kanban'} onClick={() => onSelect({ view: 'kanban' })} icon={KanbanSquare} label="Board" />
        <NavButton active={selection.view === 'search' && !selection.filterId} onClick={() => onSelect({ view: 'search' })} icon={Search} label="Search" />
        <NavButton
          active={selection.view === 'notes' && !selection.folderId && !selection.tag && !selection.favoritesOnly}
          onClick={() => onSelect({ view: 'notes' })}
          icon={FileText}
          label="All notes"
        />
        <NavButton
          active={selection.view === 'notes' && !!selection.favoritesOnly}
          onClick={() => onSelect({ view: 'notes', favoritesOnly: true })}
          icon={Star}
          label="Favorites"
        />
        <NavButton active={selection.view === 'templates'} onClick={() => onSelect({ view: 'templates' })} icon={FileStack} label="Templates" />
      </div>

      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Folders</h2>
          <Button
            variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground"
            aria-label="New folder"
            onClick={() => { setFolderDialog({ mode: 'create' }); setFolderName(''); }}
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
        </div>
        {folders?.length ? renderFolders(null, 0) : (
          <p className="px-2 text-xs text-muted-foreground">Group project and rehearsal notes into folders.</p>
        )}
      </div>

      {!!filters?.length && (
        <div className="flex flex-col gap-0.5">
          <h2 className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Saved filters</h2>
          {filters.map((f: SavedFilter) => (
            <ContextMenu key={f.id}>
              <ContextMenuTrigger asChild>
                <div>
                  <NavButton
                    active={selection.view === 'search' && selection.filterId === f.id}
                    onClick={() => onSelect({ view: 'search', filterId: f.id })}
                    icon={Search}
                    label={f.name}
                  />
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem className="text-destructive focus:text-destructive" onClick={() => removeFilter.mutate(f.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete filter
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
      )}

      {!!tags?.length && (
        <div className="flex flex-col gap-0.5">
          <h2 className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tags</h2>
          {tags.slice(0, 12).map((t) => (
            <NavButton
              key={t}
              active={selection.view === 'notes' && selection.tag === t}
              onClick={() => onSelect({ view: 'notes', tag: t })}
              icon={Tag}
              label={`#${t}`}
            />
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-2">
        <NavButton active={selection.view === 'trash'} onClick={() => onSelect({ view: 'trash' })} icon={Trash2} label="Trash" />
      </div>

      <Dialog open={!!folderDialog} onOpenChange={(open) => { if (!open) setFolderDialog(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{folderDialog?.mode === 'create' ? 'New folder' : 'Rename folder'}</DialogTitle>
          </DialogHeader>
          <Input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitFolderDialog(); }}
            placeholder="Folder name"
            aria-label="Folder name"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialog(null)}>Cancel</Button>
            <Button disabled={!folderName.trim()} onClick={submitFolderDialog}>
              {folderDialog?.mode === 'create' ? 'Create' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </nav>
  );
}
