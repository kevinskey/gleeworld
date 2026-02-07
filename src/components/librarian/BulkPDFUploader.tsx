import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderUp,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { uploadFileAndGetUrl } from '@/utils/storage';

interface BulkPDFItem {
  id: string;
  file: File;
  title: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

export const BulkPDFUploader = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<BulkPDFItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const cleanTitle = (filename: string): string => {
    return filename
      .replace(/\.pdf$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const addFiles = useCallback((files: FileList | File[]) => {
    const pdfFiles = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfFiles.length === 0) {
      toast({
        title: 'No PDFs found',
        description: 'Please select PDF files only.',
        variant: 'destructive',
      });
      return;
    }

    const newItems: BulkPDFItem[] = pdfFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      file,
      title: cleanTitle(file.name),
      status: 'pending',
    }));

    setItems((prev) => [...prev, ...newItems]);
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  };

  const updateTitle = (id: string, title: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title } : item))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCompleted = () => {
    setItems((prev) => prev.filter((item) => item.status !== 'success'));
  };

  const clearAll = () => {
    if (!uploading) setItems([]);
  };

  const handleBulkUpload = async () => {
    const pendingItems = items.filter((item) => item.status === 'pending');
    if (pendingItems.length === 0) {
      toast({ title: 'Nothing to upload', description: 'Add some PDF files first.' });
      return;
    }

    setUploading(true);

    for (const item of pendingItems) {
      // Mark as uploading
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading' } : i))
      );

      try {
        // 1. Upload file to storage
        const uploadResult = await uploadFileAndGetUrl(item.file, 'sheet-music', 'pdfs');
        if (!uploadResult) throw new Error('Storage upload failed');

        // 2. Insert record into gw_sheet_music
        const { error } = await supabase.from('gw_sheet_music').insert({
          title: item.title.trim() || cleanTitle(item.file.name),
          pdf_url: uploadResult.url,
          is_public: true,
          created_by: user?.id,
        });

        if (error) throw error;

        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: 'success' } : i))
        );
      } catch (err: any) {
        console.error('Bulk upload error for', item.title, err);
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: 'error', errorMessage: err.message || 'Upload failed' }
              : i
          )
        );
      }
    }

    setUploading(false);

    const updatedItems = items;
    const successCount = updatedItems.filter((i) => i.status === 'success').length + pendingItems.length;
    toast({
      title: 'Bulk Upload Complete',
      description: `Uploaded ${pendingItems.length} PDF(s) to the music library.`,
    });
  };

  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const successCount = items.filter((i) => i.status === 'success').length;
  const errorCount = items.filter((i) => i.status === 'error').length;
  const uploadingCount = items.filter((i) => i.status === 'uploading').length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? ((successCount + errorCount) / totalCount) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderUp className="h-5 w-5" />
          Bulk PDF Upload
        </CardTitle>
        <CardDescription>
          Drop multiple PDFs at once. Edit titles before uploading to the music library.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('bulk-pdf-input')?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">
            Drag & drop PDF files here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Select multiple files at once — PDF only
          </p>
          <input
            id="bulk-pdf-input"
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* File List */}
        {items.length > 0 && (
          <>
            {/* Summary Bar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{totalCount} file{totalCount !== 1 ? 's' : ''}</Badge>
                {pendingCount > 0 && (
                  <Badge variant="secondary">{pendingCount} pending</Badge>
                )}
                {successCount > 0 && (
                  <Badge className="bg-green-600 text-white">{successCount} uploaded</Badge>
                )}
                {errorCount > 0 && (
                  <Badge variant="destructive">{errorCount} failed</Badge>
                )}
              </div>
              <div className="flex gap-2">
                {successCount > 0 && (
                  <Button size="sm" variant="ghost" onClick={clearCompleted}>
                    Clear completed
                  </Button>
                )}
                {!uploading && (
                  <Button size="sm" variant="ghost" onClick={clearAll} className="text-destructive">
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear all
                  </Button>
                )}
              </div>
            </div>

            {/* Progress */}
            {uploading && (
              <Progress value={progress} className="h-2" />
            )}

            {/* Scrollable list of files */}
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2 pr-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      item.status === 'success'
                        ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                        : item.status === 'error'
                        ? 'bg-destructive/5 border-destructive/30'
                        : item.status === 'uploading'
                        ? 'bg-primary/5 border-primary/30'
                        : 'bg-card border-border'
                    }`}
                  >
                    {/* Status Icon */}
                    <div className="shrink-0">
                      {item.status === 'success' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : item.status === 'error' ? (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      ) : item.status === 'uploading' ? (
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Title input + filename */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {item.status === 'pending' ? (
                        <Input
                          value={item.title}
                          onChange={(e) => updateTitle(item.id, e.target.value)}
                          placeholder="Enter title..."
                          className="h-8 text-sm"
                        />
                      ) : (
                        <p className="text-sm font-medium truncate">{item.title}</p>
                      )}
                      <p className="text-xs text-muted-foreground truncate">
                        {item.file.name} — {(item.file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                      {item.status === 'error' && item.errorMessage && (
                        <p className="text-xs text-destructive">{item.errorMessage}</p>
                      )}
                    </div>

                    {/* Remove button */}
                    {(item.status === 'pending' || item.status === 'error') && !uploading && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem(item.id)}
                        className="shrink-0 h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Upload Button */}
            {pendingCount > 0 && (
              <Button
                onClick={handleBulkUpload}
                disabled={uploading}
                className="w-full"
                size="lg"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading {uploadingCount > 0 ? `(${successCount + errorCount + 1}/${totalCount})` : '...'}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {pendingCount} PDF{pendingCount !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
