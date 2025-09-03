import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, Upload, File, Check, AlertCircle } from 'lucide-react';
import { useFileUpload, type UploadProgress } from '@/integrations/supabase/hooks/useFileUpload';
import { useCreateMus240Resource } from '@/integrations/supabase/hooks/useMus240Resources';
import { toast } from 'sonner';

interface MultiFileUploadProps {
  onUploadComplete: () => void;
  defaultCategory?: string;
}

export function MultiFileUpload({ onUploadComplete, defaultCategory = 'reading' }: MultiFileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadMultipleFiles, uploading } = useFileUpload();
  const createMutation = useCreateMus240Resource();

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        // Audio file types
        'audio/mp4',
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'video/mp4', // MP4 can be audio
        'audio/x-m4a'
      ];
      
      const maxSize = 50 * 1024 * 1024; // 50MB for audio files, 10MB for documents
      
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name}: Invalid file type. Please upload PDF, DOC, TXT, PPT, XLS, or audio files (MP3, MP4, WAV, OGG).`);
        return false;
      }
      
      if (file.size > maxSize) {
        toast.error(`${file.name}: File too large. Maximum size is 50MB.`);
        return false;
      }
      
      return true;
    });
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, []);

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    try {
      const results = await uploadMultipleFiles(
        selectedFiles,
        'mus240-resources',
        setUploadProgress
      );

      // Create resources for successfully uploaded files
      const successfulUploads = results.filter(r => r.status === 'completed' && r.url);
      
      for (const upload of successfulUploads) {
        // Extract the actual filename from the URL since edge function generates unique names
        const urlParts = upload.url!.split('/');
        const actualFileName = urlParts[urlParts.length - 1];
        
        await createMutation.mutateAsync({
          title: upload.file.name.replace(/\.[^/.]+$/, ''),
          url: upload.url!,
          description: `Uploaded file: ${upload.file.name}`,
          category: upload.file.type.startsWith('audio/') || upload.file.type === 'video/mp4' ? 'audio' : defaultCategory as any,
          is_active: true,
          display_order: 0,
          file_path: actualFileName, // Use the actual filename from storage
          file_name: upload.file.name, // Keep original name for display
          file_size: upload.file.size,
          mime_type: upload.file.type,
          is_file_upload: true,
        });
      }

      if (successfulUploads.length > 0) {
        toast.success(`Successfully created ${successfulUploads.length} resource${successfulUploads.length > 1 ? 's' : ''}`);
        setSelectedFiles([]);
        setUploadProgress([]);
        onUploadComplete();
      }
    } catch (error) {
      console.error('Error creating resources:', error);
      toast.error('Failed to create resources');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.mp3,.mp4,.wav,.ogg,.m4a"
        />
        
        <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Drop files here or click to upload</h3>
        <p className="text-muted-foreground mb-4">
          Upload multiple PDF, DOC, TXT, PPT, XLS files up to 50MB each<br />
          <strong>Audio files supported:</strong> MP3, MP4, WAV, OGG, M4A
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          Select Files
        </Button>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Selected Files ({selectedFiles.length})</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center gap-3 p-3 border rounded-lg">
                <File className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Upload Progress</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {uploadProgress.map((progress, index) => (
              <div key={`progress-${index}`} className="space-y-2 p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {progress.status === 'completed' && <Check className="h-4 w-4 text-green-500" />}
                  {progress.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                  {progress.status === 'uploading' && <Upload className="h-4 w-4 text-blue-500 animate-pulse" />}
                  {progress.status === 'pending' && <File className="h-4 w-4 text-muted-foreground" />}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{progress.file.name}</p>
                    {progress.error && <p className="text-xs text-red-500">{progress.error}</p>}
                  </div>
                </div>
                
                {progress.status === 'uploading' && (
                  <Progress value={progress.progress} className="h-2" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {selectedFiles.length > 0 && uploadProgress.length === 0 && (
        <Button
          onClick={uploadFiles}
          disabled={uploading || createMutation.isPending}
          className="w-full"
        >
          {uploading || createMutation.isPending 
            ? 'Uploading...' 
            : `Upload ${selectedFiles.length} File${selectedFiles.length > 1 ? 's' : ''}`
          }
        </Button>
      )}
    </div>
  );
}