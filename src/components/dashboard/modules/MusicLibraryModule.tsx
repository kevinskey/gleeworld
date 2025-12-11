import React, { useState, useEffect, useMemo } from 'react';
import { Music, Search, Download, Play, Pause, Filter, Grid, List, Heart, X, Columns, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';
import { InAppPDFViewerDialog } from '@/components/music-library/InAppPDFViewerDialog';
import { PDFThumbnail } from '@/components/music-library/PDFThumbnail';
import { MusicXMLViewer } from '@/components/liturgical/MusicXMLViewer';
import { SetlistBuilder } from '@/components/music-library/SetlistBuilder';

type SortOption = 'title' | 'composer' | 'date-newest' | 'date-oldest' | 'most-used';
type TypeFilter = 'all' | 'pdf' | 'hard-copy' | 'both';

export const MusicLibraryModule = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [musicLibrary, setMusicLibrary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPdf, setSelectedPdf] = useState<{ url: string; title: string; id: string } | null>(null);
  const [selectedMusicXML, setSelectedMusicXML] = useState<{ content: string; title: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const closeGuardUntilRef = React.useRef(0);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { isFavorite, toggleFavorite } = useFavorites();

  // Filter states
  const [filterOpen, setFilterOpen] = useState(false);
  const [composerFilter, setComposerFilter] = useState<string>('all');
  const [voicingFilter, setVoicingFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-newest');
  
  // Column count state with responsive defaults
  const getDefaultColumnCount = () => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth < 768) return 1; // phone
    if (window.innerWidth < 1024) return 2; // tablet/iPad
    return 3; // desktop
  };
  const [columnCount, setColumnCount] = useState<number>(getDefaultColumnCount);

  // Calculate items per page based on column count (4 rows)
  const itemsPerPage = columnCount * 4;

  useEffect(() => {
    fetchSheetMusic();
  }, []);

  const fetchSheetMusic = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMusicLibrary(data || []);
    } catch (error: any) {
      console.error('Error fetching sheet music:', error);
      toast({
        title: "Error loading music",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get unique composers and voicings for filter dropdowns
  const uniqueComposers = useMemo(() => {
    const composers = musicLibrary
      .map(p => p.composer)
      .filter((c): c is string => !!c && c.trim() !== '');
    return [...new Set(composers)].sort();
  }, [musicLibrary]);

  const uniqueVoicings = useMemo(() => {
    const voicings = musicLibrary
      .flatMap(p => p.voice_parts || [])
      .filter((v): v is string => !!v && v.trim() !== '');
    return [...new Set(voicings)].sort();
  }, [musicLibrary]);

  // Filtered and sorted music
  const filteredMusic = useMemo(() => {
    let result = musicLibrary.filter(piece => {
      // Search filter
      const matchesSearch = !searchTerm || 
        piece.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        piece.composer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        piece.genre?.toLowerCase().includes(searchTerm.toLowerCase());

      // Composer filter
      const matchesComposer = composerFilter === 'all' || piece.composer === composerFilter;

      // Voicing filter
      const matchesVoicing = voicingFilter === 'all' || 
        (piece.voice_parts && piece.voice_parts.includes(voicingFilter));

      // Type filter
      const hasPdf = !!piece.pdf_url;
      const hasHardCopy = piece.has_hard_copy === true;
      let matchesType = true;
      if (typeFilter === 'pdf') matchesType = hasPdf && !hasHardCopy;
      else if (typeFilter === 'hard-copy') matchesType = hasHardCopy && !hasPdf;
      else if (typeFilter === 'both') matchesType = hasPdf && hasHardCopy;

      return matchesSearch && matchesComposer && matchesVoicing && matchesType;
    });

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'composer':
          return (a.composer || '').localeCompare(b.composer || '');
        case 'date-newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date-oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'most-used':
          return (b.play_count || 0) - (a.play_count || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [musicLibrary, searchTerm, composerFilter, voicingFilter, typeFilter, sortBy]);

  const favoritedMusic = musicLibrary.filter(piece => isFavorite(piece.id));

  // Pagination calculations
  const totalPages = Math.ceil(filteredMusic.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMusic = filteredMusic.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, composerFilter, voicingFilter, typeFilter, sortBy]);

  // Update grid columns on resize and column count change
  useEffect(() => {
    const updateGridColumns = () => {
      if (!gridRef.current) return;
      const width = window.innerWidth;
      if (width >= 1280) { // xl
        gridRef.current.style.gridTemplateColumns = `repeat(${columnCount}, minmax(0, 1fr))`;
      } else if (width >= 1024) { // lg
        gridRef.current.style.gridTemplateColumns = `repeat(${Math.min(columnCount, 4)}, minmax(0, 1fr))`;
      } else if (width >= 768) { // md
        gridRef.current.style.gridTemplateColumns = `repeat(${Math.min(columnCount, 3)}, minmax(0, 1fr))`;
      } else {
        gridRef.current.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
      }
    };
    
    updateGridColumns();
    window.addEventListener('resize', updateGridColumns);
    return () => window.removeEventListener('resize', updateGridColumns);
  }, [columnCount]);

  // Count active filters
  const activeFilterCount = [
    composerFilter !== 'all',
    voicingFilter !== 'all',
    typeFilter !== 'all',
    sortBy !== 'date-newest'
  ].filter(Boolean).length;

  const clearFilters = () => {
    setComposerFilter('all');
    setVoicingFilter('all');
    setTypeFilter('all');
    setSortBy('date-newest');
  };


  const openPdfViewer = (piece: any) => {
    if (Date.now() < closeGuardUntilRef.current) {
      console.log('Open suppressed due to recent close');
      return;
    }
    setSelectedPdf({ url: piece.pdf_url, title: piece.title, id: piece.id });
  };

  const togglePlay = (id: string) => {
    setIsPlaying(isPlaying === id ? null : id);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="py-2 md:py-4 border-b border-border bg-background">
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <Music className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          <h2 className="text-base md:text-lg font-semibold">Music Library</h2>
        </div>
        
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4">
          <div className="relative flex-1 max-w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Search..." 
              className="pl-10 h-10 md:h-9 text-base md:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 md:gap-3 flex-wrap">
            {/* Filter Popover */}
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 md:h-9 relative">
                  <Filter className="w-4 h-4 mr-2" />
                  <span>Filter</span>
                  {activeFilterCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filters</h4>
                    {activeFilterCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                        <X className="w-3 h-3 mr-1" />
                        Clear all
                      </Button>
                    )}
                  </div>
                  
                  <Separator />
                  
                  {/* Composer Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm">Composer</Label>
                    <Select value={composerFilter} onValueChange={setComposerFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All composers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All composers</SelectItem>
                        {uniqueComposers.map(composer => (
                          <SelectItem key={composer} value={composer}>{composer}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Voicing Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm">Voicing</Label>
                    <Select value={voicingFilter} onValueChange={setVoicingFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All voicings" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All voicings</SelectItem>
                        {uniqueVoicings.map(voicing => (
                          <SelectItem key={voicing} value={voicing}>{voicing}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Type Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm">Type</Label>
                    <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="pdf">PDF only</SelectItem>
                        <SelectItem value="hard-copy">Hard copy only</SelectItem>
                        <SelectItem value="both">Both PDF & hard copy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Separator />
                  
                  {/* Sort By */}
                  <div className="space-y-2">
                    <Label className="text-sm">Sort by</Label>
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="title">Name (A-Z)</SelectItem>
                        <SelectItem value="composer">Composer (A-Z)</SelectItem>
                        <SelectItem value="date-newest">Date added (newest)</SelectItem>
                        <SelectItem value="date-oldest">Date added (oldest)</SelectItem>
                        <SelectItem value="most-used">Most used</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Column Selector (desktop/tablet only) */}
            <div className="hidden md:flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <Columns className="w-4 h-4 mr-2" />
                    <span>{columnCount} cols</span>
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40" align="start">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Columns</Label>
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <Button
                        key={num}
                        variant={columnCount === num ? 'default' : 'ghost'}
                        size="sm"
                        className="w-full justify-start h-8"
                        onClick={() => setColumnCount(num)}
                      >
                        {num} columns
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex gap-1">
              <Button 
                variant={viewMode === 'grid' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-10 md:h-9 px-3 md:px-2"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-10 md:h-9 px-3 md:px-2"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="flex-1 flex flex-col">
        <div className="pt-3 md:pt-4">
          <TabsList className="w-full md:w-auto grid grid-cols-4 md:inline-flex">
            <TabsTrigger value="all" className="text-xs md:text-sm">All ({filteredMusic.length})</TabsTrigger>
            <TabsTrigger value="recent" className="text-xs md:text-sm">Recent</TabsTrigger>
            <TabsTrigger value="favorites" className="text-xs md:text-sm">Favorites</TabsTrigger>
            <TabsTrigger value="current" className="text-xs md:text-sm">Setlists</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="flex-1 mt-0 flex flex-col min-h-0">
          <div className="flex-1 overflow-auto py-2 md:py-4 pb-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading music library...</p>
              </div>
            ) : filteredMusic.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">
                  {searchTerm ? 'No music found matching your search' : 'No music in library yet'}
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <div 
                ref={gridRef}
                className="grid gap-2 md:gap-4 auto-rows-fr"
                style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
              >
                {paginatedMusic.map((piece) => (
                  <Card 
                    key={piece.id} 
                    className="p-2 md:p-4 hover:shadow-md transition-shadow cursor-pointer flex flex-col"
                    onClick={() => {
                      console.log('Piece clicked:', { 
                        id: piece.id, 
                        title: piece.title,
                        hasXmlContent: !!piece.xml_content,
                        xmlContentLength: piece.xml_content?.length || 0,
                        hasPdfUrl: !!piece.pdf_url 
                      });
                      
                      if (piece.xml_content && piece.xml_content.trim()) {
                        console.log('Opening MusicXML viewer with content length:', piece.xml_content.length);
                        setSelectedMusicXML({ content: piece.xml_content, title: piece.title });
                      } else if (piece.pdf_url) {
                        console.log('Opening PDF viewer');
                        openPdfViewer(piece);
                      } else {
                        console.warn('No content available for this piece');
                        toast({
                          title: "No content available",
                          description: "This music piece has no sheet music or MusicXML file attached.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <div className="aspect-square bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg mb-2 md:mb-3 flex items-center justify-center relative overflow-hidden">
                      {piece.pdf_url ? (
                        <PDFThumbnail
                          pdfUrl={piece.pdf_url}
                          alt={piece.title}
                          title={piece.title}
                          className="w-full h-full"
                        />
                      ) : (
                        <Music className="w-8 h-8 md:w-12 md:h-12 text-primary/50" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "absolute top-1 right-1 md:top-2 md:right-2 h-6 w-6 md:h-8 md:w-8 bg-background/80 backdrop-blur-sm hover:bg-background/90",
                          isFavorite(piece.id) && "text-destructive"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(piece.id);
                        }}
                      >
                        <Heart className={cn("h-3 w-3 md:h-4 md:w-4", isFavorite(piece.id) && "fill-current")} />
                      </Button>
                    </div>
                    
                    <div className="space-y-1 md:space-y-2 flex-1 flex flex-col">
                      <h3 className="font-medium text-xs md:text-sm line-clamp-2">{piece.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">{piece.composer || 'Unknown'}</p>
                      
                      <div className="flex flex-wrap gap-1">
                        {piece.voice_part && (
                          <Badge variant="outline" className="text-xs px-1 py-0">{piece.voice_part}</Badge>
                        )}
                        {piece.difficulty && (
                          <Badge className={`text-xs px-1 py-0 ${getDifficultyColor(piece.difficulty)}`}>
                            {piece.difficulty}
                          </Badge>
                        )}
                        {piece.genre && (
                          <Badge variant="secondary" className="text-xs px-1 py-0 hidden md:inline-flex">{piece.genre}</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between pt-1 md:pt-2 mt-auto">
                        <span className="text-xs text-muted-foreground hidden md:block">
                          {new Date(piece.created_at).toLocaleDateString()}
                        </span>
                        <div className="flex gap-1 ml-auto">
                          {piece.audio_url && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 w-7 md:h-8 md:w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePlay(piece.id);
                              }}
                            >
                              {isPlaying === piece.id ? 
                                <Pause className="w-3 h-3" /> : 
                                <Play className="w-3 h-3" />
                              }
                            </Button>
                          )}
                          {piece.pdf_url && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 w-7 md:h-8 md:w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(piece.pdf_url, '_blank');
                              }}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {paginatedMusic.map((piece) => (
                  <Card 
                    key={piece.id} 
                    className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      console.log('Piece clicked (list view):', { 
                        id: piece.id, 
                        title: piece.title,
                        hasXmlContent: !!piece.xml_content,
                        xmlContentLength: piece.xml_content?.length || 0,
                        hasPdfUrl: !!piece.pdf_url 
                      });
                      
                      if (piece.xml_content && piece.xml_content.trim()) {
                        console.log('Opening MusicXML viewer with content length:', piece.xml_content.length);
                        setSelectedMusicXML({ content: piece.xml_content, title: piece.title });
                      } else if (piece.pdf_url) {
                        console.log('Opening PDF viewer');
                        openPdfViewer(piece);
                      } else {
                        console.warn('No content available for this piece');
                        toast({
                          title: "No content available",
                          description: "This music piece has no sheet music or MusicXML file attached.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center">
                        <Music className="w-6 h-6 text-primary/50" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm mb-1">{piece.title}</h3>
                        <p className="text-xs text-muted-foreground mb-2">
                          {piece.composer || 'Unknown'} • {piece.arranger || 'N/A'}
                        </p>
                        <div className="flex items-center gap-2">
                          {piece.voice_part && (
                            <Badge variant="outline" className="text-xs">{piece.voice_part}</Badge>
                          )}
                          {piece.difficulty && (
                            <Badge className={`text-xs ${getDifficultyColor(piece.difficulty)}`}>
                              {piece.difficulty}
                            </Badge>
                          )}
                          {piece.genre && (
                            <Badge variant="secondary" className="text-xs">{piece.genre}</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {new Date(piece.created_at).toLocaleDateString()}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-8 w-8",
                              isFavorite(piece.id) && "text-destructive"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(piece.id);
                            }}
                          >
                            <Heart className={cn("h-4 w-4", isFavorite(piece.id) && "fill-current")} />
                          </Button>
                          {piece.audio_url && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePlay(piece.id);
                              }}
                            >
                              {isPlaying === piece.id ? 
                                <Pause className="w-4 h-4 mr-2" /> : 
                                <Play className="w-4 h-4 mr-2" />
                              }
                              {isPlaying === piece.id ? 'Pause' : 'Play'}
                            </Button>
                          )}
                          {piece.pdf_url && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(piece.pdf_url, '_blank');
                              }}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Sheet
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
          {/* Pagination Controls - Always visible at bottom */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4 border-t border-border bg-background">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-9 md:h-8 px-3 md:px-4"
              >
                Previous
              </Button>
              <span className="text-xs md:text-sm text-muted-foreground px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-9 md:h-8 px-3 md:px-4"
              >
                Next
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="recent" className="flex-1">
          <ScrollArea className="flex-1 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {musicLibrary.slice(0, 12).map((piece) => (
                  <Card 
                    key={piece.id} 
                    className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => piece.pdf_url && openPdfViewer(piece)}
                  >
                    <h3 className="font-medium text-sm mb-1">{piece.title}</h3>
                    <p className="text-xs text-muted-foreground">{piece.composer}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Added {new Date(piece.created_at).toLocaleDateString()}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="favorites" className="flex-1">
          <ScrollArea className="flex-1 py-2 md:py-4">
            {favoritedMusic.length === 0 ? (
              <div className="flex items-center justify-center text-muted-foreground py-12">
                <p>No favorite pieces yet. Click the heart icon on any piece to add it to your favorites!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoritedMusic.map((piece) => (
                  <Card 
                    key={piece.id} 
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => piece.pdf_url && openPdfViewer(piece)}
                  >
                    <div className="aspect-square bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                      {piece.pdf_url ? (
                        <PDFThumbnail
                          pdfUrl={piece.pdf_url}
                          alt={piece.title}
                          title={piece.title}
                          className="w-full h-full"
                        />
                      ) : (
                        <Music className="w-12 h-12 text-primary/50" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 text-destructive bg-background/80 backdrop-blur-sm hover:bg-background/90"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(piece.id);
                        }}
                      >
                        <Heart className="h-4 w-4 fill-current" />
                      </Button>
                    </div>
                    <h3 className="font-medium text-sm mb-1 line-clamp-2">{piece.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{piece.composer}</p>
                    <div className="flex gap-1">
                      {piece.pdf_url && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(piece.pdf_url, '_blank');
                          }}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="current" className="flex-1 mt-0">
          <ScrollArea className="flex-1 py-2 md:py-4">
            <SetlistBuilder 
              onPdfSelect={(url, title, id) => {
                if (id) {
                  setSelectedPdf({ url, title, id });
                }
              }}
              onOpenPlayer={(setlistId) => {
                console.log('Opening setlist player:', setlistId);
              }}
            />
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {selectedPdf && (
        <InAppPDFViewerDialog
          open={!!selectedPdf}
          onOpenChange={(open) => {
            console.log('MusicLibraryModule onOpenChange:', open);
            if (!open) {
              closeGuardUntilRef.current = Date.now() + 400;
              setSelectedPdf(null);
            }
          }}
          pdfUrl={selectedPdf.url}
          title={selectedPdf.title}
          musicId={selectedPdf.id}
        />
      )}

      {selectedMusicXML && (
        <MusicXMLViewer
          musicxml={selectedMusicXML.content}
          onClose={() => setSelectedMusicXML(null)}
          title={selectedMusicXML.title}
        />
      )}
    </div>
  );
};