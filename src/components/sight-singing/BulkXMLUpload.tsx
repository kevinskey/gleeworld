import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileMusic, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useSheetMusicLibrary } from '@/hooks/useSheetMusicLibrary';

interface UploadResult {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface BulkXMLUploadProps {
  onUploadComplete?: () => void;
}

export const BulkXMLUpload: React.FC<BulkXMLUploadProps> = ({ onUploadComplete }) => {
  const [uploadQueue, setUploadQueue] = useState<UploadResult[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { uploadXML } = useSheetMusicLibrary();
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const xmlFiles = acceptedFiles.filter(file => {
      const fileName = file.name.toLowerCase();
      return fileName.endsWith('.xml') || fileName.endsWith('.musicxml');
    });

    if (xmlFiles.length !== acceptedFiles.length) {
      toast({
        title: "Some files skipped",
        description: `${acceptedFiles.length - xmlFiles.length} non-XML files were skipped.`,
        variant: "destructive",
      });
    }

    const newUploads: UploadResult[] = xmlFiles.map(file => ({
      file,
      status: 'pending'
    }));

    setUploadQueue(prev => [...prev, ...newUploads]);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/xml': ['.xml', '.musicxml'],
      'application/xml': ['.xml', '.musicxml']
    },
    multiple: true
  });

  const removeFile = (index: number) => {
    setUploadQueue(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAll = async () => {
    if (uploadQueue.length === 0) return;

    setIsUploading(true);
    const results = [...uploadQueue];

    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'success') continue;

      try {
        // Update status to uploading
        results[i] = { ...results[i], status: 'uploading' };
        setUploadQueue([...results]);

        await uploadXML(results[i].file);
        
        // Update status to success
        results[i] = { ...results[i], status: 'success' };
        setUploadQueue([...results]);

      } catch (error) {
        // Update status to error
        results[i] = { 
          ...results[i], 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed'
        };
        setUploadQueue([...results]);
      }
    }

    setIsUploading(false);
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    if (successCount > 0) {
      toast({
        title: "Upload Complete",
        description: `${successCount} file(s) uploaded successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}.`,
      });
      
      if (onUploadComplete) {
        onUploadComplete();
      }
    }

    if (errorCount > 0 && successCount === 0) {
      toast({
        title: "Upload Failed",
        description: `All ${errorCount} files failed to upload.`,
        variant: "destructive",
      });
    }
  };

  const clearAll = () => {
    setUploadQueue([]);
  };

  const retryFailed = async () => {
    const failedFiles = uploadQueue.filter(result => result.status === 'error');
    if (failedFiles.length === 0) return;

    setIsUploading(true);
    const results = [...uploadQueue];

    for (let result of failedFiles) {
      const index = results.findIndex(r => r.file === result.file);
      if (index === -1) continue;

      try {
        results[index] = { ...results[index], status: 'uploading', error: undefined };
        setUploadQueue([...results]);

        await uploadXML(results[index].file);
        
        results[index] = { ...results[index], status: 'success' };
        setUploadQueue([...results]);

      } catch (error) {
        results[index] = { 
          ...results[index], 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed'
        };
        setUploadQueue([...results]);
      }
    }

    setIsUploading(false);
  };

  const pendingCount = uploadQueue.filter(r => r.status === 'pending').length;
  const uploadingCount = uploadQueue.filter(r => r.status === 'uploading').length;
  const successCount = uploadQueue.filter(r => r.status === 'success').length;
  const errorCount = uploadQueue.filter(r => r.status === 'error').length;
  const totalProgress = uploadQueue.length > 0 ? ((successCount + errorCount) / uploadQueue.length) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">
              {isDragActive ? 'Drop MusicXML files here' : 'Bulk Upload MusicXML Files'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop multiple .xml or .musicxml files, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supports multiple file selection for batch processing
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium">Upload Queue</h3>
                <Badge variant="outline">{uploadQueue.length} files</Badge>
              </div>
              <div className="flex gap-2">
                {errorCount > 0 && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={retryFailed}
                    disabled={isUploading}
                  >
                    Retry Failed ({errorCount})
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={clearAll}
                  disabled={isUploading}
                >
                  Clear All
                </Button>
                <Button 
                  size="sm" 
                  onClick={uploadAll}
                  disabled={isUploading || pendingCount === 0}
                >
                  Upload All ({pendingCount})
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            {isUploading && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Overall Progress</span>
                  <span className="text-sm text-muted-foreground">{Math.round(totalProgress)}%</span>
                </div>
                <Progress value={totalProgress} className="h-2" />
              </div>
            )}

            {/* File List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {uploadQueue.map((result, index) => (
                <div 
                  key={`${result.file.name}-${index}`}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileMusic className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(result.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {result.status === 'pending' && (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                    {result.status === 'uploading' && (
                      <Badge variant="default">Uploading...</Badge>
                    )}
                    {result.status === 'success' && (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Success
                      </Badge>
                    )}
                    {result.status === 'error' && (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                    
                    {result.status !== 'uploading' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(index)}
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            {uploadQueue.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-sm font-medium">{pendingCount}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">{uploadingCount}</div>
                    <div className="text-xs text-muted-foreground">Uploading</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-green-600">{successCount}</div>
                    <div className="text-xs text-muted-foreground">Success</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-red-600">{errorCount}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};