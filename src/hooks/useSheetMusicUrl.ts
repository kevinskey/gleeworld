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
        // Extract bucket and path from the URL
        const urlParts = pdfUrl.split('/');
        const bucketIndex = urlParts.findIndex(part => part === 'sheet-music');
        
        if (bucketIndex === -1) {
          // If it's not a sheet-music URL, return as-is (might be a public URL)
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