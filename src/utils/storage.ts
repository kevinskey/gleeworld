import { supabase } from "@/integrations/supabase/client";

/**
 * Get a signed URL for accessing files in private buckets like 'sheet-music'
 * For public buckets, use getPublicUrl() directly
 */
export const getSignedUrl = async (bucket: string, path: string, expiresIn: number = 3600): Promise<string | null> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error(`Error creating signed URL for ${bucket}/${path}:`, error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error(`Failed to create signed URL for ${bucket}/${path}:`, error);
    return null;
  }
};

/**
 * Get the appropriate URL for a file based on bucket privacy
 * Uses signed URLs for private buckets and public URLs for public buckets
 */
export const getFileUrl = async (bucket: string, path: string): Promise<string | null> => {
  // Private buckets that require signed URLs
  const privateBuckets = [
    'sheet-music',
    'w9-forms', 
    'receipts',
    'contract-signatures',
    'signed-contracts',
    'contract-documents',
    'performer-documents',
    'alumni-headshots',
    'marked-scores',
    'budget-documents',
    'executive-board-files',
    'media-audio',
    'media-docs'
  ];

  if (privateBuckets.includes(bucket)) {
    return await getSignedUrl(bucket, path);
  } else {
    // Public bucket - use direct public URL
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data.publicUrl;
  }
};

/**
 * Upload a file to storage and return the appropriate URL
 */
export const uploadFileAndGetUrl = async (
  file: File, 
  bucket: string, 
  folder: string = '', 
  fileName?: string
): Promise<{ url: string; path: string } | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const finalFileName = fileName || `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = folder ? `${folder}/${finalFileName}` : finalFileName;

    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    // Get the appropriate URL
    const url = await getFileUrl(bucket, filePath);
    
    if (!url) {
      return null;
    }

    return { url, path: filePath };
  } catch (error) {
    console.error('Error uploading file:', error);
    return null;
  }
};