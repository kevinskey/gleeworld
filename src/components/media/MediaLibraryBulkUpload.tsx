import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Music, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UploadFile {
  file: File;
  id: string;
  title: string;
  description: string;
  album?: string;
  artist?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  url?: string;
}

interface MediaLibraryBulkUploadProps {
  onUploadComplete: () => void;
  onClose: () => void;
}

export const MediaLibraryBulkUpload: React.FC<MediaLibraryBulkUploadProps> = ({
  onUploadComplete,
  onClose,
}) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [albumName, setAlbumName] = useState('');
  const [artistName, setArtistName] = useState('');
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      description: '',
      album: albumName,
      artist: artistName,
      status: 'pending' as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, [albumName, artistName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/mp4': ['.m4a'],
      'audio/aac': ['.aac'],
      'audio/ogg': ['.ogg'],
      'audio/flac': ['.flac'],
    },
    multiple: true,
  });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFile = (id: string, updates: Partial<UploadFile>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

const uploadFile = async (uploadFile: UploadFile): Promise<void> => {
    const { file, title, description, album, artist } = uploadFile;
    
    try {
      updateFile(uploadFile.id, { status: 'uploading', progress: 10 });

      // Get current user ID
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `media/audio/${fileName}`;

      updateFile(uploadFile.id, { progress: 30 });

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('media-library')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      updateFile(uploadFile.id, { progress: 60 });

      // Get public URL
      const { data } = supabase.storage
        .from('media-library')
        .getPublicUrl(filePath);

      updateFile(uploadFile.id, { progress: 80 });

      // Save to database
      const { error: dbError } = await supabase
        .from('gw_media_library')
        .insert({
          title,
          description: description || `${artist ? `${artist} - ` : ''}${title}${album ? ` (${album})` : ''}`,
          file_url: data.publicUrl,
          file_path: filePath,
          file_type: 'audio',
          file_size: file.size,
          category: 'music',
          tags: [
            ...(album ? [album] : []),
            ...(artist ? [artist] : []),
            'mp3',
            'music'
          ].filter(Boolean),
          uploaded_by: userId,
          is_public: true,
          is_featured: false
        });

      if (dbError) throw dbError;

      updateFile(uploadFile.id, { 
        status: 'success', 
        progress: 100,
        url: data.publicUrl
      });

    } catch (error) {
      console.error(`Upload error for ${file.name}:`, error);
      updateFile(uploadFile.id, {
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  };

  const handleBulkUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    
    try {
      // Upload all files in parallel
      await Promise.allSettled(files.map(uploadFile));
      
      const successCount = files.filter(f => f.status === 'success').length;
      const errorCount = files.filter(f => f.status === 'error').length;
      
      if (successCount > 0) {
        toast({
          title: 'Upload Complete',
          description: `Successfully uploaded ${successCount} files${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        });
        
        onUploadComplete();
        
        // Auto-close if all successful
        if (errorCount === 0) {
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      } else {
        toast({
          title: 'Upload Failed',
          description: 'All uploads failed. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Upload Error',
        description: 'An unexpected error occurred during upload',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const pendingFiles = files.filter(f => f.status === 'pending');
  const uploadingFiles = files.filter(f => f.status === 'uploading');
  const successFiles = files.filter(f => f.status === 'success');
  const errorFiles = files.filter(f => f.status === 'error');
  const hasValidFiles = pendingFiles.every(f => f.title.trim());

  const updateAllWithAlbumInfo = () => {
    setFiles(prev => prev.map(f => ({
      ...f,
      album: albumName,
      artist: artistName
    })));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Album Info Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Album Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Album Name</label>
              <Input
                placeholder="Enter album name"
                value={albumName}
                onChange={(e) => setAlbumName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Artist</label>
              <Input
                placeholder="Enter artist name"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
              />
            </div>
          </div>
          {files.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={updateAllWithAlbumInfo}
              className="w-full"
            >
              Apply Album Info to All Files
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Upload Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
              ${isDragActive 
                ? 'border-primary bg-primary/5 scale-105' 
                : 'border-border hover:border-primary hover:bg-accent/50'
              }
              ${isUploading ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              {isDragActive ? (
                <Upload className="h-12 w-12 text-primary animate-pulse" />
              ) : (
                <Music className="h-12 w-12 text-muted-foreground" />
              )}
              <div>
                <p className="text-lg font-medium mb-2">
                  {isDragActive ? 'Drop MP3 files here' : 'Drag & drop MP3 files'}
                </p>
                <p className="text-sm text-muted-foreground">
                  or <span className="text-primary font-medium">browse files</span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Supports MP3, WAV, M4A, AAC, OGG, FLAC • Multiple files supported
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress Summary */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-muted-foreground">{pendingFiles.length}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{uploadingFiles.length}</div>
              <div className="text-sm text-muted-foreground">Uploading</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{successFiles.length}</div>
              <div className="text-sm text-muted-foreground">Success</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{errorFiles.length}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Files to Upload ({files.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {files.map((file) => (
              <div key={file.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {file.status === 'pending' && <Music className="h-5 w-5 text-muted-foreground" />}
                      {file.status === 'uploading' && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
                      {file.status === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
                      {file.status === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
                    </div>
                    <div>
                      <div className="font-medium">{file.file.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {(file.file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      file.status === 'success' ? 'default' :
                      file.status === 'error' ? 'destructive' :
                      file.status === 'uploading' ? 'secondary' : 'outline'
                    }>
                      {file.status}
                    </Badge>
                    {file.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {file.status === 'pending' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      placeholder="Track title"
                      value={file.title}
                      onChange={(e) => updateFile(file.id, { title: e.target.value })}
                    />
                    <Input
                      placeholder="Description (optional)"
                      value={file.description}
                      onChange={(e) => updateFile(file.id, { description: e.target.value })}
                    />
                  </div>
                )}

                {file.status === 'uploading' && (
                  <Progress value={file.progress} className="w-full" />
                )}

                {file.status === 'error' && (
                  <p className="text-sm text-red-600">{file.error}</p>
                )}

                {file.status === 'success' && (
                  <p className="text-sm text-green-600">✓ Upload successful!</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {files.length > 0 && (
        <div className="flex gap-3">
          <Button
            onClick={handleBulkUpload}
            disabled={isUploading || !hasValidFiles || pendingFiles.length === 0}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading {pendingFiles.length} files...
              </>
            ) : (
              `Upload ${pendingFiles.length} Files`
            )}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
};