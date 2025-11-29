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
      
      // For large files (>10MB), use background upload edge function
      const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10MB
      
      if (file.size > LARGE_FILE_THRESHOLD) {
        console.log('Large file detected, using background upload');
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', bucket);
        if (path) {
          formData.append('fileName', path);
        }

        // Start background upload
        const { data: jobData, error: jobError } = await supabase.functions.invoke('upload-large-file', {
          body: formData,
        });

        if (jobError) {
          throw new Error(jobError.message || 'Failed to start upload');
        }

        const jobId = jobData?.jobId;
        if (!jobId) {
          throw new Error('No job ID returned from upload service');
        }

        console.log('Upload job started:', jobId);

        // Poll for completion
        let attempts = 0;
        const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes max
        
        toast({
          title: "Uploading Large File",
          description: `${file.name} is being uploaded in the background...`,
        });

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          
          // Check status via direct API call
          const statusResponse = await fetch(
            `https://oopmlreysjzuxzylyheb.supabase.co/functions/v1/check-upload-status?jobId=${jobId}`,
            {
              headers: {
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vcG1scmV5c2p6dXh6eWx5aGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNzg5NTUsImV4cCI6MjA2NDY1NDk1NX0.tDq4HaTAy9p80e4upXFHIA90gUxZSHTH5mnqfpxh7eg'
              }
            }
          );

          const statusData = await statusResponse.json();
          console.log('Upload status:', statusData?.status);

          if (statusData?.status === 'completed') {
            toast({
              title: "Upload Successful",
              description: `${file.name} uploaded successfully`,
            });
            return statusData.url;
          }

          if (statusData?.status === 'failed') {
            throw new Error(statusData.error || 'Upload failed');
          }

          attempts++;
        }

        throw new Error('Upload timeout - please try again');
      }

      // For smaller files, use direct upload
      console.log('Using direct upload for small file');
      
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = path || `${timestamp}-${randomSuffix}-${safeFileName}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
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