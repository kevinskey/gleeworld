import { useState, useEffect } from 'react';
import { getFileUrl } from '@/utils/storage';

/**
 * Hook to get the appropriate URL for sheet music files
 * Handles the complexity of signed URLs for private buckets
 */
export const useSheetMusicUrl = (pdfUrl: string | null) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfUrl) {
      setSignedUrl(null);
      return;
    }

    const getUrl = async () => {
      setLoading(true);
      setError(null);

      try {
        // Check if this is a public storage URL (no signed URL needed)
        if (pdfUrl.includes('/storage/v1/object/public/')) {
          console.log('useSheetMusicUrl: Using public URL directly:', pdfUrl);
          setSignedUrl(pdfUrl);
          return;
        }

        // Extract bucket and path from the URL for private buckets
        const urlParts = pdfUrl.split('/');
        const bucketIndex = urlParts.findIndex(part => part === 'sheet-music');
        
        if (bucketIndex === -1) {
          // If it's not a private sheet-music URL, return as-is
          setSignedUrl(pdfUrl);
          return;
        }

        const bucket = urlParts[bucketIndex];
        const path = urlParts.slice(bucketIndex + 1).join('/');

        const url = await getFileUrl(bucket, path);
        setSignedUrl(url);
      } catch (err) {
        console.error('Error getting sheet music URL:', err);
        setError(err instanceof Error ? err.message : 'Failed to load sheet music');
      } finally {
        setLoading(false);
      }
    };

    getUrl();
  }, [pdfUrl]);

  return { signedUrl, loading, error };
};