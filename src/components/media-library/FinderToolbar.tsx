import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  Search, 
  Grid3X3, 
  List, 
  Upload, 
  FolderPlus, 
  ArrowUpDown,
  Loader2
} from 'lucide-react';
import { ViewMode, SortBy, SortOrder } from './types';

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
  onNewFolder: () => void;
  isAdmin: boolean;
  uploading: boolean;
}

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
  onNewFolder,
  isAdmin,
  uploading
}: FinderToolbarProps) => {
  return (
    <div className="flex items-center gap-3 p-3 border-b border-border bg-muted/20">
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
        <SelectContent>
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

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="relative w-64">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
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
  );
};
