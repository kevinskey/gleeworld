import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  BookOpen, 
  Clock, 
  Star, 
  Filter,
  X
} from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useSheetMusic } from '@/hooks/useSheetMusic';

type SheetMusic = Database['public']['Tables']['gw_sheet_music']['Row'];

interface SheetMusicLibraryPageProps {
  onSelectSheetMusic: (sheetMusic: SheetMusic) => void;
}

interface Filters {
  search: string;
  difficulty: string;
  composer: string;
  tags: string[];
}

const DIFFICULTY_LEVELS = [
  'Beginner',
  'Intermediate', 
  'Advanced',
  'Expert'
];

export const SheetMusicLibraryPage: React.FC<SheetMusicLibraryPageProps> = ({
  onSelectSheetMusic
}) => {
  const { sheetMusic, loading, error } = useSheetMusic();
  console.log('SheetMusicLibraryPage - loaded sheet music count:', sheetMusic.length, 'loading:', loading, 'error:', error);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    difficulty: '',
    composer: '',
    tags: []
  });
  const [showFilters, setShowFilters] = useState(false);

  // Get unique composers and tags for filter options
  const { composers, availableTags } = useMemo(() => {
    const composerSet = new Set<string>();
    const tagSet = new Set<string>();

    sheetMusic.forEach(music => {
      if (music.composer) composerSet.add(music.composer);
      if (music.tags) music.tags.forEach(tag => tagSet.add(tag));
    });

    return {
      composers: Array.from(composerSet).sort(),
      availableTags: Array.from(tagSet).sort()
    };
  }, [sheetMusic]);

  // Filter sheet music based on current filters
  const filteredSheetMusic = useMemo(() => {
    return sheetMusic.filter(music => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          music.title.toLowerCase().includes(searchLower) ||
          music.composer?.toLowerCase().includes(searchLower) ||
          music.arranger?.toLowerCase().includes(searchLower) ||
          music.tags?.some(tag => tag.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }

      // Difficulty filter
      if (filters.difficulty && filters.difficulty !== 'all' && music.difficulty_level !== filters.difficulty) {
        return false;
      }

      // Composer filter
      if (filters.composer && filters.composer !== 'all' && music.composer !== filters.composer) {
        return false;
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(filterTag => 
          music.tags?.includes(filterTag)
        );
        if (!hasMatchingTag) return false;
      }

      return true;
    });
  }, [sheetMusic, filters]);

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const addTag = (tag: string) => {
    if (!filters.tags.includes(tag)) {
      updateFilter('tags', [...filters.tags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    updateFilter('tags', filters.tags.filter(t => t !== tag));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      difficulty: '',
      composer: '',
      tags: []
    });
  };

  const hasActiveFilters = filters.search || filters.difficulty || filters.composer || filters.tags.length > 0;

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="space-y-4">
        {/* Search and Filter Toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, composer, arranger, or tags..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Button
            variant={showFilters ? "default" : "outline"}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
          
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Difficulty Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Difficulty</label>
                  <Select value={filters.difficulty || 'all'} onValueChange={(value) => updateFilter('difficulty', value === 'all' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any difficulty</SelectItem>
                      {DIFFICULTY_LEVELS.map(level => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Composer Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Composer</label>
                  <Select value={filters.composer || 'all'} onValueChange={(value) => updateFilter('composer', value === 'all' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any composer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any composer</SelectItem>
                      {composers.map(composer => (
                        <SelectItem key={composer} value={composer}>
                          {composer}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tags Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Tags</label>
                <div className="space-y-2">
                  {/* Selected Tags */}
                  {filters.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {filters.tags.map(tag => (
                        <Badge 
                          key={tag} 
                          variant="default" 
                          className="text-xs cursor-pointer"
                          onClick={() => removeTag(tag)}
                        >
                          {tag}
                          <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Available Tags */}
                  <div className="flex flex-wrap gap-1">
                    {availableTags
                      .filter(tag => !filters.tags.includes(tag))
                      .slice(0, 20)
                      .map(tag => (
                        <Badge 
                          key={tag} 
                          variant="outline" 
                          className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={() => addTag(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Count */}
        <div className="text-sm text-muted-foreground">
          {loading ? 'Loading...' : `${filteredSheetMusic.length} of ${sheetMusic.length} pieces`}
        </div>
      </div>

      {/* Sheet Music Grid */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive mb-2">Error loading sheet music</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : filteredSheetMusic.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No sheet music found</p>
            <p className="text-muted-foreground">
              {hasActiveFilters 
                ? 'Try adjusting your filters or search terms'
                : 'No sheet music is available in the library'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredSheetMusic.map((music) => (
              <Card 
                key={music.id} 
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                onClick={() => onSelectSheetMusic(music)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm line-clamp-2 min-h-[2.5rem]">
                    {music.title}
                  </CardTitle>
                  {music.composer && (
                    <CardDescription className="text-xs">
                      by {music.composer}
                    </CardDescription>
                  )}
                </CardHeader>
                
                <CardContent className="pt-0 space-y-3">
                  {/* PDF Indicator */}
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-3 w-3 text-primary" />
                    <span className="text-xs text-muted-foreground">
                      PDF Available
                    </span>
                  </div>

                  {/* Difficulty */}
                  {music.difficulty_level && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs text-muted-foreground">
                        {music.difficulty_level}
                      </span>
                    </div>
                  )}

                  {/* Date */}
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {new Date(music.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Tags */}
                  {music.tags && music.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {music.tags.slice(0, 2).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {music.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{music.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};