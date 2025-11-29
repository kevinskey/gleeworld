import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const { toast } = useToast();

  const uploadFile = async (file: File, bucket: string = 'mus240-resources', path?: string): Promise<string | null> => {
    try {
      setUploading(true);
      console.log('Starting file upload:', file.name, 'to bucket:', bucket, 'size:', file.size);
      
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = path || `${timestamp}-${randomSuffix}-${safeFileName}`;

      // Check file size limit (100MB)
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds 100MB limit. Please use a smaller file.`);
      }

      // For large files, show progress toast
      const LARGE_FILE_THRESHOLD = 6 * 1024 * 1024; // 6MB
      if (file.size > LARGE_FILE_THRESHOLD) {
        toast({
          title: "Uploading Large File",
          description: `${file.name} is being uploaded... This may take a moment.`,
        });
      }

      // Files over ~10MB use background edge function to avoid timeouts
      const LARGE_FILE_DIRECT_UPLOAD_LIMIT = 10 * 1024 * 1024; // 10MB

      if (file.size > LARGE_FILE_DIRECT_UPLOAD_LIMIT) {
        console.log(`Using edge function for large upload to: ${bucket}/${filePath}`);

        // Get current auth session token if available
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', bucket);
        formData.append('fileName', filePath);

        const edgeBaseUrl = 'https://oopmlreysjzuxzylyheb.supabase.co/functions/v1';

        // Kick off background upload
        const startResponse = await fetch(`${edgeBaseUrl}/upload-large-file`, {
          method: 'POST',
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: formData,
        });

        if (!startResponse.ok) {
          const text = await startResponse.text();
          console.error('Failed to start large file upload:', startResponse.status, text);
          throw new Error('Failed to start large file upload');
        }

        const { jobId } = await startResponse.json();
        console.log('Large upload job started:', jobId);

        // Poll status function until completed or failed
        const maxAttempts = 40; // ~2 minutes at 3s interval
        const pollIntervalMs = 3000;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const statusResponse = await fetch(`${edgeBaseUrl}/check-upload-status?jobId=${encodeURIComponent(jobId)}`, {
            headers: {
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
          });

          if (!statusResponse.ok) {
            const text = await statusResponse.text();
            console.error('Failed to check upload status:', statusResponse.status, text);
            throw new Error('Failed to check upload status');
          }

          const statusData = await statusResponse.json() as { status: string; url?: string; error?: string };
          console.log('Upload job status:', statusData);

          if (statusData.status === 'completed' && statusData.url) {
            toast({
              title: "Upload Successful",
              description: `${file.name} uploaded successfully`,
            });

            return statusData.url;
          }

          if (statusData.status === 'failed') {
            console.error('Large upload failed:', statusData.error);
            throw new Error(statusData.error || 'Large upload failed');
          }

          // Still processing; wait then poll again
          await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        }

        throw new Error('Upload timed out while processing on server');
      }

      console.log(`Uploading to: ${bucket}/${filePath}`);
      
      // Use standard upload with proper content type for smaller files
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/octet-stream'
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw new Error(error.message || 'Upload failed');
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      console.log('Upload successful:', filePath, 'URL:', publicUrl);

      toast({
        title: "Upload Successful",
        description: `${file.name} uploaded successfully`,
      });

      return publicUrl;

    } catch (error) {
      console.error('Upload error:', error);
      
      toast({
        title: "Upload Failed",
        description: `Failed to upload ${file.name}. Please try again.`,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const uploadMultipleFiles = async (
    files: File[], 
    bucket: string, 
    onProgress?: (progress: UploadProgress[]) => void
  ): Promise<UploadProgress[]> => {
    setUploading(true);
    
    // Initialize progress tracking
    const initialProgress: UploadProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: 'pending'
    }));
    
    setUploadProgress(initialProgress);
    onProgress?.(initialProgress);

    const uploadPromises = files.map(async (file, index) => {
      try {
        // Update status to uploading
        const updatedProgress = [...initialProgress];
        updatedProgress[index] = { ...updatedProgress[index], status: 'uploading', progress: 0 };
        setUploadProgress(updatedProgress);
        onProgress?.(updatedProgress);

        // Generate unique file path
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${timestamp}-${randomSuffix}-${safeFileName}`;
        
        console.log(`Uploading file: ${file.name} to path: ${filePath}`);
        
        // Use the single file upload function which now has proper development fallback
        const uploadResult = await uploadFile(file, 'mus240-resources', filePath);
        
        if (uploadResult) {
          console.log(`Upload successful for: ${file.name}, URL: ${uploadResult}`);
          
          // Update status to completed
          const finalProgress = [...updatedProgress];
          finalProgress[index] = {
            ...finalProgress[index],
            status: 'completed',
            progress: 100,
            url: uploadResult
          };
          setUploadProgress(finalProgress);
          onProgress?.(finalProgress);

          return finalProgress[index];
        } else {
          throw new Error('Upload failed - no URL returned');
        }
      } catch (error) {
        console.error('Upload error for file:', file.name, error);
        
        // Update status to error
        const errorProgress = [...initialProgress];
        errorProgress[index] = {
          ...errorProgress[index],
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Upload failed'
        };
        setUploadProgress(errorProgress);
        onProgress?.(errorProgress);

        return errorProgress[index];
      }
    });

    const results = await Promise.all(uploadPromises);
    setUploading(false);
    
    const successCount = results.filter(r => r.status === 'completed').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    if (successCount > 0) {
      toast({
        title: "Upload Successful",
        description: `Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}`,
      });
    }
    if (errorCount > 0) {
      toast({
        title: "Upload Errors",
        description: `Failed to upload ${errorCount} file${errorCount > 1 ? 's' : ''}`,
        variant: "destructive",
      });
    }

    return results;
  };

  const deleteFile = async (bucket: string, path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        console.error('Delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  };

  const clearProgress = () => {
    setUploadProgress([]);
  };

  return {
    uploadFile,
    uploadMultipleFiles,
    deleteFile,
    uploading,
    uploadProgress,
    clearProgress
  };
}