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
        const isSupabaseStorage = pdfUrl.includes('.supabase.co/storage/v1/object/');
        const isHttp = /^https?:\/\//.test(pdfUrl);
        const isSigned = pdfUrl.includes('/storage/v1/object/sign/');

        // Use signed Supabase storage URL as-is
        if (isSigned && isSupabaseStorage) {
          console.log('useSheetMusicUrl: Using signed storage URL directly:', pdfUrl);
          setSignedUrl(pdfUrl);
          return;
        }

        if (isSupabaseStorage) {
          // Normalize Supabase storage URLs (convert public URLs to correct URL based on bucket privacy)
          const afterBase = pdfUrl.split('/storage/v1/object/')[1]; // e.g., "public/sheet-music/path..."
          const segments = afterBase.split('/');
          // segments[0] = "public" | "sign" | other
          const bucket = segments[1];
          const path = segments.slice(2).join('/').split('?')[0];

          const url = await getFileUrl(bucket, path);
          setSignedUrl(url);
          return;
        }

        // Non-Supabase absolute URLs: use as-is
        if (isHttp && !isSupabaseStorage) {
          setSignedUrl(pdfUrl);
          return;
        }

        // Handle storage-style paths like: bucket/folder/file.pdf
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