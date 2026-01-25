import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Grid3X3, 
  List, 
  Upload, 
  FolderPlus, 
  ArrowUpDown,
  Loader2,
  FolderUp,
  Image,
  Video,
  Music,
  FileText,
  X
} from 'lucide-react';
import { ViewMode, SortBy, SortOrder } from './types';
import { cn } from '@/lib/utils';

interface FinderToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortBy;
  onSortByChange: (sort: SortBy) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (order: SortOrder) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onUpload: () => void;
  onUploadFolder: (files: File[]) => void;
  onNewFolder: () => void;
  isAdmin: boolean;
  uploading: boolean;
  activeFilters?: string[];
  onFilterToggle?: (filter: string) => void;
  onClearFilters?: () => void;
}

const filterOptions = [
  { id: 'image', label: 'Images', icon: Image, color: 'bg-green-500/10 text-slate-900 hover:bg-green-500/20 border-green-500/30' },
  { id: 'video', label: 'Videos', icon: Video, color: 'bg-purple-500/10 text-slate-900 hover:bg-purple-500/20 border-purple-500/30' },
  { id: 'audio', label: 'Audio', icon: Music, color: 'bg-blue-500/10 text-slate-900 hover:bg-blue-500/20 border-blue-500/30' },
  { id: 'document', label: 'Docs', icon: FileText, color: 'bg-orange-500/10 text-slate-900 hover:bg-orange-500/20 border-orange-500/30' },
];

export const FinderToolbar = ({
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  searchQuery,
  onSearchChange,
  onUpload,
  onUploadFolder,
  onNewFolder,
  isAdmin,
  uploading,
  activeFilters = [],
  onFilterToggle,
  onClearFilters
}: FinderToolbarProps) => {
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    onUploadFolder(fileArray);
    
    // Reset input
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col border-b border-border bg-muted/20">
      {/* Main toolbar row */}
      <div className="flex items-center gap-3 p-3">
        {/* View Toggle */}
        <ToggleGroup 
          type="single" 
          value={viewMode} 
          onValueChange={(v) => v && onViewModeChange(v as ViewMode)}
          className="bg-muted rounded-md p-0.5"
        >
          <ToggleGroupItem value="grid" size="sm" className="h-7 w-7 p-0">
            <Grid3X3 className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" size="sm" className="h-7 w-7 p-0">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(v) => onSortByChange(v as SortBy)}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="size">Size</SelectItem>
            <SelectItem value="type">Type</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="h-8 w-8 p-0"
        >
          <ArrowUpDown className={`h-4 w-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
        </Button>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5">
          {filterOptions.map(filter => {
            const isActive = activeFilters.includes(filter.id);
            const Icon = filter.icon;
            return (
              <button
                key={filter.id}
                onClick={() => onFilterToggle?.(filter.id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                  isActive 
                    ? filter.color
                    : "bg-muted/50 text-muted-foreground hover:bg-muted border-transparent"
                )}
              >
                <Icon className="h-3 w-3" />
                {filter.label}
              </button>
            );
          })}
          
          {activeFilters.length > 0 && (
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Actions */}
        {isAdmin && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onNewFolder}
              className="h-8"
            >
              <FolderPlus className="h-4 w-4 mr-1.5" />
              New Folder
            </Button>
            
            {/* Hidden folder input */}
            <input
              ref={folderInputRef}
              type="file"
              // @ts-ignore - webkitdirectory is valid
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
              onChange={handleFolderSelect}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => folderInputRef.current?.click()}
              disabled={uploading}
              className="h-8"
            >
              <FolderUp className="h-4 w-4 mr-1.5" />
              Folder
            </Button>
            
            <Button
              size="sm"
              onClick={onUpload}
              disabled={uploading}
              className="h-8"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-1.5" />
              )}
              Upload
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
