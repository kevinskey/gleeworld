import { useState, useCallback, useEffect } from "react";
import { FastPDFViewer } from "@/components/FastPDFViewer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText, Download, Upload, Trash2, Plus, Loader2, Eye, X,
  Search, FileImage, FileSpreadsheet, File, FileScan, CheckCircle2,
  FolderOpen, Image as ImageIcon, Folder, FolderPlus, ChevronRight, ArrowLeft
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";

interface MediaDoc {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
  file_size: number;
  file_path: string;
  uploaded_by: string | null;
  created_at: string;
  tags: string[] | null;
  description: string | null;
  category: string;
}

interface MediaFolder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  icon: string | null;
  color: string | null;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (type: string) => {
  if (type.includes('pdf')) return <FileText className="h-5 w-5" />;
  if (type.includes('image')) return <ImageIcon className="h-5 w-5" />;
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) return <FileSpreadsheet className="h-5 w-5" />;
  if (type.includes('scan')) return <FileScan className="h-5 w-5" />;
  return <File className="h-5 w-5" />;
};

const getFileExtBadge = (type: string, name: string) => {
  const ext = name.split('.').pop()?.toUpperCase() || type.split('/').pop()?.toUpperCase() || 'FILE';
  return ext;
};

const ACCEPTED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.tiff', '.bmp', '.heic'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/csv': ['.csv'],
  'text/plain': ['.txt'],
};

