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
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <header className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 border-b shadow-sm">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full border border-primary/20">
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  {gleeCamCategory ? gleeCamCategory.name : 'Media Library'}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {gleeCamCategory 
                    ? `Viewing ${items.length} items in ${gleeCamCategory.name}` 
                    : 'Manage images, audio, videos, and documents with advanced parallel uploading'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => categoryFilter ? navigate('/dashboard') : navigate('/admin')} className="hover:bg-secondary/80">
                <ArrowLeft className="mr-2 h-4 w-4" /> {categoryFilter ? 'Back to Dashboard' : 'Back to Admin'}
              </Button>
              <Button onClick={() => setShowBulkUpload(true)} className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md">
                <Album className="h-4 w-4" />
                Bulk Upload
              </Button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleSingleUpload} multiple />
              <input 
                ref={folderInputRef} 
                type="file" 
                className="hidden" 
                {...({ webkitdirectory: '' } as any)}
                onChange={handleFolderUpload} 
                multiple 
              />
              <Button onClick={() => folderInputRef.current?.click()} disabled={uploading} variant="outline" className="hover:bg-secondary/80">
                <Folder className="mr-2 h-4 w-4" />
                Upload Folder
              </Button>
              <Button onClick={onUploadClick} disabled={uploading} variant="outline" className="hover:bg-secondary/80">
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {uploading ? 'Uploading...' : 'Quick Upload'}
              </Button>
            </div>
          </div>
        </header>

        <main className="pt-8 space-y-8">
          {/* Enhanced Drag & Drop Zone */}
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
            <CardContent className="p-8 text-center space-y-6">
              <div className="inline-flex items-center justify-center p-6 bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-full border border-secondary/20 group-hover:border-secondary/40 transition-all">
                {uploading ? (
                  <Loader2 className="h-12 w-12 text-secondary animate-spin" />
                ) : isDragActive ? (
                  <Upload className="h-12 w-12 text-primary animate-pulse" />
                ) : (
                  <Upload className="h-12 w-12 text-secondary" />
                )}
              </div>
              <div>
                {uploading ? (
                  <>
                    <h3 className="text-2xl font-semibold text-foreground mb-2">Processing Upload...</h3>
                    <p className="text-muted-foreground">Please wait while we upload your files in parallel</p>
                  </>
                ) : isDragActive ? (
                  <>
                    <h3 className="text-2xl font-semibold text-primary mb-2">Drop Files Here</h3>
                    <p className="text-muted-foreground">Release to start parallel uploading</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-2xl font-semibold text-foreground group-hover:text-secondary transition-colors mb-2">
                      Drag & Drop Media Files
                    </h3>
                    <p className="text-muted-foreground mb-4">Upload multiple files simultaneously with our parallel processing system</p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Supports: Images, Audio, Video, PDFs, Documents</p>
                      <p>• Multiple files uploaded in parallel for maximum speed</p>
                      <p>• Drag entire folders to preserve structure</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-border/30 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                Browse Media Collection
              </CardTitle>
              <CardDescription>Filter by type or search by filename/category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between mb-6">
              <Tabs value={activeKind} onValueChange={(v) => setActiveKind(v as any)}>
                <TabsList className="bg-gradient-to-r from-muted/80 to-muted/60 backdrop-blur-md border border-border/30">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="image">Images</TabsTrigger>
                  <TabsTrigger value="audio">Audio</TabsTrigger>
                  <TabsTrigger value="video">Video</TabsTrigger>
                  <TabsTrigger value="pdf">PDF</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="other">Other</TabsTrigger>
                </TabsList>
              </Tabs>
              <Input 
                placeholder="Search media files..." 
                value={query} 
                onChange={(e) => setQuery(e.target.value)} 
                className="md:max-w-sm bg-background/80 border-border/50" 
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 space-y-4">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                  <p className="text-muted-foreground">Loading media collection...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 border border-border/30 rounded-lg bg-gradient-to-br from-background/90 to-background/50 backdrop-blur-md max-h-[70vh] overflow-y-auto">
                  {/* Breadcrumb Navigation */}
                  {navigationPath.length > 1 && (
                    <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/30 p-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newPath = navigationPath.slice(0, -1);
                            setNavigationPath(newPath);
                            setCurrentFolder(newPath[newPath.length - 1]);
                          }}
                          className="p-1 h-6 w-6"
                        >
                          <ArrowLeft className="h-3 w-3" />
                        </Button>
                        <span className="truncate">
                          {navigationPath.slice(1).join(' / ') || 'Root'}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Vertical Folder Tree */}
                  {renderFolderTree()}
                </div>
                <div className="lg:col-span-2 border border-border/30 rounded-lg bg-gradient-to-br from-background/90 to-background/50 backdrop-blur-md min-h-[50vh] p-6">
                  {!selectedItem ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center space-y-4">
                        <div className="p-4 bg-muted/20 rounded-full inline-flex">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">Select an item from the list to preview</p>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const kind = MIME_TO_KIND(selectedItem.mime_type, selectedItem.file_type);
                      const isPdf = (selectedItem.mime_type || '').toLowerCase().includes('pdf');
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/20">
                            <div className="font-semibold text-lg truncate" title={selectedItem.original_filename || selectedItem.title || ''}>
                              {selectedItem.original_filename || selectedItem.title}
                            </div>
                            {selectedItem.file_url && (
                              <Button variant="outline" asChild className="gap-2">
                                <a href={selectedItem.file_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                  Open
                                </a>
                              </Button>
                            )}
                          </div>
                          <div className="w-full">
                            {kind === 'image' && selectedItem.file_url ? (
                              <img src={selectedItem.file_url} alt={selectedItem.title || 'media'} className="w-full max-h-[70vh] object-contain rounded-lg shadow-lg" />
                            ) : kind === 'audio' && selectedItem.file_url ? (
                              <div className="space-y-4">
                                <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                                  <Music className="h-8 w-8 text-primary mb-2" />
                                  <p className="text-sm text-muted-foreground">Audio file ready to play</p>
                                </div>
                                <audio controls className="w-full">
                                  <source src={selectedItem.file_url} />
                                  Your browser does not support the audio element.
                                </audio>
                              </div>
                            ) : kind === 'video' && selectedItem.file_url ? (
                              <video controls className="w-full max-h-[70vh] rounded-lg shadow-lg">
                                <source src={selectedItem.file_url} />
                                Your browser does not support the video tag.
                              </video>
                            ) : (kind === 'pdf' || isPdf) && selectedItem.file_url ? (
                              <div className="w-full">
                                <PdfDocument 
                                  file={selectedItem.file_url} 
                                  loading={<div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" /><p className="text-muted-foreground">Loading PDF...</p></div>}
                                  error={
                                    <div className="text-center p-8 space-y-4 bg-muted/20 rounded-lg">
                                      <div className="text-destructive">Failed to load PDF preview</div>
                                      <Button variant="outline" asChild>
                                        <a href={selectedItem.file_url} target="_blank" rel="noopener noreferrer" className="gap-2">
                                          <ExternalLink className="h-4 w-4" />
                                          Open PDF in new tab
                                        </a>
                                      </Button>
                                    </div>
                                  }
                                  onLoadError={(error) => {
                                    console.error('PDF load error:', error);
                                  }}
                                >
                                  <PdfPage 
                                    pageNumber={1} 
                                    width={Math.min(800, window.innerWidth - 100)}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                  />
                                </PdfDocument>
                              </div>
                            ) : selectedItem.file_url ? (
                              <div className="text-center py-8 space-y-4 bg-muted/20 rounded-lg">
                                <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                                <p className="text-muted-foreground">Preview not available for this file type</p>
                                <Button variant="outline" asChild>
                                  <a href={selectedItem.file_url} target="_blank" rel="noopener noreferrer" className="gap-2">
                                    <ExternalLink className="h-4 w-4" />
                                    Open or Download
                                  </a>
                                </Button>
                              </div>
                            ) : (
                              <div className="text-center py-8 bg-muted/20 rounded-lg">
                                <p className="text-muted-foreground">No file URL available</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </main>

        {/* Bulk Upload Dialog */}
        <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Album className="h-5 w-5" />
                Bulk Media Upload
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto">
              <div className="space-y-6 p-4">
                <div 
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
                    ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                  `}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium mb-2">
                      {isDragActive ? 'Drop files here' : 'Drag & drop files for bulk upload'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse • Multiple files supported • Parallel processing
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setShowBulkUpload(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MediaLibrary;