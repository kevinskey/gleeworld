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
        // If already a public or signed storage URL, use as-is
        if (
          pdfUrl.includes('/storage/v1/object/public/') ||
          pdfUrl.includes('/storage/v1/object/sign/')
        ) {
          console.log('useSheetMusicUrl: Using storage URL directly:', pdfUrl);
          setSignedUrl(pdfUrl);
          return;
        }

        // Extract bucket and path from the URL or storage path
        // Accepts formats like:
        // - sheet-music/folder/file.pdf
        // - https://<domain>/<bucket>/folder/file.pdf
        const raw = pdfUrl.replace(/^https?:\/\/[^/]+\//, '');
        const parts = raw.split('/');
        const bucket = parts[0];
        if (!bucket) {
          setSignedUrl(pdfUrl);
          return;
        }
        const pathWithQuery = parts.slice(1).join('/');
        const path = pathWithQuery.split('?')[0];

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