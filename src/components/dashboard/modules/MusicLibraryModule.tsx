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
import { MusicXMLViewer } from '@/components/liturgical/MusicXMLViewer';
import { SetlistBuilder } from '@/components/music-library/SetlistBuilder';

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
  const itemsPerPage = 24; // Show 24 items per page (4 rows × 6 columns on desktop)
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
      
      console.log('📚 Fetched sheet music:', data?.length, 'items');
      console.log('📚 Sample piece data:', data?.[0] ? {
        id: data[0].id,
        title: data[0].title,
        has_xml_content: !!data[0].xml_content,
        xml_content_length: data[0].xml_content?.length || 0,
        has_pdf_url: !!data[0].pdf_url,
        columns: Object.keys(data[0])
      } : 'No data');
      
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
      <div className="p-2 md:p-6 border-b border-border bg-background">
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
          
          <div className="flex gap-2 md:gap-4">
            <Button variant="outline" size="sm" className="flex-1 md:flex-none h-10 md:h-9">
              <Filter className="w-4 h-4 mr-2" />
              <span className="md:inline">Filter</span>
            </Button>
            
            <div className="flex gap-1 md:gap-1">
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
        <div className="px-2 md:px-6 pt-3 md:pt-4">
          <TabsList className="w-full md:w-auto grid grid-cols-4 md:inline-flex">
            <TabsTrigger value="all" className="text-xs md:text-sm">All ({musicLibrary.length})</TabsTrigger>
            <TabsTrigger value="recent" className="text-xs md:text-sm">Recent</TabsTrigger>
            <TabsTrigger value="favorites" className="text-xs md:text-sm">Favorites</TabsTrigger>
            <TabsTrigger value="current" className="text-xs md:text-sm">Setlists</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="flex-1 mt-0">
          <ScrollArea className="flex-1 p-2 md:p-6">
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 md:gap-4">
                {paginatedMusic.map((piece) => (
                  <Card 
                    key={piece.id} 
                    className="p-2 md:p-4 hover:shadow-md transition-shadow cursor-pointer"
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
                    
                    <div className="space-y-1 md:space-y-2">
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
                      
                      <div className="flex items-center justify-between pt-1 md:pt-2">
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
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 md:mt-6">
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
              </>

            ) : (
              <>
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
          <ScrollArea className="flex-1 p-2 md:p-6">
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
          <ScrollArea className="flex-1 p-2 md:p-6">
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