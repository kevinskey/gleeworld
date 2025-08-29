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

  const uploadFile = async (file: File, bucket: string, path?: string): Promise<string | null> => {
    try {
      setUploading(true);
      
      // Generate file path if not provided
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = path || `${timestamp}-${randomSuffix}-${safeFileName}`;
      
      // Always use the mus240-resources bucket
      const targetBucket = 'mus240-resources';
      
      // First try direct storage API
      try {
        const { data, error } = await supabase.storage
          .from(targetBucket)
          .upload(filePath, file, {
            upsert: false
          });

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error('No data returned from upload');
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(targetBucket)
          .getPublicUrl(data.path);

        if (!urlData?.publicUrl) {
          throw new Error('Failed to generate file URL');
        }

        toast({
          title: "Upload Successful",
          description: "File uploaded successfully",
        });

        return urlData.publicUrl;
      } catch (directUploadError) {
        console.log('Direct upload failed, trying edge function:', directUploadError);
        
        // Fallback to edge function upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', targetBucket);

        const { data: functionData, error: functionError } = await supabase.functions.invoke('upload-file', {
          body: formData
        });

        if (functionError) {
          throw functionError;
        }

        if (!functionData?.success) {
          throw new Error(functionData?.error || 'Upload failed');
        }

        toast({
          title: "Upload Successful",
          description: "File uploaded successfully via backup method",
        });

        return functionData.url;
      }

    } catch (error) {
      console.error('Upload error:', error);
      
      // Provide more specific error message based on error type
      let errorMessage = 'Unknown error occurred';
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        errorMessage = 'Network connection issue. Please check your internet connection and try again.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
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
        
        const { data, error } = await supabase.storage
          .from('mus240-resources')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type
          });

        if (error) {
          console.error('Supabase upload error:', error);
          throw new Error(`Upload failed: ${error.message}`);
        }

        if (!data || !data.path) {
          throw new Error('Upload successful but no file path returned');
        }

        console.log(`Upload successful for: ${file.name}, path: ${data.path}`);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('mus240-resources')
          .getPublicUrl(data.path);

        if (!urlData || !urlData.publicUrl) {
          throw new Error('Failed to get public URL for uploaded file');
        }

        console.log(`Public URL generated: ${urlData.publicUrl}`);

        // Update status to completed
        const finalProgress = [...updatedProgress];
        finalProgress[index] = {
          ...finalProgress[index],
          status: 'completed',
          progress: 100,
          url: urlData.publicUrl
        };
        setUploadProgress(finalProgress);
        onProgress?.(finalProgress);

        return finalProgress[index];
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