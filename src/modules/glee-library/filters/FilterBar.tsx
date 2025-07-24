import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  Grid, 
  List,
  X
} from "lucide-react";

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

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  showFormatFilter?: boolean;
  showVoicePartFilter?: boolean;
}

export const FilterBar = ({
  filters,
  onFiltersChange,
  showFormatFilter = true,
  showVoicePartFilter = true,
}: FilterBarProps) => {
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

  return (
    <div className="space-y-4">
      {/* Search and View Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sheet music..."
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange({ searchQuery: e.target.value })}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={filters.viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onFiltersChange({ viewMode: 'grid' })}
              className="h-8 w-8 p-0"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={filters.viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onFiltersChange({ viewMode: 'list' })}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Tags */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>

        {/* Category Filter */}
        <select
          value={filters.selectedCategory}
          onChange={(e) => onFiltersChange({ selectedCategory: e.target.value })}
          className="px-3 py-1 border rounded-md text-sm"
        >
          <option value="all">All Categories</option>
          <option value="classical">Classical</option>
          <option value="contemporary">Contemporary</option>
          <option value="gospel">Gospel</option>
          <option value="spiritual">Spiritual</option>
          <option value="folk">Folk</option>
          <option value="jazz">Jazz</option>
        </select>

        {/* Format Filter */}
        {showFormatFilter && (
          <select
            value={filters.formatFilter}
            onChange={(e) => onFiltersChange({ formatFilter: e.target.value as FilterState['formatFilter'] })}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="all">All Formats</option>
            <option value="digital">Digital Only</option>
            <option value="physical">Physical Only</option>
            <option value="both">Both Formats</option>
          </select>
        )}

        {/* Difficulty Filter */}
        <select
          value={filters.difficultyFilter}
          onChange={(e) => onFiltersChange({ difficultyFilter: e.target.value })}
          className="px-3 py-1 border rounded-md text-sm"
        >
          <option value="all">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
          <option value="expert">Expert</option>
        </select>

        {/* Voice Part Filter */}
        {showVoicePartFilter && (
          <select
            value={filters.voicePartFilter}
            onChange={(e) => onFiltersChange({ voicePartFilter: e.target.value })}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="all">All Voice Parts</option>
            <option value="soprano">Soprano</option>
            <option value="alto">Alto</option>
            <option value="tenor">Tenor</option>
            <option value="bass">Bass</option>
            <option value="satb">SATB</option>
          </select>
        )}

        {/* Sort Options */}
        <select
          value={`${filters.sortBy}-${filters.sortOrder}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split('-');
            onFiltersChange({ 
              sortBy, 
              sortOrder: sortOrder as 'asc' | 'desc' 
            });
          }}
          className="px-3 py-1 border rounded-md text-sm"
        >
          <option value="title-asc">Title A-Z</option>
          <option value="title-desc">Title Z-A</option>
          <option value="composer-asc">Composer A-Z</option>
          <option value="composer-desc">Composer Z-A</option>
          <option value="created_at-desc">Newest First</option>
          <option value="created_at-asc">Oldest First</option>
          <option value="difficulty_level-asc">Easiest First</option>
          <option value="difficulty_level-desc">Hardest First</option>
        </select>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 px-2 py-1"
          >
            <X className="h-3 w-3 mr-1" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Active Filter Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.searchQuery && (
            <Badge variant="secondary" className="text-xs">
              Search: {filters.searchQuery}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onFiltersChange({ searchQuery: '' })}
              />
            </Badge>
          )}
          {filters.selectedCategory !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              Category: {filters.selectedCategory}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onFiltersChange({ selectedCategory: 'all' })}
              />
            </Badge>
          )}
          {filters.formatFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              Format: {filters.formatFilter}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onFiltersChange({ formatFilter: 'all' })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};