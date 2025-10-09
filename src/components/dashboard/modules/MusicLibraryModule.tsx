import React, { useState, useEffect } from 'react';
import { Music, Search, Download, Play, Pause, Filter, Grid, List, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';
import { InAppPDFViewerDialog } from '@/components/music-library/InAppPDFViewerDialog';
import { PDFThumbnail } from '@/components/music-library/PDFThumbnail';

export const MusicLibraryModule = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [musicLibrary, setMusicLibrary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPdf, setSelectedPdf] = useState<{ url: string; title: string; id: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // Show 12 items per page
  const { toast } = useToast();
  const { isFavorite, toggleFavorite } = useFavorites();

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

  const togglePlay = (id: string) => {
    setIsPlaying(isPlaying === id ? null : id);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredMusic = musicLibrary.filter(piece => 
    piece.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    piece.composer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    piece.genre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const favoritedMusic = musicLibrary.filter(piece => isFavorite(piece.id));

  // Pagination calculations
  const totalPages = Math.ceil(filteredMusic.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMusic = filteredMusic.slice(startIndex, endIndex);

  // Reset to page 1 when search term changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border bg-background">
        <div className="flex items-center gap-2 mb-4">
          <Music className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Music Library</h2>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Search by title, composer, genre..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          
          <div className="flex gap-1">
            <Button 
              variant={viewMode === 'grid' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="flex-1 flex flex-col">
        <div className="px-6 pt-4">
          <TabsList>
            <TabsTrigger value="all">All Music ({musicLibrary.length})</TabsTrigger>
            <TabsTrigger value="recent">Recently Added</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="current">Current Repertoire</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="flex-1 mt-0">
          <ScrollArea className="flex-1 p-6">
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
              <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedMusic.map((piece) => (
                  <Card 
                    key={piece.id} 
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => piece.pdf_url && setSelectedPdf({ url: piece.pdf_url, title: piece.title, id: piece.id })}
                  >
                    <div className="aspect-square bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                      {piece.pdf_url ? (
                        <PDFThumbnail
                          pdfUrl={piece.pdf_url}
                          alt={piece.title}
                          title={piece.title}
                          musicId={piece.id}
                          className="w-full h-full"
                        />
                      ) : (
                        <Music className="w-12 h-12 text-primary/50" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "absolute top-2 right-2 h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background/90",
                          isFavorite(piece.id) && "text-destructive"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(piece.id);
                        }}
                      >
                        <Heart className={cn("h-4 w-4", isFavorite(piece.id) && "fill-current")} />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm line-clamp-2">{piece.title}</h3>
                      <p className="text-xs text-muted-foreground">{piece.composer || 'Unknown'}</p>
                      
                      <div className="flex flex-wrap gap-1">
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
                      
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(piece.created_at).toLocaleDateString()}
                        </span>
                        <div className="flex gap-1">
                          {piece.audio_url && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 w-8 p-0"
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
                              className="h-8 w-8 p-0"
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
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
              </>

            ) : (
              <>
              <div className="space-y-2">
                {paginatedMusic.map((piece) => (
                  <Card 
                    key={piece.id} 
                    className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => piece.pdf_url && setSelectedPdf({ url: piece.pdf_url, title: piece.title, id: piece.id })}
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
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
              </>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="recent" className="flex-1">
          <ScrollArea className="flex-1 p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {musicLibrary.slice(0, 12).map((piece) => (
                  <Card 
                    key={piece.id} 
                    className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => piece.pdf_url && setSelectedPdf({ url: piece.pdf_url, title: piece.title, id: piece.id })}
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
          <ScrollArea className="flex-1 p-6">
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
                    onClick={() => piece.pdf_url && setSelectedPdf({ url: piece.pdf_url, title: piece.title, id: piece.id })}
                  >
                    <div className="aspect-square bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                      {piece.pdf_url ? (
                        <PDFThumbnail
                          pdfUrl={piece.pdf_url}
                          alt={piece.title}
                          title={piece.title}
                          musicId={piece.id}
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

        <TabsContent value="current" className="flex-1">
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Current repertoire will appear here</p>
          </div>
        </TabsContent>
      </Tabs>

      {selectedPdf && (
        <InAppPDFViewerDialog
          open={!!selectedPdf}
          onOpenChange={(open) => !open && setSelectedPdf(null)}
          pdfUrl={selectedPdf.url}
          title={selectedPdf.title}
          musicId={selectedPdf.id}
        />
      )}
    </div>
  );
};