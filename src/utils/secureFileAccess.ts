import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches a file from Supabase storage and converts it to a blob URL
 * This bypasses ad blockers that block direct supabase.co URLs
 */
export const getSecureFileUrl = async (bucket: string, path: string): Promise<string | null> => {
  try {
    console.log(`Fetching secure file from bucket: ${bucket}, path: ${path}`);
    
    // Download the file as a blob using Supabase client
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error) {
      console.error('Error downloading file:', error);
      return null;
    }

    if (!data) {
      console.error('No data returned from download');
      return null;
    }

    // Create a blob URL from the downloaded data
    const blobUrl = URL.createObjectURL(data);
    console.log('Created blob URL:', blobUrl);
    return blobUrl;
  } catch (error) {
    console.error('Error in getSecureFileUrl:', error);
    return null;
  }
};

/**
 * Extracts bucket and path from a Supabase storage URL
 */
export const parseStorageUrl = (url: string): { bucket: string; path: string } | null => {
  try {
    // Match pattern: https://*.supabase.co/storage/v1/object/public/BUCKET/PATH
    const match = url.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)/);
    
    if (!match) {
      console.error('Invalid storage URL format:', url);
      return null;
    }

    return {
      bucket: match[1],
      path: match[2]
    };
  } catch (error) {
    console.error('Error parsing storage URL:', error);
    return null;
  }
};

/**
 * Converts a Supabase storage URL to a secure blob URL
 */
export const convertToSecureUrl = async (storageUrl: string): Promise<string | null> => {
  const parsed = parseStorageUrl(storageUrl);
  if (!parsed) return null;
  
  return await getSecureFileUrl(parsed.bucket, parsed.path);
};
