import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { MediaFile, ViewMode, SortBy, SortOrder } from './types';
import { FinderSidebar } from './FinderSidebar';
import { FinderToolbar } from './FinderToolbar';
import { FinderFileGrid } from './FinderFileGrid';
import { FinderFileList } from './FinderFileList';
import { FinderInspector } from './FinderInspector';
import { FinderBreadcrumb } from './FinderBreadcrumb';
import { MediaPreviewModal } from './MediaPreviewModal';
import { NewFolderDialog } from './NewFolderDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu';
import { FolderPlus, Upload, Clipboard, File, PanelLeft, Search, ArrowUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMoveToFolder } from '@/hooks/useMediaFolders';
import { cleanDisplayTitle } from '@/lib/music-library/file-naming';

export const FinderMediaLibrary = () => {
  const queryClient = useQueryClient();
  
  // React Query for media files
  const { data: allFiles = [], isLoading: loading, refetch: refetchMedia } = useQuery({
    queryKey: ['media-library'],
    queryFn: async () => {
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

      return [...normalizedMedia, ...normalizedCapture] as MediaFile[];
    },
  });

  // State
  const isMobile = useIsMobile();
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
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [draggingFileId, setDraggingFileId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { toast } = useToast();
  const moveToFolder = useMoveToFolder();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Handle drag end - move file(s) to folder
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggingFileId(null);
    
    if (over && active.id !== over.id) {
      const draggedFileId = active.id as string;
      const folderId = over.id as string;
      
      // Check if the dragged file is part of a multi-selection
      const filesToMove = selectedFiles.includes(draggedFileId) 
        ? selectedFiles 
        : [draggedFileId];
      
      const fileCount = filesToMove.length;
      
      moveToFolder.mutate(
        { fileIds: filesToMove, folderId },
        {
          onSuccess: () => {
            toast({
              title: fileCount === 1 ? "File moved" : "Files moved",
              description: fileCount === 1 
                ? `Moved file to folder`
                : `Moved ${fileCount} files to folder`
            });
            setSelectedFiles([]);
            refreshMedia();
          }
        }
      );
    }
  };

  const handleDragStart = (event: any) => {
    setDraggingFileId(event.active.id);
  };

  // Check admin status on mount
  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isMobile && viewMode !== 'grid') {
      setViewMode('grid');
    }
  }, [isMobile, viewMode]);

  const checkAdminStatus = async () => {
    try {
      const { data } = await supabase.rpc('is_current_user_admin_safe');
      setIsAdmin(Boolean(data));
    } catch (e) {
      console.error('Error checking admin status:', e);
    }
  };

  // Invalidate and refetch media
  const refreshMedia = () => {
    queryClient.invalidateQueries({ queryKey: ['media-library'] });
  };

  const handleUploadClick = () => {
    document.getElementById('file-upload-input')?.click();
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

  // Filter files based on active section, folder, filters, and search
  const getFilteredFiles = useCallback(() => {
    let filtered = [...allFiles];

    // Exclude deleted files by default (unless viewing trash)
    if (activeSection !== 'trash') {
      filtered = filtered.filter(f => !f.is_deleted);
    }

    // Apply folder filter first if a folder is selected
    if (selectedFolderId) {
      filtered = filtered.filter(f => f.folder_id === selectedFolderId);
    } else {
      // Apply section filter only when not viewing a folder
      switch (activeSection) {
        case 'recents':
          // Show files from last 7 days
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          filtered = filtered.filter(f => new Date(f.created_at) >= weekAgo);
          break;
        case 'favorites':
          filtered = filtered.filter(f => f.is_favorite);
          break;
        case 'downloads':
          filtered = filtered.filter(f => f.category === 'downloads');
          break;
        case 'trash':
          filtered = allFiles.filter(f => f.is_deleted);
          break;
        case 'all':
        default:
          // All files already filtered for non-deleted
          break;
      }
    }

    // Apply type filters from toolbar chips (OR logic - show files matching ANY selected filter)
    if (activeFilters.length > 0) {
      filtered = filtered.filter(f => activeFilters.includes(getFileType(f)));
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
  }, [allFiles, activeSection, selectedFolderId, activeFilters, searchQuery, sortBy, sortOrder]);

  // Filter handlers
  const handleFilterToggle = (filter: string) => {
    setActiveFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const handleClearFilters = () => {
    setActiveFilters([]);
  };

  // File upload
  const handleUpload = async (files: File[]) => {
    if (!isAdmin) {
      toast({ title: "Permission denied", variant: "destructive" });
      return;
    }

    // Filter for supported files under 100MB
    const supportedExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi', '.webm', '.mp3', '.wav', '.m4a', '.ogg', '.pdf'];
    const maxSize = 100 * 1024 * 1024;
    const validFiles = files.filter(file => {
      const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
      const supported = supportedExtensions.includes(ext);
      const withinSize = file.size <= maxSize;
      if (!supported) {
        toast({ title: `Skipped: ${file.name}`, description: `Unsupported file type (${ext})`, variant: 'destructive' });
      } else if (!withinSize) {
        toast({ title: `Skipped: ${file.name}`, description: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB, max 100MB)`, variant: 'destructive' });
      }
      return supported && withinSize;
    });

    if (validFiles.length === 0) {
      return;
    }

    if (validFiles.length < files.length) {
      toast({ title: `${files.length - validFiles.length} file(s) skipped`, description: "Unsupported format or too large" });
    }

    setUploading(true);
    let successCount = 0;

    for (const file of validFiles) {
      try {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `media/${fileName}`;

        // Determine normalized file_type category
        const normalizedType = file.type?.startsWith('audio/') ? 'audio'
          : file.type?.startsWith('video/') ? 'video'
          : file.type?.startsWith('image/') ? 'image'
          : ['pdf'].includes(fileExt) ? 'document'
          : file.type || 'document';

        const { error: uploadError } = await supabase.storage
          .from('media-library')
          .upload(filePath, file, {
            contentType: file.type || 'application/octet-stream',
            cacheControl: '3600',
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('media-library').getPublicUrl(filePath);

        const { error: dbError } = await supabase.from('gw_media_library').insert({
          file_path: filePath,
          file_url: data.publicUrl,
          file_type: normalizedType,
          file_size: file.size || 0,
          title: file.name.replace(/\.[^/.]+$/, ''),
          bucket_id: 'media-library',
          category: 'uploads'
        });

        if (dbError) {
          console.error('Database insert error:', dbError);
          throw dbError;
        }

        successCount++;
      } catch (error: any) {
        console.error('Upload error for', file.name, ':', error);
        toast({ title: `Failed: ${file.name}`, description: error?.message || 'Upload error', variant: 'destructive' });
      }
    }

    if (successCount > 0) {
      toast({ title: `${successCount} file(s) uploaded` });
      refreshMedia();
    } else {
      toast({ title: "Upload failed", description: "Files could not be uploaded. Check file sizes and try again.", variant: "destructive" });
    }
    setUploading(false);
  };

  // Folder upload - preserves folder structure
  const handleFolderUpload = async (files: File[]) => {
    if (!isAdmin) {
      toast({ title: "Permission denied", variant: "destructive" });
      return;
    }

    // Filter for supported file types
    const supportedExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi', '.webm', '.mp3', '.wav', '.m4a', '.ogg', '.pdf'];
    const validFiles = files.filter(file => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      return supportedExtensions.includes(ext);
    });

    if (validFiles.length === 0) {
      toast({ title: "No supported files found in folder", variant: "destructive" });
      return;
    }

    setUploading(true);
    let successCount = 0;

    for (const file of validFiles) {
      try {
        // Extract folder path from webkitRelativePath
        const relativePath = (file as any).webkitRelativePath || file.name;
        const pathParts = relativePath.split('/');
        // Get folder structure (exclude root folder name and filename)
        const folderPath = pathParts.length > 2 
          ? pathParts.slice(1, -1).join('/') 
          : '';

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const storagePath = folderPath 
          ? `media/${folderPath}/${fileName}`
          : `media/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('media-library')
          .upload(storagePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('media-library').getPublicUrl(storagePath);

        // Add folder info to tags
        const tags = folderPath ? [`folder:${folderPath}`] : null;

        const { error: dbError } = await supabase.from('gw_media_library').insert({
          file_path: storagePath,
          file_url: data.publicUrl,
          file_type: file.type || 'audio/wav',
          file_size: file.size || 0,
          title: file.name.replace(/\.[^/.]+$/, ''),
          bucket_id: 'media-library',
          category: folderPath || 'uploads',
          tags: tags
        });

        if (dbError) {
          console.error('Database insert error:', dbError);
          throw dbError;
        }

        successCount++;
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    if (successCount > 0) {
      toast({ title: `${successCount} file(s) uploaded from folder` });
      refreshMedia();
    }
    setUploading(false);
  };

  // Handle native file drop onto a sidebar folder
  const handleNativeFileDrop = useCallback(async (files: File[], folderId: string) => {
    if (!isAdmin) {
      toast({ title: "Permission denied", variant: "destructive" });
      return;
    }

    const supportedExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi', '.webm', '.mp3', '.wav', '.m4a', '.ogg', '.pdf'];
    const validFiles = files.filter(file => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      return supportedExtensions.includes(ext) && file.size <= 100 * 1024 * 1024;
    });

    if (validFiles.length === 0) {
      toast({ title: "No supported files found", variant: "destructive" });
      return;
    }

    setUploading(true);
    let successCount = 0;

    for (const file of validFiles) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `media/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('media-library')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('media-library').getPublicUrl(filePath);

        const { error: dbError } = await supabase.from('gw_media_library').insert({
          file_path: filePath,
          file_url: data.publicUrl,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size || 0,
          title: file.name.replace(/\.[^/.]+$/, ''),
          bucket_id: 'media-library',
          category: 'uploads',
          folder_id: folderId
        });

        if (dbError) throw dbError;
        successCount++;
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    if (successCount > 0) {
      toast({ title: `${successCount} file(s) uploaded to folder` });
      refreshMedia();
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
    }
    setUploading(false);
  }, [isAdmin, toast, refreshMedia, queryClient]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    disabled: !isAdmin || uploading,
    noClick: true
  });
  // Derive {bucket, path} from a Supabase storage public/signed URL
  const parseStorageUrl = (fileUrl?: string): { bucket: string; path: string } | null => {
    if (!fileUrl) return null;
    const match = fileUrl.match(/\/storage\/v1\/object\/(?:public\/|sign\/)?([^/]+)\/([^?]+)/);
    if (!match) return null;
    return { bucket: match[1], path: decodeURIComponent(match[2]) };
  };

  const removeStorageObject = async (file: MediaFile) => {
    if (file.file_path && file.bucket_id) {
      await supabase.storage.from(file.bucket_id).remove([file.file_path]);
      return;
    }
    const parsed = parseStorageUrl(file.file_url);
    if (parsed) {
      await supabase.storage.from(parsed.bucket).remove([parsed.path]);
    }
  };

  // Soft-delete: move files to trash. quick_capture_media has no trash
  // column, so those rows are permanently deleted (with confirm).
  const handleDeleteFiles = useCallback(async (fileIds: string[]) => {
    if (fileIds.length === 0) return;

    const selected = allFiles.filter(f => fileIds.includes(f.id));
    const libraryIds = selected.filter(f => f.source !== 'quick_capture').map(f => f.id);
    const captureFiles = selected.filter(f => f.source === 'quick_capture');

    const label = fileIds.length === 1 ? 'this file' : `${fileIds.length} files`;
    const warning = captureFiles.length > 0
      ? ` (${captureFiles.length} quick-capture file(s) will be permanently deleted — they cannot go to trash)`
      : '';
    if (!confirm(`Move ${label} to trash?${warning}`)) return;

    try {
      if (libraryIds.length > 0) {
        const { error } = await supabase
          .from('gw_media_library')
          .update({ is_deleted: true })
          .in('id', libraryIds);
        if (error) throw error;
      }

      if (captureFiles.length > 0) {
        for (const file of captureFiles) {
          await removeStorageObject(file);
        }
        const { error } = await supabase
          .from('quick_capture_media')
          .delete()
          .in('id', captureFiles.map(f => f.id));
        if (error) throw error;
      }

      toast({ title: fileIds.length === 1 ? 'File deleted' : `${fileIds.length} files deleted` });
      setSelectedFiles([]);
      setShowInspector(false);
      refreshMedia();
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: 'Error deleting files', variant: 'destructive' });
    }
  }, [toast, refreshMedia, allFiles]);

  // Restore files from trash
  const handleRestoreFiles = useCallback(async (fileIds: string[]) => {
    try {
      const { error } = await supabase
        .from('gw_media_library')
        .update({ is_deleted: false })
        .in('id', fileIds);

      if (error) throw error;

      toast({ title: fileIds.length === 1 ? 'File restored' : `${fileIds.length} files restored` });
      setSelectedFiles([]);
      refreshMedia();
    } catch (error) {
      toast({ title: 'Error restoring files', variant: 'destructive' });
    }
  }, [toast, refreshMedia]);

  // Permanently delete files
  const handlePermanentDelete = useCallback(async (fileIds: string[]) => {
    if (!confirm('Permanently delete? This cannot be undone.')) return;

    try {
      // Also remove from storage
      const filesToDelete = allFiles.filter(f => fileIds.includes(f.id));
      for (const file of filesToDelete) {
        await removeStorageObject(file);
      }

      const libraryIds = filesToDelete.filter(f => f.source !== 'quick_capture').map(f => f.id);
      const captureIds = filesToDelete.filter(f => f.source === 'quick_capture').map(f => f.id);

      if (libraryIds.length > 0) {
        const { error } = await supabase
          .from('gw_media_library')
          .delete()
          .in('id', libraryIds);
        if (error) throw error;
      }

      if (captureIds.length > 0) {
        const { error } = await supabase
          .from('quick_capture_media')
          .delete()
          .in('id', captureIds);
        if (error) throw error;
      }

      toast({ title: 'Permanently deleted' });
      setSelectedFiles([]);
      setShowInspector(false);
      refreshMedia();
    } catch (error) {
      toast({ title: 'Error deleting', variant: 'destructive' });
    }
  }, [toast, refreshMedia, allFiles]);


  const handleFileSelect = (file: MediaFile, event: React.MouseEvent) => {
    if (isMobile) {
      setSelectedFiles([file.id]);
      setPreviewFile(file);
      return;
    }

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

  // State to track if we should start editing in inspector
  const [startEditing, setStartEditing] = useState(false);

  const handleFileRename = (file: MediaFile) => {
    setSelectedFiles([file.id]);
    setInspectorFile(file);
    setStartEditing(true);
    setShowInspector(true);
  };

  // Reset startEditing when inspector closes
  useEffect(() => {
    if (!showInspector) {
      setStartEditing(false);
    }
  }, [showInspector]);

  // Calculate storage
  const totalSize = allFiles.reduce((acc, f) => acc + (f.file_size || 0), 0);
  const usedGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);

  const filteredFiles = getFilteredFiles();

  const mobileSectionTitle = selectedFolderId
    ? 'Folder'
    : activeSection === 'trash'
      ? 'Trash'
      : activeSection === 'favorites'
        ? 'Favorites'
        : activeSection === 'recents'
          ? 'Recents'
          : 'Media Library';

  const draggingFile = draggingFileId ? allFiles.find(f => f.id === draggingFileId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={cn(
        'bg-background shadow-xl overflow-hidden',
        isMobile
          ? 'flex h-[calc(100dvh-8.5rem)] min-h-[24rem] flex-col rounded-xl border border-border'
          : 'flex h-[calc(100vh-200px)] min-h-[600px] rounded-lg border border-border'
      )}>
        {/* Sidebar */}
        {!isMobile && (
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
            selectedFolderId={selectedFolderId}
            onFolderSelect={(folderId) => {
              setSelectedFolderId(folderId);
              setSelectedFiles([]);
            }}
            onNewFolder={() => setNewFolderDialogOpen(true)}
            isAdmin={isAdmin}
            onNativeFileDrop={handleNativeFileDrop}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          {isMobile ? (
            <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <div className="flex items-center gap-2 p-3">
                <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                      <PanelLeft className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[88vw] max-w-[320px] p-0">
                    <SheetHeader className="border-b border-border px-4 py-3 text-left">
                      <SheetTitle>Media Library</SheetTitle>
                    </SheetHeader>
                    <FinderSidebar
                      activeSection={activeSection}
                      onSectionChange={(section) => {
                        setActiveSection(section);
                        setSelectedFiles([]);
                        setMobileSidebarOpen(false);
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
                      selectedFolderId={selectedFolderId}
                      onFolderSelect={(folderId) => {
                        setSelectedFolderId(folderId);
                        setSelectedFiles([]);
                        setMobileSidebarOpen(false);
                      }}
                      onNewFolder={() => {
                        setNewFolderDialogOpen(true);
                        setMobileSidebarOpen(false);
                      }}
                      isAdmin={isAdmin}
                      onNativeFileDrop={handleNativeFileDrop}
                      className="h-full w-full border-r-0"
                    />
                  </SheetContent>
                </Sheet>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{mobileSectionTitle}</p>
                  <p className="text-xs text-muted-foreground">{filteredFiles.length} item{filteredFiles.length === 1 ? '' : 's'}</p>
                </div>

                {isAdmin && (
                  <Button size="sm" onClick={handleUploadClick} disabled={uploading} className="h-9 shrink-0 gap-2">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Add File
                  </Button>
                )}
              </div>

              <div className="space-y-2 px-3 pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-9"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
                    <SelectTrigger className="h-9 min-w-[132px] shrink-0 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="size">Size</SelectItem>
                      <SelectItem value="type">Type</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    <ArrowUpDown className={cn('h-4 w-4 transition-transform', sortOrder === 'desc' && 'rotate-180')} />
                  </Button>

                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 shrink-0 gap-2"
                      onClick={() => setNewFolderDialogOpen(true)}
                    >
                      <FolderPlus className="h-4 w-4" />
                      Folder
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <FinderToolbar
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onUpload={handleUploadClick}
              onUploadFolder={handleFolderUpload}
              onNewFolder={() => setNewFolderDialogOpen(true)}
              isAdmin={isAdmin}
              uploading={uploading}
              activeFilters={activeFilters}
              onFilterToggle={handleFilterToggle}
              onClearFilters={handleClearFilters}
            />
          )}

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
                  'flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4 transition-colors',
                  isDragActive && 'border-2 border-dashed border-primary bg-primary/5'
                )}
              >
                <input {...getInputProps()} id="file-upload-input" />
                
                {loading ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center px-4 text-center text-muted-foreground">
                    <Upload className="mb-4 h-16 w-16 opacity-50" />
                    <p className="text-lg font-medium text-foreground">No files found</p>
                    <p className="text-sm">{isAdmin ? 'Tap Add File to upload from your phone.' : 'No media matches this view yet.'}</p>
                    {isAdmin && (
                      <Button onClick={handleUploadClick} className="mt-4 gap-2">
                        <Upload className="h-4 w-4" />
                        Add your first file
                      </Button>
                    )}
                  </div>
                ) : viewMode === 'grid' ? (
                  <FinderFileGrid
                    files={filteredFiles}
                    selectedFiles={selectedFiles}
                    onSelect={handleFileSelect}
                    onOpen={handleFileOpen}
                    onRename={handleFileRename}
                    getFileType={getFileType}
                    onRefresh={refreshMedia}
                    onDelete={activeSection === 'trash' ? handlePermanentDelete : handleDeleteFiles}
                    onRestore={handleRestoreFiles}
                    isTrashView={activeSection === 'trash'}
                  />
                ) : (
                  <FinderFileList
                    files={filteredFiles}
                    selectedFiles={selectedFiles}
                    onSelect={handleFileSelect}
                    onOpen={handleFileOpen}
                    onRename={handleFileRename}
                    getFileType={getFileType}
                    onRefresh={refreshMedia}
                    onDelete={activeSection === 'trash' ? handlePermanentDelete : handleDeleteFiles}
                    onRestore={handleRestoreFiles}
                    isTrashView={activeSection === 'trash'}
                  />
                )}
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => document.getElementById('file-upload-input')?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </ContextMenuItem>
              <ContextMenuItem onClick={() => setNewFolderDialogOpen(true)}>
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
        {!isMobile && showInspector && inspectorFile && (
          <FinderInspector
            key={`${inspectorFile.id}-${startEditing}`}
            file={inspectorFile}
            onClose={() => setShowInspector(false)}
            onPreview={() => setPreviewFile(inspectorFile)}
            onRefresh={refreshMedia}
            isAdmin={isAdmin}
            getFileType={getFileType}
            startEditing={startEditing}
            onDelete={activeSection === 'trash' ? handlePermanentDelete : handleDeleteFiles}
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

        {/* New Folder Dialog */}
        <NewFolderDialog 
          open={newFolderDialogOpen} 
          onOpenChange={setNewFolderDialogOpen}
          parentId={null}
        />
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {draggingFile && (
          <div className="bg-background border border-primary rounded-lg p-3 shadow-lg flex items-center gap-2 opacity-90">
            <File className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium truncate max-w-32">
              {selectedFiles.includes(draggingFile.id) && selectedFiles.length > 1
                ? `${selectedFiles.length} files selected`
                : draggingFile.title || 'Untitled'}
            </span>
            {selectedFiles.includes(draggingFile.id) && selectedFiles.length > 1 && (
              <span className="ml-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full font-medium">
                {selectedFiles.length}
              </span>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
