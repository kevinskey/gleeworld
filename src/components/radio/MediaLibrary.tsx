import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  created_by?: string;
  is_public?: boolean;
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
  const [activeTab, setActiveTab] = useState('mp3');
  const { toast } = useToast();

  useEffect(() => {
    fetchMediaData();
  }, []);

  const fetchMediaData = async () => {
    try {
      setLoading(true);
      
      const { data: mediaData, error: mediaError } = await supabase
        .from('gw_media_library')
        .select('*')
        .eq('is_public', true)
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

  const filterMediaByType = (type: string) => {
    return mediaFiles.filter(file => {
      const fileType = getFileTypeFromUrl(file.file_url);
      const matchesType = fileType === type;
      const matchesSearch = !searchQuery || 
        file.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesType && matchesSearch;
    });
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

  const handlePlayFile = (file: MediaFile) => {
    const fileType = getFileTypeFromUrl(file.file_url);
    if (fileType === 'mp3' && onPlayTrack) {
      onPlayTrack(file);
    } else {
      // Open file in new tab for viewing/downloading
      window.open(file.file_url, '_blank');
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(file.file_url, '_blank')}
                className="text-xs h-8 px-3"
              >
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
              
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

  const mp3Files = filterMediaByType('mp3');
  const videoFiles = filterMediaByType('video');
  const pdfFiles = filterMediaByType('pdf');
  const otherFiles = filterMediaByType('other');

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

      {/* Search */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search media files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/80"
            />
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 bg-muted/50">
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
                {pdfFiles.map(renderMediaCard)}
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
    </div>
  );
};