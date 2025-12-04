import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MediaFile, ViewMode, SortBy, SortOrder } from './types';
import { FinderSidebar } from './FinderSidebar';
import { FinderToolbar } from './FinderToolbar';
import { FinderFileGrid } from './FinderFileGrid';
import { FinderFileList } from './FinderFileList';
import { FinderInspector } from './FinderInspector';
import { FinderBreadcrumb } from './FinderBreadcrumb';
import { MediaPreviewModal } from './MediaPreviewModal';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu';
import { FolderPlus, Upload, Clipboard } from 'lucide-react';
import { cn } from '@/lib/utils';

export const FinderMediaLibrary = () => {
  // State
  const [allFiles, setAllFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('all');
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [inspectorFile, setInspectorFile] = useState<MediaFile | null>(null);
  const [showInspector, setShowInspector] = useState(false);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  // Fetch data
  useEffect(() => {
    fetchAllMedia();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data } = await supabase.rpc('is_current_user_admin_safe');
      setIsAdmin(Boolean(data));
    } catch (e) {
      console.error('Error checking admin status:', e);
    }
  };

  const fetchAllMedia = async () => {
    setLoading(true);
    try {
      // Fetch from gw_media_library
      const { data: mediaData, error: mediaError } = await supabase
        .from('gw_media_library')
        .select('*')
        .order('created_at', { ascending: false });

      if (mediaError) throw mediaError;

      // Fetch from quick_capture_media
      const { data: captureData, error: captureError } = await supabase
        .from('quick_capture_media')
        .select('*')
        .order('created_at', { ascending: false });

      if (captureError) throw captureError;

      // Combine and normalize data
      const normalizedMedia = (mediaData || []).map(file => ({
        ...file,
        source: 'media_library'
      }));

      const normalizedCapture = (captureData || []).map(file => ({
        ...file,
        source: 'quick_capture',
        title: file.title || 'Untitled'
      }));

      setAllFiles([...normalizedMedia, ...normalizedCapture]);
    } catch (error) {
      console.error('Error fetching media:', error);
      toast({
        title: "Error",
        description: "Failed to load media library",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // File type detection
  const getFileType = (file: MediaFile): string => {
    const url = file.file_url?.toLowerCase() || '';
    const type = file.file_type?.toLowerCase() || '';
    
    if (type.includes('image') || url.match(/\.(jpg|jpeg|png|gif|webp|svg|heic)$/)) return 'image';
    if (type.includes('video') || url.match(/\.(mp4|mov|avi|webm|mkv)$/)) return 'video';
    if (type.includes('audio') || url.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/)) return 'audio';
    if (type.includes('pdf') || url.match(/\.pdf$/)) return 'document';
    return 'other';
  };

  // Filter files based on active section and search
  const getFilteredFiles = useCallback(() => {
    let filtered = [...allFiles];

    // Apply section filter
    switch (activeSection) {
      case 'images':
        filtered = filtered.filter(f => getFileType(f) === 'image');
        break;
      case 'videos':
        filtered = filtered.filter(f => getFileType(f) === 'video');
        break;
      case 'audio':
        filtered = filtered.filter(f => getFileType(f) === 'audio');
        break;
      case 'documents':
        filtered = filtered.filter(f => getFileType(f) === 'document');
        break;
      case 'quick-capture':
        filtered = filtered.filter(f => (f as any).source === 'quick_capture');
        break;
      case 'favorites':
        filtered = filtered.filter(f => f.is_favorite);
        break;
      case 'trash':
        filtered = filtered.filter(f => f.is_deleted);
        break;
      default:
        filtered = filtered.filter(f => !f.is_deleted);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(f => 
        f.title?.toLowerCase().includes(query) ||
        f.description?.toLowerCase().includes(query) ||
        f.category?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'size':
          comparison = (a.file_size || 0) - (b.file_size || 0);
          break;
        case 'type':
          comparison = getFileType(a).localeCompare(getFileType(b));
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [allFiles, activeSection, searchQuery, sortBy, sortOrder]);

  // File upload
  const handleUpload = async (files: File[]) => {
    if (!isAdmin) {
      toast({ title: "Permission denied", variant: "destructive" });
      return;
    }

    setUploading(true);
    let successCount = 0;

    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `media/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('media-library')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('media-library').getPublicUrl(filePath);

        await supabase.from('gw_media_library').insert({
          filename: fileName,
          original_filename: file.name,
          file_path: filePath,
          file_url: data.publicUrl,
          file_type: file.type,
          file_size: file.size,
          title: file.name.replace(/\.[^/.]+$/, ''),
          bucket_id: 'media-library',
          category: 'uploads'
        });

        successCount++;
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    if (successCount > 0) {
      toast({ title: `${successCount} file(s) uploaded` });
      fetchAllMedia();
    }
    setUploading(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    disabled: !isAdmin || uploading,
    noClick: true
  });

  // Selection handlers
  const handleFileSelect = (file: MediaFile, event: React.MouseEvent) => {
    if (event.shiftKey && selectedFiles.length > 0) {
      // Range selection
      const files = getFilteredFiles();
      const lastSelected = files.findIndex(f => f.id === selectedFiles[selectedFiles.length - 1]);
      const currentIndex = files.findIndex(f => f.id === file.id);
      const start = Math.min(lastSelected, currentIndex);
      const end = Math.max(lastSelected, currentIndex);
      const rangeIds = files.slice(start, end + 1).map(f => f.id);
      setSelectedFiles(prev => [...new Set([...prev, ...rangeIds])]);
    } else if (event.metaKey || event.ctrlKey) {
      // Toggle selection
      setSelectedFiles(prev => 
        prev.includes(file.id) 
          ? prev.filter(id => id !== file.id)
          : [...prev, file.id]
      );
    } else {
      // Single selection
      setSelectedFiles([file.id]);
      setInspectorFile(file);
      setShowInspector(true);
    }
  };

  const handleFileOpen = (file: MediaFile) => {
    setPreviewFile(file);
  };

  // Calculate storage
  const totalSize = allFiles.reduce((acc, f) => acc + (f.file_size || 0), 0);
  const usedGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);

  const filteredFiles = getFilteredFiles();

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[600px] bg-background border border-border rounded-lg overflow-hidden shadow-xl">
      {/* Sidebar */}
      <FinderSidebar 
        activeSection={activeSection}
        onSectionChange={(section) => {
          setActiveSection(section);
          setSelectedFiles([]);
        }}
        fileCounts={{
          all: allFiles.filter(f => !f.is_deleted).length,
          images: allFiles.filter(f => getFileType(f) === 'image').length,
          videos: allFiles.filter(f => getFileType(f) === 'video').length,
          audio: allFiles.filter(f => getFileType(f) === 'audio').length,
          documents: allFiles.filter(f => getFileType(f) === 'document').length,
          'quick-capture': allFiles.filter(f => (f as any).source === 'quick_capture').length,
          favorites: allFiles.filter(f => f.is_favorite).length,
          trash: allFiles.filter(f => f.is_deleted).length
        }}
        usedStorage={usedGB}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <FinderToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onUpload={() => document.getElementById('file-upload-input')?.click()}
          onNewFolder={() => toast({ title: "Folders coming soon" })}
          isAdmin={isAdmin}
          uploading={uploading}
        />

        {/* Breadcrumb */}
        <FinderBreadcrumb 
          path={currentPath}
          onNavigate={(index) => setCurrentPath(prev => prev.slice(0, index + 1))}
          activeSection={activeSection}
        />

        {/* File Area */}
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div 
              {...getRootProps()}
              className={cn(
                "flex-1 overflow-auto p-4 transition-colors",
                isDragActive && "bg-primary/5 border-2 border-dashed border-primary"
              )}
            >
              <input {...getInputProps()} id="file-upload-input" />
              
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Upload className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No files found</p>
                  <p className="text-sm">Drag and drop files here to upload</p>
                </div>
              ) : viewMode === 'grid' ? (
                <FinderFileGrid
                  files={filteredFiles}
                  selectedFiles={selectedFiles}
                  onSelect={handleFileSelect}
                  onOpen={handleFileOpen}
                  getFileType={getFileType}
                />
              ) : (
                <FinderFileList
                  files={filteredFiles}
                  selectedFiles={selectedFiles}
                  onSelect={handleFileSelect}
                  onOpen={handleFileOpen}
                  getFileType={getFileType}
                />
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => document.getElementById('file-upload-input')?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </ContextMenuItem>
            <ContextMenuItem onClick={() => toast({ title: "Folders coming soon" })}>
              <FolderPlus className="h-4 w-4 mr-2" />
              New Folder
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => toast({ title: "Paste coming soon" })}>
              <Clipboard className="h-4 w-4 mr-2" />
              Paste
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>

      {/* Inspector Panel */}
      {showInspector && inspectorFile && (
        <FinderInspector
          key={inspectorFile.id}
          file={inspectorFile}
          onClose={() => setShowInspector(false)}
          onPreview={() => setPreviewFile(inspectorFile)}
          onRefresh={fetchAllMedia}
          isAdmin={isAdmin}
          getFileType={getFileType}
        />
      )}

      {/* Preview Modal */}
      {previewFile && (
        <MediaPreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          getFileType={getFileType}
        />
      )}
    </div>
  );
};
