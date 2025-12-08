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
        console.log('📁 Media files by type:', mediaData?.reduce((acc, file) => {
          const type = getFileTypeFromUrl(file.file_url);
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>));
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
    // Handle files with bucket_id and file_path (newer storage format)
    if (file.bucket_id && file.file_path) {
      try {
        const url = await getFileUrl(file.bucket_id, file.file_path);
        return url || file.file_url;
      } catch (error) {
        console.error('Error resolving URL for file:', file.title, error);
        return file.file_url;
      }
    }
    
    // Handle legacy files without bucket_id (direct URLs)
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

      // Also try to delete from storage if it has bucket info
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

  const uploadFiles = async (files: File[]) => {
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only admins can upload files",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    
    // Upload all files in parallel using Promise.allSettled for better error handling
    const uploadPromises = files.map(async (file, index) => {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${index}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `media/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('media-library')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data } = supabase.storage
          .from('media-library')
          .getPublicUrl(filePath);

        // Add to database
        const { error: dbError } = await supabase
          .from('gw_media_library')
          .insert({
            filename: fileName,
            original_filename: file.name,
            file_path: filePath,
            file_url: data.publicUrl,
            file_type: getFileTypeFromName(file.name),
            file_size: file.size,
            mime_type: file.type,
            title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
            bucket_id: 'media-library',
            category: 'uploads'
          });

        if (dbError) throw dbError;

        return { success: true, fileName: file.name };
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        return { success: false, fileName: file.name, error };
      }
    });

    // Use Promise.allSettled to handle all uploads in parallel
    const results = await Promise.allSettled(uploadPromises);
    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<{ success: boolean; fileName: string }> => 
        result.status === 'fulfilled' && result.value.success
      );
    const failedResults = results
      .filter(result => 
        result.status === 'rejected' || 
        (result.status === 'fulfilled' && !result.value.success)
      );

    const successful = successfulResults.length;
    const failed = failedResults.length;

    if (successful > 0) {
      toast({
        title: "Upload Complete",
        description: `${successful} file(s) uploaded successfully${failed > 0 ? `, ${failed} failed` : ''}`,
      });
      fetchMediaData(); // Refresh the media list
    } else {
      toast({
        title: "Upload Failed",
        description: "All uploads failed. Please try again.",
        variant: "destructive"
      });
    }

    setUploading(false);
  };

  const getFileTypeFromName = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    if (['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac'].includes(extension)) {
      return 'audio';
    }
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension)) {
      return 'video';
    }
    if (extension === 'pdf') {
      return 'document';
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
      return 'image';
    }
    return 'other';
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      uploadFiles(acceptedFiles);
    }
  }, [isAdmin]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: !isAdmin || uploading,
    multiple: true,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
      'audio/*': ['.mp3', '.wav', '.aac', '.m4a', '.ogg', '.flac'],
      'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'],
      'application/pdf': ['.pdf']
    }
  });
  const renderMediaCard = (file: MediaFile) => {
    const fileType = getFileTypeFromUrl(file.file_url);
    const isCurrentlyPlaying = currentTrack === file.id && isPlaying;
    const canPlay = fileType === 'mp3';

    return (
      <Card key={file.id} className="group hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-border/30 hover:border-primary/30 hover:scale-[1.02]">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
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
            <div className="flex-shrink-0 p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl border border-primary/20 group-hover:border-primary/40 transition-all">
              {getFileIcon(file.file_url)}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0 space-y-2">
              <h4 className="font-semibold text-foreground truncate text-lg group-hover:text-primary transition-colors">
                {file.title}
              </h4>
              {file.description && (
                <p className="text-sm text-muted-foreground truncate leading-relaxed">
                  {file.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="secondary" className="text-xs font-medium bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-primary/30">
                  {fileType.toUpperCase()}
                </Badge>
                {file.file_size && (
                  <span className="text-xs text-muted-foreground font-medium">
                    {formatFileSize(file.file_size)}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 flex flex-wrap gap-2">
              {isAdmin && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditFile(file)}
                    className="text-xs h-9 px-4 hover:bg-secondary/80 transition-all"
                  >
                    <Edit2 className="h-3 w-3 mr-2" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteFile(file)}
                    className="text-xs h-9 px-4 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(file)}
                    className="text-xs h-9 px-4 hover:bg-secondary/80 transition-all"
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Download
                  </Button>
                </>
              )}
              
              {canPlay && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleAddToPlaylist(file)}
                  className="text-xs h-9 px-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all"
                >
                  <Plus className="h-3 w-3 mr-2" />
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
      <Card key={file.id} className="group mb-4 hover:shadow-xl hover:shadow-red-500/10 transition-all duration-300 bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-border/30 hover:border-red-500/30 hover:scale-[1.02]">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {/* PDF Icon */}
            <div className="flex-shrink-0 p-3 bg-gradient-to-br from-red-500/20 to-red-500/10 rounded-xl border border-red-500/20 group-hover:border-red-500/40 transition-all">
              <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
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
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditFile(file)}
                    className="text-xs h-8 px-3"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteFile(file)}
                    className="text-xs h-8 px-3 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(file.file_url, '_blank')}
                    className="text-xs h-8 px-3"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                </>
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
    <div className="space-y-8 p-6 bg-gradient-to-br from-background via-background/95 to-muted/50 min-h-screen">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full border border-primary/20 mb-4">
          <Music className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-4xl font-bold text-foreground mb-3 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
          Media Library
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Discover, manage, and organize your complete collection of media files with our advanced library system
        </p>
      </div>

      {/* Upload Controls */}
      {isAdmin && (
        <div className="space-y-6">
          {/* Upload Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bulk Upload Card */}
            <Card className="group hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-border/30 hover:border-primary/30 cursor-pointer" onClick={() => setShowBulkUpload(true)}>
              <CardContent className="p-6 text-center space-y-4">
                <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full border border-primary/20 group-hover:border-primary/40 transition-all">
                  <Album className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">Bulk Upload Albums</h3>
                  <p className="text-sm text-muted-foreground mt-2">Upload multiple MP3 files with album metadata</p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Upload Card */}
            <Card 
              {...getRootProps()}
              className={`group transition-all duration-300 cursor-pointer backdrop-blur-md border-2 border-dashed
                ${isDragActive 
                  ? 'border-primary bg-primary/10 shadow-xl shadow-primary/20 scale-105' 
                  : 'border-border/50 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 bg-gradient-to-br from-card/90 to-card/50'
                }
                ${uploading ? 'pointer-events-none opacity-50' : ''}
              `}
            >
              <input {...getInputProps()} />
              <CardContent className="p-6 text-center space-y-4">
                <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-full border border-secondary/20 group-hover:border-secondary/40 transition-all">
                  {uploading ? (
                    <Loader2 className="h-8 w-8 text-secondary animate-spin" />
                  ) : isDragActive ? (
                    <Upload className="h-8 w-8 text-primary animate-pulse" />
                  ) : (
                    <Upload className="h-8 w-8 text-secondary" />
                  )}
                </div>
                <div>
                  {uploading ? (
                    <>
                      <h3 className="text-xl font-semibold text-foreground">Uploading Files...</h3>
                      <p className="text-sm text-muted-foreground mt-2">Please wait while we process your files</p>
                    </>
                  ) : isDragActive ? (
                    <>
                      <h3 className="text-xl font-semibold text-primary">Drop Files Here</h3>
                      <p className="text-sm text-muted-foreground mt-2">Release to start uploading</p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl font-semibold text-foreground group-hover:text-secondary transition-colors">Quick Upload</h3>
                      <p className="text-sm text-muted-foreground mt-2">Drag & drop individual files or click to browse</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Search and Sort */}
      <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-border/30 shadow-lg">
        <CardContent className="p-6 space-y-6">
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
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 bg-gradient-to-r from-muted/80 to-muted/60 backdrop-blur-md border border-border/30 shadow-lg h-14">
          <TabsTrigger value="quick-capture" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Quick Capture</span>
            <span className="sm:hidden">Capture</span>
            ({quickCaptureMedia.length})
          </TabsTrigger>
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

        {/* Quick Capture Tab */}
        <TabsContent value="quick-capture" className="mt-6">
          <div className="space-y-6">
            {/* Category Cards */}
            {!quickCaptureCategory ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { id: 'christmas_carol_selfie', title: 'Christmas Carol Selfies', icon: Sparkles, color: 'from-red-500 to-green-500' },
                  { id: 'glee_cam_pic', title: 'Glee Cam Pics', icon: Camera, color: 'from-amber-500 to-orange-500' },
                  { id: 'glee_cam_video', title: 'Glee Cam Videos', icon: Video, color: 'from-rose-500 to-amber-500' },
                  { id: 'voice_part_recording', title: 'Voice Recordings', icon: Mic, color: 'from-blue-500 to-cyan-500' },
                  { id: 'exec_board_video', title: 'ExecBoard Videos', icon: Video, color: 'from-purple-500 to-pink-500' },
                  { id: 'member_audition_video', title: 'Audition Videos', icon: UserCheck, color: 'from-emerald-500 to-teal-500' },
                ].map((cat) => {
                  const count = quickCaptureMedia.filter(m => m.category === cat.id).length;
                  const IconComp = cat.icon;
                  return (
                    <Card 
                      key={cat.id}
                      className="cursor-pointer hover:shadow-lg transition-all group bg-background/50 backdrop-blur-sm border-border/50"
                      onClick={() => setQuickCaptureCategory(cat.id)}
                    >
                      <CardContent className="p-6 text-center">
                        <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                          <IconComp className="h-8 w-8" />
                        </div>
                        <h3 className="font-semibold text-foreground">{cat.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{count} files</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Back button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuickCaptureCategory(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ← Back to Categories
                </Button>

                {/* Media Grid */}
                <ScrollArea className="h-96">
                  {quickCaptureMedia.filter(m => m.category === quickCaptureCategory).length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {quickCaptureMedia
                        .filter(m => m.category === quickCaptureCategory)
                        .map(item => (
                          <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-all bg-background/50 backdrop-blur-sm border-border/50">
                            <div className="aspect-square overflow-hidden bg-muted relative">
                              {item.file_type?.startsWith('video') || item.file_url?.match(/\.(mp4|mov|webm)$/i) ? (
                                <>
                                  {item.thumbnail_url ? (
                                    <img 
                                      src={item.thumbnail_url} 
                                      alt={item.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Video className="h-12 w-12 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <Play className="h-12 w-12 text-white" />
                                  </div>
                                </>
                              ) : item.file_type?.startsWith('audio') || item.file_url?.match(/\.(mp3|wav|m4a)$/i) ? (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                                  <Mic className="h-12 w-12 text-blue-500" />
                                </div>
                              ) : (
                                <img 
                                  src={item.file_url} 
                                  alt={item.title}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                                  onClick={() => window.open(item.file_url, '_blank')}
                                />
                              )}
                            </div>
                            <CardContent className="p-3">
                              <h4 className="font-medium text-foreground text-sm truncate mb-1">
                                {item.title || 'Untitled'}
                              </h4>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(item.created_at).toLocaleDateString()}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => window.open(item.file_url, '_blank')}
                                  className="h-7 w-7 p-0"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No files in this category</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>
        </TabsContent>

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

        <TabsContent value="mp3" className="mt-8">
          <ScrollArea className="h-[600px] pr-4">
            {mp3Files.length > 0 ? (
              <div className="space-y-4">
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

      {/* Edit Dialog */}
      {editingFile && (
        <Dialog open={!!editingFile} onOpenChange={() => setEditingFile(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Media File</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Enter title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Enter description (optional)"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditingFile(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

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

      {/* Bulk Upload Dialog */}
      {showBulkUpload && (
        <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Album className="h-5 w-5" />
                Bulk Upload MP3 Albums
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto">
              <MediaLibraryBulkUpload
                onUploadComplete={fetchMediaData}
                onClose={() => setShowBulkUpload(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};