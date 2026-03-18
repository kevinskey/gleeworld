import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Folder, 
  FolderOpen,
  Star, 
  Trash2, 
  Clock,
  ChevronDown,
  ChevronRight,
  HardDrive,
  FolderPlus,
  Home,
  Download,
  Tag
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAllMediaFolders, MediaFolder } from '@/hooks/useMediaFolders';
import { Button } from '@/components/ui/button';
import { DroppableFolder } from './DroppableFolder';

interface FinderSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  fileCounts: Record<string, number>;
  usedStorage: string;
  selectedFolderId?: string | null;
  onFolderSelect?: (folderId: string | null) => void;
  onNewFolder?: () => void;
  isAdmin?: boolean;
  onNativeFileDrop?: (files: File[], folderId: string) => void;
  className?: string;
}

export const FinderSidebar = ({
  activeSection,
  onSectionChange,
  fileCounts,
  usedStorage,
  selectedFolderId,
  onFolderSelect,
  onNewFolder,
  isAdmin,
  onNativeFileDrop,
  className
}: FinderSidebarProps) => {
  const [favoritesOpen, setFavoritesOpen] = useState(true);
  const [locationsOpen, setLocationsOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const { data: folders = [] } = useAllMediaFolders();

  // Favorites section items
  const favoriteItems = [
    { id: 'recents', label: 'Recents', icon: Clock },
    { id: 'favorites', label: 'Favorites', icon: Star, count: fileCounts.favorites },
    { id: 'downloads', label: 'Downloads', icon: Download },
  ];

  // Tag items (we can expand this later)
  const tagItems = [
    { id: 'tag-important', label: 'Important', color: 'bg-red-500' },
    { id: 'tag-work', label: 'Work', color: 'bg-blue-500' },
    { id: 'tag-personal', label: 'Personal', color: 'bg-green-500' },
  ];

  const toggleFolderExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const renderSidebarItem = (item: { id: string; label: string; icon: any; count?: number }) => (
    <button
      key={item.id}
      onClick={() => {
        onSectionChange(item.id);
        onFolderSelect?.(null);
      }}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left",
        activeSection === item.id && !selectedFolderId
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      <span className="truncate flex-1">{item.label}</span>
      {item.count !== undefined && item.count > 0 && (
        <span className="text-xs text-muted-foreground">{item.count}</span>
      )}
    </button>
  );

  const renderTagItem = (item: { id: string; label: string; color: string }) => (
    <button
      key={item.id}
      onClick={() => {
        onSectionChange(item.id);
        onFolderSelect?.(null);
      }}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left",
        activeSection === item.id && !selectedFolderId
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <div className={cn("h-3 w-3 rounded-full flex-shrink-0", item.color)} />
      <span className="truncate flex-1">{item.label}</span>
    </button>
  );

  // Recursive folder tree rendering
  const renderFolderTree = (folder: MediaFolder, level: number = 0) => {
    const isActive = selectedFolderId === folder.id;
    const FolderIcon = isActive ? FolderOpen : Folder;
    const childFolders = folders.filter(f => f.parent_id === folder.id);
    const hasChildren = childFolders.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    
    return (
      <div key={folder.id}>
        <DroppableFolder id={folder.id} onNativeFileDrop={onNativeFileDrop}>
          <button
            onClick={() => {
              onFolderSelect?.(folder.id);
              onSectionChange('folder');
            }}
            className={cn(
              "w-full flex items-center gap-1.5 py-1.5 rounded-md text-sm transition-colors text-left group",
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            style={{ paddingLeft: `${8 + level * 16}px`, paddingRight: '8px' }}
          >
            {/* Expand/collapse button */}
            {hasChildren ? (
              <button
                onClick={(e) => toggleFolderExpand(folder.id, e)}
                className="p-0.5 hover:bg-muted-foreground/20 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            ) : (
              <div className="w-4" />
            )}
            <FolderIcon className="h-4 w-4 flex-shrink-0 text-amber-500" />
            <span className="truncate flex-1">{folder.name}</span>
          </button>
        </DroppableFolder>
        
        {/* Child folders */}
        {hasChildren && isExpanded && (
          <div>
            {childFolders.map(child => renderFolderTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Get root folders only
  const rootFolders = folders.filter(f => !f.parent_id);

  return (
    <div className="w-56 border-r border-border bg-muted/30 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {/* Favorites section */}
        <Collapsible open={favoritesOpen} onOpenChange={setFavoritesOpen}>
          <CollapsibleTrigger className="w-full flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground">
            {favoritesOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Favorites
          </CollapsibleTrigger>
          <CollapsibleContent className="px-2 pb-2 space-y-0.5">
            {favoriteItems.map(renderSidebarItem)}
          </CollapsibleContent>
        </Collapsible>

        {/* Locations section (All Files + Folders Tree) */}
        <Collapsible open={locationsOpen} onOpenChange={setLocationsOpen} className="border-t border-border/50">
          <CollapsibleTrigger className="w-full flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground">
            {locationsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <span className="flex-1 text-left">Locations</span>
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onNewFolder?.();
                }}
              >
                <FolderPlus className="h-3 w-3" />
              </Button>
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="px-2 pb-2 space-y-0.5">
            {/* All Files */}
            <button
              onClick={() => {
                onSectionChange('all');
                onFolderSelect?.(null);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left",
                activeSection === 'all' && !selectedFolderId
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Home className="h-4 w-4 flex-shrink-0" />
              <span className="truncate flex-1">All Files</span>
              <span className="text-xs text-muted-foreground">{fileCounts.all}</span>
            </button>

            {/* Folder Tree */}
            {rootFolders.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {rootFolders.map(folder => renderFolderTree(folder))}
              </div>
            )}

            {/* New Folder button for admins */}
            {isAdmin && (
              <button
                onClick={onNewFolder}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left mt-1"
              >
                <FolderPlus className="h-4 w-4 flex-shrink-0" />
                <span className="truncate flex-1">New Folder...</span>
              </button>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Tags section */}
        <Collapsible open={tagsOpen} onOpenChange={setTagsOpen} className="border-t border-border/50">
          <CollapsibleTrigger className="w-full flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground">
            {tagsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Tags
          </CollapsibleTrigger>
          <CollapsibleContent className="px-2 pb-2 space-y-0.5">
            {tagItems.map(renderTagItem)}
          </CollapsibleContent>
        </Collapsible>

        {/* Trash */}
        <div className="border-t border-border/50 p-2">
          <button
            onClick={() => {
              onSectionChange('trash');
              onFolderSelect?.(null);
            }}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left",
              activeSection === 'trash' && !selectedFolderId
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Trash2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate flex-1">Trash</span>
            {fileCounts.trash > 0 && (
              <span className="text-xs text-muted-foreground">{fileCounts.trash}</span>
            )}
          </button>
        </div>
      </div>

      {/* Storage indicator */}
      <div className="border-t border-border p-3 space-y-2 bg-muted/20">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <HardDrive className="h-3 w-3" />
          <span>Storage</span>
        </div>
        <Progress value={Math.min(parseFloat(usedStorage) * 10, 100)} className="h-1.5" />
        <p className="text-xs text-muted-foreground">{usedStorage} GB used</p>
      </div>
    </div>
  );
};
