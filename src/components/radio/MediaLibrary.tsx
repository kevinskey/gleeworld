import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
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
  ZoomOut,
  Edit2,
  Trash2,
  Upload,
  Album,
  Loader2,
  Camera,
  Mic,
  UserCheck,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Document, Page, pdfjs } from 'react-pdf';
import { getFileUrl } from '@/utils/storage';
import { MediaLibraryBulkUpload } from '@/components/media/MediaLibraryBulkUpload';

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
  const [editingFile, setEditingFile] = useState<MediaFile | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [quickCaptureMedia, setQuickCaptureMedia] = useState<any[]>([]);
  const [quickCaptureCategory, setQuickCaptureCategory] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAdminStatus();
    fetchMediaData();
    fetchQuickCaptureMedia();
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
      console.log('🎵 Fetching media library data...');
      
      const { data: mediaData, error: mediaError } = await supabase
        .from('gw_media_library')
        .select('*')
        .order('created_at', { ascending: false });

      if (mediaError) {
        console.error('❌ Error fetching media library:', mediaError);
        toast({
          title: "Error",
          description: "Failed to load media library",
          variant: "destructive",
        });
      } else {
        console.log(`✅ Loaded ${mediaData?.length || 0} media files`);
        setMediaFiles(mediaData || []);
      }
    } catch (error) {
      console.error('❌ Error fetching media data:', error);
      toast({
        title: "Error",
        description: "Failed to load media library",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchQuickCaptureMedia = async () => {
    try {
      const { data, error } = await supabase
        .from('quick_capture_media')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching quick capture media:', error);
      } else {
        console.log(`✅ Loaded ${data?.length || 0} quick capture files`);
        setQuickCaptureMedia(data || []);
      }
    } catch (error) {
      console.error('Error fetching quick capture media:', error);
    }
  };

  const getFileTypeFromUrl = (url: string): string => {
    const extension = url.split('.').pop()?.toLowerCase() || '';
    
    if (['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac'].includes(extension)) {
      return 'mp3';
    }
    
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension)) {
      return 'video';
    }
    
    if (extension === 'pdf') {
      return 'pdf';
    }
    
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
      try {
        const url = await getFileUrl(file.bucket_id, file.file_path);
        return url || file.file_url;
      } catch (error) {
        console.error('Error resolving URL for file:', file.title, error);
        return file.file_url;
      }
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
      window.open(url, '_blank');
    }
  };

  const handleEditFile = (file: MediaFile) => {
    setEditingFile(file);
    setEditTitle(file.title);
    setEditDescription(file.description || '');
  };

  const handleSaveEdit = async () => {
    if (!editingFile) return;

    try {
      const { error } = await supabase
        .from('gw_media_library')
        .update({
          title: editTitle,
          description: editDescription
        })
        .eq('id', editingFile.id);

      if (error) throw error;

      setMediaFiles(prev => prev.map(file => 
        file.id === editingFile.id 
          ? { ...file, title: editTitle, description: editDescription }
          : file
      ));

      setEditingFile(null);
      toast({
        title: "Success",
        description: "Media file updated successfully"
      });
    } catch (error) {
      console.error('Error updating file:', error);
      toast({
        title: "Error",
        description: "Failed to update media file",
        variant: "destructive"
      });
    }
  };

  const handleDeleteFile = async (file: MediaFile) => {
    if (!confirm(`Are you sure you want to delete "${file.title}"?`)) return;

    try {
      const { error } = await supabase
        .from('gw_media_library')
        .delete()
        .eq('id', file.id);

      if (error) throw error;

      if (file.bucket_id && file.file_path) {
        await supabase.storage
          .from(file.bucket_id)
          .remove([file.file_path]);
      }

      setMediaFiles(prev => prev.filter(f => f.id !== file.id));
      
      toast({
        title: "Success",
        description: "Media file deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: "Failed to delete media file",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            Media Library
            <Badge variant="outline" className="text-xs">{mediaFiles.length} files</Badge>
          </div>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setShowBulkUpload(true)} className="h-7 text-xs">
              <Upload className="h-3 w-3 mr-1" />
              Upload
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-8 text-sm"
            />
          </div>
          <Select value={selectedCategory || 'all'} onValueChange={(v) => setSelectedCategory(v === 'all' ? null : v)}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {getCategories().map(cat => (
                <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 h-8">
            <TabsTrigger value="images" className="text-xs">Images</TabsTrigger>
            <TabsTrigger value="mp3" className="text-xs">Audio</TabsTrigger>
            <TabsTrigger value="video" className="text-xs">Video</TabsTrigger>
            <TabsTrigger value="pdf" className="text-xs">PDFs</TabsTrigger>
          </TabsList>

          {['images', 'mp3', 'video', 'pdf'].map(type => (
            <TabsContent key={type} value={type} className="mt-3">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {filterAndSortMedia(type === 'images' ? 'other' : type).map(file => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        {getFileIcon(file.file_url)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.title}</p>
                        {file.description && (
                          <p className="text-xs text-muted-foreground truncate">{file.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {file.category && (
                            <Badge variant="outline" className="text-xs">{file.category}</Badge>
                          )}
                          {file.file_size && (
                            <span className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {type === 'mp3' && (
                          <Button size="sm" variant="ghost" onClick={() => handlePlayFile(file)} className="h-7 w-7 p-0">
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleDownload(file)} className="h-7 w-7 p-0">
                          <Download className="h-3 w-3" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => handleEditFile(file)} className="h-7 w-7 p-0">
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteFile(file)} className="h-7 w-7 p-0 text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {filterAndSortMedia(type === 'images' ? 'other' : type).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No {type} files found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingFile} onOpenChange={() => setEditingFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Media File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingFile(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      {showBulkUpload && (
        <MediaLibraryBulkUpload
          onClose={() => setShowBulkUpload(false)}
          onUploadComplete={() => {
            setShowBulkUpload(false);
            fetchMediaData();
          }}
        />
      )}

      {/* PDF Viewer Dialog */}
      <Dialog open={!!selectedPdf} onOpenChange={() => setSelectedPdf(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{selectedPdf?.title}</DialogTitle>
          </DialogHeader>
          {selectedPdf && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPdfPageNumber(Math.max(1, pdfPageNumber - 1))}
                    disabled={pdfPageNumber <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {pdfPageNumber} of {pdfNumPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPdfPageNumber(Math.min(pdfNumPages, pdfPageNumber + 1))}
                    disabled={pdfPageNumber >= pdfNumPages}
                  >
                    Next
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPdfScale(Math.max(0.5, pdfScale - 0.2))}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">{Math.round(pdfScale * 100)}%</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPdfScale(Math.min(2, pdfScale + 0.2))}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-center">
                <Document
                  file={selectedPdf.file_url}
                  onLoadSuccess={({ numPages }) => setPdfNumPages(numPages)}
                  className="border rounded-lg overflow-hidden"
                >
                  <Page pageNumber={pdfPageNumber} scale={pdfScale} />
                </Document>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