export const TourDocumentsSection = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ name: string; done: boolean }[]>([]);
  const [rootFolderId, setRootFolderId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);

  // Find the root "Tour Documents" folder
  useEffect(() => {
    const findFolder = async () => {
      const { data } = await supabase
        .from('gw_media_folders')
        .select('id')
        .eq('name', 'Tour Documents')
        .limit(1)
        .single();
      if (data) {
        setRootFolderId(data.id);
        setCurrentFolderId(data.id);
        setFolderPath([{ id: data.id, name: 'Tour Documents' }]);
      }
    };
    findFolder();
  }, []);

  // Fetch subfolders of current folder
  const { data: subfolders = [] } = useQuery({
    queryKey: ['tour-doc-subfolders', currentFolderId],
    queryFn: async () => {
      if (!currentFolderId) return [];
      const { data, error } = await supabase
        .from('gw_media_folders')
        .select('id, name, parent_id, created_at, icon, color')
        .eq('parent_id', currentFolderId)
        .order('name');
      if (error) throw error;
      return (data || []) as MediaFolder[];
    },
    enabled: !!currentFolderId,
  });

  // Fetch documents in current folder
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['tour-documents-media', currentFolderId],
    queryFn: async () => {
      if (!currentFolderId) return [];
      const { data, error } = await supabase
        .from('gw_media_library')
        .select('id, title, file_url, file_type, file_size, file_path, uploaded_by, created_at, tags, description, category')
        .eq('folder_id', currentFolderId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as MediaDoc[];
    },
    enabled: !!currentFolderId,
  });

  // Count docs in a subfolder
  const { data: folderCounts = {} } = useQuery({
    queryKey: ['tour-doc-folder-counts', subfolders.map(f => f.id).join(',')],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const folder of subfolders) {
        const { count } = await supabase
          .from('gw_media_library')
          .select('*', { count: 'exact', head: true })
          .eq('folder_id', folder.id)
          .eq('is_deleted', false);
        counts[folder.id] = count || 0;
      }
      return counts;
    },
    enabled: subfolders.length > 0,
  });

  // Create subfolder
  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('gw_media_folders')
        .insert({
          name,
          parent_id: currentFolderId,
          created_by: user?.id || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-doc-subfolders'] });
      toast.success('Folder created');
      setShowNewFolderDialog(false);
      setNewFolderName('');
    },
    onError: () => toast.error('Failed to create folder'),
  });

  // Delete folder (only if empty)
  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      // Check for docs
      const { count: docCount } = await supabase
        .from('gw_media_library')
        .select('*', { count: 'exact', head: true })
        .eq('folder_id', folderId)
        .eq('is_deleted', false);
      if (docCount && docCount > 0) throw new Error('Folder is not empty');
      // Check for subfolders
      const { count: subCount } = await supabase
        .from('gw_media_folders')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', folderId);
      if (subCount && subCount > 0) throw new Error('Folder has subfolders');

      const { error } = await supabase
        .from('gw_media_folders')
        .delete()
        .eq('id', folderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-doc-subfolders'] });
      toast.success('Folder deleted');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete folder'),
  });

  // Navigate into a folder
  const navigateToFolder = (folder: MediaFolder) => {
    setCurrentFolderId(folder.id);
    setFolderPath(prev => [...prev, { id: folder.id, name: folder.name }]);
    setSearchQuery('');
  };

  // Navigate via breadcrumb
  const navigateToBreadcrumb = (index: number) => {
    const target = folderPath[index];
    setCurrentFolderId(target.id);
    setFolderPath(prev => prev.slice(0, index + 1));
    setSearchQuery('');
  };

  // Delete mutation for docs
  const deleteMutation = useMutation({
    mutationFn: async (doc: MediaDoc) => {
      const { error } = await supabase
        .from('gw_media_library')
        .update({ is_deleted: true })
        .eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tour-documents-media'] });
      toast.success('Document removed');
    },
    onError: () => toast.error('Failed to delete document'),
  });

  // Upload handler
  const handleUpload = useCallback(async (files: File[]) => {
    if (!currentFolderId || !user?.id) {
      toast.error('Unable to upload — folder not ready');
      return;
    }
    setUploading(true);
    setUploadProgress(files.map(f => ({ name: f.name, done: false })));

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `tour-documents/${Date.now()}-${safeName}`;

        const { error: uploadErr } = await supabase.storage
          .from('media-library')
          .upload(storagePath, file);
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from('media-library')
          .getPublicUrl(storagePath);

        let category = 'document';
        if (file.type.startsWith('image/')) category = 'image';

        const { error: insertErr } = await supabase
          .from('gw_media_library')
          .insert({
            title: file.name,
            file_url: urlData.publicUrl,
            file_type: file.type,
            file_size: file.size,
            file_path: storagePath,
            folder_id: currentFolderId,
            uploaded_by: user.id,
            category,
            is_public: false,
            tags: ['tour-document'],
          });
        if (insertErr) throw insertErr;

        setUploadProgress(prev => prev.map((p, idx) => idx === i ? { ...p, done: true } : p));
      } catch (err: any) {
        console.error('Upload error for', file.name, err);
        toast.error(`Failed to upload: ${file.name}`);
      }
    }

    queryClient.invalidateQueries({ queryKey: ['tour-documents-media'] });
    toast.success(`${files.length} document${files.length > 1 ? 's' : ''} uploaded`);
    setUploading(false);
    setUploadProgress([]);
  }, [currentFolderId, user?.id, queryClient]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) handleUpload(acceptedFiles);
  }, [handleUpload]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 100 * 1024 * 1024,
    noClick: true,
    noKeyboard: true,
  });

  const handleDownload = (doc: MediaDoc) => {
    const a = document.createElement('a');
    a.href = doc.file_url;
    a.download = doc.title;
    a.target = '_blank';
    a.click();
  };

  const handlePreview = (doc: MediaDoc) => {
    if (doc.file_type.includes('pdf') || doc.file_type.startsWith('image/')) {
      setPreviewUrl(doc.file_url);
      setPreviewTitle(doc.title);
    } else {
      handleDownload(doc);
    }
  };

  const filtered = documents.filter(d =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isRoot = currentFolderId === rootFolderId;

  return (
    <div {...getRootProps()} className="space-y-4 relative min-h-[400px]">
      <input {...getInputProps()} />

      {/* Drag overlay */}
      {isDragActive && (
        <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <Upload className="h-12 w-12 text-primary mx-auto mb-2" />
            <p className="text-lg font-semibold text-primary">Drop files to upload</p>
            <p className="text-sm text-muted-foreground">PDFs, images, Word docs, spreadsheets, scans</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Tour Documents</h2>
          <p className="text-sm text-muted-foreground">
            Signed contracts, deposit checks, receipts, scans & more
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search docs..."
              className="pl-8 h-8 w-48 text-sm bg-card border-border"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowNewFolderDialog(true)}>
            <FolderPlus className="h-4 w-4 mr-1.5" />
            New Folder
          </Button>
          <Button size="sm" onClick={open} disabled={uploading}>
            <Plus className="h-4 w-4 mr-1.5" />
            Upload
          </Button>
        </div>
      </div>

      {/* Breadcrumb navigation */}
      {folderPath.length > 1 && (
        <div className="flex items-center gap-1 text-sm flex-wrap">
          {folderPath.map((crumb, idx) => (
            <div key={crumb.id} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              <button
                onClick={() => navigateToBreadcrumb(idx)}
                className={cn(
                  "px-1.5 py-0.5 rounded hover:bg-muted transition-colors",
                  idx === folderPath.length - 1
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {idx === 0 ? <Folder className="h-3.5 w-3.5 inline mr-1" /> : null}
                {crumb.name}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Back button when inside subfolder */}
      {!isRoot && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => navigateToBreadcrumb(folderPath.length - 2)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      )}

      {/* Upload progress */}
      {uploadProgress.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 px-4">
            <p className="text-xs font-medium text-primary mb-2">
              Uploading {uploadProgress.filter(p => p.done).length}/{uploadProgress.length}...
            </p>
            <div className="space-y-1">
              {uploadProgress.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {p.done ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  )}
                  <span className={cn("truncate", p.done && "text-muted-foreground")}>{p.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subfolders */}
      {subfolders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {subfolders.map(folder => (
            <Card
              key={folder.id}
              className="cursor-pointer hover:bg-muted/40 transition-colors group"
              onClick={() => navigateToFolder(folder)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/50 text-primary shrink-0">
                  <Folder className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{folder.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {folderCounts[folder.id] ?? '...'} files
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive/70 hover:text-destructive shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFolderMutation.mutate(folder.id);
                  }}
                  disabled={deleteFolderMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Documents list */}
      {isLoading ? (
        <Card className="p-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
          <p className="text-muted-foreground mt-2">Loading documents...</p>
        </Card>
      ) : filtered.length === 0 && subfolders.length === 0 ? (
        <Card
          className="border-dashed border-2 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={open}
        >
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              {searchQuery ? 'No documents match your search' : 'No documents in this folder'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Drag & drop files here, click to browse, or create a subfolder
            </p>
          </CardContent>
        </Card>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>{filtered.length} document{filtered.length !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1">
              <Upload className="h-3 w-3" />
              Drag files anywhere to upload
            </span>
          </div>
          {filtered.map(doc => (
            <Card
              key={doc.id}
              className="overflow-hidden hover:bg-muted/30 transition-colors cursor-pointer group"
              onClick={() => handlePreview(doc)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    {getFileIcon(doc.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium truncate text-foreground">{doc.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {getFileExtBadge(doc.file_type, doc.title)}
                      </Badge>
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>•</span>
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => e.stopPropagation()}
                  >
                    {doc.file_type.includes('pdf') && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePreview(doc)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(doc)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteMutation.mutate(doc)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Add a subfolder inside "{folderPath[folderPath.length - 1]?.name || 'Tour Documents'}"
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newFolderName.trim()) {
                createFolderMutation.mutate(newFolderName.trim());
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createFolderMutation.mutate(newFolderName.trim())}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
            >
              {createFolderMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF/Image Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-background border-b border-border">
            <h3 className="text-sm font-semibold truncate text-foreground">{previewTitle}</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => window.open(previewUrl, '_blank')}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Download
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setPreviewUrl(null); setPreviewTitle(''); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {previewUrl.match(/\.(png|jpg|jpeg|gif|webp|bmp|tiff)(\?|$)/i) ? (
              <div className="flex items-center justify-center h-full p-4">
                <img src={previewUrl} alt={previewTitle} className="max-w-full max-h-full object-contain rounded-lg" />
              </div>
            ) : (
              <FastPDFViewer
                pdfUrl={previewUrl}
                className="w-full h-full min-h-[80vh]"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
