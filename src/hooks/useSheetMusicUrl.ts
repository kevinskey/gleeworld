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

    // Blob/data URLs are already safe to use directly
    if (pdfUrl.startsWith('blob:') || pdfUrl.startsWith('data:')) {
      setSignedUrl(pdfUrl);
      setLoading(false);
      setError(null);
      return;
    }

    const getUrl = async () => {
      setLoading(true);
      setError(null);

      try {
        const isSupabaseStorage = pdfUrl.includes('.supabase.co/storage/v1/object/');
        const isHttp = /^https?:\/\//.test(pdfUrl);
        const isSigned = pdfUrl.includes('/storage/v1/object/sign/');

        // Use signed Supabase storage URL as-is, but check if it's expired
        if (isSigned && isSupabaseStorage) {
          console.log('useSheetMusicUrl: Checking signed storage URL for expiration:', pdfUrl);
          
          // Extract and decode the JWT token to check expiration
          try {
            const tokenParam = pdfUrl.split('token=')[1];
            if (tokenParam) {
              const token = tokenParam.split('&')[0]; // Handle multiple params
              const payload = JSON.parse(atob(token.split('.')[1]));
              const now = Math.floor(Date.now() / 1000);
              const exp = payload.exp;
              
              console.log('useSheetMusicUrl: Token expiration check:', {
                now,
                exp,
                expired: now >= exp,
                timeUntilExpiry: exp - now
              });
              
              if (now >= exp) {
                console.log('useSheetMusicUrl: Token is expired, regenerating fresh signed URL');
                // Extract the original path and bucket to generate a fresh signed URL
                const afterBase = pdfUrl.split('/storage/v1/object/sign/')[1];
                const segments = afterBase.split('/');
                const bucket = segments[0];
                const path = segments.slice(1).join('/').split('?')[0];
                
                console.log('useSheetMusicUrl: Regenerating for bucket:', bucket, 'path:', path);
                const freshUrl = await getFileUrl(bucket, path);
                console.log('useSheetMusicUrl: Generated fresh URL:', freshUrl);
                setSignedUrl(freshUrl);
                return;
              }
              
              // Token is still valid, but warn if it expires soon (within 5 minutes)
              if (exp - now < 300) {
                console.warn('useSheetMusicUrl: Token expires soon, consider refreshing');
              }
            }
          } catch (tokenError) {
            console.warn('useSheetMusicUrl: Could not parse token for expiration check:', tokenError);
          }
          
          setSignedUrl(pdfUrl);
          return;
        }

        if (isSupabaseStorage) {
          // Check if this is already a public URL
          if (pdfUrl.includes('/storage/v1/object/public/')) {
            console.log('useSheetMusicUrl: Using public storage URL directly:', pdfUrl);
            setSignedUrl(pdfUrl);
            return;
          }

          // Normalize Supabase storage URLs (convert public URLs to correct URL based on bucket privacy)
          const afterBase = pdfUrl.split('/storage/v1/object/')[1]; // e.g., "public/sheet-music/path..."
          const segments = afterBase.split('/');
          // segments[0] = "public" | "sign" | other
          const bucket = segments[1];
          const path = segments.slice(2).join('/').split('?')[0];

          console.log('useSheetMusicUrl: Processing Supabase storage URL');
          console.log('useSheetMusicUrl: afterBase:', afterBase);
          console.log('useSheetMusicUrl: bucket:', bucket);
          console.log('useSheetMusicUrl: path:', path);

          const url = await getFileUrl(bucket, path);
          console.log('useSheetMusicUrl: Got URL from getFileUrl:', url);
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