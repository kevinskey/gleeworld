import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

interface UploadFile {
  file: File;
  title: string;
  description: string;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface AudioBulkUploadProps {
  category: string;
  onUploadComplete: () => void;
}

export const AudioBulkUpload: React.FC<AudioBulkUploadProps> = ({
  category,
  onUploadComplete,
}) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
      description: '',
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending' as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.mp4', '.wav', '.m4a', '.ogg'],
      'video/mp4': ['.mp4'],
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

  const uploadFile = async (uploadFile: UploadFile) => {
    const { file, title, description } = uploadFile;
    
    try {
      updateFile(uploadFile.id, { status: 'uploading', progress: 0 });

      // Upload to storage
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${category}/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('mus240-audio')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      updateFile(uploadFile.id, { progress: 50 });

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('mus240_audio_resources')
        .insert({
          title,
          description,
          file_path: uploadData.path,
          file_size: file.size,
          category,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (dbError) throw dbError;

      updateFile(uploadFile.id, { status: 'success', progress: 100 });
    } catch (error) {
      console.error('Upload error:', error);
      updateFile(uploadFile.id, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  };

  const handleBulkUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    
    try {
      await Promise.all(files.map(uploadFile));
      
      toast({
        title: 'Upload Complete',
        description: `Successfully uploaded ${files.filter(f => f.status === 'success').length} files`,
      });
      
      onUploadComplete();
      setFiles([]);
    } catch (error) {
      toast({
        title: 'Upload Error',
        description: 'Some files failed to upload',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const pendingFiles = files.filter(f => f.status === 'pending');
  const hasValidFiles = pendingFiles.every(f => f.title.trim());

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-gray-300 hover:border-primary hover:bg-gray-50'
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              {isDragActive ? 'Drop files here' : 'Drag and drop audio files'}
            </p>
            <p className="text-sm text-gray-500">
              or <span className="text-primary font-medium">browse files</span>
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supports MP3, MP4, WAV, M4A, OGG files
            </p>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Files to Upload ({files.length})</h3>
          
          <div className="space-y-3">
            {files.map((file) => (
              <Card key={file.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {file.status === 'pending' && <File className="h-5 w-5 text-gray-400" />}
                    {file.status === 'uploading' && (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    )}
                    {file.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                    {file.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{file.file.name}</span>
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

                    {file.status === 'pending' && (
                      <>
                        <Input
                          placeholder="Title for this audio"
                          value={file.title}
                          onChange={(e) => updateFile(file.id, { title: e.target.value })}
                        />
                        <Textarea
                          placeholder="Description (optional)"
                          value={file.description}
                          onChange={(e) => updateFile(file.id, { description: e.target.value })}
                          rows={2}
                        />
                      </>
                    )}

                    {file.status === 'uploading' && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}

                    {file.status === 'error' && (
                      <p className="text-sm text-red-600">{file.error}</p>
                    )}

                    {file.status === 'success' && (
                      <p className="text-sm text-green-600">Upload successful!</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {pendingFiles.length > 0 && (
            <Button
              onClick={handleBulkUpload}
              disabled={isUploading || !hasValidFiles}
              className="w-full"
            >
              {isUploading ? 'Uploading...' : `Upload ${pendingFiles.length} Files`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};