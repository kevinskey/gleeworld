import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  SlidersHorizontal, 
  Grid, 
  List,
  ChevronDown,
  X
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export interface FilterState {
  searchQuery: string;
  selectedCategory: string;
  formatFilter: 'all' | 'digital' | 'physical' | 'both';
  difficultyFilter: string;
  voicePartFilter: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list';
}

interface StreamlinedFilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  showFormatFilter?: boolean;
  showVoicePartFilter?: boolean;
}

export const StreamlinedFilterBar = ({
  filters,
  onFiltersChange,
  showFormatFilter = true,
  showVoicePartFilter = true,
}: StreamlinedFilterBarProps) => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'searchQuery') return value.trim() !== '';
    if (key === 'selectedCategory') return value !== 'all';
    if (key === 'formatFilter') return value !== 'all';
    if (key === 'difficultyFilter') return value !== 'all';
    if (key === 'voicePartFilter') return value !== 'all';
    return false;
  }).length;

  const clearAllFilters = () => {
    onFiltersChange({
      searchQuery: '',
      selectedCategory: 'all',
      formatFilter: 'all',
      difficultyFilter: 'all',
      voicePartFilter: 'all',
    });
  };

  const getSortLabel = () => {
    const key = `${filters.sortBy}-${filters.sortOrder}`;
    const sortOptions = {
      'title-asc': 'Title A-Z',
      'title-desc': 'Title Z-A',
      'composer-asc': 'Composer A-Z', 
      'composer-desc': 'Composer Z-A',
      'created_at-desc': 'Newest First',
      'created_at-asc': 'Oldest First',
    };
    return sortOptions[key as keyof typeof sortOptions] || 'Title A-Z';
  };

  return (
    <div className="space-y-3">
      {/* Main Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, composer, or tags..."
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange({ searchQuery: e.target.value })}
            className="pl-10 h-9"
          />
        </div>
        
        {/* Filter Dropdown */}
        <DropdownMenu open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2 h-9">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full text-xs px-1.5 py-0.5 min-w-[1.2rem] h-5">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {/* Category Filter */}
            <div className="px-2 py-1.5">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
              <select
                value={filters.selectedCategory}
                onChange={(e) => onFiltersChange({ selectedCategory: e.target.value })}
                className="w-full px-2 py-1 text-sm border rounded"
              >
                <option value="all">All Categories</option>
                <option value="classical">Classical</option>
                <option value="contemporary">Contemporary</option>
                <option value="gospel">Gospel</option>
                <option value="spiritual">Spiritual</option>
                <option value="folk">Folk</option>
                <option value="jazz">Jazz</option>
              </select>
            </div>
            
            {/* Format Filter */}
            {showFormatFilter && (
              <div className="px-2 py-1.5">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Format</label>
                <select
                  value={filters.formatFilter}
                  onChange={(e) => onFiltersChange({ formatFilter: e.target.value as FilterState['formatFilter'] })}
                  className="w-full px-2 py-1 text-sm border rounded"
                >
                  <option value="all">All Formats</option>
                  <option value="digital">Digital Only</option>
                  <option value="physical">Physical Only</option>
                  <option value="both">Both Formats</option>
                </select>
              </div>
            )}
            
            {/* Voice Part Filter */}
            {showVoicePartFilter && (
              <div className="px-2 py-1.5">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Voice Parts</label>
                <select
                  value={filters.voicePartFilter}
                  onChange={(e) => onFiltersChange({ voicePartFilter: e.target.value })}
                  className="w-full px-2 py-1 text-sm border rounded"
                >
                  <option value="all">All Voice Parts</option>
                  <option value="soprano">Soprano</option>
                  <option value="alto">Alto</option>
                  <option value="tenor">Tenor</option>
                  <option value="bass">Bass</option>
                  <option value="satb">SATB</option>
                </select>
              </div>
            )}
            
            {activeFilterCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={clearAllFilters} className="text-red-600">
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2 h-9">
              <span className="hidden sm:inline text-xs">{getSortLabel()}</span>
              <span className="sm:hidden text-xs">Sort</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onFiltersChange({ sortBy: 'title', sortOrder: 'asc' })}>
              Title A-Z
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFiltersChange({ sortBy: 'title', sortOrder: 'desc' })}>
              Title Z-A
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFiltersChange({ sortBy: 'composer', sortOrder: 'asc' })}>
              Composer A-Z
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFiltersChange({ sortBy: 'composer', sortOrder: 'desc' })}>
              Composer Z-A
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFiltersChange({ sortBy: 'created_at', sortOrder: 'desc' })}>
              Newest First
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFiltersChange({ sortBy: 'created_at', sortOrder: 'asc' })}>
              Oldest First
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View Mode Toggle */}
        <div className="flex items-center border rounded-lg p-0.5 h-9">
          <Button
            variant={filters.viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onFiltersChange({ viewMode: 'grid' })}
            className="h-7 w-7 p-0"
          >
            <Grid className="h-3 w-3" />
          </Button>
          <Button
            variant={filters.viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onFiltersChange({ viewMode: 'list' })}
            className="h-7 w-7 p-0"
          >
            <List className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Active Filters Summary - Only show if filters are active */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
          <span>Active filters:</span>
          {filters.searchQuery && <span className="font-medium">"{filters.searchQuery}"</span>}
          {filters.selectedCategory !== 'all' && <span className="font-medium">{filters.selectedCategory}</span>}
          {filters.formatFilter !== 'all' && <span className="font-medium">{filters.formatFilter}</span>}
          {filters.voicePartFilter !== 'all' && <span className="font-medium">{filters.voicePartFilter}</span>}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-4 px-1 ml-1 text-xs hover:text-red-600"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
};