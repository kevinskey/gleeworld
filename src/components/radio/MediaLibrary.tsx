import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Play, 
  Pause, 
  Search, 
  Music, 
  Radio,
  Plus,
  Volume2,
  FileText,
  Video,
  Headphones,
  File,
  Download,
  Eye,
  ArrowUpDown,
  Filter,
  Folder,
  FolderOpen,
  Images,
  History,
  Users,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Document, Page, pdfjs } from 'react-pdf';
import { getFileUrl } from '@/utils/storage';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface MediaFile {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  file_type: string;
  file_size?: number;
  tags?: string[];
  category?: string;
  created_at: string;
  uploaded_by?: string;
  is_public?: boolean;
  file_path?: string;
  bucket_id?: string;
}

interface MediaLibraryProps {
  onAddToPlaylist?: (track: MediaFile) => void;
  onPlayTrack?: (track: MediaFile) => void;
  isPlaying?: boolean;
  currentTrack?: string;
}

export const MediaLibrary = ({ 
  onAddToPlaylist, 
  onPlayTrack, 
  isPlaying = false, 
  currentTrack 
}: MediaLibraryProps) => {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('images');
  const [sortBy, setSortBy] = useState<'title' | 'date' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<MediaFile | null>(null);
  
  const [pdfNumPages, setPdfNumPages] = useState<number>(0);
  const [pdfPageNumber, setPdfPageNumber] = useState<number>(1);
  const [pdfScale, setPdfScale] = useState<number>(1.0);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAdminStatus();
    fetchMediaData();
  }, []);

  const fetchAdminStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('is_current_user_admin_safe');
      if (!error) {
        setIsAdmin(Boolean(data));
      }
    } catch (e) {
      // ignore
    }
  };

  const fetchMediaData = async () => {
    try {
      setLoading(true);
      
      const { data: mediaData, error: mediaError } = await supabase
        .from('gw_media_library')
        .select('*')
        .order('created_at', { ascending: false });

      if (mediaError) {
        console.error('Error fetching media library:', mediaError);
        toast({
          title: "Error",
          description: "Failed to load media library",
          variant: "destructive",
        });
      } else {
        setMediaFiles(mediaData || []);
      }
    } catch (error) {
      console.error('Error fetching media data:', error);
      toast({
        title: "Error",
        description: "Failed to load media library",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getFileTypeFromUrl = (url: string): string => {
    const extension = url.split('.').pop()?.toLowerCase() || '';
    
    // Audio files
    if (['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac'].includes(extension)) {
      return 'mp3';
    }
    
    // Video files
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension)) {
      return 'video';
    }
    
    // PDF files
    if (extension === 'pdf') {
      return 'pdf';
    }
    
    // Everything else
    return 'other';
  };

  const filterAndSortMedia = (type: string) => {
    let filtered = mediaFiles.filter(file => {
      const fileType = getFileTypeFromUrl(file.file_url);
      const matchesType = fileType === type;
      const matchesSearch = !searchQuery || 
        file.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || file.category === selectedCategory;
      
      return matchesType && matchesSearch && matchesCategory;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'size':
          comparison = (a.file_size || 0) - (b.file_size || 0);
          break;
      }
    
    return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const resolveUrl = async (file: MediaFile) => {
    if (file.bucket_id && file.file_path) {
      const url = await getFileUrl(file.bucket_id, file.file_path);
      return url || file.file_url;
    }
    return file.file_url;
  };

  const handleDownload = async (file: MediaFile) => {
    const url = await resolveUrl(file);
    window.open(url, '_blank');
  };

  const openPdf = async (file: MediaFile) => {
    const url = await resolveUrl(file);
    setSelectedPdf({ ...file, file_url: url });
  };
  const getCategories = () => {
    const categories = new Set(mediaFiles.map(file => file.category).filter(Boolean));
    return Array.from(categories).sort();
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'events':
        return <Images className="h-4 w-4" />;
      case 'hero-slides':
        return <Users className="h-4 w-4" />;
      case 'historic':
        return <History className="h-4 w-4" />;
      case 'products':
        return <File className="h-4 w-4" />;
      default:
        return <Folder className="h-4 w-4" />;
    }
  };

  const getCategoryCount = (category: string, type: string) => {
    return mediaFiles.filter(file => {
      const fileType = getFileTypeFromUrl(file.file_url);
      return file.category === category && fileType === type;
    }).length;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileUrl: string) => {
    const type = getFileTypeFromUrl(fileUrl);
    switch (type) {
      case 'mp3':
        return <Headphones className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const handleAddToPlaylist = (file: MediaFile) => {
    if (onAddToPlaylist) {
      onAddToPlaylist(file);
      toast({
        title: "Added to Playlist",
        description: `"${file.title}" has been added to the playlist`,
      });
    }
  };

  const handlePlayFile = async (file: MediaFile) => {
    const fileType = getFileTypeFromUrl(file.file_url);
    const url = await resolveUrl(file);
    if (fileType === 'mp3' && onPlayTrack) {
      onPlayTrack({ ...file, file_url: url });
    } else {
      // Open file in new tab for viewing/downloading
      window.open(url, '_blank');
    }
  };
  const renderMediaCard = (file: MediaFile) => {
    const fileType = getFileTypeFromUrl(file.file_url);
    const isCurrentlyPlaying = currentTrack === file.id && isPlaying;
    const canPlay = fileType === 'mp3';

    return (
      <Card key={file.id} className="mb-3 hover:shadow-md transition-all bg-background/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Action Button */}
            <Button
              size="sm"
              variant={isCurrentlyPlaying ? "default" : "outline"}
              onClick={() => handlePlayFile(file)}
              className="flex-shrink-0"
            >
              {canPlay ? (
                isCurrentlyPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>

            {/* File Icon */}
            <div className="flex-shrink-0 p-2 bg-muted/50 rounded-md">
              {getFileIcon(file.file_url)}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground truncate">
                {file.title}
              </h4>
              {file.description && (
                <p className="text-sm text-muted-foreground truncate">
                  {file.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {fileType.toUpperCase()}
                </Badge>
                {file.file_size && (
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(file.file_size)}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 flex gap-2">
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(file)}
                  className="text-xs h-8 px-3"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              )}
              
              {canPlay && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddToPlaylist(file)}
                  className="text-xs h-8 px-3 bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary hover:text-primary"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add to Radio
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderPdfCard = (file: MediaFile) => {
    return (
      <Card key={file.id} className="mb-3 hover:shadow-md transition-all bg-background/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* PDF Icon */}
            <div className="flex-shrink-0 p-2 bg-red-100 dark:bg-red-900/30 rounded-md">
              <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground truncate">
                {file.title}
              </h4>
              {file.description && (
                <p className="text-sm text-muted-foreground truncate">
                  {file.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  PDF
                </Badge>
                {file.file_size && (
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(file.file_size)}
                  </span>
                )}
                {file.category && (
                  <Badge variant="secondary" className="text-xs">
                    {file.category}
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openPdf(file)}
                className="text-xs h-8 px-3 bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary hover:text-primary"
              >
                <Eye className="h-3 w-3 mr-1" />
                View PDF
              </Button>
              
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(file.file_url, '_blank')}
                  className="text-xs h-8 px-3"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const onPdfLoadSuccess = ({ numPages }: { numPages: number }) => {
    setPdfNumPages(numPages);
    setPdfPageNumber(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Volume2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading media library...</p>
        </div>
      </div>
    );
  }

  const imageFiles = filterAndSortMedia('other').filter(file => 
    file.file_url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
  );
  const mp3Files = filterAndSortMedia('mp3');
  const videoFiles = filterAndSortMedia('video');
  const pdfFiles = filterAndSortMedia('pdf');
  const otherFiles = filterAndSortMedia('other').filter(file => 
    !file.file_url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-2 font-playfair">
          Media Library
        </h2>
        <p className="text-muted-foreground">
          Browse and manage all types of media files
        </p>
      </div>

      {/* Search and Sort */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search media files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/80"
            />
          </div>
          
          {/* Sort Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(value: 'title' | 'date' | 'size') => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="size">Size</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>

            {/* Breadcrumb */}
            {selectedCategory && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  All Files
                </Button>
                <span className="text-muted-foreground">/</span>
                <span className="text-foreground font-medium">{selectedCategory}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 bg-muted/50">
          <TabsTrigger value="images" className="flex items-center gap-2">
            <Images className="h-4 w-4" />
            Images ({imageFiles.length})
          </TabsTrigger>
          <TabsTrigger value="mp3" className="flex items-center gap-2">
            <Headphones className="h-4 w-4" />
            Audio ({mp3Files.length})
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Video ({videoFiles.length})
          </TabsTrigger>
          <TabsTrigger value="pdf" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            PDF ({pdfFiles.length})
          </TabsTrigger>
          <TabsTrigger value="other" className="flex items-center gap-2">
            <File className="h-4 w-4" />
            Other ({otherFiles.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="images" className="mt-6">
          <ScrollArea className="h-96">
            {!selectedCategory ? (
              // Show folder view
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {getCategories().map(category => {
                  const categoryImageCount = getCategoryCount(category, 'other');
                  const sampleImage = mediaFiles.find(file => 
                    file.category === category && 
                    file.file_url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
                  );
                  
                  return (
                    <Card 
                      key={category} 
                      className="cursor-pointer hover:shadow-lg transition-all group bg-background/50 backdrop-blur-sm border-border/50"
                      onClick={() => setSelectedCategory(category)}
                    >
                      <CardContent className="p-4">
                        <div className="aspect-square bg-muted/50 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                          {sampleImage ? (
                            <img 
                              src={sampleImage.file_url} 
                              alt={category}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="text-muted-foreground">
                              {getCategoryIcon(category)}
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-medium text-foreground capitalize text-sm">
                            {category.replace('-', ' ')}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {categoryImageCount} images
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              // Show images in selected category
              imageFiles.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {imageFiles.map(file => (
                    <Card key={file.id} className="overflow-hidden hover:shadow-lg transition-all bg-background/50 backdrop-blur-sm border-border/50">
                      <div className="aspect-square overflow-hidden">
                        <img 
                          src={file.file_url} 
                          alt={file.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                          onClick={() => window.open(file.file_url, '_blank')}
                        />
                      </div>
                      <CardContent className="p-3">
                        <h4 className="font-medium text-foreground text-sm truncate mb-1">
                          {file.title}
                        </h4>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {file.category}
                          </Badge>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(file.file_url, '_blank')}
                              className="h-7 w-7 p-0"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Images className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No images found matching your search' : 'No images available in this category'}
                  </p>
                </div>
              )
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="mp3" className="mt-6">
          <ScrollArea className="h-96">
            {mp3Files.length > 0 ? (
              <div className="space-y-2">
                {mp3Files.map(renderMediaCard)}
              </div>
            ) : (
              <div className="text-center py-12">
                <Headphones className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No audio files found matching your search' : 'No audio files available'}
                </p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="video" className="mt-6">
          <ScrollArea className="h-96">
            {videoFiles.length > 0 ? (
              <div className="space-y-2">
                {videoFiles.map(renderMediaCard)}
              </div>
            ) : (
              <div className="text-center py-12">
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No video files found matching your search' : 'No video files available'}
                </p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="pdf" className="mt-6">
          <ScrollArea className="h-96">
            {pdfFiles.length > 0 ? (
              <div className="space-y-2">
                {pdfFiles.map(renderPdfCard)}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No PDF files found matching your search' : 'No PDF files available'}
                </p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="other" className="mt-6">
          <ScrollArea className="h-96">
            {otherFiles.length > 0 ? (
              <div className="space-y-2">
                {otherFiles.map(renderMediaCard)}
              </div>
            ) : (
              <div className="text-center py-12">
                <File className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No other files found matching your search' : 'No other files available'}
                </p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* PDF Viewer Dialog */}
      {selectedPdf && (
        <Dialog open={!!selectedPdf} onOpenChange={() => setSelectedPdf(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="truncate">{selectedPdf.title}</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPdfScale(prev => Math.max(0.5, prev - 0.25))}
                    disabled={pdfScale <= 0.5}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                    {Math.round(pdfScale * 100)}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPdfScale(prev => Math.min(2.0, prev + 0.25))}
                    disabled={pdfScale >= 2.0}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPdf(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto">
              <div className="flex justify-center">
                <Document
                  file={selectedPdf.file_url}
                  onLoadSuccess={onPdfLoadSuccess}
                  loading={
                    <div className="flex items-center justify-center p-8">
                      <div className="text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
                        <p className="text-muted-foreground">Loading PDF...</p>
                      </div>
                    </div>
                  }
                  error={
                    <div className="flex items-center justify-center p-8">
                      <div className="text-center">
                        <FileText className="h-12 w-12 text-destructive mx-auto mb-4" />
                        <p className="text-destructive">Failed to load PDF</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(selectedPdf.file_url, '_blank')}
                          className="mt-2"
                        >
                          Open in new tab
                        </Button>
                      </div>
                    </div>
                  }
                >
                  <Page
                    pageNumber={pdfPageNumber}
                    scale={pdfScale}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>
              </div>
            </div>

            {/* PDF Navigation */}
            {pdfNumPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPdfPageNumber(prev => Math.max(1, prev - 1))}
                  disabled={pdfPageNumber <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {pdfPageNumber} of {pdfNumPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPdfPageNumber(prev => Math.min(pdfNumPages, prev + 1))}
                  disabled={pdfPageNumber >= pdfNumPages}
                >
                  Next
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};