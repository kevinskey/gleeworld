import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, X, Music, FileAudio, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  trackId?: string;
}

interface BulkUploadDialogProps {
  onUploadComplete?: () => void;
}

export const BulkUploadDialog = ({ onUploadComplete }: BulkUploadDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const MAX_FILE_SIZE = 150 * 1024 * 1024; // 150MB

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const audioFiles = acceptedFiles.filter(file => 
      file.type.startsWith('audio/') || 
      file.name.toLowerCase().endsWith('.mp3') ||
      file.name.toLowerCase().endsWith('.wav') ||
      file.name.toLowerCase().endsWith('.m4a') ||
      file.name.toLowerCase().endsWith('.aac')
    );

    // Filter by size
    const validFiles = audioFiles.filter(file => file.size <= MAX_FILE_SIZE);
    const oversizedFiles = audioFiles.filter(file => file.size > MAX_FILE_SIZE);

    if (audioFiles.length !== acceptedFiles.length) {
      toast({
        title: "Some files skipped",
        description: "Only audio files are supported",
        variant: "destructive"
      });
    }

    if (oversizedFiles.length > 0) {
      toast({
        title: `${oversizedFiles.length} file(s) too large`,
        description: "Maximum file size is 150MB",
        variant: "destructive"
      });
    }

    const newUploadFiles: UploadFile[] = validFiles.map((file, index) => ({
      file,
      id: `${Date.now()}-${index}`,
      status: 'pending',
      progress: 0
    }));

    setUploadFiles(prev => [...prev, ...newUploadFiles]);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']
    },
    multiple: true
  });

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const extractMetadataFromFilename = (filename: string) => {
    // Remove file extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    
    // Try to extract artist and title from common patterns
    // Pattern 1: "Artist - Title"
    if (nameWithoutExt.includes(' - ')) {
      const [artist, ...titleParts] = nameWithoutExt.split(' - ');
      return {
        title: titleParts.join(' - ').trim(),
        artist: artist.trim()
      };
    }
    
    // Pattern 2: "Title by Artist"
    if (nameWithoutExt.toLowerCase().includes(' by ')) {
      const parts = nameWithoutExt.split(/ by /i);
      return {
        title: parts[0].trim(),
        artist: parts[1] ? parts[1].trim() : 'Unknown Artist'
      };
    }
    
    // Default: use filename as title
    return {
      title: nameWithoutExt.trim(),
      artist: 'Spelman College Glee Club'
    };
  };

  const uploadFile = async (uploadFile: UploadFile): Promise<void> => {
    const { file } = uploadFile;
    
    try {
      // Update status to uploading
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `radio-upload-${timestamp}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(`audio-tracks/${fileName}`, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Update progress
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, progress: 50, status: 'processing' } : f
      ));

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-files')
        .getPublicUrl(`audio-tracks/${fileName}`);

      // Extract metadata from filename
      const { title, artist } = extractMetadataFromFilename(file.name);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Insert track into database
      const { data: trackData, error: dbError } = await supabase
        .from('music_tracks')
        .insert({
          title,
          artist,
          audio_url: publicUrl,
          duration: 180, // Default duration, could be calculated from audio
          created_by: user?.id,
          play_count: 0
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Update status to completed
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { 
          ...f, 
          status: 'completed', 
          progress: 100,
          trackId: trackData.id 
        } : f
      ));

    } catch (error) {
      console.error('Upload error:', error);
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { 
          ...f, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed'
        } : f
      ));
    }
  };

  const startBulkUpload = async () => {
    setIsUploading(true);
    
    try {
      // Upload files in batches of 3 to avoid overwhelming the server
      const batchSize = 3;
      const pendingFiles = uploadFiles.filter(f => f.status === 'pending');
      
      for (let i = 0; i < pendingFiles.length; i += batchSize) {
        const batch = pendingFiles.slice(i, i + batchSize);
        await Promise.all(batch.map(uploadFile));
      }

      const completedCount = uploadFiles.filter(f => f.status === 'completed').length;
      const errorCount = uploadFiles.filter(f => f.status === 'error').length;

      toast({
        title: "Bulk Upload Complete",
        description: `${completedCount} files uploaded successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      });

      onUploadComplete?.();
      
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'uploading':
      case 'processing':
        return <Music className="h-4 w-4 text-primary animate-pulse" />;
      default:
        return <FileAudio className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'error':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'uploading':
      case 'processing':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-muted border-border';
    }
  };

  const pendingCount = uploadFiles.filter(f => f.status === 'pending').length;
  const completedCount = uploadFiles.filter(f => f.status === 'completed').length;
  const errorCount = uploadFiles.filter(f => f.status === 'error').length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Upload Audio Files
          </DialogTitle>
          <DialogDescription>
            Upload multiple audio files to your radio library. Supported formats: MP3, WAV, M4A, AAC, OGG, FLAC
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 flex-1 overflow-hidden">
          {/* Upload Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop audio files here' : 'Drag & drop audio files here'}
              </p>
              <p className="text-sm text-muted-foreground">
                Supports MP3, WAV, M4A, AAC, OGG, FLAC • Multiple files supported
              </p>
              <Button variant="outline" size="sm" className="mt-2">
                Browse Files
              </Button>
            </div>
          </div>

          {/* File List */}
          {uploadFiles.length > 0 && (
            <div className="space-y-4 flex-1 overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Upload Queue ({uploadFiles.length} files)</h3>
                <div className="flex gap-2">
                  {completedCount > 0 && (
                    <Badge variant="outline" className="text-green-600">
                      {completedCount} completed
                    </Badge>
                  )}
                  {errorCount > 0 && (
                    <Badge variant="outline" className="text-destructive">
                      {errorCount} failed
                    </Badge>
                  )}
                  {pendingCount > 0 && (
                    <Badge variant="outline">
                      {pendingCount} pending
                    </Badge>
                  )}
                </div>
              </div>

              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {uploadFiles.map((uploadFile) => (
                    <div
                      key={uploadFile.id}
                      className={`p-4 rounded-lg border ${getStatusColor(uploadFile.status)}`}
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(uploadFile.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">{uploadFile.file.name}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {uploadFile.status}
                              </Badge>
                              {uploadFile.status === 'pending' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFile(uploadFile.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          {uploadFile.error && (
                            <p className="text-sm text-destructive mt-1">{uploadFile.error}</p>
                          )}
                          {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                            <Progress value={uploadFile.progress} className="mt-2" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => setUploadFiles([])}>
            Clear All
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            <Button
              onClick={startBulkUpload}
              disabled={pendingCount === 0 || isUploading}
              className="gap-2"
            >
              {isUploading ? (
                <>
                  <Upload className="h-4 w-4 animate-pulse" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload {pendingCount} Files
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};