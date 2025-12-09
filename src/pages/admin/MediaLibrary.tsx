import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Music, Image, Video, Upload, FileText, ArrowLeft, Loader2, ExternalLink, Camera, Album, Plus, X, Folder, FolderOpen, Home, ChevronRight, ChevronDown } from "lucide-react";
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import { Document as PdfDocument, Page as PdfPage, pdfjs } from 'react-pdf';
(pdfjs as any).GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface MediaItem {
  id: string;
  file_url: string | null;
  title?: string | null;
  original_filename?: string | null;
  mime_type?: string | null;
  file_type?: string | null;
  category?: string | null;
  created_at?: string | null;
  file_path?: string | null;
  folder_path?: string | null;
}

const MIME_TO_KIND = (mime?: string | null, fallback?: string | null) => {
  if (!mime && fallback) return fallback;
  if (!mime) return 'other';
  
  // Handle actual MIME types from database
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  if (mime.includes('pdf') || mime === 'application/pdf') return 'pdf';
  if (mime.includes('msword') || mime.includes('officedocument')) return 'pdf';
  
  return 'other';
};

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

const MediaLibrary = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category');
  const [gleeCamCategory, setGleeCamCategory] = useState<{ id: string; name: string; slug: string } | null>(null);
  
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeKind, setActiveKind] = useState<'all'|'image'|'audio'|'video'|'pdf'|'documents'|'other'>('all');
  const [query, setQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState('');
  const [folderStructure, setFolderStructure] = useState<Record<string, MediaItem[]>>({});
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([''])); // Root expanded by default
  const [navigationPath, setNavigationPath] = useState<string[]>(['']); // Breadcrumb path

  // Fetch Glee Cam category info if filtering by category
  useEffect(() => {
    if (categoryFilter) {
      const fetchCategory = async () => {
        const { data } = await supabase
          .from('glee_cam_categories')
          .select('id, name, slug')
          .eq('slug', categoryFilter)
          .single();
        setGleeCamCategory(data);
      };
      fetchCategory();
    } else {
      setGleeCamCategory(null);
    }
  }, [categoryFilter]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      let allItems: any[] = [];
      
      // If filtering by Glee Cam category, search both tables
      if (categoryFilter) {
        // First, search gw_media_library by category slug or glee_cam_category_id
        let mediaLibraryQuery = supabase
          .from('gw_media_library')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);
        
        if (gleeCamCategory?.id) {
          mediaLibraryQuery = mediaLibraryQuery.eq('glee_cam_category_id', gleeCamCategory.id);
        } else {
          mediaLibraryQuery = mediaLibraryQuery.eq('category', categoryFilter);
        }
        
        const { data: mediaLibraryData } = await mediaLibraryQuery;
        
        // Also search quick_capture_media by category
        const { data: quickCaptureData } = await supabase
          .from('quick_capture_media')
          .select('*')
          .eq('category', categoryFilter)
          .order('created_at', { ascending: false })
          .limit(200);
        
        // Combine results
        allItems = [
          ...(mediaLibraryData || []).map((r: any) => ({
            id: r.id,
            file_url: r.file_url ?? null,
            title: r.title ?? null,
            original_filename: r.title ?? null,
            mime_type: r.file_type ?? null,
            file_type: r.file_type ?? null,
            category: r.category ?? null,
            created_at: r.created_at ?? null,
            file_path: r.file_path ?? null,
            folder_path: r.file_path ? r.file_path.includes('/') ? r.file_path.split('/').slice(1, -1).join('/') : '' : '',
            source: 'media_library',
          })),
          ...(quickCaptureData || []).map((r: any) => ({
            id: r.id,
            file_url: r.file_url ?? r.thumbnail_url ?? null,
            title: r.title ?? r.description ?? 'Quick Capture',
            original_filename: r.title ?? null,
            mime_type: r.file_type ?? null,
            file_type: r.file_type ?? null,
            category: r.category ?? null,
            created_at: r.created_at ?? null,
            file_path: null,
            folder_path: '',
            source: 'quick_capture',
            thumbnail_url: r.thumbnail_url,
          })),
        ];
        
        // Sort by created_at
        allItems.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      } else {
        // No category filter - just load from gw_media_library
        const { data } = await supabase
          .from('gw_media_library')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);
        
        allItems = (data || []).map((r: any) => ({
          id: r.id,
          file_url: r.file_url ?? null,
          title: r.title ?? null,
          original_filename: r.title ?? null,
          mime_type: r.file_type ?? null,
          file_type: r.file_type ?? null,
          category: r.category ?? null,
          created_at: r.created_at ?? null,
          file_path: r.file_path ?? null,
          folder_path: r.file_path ? r.file_path.includes('/') ? r.file_path.split('/').slice(1, -1).join('/') : '' : '',
        }));
      }
      
      // Build folder structure
      const folders: Record<string, MediaItem[]> = {};
      allItems.forEach(item => {
        const folderPath = item.folder_path || '';
        if (!folders[folderPath]) folders[folderPath] = [];
        folders[folderPath].push(item);
      });
      setFolderStructure(folders);
      setItems(allItems);
    } catch (e) {
      console.error('Failed to load media:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [categoryFilter, gleeCamCategory]);


  const currentFolderItems = currentFolder 
    ? folderStructure[currentFolder] || []
    : folderStructure[''] || [];

  // Build hierarchical folder structure for tree view
  const folderHierarchy = useMemo(() => {
    const hierarchy: Record<string, { folders: string[], files: MediaItem[] }> = {};
    
    Object.keys(folderStructure).forEach(folderPath => {
      const folders = folderPath === '' ? [] : folderPath.split('/');
      const currentPath = '';
      
      // Initialize if doesn't exist
      if (!hierarchy[currentPath]) {
        hierarchy[currentPath] = { folders: [], files: [] };
      }
      
      // Add direct subfolders and files for current view
      if (folderPath === currentFolder) {
        hierarchy[currentPath].files = folderStructure[folderPath] || [];
      } else if (folderPath.startsWith(currentFolder) && folderPath !== currentFolder) {
        const relativePath = currentFolder === '' ? folderPath : folderPath.substring(currentFolder.length + 1);
        const nextFolder = relativePath.split('/')[0];
        const fullNextPath = currentFolder === '' ? nextFolder : `${currentFolder}/${nextFolder}`;
        
        if (!hierarchy[currentPath].folders.includes(fullNextPath)) {
          hierarchy[currentPath].folders.push(fullNextPath);
        }
      }
    });
    
    return hierarchy;
  }, [folderStructure, currentFolder]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const isDoc = (i: MediaItem) => {
      const mt = (i.mime_type || '').toLowerCase();
      const cat = (i.category || '').toLowerCase();
      return mt.includes('pdf') || mt.includes('msword') || mt.includes('officedocument') || cat.includes('document');
    };
    
    return currentFolderItems.filter(i => {
      const kind = MIME_TO_KIND(i.mime_type, i.file_type);
      const matchesKind = activeKind === 'all'
        ? true
        : activeKind === 'documents'
          ? isDoc(i)
          : kind === activeKind;
      const matchesQuery = !q || [i.title, i.original_filename, i.category]
        .filter(Boolean)
        .some(v => (v as string).toLowerCase().includes(q));
      return matchesKind && matchesQuery;
    });
  }, [currentFolderItems, activeKind, query]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedItem = useMemo(() => filtered.find(i => i.id === selectedId) || null, [filtered, selectedId]);

  useEffect(() => {
    if (!selectedId && filtered.length) {
      setSelectedId(filtered[0].id);
    } else if (selectedId && !filtered.some(i => i.id === selectedId) && filtered.length) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const onUploadClick = () => fileInputRef.current?.click();

  const handleSingleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    const files = [file];
    await handleBulkUploadFiles(files);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBulkUploadFiles = async (files: File[], preserveFolderStructure = false) => {
    if (!user) return;
    
    setUploading(true);
    
    const uploadPromises = files.map(async (file, index) => {
      try {
        const date = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const ymd = `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}`;
        
        let filePath: string;
        if (preserveFolderStructure && (file as any).webkitRelativePath) {
          // Preserve folder structure from folder upload
          const relativePath = (file as any).webkitRelativePath;
          const safePath = relativePath.replace(/\s+/g, '-').toLowerCase();
          filePath = `${user.id}/folders/${safePath}`;
        } else {
          // Regular file upload
          const safeName = file.name.replace(/\s+/g, '-').toLowerCase();
          filePath = currentFolder 
            ? `${user.id}/${currentFolder}/${ymd}-${index}-${crypto.randomUUID()}-${safeName}`
            : `${user.id}/${ymd}-${index}-${crypto.randomUUID()}-${safeName}`;
        }

        // Upload to storage bucket (using media-library bucket for consistency)
        const { data: upRes, error: upErr } = await supabase.storage
          .from('media-library')
          .upload(filePath, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('media-library')
          .getPublicUrl(filePath);

        // Insert directly into media library table
        const { error: insertErr } = await supabase
          .from('gw_media_library')
          .insert({
            title: file.name,
            description: null,
            file_url: publicUrl,
            file_path: filePath,
            file_type: file.type, // Store the actual MIME type
            file_size: file.size,
            category: 'general',
            uploaded_by: user.id,
            is_public: true,
            is_featured: false
          });
        
        if (insertErr) throw insertErr;
        return { success: true, fileName: file.name };
      } catch (err) {
        console.error(`Upload failed for ${file.name}:`, err);
        return { success: false, fileName: file.name, error: err };
      }
    });

    try {
      const results = await Promise.allSettled(uploadPromises);
      const successful = results.filter((result): result is PromiseFulfilledResult<{success: boolean; fileName: string}> => 
        result.status === 'fulfilled' && result.value.success
      ).length;
      const failed = results.length - successful;

      if (successful > 0) {
        toast({
          title: "Upload Complete",
          description: `${successful} file(s) uploaded successfully${failed > 0 ? `, ${failed} failed` : ''}`,
        });
        await fetchItems();
      } else {
        toast({
          title: "Upload Failed",
          description: "All uploads failed. Please try again.",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Bulk upload failed:', err);
      toast({
        title: "Upload Error",
        description: "An unexpected error occurred during upload",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const hasRelativePaths = acceptedFiles.some((file: any) => file.webkitRelativePath);
      handleBulkUploadFiles(acceptedFiles, hasRelativePaths);
    }
  }, [user, currentFolder]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading,
    multiple: true,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
      'audio/*': ['.mp3', '.wav', '.aac', '.m4a', '.ogg', '.flac'],
      'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'],
      'application/pdf': ['.pdf']
    }
  });

  const folderInputRef = useRef<HTMLInputElement>(null);
  
  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleBulkUploadFiles(files, true);
    }
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const navigateToFolder = (folderPath: string) => {
    setCurrentFolder(folderPath);
    const pathParts = folderPath === '' ? [''] : ['', ...folderPath.split('/')];
    setNavigationPath(pathParts);
  };

  const renderFolderTree = () => {
    const currentHierarchy = folderHierarchy[''] || { folders: [], files: [] };
    const folders = currentHierarchy.folders || [];
    const files = currentHierarchy.files || [];

    return (
      <div className="p-2">
        {/* Render folders first */}
        {folders.map((folderPath) => {
          const folderName = folderPath.split('/').pop() || folderPath;
          const isExpanded = expandedFolders.has(folderPath);
          const folderItems = folderStructure[folderPath] || [];
          
          return (
            <div key={folderPath} className="mb-1">
              <button
                onClick={() => navigateToFolder(folderPath)}
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/60 transition-all group"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFolder(folderPath);
                  }}
                  className="p-0.5 hover:bg-muted rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
                <Folder className="h-4 w-4 text-blue-500" />
                <span className="font-medium truncate flex-1">{folderName}</span>
                <Badge variant="outline" className="text-xs">
                  {folderItems.length}
                </Badge>
              </button>
            </div>
          );
        })}
        
        {/* Render files */}
        {filtered.map((m) => {
          const kind = MIME_TO_KIND(m.mime_type, m.file_type);
          const active = m.id === selectedId;
          return (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md transition-all ml-5
                ${active 
                  ? 'bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30' 
                  : 'hover:bg-muted/60'
                }`}
            >
              <div className={`p-1.5 rounded ${active ? 'bg-primary/20' : 'bg-muted/50'}`}>
                {kind === 'image' ? (
                  <Image className="h-4 w-4 text-primary" />
                ) : kind === 'audio' ? (
                  <Music className="h-4 w-4 text-primary" />
                ) : kind === 'video' ? (
                  <Video className="h-4 w-4 text-primary" />
                ) : kind === 'pdf' ? (
                  <FileText className="h-4 w-4 text-primary" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium text-sm">{m.original_filename || m.title}</div>
                <div className="text-xs text-muted-foreground">
                  {(kind || 'file').toUpperCase()}
                </div>
              </div>
              {m.category && <Badge variant="outline" className="text-xs bg-secondary/20">{m.category}</Badge>}
            </button>
          );
        })}
        
        {folders.length === 0 && files.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No files in this folder</p>
          </div>
        )}
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/50 flex flex-col">
      {/* Fixed Mobile Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 border-b shadow-sm flex-shrink-0">
        <div className="px-3 sm:px-6 py-3 sm:py-4">
          {/* Mobile Header - Compact */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => categoryFilter ? navigate('/dashboard') : navigate('/admin')} 
                className="flex-shrink-0 h-9 w-9"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold truncate text-foreground">
                  {gleeCamCategory ? gleeCamCategory.name : 'Media Library'}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:block">
                  {gleeCamCategory 
                    ? `${items.length} items` 
                    : 'Manage media files'}
                </p>
              </div>
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2">
              <Button onClick={() => setShowBulkUpload(true)} size="sm" className="gap-2">
                <Album className="h-4 w-4" />
                Bulk Upload
              </Button>
              <Button onClick={() => folderInputRef.current?.click()} disabled={uploading} variant="outline" size="sm">
                <Folder className="h-4 w-4" />
              </Button>
              <Button onClick={onUploadClick} disabled={uploading} variant="outline" size="sm">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </Button>
            </div>
            
            {/* Mobile Upload Button */}
            <Button 
              onClick={onUploadClick} 
              disabled={uploading} 
              size="icon"
              className="md:hidden flex-shrink-0 h-9 w-9"
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            </Button>
          </div>
          
          {/* Mobile item count */}
          <p className="text-xs text-muted-foreground mt-1 sm:hidden">
            {items.length} items
          </p>
        </div>
        
        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleSingleUpload} multiple />
        <input 
          ref={folderInputRef} 
          type="file" 
          className="hidden" 
          {...({ webkitdirectory: '' } as any)}
          onChange={handleFolderUpload} 
          multiple 
        />
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Filter Tabs - Fixed below header on mobile */}
        <div className="flex-shrink-0 px-3 sm:px-6 py-2 sm:py-4 bg-background/80 backdrop-blur-sm border-b border-border/30">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center sm:justify-between">
            <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
              <Tabs value={activeKind} onValueChange={(v) => setActiveKind(v as any)}>
                <TabsList className="bg-muted/60 h-8 sm:h-9 w-max">
                  <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-3 h-6 sm:h-7">All</TabsTrigger>
                  <TabsTrigger value="image" className="text-xs sm:text-sm px-2 sm:px-3 h-6 sm:h-7">Images</TabsTrigger>
                  <TabsTrigger value="audio" className="text-xs sm:text-sm px-2 sm:px-3 h-6 sm:h-7">Audio</TabsTrigger>
                  <TabsTrigger value="video" className="text-xs sm:text-sm px-2 sm:px-3 h-6 sm:h-7">Video</TabsTrigger>
                  <TabsTrigger value="pdf" className="text-xs sm:text-sm px-2 sm:px-3 h-6 sm:h-7">PDF</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <Input 
              placeholder="Search..." 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              className="h-8 sm:h-9 text-sm sm:max-w-xs bg-background/80" 
            />
          </div>
        </div>

        {/* Content Grid - Scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-6 py-3 sm:py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 text-primary mx-auto mb-2 animate-spin" />
                <p className="text-sm text-muted-foreground">Loading media...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile: Grid of media items */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                {filtered.map((m) => {
                  const kind = MIME_TO_KIND(m.mime_type, m.file_type);
                  const active = m.id === selectedId;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedId(m.id)}
                      className={`relative aspect-square rounded-lg overflow-hidden bg-muted/30 border transition-all active:scale-95
                        ${active 
                          ? 'ring-2 ring-primary border-primary shadow-lg' 
                          : 'border-border/30 hover:border-primary/50'
                        }`}
                    >
                      {/* Thumbnail */}
                      {kind === 'image' && m.file_url ? (
                        <img 
                          src={m.file_url} 
                          alt={m.title || 'media'} 
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : kind === 'video' && m.file_url ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                          <Video className="h-8 w-8 text-primary" />
                        </div>
                      ) : kind === 'audio' ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary/20 to-secondary/5">
                          <Music className="h-8 w-8 text-secondary" />
                        </div>
                      ) : kind === 'pdf' ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-destructive/20 to-destructive/5">
                          <FileText className="h-8 w-8 text-destructive" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted/50">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      
                      {/* Title overlay */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 sm:p-2">
                        <p className="text-[10px] sm:text-xs text-white truncate font-medium">
                          {m.title || m.original_filename || 'Untitled'}
                        </p>
                      </div>
                      
                      {/* Type badge */}
                      <div className="absolute top-1 right-1">
                        <Badge variant="secondary" className="text-[8px] sm:text-[10px] px-1 py-0 h-4 bg-background/80">
                          {(kind || 'file').toUpperCase()}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Folder className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No media found</p>
                  <p className="text-sm text-muted-foreground/70">Try adjusting your filters</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Media Preview Dialog - Mobile Optimized */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="p-3 sm:p-4 border-b flex-shrink-0">
            <DialogTitle className="text-sm sm:text-base truncate pr-8">
              {selectedItem?.title || selectedItem?.original_filename || 'Media Preview'}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto overscroll-contain p-3 sm:p-4">
            {selectedItem && (() => {
              const kind = MIME_TO_KIND(selectedItem.mime_type, selectedItem.file_type);
              const isPdf = (selectedItem.mime_type || '').toLowerCase().includes('pdf');
              return (
                <div className="space-y-4">
                  <div className="w-full">
                    {kind === 'image' && selectedItem.file_url ? (
                      <img 
                        src={selectedItem.file_url} 
                        alt={selectedItem.title || 'media'} 
                        className="w-full max-h-[60vh] object-contain rounded-lg" 
                      />
                    ) : kind === 'audio' && selectedItem.file_url ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg text-center">
                          <Music className="h-12 w-12 text-primary mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Audio file</p>
                        </div>
                        <audio controls className="w-full">
                          <source src={selectedItem.file_url} />
                        </audio>
                      </div>
                    ) : kind === 'video' && selectedItem.file_url ? (
                      <video controls className="w-full max-h-[60vh] rounded-lg">
                        <source src={selectedItem.file_url} />
                      </video>
                    ) : (kind === 'pdf' || isPdf) && selectedItem.file_url ? (
                      <div className="text-center p-6 bg-muted/20 rounded-lg space-y-4">
                        <FileText className="h-12 w-12 text-destructive mx-auto" />
                        <p className="text-muted-foreground">PDF Document</p>
                        <Button variant="outline" asChild>
                          <a href={selectedItem.file_url} target="_blank" rel="noopener noreferrer" className="gap-2">
                            <ExternalLink className="h-4 w-4" />
                            Open PDF
                          </a>
                        </Button>
                      </div>
                    ) : selectedItem.file_url ? (
                      <div className="text-center p-6 bg-muted/20 rounded-lg space-y-4">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                        <p className="text-muted-foreground">Preview not available</p>
                        <Button variant="outline" asChild>
                          <a href={selectedItem.file_url} target="_blank" rel="noopener noreferrer" className="gap-2">
                            <ExternalLink className="h-4 w-4" />
                            Open File
                          </a>
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-muted/20 rounded-lg">
                        <p className="text-muted-foreground">No file available</p>
                      </div>
                    )}
                  </div>
                  
                  {/* File actions */}
                  {selectedItem.file_url && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button variant="outline" asChild className="flex-1">
                        <a href={selectedItem.file_url} target="_blank" rel="noopener noreferrer" className="gap-2">
                          <ExternalLink className="h-4 w-4" />
                          Open
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[80vh] overflow-hidden p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Album className="h-5 w-5" />
              Bulk Upload
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <div 
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-all cursor-pointer
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
              `}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm sm:text-base font-medium mb-1">
                {isDragActive ? 'Drop files here' : 'Drag & drop files'}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                or tap to browse
              </p>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowBulkUpload(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MediaLibrary;